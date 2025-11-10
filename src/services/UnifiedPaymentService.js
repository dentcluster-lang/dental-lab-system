// 통합 결제 서비스 - Iamport 기반 (동적 금액 로딩)
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { createNotification } from './NotificationSystem';

// 기본 결제 금액 (Firestore에서 로드 실패 시 사용)
const DEFAULT_SERVICE_PRICES = {
    'lab-advertisement': {
        name: '기공소 홍보',
        price: 30000,
        duration: 30,
        description: '30일간 기공소 홍보 서비스'
    },
    'seminar': {
        name: '세미나 등록',
        price: 50000,
        duration: 60,
        description: '60일간 세미나 홍보'
    },
    'job-posting': {
        name: '구인공고 등록',
        price: 20000,
        duration: 30,
        description: '30일간 구인공고 게시'
    },
    'advertisement': {
        name: '광고 등록',
        basic: { price: 50000, duration: 30, description: '베이직 광고 30일' },
        standard: { price: 100000, duration: 30, description: '스탠다드 광고 30일' },
        premium: { price: 200000, duration: 30, description: '프리미엄 광고 30일' }
    },
    'new-product': {
        name: '신제품 등록',
        price: 30000,
        duration: 60,
        description: '60일간 신제품 홍보'
    },
    'marketplace': {
        name: '마켓플레이스 수수료',
        commissionRate: 5, // 5%
        description: '상품 판매 시 매출의 일정 비율'
    }
};

// 캐시된 설정 (성능 최적화)
let cachedPrices = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// Firestore에서 결제 금액 설정 로드
export const loadServicePrices = async (forceRefresh = false) => {
    try {
        // 캐시 확인 (5분 이내면 캐시 사용)
        const now = Date.now();
        if (!forceRefresh && cachedPrices && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
            console.log('✅ 캐시된 결제 설정 사용');
            return cachedPrices;
        }

        console.log('🔄 Firestore에서 결제 설정 로드 중...');
        const settingsRef = doc(db, 'systemSettings', 'paymentPrices');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            cachedPrices = data.prices || DEFAULT_SERVICE_PRICES;
            lastFetchTime = now;
            console.log('✅ 결제 설정 로드 완료:', cachedPrices);
            return cachedPrices;
        } else {
            console.log('⚠️ 설정 문서 없음 - 기본값 사용');
            cachedPrices = DEFAULT_SERVICE_PRICES;
            lastFetchTime = now;
            return DEFAULT_SERVICE_PRICES;
        }
    } catch (error) {
        console.error('❌ 결제 설정 로드 실패 - 기본값 사용:', error);
        return DEFAULT_SERVICE_PRICES;
    }
};

// 특정 서비스의 가격 정보 가져오기
export const getServicePrice = async (serviceType, tier = null) => {
    const prices = await loadServicePrices();

    if (serviceType === 'advertisement' && tier) {
        return prices[serviceType][tier];
    }

    return prices[serviceType];
};

// 아임포트 스크립트 로드
export const loadIamportScript = () => {
    return new Promise((resolve, reject) => {
        if (window.IMP) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.iamport.kr/v1/iamport.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('아임포트 스크립트 로드 실패'));
        document.head.appendChild(script);
    });
};

// 아임포트 초기화
export const initializeIamport = () => {
    if (window.IMP) {
        window.IMP.init('imp00000000'); // TODO: 실제 가맹점 코드로 변경
    }
};

// 주문번호 생성
export const generateOrderNumber = (serviceType) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = serviceType.toUpperCase().substring(0, 3);
    return `${prefix}${dateStr}${timeStr}${randomStr}`;
};

