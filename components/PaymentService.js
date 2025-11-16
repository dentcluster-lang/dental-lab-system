// 결제 서비스 - 아임포트(Iamport) PG 연동
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { createNotification } from './NotificationSystem';

// 아임포트 스크립트 로드
export const loadIamportScript = () => {
    return new Promise((resolve, reject) => {
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
        // 가맹점 식별코드 (실제 코드로 교체 필요)
        window.IMP.init('imp00000000'); // TODO: 실제 가맹점 코드로 변경
    }
};

// 주문번호 생성
export const generateOrderNumber = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timeStr = now.getTime().toString().slice(-6); // 밀리초 뒤 6자리
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase(); // 랜덤 4자리
    return `ORD${dateStr}${timeStr}${randomStr}`;
};

// 결제 요청
export const requestPayment = async ({
    orderNumber,
    amount,
    orderName,
    buyerName,
    buyerEmail,
    buyerPhone,
    buyerAddress,
    buyerPostcode,
    paymentMethod = 'card'
}) => {
    return new Promise((resolve, reject) => {
        if (!window.IMP) {
            reject(new Error('아임포트가 초기화되지 않았습니다.'));
            return;
        }

        // 결제 요청 데이터
        const paymentData = {
            pg: 'html5_inicis', // PG사 (이니시스)
            pay_method: paymentMethod, // card(카드), trans(계좌이체), vbank(가상계좌)
            merchant_uid: orderNumber, // 주문번호
            name: orderName, // 주문명
            amount: amount, // 결제금액
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            buyer_tel: buyerPhone,
            buyer_addr: buyerAddress,
            buyer_postcode: buyerPostcode,
            m_redirect_url: `${window.location.origin}/payment/callback`, // 모바일 리다이렉트
        };

        console.log('🔵 결제 요청:', paymentData);

        // 아임포트 결제 창 호출
        window.IMP.request_pay(paymentData, (response) => {
            console.log('🔵 결제 응답:', response);
            
            if (response.success) {
                // 결제 성공
                resolve({
                    success: true,
                    imp_uid: response.imp_uid, // 아임포트 거래 고유번호
                    merchant_uid: response.merchant_uid, // 주문번호
                    paid_amount: response.paid_amount,
                    apply_num: response.apply_num, // 카드 승인번호
                    pg_tid: response.pg_tid, // PG사 거래번호
                    receipt_url: response.receipt_url, // 영수증 URL
                });
            } else {
                // 결제 실패
                reject({
                    success: false,
                    error_code: response.error_code,
                    error_msg: response.error_msg,
                });
            }
        });
    });
};

// Firestore에 주문 생성
export const createOrder = async ({
    userId,
    userInfo,
    items,
    shipping,
    payment,
    orderNumber,
    imp_uid,
    status = 'pending'
}) => {
    try {
        console.log('📝 주문 생성 시작:', orderNumber);

        const orderData = {
            // 주문 기본 정보
            orderNumber: orderNumber,
            userId: userId,
            userName: userInfo.name || userInfo.email,
            userEmail: userInfo.email,
            userPhone: userInfo.phone || '',

            // 주문 상품
            items: items.map(item => ({
                productId: item.id,
                productName: item.name,
                productImage: item.image || '',
                brand: item.brand || '',
                price: item.price,
                quantity: item.quantity,
                sellerId: item.sellerId || '',
                sellerName: item.sellerName || ''
            })),

            // 배송 정보
            shipping: {
                name: shipping.name,
                phone: shipping.phone,
                zipcode: shipping.zipcode || '',
                address: shipping.address,
                detailAddress: shipping.detailAddress || '',
                message: shipping.message || ''
            },

            // 결제 정보
            payment: {
                method: payment.method, // card, trans, vbank
                subtotal: payment.subtotal,
                shippingFee: payment.shippingFee,
                discount: payment.discount || 0,
                total: payment.total,
                imp_uid: imp_uid, // 아임포트 거래 고유번호
                paid_at: new Date().toISOString()
            },

            // 주문 상태
            status: status, // pending, paid, preparing, shipping, delivered, cancelled
            
            // 타임스탬프
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Firestore에 저장
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        console.log('✅ 주문 생성 완료:', docRef.id);

        // 각 판매자에게 알림 전송
        const sellerIds = [...new Set(items.map(item => item.sellerId).filter(Boolean))];
        
        for (const sellerId of sellerIds) {
            try {
                await createNotification({
                    userId: sellerId,
                    type: 'order_new',
                    title: '새로운 주문이 접수되었습니다',
                    message: `${userInfo.name || userInfo.email}님이 상품을 주문했습니다.\n주문번호: ${orderNumber}`,
                    orderId: docRef.id,
                    orderNumber: orderNumber,
                    link: '/seller-orders'
                });
            } catch (notificationError) {
                console.error('⚠️ 판매자 알림 전송 실패:', notificationError);
            }
        }

        return {
            success: true,
            orderId: docRef.id,
            orderNumber: orderNumber
        };
    } catch (error) {
        console.error('❌ 주문 생성 실패:', error);
        throw error;
    }
};

// 주문 상태 업데이트
export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    try {
        const orderRef = doc(db, 'orders', orderId);
        
        const updateData = {
            status: status,
            updatedAt: serverTimestamp(),
            ...additionalData
        };

        // 배송 정보가 있으면 추가
        if (status === 'shipping' && additionalData.trackingNumber) {
            updateData.shipping = {
                ...updateData.shipping,
                trackingNumber: additionalData.trackingNumber,
                shippingCompany: additionalData.shippingCompany || '',
                shippedAt: new Date().toISOString()
            };
        }

        await updateDoc(orderRef, updateData);
        console.log('✅ 주문 상태 업데이트:', orderId, status);

        // 구매자에게 알림
        const orderDoc = await getDoc(orderRef);
        if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            const statusTexts = {
                paid: '결제 완료',
                preparing: '배송 준비 중',
                shipping: '배송 중',
                delivered: '배송 완료',
                cancelled: '주문 취소'
            };

            try {
                await createNotification({
                    userId: orderData.userId,
                    type: `order_${status}`,
                    title: `주문이 "${statusTexts[status]}" 상태로 변경되었습니다`,
                    message: `주문번호: ${orderData.orderNumber}\n상태: ${statusTexts[status]}`,
                    orderId: orderId,
                    orderNumber: orderData.orderNumber,
                    link: '/my-orders'
                });
            } catch (notificationError) {
                console.error('⚠️ 구매자 알림 전송 실패:', notificationError);
            }
        }

        return { success: true };
    } catch (error) {
        console.error('❌ 주문 상태 업데이트 실패:', error);
        throw error;
    }
};

