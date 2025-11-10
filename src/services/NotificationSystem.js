import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

// 알림 생성
export const createNotification = async (notificationData) => {
  try {
    const {
      recipientId,
      type,
      title,
      message,
      link,
      metadata = {}
    } = notificationData;

    await addDoc(collection(db, 'notifications'), {
      recipientId,
      type,
      title,
      message,
      link,
      metadata,
      read: false,
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('알림 생성 실패:', error);
    throw error;
  }
};

// 알림 읽음 처리
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    throw error;
  }
};

// 사용자 알림 실시간 구독
export const subscribeToNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  });
};

// 알림 타입별 생성 헬퍼 함수들
export const notifyOrderCreated = (recipientId, orderId, orderNumber) => {
  return createNotification({
    recipientId,
    type: 'order_created',
    title: '새로운 주문',
    message: `주문번호 ${orderNumber}가 생성되었습니다.`,
    link: `/orders/${orderId}`,
    metadata: { orderId, orderNumber }
  });
};

export const notifyOrderStatusChanged = (recipientId, orderId, orderNumber, status) => {
  const statusText = {
    'pending': '대기중',
    'approved': '승인됨',
    'in_progress': '제작중',
    'completed': '완료',
    'cancelled': '취소됨'
  };

  return createNotification({
    recipientId,
    type: 'order_status_changed',
    title: '주문 상태 변경',
    message: `주문 ${orderNumber}의 상태가 "${statusText[status]}"로 변경되었습니다.`,
    link: `/orders/${orderId}`,
    metadata: { orderId, orderNumber, status }
  });
};

export const notifyPaymentCompleted = (recipientId, amount, orderNumber) => {
  return createNotification({
    recipientId,
    type: 'payment_completed',
    title: '결제 완료',
    message: `${amount.toLocaleString()}원 결제가 완료되었습니다. (주문: ${orderNumber})`,
    link: `/payments`,
    metadata: { amount, orderNumber }
  });
};

export const notifyStaffJoinRequest = (recipientId, staffName, companyName) => {
  return createNotification({
    recipientId,
    type: 'staff_join_request',
    title: '직원 가입 요청',
    message: `${staffName}님이 ${companyName}에 가입을 요청했습니다.`,
    link: `/company/staff-management`,
    metadata: { staffName, companyName }
  });
};

export const notifyStaffApproved = (recipientId, companyName) => {
  return createNotification({
    recipientId,
    type: 'staff_approved',
    title: '직원 승인 완료',
    message: `${companyName}의 직원으로 승인되었습니다.`,
    link: `/company`,
    metadata: { companyName }
  });
};
// 모든 알림을 읽음으로 표시
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('읽지 않은 알림이 없습니다.');
      return;
    }

    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      })
    );

    await Promise.all(updatePromises);
    console.log(`✅ ${snapshot.size}개의 알림을 읽음 처리 완료`);
  } catch (error) {
    console.error('❌ 전체 읽음 처리 실패:', error);
    throw error;
  }
};

const NotificationSystem = {
  createNotification,
  markNotificationAsRead,
  subscribeToNotifications,
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifyPaymentCompleted,
  notifyStaffJoinRequest,
  notifyStaffApproved,
  markAllNotificationsAsRead
};

export default NotificationSystem;