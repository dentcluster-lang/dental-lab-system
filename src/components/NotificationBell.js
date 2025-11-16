import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
} from '../services/NotificationSystem';
import { useNavigate } from 'react-router-dom';

function NotificationBell({ user, integrated = false }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 실시간 알림 구독
    useEffect(() => {
        console.log('🔔 NotificationBell useEffect 실행');
        console.log('🔔 user:', user);
        console.log('🔔 user.uid:', user?.uid);

        if (!user?.uid) {
            console.log('❌ user.uid가 없음!');
            return;
        }

        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('recipientId', '==', user.uid), // ✅ userId -> recipientId로 변경!
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        console.log('🔔 쿼리 생성 완료, 구독 시작...');

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('🔔 onSnapshot 호출됨!');
            console.log('🔔 받은 문서 수:', snapshot.size);

            const notificationsList = [];
            let unreadCounter = 0;

            snapshot.forEach((doc) => {
                console.log('📄 알림 문서:', doc.id, doc.data());
                const data = doc.data();
                notificationsList.push({
                    id: doc.id,
                    ...data
                });

                if (!data.read) {
                    unreadCounter++;
                }
            });

            console.log('🔔 처리된 알림 목록:', notificationsList);
            console.log('🔔 읽지 않은 알림 수:', unreadCounter);

            setNotifications(notificationsList);
            setUnreadCount(unreadCounter);
            setLoading(false);
        }, (error) => {
            console.error('❌ onSnapshot 에러:', error);
        });

        return () => unsubscribe();
    }, [user]);

    // 알림 클릭 처리
    const handleNotificationClick = async (notification) => {
        try {
            // 읽지 않은 알림이면 읽음 처리
            if (!notification.read) {
                await markNotificationAsRead(notification.id);
            }

            // 링크가 있으면 해당 페이지로 이동
            if (notification.link) {
                navigate(notification.link);
                setShowDropdown(false);
            }
        } catch (error) {
            console.error('알림 처리 실패:', error);
        }
    };

    // 모두 읽음 처리
    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead(user.uid);
        } catch (error) {
            console.error('전체 읽음 처리 실패:', error);
        }
    };

    // 시간 포맷팅
    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // 초 단위

        if (diff < 60) return '방금 전';
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

        return date.toLocaleDateString('ko-KR');
    };

    // 알림 타입별 아이콘 색상
    const getNotificationColor = (type) => {
        switch (type) {
            case 'payment_approved':
            case 'staff_approved':
                return '#10b981'; // 초록
            case 'payment_rejected':
                return '#ef4444'; // 빨강
            case 'payment_approval_request':
                return '#f59e0b'; // 주황
            case 'order_created':
            case 'order_status_changed':
                return '#3b82f6'; // 파랑
            case 'payment_completed':
                return '#8b5cf6'; // 보라
            case 'staff_join_request':
                return '#f59e0b'; // 주황
            case 'test':
                return '#10b981'; // 초록
            default:
                return '#6b7280'; // 회색
        }
    };

    return (
        <div style={styles.container}>
            {/* 알림 벨 버튼 */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    ...styles.bellButton,
                    ...(integrated ? styles.bellButtonIntegrated : {})
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={styles.badge}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* 알림 드롭다운 */}
            {showDropdown && (
                <>
                    {/* 오버레이 (모바일용) */}
                    <div 
                        style={styles.overlay}
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* 드롭다운 내용 */}
                    <div style={styles.dropdown} className="notification-dropdown">
                        {/* 헤더 */}
                        <div style={styles.header}>
                            <div style={styles.headerTitle}>
                                <Bell size={18} />
                                <span>알림</span>
                            </div>
                            <div style={styles.headerActions}>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        style={styles.markAllButton}
                                        title="모두 읽음"
                                    >
                                        <CheckCheck size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDropdown(false)}
                                    style={styles.closeButton}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* 알림 목록 */}
                        <div style={styles.notificationList}>
                            {loading ? (
                                <div style={styles.emptyState}>
                                    <div style={styles.spinner}></div>
                                    <p>로딩 중...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <Bell size={32} style={{ opacity: 0.3 }} />
                                    <p>알림이 없습니다</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        style={{
                                            ...styles.notificationItem,
                                            ...(notification.read ? {} : styles.notificationItemUnread)
                                        }}
                                    >
                                        {/* 상태 표시 점 */}
                                        <div
                                            style={{
                                                ...styles.statusDot,
                                                backgroundColor: getNotificationColor(notification.type)
                                            }}
                                        />

                                        {/* 내용 */}
                                        <div style={styles.notificationContent}>
                                            <div style={styles.notificationTitle}>
                                                {notification.title}
                                            </div>
                                            <div style={styles.notificationMessage}>
                                                {notification.message}
                                            </div>
                                            <div style={styles.notificationTime}>
                                                {formatTime(notification.createdAt)}
                                            </div>
                                        </div>

                                        {/* 읽음 표시 */}
                                        {notification.read && (
                                            <Check size={14} style={styles.readIcon} />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const styles = {
    container: {
        position: 'relative',
    },
    bellButton: {
        position: 'relative',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    bellButtonIntegrated: {
        backgroundColor: 'transparent',
        width: '36px',
        height: '36px',
    },
    badge: {
        position: 'absolute',
        top: '2px',
        right: '2px',
        backgroundColor: '#ef4444',
        color: 'white',
        fontSize: '10px',
        fontWeight: '600',
        padding: '2px 5px',
        borderRadius: '10px',
        minWidth: '18px',
        textAlign: 'center',
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 998,
    },
    dropdown: {
        position: 'fixed', // absolute -> fixed로 변경
        top: '60px', // 헤더 아래로 고정
        right: '16px', // 오른쪽 여백
        width: '360px',
        maxWidth: 'calc(100vw - 32px)', // 양쪽 16px 여백 확보
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        zIndex: 999,
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 80px)', // 화면 높이 초과 방지
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937',
    },
    headerActions: {
        display: 'flex',
        gap: '8px',
    },
    markAllButton: {
        padding: '6px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#6b7280',
        cursor: 'pointer',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
    },
    closeButton: {
        padding: '4px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#6b7280',
        cursor: 'pointer',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
    },
    notificationList: {
        maxHeight: '400px',
        overflowY: 'auto',
    },
    notificationItem: {
        display: 'flex',
        gap: '12px',
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #f3f4f6',
        transition: 'background-color 0.2s',
        position: 'relative',
    },
    notificationItemUnread: {
        backgroundColor: '#eff6ff',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        marginTop: '6px',
        flexShrink: 0,
    },
    notificationContent: {
        flex: 1,
        minWidth: 0,
    },
    notificationTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '4px',
        wordBreak: 'break-word',
        lineHeight: '1.4',
    },
    notificationMessage: {
        fontSize: '13px',
        color: '#6b7280',
        marginBottom: '4px',
        whiteSpace: 'normal', // pre-line -> normal로 변경
        lineHeight: '1.5',
        wordBreak: 'break-word', // 긴 단어 줄바꿈
        overflowWrap: 'break-word', // 추가
    },
    notificationTime: {
        fontSize: '12px',
        color: '#9ca3af',
    },
    readIcon: {
        color: '#10b981',
        flexShrink: 0,
        marginTop: '6px',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        color: '#9ca3af',
        fontSize: '14px',
    },
    spinner: {
        width: '32px',
        height: '32px',
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '12px',
    },
};

// 스타일에 애니메이션 추가
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* 모바일 반응형 스타일 */
    @media (max-width: 768px) {
        .notification-dropdown {
            position: fixed !important;
            top: 60px !important;
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
            max-width: none !important;
        }
    }
`;
document.head.appendChild(styleSheet);

export default NotificationBell;