// 결제 검증 (서버 측에서 실행 권장)
export const verifyPayment = async (imp_uid, merchant_uid, amount) => {
    try {
        // 실제로는 백엔드 서버에서 아임포트 API를 호출하여 검증해야 함
        // 프론트엔드에서는 보안상 직접 검증하지 않는 것이 좋음
        
        console.log('🔍 결제 검증 필요:', {
            imp_uid,
            merchant_uid,
            amount
        });

        // TODO: 백엔드 API 호출
        // const response = await fetch('/api/payments/verify', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ imp_uid, merchant_uid, amount })
        // });
        
        // 임시로 true 반환 (실제로는 백엔드 검증 결과 사용)
        return {
            success: true,
            verified: true
        };
    } catch (error) {
        console.error('❌ 결제 검증 실패:', error);
        return {
            success: false,
            verified: false,
            error: error.message
        };
    }
};

// 환불 요청
export const requestRefund = async (orderId, imp_uid, reason) => {
    try {
        console.log('💰 환불 요청:', orderId, imp_uid, reason);

        // 주문 상태를 환불 처리 중으로 변경
        await updateOrderStatus(orderId, 'refunding', {
            refund: {
                reason: reason,
                requestedAt: new Date().toISOString()
            }
        });

        // TODO: 백엔드 API를 통해 아임포트 환불 API 호출
        // const response = await fetch('/api/payments/refund', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ imp_uid, reason })
        // });

        console.log('✅ 환불 요청 완료 (백엔드 처리 필요)');
        
        return {
            success: true,
            message: '환불 요청이 접수되었습니다.'
        };
    } catch (error) {
        console.error('❌ 환불 요청 실패:', error);
        throw error;
    }
};

// 장바구니 초기화
export const clearCart = () => {
    try {
        localStorage.removeItem('dentconnect_cart');
        console.log('🗑️ 장바구니 초기화 완료');
        return { success: true };
    } catch (error) {
        console.error('❌ 장바구니 초기화 실패:', error);
        return { success: false };
    }
};

// 결제 수단별 한글 이름
export const getPaymentMethodName = (method) => {
    const methods = {
        card: '신용/체크카드',
        trans: '계좌이체',
        vbank: '무통장입금',
        phone: '휴대폰소액결제',
        samsung: '삼성페이',
        kpay: '카카오페이',
        payco: '페이코',
        lpay: '엘페이',
        naverpay: '네이버페이'
    };
    return methods[method] || method;
};

// 주문 상태별 한글 이름
export const getOrderStatusName = (status) => {
    const statuses = {
        pending: '결제 대기',
        paid: '결제 완료',
        preparing: '배송 준비 중',
        shipping: '배송 중',
        delivered: '배송 완료',
        cancelled: '주문 취소',
        refunding: '환불 처리 중',
        refunded: '환불 완료'
    };
    return statuses[status] || status;
};

export default {
    loadIamportScript,
    initializeIamport,
    generateOrderNumber,
    requestPayment,
    createOrder,
    updateOrderStatus,
    verifyPayment,
    requestRefund,
    clearCart,
    getPaymentMethodName,
    getOrderStatusName
};