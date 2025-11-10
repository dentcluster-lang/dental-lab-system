import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { 
    ShoppingCart, Package, Truck, CheckCircle, 
    Search, Calendar, User, DollarSign, Eye, ChevronLeft, ChevronRight 
} from 'lucide-react';

const OrderManagement = ({ userInfo }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    
    // 🆕 정렬 및 페이지네이션
    const [sortBy, setSortBy] = useState('createdAt-desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const statusOptions = [
        { value: 'all', label: '전체 주문' },
        { value: 'pending', label: '주문접수' },
        { value: 'confirmed', label: '주문확인' },
        { value: 'preparing', label: '배송준비' },
        { value: 'shipped', label: '배송중' },
        { value: 'delivered', label: '배송완료' },
        { value: 'cancelled', label: '주문취소' }
    ];

    // 🆕 정렬 옵션
    const sortOptions = [
        { value: 'createdAt-desc', label: '최신순' },
        { value: 'createdAt-asc', label: '오래된순' },
        { value: 'totalAmount-desc', label: '높은 금액순' },
        { value: 'totalAmount-asc', label: '낮은 금액순' },
        { value: 'buyerName-asc', label: '구매자명순' }
    ];

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'orders'),
                where('sellerId', '==', userInfo.uid),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setOrders(ordersData);
        } catch (error) {
            console.error('주문 로딩 오류:', error);
            alert('주문을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [userInfo]);

    useEffect(() => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            window.location.href = '/signin';
            return;
        }

        if (userInfo.companyId && userInfo.role !== 'owner' && userInfo.role !== 'manager') {
            alert('주문 관리는 관리자만 가능합니다.');
            window.location.href = '/dashboard';
            return;
        }

        if (userInfo.sellerStatus !== 'approved') {
            alert('판매자 승인 후 이용 가능합니다.');
            window.location.href = '/seller-application';
            return;
        }

        loadOrders();
    }, [userInfo, loadOrders]);

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: new Date()
            });
            
            setOrders(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
            
            alert('주문 상태가 변경되었습니다.');
        } catch (error) {
            console.error('상태 변경 오류:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = 
            order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.productName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        // 🆕 정렬
        const [field, order] = sortBy.split('-');
        let comparison = 0;

        if (field === 'buyerName') {
            comparison = (a.buyerName || '').localeCompare(b.buyerName || '', 'ko');
        } else if (field === 'totalAmount') {
            comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
        } else if (field === 'createdAt') {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
            comparison = aTime - bTime;
        }

        return order === 'desc' ? -comparison : comparison;
    });

    // 🆕 페이지네이션
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentOrders = filteredOrders.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getStatusLabel = (status) => {
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

    const getStatusColor = (status) => {
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

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNextStatus = (currentStatus) => {
        const statusFlow = {
            'pending': 'confirmed',
            'confirmed': 'preparing',
            'preparing': 'shipped',
            'shipped': 'delivered'
        };
        return statusFlow[currentStatus];
    };

    const getNextStatusLabel = (currentStatus) => {
        const nextStatus = getNextStatus(currentStatus);
        return nextStatus ? getStatusLabel(nextStatus) : null;
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>주문 목록을 불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <ShoppingCart size={32} color="#6366f1" />
                    <div>
                        <h1 style={styles.title}>주문 관리</h1>
                        <p style={styles.subtitle}>총 {orders.length}건의 주문</p>
                    </div>
                </div>
            </div>

            {/* 필터 영역 */}
            <div style={styles.filterBar}>
                <div style={styles.searchBox}>
                    <Search size={20} color="#64748b" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="주문번호, 구매자명, 상품명으로 검색..."
                        style={styles.searchInput}
                    />
                </div>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={styles.select}
                >
                    {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {/* 🆕 정렬 */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={styles.select}
                >
                    {sortOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* 통계 카드 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#fef3c7'}}>
                        <Package size={20} color="#f59e0b" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>신규 주문</div>
                        <div style={styles.statValue}>
                            {orders.filter(o => o.status === 'pending').length}건
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#dbeafe'}}>
                        <CheckCircle size={20} color="#3b82f6" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>처리중</div>
                        <div style={styles.statValue}>
                            {orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length}건
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#ccfbf1'}}>
                        <Truck size={20} color="#06b6d4" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>배송중</div>
                        <div style={styles.statValue}>
                            {orders.filter(o => o.status === 'shipped').length}건
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#dcfce7'}}>
                        <CheckCircle size={20} color="#10b981" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statLabel}>배송완료</div>
                        <div style={styles.statValue}>
                            {orders.filter(o => o.status === 'delivered').length}건
                        </div>
                    </div>
                </div>
            </div>

            {/* 주문 목록 */}
            {filteredOrders.length === 0 ? (
                <div style={styles.emptyState}>
                    <ShoppingCart size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>
                        {searchTerm || filterStatus !== 'all'
                            ? '검색 결과가 없습니다.'
                            : '아직 주문이 없습니다.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* 🆕 페이지 정보 */}
                    <div style={styles.pageInfo}>
                        {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} / 총 {filteredOrders.length}개
                    </div>

                    <div style={styles.orderList}>
                        {currentOrders.map(order => (
                        <div key={order.id} style={styles.orderCard}>
                            <div style={styles.orderHeader}>
                                <div style={styles.orderHeaderLeft}>
                                    <span style={styles.orderId}>주문 #{order.orderId || order.id.slice(0, 8)}</span>
                                    <span 
                                        style={{
                                            ...styles.statusBadge,
                                            backgroundColor: getStatusColor(order.status) + '20',
                                            color: getStatusColor(order.status)
                                        }}
                                    >
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>
                                <div style={styles.orderDate}>
                                    <Calendar size={14} />
                                    {formatDate(order.createdAt)}
                                </div>
                            </div>

                            <div style={styles.orderBody}>
                                <div style={styles.productInfo}>
                                    {order.productImage && (
                                        <img 
                                            src={order.productImage} 
                                            alt={order.productName}
                                            style={styles.productImage}
                                        />
                                    )}
                                    <div style={styles.productDetails}>
                                        <div style={styles.productName}>{order.productName}</div>
                                        <div style={styles.productMeta}>
                                            수량: {order.quantity}개 × {formatPrice(order.price)}원
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.orderInfo}>
                                    <div style={styles.infoRow}>
                                        <User size={16} color="#64748b" />
                                        <span style={styles.infoLabel}>구매자:</span>
                                        <span style={styles.infoValue}>{order.buyerName}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <DollarSign size={16} color="#64748b" />
                                        <span style={styles.infoLabel}>주문 금액:</span>
                                        <span style={styles.infoValue}>{formatPrice(order.totalAmount)}원</span>
                                    </div>
                                    {order.shippingAddress && (
                                        <div style={styles.infoRow}>
                                            <Package size={16} color="#64748b" />
                                            <span style={styles.infoLabel}>배송지:</span>
                                            <span style={styles.infoValue}>{order.shippingAddress}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={styles.orderActions}>
                                <button
                                    style={styles.detailButton}
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <Eye size={16} />
                                    상세보기
                                </button>

                                {order.status !== 'delivered' && order.status !== 'cancelled' && getNextStatus(order.status) && (
                                    <button
                                        style={styles.actionButton}
                                        onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                                    >
                                        {getNextStatusLabel(order.status)}로 변경
                                    </button>
                                )}

                                {order.status === 'pending' && (
                                    <button
                                        style={{...styles.actionButton, backgroundColor: '#fef2f2', color: '#ef4444'}}
                                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                    >
                                        주문 취소
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 🆕 페이지네이션 */}
                {totalPages > 1 && (
                    <div style={styles.pagination}>
                        <button
                            style={{
                                ...styles.pageButton,
                                opacity: currentPage === 1 ? 0.5 : 1,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 2 && page <= currentPage + 2)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        style={{
                                            ...styles.pageButton,
                                            ...(page === currentPage ? styles.activePageButton : {})
                                        }}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (page === currentPage - 3 || page === currentPage + 3) {
                                return <span key={page} style={styles.pageEllipsis}>...</span>;
                            }
                            return null;
                        })}

                        <button
                            style={{
                                ...styles.pageButton,
                                opacity: currentPage === totalPages ? 0.5 : 1,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </>
            )}

            {/* 상세보기 모달 */}
            {selectedOrder && (
                <div style={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>주문 상세 정보</h2>
                            <button 
                                style={styles.closeButton}
                                onClick={() => setSelectedOrder(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.modalSection}>
                                <h3 style={styles.modalSectionTitle}>주문 정보</h3>
                                <div style={styles.modalInfo}>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>주문번호:</span>
                                        <span>{selectedOrder.orderId || selectedOrder.id}</span>
                                    </div>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>주문일시:</span>
                                        <span>{formatDate(selectedOrder.createdAt)}</span>
                                    </div>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>주문상태:</span>
                                        <span 
                                            style={{
                                                ...styles.statusBadge,
                                                backgroundColor: getStatusColor(selectedOrder.status) + '20',
                                                color: getStatusColor(selectedOrder.status)
                                            }}
                                        >
                                            {getStatusLabel(selectedOrder.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.modalSection}>
                                <h3 style={styles.modalSectionTitle}>상품 정보</h3>
                                <div style={styles.modalInfo}>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>상품명:</span>
                                        <span>{selectedOrder.productName}</span>
                                    </div>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>수량:</span>
                                        <span>{selectedOrder.quantity}개</span>
                                    </div>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>단가:</span>
                                        <span>{formatPrice(selectedOrder.price)}원</span>
                                    </div>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>합계:</span>
                                        <span style={styles.totalAmount}>{formatPrice(selectedOrder.totalAmount)}원</span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.modalSection}>
                                <h3 style={styles.modalSectionTitle}>구매자 정보</h3>
                                <div style={styles.modalInfo}>
                                    <div style={styles.modalRow}>
                                        <span style={styles.modalLabel}>이름:</span>
                                        <span>{selectedOrder.buyerName}</span>
                                    </div>
                                    {selectedOrder.buyerPhone && (
                                        <div style={styles.modalRow}>
                                            <span style={styles.modalLabel}>연락처:</span>
                                            <span>{selectedOrder.buyerPhone}</span>
                                        </div>
                                    )}
                                    {selectedOrder.buyerEmail && (
                                        <div style={styles.modalRow}>
                                            <span style={styles.modalLabel}>이메일:</span>
                                            <span>{selectedOrder.buyerEmail}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedOrder.shippingAddress && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>배송 정보</h3>
                                    <div style={styles.modalInfo}>
                                        <div style={styles.modalRow}>
                                            <span style={styles.modalLabel}>배송지:</span>
                                            <span>{selectedOrder.shippingAddress}</span>
                                        </div>
                                        {selectedOrder.trackingNumber && (
                                            <div style={styles.modalRow}>
                                                <span style={styles.modalLabel}>송장번호:</span>
                                                <span>{selectedOrder.trackingNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                style={styles.modalCloseButton}
                                onClick={() => setSelectedOrder(null)}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
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
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '4px 0 0 0',
    },
    filterBar: {
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
    },
    searchBox: {
        flex: 1,
        minWidth: '300px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
    },
    searchInput: {
        flex: 1,
        padding: '12px 0',
        fontSize: '15px',
        border: 'none',
        outline: 'none',
    },
    select: {
        padding: '12px 16px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        backgroundColor: 'white',
        cursor: 'pointer',
        outline: 'none',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    statIcon: {
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
    },
    statContent: {
        flex: 1,
    },
    statLabel: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    orderList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    orderCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    orderHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
    },
    orderHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    orderId: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#1e293b',
    },
    statusBadge: {
        padding: '4px 12px',
        fontSize: '13px',
        fontWeight: '600',
        borderRadius: '6px',
    },
    orderDate: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#64748b',
    },
    orderBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '16px',
    },
    productInfo: {
        display: 'flex',
        gap: '12px',
    },
    productImage: {
        width: '80px',
        height: '80px',
        borderRadius: '8px',
        objectFit: 'cover',
        border: '1px solid #e2e8f0',
    },
    productDetails: {
        flex: 1,
    },
    productName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '4px',
    },
    productMeta: {
        fontSize: '14px',
        color: '#64748b',
    },
    orderInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
    },
    infoLabel: {
        color: '#64748b',
        fontWeight: '500',
    },
    infoValue: {
        color: '#1e293b',
        fontWeight: '600',
    },
    orderActions: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    detailButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    actionButton: {
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        backgroundColor: 'white',
        borderRadius: '16px',
    },
    emptyText: {
        fontSize: '16px',
        color: '#64748b',
        margin: '16px 0',
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
    // 모달 스타일
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    closeButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '8px',
        fontSize: '18px',
        cursor: 'pointer',
        color: '#64748b',
    },
    modalBody: {
        padding: '24px',
    },
    modalSection: {
        marginBottom: '24px',
    },
    modalSectionTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '12px',
    },
    modalInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    modalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f1f5f9',
    },
    modalLabel: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#6366f1',
    },
    modalFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'flex-end',
    },
    modalCloseButton: {
        padding: '10px 24px',
        fontSize: '14px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    // 🆕 페이지네이션 스타일
    pageInfo: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '12px 16px',
        marginBottom: '16px',
        fontSize: '14px',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '32px',
        padding: '20px 0',
    },
    pageButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40px',
        height: '40px',
        padding: '0 12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    activePageButton: {
        color: 'white',
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    pageEllipsis: {
        padding: '0 8px',
        color: '#94a3b8',
    },
};

export default OrderManagement;