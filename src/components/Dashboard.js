import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    LayoutDashboard, Package, Clock,
    FileText, Calendar, CheckCircle,
    Building2, Eye, MessageSquare, Send, Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Dashboard({ user }) {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        orders: [],
        recentOrders: [],
        todayOrders: [],
        todayDeadlines: [],
        tomorrowDeadlines: [],
        recentChats: [],
        statistics: {},
    });
    const navigate = useNavigate();

    // ✨ ViewOrder로 이동하는 함수
    const handleViewOrder = (orderId) => {
        navigate(`/view-order/${orderId}`);
    };

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // 사용자 정보 가져오기
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) return;

            const userInfo = userDoc.data();
            setUserData(userInfo);

            // 직원인 경우 회사 정보 가져오기
            let companyInfo = null;
            if (userInfo.companyId) {
                const companyDoc = await getDoc(doc(db, 'users', userInfo.companyId));
                if (companyDoc.exists()) {
                    companyInfo = companyDoc.data();
                }
            }

            // 사용자 타입에 따라 다른 데이터 로드
            const businessType = userInfo.companyId ? companyInfo?.businessType : userInfo.businessType;

            if (businessType === 'dental' || businessType === 'clinic') {
                await loadDentalDashboard(userInfo, companyInfo);
            } else if (businessType === 'lab') {
                await loadLabDashboard(userInfo, companyInfo);
            } else {
                // 개인 회원용 기본 대시보드
                setDashboardData({
                    ...dashboardData,
                    isIndividual: true
                });
            }

        } catch (error) {
            console.error('대시보드 데이터 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 치과 대시보드 데이터 로드
    const loadDentalDashboard = async (userInfo, companyInfo) => {
        const userId = userInfo.companyId || user.uid;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        try {
            // ✅ 발신 주문 (보낸 의뢰서)
            const sentOrdersQuery = query(
                collection(db, 'workOrders'),
                where('fromUserId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const sentOrdersSnapshot = await getDocs(sentOrdersQuery);
            const sentOrders = sentOrdersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                orderType: 'sent'
            }));

            // ✅ 수신 주문 (받은 의뢰서) - 치과가 기공소로부터 받을 수도 있음
            const receivedOrdersQuery = query(
                collection(db, 'workOrders'),
                where('toUserId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const receivedOrdersSnapshot = await getDocs(receivedOrdersQuery);
            const receivedOrders = receivedOrdersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                orderType: 'received'
            }));

            // ✅ 모든 주문 합치기
            const allOrders = [...sentOrders, ...receivedOrders].sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate - aDate;
            });

            // 오늘 접수된 주문 (발신+수신)
            const todayOrders = allOrders.filter(order => {
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                return orderDate >= today;
            });

            // ✅ 오늘 마감일
            const todayDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() : 
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() : 
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= today && dueDate < tomorrow;
            });

            // ✅ 내일 마감일
            const tomorrowDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() : 
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() : 
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
            });

            // 완료된 주문
            const completedOrders = allOrders.filter(o => o.status === 'completed');

            // ✅ 최근 채팅 가져오기 (상대방 이름 포함)
            const chatsQuery = query(
                collection(db, 'chatRooms'),
                where('participants', 'array-contains', userId),
                orderBy('lastMessageTime', 'desc'),
                limit(5)
            );
            const chatsSnapshot = await getDocs(chatsQuery);
            
            // 🔥 상대방 정보 가져오기
            const recentChats = await Promise.all(
                chatsSnapshot.docs.map(async (chatDoc) => {
                    const chatData = chatDoc.data();
                    
                    // 상대방 ID 찾기 (participants 배열에서 내가 아닌 사람)
                    const partnerId = chatData.participants?.find(id => id !== userId);
                    
                    let partnerName = '상대방';
                    if (partnerId) {
                        try {
                            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                            if (partnerDoc.exists()) {
                                const partnerData = partnerDoc.data();
                                // 업체명이 있으면 업체명, 없으면 이름 사용
                                partnerName = partnerData.businessName || partnerData.name || '상대방';
                            }
                        } catch (error) {
                            console.error('상대방 정보 가져오기 실패:', error);
                        }
                    }
                    
                    return {
                        id: chatDoc.id,
                        ...chatData,
                        partnerName
                    };
                })
            );

            // 통계 계산
            const statistics = {
                totalOrders: allOrders.length,
                todayOrders: todayOrders.length,
                completedOrders: completedOrders.length,
                todayDeadlines: todayDeadlines.length,
                tomorrowDeadlines: tomorrowDeadlines.length,
            };

            setDashboardData({
                allOrders,
                todayOrders,
                todayDeadlines,
                tomorrowDeadlines,
                recentChats,
                statistics,
                userType: 'dental'
            });

        } catch (error) {
            console.error('치과 대시보드 데이터 로딩 실패:', error);
        }
    };

    // 기공소 대시보드 데이터 로드
    const loadLabDashboard = async (userInfo, companyInfo) => {
        const userId = userInfo.companyId || user.uid;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        try {
            // ✅ 수신 주문 (받은 의뢰서)
            const receivedOrdersQuery = query(
                collection(db, 'workOrders'),
                where('toUserId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const receivedOrdersSnapshot = await getDocs(receivedOrdersQuery);
            const receivedOrders = receivedOrdersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                orderType: 'received'
            }));

            // ✅ 발신 주문 (보낸 의뢰서) - 기공소가 외주를 줄 수도 있음
            const sentOrdersQuery = query(
                collection(db, 'workOrders'),
                where('fromUserId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const sentOrdersSnapshot = await getDocs(sentOrdersQuery);
            const sentOrders = sentOrdersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                orderType: 'sent'
            }));

            // ✅ 모든 주문 합치기
            const allOrders = [...receivedOrders, ...sentOrders].sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate - aDate;
            });

            // 오늘 접수된 주문 (발신+수신)
            const todayOrders = allOrders.filter(order => {
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                return orderDate >= today;
            });

            // ✅ 오늘 마감일
            const todayDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() : 
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() : 
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= today && dueDate < tomorrow;
            });

            // ✅ 내일 마감일
            const tomorrowDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() : 
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() : 
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
            });

            // 완료된 주문
            const completedOrders = allOrders.filter(o => o.status === 'completed');

            // ✅ 최근 채팅 가져오기 (상대방 이름 포함)
            const chatsQuery = query(
                collection(db, 'chatRooms'),
                where('participants', 'array-contains', userId),
                orderBy('lastMessageTime', 'desc'),
                limit(5)
            );
            const chatsSnapshot = await getDocs(chatsQuery);
            
            // 🔥 상대방 정보 가져오기
            const recentChats = await Promise.all(
                chatsSnapshot.docs.map(async (chatDoc) => {
                    const chatData = chatDoc.data();
                    
                    // 상대방 ID 찾기 (participants 배열에서 내가 아닌 사람)
                    const partnerId = chatData.participants?.find(id => id !== userId);
                    
                    let partnerName = '상대방';
                    if (partnerId) {
                        try {
                            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                            if (partnerDoc.exists()) {
                                const partnerData = partnerDoc.data();
                                // 업체명이 있으면 업체명, 없으면 이름 사용
                                partnerName = partnerData.businessName || partnerData.name || '상대방';
                            }
                        } catch (error) {
                            console.error('상대방 정보 가져오기 실패:', error);
                        }
                    }
                    
                    return {
                        id: chatDoc.id,
                        ...chatData,
                        partnerName
                    };
                })
            );

            // 통계
            const statistics = {
                totalOrders: allOrders.length,
                todayOrders: todayOrders.length,
                completedOrders: completedOrders.length,
                todayDeadlines: todayDeadlines.length,
                tomorrowDeadlines: tomorrowDeadlines.length,
            };

            setDashboardData({
                allOrders,
                todayOrders,
                todayDeadlines,
                tomorrowDeadlines,
                recentChats,
                statistics,
                userType: 'lab'
            });

        } catch (error) {
            console.error('기공소 대시보드 데이터 로딩 실패:', error);
        }
    };

    // 시간 포맷
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}일 전`;
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        return '방금 전';
    };

    // 상태 라벨
    const getStatusLabel = (status) => {
        const labels = {
            pending: '대기중',
            in_progress: '진행중',
            completed: '완료',
            cancelled: '취소'
        };
        return labels[status] || status;
    };

    // 상태 색상
    const getStatusColor = (status) => {
        const colors = {
            pending: '#f59e0b',
            in_progress: '#8b5cf6',
            completed: '#10b981',
            cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>대시보드 로딩 중...</p>
            </div>
        );
    }

    // 개인 회원 대시보드
    if (dashboardData.isIndividual) {
        return (
            <div style={styles.container}>
                <div style={styles.welcomeSection}>
                    <div style={styles.welcomeCard}>
                        <div style={styles.welcomeIcon}>
                            <Building2 size={40} />
                        </div>
                        <h2 style={styles.welcomeTitle}>환영합니다!</h2>
                        <p style={styles.welcomeDesc}>
                            DentConnect를 이용하려면 치과 또는 기공소로 등록해주세요.
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            style={styles.primaryButton}
                        >
                            사업자 등록하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 통합 대시보드 (치과 + 기공소 동일)
    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        <LayoutDashboard size={32} />
                        대시보드
                    </h1>
                    <p style={styles.subtitle}>안녕하세요, {userData?.name || userData?.businessName}님</p>
                </div>
            </div>

            {/* ✅ 통계 카드 - 4개 */}
            <div style={styles.statsGrid}>
                {/* 오늘 접수 */}
                <div style={styles.statCard}>
                    <div style={styles.statIcon} className="primary">
                        <Package size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>오늘 접수</div>
                        <div style={styles.statValue}>{dashboardData.statistics.todayOrders}</div>
                        <div style={styles.statSubtext}>전체: {dashboardData.statistics.totalOrders}건</div>
                    </div>
                </div>

                {/* 오늘 마감일 */}
                <div style={styles.statCard}>
                    <div style={styles.statIcon} className="danger">
                        <Clock size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>오늘 마감일</div>
                        <div style={styles.statValue}>{dashboardData.statistics.todayDeadlines}</div>
                        <div style={styles.statSubtext}>오늘까지 완료</div>
                    </div>
                </div>

                {/* 내일 마감일 */}
                <div style={styles.statCard}>
                    <div style={styles.statIcon} className="warning">
                        <Calendar size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>내일 마감일</div>
                        <div style={styles.statValue}>{dashboardData.statistics.tomorrowDeadlines}</div>
                        <div style={styles.statSubtext}>내일까지 완료</div>
                    </div>
                </div>
            </div>

            {/* ✅ 마감일 섹션 - 2열 그리드 (중간 위치) */}
            <div style={styles.contentGrid}>
                {/* 오늘 마감일 */}
                <div style={styles.contentCard}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>
                            <Clock size={20} />
                            오늘 마감일
                        </h3>
                    </div>
                    {!dashboardData.todayDeadlines || dashboardData.todayDeadlines.length === 0 ? (
                        <div style={styles.emptyState}>
                            <CheckCircle size={32} color="#10b981" />
                            <p style={{ color: '#10b981' }}>오늘 마감일인 작업이 없습니다</p>
                        </div>
                    ) : (
                        <div style={styles.deadlineList}>
                            {dashboardData.todayDeadlines.map(order => (
                                <div 
                                    key={order.id} 
                                    style={{
                                        ...styles.deadlineItem,
                                        cursor: 'pointer',
                                        backgroundColor: '#fef2f2',
                                        borderColor: '#fecaca'
                                    }}
                                    onClick={() => handleViewOrder(order.id)}
                                >
                                    <div style={styles.deadlineInfo}>
                                        <div style={styles.deadlineTitle}>
                                            {order.patientName || '환자명 없음'}
                                        </div>
                                        <div style={styles.deadlineType}>
                                            {order.orderType === 'sent' ? order.toUserName || order.labName : order.fromUserName || order.dentistName}
                                        </div>
                                    </div>
                                    <div style={{...styles.deadlineDue, color: '#dc2626'}}>
                                        <Clock size={16} />
                                        오늘
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 내일 마감일 */}
                <div style={styles.contentCard}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>
                            <Calendar size={20} />
                            내일 마감일
                        </h3>
                    </div>
                    {!dashboardData.tomorrowDeadlines || dashboardData.tomorrowDeadlines.length === 0 ? (
                        <div style={styles.emptyState}>
                            <CheckCircle size={32} color="#10b981" />
                            <p style={{ color: '#10b981' }}>내일 마감일인 작업이 없습니다</p>
                        </div>
                    ) : (
                        <div style={styles.deadlineList}>
                            {dashboardData.tomorrowDeadlines.map(order => (
                                <div 
                                    key={order.id} 
                                    style={{
                                        ...styles.deadlineItem,
                                        cursor: 'pointer',
                                        backgroundColor: '#fef3c7',
                                        borderColor: '#fde68a'
                                    }}
                                    onClick={() => handleViewOrder(order.id)}
                                >
                                    <div style={styles.deadlineInfo}>
                                        <div style={styles.deadlineTitle}>
                                            {order.patientName || '환자명 없음'}
                                        </div>
                                        <div style={styles.deadlineType}>
                                            {order.orderType === 'sent' ? order.toUserName || order.labName : order.fromUserName || order.dentistName}
                                        </div>
                                    </div>
                                    <div style={{...styles.deadlineDue, color: '#f59e0b'}}>
                                        <Calendar size={16} />
                                        내일
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ 최근 접수 & 채팅 - 2열 그리드 (하단 위치) */}
            <div style={styles.contentGrid}>
                {/* 최근 접수 (발신+수신) */}
                <div style={styles.contentCard}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>
                            <FileText size={20} />
                            최근 접수
                        </h3>
                        <button
                            onClick={() => navigate('/orders')}
                            style={styles.viewAllButton}
                        >
                            전체보기
                        </button>
                    </div>
                    <div style={styles.orderList}>
                        {!dashboardData.allOrders || dashboardData.allOrders.length === 0 ? (
                            <div style={styles.emptyState}>
                                <Package size={32} color="#cbd5e1" />
                                <p>접수된 주문이 없습니다</p>
                            </div>
                        ) : (
                            dashboardData.allOrders.slice(0, 6).map(order => (
                                <div 
                                    key={order.id} 
                                    style={{
                                        ...styles.orderItem,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => handleViewOrder(order.id)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        e.currentTarget.style.borderColor = '#6366f1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    <div style={styles.orderInfo}>
                                        <div style={styles.orderTitle}>
                                            {order.orderType === 'sent' ? <Send size={14} style={{ color: '#3b82f6' }} /> : <Inbox size={14} style={{ color: '#10b981' }} />}
                                            <span style={{ marginLeft: '6px' }}>
                                                {order.patientName || '환자명 없음'}
                                            </span>
                                        </div>
                                        <div style={styles.orderMeta}>
                                            {formatTime(order.createdAt)} • {order.orderType === 'sent' ? order.toUserName || order.labName : order.fromUserName || order.dentistName}
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <div
                                            style={{
                                                ...styles.orderStatus,
                                                backgroundColor: getStatusColor(order.status) + '20',
                                                color: getStatusColor(order.status)
                                            }}
                                        >
                                            {getStatusLabel(order.status)}
                                        </div>
                                        <Eye size={16} style={{ color: '#94a3b8' }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ✅ 채팅 위젯 */}
                <div style={styles.contentCard}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>
                            <MessageSquare size={20} />
                            최근 채팅
                        </h3>
                        <button
                            onClick={() => navigate('/chat')}
                            style={styles.viewAllButton}
                        >
                            전체보기
                        </button>
                    </div>
                    <div style={styles.chatList}>
                        {!dashboardData.recentChats || dashboardData.recentChats.length === 0 ? (
                            <div style={styles.emptyState}>
                                <MessageSquare size={32} color="#cbd5e1" />
                                <p>최근 채팅이 없습니다</p>
                            </div>
                        ) : (
                            dashboardData.recentChats.map(chat => (
                                <div 
                                    key={chat.id} 
                                    style={{
                                        ...styles.chatItem,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/chat/${chat.orderId || chat.id}`)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div style={styles.chatAvatar}>
                                        {(chat.partnerName || '?').charAt(0)}
                                    </div>
                                    <div style={styles.chatInfo}>
                                        <div style={styles.chatName}>
                                            {chat.partnerName || '상대방'}
                                        </div>
                                        <div style={styles.chatMessage}>
                                            {chat.lastMessage || '메시지가 없습니다'}
                                        </div>
                                    </div>
                                    <div style={styles.chatTime}>
                                        {formatTime(chat.lastMessageTime)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 스타일
const styles = {
    container: {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748b',
        fontWeight: '500',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    subtitle: {
        margin: 0,
        fontSize: '15px',
        color: '#64748b',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statContent: {
        flex: 1,
    },
    statLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '2px',
    },
    statSubtext: {
        fontSize: '13px',
        color: '#94a3b8',
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px',
        marginBottom: '24px',
    },
    contentCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
    },
    cardTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    viewAllButton: {
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    orderList: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    orderItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
    },
    orderInfo: {
        flex: 1,
    },
    orderTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
    },
    orderMeta: {
        fontSize: '13px',
        color: '#64748b',
    },
    orderStatus: {
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        color: '#94a3b8',
        textAlign: 'center',
    },
    chatList: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    chatItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        transition: 'all 0.2s',
    },
    chatAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#eef2ff',
        color: '#6366f1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '600',
    },
    chatInfo: {
        flex: 1,
        minWidth: 0,
    },
    chatName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '2px',
    },
    chatMessage: {
        fontSize: '13px',
        color: '#64748b',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    chatTime: {
        fontSize: '12px',
        color: '#94a3b8',
    },
    deadlineList: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    deadlineItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        border: '1px solid',
        borderRadius: '8px',
        transition: 'all 0.2s',
    },
    deadlineInfo: {
        flex: 1,
    },
    deadlineTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '4px',
    },
    deadlineType: {
        fontSize: '13px',
        color: '#64748b',
    },
    deadlineDue: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        fontWeight: '600',
    },
    welcomeSection: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
    },
    welcomeCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        border: '2px solid #e2e8f0',
        textAlign: 'center',
    },
    welcomeIcon: {
        width: '80px',
        height: '80px',
        margin: '0 auto 24px',
        borderRadius: '50%',
        backgroundColor: '#eef2ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6366f1',
    },
    welcomeTitle: {
        margin: '0 0 12px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    welcomeDesc: {
        margin: '0 0 24px 0',
        fontSize: '15px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    primaryButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

// CSS 애니메이션
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        // 아이콘 색상
        styleSheet.insertRule(`
            .primary { background-color: #eef2ff; color: #6366f1; }
        `, styleSheet.cssRules.length);
        styleSheet.insertRule(`
            .warning { background-color: #fef3c7; color: #f59e0b; }
        `, styleSheet.cssRules.length);
        styleSheet.insertRule(`
            .success { background-color: #d1fae5; color: #10b981; }
        `, styleSheet.cssRules.length);
        styleSheet.insertRule(`
            .danger { background-color: #fee2e2; color: #ef4444; }
        `, styleSheet.cssRules.length);

        // 스피너 애니메이션
        styleSheet.insertRule(`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
    } catch (e) {
        console.log('스타일 추가됨');
    }
}

export default Dashboard;