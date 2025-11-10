/**
 * PaymentService.js
 * 아임포트(PortOne) PG 연동 서비스
 * DentConnect 결제 시스템
 */

import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { createNotification } from '../components/NotificationSystem';

class PaymentService {
  constructor() {
    // 아임포트 초기화
    const IMP = window.IMP;
    IMP.init('imp00000000'); // ⚠️ 실제 가맹점 코드로 변경 필요!
    this.IMP = IMP;
  }

  /**
   * 주문번호 생성
   */
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `DENTC_${timestamp}_${random}`;
  }

  /**
   * 결제 요청
   * @param {Object} paymentData - 결제 정보
   * @returns {Promise<Object>} 결제 결과
   */
  async requestPayment(paymentData) {
    return new Promise((resolve, reject) => {
      const {
        amount,
        orderName,
        buyerName,
        buyerEmail,
        buyerTel,
        buyerAddr,
        buyerPostcode,
        method = 'card',
        orderId = this.generateOrderId()
      } = paymentData;

      // 아임포트 결제 요청
      this.IMP.request_pay(
        {
          pg: 'html5_inicis', // PG사 (이니시스)
          pay_method: method, // 결제 수단
          merchant_uid: orderId, // 주문번호
          name: orderName, // 주문명
          amount: amount, // 결제 금액
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          buyer_tel: buyerTel,
          buyer_addr: buyerAddr,
          buyer_postcode: buyerPostcode,
          m_redirect_url: `${window.location.origin}/order-complete` // 모바일 리다이렉트
        },
        async (response) => {
          if (response.success) {
            // 결제 성공
            try {
              // ⚠️ 실제 환경에서는 백엔드에서 검증 필수!
              const verifyResult = await this.verifyPayment(response);
              resolve({
                success: true,
                ...response,
                ...verifyResult
              });
            } catch (error) {
              reject({
                success: false,
                error: '결제 검증 실패',
                details: error
              });
            }
          } else {
            // 결제 실패
            reject({
              success: false,
              error: response.error_msg || '결제에 실패했습니다.'
            });
          }
        }
      );
    });
  }

  /**
   * 결제 검증 (프론트엔드 임시 구현)
   * ⚠️ 실제 환경에서는 백엔드 API로 구현 필수!
   */
  async verifyPayment(response) {
    // TODO: 백엔드 API 호출
    // POST /api/payments/verify
    // Body: { imp_uid, merchant_uid, amount }
    
    console.log('⚠️ 결제 검증: 백엔드 구현 필요!');
    console.log('imp_uid:', response.imp_uid);
    console.log('merchant_uid:', response.merchant_uid);
    console.log('paid_amount:', response.paid_amount);

    // 임시로 성공 반환
    return {
      verified: true,
      imp_uid: response.imp_uid,
      merchant_uid: response.merchant_uid,
      paid_amount: response.paid_amount
    };
  }

  /**
   * 주문 저장
   */
  async saveOrder(orderData) {
    try {
      const {
        userId,
        userInfo,
        items,
        payment,
        shipping,
        totalAmount,
        imp_uid,
        merchant_uid
      } = orderData;

      // Firestore에 주문 저장
      const orderRef = await addDoc(collection(db, 'orders'), {
        // 주문 기본 정보
        orderId: merchant_uid,
        status: 'paid', // 결제 완료
        userId: userId,
        userName: userInfo.name,
        userEmail: userInfo.email,
        userPhone: userInfo.phone,
        userType: userInfo.userType || 'member',
        
        // 상품 정보
        items: items.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          sellerType: item.sellerType
        })),
        
        // 결제 정보
        payment: {
          method: payment.method,
          methodName: this.getPaymentMethodName(payment.method),
          amount: totalAmount,
          imp_uid: imp_uid,
          merchant_uid: merchant_uid,
          paidAt: new Date().toISOString()
        },
        
        // 배송 정보
        shipping: {
          name: shipping.name,
          phone: shipping.phone,
          postcode: shipping.postcode,
          address: shipping.address,
          addressDetail: shipping.addressDetail,
          memo: shipping.memo || ''
        },
        
        // 금액 정보
        totalAmount: totalAmount,
        
        // 타임스탬프
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ 주문 저장 완료:', orderRef.id);
      return orderRef.id;
    } catch (error) {
      console.error('❌ 주문 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 판매자별 알림 전송
   */
  async sendNotifications(orderData) {
    try {
      const { items, userId, userName, merchant_uid, totalAmount } = orderData;

      // 판매자별로 그룹화
      const sellerGroups = {};
      items.forEach(item => {
        if (!sellerGroups[item.sellerId]) {
          sellerGroups[item.sellerId] = {
            sellerName: item.sellerName,
            items: []
          };
        }
        sellerGroups[item.sellerId].items.push(item);
      });

      // 각 판매자에게 알림 전송
      for (const [sellerId, data] of Object.entries(sellerGroups)) {
        const itemsText = data.items
          .map(item => `${item.productName} x${item.quantity}`)
          .join(', ');

        await createNotification({
          userId: sellerId,
          type: 'order',
          title: '새로운 주문이 접수되었습니다',
          message: `${userName}님이 주문하셨습니다: ${itemsText}`,
          link: `/seller/orders/${merchant_uid}`,
          metadata: {
            orderId: merchant_uid,
            buyerId: userId,
            buyerName: userName,
            itemCount: data.items.length
          }
        });
      }

      // 구매자에게 확인 알림
      await createNotification({
        userId: userId,
        type: 'payment',
        title: '결제가 완료되었습니다',
        message: `주문번호: ${merchant_uid} / 결제금액: ${totalAmount.toLocaleString()}원`,
        link: `/my-orders/${merchant_uid}`,
        metadata: {
          orderId: merchant_uid,
          amount: totalAmount
        }
      });

      console.log('✅ 알림 전송 완료');
    } catch (error) {
      console.error('❌ 알림 전송 실패:', error);
      // 알림 실패는 주문에 영향 없음
    }
  }

  /**
   * 결제 수단 이름 변환
   */
  getPaymentMethodName(method) {
    const methodNames = {
      card: '신용/체크카드',
      trans: '실시간 계좌이체',
      vbank: '가상계좌',
      phone: '휴대폰 소액결제',
      kakaopay: '카카오페이',
      naverpay: '네이버페이',
      payco: '페이코',
      tosspay: '토스페이'
    };
    return methodNames[method] || method;
  }

  /**
   * 환불 요청
   * ⚠️ 백엔드 구현 필수!
   */
  async requestRefund(refundData) {
    // TODO: 백엔드 API 호출
    // POST /api/payments/refund
    console.log('⚠️ 환불 기능: 백엔드 구현 필요!');
    console.log('환불 요청:', refundData);
    
    throw new Error('환불 기능은 백엔드 구현이 필요합니다.');
  }
}

// 싱글톤 인스턴스
const paymentService = new PaymentService();

export default paymentService;