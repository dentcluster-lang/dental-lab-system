import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    Package, CheckCircle, XCircle, Clock, 
    Phone, Mail, Calendar, Search, Image as ImageIcon,
    Building2, DollarSign, Star, X
} from 'lucide-react';

function AdminProductApproval({ userInfo }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const loadApplications = useCallback(async () => {
        try {
            setLoading(true);

            let q;
            if (filter === 'all') {
                q = query(collection(db, 'newProducts'));
            } else {
                q = query(
                    collection(db, 'newProducts'),
                    where('status', '==', filter)
                );
            }

            const snapshot = await getDocs(q);
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 최신순 정렬
            apps.sort((a, b) => {
                const aTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
                const bTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
                return aTime - bTime;
            });

            setApplications(apps);
        } catch (error) {
            console.error('신제품 신청서 로딩 실패:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        // 관리자 권한 체크
        if (!userInfo || (!userInfo.isAdmin && userInfo.role !== 'admin')) {
            alert('관리자만 접근 가능합니다.');
            window.location.href = '/';
            return;
        }

        loadApplications();
    }, [userInfo, filter, loadApplications]);

    const handleApprove = async (product) => {
        if (!window.confirm(`"${product.productName}" 신제품을 승인하시겠습니까?`)) {
            return;
        }

        try {
            const updateData = {
                status: 'approved',
                approvedBy: userInfo.uid,
                approvedAt: Timestamp.now()
            };

            await updateDoc(doc(db, 'newProducts', product.id), updateData);

            alert('신제품 승인이 완료되었습니다!');
            setShowModal(false);
            loadApplications();
        } catch (error) {
            console.error('승인 처리 실패:', error);
            alert('승인 처리 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleReject = async (product) => {
        const reason = window.prompt('거부 사유를 입력하세요:');
        if (!reason) return;

        try {
            const updateData = {
                status: 'rejected',
                rejectedBy: userInfo.uid,
                rejectedAt: Timestamp.now(),
                rejectionReason: reason
            };

            await updateDoc(doc(db, 'newProducts', product.id), updateData);

            alert('신제품 신청이 거부되었습니다.');
            setShowModal(false);
            loadApplications();
        } catch (error) {
            console.error('거부 처리 실패:', error);
            alert('거부 처리 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#fef3c7', color: '#92400e', icon: <Clock size={16} /> },
            approved: { bg: '#d1fae5', color: '#065f46', icon: <CheckCircle size={16} /> },
            rejected: { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={16} /> }
        };

        const style = styles[status] || styles.pending;

        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: style.bg,
                color: style.color,
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600'
            }}>
                {style.icon}
                {status === 'pending' ? '대기중' : status === 'approved' ? '승인' : '거부'}
            </div>
        );
    };

    const getPaymentStatusBadge = (isPaid) => {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: isPaid ? '#dbeafe' : '#fee2e2',
                color: isPaid ? '#1e40af' : '#991b1b',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600'
            }}>
                <DollarSign size={16} />
                {isPaid ? '결제완료' : '결제대기'}
            </div>
        );
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR');
    };

    const handleRowClick = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedProduct(null);
    };

    const filteredApplications = applications.filter(app => {
        if (!searchQuery) return true;
        return app.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
    });

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
                    <h1 style={styles.title}>
                        <Package size={32} />
                        신제품 승인 관리
                    </h1>
                    <p style={styles.subtitle}>
                        신제품 등록 요청을 검토하고 승인/거부하세요
                    </p>
                </div>
            </div>

            {/* 통계 카드 */}
            <div style={styles.statsContainer}>
                <div style={{...styles.statCard, ...styles.statPending}}>
                    <Clock size={28} />
                    <div>
                        <div style={styles.statValue}>
                            {applications.filter(a => a.status === 'pending').length}
                        </div>
                        <div style={styles.statLabel}>대기중</div>
                    </div>
                </div>
                <div style={{...styles.statCard, ...styles.statApproved}}>
                    <CheckCircle size={28} />
                    <div>
                        <div style={styles.statValue}>
                            {applications.filter(a => a.status === 'approved').length}
                        </div>
                        <div style={styles.statLabel}>승인</div>
                    </div>
                </div>
                <div style={{...styles.statCard, ...styles.statRejected}}>
                    <XCircle size={28} />
                    <div>
                        <div style={styles.statValue}>
                            {applications.filter(a => a.status === 'rejected').length}
                        </div>
                        <div style={styles.statLabel}>거부</div>
                    </div>
                </div>
                <div style={{...styles.statCard, ...styles.statRevenue}}>
                    <DollarSign size={28} />
                    <div>
                        <div style={styles.statValue}>
                            {applications.filter(a => a.isPaid).length}
                        </div>
                        <div style={styles.statLabel}>결제완료</div>
                    </div>
                </div>
            </div>

            {/* 필터 & 검색 */}
            <div style={styles.controls}>
                <div style={styles.filterButtons}>
                    <button
                        onClick={() => setFilter('all')}
                        style={filter === 'all' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        전체 ({applications.length})
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        style={filter === 'pending' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        대기중 ({applications.filter(a => a.status === 'pending').length})
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        style={filter === 'approved' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        승인 ({applications.filter(a => a.status === 'approved').length})
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        style={filter === 'rejected' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        거부 ({applications.filter(a => a.status === 'rejected').length})
                    </button>
                </div>

                <div style={styles.searchBox}>
                    <Search size={20} color="#94a3b8" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="제품명, 제조사, 신청자 검색..."
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 테이블 */}
            {filteredApplications.length === 0 ? (
                <div style={styles.emptyState}>
                    <Package size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>신제품 신청 내역이 없습니다</p>
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={{...styles.th, width: '80px'}}>이미지</th>
                                <th style={{...styles.th, width: '200px'}}>제품명</th>
                                <th style={{...styles.th, width: '120px'}}>제조사</th>
                                <th style={{...styles.th, width: '100px'}}>가격</th>
                                <th style={{...styles.th, width: '120px'}}>신청자</th>
                                <th style={{...styles.th, width: '100px'}}>결제상태</th>
                                <th style={{...styles.th, width: '100px'}}>승인상태</th>
                                <th style={{...styles.th, width: '110px'}}>신청일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApplications.map((product) => (
                                <tr 
                                    key={product.id} 
                                    style={styles.tableRow}
                                    onClick={() => handleRowClick(product)}
                                >
                                    <td style={styles.td}>
                                        {product.imageUrl ? (
                                            <img 
                                                src={product.imageUrl} 
                                                alt={product.productName}
                                                style={styles.thumbnail}
                                            />
                                        ) : (
                                            <div style={styles.noImage}>
                                                <ImageIcon size={20} style={{ color: '#cbd5e1' }} />
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <span style={styles.productNameText}>{product.productName}</span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.manufacturerCell}>
                                            <Building2 size={14} style={{ color: '#10b981' }} />
                                            <span>{product.manufacturer}</span>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        {product.price ? (
                                            <span style={styles.priceText}>{product.price}</span>
                                        ) : (
                                            <span style={styles.noPriceText}>-</span>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {product.businessName || product.userName}
                                    </td>
                                    <td style={styles.td}>
                                        {getPaymentStatusBadge(product.isPaid)}
                                    </td>
                                    <td style={styles.td}>
                                        {getStatusBadge(product.status || 'pending')}
                                    </td>
                                    <td style={styles.td}>
                                        {formatDate(product.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 상세보기 모달 */}
            {showModal && selectedProduct && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        {/* 모달 헤더 */}
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>신제품 상세정보</h2>
                            <button onClick={closeModal} style={styles.closeButton}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* 모달 바디 */}
                        <div style={styles.modalBody}>
                            {/* 상태 배지들 */}
                            <div style={styles.modalBadges}>
                                {getStatusBadge(selectedProduct.status || 'pending')}
                                {getPaymentStatusBadge(selectedProduct.isPaid)}
                            </div>

                            {/* 이미지 */}
                            {selectedProduct.imageUrl && (
                                <div style={styles.modalImageContainer}>
                                    <img 
                                        src={selectedProduct.imageUrl} 
                                        alt={selectedProduct.productName}
                                        style={styles.modalImage}
                                    />
                                </div>
                            )}

                            {/* 기본 정보 */}
                            <div style={styles.modalSection}>
                                <h3 style={styles.modalProductName}>{selectedProduct.productName}</h3>

                                <div style={styles.modalInfoRow}>
                                    <Building2 size={18} style={{ color: '#10b981' }} />
                                    <span style={styles.modalManufacturer}>{selectedProduct.manufacturer}</span>
                                </div>

                                {selectedProduct.price && (
                                    <div style={styles.modalInfoRow}>
                                        <DollarSign size={18} style={{ color: '#6366f1' }} />
                                        <span style={styles.modalPrice}>{selectedProduct.price}</span>
                                    </div>
                                )}
                            </div>

                            {/* 제품 설명 */}
                            <div style={styles.modalSection}>
                                <h4 style={styles.modalSectionTitle}>제품 설명</h4>
                                <p style={styles.modalDescription}>{selectedProduct.description}</p>
                            </div>

                            {/* 주요 특징 */}
                            {selectedProduct.features && (
                                <div style={styles.modalSection}>
                                    <div style={styles.modalFeatureHeader}>
                                        <Star size={18} style={{ color: '#f59e0b' }} />
                                        <h4 style={styles.modalSectionTitle}>주요 특징</h4>
                                    </div>
                                    <p style={styles.modalDescription}>{selectedProduct.features}</p>
                                </div>
                            )}

                            {/* 문의처 */}
                            {selectedProduct.contactInfo && (
                                <div style={styles.modalSection}>
                                    <div style={styles.modalContactBox}>
                                        <Phone size={18} style={{ color: '#10b981' }} />
                                        <div>
                                            <div style={styles.modalContactLabel}>문의처</div>
                                            <div style={styles.modalContactInfo}>{selectedProduct.contactInfo}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 결제 정보 */}
                            <div style={styles.modalSection}>
                                <h4 style={styles.modalSectionTitle}>결제 정보</h4>
                                <div style={styles.paymentInfoGrid}>
                                    <div style={styles.paymentInfoItem}>
                                        <span style={styles.paymentLabel}>등록 비용:</span>
                                        <span style={styles.paymentValue}>
                                            {selectedProduct.registrationFee ? `${selectedProduct.registrationFee.toLocaleString()}원` : '50,000원'}
                                        </span>
                                    </div>
                                    <div style={styles.paymentInfoItem}>
                                        <span style={styles.paymentLabel}>결제 상태:</span>
                                        <span style={styles.paymentValue}>
                                            {selectedProduct.isPaid ? '결제완료' : '결제대기'}
                                        </span>
                                    </div>
                                    {selectedProduct.paidAt && (
                                        <div style={styles.paymentInfoItem}>
                                            <span style={styles.paymentLabel}>결제일:</span>
                                            <span style={styles.paymentValue}>
                                                {formatDate(selectedProduct.paidAt)}
                                            </span>
                                        </div>
                                    )}
                                    {selectedProduct.paymentMethod && (
                                        <div style={styles.paymentInfoItem}>
                                            <span style={styles.paymentLabel}>결제 방법:</span>
                                            <span style={styles.paymentValue}>
                                                {selectedProduct.paymentMethod}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 등록 정보 */}
                            <div style={styles.modalFooter}>
                                <div style={styles.modalFooterInfo}>
                                    <span style={styles.modalFooterLabel}>신청자:</span>
                                    <span style={styles.modalFooterValue}>
                                        {selectedProduct.businessName || selectedProduct.userName}
                                    </span>
                                </div>
                                <div style={styles.modalFooterInfo}>
                                    <span style={styles.modalFooterLabel}>신청일:</span>
                                    <span style={styles.modalFooterValue}>
                                        {formatDate(selectedProduct.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* 거부 사유 */}
                            {selectedProduct.status === 'rejected' && selectedProduct.rejectionReason && (
                                <div style={styles.rejectionBox}>
                                    <h4 style={styles.rejectionTitle}>거부 사유</h4>
                                    <p style={styles.rejectionReason}>{selectedProduct.rejectionReason}</p>
                                </div>
                            )}

                            {/* 승인/거부 버튼 */}
                            {selectedProduct.status === 'pending' && (
                                <div style={styles.modalActionSection}>
                                    <button
                                        onClick={() => handleReject(selectedProduct)}
                                        style={styles.modalRejectButton}
                                    >
                                        <XCircle size={18} />
                                        <span>거부</span>
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedProduct)}
                                        style={styles.modalApproveButton}
                                    >
                                        <CheckCircle size={18} />
                                        <span>승인</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        margin: '0 0 8px 0',
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0,
    },
    statsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    statPending: {
        borderLeft: '4px solid #f59e0b',
    },
    statApproved: {
        borderLeft: '4px solid #10b981',
    },
    statRejected: {
        borderLeft: '4px solid #ef4444',
    },
    statRevenue: {
        borderLeft: '4px solid #6366f1',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    statLabel: {
        fontSize: '14px',
        color: '#64748b',
        marginTop: '4px',
    },
    controls: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap',
    },
    filterButtons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    filterButton: {
        padding: '10px 20px',
        backgroundColor: 'white',
        color: '#64748b',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    filterButtonActive: {
        backgroundColor: '#6366f1',
        color: 'white',
        borderColor: '#6366f1',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        minWidth: '300px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '14px',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tableHeaderRow: {
        backgroundColor: '#f8fafc',
        borderBottom: '2px solid #e2e8f0',
    },
    th: {
        padding: '16px',
        textAlign: 'left',
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        whiteSpace: 'nowrap',
    },
    tableRow: {
        borderBottom: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    td: {
        padding: '16px',
        fontSize: '14px',
        color: '#1e293b',
        verticalAlign: 'middle',
    },
    thumbnail: {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '8px',
    },
    noImage: {
        width: '60px',
        height: '60px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productNameText: {
        fontWeight: '600',
    },
    manufacturerCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#10b981',
        fontWeight: '500',
    },
    priceText: {
        color: '#6366f1',
        fontWeight: '600',
    },
    noPriceText: {
        color: '#94a3b8',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '12px',
    },
    emptyText: {
        marginTop: '16px',
        fontSize: '14px',
        color: '#94a3b8',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        minHeight: '400px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
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
        padding: '20px',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff',
        zIndex: 1,
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    closeButton: {
        padding: '8px',
        backgroundColor: 'transparent',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'background-color 0.2s',
    },
    modalBody: {
        padding: '24px',
    },
    modalBadges: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
    },
    modalImageContainer: {
        width: '100%',
        marginBottom: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
    },
    modalSection: {
        marginBottom: '24px',
    },
    modalProductName: {
        margin: '0 0 16px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
    },
    modalInfoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
    },
    modalManufacturer: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#10b981',
    },
    modalPrice: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#6366f1',
    },
    modalSectionTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    modalDescription: {
        margin: 0,
        fontSize: '15px',
        color: '#475569',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
    },
    modalFeatureHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
    },
    modalContactBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '10px',
    },
    modalContactLabel: {
        fontSize: '12px',
        color: '#166534',
        fontWeight: '500',
        marginBottom: '4px',
    },
    modalContactInfo: {
        fontSize: '15px',
        color: '#166534',
        fontWeight: '600',
    },
    paymentInfoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    paymentInfoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    paymentLabel: {
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
    },
    paymentValue: {
        fontSize: '15px',
        color: '#1e293b',
        fontWeight: '600',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
        borderTop: '1px solid #e2e8f0',
        marginTop: '24px',
    },
    modalFooterInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    modalFooterLabel: {
        fontSize: '13px',
        color: '#94a3b8',
        fontWeight: '500',
    },
    modalFooterValue: {
        fontSize: '13px',
        color: '#475569',
        fontWeight: '600',
    },
    rejectionBox: {
        padding: '16px',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        marginTop: '24px',
    },
    rejectionTitle: {
        margin: '0 0 8px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#991b1b',
    },
    rejectionReason: {
        margin: 0,
        fontSize: '14px',
        color: '#991b1b',
        lineHeight: '1.6',
    },
    modalActionSection: {
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
    },
    modalRejectButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    modalApproveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default AdminProductApproval;