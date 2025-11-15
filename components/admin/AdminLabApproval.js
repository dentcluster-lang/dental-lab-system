import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
    CheckCircle, XCircle, Clock, Building2, 
    Phone, Mail, MapPin, Search, Calendar
} from 'lucide-react';

function AdminLabApproval({ user }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected
    const [searchQuery, setSearchQuery] = useState('');

    const loadApplications = useCallback(async () => {
        try {
            setLoading(true);

            let q;
            if (filter === 'all') {
                q = query(collection(db, 'labAdvertisements'));
            } else {
                q = query(
                    collection(db, 'labAdvertisements'),
                    where('status', '==', filter)
                );
            }

            const snapshot = await getDocs(q);
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 최신순 정렬
            apps.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

            setApplications(apps);
        } catch (error) {
            console.error('기공소 신청서 로딩 실패:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        if (user) {
            loadApplications();
        }
    }, [user, filter, loadApplications]);

    const handleApprove = async (application) => {
        if (!window.confirm(`"${application.businessName || '이 기공소'}" 홍보를 승인하시겠습니까?`)) {
            return;
        }

        try {
            const updateData = {
                status: 'approved',
                isActive: true,
                approvedBy: user.uid,
                approvedAt: Timestamp.now()
            };

            await updateDoc(doc(db, 'labAdvertisements', application.id), updateData);

            alert('기공소 홍보 승인이 완료되었습니다!');
            loadApplications();
        } catch (error) {
            console.error('승인 처리 실패:', error);
            alert('승인 처리 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleReject = async (application) => {
        const reason = window.prompt('거부 사유를 입력하세요:');
        if (!reason) return;

        try {
            const updateData = {
                status: 'rejected',
                isActive: false,
                rejectedBy: user.uid,
                rejectedAt: Timestamp.now(),
                rejectionReason: reason
            };

            await updateDoc(doc(db, 'labAdvertisements', application.id), updateData);

            alert('기공소 홍보 신청이 거부되었습니다.');
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

    const filteredApplications = applications.filter(app => {
        if (!searchQuery) return true;
        return app.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.introduction?.toLowerCase().includes(searchQuery.toLowerCase());
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
                        <Building2 size={32} />
                        기공소 홍보 승인 관리
                    </h1>
                    <p style={styles.subtitle}>
                        기공소 홍보 신청을 검토하고 승인/거부하세요
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
                        placeholder="기공소명, 주소 검색..."
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 기공소 목록 */}
            {filteredApplications.length === 0 ? (
                <div style={styles.emptyState}>
                    <Building2 size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>기공소 홍보 신청 내역이 없습니다</p>
                </div>
            ) : (
                <div style={styles.applicationList}>
                    {filteredApplications.map(app => (
                        <LabCard
                            key={app.id}
                            lab={app}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            getStatusBadge={getStatusBadge}
                        />
                    ))}
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

// 기공소 카드 컴포넌트
function LabCard({ lab, onApprove, onReject, getStatusBadge }) {
    const [expanded, setExpanded] = useState(false);

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp.toMillis()).toLocaleDateString('ko-KR');
    };

    return (
        <div style={styles.card}>
            {/* 헤더 */}
            <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                    <div style={styles.labIcon}>
                        <Building2 size={24} color="#6366f1" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={styles.labTitle}>{lab.businessName || '기공소명 미등록'}</h3>
                        </div>
                        <p style={styles.introduction}>
                            {lab.introduction || '소개 없음'}
                        </p>
                    </div>
                </div>
                {getStatusBadge(lab.status)}
            </div>

            {/* 기본 정보 */}
            <div style={styles.cardBody}>
                <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                        <MapPin size={18} color="#64748b" />
                        <span>{lab.address || '-'}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <Phone size={18} color="#64748b" />
                        <span>{lab.phone || '-'}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <Mail size={18} color="#64748b" />
                        <span>{lab.email || '-'}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <Calendar size={18} color="#64748b" />
                        <span>신청일: {formatDate(lab.createdAt)}</span>
                    </div>
                </div>

                {/* 전문분야 */}
                {lab.specialties && lab.specialties.length > 0 && (
                    <div style={styles.specialtySection}>
                        <strong>전문분야:</strong>
                        <div style={styles.specialtyTags}>
                            {lab.specialties.map((specialty, idx) => (
                                <span key={idx} style={styles.specialtyTag}>
                                    {specialty}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 상세 정보 (토글) */}
            {expanded && (
                <div style={styles.detailsSection}>
                    {lab.experience && (
                        <div style={styles.detailItem}>
                            <strong>경력:</strong>
                            <span>{lab.experience}</span>
                        </div>
                    )}
                    {lab.equipment && (
                        <div style={styles.detailItem}>
                            <strong>보유 장비:</strong>
                            <span>{lab.equipment}</span>
                        </div>
                    )}
                    {lab.certifications && (
                        <div style={styles.detailItem}>
                            <strong>인증:</strong>
                            <span>{lab.certifications}</span>
                        </div>
                    )}
                    {lab.services && (
                        <div style={styles.detailItem}>
                            <strong>제공 서비스:</strong>
                            <span>{lab.services}</span>
                        </div>
                    )}
                    {lab.workingHours && (
                        <div style={styles.detailItem}>
                            <strong>영업시간:</strong>
                            <span>{lab.workingHours}</span>
                        </div>
                    )}
                    {lab.contactInfo && (
                        <div style={styles.detailItem}>
                            <strong>연락처 정보:</strong>
                            <span>{lab.contactInfo}</span>
                        </div>
                    )}
                    {lab.approvedAt && (
                        <div style={styles.detailItem}>
                            <strong>승인일:</strong>
                            <span>{formatDate(lab.approvedAt)}</span>
                        </div>
                    )}
                    {lab.rejectionReason && (
                        <div style={styles.rejectionReason}>
                            <strong>거부 사유:</strong>
                            <p>{lab.rejectionReason}</p>
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

                {lab.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onReject(lab)}
                            style={styles.rejectButton}
                        >
                            <XCircle size={18} />
                            거부
                        </button>
                        <button
                            onClick={() => onApprove(lab)}
                            style={styles.approveButton}
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
    applicationList: {
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
    labIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '56px',
        backgroundColor: '#eef2ff',
        borderRadius: '12px',
    },
    labTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    introduction: {
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
    specialtySection: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '14px',
    },
    specialtyTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
    },
    specialtyTag: {
        padding: '6px 12px',
        backgroundColor: '#e0e7ff',
        color: '#6366f1',
        fontSize: '13px',
        fontWeight: '600',
        borderRadius: '6px',
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
};

export default AdminLabApproval;