// 통합 결제 요청
export const requestUnifiedPayment = async ({
    serviceType,
    tier = null, // advertisement용
    amount,
    serviceName,
    buyerName,
    buyerEmail,
    buyerPhone,
    additionalData = {}
}) => {
    return new Promise((resolve, reject) => {
        if (!window.IMP) {
            reject(new Error('아임포트가 초기화되지 않았습니다.'));
            return;
        }

        const orderNumber = generateOrderNumber(serviceType);

        // 결제 요청 데이터
        const paymentData = {
            pg: 'html5_inicis',
            pay_method: 'card',
            merchant_uid: orderNumber,
            name: serviceName,
            amount: amount,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            buyer_tel: buyerPhone,
            m_redirect_url: `${window.location.origin}/payment/callback`,
            custom_data: JSON.stringify({
                serviceType: serviceType,
                tier: tier,
                ...additionalData
            })
        };

        console.log('🔵 결제 요청:', paymentData);

        window.IMP.request_pay(paymentData, (response) => {
            console.log('🔵 결제 응답:', response);

            if (response.success) {
                resolve({
                    success: true,
                    imp_uid: response.imp_uid,
                    merchant_uid: response.merchant_uid,
                    paid_amount: response.paid_amount,
                    apply_num: response.apply_num,
                    pg_tid: response.pg_tid,
                    receipt_url: response.receipt_url,
                    orderNumber: orderNumber
                });
            } else {
                reject({
                    success: false,
                    error_code: response.error_code,
                    error_msg: response.error_msg,
                });
            }
        });
    });
};

// 결제 완료 후 서비스별 처리
export const createServicePayment = async ({
    userId,
    userInfo,
    serviceType,
    tier = null,
    payment,
    contentId = null,
    contentData = {}
}) => {
    try {
        // 🚫 직원 계정 결제 차단
        if (userInfo.companyId) {
            throw new Error('직원 계정은 결제할 수 없습니다. 업체 대표에게 문의하세요.');
        }

        console.log('📝 결제 데이터 생성:', serviceType);

        // 동적으로 서비스 정보 가져오기
        const serviceInfo = await getServicePrice(serviceType, tier);

        if (!serviceInfo) {
            throw new Error(`서비스 타입 "${serviceType}"의 가격 정보를 찾을 수 없습니다.`);
        }

        // 만료일 계산
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + serviceInfo.duration);

        // 결제 데이터 생성
        const paymentData = {
            userId: userId,
            userName: userInfo.name || userInfo.email,
            userEmail: userInfo.email,
            userPhone: userInfo.phone || '',

            // 서비스 정보
            serviceType: serviceType,
            serviceName: serviceInfo.name,
            tier: tier,

            // 결제 정보
            orderNumber: payment.orderNumber,
            imp_uid: payment.imp_uid,
            amount: payment.paid_amount,
            duration: serviceInfo.duration,
            expiryDate: expiryDate,

            // 콘텐츠 정보
            contentId: contentId,
            contentData: contentData,

            // 상태
            status: 'pending', // pending, approved, rejected

            // 타임스탬프
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Firestore에 저장
        const docRef = await addDoc(collection(db, 'servicePayments'), paymentData);
        console.log('✅ 결제 데이터 생성 완료:', docRef.id);

        // 관리자에게 승인 요청 알림
        await notifyAdminsForApproval(serviceType, docRef.id, userInfo);

        return {
            success: true,
            paymentId: docRef.id,
            orderNumber: payment.orderNumber,
            expiryDate: expiryDate
        };
    } catch (error) {
        console.error('❌ 결제 데이터 생성 실패:', error);
        throw error;
    }
};

// 관리자에게 승인 요청 알림
const notifyAdminsForApproval = async (serviceType, paymentId, userInfo) => {
    try {
        // 관리자 목록 가져오기
        const adminsSnapshot = await getDocs(
            query(collection(db, 'users'), where('isAdmin', '==', true))
        );

        const serviceNames = {
            'lab-advertisement': '기공소 홍보',
            'seminar': '세미나',
            'job-posting': '구인공고',
            'advertisement': '광고',
            'new-product': '신제품'
        };

        for (const adminDoc of adminsSnapshot.docs) {
            await createNotification({
                recipientId: adminDoc.id,
                type: 'payment_approval_request',
                title: `새로운 ${serviceNames[serviceType]} 승인 요청`,
                message: `${userInfo.name || userInfo.email}님이 ${serviceNames[serviceType]} 결제를 완료했습니다. 승인이 필요합니다.`,
                metadata: { paymentId: paymentId },
                link: `/admin/${serviceType}-approval`
            });
        }
    } catch (error) {
        console.error('⚠️ 관리자 알림 전송 실패:', error);
    }
};

