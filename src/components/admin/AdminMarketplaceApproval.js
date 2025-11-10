import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { approvePayment, rejectPayment } from '../../services/UnifiedPaymentService';
import { 
    CheckCircle, XCircle, Trash2, Eye, ShoppingBag, 
    Calendar, DollarSign, Clock, Search, Filter, Percent
} from 'lucide-react';

function AdminMarketplaceApproval({ user }) {
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingPaymentId, setRejectingPaymentId] = useState(null);

    // 통계
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });

    useEffect(() => {
        loadPayments();
    }, []);

    useEffect(() => {
        filterPayments();
        calculateStats();
    }, [payments, searchQuery, filterStatus]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'servicePayments'),
                where('serviceType', '==', 'marketplace-product'),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const paymentsList = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const paymentData = docSnap.data();
                    
                    // 상품 정보 가져오기
                    let productData = null;
                    if (paymentData.contentId) {
                        const productDoc = await getDoc(doc(db, 'marketplaceProducts', paymentData.contentId));
                        if (productDoc.exists()) {
                            productData = productDoc.data();
                        }
                    }

                    return {
                        id: docSnap.id,
                        ...paymentData,
                        productData: productData
                    };
                })
            );
            
            setPayments(paymentsList);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterPayments = () => {
        let filtered = payments;

        // 상태 필터
        if (filterStatus !== 'all') {
            filtered = filtered.filter(payment => payment.status === filterStatus);
        }

        // 검색
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(payment =>
                (payment.userName || '').toLowerCase().includes(query) ||
                (payment.userEmail || '').toLowerCase().includes(query) ||
                (payment.orderNumber || '').toLowerCase().includes(query) ||
                (payment.productData?.name || '').toLowerCase().includes(query) ||
                (payment.productData?.brand || '').toLowerCase().includes(query)
            );
        }

        setFilteredPayments(filtered);
    };

    const calculateStats = () => {
        setStats({
            total: payments.length,
            pending: payments.filter(p => p.status === 'pending').length,
            approved: payments.filter(p => p.status === 'approved').length,
            rejected: payments.filter(p => p.status === 'rejected').length
        });
    };

    const handleApprove = async (paymentId) => {
        if (!window.confirm('이 결제를 승인하시겠습니까?')) return;

        try {
            setProcessing(true);
            await approvePayment(paymentId, user.uid);
            alert('승인이 완료되었습니다.');
            loadPayments();
        } catch (error) {
            console.error('승인 실패:', error);
            alert('승인에 실패했습니다: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleRejectClick = (paymentId) => {
        setRejectingPaymentId(paymentId);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) {
            alert('반려 사유를 입력해주세요.');
            return;
        }

        try {
            setProcessing(true);
            await rejectPayment(rejectingPaymentId, user.uid, rejectReason);
            alert('반려가 완료되었습니다.');
            setShowRejectModal(false);
            setRejectingPaymentId(null);
            setRejectReason('');
            loadPayments();
        } catch (error) {
            console.error('반려 실패:', error);
            alert('반려에 실패했습니다: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (paymentId) => {
        if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            setProcessing(true);
            await deleteDoc(doc(db, 'servicePayments', paymentId));
            alert('삭제되었습니다.');
            loadPayments();
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleViewDetail = (payment) => {
        setSelectedPayment(payment);
        setShowDetailModal(true);
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: '승인 대기', color: '#f59e0b', bg: '#fef3c7' },
            approved: { text: '승인 완료', color: '#10b981', bg: '#d1fae5' },
            rejected: { text: '반려됨', color: '#ef4444', bg: '#fee2e2' }
        };
        const badge = badges[status] || badges.pending;
        return (
            <span style={{
                ...styles.statusBadge,
                color: badge.color,
                backgroundColor: badge.bg
            }}>
                {badge.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>마켓플레이스 상품 승인 관리</h1>
                    <p style={styles.subtitle}>
                        결제 완료된 상품을 검토하고 승인하세요
                        <span style={styles.commissionNote}> • 판매 시 5% 수수료</span>
                    </p>
                </div>
            </div>

            {/* 통계 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="blue">
                        <ShoppingBag size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.total}</div>
                        <div style={styles.statLabel}>전체</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="yellow">
                        <Clock size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.pending}</div>
                        <div style={styles.statLabel}>승인 대기</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="green">
                        <CheckCircle size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.approved}</div>
                        <div style={styles.statLabel}>승인 완료</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="red">
                        <XCircle size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.rejected}</div>
                        <div style={styles.statLabel}>반려됨</div>
                    </div>
                </div>
            </div>

            {/* 수수료 안내 */}
            <div style={styles.infoBox}>
                <Percent size={20} />
                <div style={styles.infoText}>
                    <strong>수수료 정책:</strong> 마켓플레이스에서 판매되는 모든 상품은 판매가의 5%가 수수료로 부과됩니다.
                </div>
            </div>

            {/* 검색 및 필터 */}
            <div style={styles.controls}>
                <div style={styles.searchBox}>
                    <Search size={20} color="#64748b" />
                    <input
                        type="text"
                        placeholder="상품명, 브랜드, 사용자, 주문번호로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <div style={styles.filterBox}>
                    <Filter size={18} color="#64748b" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="all">전체 상태</option>
                        <option value="pending">승인 대기</option>
                        <option value="approved">승인 완료</option>
                        <option value="rejected">반려됨</option>
                    </select>
                </div>
            </div>

            {/* 테이블 */}
            <div style={styles.tableContainer}>
                {filteredPayments.length === 0 ? (
                    <div style={styles.emptyState}>
                        <ShoppingBag size={64} color="#cbd5e1" />
                        <p style={styles.emptyText}>결제 내역이 없습니다</p>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>주문번호</th>
                                <th style={styles.th}>상품명</th>
                                <th style={styles.th}>브랜드</th>
                                <th style={styles.th}>판매자</th>
                                <th style={styles.th}>등록비</th>
                                <th style={styles.th}>판매가</th>
                                <th style={styles.th}>기간</th>
                                <th style={styles.th}>신청일</th>
                                <th style={styles.th}>상태</th>
                                <th style={styles.th}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map(payment => (
                                <tr key={payment.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <span style={styles.orderNumber}>
                                            {payment.orderNumber}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <strong>{payment.productData?.name || '-'}</strong>
                                    </td>
                                    <td style={styles.td}>
                                        {payment.productData?.brand || '-'}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.userInfo}>
                                            <div style={styles.userName}>{payment.userName}</div>
                                            <div style={styles.userEmail}>{payment.userEmail}</div>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <strong style={styles.amount}>
                                            {payment.amount?.toLocaleString()}원
                                        </strong>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.priceInfo}>
                                            <span style={styles.price}>
                                                {payment.productData?.price?.toLocaleString()}원
                                            </span>
                                            <span style={styles.commission}>
                                                (수수료 5%)
                                            </span>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        {payment.duration}일
                                    </td>
                                    <td style={styles.td}>
                                        {payment.createdAt?.toDate?.().toLocaleDateString() || '-'}
                                    </td>
                                    <td style={styles.td}>
                                        {getStatusBadge(payment.status)}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button
                                                onClick={() => handleViewDetail(payment)}
                                                style={styles.actionButton}
                                                title="상세보기"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {payment.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(payment.id)}
                                                        style={{...styles.actionButton, ...styles.approveButton}}
                                                        disabled={processing}
                                                        title="승인"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectClick(payment.id)}
                                                        style={{...styles.actionButton, ...styles.rejectButton}}
                                                        disabled={processing}
                                                        title="반려"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(payment.id)}
                                                style={{...styles.actionButton, ...styles.deleteButton}}
                                                disabled={processing}
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 상세 보기 모달 */}
            {showDetailModal && selectedPayment && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>결제 상세 정보</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.modalCloseButton}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>기본 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>주문번호</span>
                                        <span style={styles.detailValue}>{selectedPayment.orderNumber}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>상태</span>
                                        {getStatusBadge(selectedPayment.status)}
                                    </div>
                                </div>
                            </div>

                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>상품 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>상품명</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.productData?.name || '-'}
                                        </span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>브랜드</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.productData?.brand || '-'}
                                        </span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>카테고리</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.productData?.category || '-'}
                                        </span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>판매가</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.productData?.price?.toLocaleString()}원
                                        </span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>설명</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.productData?.description || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>판매자 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>이름</span>
                                        <span style={styles.detailValue}>{selectedPayment.userName}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>이메일</span>
                                        <span style={styles.detailValue}>{selectedPayment.userEmail}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>전화번호</span>
                                        <span style={styles.detailValue}>{selectedPayment.userPhone || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>결제 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>등록비</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.amount?.toLocaleString()}원
                                        </span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>기간</span>
                                        <span style={styles.detailValue}>{selectedPayment.duration}일</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>만료일</span>
                                        <span style={styles.detailValue}>
                                            {selectedPayment.expiryDate?.toDate?.().toLocaleDateString() || 
                                             new Date(selectedPayment.expiryDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div style={styles.commissionBox}>
                                    <Percent size={18} />
                                    <span>판매 시 5% 수수료가 부과됩니다</span>
                                </div>
                            </div>

                            {selectedPayment.status === 'rejected' && (
                                <div style={styles.detailSection}>
                                    <h3 style={styles.detailSectionTitle}>반려 정보</h3>
                                    <div style={styles.detailGrid}>
                                        <div style={styles.detailItem}>
                                            <span style={styles.detailLabel}>반려 사유</span>
                                            <span style={styles.detailValue}>
                                                {selectedPayment.rejectionReason || '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={styles.modalFooter}>
                            {selectedPayment.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            handleApprove(selectedPayment.id);
                                        }}
                                        style={styles.approveButtonLarge}
                                        disabled={processing}
                                    >
                                        <CheckCircle size={20} />
                                        승인
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            handleRejectClick(selectedPayment.id);
                                        }}
                                        style={styles.rejectButtonLarge}
                                        disabled={processing}
                                    >
                                        <XCircle size={20} />
                                        반려
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.closeButtonLarge}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 반려 사유 입력 모달 */}
            {showRejectModal && (
                <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
                    <div style={styles.rejectModal} onClick={e => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>반려 사유 입력</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="반려 사유를 입력해주세요..."
                            style={styles.rejectTextarea}
                            rows={5}
                        />
                        <div style={styles.rejectModalButtons}>
                            <button
                                onClick={handleRejectSubmit}
                                style={styles.rejectSubmitButton}
                                disabled={processing || !rejectReason.trim()}
                            >
                                반려 확정
                            </button>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                style={styles.rejectCancelButton}
                            >
                                취소
                            </button>
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
    loading: {
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
    header: {
        marginBottom: '24px',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: '8px 0 0 0',
        fontSize: '15px',
        color: '#64748b',
    },
    commissionNote: {
        color: '#6366f1',
        fontWeight: '600',
    },
    infoBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        marginBottom: '24px',
        color: '#1e40af',
    },
    infoText: {
        fontSize: '14px',
        lineHeight: 1.5,
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: 1,
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#64748b',
    },
    controls: {
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
    },
    searchBox: {
        flex: '1 1 300px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#0f172a',
    },
    filterBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
    },
    filterSelect: {
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#0f172a',
        cursor: 'pointer',
        backgroundColor: 'transparent',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '16px',
        textAlign: 'left',
        fontSize: '13px',
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '2px solid #e2e8f0',
        backgroundColor: '#f8fafc',
    },
    tr: {
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s',
    },
    td: {
        padding: '16px',
        fontSize: '14px',
        color: '#0f172a',
    },
    orderNumber: {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6366f1',
        fontWeight: '600',
    },
    userInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    userName: {
        fontWeight: '600',
        color: '#0f172a',
    },
    userEmail: {
        fontSize: '13px',
        color: '#64748b',
    },
    amount: {
        color: '#6366f1',
        fontWeight: '700',
    },
    priceInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    price: {
        fontWeight: '600',
        color: '#0f172a',
    },
    commission: {
        fontSize: '12px',
        color: '#64748b',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
    },
    actionButtons: {
        display: 'flex',
        gap: '8px',
    },
    actionButton: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    approveButton: {
        borderColor: '#10b981',
        color: '#10b981',
    },
    rejectButton: {
        borderColor: '#ef4444',
        color: '#ef4444',
    },
    deleteButton: {
        borderColor: '#ef4444',
        color: '#ef4444',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        gap: '16px',
    },
    emptyText: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#64748b',
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
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '16px',
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
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    modalCloseButton: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '24px',
        color: '#64748b',
        cursor: 'pointer',
        borderRadius: '6px',
    },
    modalBody: {
        padding: '24px',
    },
    detailSection: {
        marginBottom: '24px',
    },
    detailSectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    detailLabel: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: '15px',
        color: '#0f172a',
        fontWeight: '500',
    },
    commissionBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        marginTop: '12px',
        color: '#1e40af',
        fontSize: '14px',
        fontWeight: '600',
    },
    modalFooter: {
        display: 'flex',
        gap: '12px',
        padding: '24px',
        borderTop: '1px solid #e2e8f0',
        justifyContent: 'flex-end',
    },
    approveButtonLarge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    rejectButtonLarge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    closeButtonLarge: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    rejectModal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
    },
    rejectTextarea: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '15px',
        fontFamily: 'inherit',
        resize: 'vertical',
        outline: 'none',
        marginTop: '16px',
        marginBottom: '16px',
    },
    rejectModalButtons: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
    },
    rejectSubmitButton: {
        padding: '12px 24px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    rejectCancelButton: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

// CSS 추가
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`[data-color="blue"] { background-color: #dbeafe; color: #3b82f6; }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`[data-color="yellow"] { background-color: #fef3c7; color: #f59e0b; }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`[data-color="green"] { background-color: #d1fae5; color: #10b981; }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`[data-color="red"] { background-color: #fee2e2; color: #ef4444; }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`table tr:hover { background-color: #f8fafc; }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`button:hover:not(:disabled) { opacity: 0.8; transform: translateY(-1px); }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`button:disabled { opacity: 0.5; cursor: not-allowed; }`, styleSheet.cssRules.length);
    } catch (e) {}
}

export default AdminMarketplaceApproval;