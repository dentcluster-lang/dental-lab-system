import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    LayoutDashboard, Package, Clock, FileText, Calendar,
    Bell, MessageSquare, ShoppingCart, BarChart3, CreditCard,
    Settings, User, TrendingUp, Send, Inbox, Eye, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

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

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) return;

            const userInfo = userDoc.data();
            setUserData(userInfo);

            let companyInfo = null;
            if (userInfo.companyId) {
                const companyDoc = await getDoc(doc(db, 'users', userInfo.companyId));
                if (companyDoc.exists()) {
                    companyInfo = companyDoc.data();
                }
            }

            const businessType = userInfo.companyId ? companyInfo?.businessType : userInfo.businessType;

            if (businessType === 'dental' || businessType === 'clinic') {
                await loadDentalDashboard(userInfo, companyInfo);
            } else if (businessType === 'lab') {
                await loadLabDashboard(userInfo, companyInfo);
            } else {
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

    const loadDentalDashboard = async (userInfo, companyInfo) => {
        const userId = userInfo.companyId || user.uid;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        try {
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

            const allOrders = [...sentOrders, ...receivedOrders].sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate - aDate;
            });

            const todayOrders = allOrders.filter(order => {
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                return orderDate >= today;
            });

            const todayDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() :
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() :
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= today && dueDate < tomorrow;
            });

            const tomorrowDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() :
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() :
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
            });

            const completedOrders = allOrders.filter(o => o.status === 'completed');

            const chatsQuery = query(
                collection(db, 'chatRooms'),
                where('participants', 'array-contains', userId),
                orderBy('lastMessageTime', 'desc'),
                limit(5)
            );
            const chatsSnapshot = await getDocs(chatsQuery);

            const recentChats = await Promise.all(
                chatsSnapshot.docs.map(async (chatDoc) => {
                    const chatData = chatDoc.data();
                    const partnerId = chatData.participants?.find(id => id !== userId);

                    let partnerName = '상대방';
                    if (partnerId) {
                        try {
                            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                            if (partnerDoc.exists()) {
                                const partnerData = partnerDoc.data();
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

            const statistics = {
                totalOrders: allOrders.length,
                todayOrders: todayOrders.length,
                completedOrders: completedOrders.length,
                todayDeadlines: todayDeadlines.length,
                tomorrowDeadlines: tomorrowDeadlines.length,
                unreadMessages: recentChats.filter(chat => chat.unreadCount > 0).length,
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

    const loadLabDashboard = async (userInfo, companyInfo) => {
        const userId = userInfo.companyId || user.uid;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        try {
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

            const allOrders = [...receivedOrders, ...sentOrders].sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate - aDate;
            });

            const todayOrders = allOrders.filter(order => {
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                return orderDate >= today;
            });

            const todayDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() :
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() :
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= today && dueDate < tomorrow;
            });

            const tomorrowDeadlines = allOrders.filter(order => {
                if (!order.dueDate && !order.deliveryDate) return false;
                const dueDate = (order.dueDate?.toDate ? order.dueDate.toDate() :
                               order.deliveryDate?.toDate ? order.deliveryDate.toDate() :
                               new Date(order.dueDate || order.deliveryDate));
                return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
            });

            const completedOrders = allOrders.filter(o => o.status === 'completed');

            const chatsQuery = query(
                collection(db, 'chatRooms'),
                where('participants', 'array-contains', userId),
                orderBy('lastMessageTime', 'desc'),
                limit(5)
            );
            const chatsSnapshot = await getDocs(chatsQuery);

            const recentChats = await Promise.all(
                chatsSnapshot.docs.map(async (chatDoc) => {
                    const chatData = chatDoc.data();
                    const partnerId = chatData.participants?.find(id => id !== userId);

                    let partnerName = '상대방';
                    if (partnerId) {
                        try {
                            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                            if (partnerDoc.exists()) {
                                const partnerData = partnerDoc.data();
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

            const statistics = {
                totalOrders: allOrders.length,
                todayOrders: todayOrders.length,
                completedOrders: completedOrders.length,
                todayDeadlines: todayDeadlines.length,
                tomorrowDeadlines: tomorrowDeadlines.length,
                unreadMessages: recentChats.filter(chat => chat.unreadCount > 0).length,
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

    const getStatusLabel = (status) => {
        const labels = {
            pending: '대기중',
            in_progress: '진행중',
            completed: '완료',
            cancelled: '취소'
        };
        return labels[status] || status;
    };

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
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">대시보드 로딩 중...</p>
            </div>
        );
    }

    if (dashboardData.isIndividual) {
        return (
            <div className="dashboard-container">
                <div className="welcome-section">
                    <div className="welcome-card">
                        <div className="welcome-icon">
                            <User size={40} />
                        </div>
                        <h2 className="welcome-title">환영합니다!</h2>
                        <p className="welcome-desc">
                            DentConnect를 이용하려면 치과 또는 기공소로 등록해주세요.
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="primary-button"
                        >
                            사업자 등록하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 주요 기능 메뉴
    const featureMenus = [
        {
            icon: <Package size={24} />,
            label: '주문관리',
            path: '/orders',
            color: '#6366f1',
            bgColor: '#eef2ff'
        },
        {
            icon: <MessageSquare size={24} />,
            label: '채팅',
            path: '/chat',
            color: '#10b981',
            bgColor: '#d1fae5',
            badge: dashboardData.statistics.unreadMessages > 0 ? dashboardData.statistics.unreadMessages : null
        },
        {
            icon: <ShoppingCart size={24} />,
            label: '마켓플레이스',
            path: '/marketplace',
            color: '#f59e0b',
            bgColor: '#fef3c7'
        },
        {
            icon: <BarChart3 size={24} />,
            label: '통계',
            path: '/statistics',
            color: '#8b5cf6',
            bgColor: '#f3e8ff'
        },
        {
            icon: <Calendar size={24} />,
            label: '캘린더',
            path: '/calendar',
            color: '#3b82f6',
            bgColor: '#dbeafe'
        },
        {
            icon: <Bell size={24} />,
            label: '알림',
            path: '/profile',
            color: '#ef4444',
            bgColor: '#fee2e2'
        },
        {
            icon: <CreditCard size={24} />,
            label: '결제',
            path: '/transactions',
            color: '#14b8a6',
            bgColor: '#ccfbf1'
        },
        {
            icon: <Settings size={24} />,
            label: '설정',
            path: '/profile',
            color: '#64748b',
            bgColor: '#f1f5f9'
        }
    ];

    return (
        <div className="dashboard-container">
            {/* 상단: 프로필 + 알림 */}
            <div className="dashboard-header">
                <div className="header-profile">
                    <div className="profile-avatar">
                        <User size={24} />
                    </div>
                    <div className="profile-info">
                        <div className="profile-greeting">안녕하세요</div>
                        <div className="profile-name">{userData?.name || userData?.businessName}님</div>
                    </div>
                </div>
                <button className="notification-btn" onClick={() => navigate('/profile')}>
                    <Bell size={24} />
                    {dashboardData.statistics.unreadMessages > 0 && (
                        <span className="notification-badge">{dashboardData.statistics.unreadMessages}</span>
                    )}
                </button>
            </div>

            {/* 퀵 액세스 배너 */}
            <div className="quick-access-banner">
                <div className="banner-card primary" onClick={() => navigate('/orders')}>
                    <div className="banner-icon">
                        <Package size={28} />
                    </div>
                    <div className="banner-content">
                        <div className="banner-label">오늘 접수</div>
                        <div className="banner-value">{dashboardData.statistics.todayOrders}건</div>
                    </div>
                    <ChevronRight size={20} />
                </div>

                <div className="banner-card danger" onClick={() => navigate('/orders')}>
                    <div className="banner-icon">
                        <Clock size={28} />
                    </div>
                    <div className="banner-content">
                        <div className="banner-label">오늘 마감</div>
                        <div className="banner-value">{dashboardData.statistics.todayDeadlines}건</div>
                    </div>
                    <ChevronRight size={20} />
                </div>

                <div className="banner-card success" onClick={() => navigate('/chat')}>
                    <div className="banner-icon">
                        <MessageSquare size={28} />
                    </div>
                    <div className="banner-content">
                        <div className="banner-label">새 메시지</div>
                        <div className="banner-value">{dashboardData.statistics.unreadMessages}개</div>
                    </div>
                    <ChevronRight size={20} />
                </div>
            </div>

            {/* 주요 기능 그리드 */}
            <div className="features-section">
                <h3 className="section-title">주요 기능</h3>
                <div className="features-grid">
                    {featureMenus.map((menu, index) => (
                        <div
                            key={index}
                            className="feature-card"
                            onClick={() => navigate(menu.path)}
                        >
                            <div className="feature-icon" style={{ backgroundColor: menu.bgColor, color: menu.color }}>
                                {menu.icon}
                            </div>
                            <div className="feature-label">{menu.label}</div>
                            {menu.badge && (
                                <span className="feature-badge">{menu.badge}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 최근 활동 리스트 */}
            <div className="recent-activity-section">
                <div className="section-header">
                    <h3 className="section-title">최근 활동</h3>
                    <button className="view-all-btn" onClick={() => navigate('/orders')}>
                        전체보기
                    </button>
                </div>

                <div className="activity-list">
                    {!dashboardData.allOrders || dashboardData.allOrders.length === 0 ? (
                        <div className="empty-state">
                            <Package size={48} color="#cbd5e1" />
                            <p>최근 활동이 없습니다</p>
                        </div>
                    ) : (
                        dashboardData.allOrders.slice(0, 8).map(order => (
                            <div
                                key={order.id}
                                className="activity-item"
                                onClick={() => handleViewOrder(order.id)}
                            >
                                <div className="activity-icon" style={{
                                    backgroundColor: order.orderType === 'sent' ? '#dbeafe' : '#d1fae5',
                                    color: order.orderType === 'sent' ? '#3b82f6' : '#10b981'
                                }}>
                                    {order.orderType === 'sent' ? <Send size={16} /> : <Inbox size={16} />}
                                </div>
                                <div className="activity-info">
                                    <div className="activity-title">
                                        {order.patientName || '환자명 없음'}
                                    </div>
                                    <div className="activity-meta">
                                        {order.orderType === 'sent' ? order.toUserName || order.labName : order.fromUserName || order.dentistName} • {formatTime(order.createdAt)}
                                    </div>
                                </div>
                                <div className="activity-status" style={{
                                    backgroundColor: getStatusColor(order.status) + '20',
                                    color: getStatusColor(order.status)
                                }}>
                                    {getStatusLabel(order.status)}
                                </div>
                                <Eye size={16} color="#94a3b8" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 하단 네비게이션 */}
            <div className="bottom-navigation">
                <button className="nav-item active" onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard size={24} />
                    <span>홈</span>
                </button>
                <button className="nav-item" onClick={() => navigate('/orders')}>
                    <FileText size={24} />
                    <span>주문</span>
                </button>
                <button className="nav-item" onClick={() => navigate('/chat')}>
                    <MessageSquare size={24} />
                    <span>채팅</span>
                    {dashboardData.statistics.unreadMessages > 0 && (
                        <span className="nav-badge">{dashboardData.statistics.unreadMessages}</span>
                    )}
                </button>
                <button className="nav-item" onClick={() => navigate('/marketplace')}>
                    <ShoppingCart size={24} />
                    <span>마켓</span>
                </button>
                <button className="nav-item" onClick={() => navigate('/profile')}>
                    <User size={24} />
                    <span>프로필</span>
                </button>
            </div>
        </div>
    );
}

export default Dashboard;