// 관리자 승인 처리
export const approvePayment = async (paymentId, adminId) => {
    try {
        const paymentRef = doc(db, 'servicePayments', paymentId);
        const paymentDoc = await getDoc(paymentRef);

        if (!paymentDoc.exists()) {
            throw new Error('결제 정보를 찾을 수 없습니다.');
        }

        const paymentData = paymentDoc.data();

        // 상태 업데이트
        await updateDoc(paymentRef, {
            status: 'approved',
            approvedBy: adminId,
            approvedAt: serverTimestamp()
        });

        // 해당 서비스 활성화
        if (paymentData.contentId) {
            await activateService(paymentData);
        }

        // 사용자에게 승인 알림
        await createNotification({
            recipientId: paymentData.userId,
            type: 'payment_approved',
            title: `${paymentData.serviceName} 승인 완료`,
            message: `${paymentData.serviceName} 신청이 승인되었습니다. 서비스가 활성화되었습니다.`,
            metadata: { paymentId: paymentId },
            link: getServiceLink(paymentData.serviceType)
        });

        console.log('✅ 결제 승인 완료:', paymentId);
        return { success: true };
    } catch (error) {
        console.error('❌ 결제 승인 실패:', error);
        throw error;
    }
};

// 관리자 반려 처리 (자동 환불)
export const rejectPayment = async (paymentId, adminId, reason) => {
    try {
        const paymentRef = doc(db, 'servicePayments', paymentId);
        const paymentDoc = await getDoc(paymentRef);

        if (!paymentDoc.exists()) {
            throw new Error('결제 정보를 찾을 수 없습니다.');
        }

        const paymentData = paymentDoc.data();

        // 상태 업데이트
        await updateDoc(paymentRef, {
            status: 'rejected',
            rejectedBy: adminId,
            rejectedAt: serverTimestamp(),
            rejectionReason: reason
        });

        // 환불 처리
        try {
            await requestRefund(paymentData.imp_uid, paymentData.amount, reason);

            // 환불 성공 알림
            await createNotification({
                recipientId: paymentData.userId,
                type: 'payment_rejected',
                title: `${paymentData.serviceName} 반려 및 환불 완료`,
                message: `${paymentData.serviceName} 신청이 반려되었습니다.\n사유: ${reason}\n결제 금액이 환불 처리되었습니다.`,
                metadata: { paymentId: paymentId },
                link: getServiceLink(paymentData.serviceType)
            });

            console.log('✅ 결제 반려 및 환불 완료:', paymentId);
            return { success: true, refunded: true };
        } catch (refundError) {
            // 환불 실패 시에도 반려는 완료, 수동 처리 필요
            await createNotification({
                recipientId: paymentData.userId,
                type: 'payment_rejected',
                title: `${paymentData.serviceName} 반려`,
                message: `${paymentData.serviceName} 신청이 반려되었습니다.\n사유: ${reason}\n환불은 별도로 처리됩니다.`,
                metadata: { paymentId: paymentId },
                link: getServiceLink(paymentData.serviceType)
            });

            console.error('⚠️ 환불 실패 - 수동 처리 필요:', refundError);
            return { success: true, refunded: false, error: refundError.message };
        }
    } catch (error) {
        console.error('❌ 결제 반려 실패:', error);
        throw error;
    }
};

// 마켓플레이스 주문 생성
export const createMarketplaceOrder = async (orderData) => {
    try {
        const orderRef = await addDoc(collection(db, 'marketplaceOrders'), {
            ...orderData,
            createdAt: serverTimestamp(),
            status: 'pending'
        });

        return {
            success: true,
            orderId: orderRef.id
        };
    } catch (error) {
        console.error('마켓플레이스 주문 생성 실패:', error);
        throw new Error('주문 생성에 실패했습니다.');
    }
};

// 환불 요청 (Iamport API)
const requestRefund = async (imp_uid, amount, reason) => {
    try {
        console.log('💰 환불 요청:', { imp_uid, amount, reason });

        // 백엔드 API 사용 (권장)
        try {
            const response = await fetch('/api/payments/refund', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imp_uid,
                    amount,
                    reason,
                    checksum: amount
                })
            });

            if (!response.ok) {
                throw new Error('백엔드 환불 API 오류');
            }

            const result = await response.json();
            console.log('✅ 환불 완료 (백엔드):', result);

            return {
                success: true,
                refunded: true,
                method: 'backend',
                result: result
            };
        } catch (backendError) {
            console.warn('⚠️ 백엔드 API 실패:', backendError.message);
            throw backendError;
        }
    } catch (error) {
        console.error('❌ 환불 요청 실패:', error);

        // 환불 실패 - 수동 처리 필요
        throw new Error(`환불 처리 실패: ${error.message}`);
    }
};

