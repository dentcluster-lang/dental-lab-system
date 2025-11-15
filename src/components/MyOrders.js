import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Package, Clock, Truck, CheckCircle, XCircle, Search, ChevronRight } from 'lucide-react';

const MyOrders = ({ userInfo }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (userInfo) {
            loadOrders();
        }
    }, [userInfo]);

    const loadOrders = async () => {
        try {
            const ordersQuery = query(
                collection(db, 'orders'),
                where('userId', '==', userInfo.uid),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(ordersQuery);
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setOrders(ordersData);
        } catch (error) {
            console.error('주문 내역 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status) => {
        const statusMap = {
            pending: { 
                label: '결제 대기', 
                color: '#f59e0b', 
                icon: Clock,
                bgColor: '#fef3c7'
            },
            paid: { 
                label: '결제 완료', 
                color: '#10b981', 
                icon: CheckCircle,
                bgColor: '#d1fae5'
            },
            preparing: { 
                label: '배송 준비 중', 
                color: '#6366f1', 
                icon: Package,
                bgColor: '#e0e7ff'
            },
            shipping: { 
                label: '배송 중', 
                color: '#3b82f6', 
                icon: Truck,
                bgColor: '#dbeafe'
            },
            delivered: { 
                label: '배송 완료', 
                color: '#10b981', 
                icon: CheckCircle,
                bgColor: '#d1fae5'
            },
            cancelled: { 
                label: '주문 취소', 
                color: '#ef4444', 
                icon: XCircle,
                bgColor: '#fee2e2'
            }
        };
        return statusMap[status] || statusMap.pending;
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch = searchTerm === '' || 
            order.items.some(item => 
                item.productName.toLowerCase().includes(searchTerm.toLowerCase())
            ) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <Package size={48} color="#6366f1" />
                <p style={styles.loadingText}>주문 내역을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Package size={32} color="#6366f1" />
                    <h1 style={styles.title}>주문 내역</h1>
                </div>
            </div>

            {/* 필터 & 검색 */}
            <div style={styles.filters}>
                <div style={styles.statusFilters}>
                    {[
                        { value: 'all', label: '전체' },
                        { value: 'pending', label: '결제 대기' },
                        { value: 'paid', label: '결제 완료' },
                        { value: 'preparing', label: '배송 준비' },
                        { value: 'shipping', label: '배송 중' },
                        { value: 'delivered', label: '배송 완료' },
                        { value: 'cancelled', label: '취소' }
                    ].map(status => (
                        <button
                            key={status.value}
                            style={{
                                ...styles.filterButton,
                                ...(filterStatus === status.value ? styles.filterButtonActive : {})
                            }}
                            onClick={() => setFilterStatus(status.value)}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>

                <div style={styles.searchBox}>
                    <Search size={20} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="주문번호 또는 상품명 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 주문 목록 */}
            {filteredOrders.length === 0 ? (
                <div style={styles.emptyState}>
                    <Package size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>
                        {searchTerm || filterStatus !== 'all' 
                            ? '검색 결과가 없습니다' 
                            : '주문 내역이 없습니다'}
                    </p>
                    {!searchTerm && filterStatus === 'all' && (
                        <button 
                            style={styles.shopButton}
                            onClick={() => navigate('/marketplace')}
                        >
                            쇼핑하러 가기
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.ordersList}>
                    {filteredOrders.map(order => {
                        const statusInfo = getStatusInfo(order.status);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div key={order.id} style={styles.orderCard}>
                                {/* 주문 헤더 */}
                                <div style={styles.orderHeader}>
                                    <div style={styles.orderHeaderLeft}>
                                        <span style={styles.orderDate}>
                                            {formatDate(order.createdAt)}
                                        </span>
                                        <span style={styles.orderDivider}>•</span>
                                        <span style={styles.orderId}>
                                            주문번호: {order.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <div 
                                        style={{
                                            ...styles.statusBadge,
                                            backgroundColor: statusInfo.bgColor,
                                            color: statusInfo.color
                                        }}
                                    >
                                        <StatusIcon size={16} />
                                        <span>{statusInfo.label}</span>
                                    </div>
                                </div>

                                {/* 주문 상품 */}
                                <div style={styles.orderItems}>
                                    {order.items.map((item, index) => (
                                        <div key={index} style={styles.orderItem}>
                                            <img 
                                                src={item.image || '/placeholder-product.png'}
                                                alt={item.productName}
                                                style={styles.itemImage}
                                            />
                                            <div style={styles.itemInfo}>
                                                <p style={styles.itemName}>{item.productName}</p>
                                                <p style={styles.itemDetails}>
                                                    {item.price.toLocaleString()}원 × {item.quantity}개
                                                </p>
                                            </div>
                                            <div style={styles.itemTotal}>
                                                {(item.price * item.quantity).toLocaleString()}원
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 주문 푸터 */}
                                <div style={styles.orderFooter}>
                                    <div style={styles.orderTotal}>
                                        <span style={styles.totalLabel}>총 결제 금액</span>
                                        <span style={styles.totalAmount}>
                                            {order.payment?.total.toLocaleString()}원
                                        </span>
                                    </div>
                                    <button 
                                        style={styles.detailButton}
                                        onClick={() => navigate(`/order/${order.id}`)}
                                    >
                                        <span>상세보기</span>
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    filters: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    statusFilters: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    filterButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        border: '2px solid transparent',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    filterButtonActive: {
        color: '#6366f1',
        backgroundColor: '#f0f1ff',
        borderColor: '#6366f1',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '15px',
        outline: 'none',
    },
    ordersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    orderCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s',
    },
    orderHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f1f5f9',
    },
    orderHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    orderDate: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
    },
    orderDivider: {
        color: '#cbd5e1',
    },
    orderId: {
        fontSize: '14px',
        color: '#64748b',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '600',
    },
    orderItems: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '20px',
    },
    orderItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    itemImage: {
        width: '70px',
        height: '70px',
        objectFit: 'cover',
        borderRadius: '8px',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
        margin: '0 0 6px 0',
    },
    itemDetails: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0,
    },
    itemTotal: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    orderFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: '2px solid #f1f5f9',
    },
    orderTotal: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    totalLabel: {
        fontSize: '14px',
        color: '#64748b',
    },
    totalAmount: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#6366f1',
    },
    detailButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#f0f1ff',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px',
        backgroundColor: 'white',
        borderRadius: '16px',
    },
    emptyText: {
        fontSize: '18px',
        color: '#64748b',
        margin: '24px 0',
    },
    shopButton: {
        padding: '14px 32px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        gap: '16px',
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748b',
    },
};

export default MyOrders;