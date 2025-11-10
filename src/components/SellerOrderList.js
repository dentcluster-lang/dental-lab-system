import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Package, Calendar, User, DollarSign,
    Clock, CheckCircle, XCircle, Truck, Search,
    FileText, Eye, MapPin
} from 'lucide-react';

function SellerOrderList({ userInfo }) {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [carrier, setCarrier] = useState('CJ대한통운');

    // ✅ 주문 목록 로드 - useCallback으로 감싸기
    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);

            // 판매자 ID 결정 (개인 또는 회사)
            const sellerId = userInfo.companyId || userInfo.uid;

            // 모든 주문 가져오기
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, orderBy('createdAt', 'desc'));
            
            const snapshot = await getDocs(q);
            
            // 판매자의 상품이 포함된 주문만 필터링
            const sellerOrders = [];
            
            snapshot.docs.forEach(docSnap => {
                const orderData = { id: docSnap.id, ...docSnap.data() };
                
                // items 배열에서 판매자의 상품 찾기
                const sellerItems = orderData.items?.filter(item => 
                    item.sellerId === sellerId
                ) || [];
                
                if (sellerItems.length > 0) {
                    // 판매자 상품 금액만 계산
                    const sellerTotal = sellerItems.reduce((sum, item) => 
                        sum + (item.price * item.quantity), 0
                    );
                    
                    sellerOrders.push({
                        ...orderData,
                        sellerItems, // 판매자의 상품만
                        sellerTotal, // 판매자 상품 금액만
                    });
                }
            });

            setOrders(sellerOrders);
            setFilteredOrders(sellerOrders);
            setLoading(false);
        } catch (error) {
            console.error('주문 목록 로드 실패:', error);
            alert('주문 목록을 불러오는데 실패했습니다.');
            setLoading(false);
        }
    }, [userInfo]);

    // 권한 체크
    useEffect(() => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            window.location.href = '/';
            return;
        }

        // 직원이고 일반 staff인 경우 접근 제한
        if (userInfo.companyId &&
            userInfo.role !== 'owner' &&
            userInfo.role !== 'manager') {
            alert('관리자만 사용 가능합니다.');
            window.location.href = '/dashboard';
            return;
        }

        loadOrders();
    }, [userInfo, loadOrders]);

    // 상태별 필터링
    useEffect(() => {
        let filtered = orders;

        // 상태 필터
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(order => order.status === selectedStatus);
        }

        // 검색어 필터
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.sellerItems.some(item =>
                    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        setFilteredOrders(filtered);
    }, [selectedStatus, searchTerm, orders]);

    // 주문 상태 변경
    const handleStatusChange = async (orderId, newStatus) => {
        if (!window.confirm('주문 상태를 변경하시겠습니까?')) return;

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: new Date()
            });

            alert('주문 상태가 변경되었습니다.');
            loadOrders();
        } catch (error) {
            console.error('상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    // 송장번호 입력 및 배송 시작
    const handleTrackingSubmit = async (orderId) => {
        if (!trackingNumber.trim()) {
            alert('송장번호를 입력해주세요.');
            return;
        }

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: 'shipping',
                'shipping.carrier': carrier,
                'shipping.trackingNumber': trackingNumber,
                'shipping.shippedAt': new Date(),
                updatedAt: new Date()
            });

            alert('송장번호가 등록되고 배송이 시작되었습니다.');
            setTrackingNumber('');
            setShowDetailModal(false);
            loadOrders();
        } catch (error) {
            console.error('송장번호 등록 실패:', error);
            alert('송장번호 등록에 실패했습니다.');
        }
    };

    // 주문 상세 보기
    const handleViewDetail = (order) => {
        setSelectedOrder(order);
        setTrackingNumber(order.shipping?.trackingNumber || '');
        setCarrier(order.shipping?.carrier || 'CJ대한통운');
        setShowDetailModal(true);
    };

    // 상태별 통계
    const getStatusCount = (status) => {
        if (status === 'all') return orders.length;
        return orders.filter(order => order.status === status).length;
    };

    // 상태 표시 함수
    const getStatusDisplay = (status) => {
        const statusMap = {
            pending: { text: '결제 대기', color: '#f59e0b', icon: Clock },
            paid: { text: '결제 완료', color: '#10b981', icon: CheckCircle },
            preparing: { text: '배송 준비', color: '#6366f1', icon: Package },
            shipping: { text: '배송중', color: '#8b5cf6', icon: Truck },
            delivered: { text: '배송 완료', color: '#10b981', icon: CheckCircle },
            cancelled: { text: '취소', color: '#ef4444', icon: XCircle }
        };
        return statusMap[status] || statusMap.pending;
    };

    // 날짜 포맷팅
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <Package size={48} color="#6366f1" />
                <p style={styles.loadingText}>주문 목록을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Package size={28} color="#6366f1" />
                    <h1 style={styles.title}>주문 관리</h1>
                </div>
                <div style={styles.headerRight}>
                    <div style={styles.searchBox}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="주문번호, 구매자, 상품명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                </div>
            </div>

            {/* 상태 탭 */}
            <div style={styles.statusTabs}>
                <button
                    onClick={() => setSelectedStatus('all')}
                    style={{
                        ...styles.statusTab,
                        ...(selectedStatus === 'all' && styles.statusTabActive)
                    }}
                >
                    전체
                    <span style={styles.statusCount}>{getStatusCount('all')}</span>
                </button>
                <button
                    onClick={() => setSelectedStatus('paid')}
                    style={{
                        ...styles.statusTab,
                        ...(selectedStatus === 'paid' && styles.statusTabActive)
                    }}
                >
                    결제 완료
                    <span style={styles.statusCount}>{getStatusCount('paid')}</span>
                </button>
                <button
                    onClick={() => setSelectedStatus('preparing')}
                    style={{
                        ...styles.statusTab,
                        ...(selectedStatus === 'preparing' && styles.statusTabActive)
                    }}
                >
                    배송 준비
                    <span style={styles.statusCount}>{getStatusCount('preparing')}</span>
                </button>
                <button
                    onClick={() => setSelectedStatus('shipping')}
                    style={{
                        ...styles.statusTab,
                        ...(selectedStatus === 'shipping' && styles.statusTabActive)
                    }}
                >
                    배송중
                    <span style={styles.statusCount}>{getStatusCount('shipping')}</span>
                </button>
                <button
                    onClick={() => setSelectedStatus('delivered')}
                    style={{
                        ...styles.statusTab,
                        ...(selectedStatus === 'delivered' && styles.statusTabActive)
                    }}
                >
                    배송 완료
                    <span style={styles.statusCount}>{getStatusCount('delivered')}</span>
                </button>
            </div>

            {/* 주문 목록 */}
            <div style={styles.orderList}>
                {filteredOrders.length === 0 ? (
                    <div style={styles.emptyState}>
                        <Package size={64} color="#cbd5e1" />
                        <p style={styles.emptyText}>
                            {searchTerm || selectedStatus !== 'all' 
                                ? '검색 결과가 없습니다' 
                                : '주문이 없습니다'}
                        </p>
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const statusInfo = getStatusDisplay(order.status);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div key={order.id} style={styles.orderCard}>
                                {/* 주문 헤더 */}
                                <div style={styles.orderHeader}>
                                    <div style={styles.orderHeaderLeft}>
                                        <span style={styles.orderId}>
                                            <FileText size={16} />
                                            {order.id.slice(0, 12)}
                                        </span>
                                        <span
                                            style={{
                                                ...styles.orderStatus,
                                                backgroundColor: statusInfo.color + '15',
                                                color: statusInfo.color
                                            }}
                                        >
                                            <StatusIcon size={14} />
                                            {statusInfo.text}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleViewDetail(order)}
                                        style={styles.detailButton}
                                    >
                                        <Eye size={16} />
                                        상세보기
                                    </button>
                                </div>

                                {/* 주문 정보 */}
                                <div style={styles.orderBody}>
                                    <div style={styles.orderInfo}>
                                        <div style={styles.infoRow}>
                                            <User size={16} color="#64748b" />
                                            <span style={styles.infoLabel}>구매자:</span>
                                            <span style={styles.infoValue}>{order.userName}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <Calendar size={16} color="#64748b" />
                                            <span style={styles.infoLabel}>주문일:</span>
                                            <span style={styles.infoValue}>
                                                {formatDate(order.createdAt)}
                                            </span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <Package size={16} color="#64748b" />
                                            <span style={styles.infoLabel}>상품:</span>
                                            <span style={styles.infoValue}>
                                                {order.sellerItems[0].productName}
                                                {order.sellerItems.length > 1 &&
                                                    ` 외 ${order.sellerItems.length - 1}건`
                                                }
                                            </span>
                                        </div>
                                        {order.shipping?.trackingNumber && (
                                            <div style={styles.infoRow}>
                                                <Truck size={16} color="#64748b" />
                                                <span style={styles.infoLabel}>송장:</span>
                                                <span style={styles.infoValue}>
                                                    {order.shipping.carrier} / {order.shipping.trackingNumber}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.orderAmount}>
                                        <DollarSign size={20} color="#6366f1" />
                                        <span style={styles.amountValue}>
                                            {order.sellerTotal.toLocaleString()}원
                                        </span>
                                    </div>
                                </div>

                                {/* 액션 버튼 */}
                                <div style={styles.orderActions}>
                                    {order.status === 'paid' && (
                                        <>
                                            <button
                                                onClick={() => handleViewDetail(order)}
                                                style={styles.actionButtonPrimary}
                                            >
                                                <Truck size={16} />
                                                배송 시작
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(order.id, 'preparing')}
                                                style={styles.actionButton}
                                            >
                                                배송 준비 중으로 변경
                                            </button>
                                        </>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => handleViewDetail(order)}
                                            style={styles.actionButtonPrimary}
                                        >
                                            <Truck size={16} />
                                            송장번호 입력
                                        </button>
                                    )}
                                    {order.status === 'shipping' && (
                                        <button
                                            onClick={() => handleStatusChange(order.id, 'delivered')}
                                            style={styles.actionButtonPrimary}
                                        >
                                            <CheckCircle size={16} />
                                            배송 완료 처리
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 주문 상세 모달 */}
            {showDetailModal && selectedOrder && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>주문 상세</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.closeButton}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            {/* 기본 정보 */}
                            <div style={styles.detailSection}>
                                <h3 style={styles.sectionTitle}>주문 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>주문번호</span>
                                        <span style={styles.detailValue}>{selectedOrder.id}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>주문일시</span>
                                        <span style={styles.detailValue}>
                                            {formatDate(selectedOrder.createdAt)}
                                        </span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>구매자</span>
                                        <span style={styles.detailValue}>{selectedOrder.userName}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>상태</span>
                                        <span style={styles.detailValue}>
                                            {getStatusDisplay(selectedOrder.status).text}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 상품 목록 (판매자 상품만) */}
                            <div style={styles.detailSection}>
                                <h3 style={styles.sectionTitle}>주문 상품</h3>
                                {selectedOrder.sellerItems.map((item, index) => (
                                    <div key={index} style={styles.productItem}>
                                        <div style={styles.productInfo}>
                                            <span style={styles.productName}>{item.productName}</span>
                                            <span style={styles.productMeta}>
                                                {item.quantity}개 × {item.price.toLocaleString()}원
                                            </span>
                                        </div>
                                        <span style={styles.productTotal}>
                                            {(item.price * item.quantity).toLocaleString()}원
                                        </span>
                                    </div>
                                ))}
                                <div style={styles.totalAmount}>
                                    <span>총 판매금액</span>
                                    <span style={styles.totalValue}>
                                        {selectedOrder.sellerTotal.toLocaleString()}원
                                    </span>
                                </div>
                            </div>

                            {/* 배송 정보 */}
                            <div style={styles.detailSection}>
                                <h3 style={styles.sectionTitle}>배송 정보</h3>
                                {selectedOrder.shipping && (
                                    <div style={styles.addressBox}>
                                        <div style={styles.addressRow}>
                                            <MapPin size={16} color="#6366f1" />
                                            <div>
                                                <p style={styles.addressName}>{selectedOrder.shipping.name}</p>
                                                <p style={styles.addressPhone}>{selectedOrder.shipping.phone}</p>
                                                <p style={styles.addressText}>
                                                    ({selectedOrder.shipping.zipcode}) {selectedOrder.shipping.address}
                                                </p>
                                                {selectedOrder.shipping.detailAddress && (
                                                    <p style={styles.addressText}>
                                                        {selectedOrder.shipping.detailAddress}
                                                    </p>
                                                )}
                                                {selectedOrder.shipping.message && (
                                                    <p style={styles.addressMessage}>
                                                        📝 {selectedOrder.shipping.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 송장번호 입력 (paid 또는 preparing 상태) */}
                                {(selectedOrder.status === 'paid' || selectedOrder.status === 'preparing') && (
                                    <div style={styles.trackingInputSection}>
                                        <div style={styles.formGroup}>
                                            <label style={styles.inputLabel}>택배사</label>
                                            <select
                                                value={carrier}
                                                onChange={(e) => setCarrier(e.target.value)}
                                                style={styles.select}
                                            >
                                                <option value="CJ대한통운">CJ대한통운</option>
                                                <option value="우체국택배">우체국택배</option>
                                                <option value="한진택배">한진택배</option>
                                                <option value="롯데택배">롯데택배</option>
                                                <option value="로젠택배">로젠택배</option>
                                            </select>
                                        </div>
                                        <div style={styles.formGroup}>
                                            <label style={styles.inputLabel}>송장번호</label>
                                            <div style={styles.trackingInput}>
                                                <input
                                                    type="text"
                                                    placeholder="송장번호를 입력하세요"
                                                    value={trackingNumber}
                                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                                    style={styles.input}
                                                />
                                                <button
                                                    onClick={() => handleTrackingSubmit(selectedOrder.id)}
                                                    style={styles.submitButton}
                                                >
                                                    <Truck size={18} />
                                                    배송 시작
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 송장번호 표시 (shipping 또는 delivered 상태) */}
                                {selectedOrder.shipping?.trackingNumber && (
                                    <div style={styles.trackingInfo}>
                                        <Truck size={20} color="#6366f1" />
                                        <div>
                                            <p style={styles.trackingLabel}>배송 정보</p>
                                            <p style={styles.trackingNumber}>
                                                {selectedOrder.shipping.carrier} / {selectedOrder.shipping.trackingNumber}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '32px',
        maxWidth: '1400px',
        margin: '0 auto',
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
        fontWeight: '500',
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
        gap: '12px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    headerRight: {
        display: 'flex',
        gap: '12px',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        minWidth: '300px',
    },
    searchInput: {
        border: 'none',
        outline: 'none',
        fontSize: '14px',
        flex: 1,
        color: '#1e293b',
    },
    statusTabs: {
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '8px',
    },
    statusTab: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
    statusTabActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
        color: 'white',
    },
    statusCount: {
        padding: '2px 8px',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '700',
    },
    orderList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        backgroundColor: 'white',
        borderRadius: '16px',
        gap: '16px',
    },
    emptyText: {
        fontSize: '16px',
        color: '#94a3b8',
        fontWeight: '500',
    },
    orderCard: {
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        transition: 'all 0.2s',
    },
    orderHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9',
    },
    orderHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    orderId: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        fontWeight: '700',
        color: '#475569',
    },
    orderStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
    },
    detailButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    orderBody: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
    },
    orderInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flex: 1,
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    infoLabel: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '500',
        minWidth: '60px',
    },
    infoValue: {
        fontSize: '14px',
        color: '#1e293b',
        fontWeight: '600',
    },
    orderAmount: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px',
    },
    amountValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#6366f1',
    },
    orderActions: {
        display: 'flex',
        gap: '8px',
        paddingTop: '16px',
        borderTop: '1px solid #f1f5f9',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    actionButtonPrimary: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        backgroundColor: '#6366f1',
        border: '2px solid #6366f1',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
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
        padding: '20px',
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '20px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
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
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        fontSize: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        padding: '24px',
    },
    detailSection: {
        marginBottom: '24px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '16px',
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    detailLabel: {
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: '14px',
        color: '#1e293b',
        fontWeight: '600',
    },
    productItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        marginBottom: '8px',
    },
    productInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    productName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
    },
    productMeta: {
        fontSize: '12px',
        color: '#64748b',
    },
    productTotal: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#6366f1',
    },
    totalAmount: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '10px',
        marginTop: '12px',
        fontSize: '15px',
        fontWeight: '600',
    },
    totalValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#6366f1',
    },
    addressBox: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        marginBottom: '16px',
    },
    addressRow: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
    },
    addressName: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 4px 0',
    },
    addressPhone: {
        fontSize: '14px',
        color: '#475569',
        margin: '0 0 8px 0',
    },
    addressText: {
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.6',
        margin: '0 0 4px 0',
    },
    addressMessage: {
        fontSize: '13px',
        color: '#6366f1',
        fontStyle: 'italic',
        margin: '8px 0 0 0',
        padding: '8px',
        backgroundColor: '#f0f9ff',
        borderRadius: '6px',
    },
    trackingInputSection: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    formGroup: {
        marginBottom: '12px',
    },
    inputLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        marginBottom: '6px',
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1e293b',
        backgroundColor: 'white',
        cursor: 'pointer',
        outline: 'none',
    },
    trackingInput: {
        display: 'flex',
        gap: '12px',
    },
    input: {
        flex: 1,
        padding: '10px 12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1e293b',
        outline: 'none',
    },
    submitButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 24px',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    trackingInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '10px',
    },
    trackingLabel: {
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
        margin: 0,
    },
    trackingNumber: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#6366f1',
        margin: 0,
        marginTop: '4px',
    },
};

export default SellerOrderList;