import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { 
    TrendingUp, Package, DollarSign, ShoppingCart, 
    Eye, Star, Clock, ArrowUp 
} from 'lucide-react';

const SellerDashboard = ({ userInfo }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalViews: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    const loadDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            // 상품 통계
            // ✅ 수정: marketplaceProducts 컬렉션 사용
            const productsQuery = query(
                collection(db, 'marketplaceProducts'),
                where('sellerId', '==', userInfo.uid)
            );
            const productsSnapshot = await getDocs(productsQuery);
            const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const totalProducts = products.length;
            const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);

            // 주문 통계
            const ordersQuery = query(
                collection(db, 'orders'),
                where('sellerId', '==', userInfo.uid),
                orderBy('createdAt', 'desc')
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const totalOrders = orders.length;
            const totalSales = orders
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

            // 최근 주문 (최대 5개)
            const recentOrdersList = orders.slice(0, 5);

            // 인기 상품 Top 5
            const sortedProducts = [...products]
                .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
                .slice(0, 5);

            setStats({
                totalSales,
                totalOrders,
                totalProducts,
                totalViews
            });
            setRecentOrders(recentOrdersList);
            setTopProducts(sortedProducts);

        } catch (error) {
            console.error('대시보드 데이터 로딩 오류:', error);
        } finally {
            setLoading(false);
        }
    }, [userInfo]);

    useEffect(() => {
        // ✅ A안: businessType 체크 제거 - sellerStatus만 확인
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            window.location.href = '/signin';
            return;
        }

        // ✅ 권한 체크: 직원이면서 일반 staff는 접근 불가
        if (userInfo.companyId && userInfo.role !== 'owner' && userInfo.role !== 'manager') {
            alert('판매자 대시보드는 관리자만 접근 가능합니다.');
            window.location.href = '/dashboard';
            return;
        }

        if (userInfo.sellerStatus !== 'approved') {
            alert('판매자 승인 후 이용 가능합니다.');
            window.location.href = '/seller-application';
            return;
        }

        loadDashboardData();
    }, [userInfo, loadDashboardData]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getOrderStatusLabel = (status) => {
        const statusMap = {
            'pending': '주문접수',
            'confirmed': '주문확인',
            'preparing': '배송준비',
            'shipped': '배송중',
            'delivered': '배송완료',
            'cancelled': '주문취소'
        };
        return statusMap[status] || status;
    };

    const getOrderStatusColor = (status) => {
        const colorMap = {
            'pending': '#f59e0b',
            'confirmed': '#3b82f6',
            'preparing': '#8b5cf6',
            'shipped': '#06b6d4',
            'delivered': '#10b981',
            'cancelled': '#ef4444'
        };
        return colorMap[status] || '#6b7280';
    };

    const getBusinessTypeLabel = () => {
        const types = {
            'dental': '치과의원',
            'lab': '치과기공소',
            'supplier': '재료 판매업체'
        };
        return types[userInfo?.businessType] || userInfo?.businessType;
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>대시보드를 불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>판매자 대시보드</h1>
                    <p style={styles.subtitle}>
                        {getBusinessTypeLabel()} · {userInfo?.businessName || userInfo?.name}
                    </p>
                </div>
            </div>

            {/* 통계 카드 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}>
                        <DollarSign size={24} color="#3b82f6" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>총 매출</div>
                        <div style={styles.statValue}>{formatPrice(stats.totalSales)}원</div>
                        <div style={styles.statChange}>
                            <ArrowUp size={14} />
                            이번 달
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}>
                        <ShoppingCart size={24} color="#10b981" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>총 주문</div>
                        <div style={styles.statValue}>{stats.totalOrders}건</div>
                        <div style={styles.statChange}>
                            <ArrowUp size={14} />
                            전체 기간
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#fce7f3' }}>
                        <Package size={24} color="#ec4899" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>등록 상품</div>
                        <div style={styles.statValue}>{stats.totalProducts}개</div>
                        <div style={styles.statChange}>
                            <Clock size={14} />
                            현재
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7' }}>
                        <Eye size={24} color="#f59e0b" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>총 조회수</div>
                        <div style={styles.statValue}>{formatPrice(stats.totalViews)}</div>
                        <div style={styles.statChange}>
                            <TrendingUp size={14} />
                            누적
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div style={styles.mainContent}>
                {/* 최근 주문 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>
                            <ShoppingCart size={20} />
                            최근 주문
                        </h2>
                        <button 
                            style={styles.viewAllButton}
                            onClick={() => window.location.href = '/orders'}
                        >
                            전체보기
                        </button>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div style={styles.emptyState}>
                            <ShoppingCart size={48} color="#cbd5e1" />
                            <p style={styles.emptyText}>아직 주문이 없습니다</p>
                        </div>
                    ) : (
                        <div style={styles.orderList}>
                            {recentOrders.map(order => (
                                <div key={order.id} style={styles.orderItem}>
                                    <div style={styles.orderHeader}>
                                        <span style={styles.orderId}>주문 #{order.orderId}</span>
                                        <span 
                                            style={{
                                                ...styles.orderStatus,
                                                backgroundColor: getOrderStatusColor(order.status) + '20',
                                                color: getOrderStatusColor(order.status)
                                            }}
                                        >
                                            {getOrderStatusLabel(order.status)}
                                        </span>
                                    </div>
                                    <div style={styles.orderInfo}>
                                        <span style={styles.orderBuyer}>{order.buyerName}</span>
                                        <span style={styles.orderAmount}>
                                            {formatPrice(order.totalAmount)}원
                                        </span>
                                    </div>
                                    <div style={styles.orderDate}>
                                        {formatDate(order.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 인기 상품 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>
                            <Star size={20} />
                            인기 상품 Top 5
                        </h2>
                        <button 
                            style={styles.viewAllButton}
                            onClick={() => window.location.href = '/product-management'}
                        >
                            전체보기
                        </button>
                    </div>

                    {topProducts.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Package size={48} color="#cbd5e1" />
                            <p style={styles.emptyText}>등록된 상품이 없습니다</p>
                            <button 
                                style={styles.emptyButton}
                                onClick={() => window.location.href = '/product-registration'}
                            >
                                상품 등록하기
                            </button>
                        </div>
                    ) : (
                        <div style={styles.productList}>
                            {topProducts.map((product, index) => (
                                <div key={product.id} style={styles.productItem}>
                                    <div style={styles.productRank}>{index + 1}</div>
                                    <div style={styles.productImageSmall}>
                                        {product.images && product.images.length > 0 ? (
                                            <img 
                                                src={product.images[0]} 
                                                alt={product.name}
                                                style={styles.imageSmall}
                                            />
                                        ) : (
                                            <Package size={20} color="#cbd5e1" />
                                        )}
                                    </div>
                                    <div style={styles.productDetails}>
                                        <div style={styles.productName}>{product.name}</div>
                                        <div style={styles.productMeta}>
                                            {formatPrice(product.price)}원
                                        </div>
                                    </div>
                                    <div style={styles.productStats}>
                                        <div style={styles.productStat}>
                                            <Eye size={14} />
                                            {product.viewCount || 0}
                                        </div>
                                        <div style={styles.productStat}>
                                            <ShoppingCart size={14} />
                                            {product.orderCount || 0}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 빠른 작업 */}
            <div style={styles.quickActions}>
                <button 
                    style={styles.quickActionButton}
                    onClick={() => window.location.href = '/product-registration'}
                >
                    <Package size={32} />
                    상품 등록
                </button>
                <button 
                    style={styles.quickActionButton}
                    onClick={() => window.location.href = '/product-management'}
                >
                    <ShoppingCart size={32} />
                    상품 관리
                </button>
                <button 
                    style={styles.quickActionButton}
                    onClick={() => window.location.href = '/orders'}
                >
                    <DollarSign size={32} />
                    주문 관리
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
    },
    header: {
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '4px 0 0 0',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    statCard: {
        display: 'flex',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        flexShrink: 0,
    },
    statContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    statLabel: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '500',
    },
    statValue: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
    },
    statChange: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#10b981',
        fontWeight: '600',
    },
    mainContent: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    viewAllButton: {
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
    },
    emptyText: {
        fontSize: '14px',
        color: '#94a3b8',
        margin: '12px 0',
    },
    emptyButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        marginTop: '8px',
    },
    productList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    productItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    productRank: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '700',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        borderRadius: '8px',
        flexShrink: 0,
    },
    productImageSmall: {
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
    },
    imageSmall: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    productDetails: {
        flex: 1,
        minWidth: 0,
    },
    productName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: '2px',
    },
    productMeta: {
        fontSize: '12px',
        color: '#64748b',
    },
    productStats: {
        display: 'flex',
        gap: '12px',
        flexShrink: 0,
    },
    productStat: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '600',
    },
    orderList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    orderItem: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    orderHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    orderId: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#475569',
    },
    orderStatus: {
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: '600',
        borderRadius: '6px',
    },
    orderInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    orderBuyer: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
    },
    orderAmount: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#6366f1',
    },
    orderDate: {
        fontSize: '12px',
        color: '#94a3b8',
    },
    quickActions: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
    },
    quickActionButton: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '24px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748b',
    },
};

export default SellerDashboard;