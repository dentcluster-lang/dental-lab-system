import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { approvePayment, rejectPayment } from '../../services/UnifiedPaymentService';
import { 
    CheckCircle, XCircle, Clock, Briefcase, 
    Phone, Mail, Calendar, Search, DollarSign, Building2, MapPin
} from 'lucide-react';

function AdminJobPostingApproval({ user }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected
    const [searchQuery, setSearchQuery] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingPaymentId, setRejectingPaymentId] = useState(null);

    const loadPayments = useCallback(async () => {
        try {
            setLoading(true);

            // orderBy 제거 - 인덱스 필요 없이 작동
            let q;
            if (filter === 'all') {
                q = query(
                    collection(db, 'servicePayments'),
                    where('serviceType', '==', 'job-posting')
                );
            } else {
                q = query(
                    collection(db, 'servicePayments'),
                    where('serviceType', '==', 'job-posting'),
                    where('status', '==', filter)
                );
            }

            const snapshot = await getDocs(q);
            const paymentsList = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const paymentData = docSnap.data();
                    
                    // 구인공고 정보 가져오기
                    let jobData = null;
                    if (paymentData.contentId) {
                        const jobDoc = await getDoc(doc(db, 'jobPostings', paymentData.contentId));
                        if (jobDoc.exists()) {
                            jobData = jobDoc.data();
                        }
                    }

                    return {
                        id: docSnap.id,
                        ...paymentData,
                        jobData: jobData
                    };
                })
            );

            // 클라이언트에서 최신순 정렬
            paymentsList.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
                return bTime - aTime;
            });

            setPayments(paymentsList);
        } catch (error) {
            console.error('결제 내역 로딩 실패:', error);
            alert('데이터를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        // 관리자 권한 체크
        if (!user || (!user.isAdmin && user.role !== 'admin')) {
            alert('관리자만 접근 가능합니다.');
            window.location.href = '/';
            return;
        }

        loadPayments();
    }, [user, filter, loadPayments]);

    const handleApprove = async (payment) => {
        if (!window.confirm(`"${payment.jobData?.companyName || '이 구인공고'}" 결제를 승인하시겠습니까?`)) {
            return;
        }

        try {
            setProcessing(true);
            await approvePayment(payment.id, user.uid);
            alert('승인이 완료되었습니다!');
            loadPayments();
        } catch (error) {
            console.error('승인 처리 실패:', error);
            alert('승인 처리 중 오류가 발생했습니다: ' + error.message);
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
            console.error('반려 처리 실패:', error);
            alert('반려 처리 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setProcessing(false);
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
                {status === 'pending' ? '승인대기' : status === 'approved' ? '승인완료' : '반려됨'}
            </div>
        );
    };

    const filteredPayments = payments.filter(payment => {
        if (!searchQuery) return true;
        return payment.jobData?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               payment.jobData?.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               payment.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               payment.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
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
                        <Briefcase size={32} />
                        구인공고 승인 관리
                    </h1>
                    <p style={styles.subtitle}>
                        결제 완료된 구인공고를 검토하고 승인/반려하세요
                    </p>
                </div>
            </div>

            {/* 필터 & 검색 */}
            <div style={styles.controls}>
                <div style={styles.filterButtons}>
                    <button
                        onClick={() => setFilter('all')}
                        style={filter === 'all' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        전체 ({payments.length})
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        style={filter === 'pending' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        승인대기 ({payments.filter(p => p.status === 'pending').length})
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        style={filter === 'approved' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        승인완료 ({payments.filter(p => p.status === 'approved').length})
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        style={filter === 'rejected' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        반려됨 ({payments.filter(p => p.status === 'rejected').length})
                    </button>
                </div>

                <div style={styles.searchBox}>
                    <Search size={20} color="#94a3b8" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="회사명, 포지션, 사용자, 주문번호 검색..."
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 구인공고 목록 */}
            {filteredPayments.length === 0 ? (
                <div style={styles.emptyState}>
                    <Briefcase size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>결제 내역이 없습니다</p>
                </div>
            ) : (
                <div style={styles.paymentList}>
                    {filteredPayments.map(payment => (
                        <JobPaymentCard
                            key={payment.id}
                            payment={payment}
                            onApprove={handleApprove}
                            onRejectClick={handleRejectClick}
                            getStatusBadge={getStatusBadge}
                            processing={processing}
                        />
                    ))}
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

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// 구인공고 결제 카드 컴포넌트
function JobPaymentCard({ payment, onApprove, onRejectClick, getStatusBadge, processing }) {
    const [expanded, setExpanded] = useState(false);

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('ko-KR');
        }
        return new Date(timestamp).toLocaleDateString('ko-KR');
    };

    const getDurationBadge = (duration) => {
        const colors = {
            30: { bg: '#dbeafe', color: '#1e40af', text: '30일' },
            60: { bg: '#fef3c7', color: '#92400e', text: '60일' },
            90: { bg: '#d1fae5', color: '#065f46', text: '90일' }
        };
        const color = colors[duration] || { bg: '#f3f4f6', color: '#374151', text: `${duration}일` };
        
        return (
            <span style={{
                padding: '4px 10px',
                backgroundColor: color.bg,
                color: color.color,
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '6px'
            }}>
                {color.text}
            </span>
        );
    };

    return (
        <div style={styles.card}>
            {/* 헤더 */}
            <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                    <div style={styles.jobIcon}>
                        <Briefcase size={24} color="#6366f1" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={styles.jobTitle}>
                                {payment.jobData?.companyName || '회사명 미등록'}
                            </h3>
                            {getDurationBadge(payment.duration)}
                        </div>
                        <p style={styles.position}>
                            포지션: {payment.jobData?.position || '미등록'}
                        </p>
                    </div>
                </div>
                {getStatusBadge(payment.status)}
            </div>

            {/* 기본 정보 */}
            <div style={styles.cardBody}>
                <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                        <Building2 size={18} color="#64748b" />
                        <span>업종: {payment.jobData?.businessType || '-'}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <MapPin size={18} color="#64748b" />
                        <span>고용형태: {payment.jobData?.employmentType || '-'}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <DollarSign size={18} color="#64748b" />
                        <span style={{ fontWeight: '700', color: '#6366f1' }}>
                            {payment.amount?.toLocaleString()}원
                        </span>
                    </div>
                    <div style={styles.infoRow}>
                        <Calendar size={18} color="#64748b" />
                        <span>
                            만료일: {formatDate(payment.expiryDate)}
                        </span>
                    </div>
                </div>

                <div style={styles.userSection}>
                    <strong>신청자 정보:</strong>
                    <div style={styles.userInfoGrid}>
                        <div style={styles.infoRow}>
                            <Mail size={18} color="#64748b" />
                            <span>{payment.userEmail || '-'}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <Phone size={18} color="#64748b" />
                            <span>{payment.userPhone || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 상세 정보 (토글) */}
            {expanded && (
                <div style={styles.detailsSection}>
                    <div style={styles.detailItem}>
                        <strong>주문번호:</strong>
                        <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>
                            {payment.orderNumber}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <strong>신청자:</strong>
                        <span>{payment.userName}</span>
                    </div>
                    <div style={styles.detailItem}>
                        <strong>결제일:</strong>
                        <span>{formatDate(payment.createdAt)}</span>
                    </div>
                    {payment.approvedAt && (
                        <div style={styles.detailItem}>
                            <strong>승인일:</strong>
                            <span>{formatDate(payment.approvedAt)}</span>
                        </div>
                    )}
                    {payment.jobData?.description && (
                        <div style={styles.description}>
                            <strong>공고 내용:</strong>
                            <p>{payment.jobData.description}</p>
                        </div>
                    )}
                    {payment.rejectionReason && (
                        <div style={styles.rejectionReason}>
                            <strong>반려 사유:</strong>
                            <p>{payment.rejectionReason}</p>
                        </div>
                    )}
                </div>
            )}

            {/* 액션 버튼 */}
            <div style={styles.cardActions}>
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={styles.detailButton}
                >
                    {expanded ? '간단히 보기' : '자세히 보기'}
                </button>

                {payment.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onRejectClick(payment.id)}
                            style={styles.rejectButton}
                            disabled={processing}
                        >
                            <XCircle size={18} />
                            반려
                        </button>
                        <button
                            onClick={() => onApprove(payment)}
                            style={styles.approveButton}
                            disabled={processing}
                        >
                            <CheckCircle size={18} />
                            승인
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
    },
    header: {
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '8px 0 0 0',
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
        backgroundColor: '#f8fafc',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    filterButtonActive: {
        backgroundColor: '#6366f1',
        color: 'white',
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
    paymentList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    card: {
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    cardHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: 1,
    },
    jobIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '56px',
        backgroundColor: '#eef2ff',
        borderRadius: '12px',
    },
    jobTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    position: {
        margin: '4px 0 0 0',
        fontSize: '14px',
        color: '#64748b',
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '12px',
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: '#475569',
    },
    userSection: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '14px',
    },
    userInfoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '12px',
        marginTop: '12px',
    },
    description: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '14px',
    },
    detailsSection: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        marginTop: '20px',
    },
    detailItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '14px',
    },
    rejectionReason: {
        padding: '16px',
        backgroundColor: '#fee2e2',
        borderRadius: '8px',
        marginTop: '12px',
        color: '#991b1b',
    },
    cardActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '20px',
    },
    detailButton: {
        padding: '10px 20px',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginRight: 'auto',
    },
    approveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    rejectButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#64748b',
        margin: '16px 0 0 0',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
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
    rejectModal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
    },
    modalTitle: {
        margin: '0 0 16px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
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
        transition: 'all 0.2s',
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
        transition: 'all 0.2s',
    },
};

export default AdminJobPostingApproval;