// 서비스 활성화
const activateService = async (paymentData) => {
    const { serviceType, contentId, expiryDate } = paymentData;

    try {
        switch (serviceType) {
            case 'lab-advertisement':
                await updateDoc(doc(db, 'labAdvertisements', contentId), {
                    isActive: true,
                    status: 'active',
                    expiryDate: expiryDate,
                    updatedAt: serverTimestamp()
                });
                break;

            case 'seminar':
                await updateDoc(doc(db, 'seminars', contentId), {
                    status: 'active',
                    expiryDate: expiryDate,
                    updatedAt: serverTimestamp()
                });
                break;

            case 'job-posting':
                await updateDoc(doc(db, 'jobPostings', contentId), {
                    status: 'active',
                    expiryDate: expiryDate,
                    updatedAt: serverTimestamp()
                });
                break;

            case 'advertisement':
                await updateDoc(doc(db, 'advertisements', contentId), {
                    status: 'active',
                    expiryDate: expiryDate,
                    updatedAt: serverTimestamp()
                });
                break;

            case 'new-product':
                await updateDoc(doc(db, 'newProducts', contentId), {
                    status: 'active',
                    expiryDate: expiryDate,
                    updatedAt: serverTimestamp()
                });
                break;

            default:
                console.warn('알 수 없는 서비스 타입:', serviceType);
        }
    } catch (error) {
        console.error('서비스 활성화 실패:', error);
        throw error;
    }
};

// 서비스별 링크
const getServiceLink = (serviceType) => {
    const links = {
        'lab-advertisement': '/lab-advertising',
        'seminar': '/seminars',
        'job-posting': '/job-board',
        'advertisement': '/ad-manager',
        'new-product': '/new-products'
    };
    return links[serviceType] || '/';
};

// 결제 상태 확인
export const checkPaymentStatus = async (userId, serviceType, contentId = null) => {
    try {
        let q = query(
            collection(db, 'servicePayments'),
            where('userId', '==', userId),
            where('serviceType', '==', serviceType),
            where('status', '==', 'approved')
        );

        if (contentId) {
            q = query(q, where('contentId', '==', contentId));
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { isPaid: false, isActive: false };
        }

        // 가장 최근 결제 확인
        const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const latestPayment = payments.sort((a, b) =>
            b.createdAt?.toDate() - a.createdAt?.toDate()
        )[0];

        // 만료일 확인
        const now = new Date();
        const expiryDate = latestPayment.expiryDate?.toDate() || new Date(latestPayment.expiryDate);
        const isActive = expiryDate > now;

        return {
            isPaid: true,
            isActive: isActive,
            payment: latestPayment,
            expiryDate: expiryDate
        };
    } catch (error) {
        console.error('결제 상태 확인 실패:', error);
        return { isPaid: false, isActive: false };
    }
};

// 마켓플레이스 수수료 계산
export const calculateMarketplaceCommission = async (saleAmount) => {
    try {
        const prices = await loadServicePrices();
        const commissionRate = prices['marketplace'].commissionRate || 5;
        const commission = Math.round(saleAmount * (commissionRate / 100));

        return {
            saleAmount: saleAmount,
            commissionRate: commissionRate,
            commission: commission,
            sellerReceives: saleAmount - commission
        };
    } catch (error) {
        console.error('수수료 계산 실패:', error);
        // 기본값 5%
        const commission = Math.round(saleAmount * 0.05);
        return {
            saleAmount: saleAmount,
            commissionRate: 5,
            commission: commission,
            sellerReceives: saleAmount - commission
        };
    }
};

const UnifiedPaymentService = {
    loadServicePrices,
    getServicePrice,
    loadIamportScript,
    initializeIamport,
    generateOrderNumber,
    requestUnifiedPayment,
    createServicePayment,
    createMarketplaceOrder,
    approvePayment,
    rejectPayment,
    checkPaymentStatus,
    calculateMarketplaceCommission
};

export default UnifiedPaymentService;