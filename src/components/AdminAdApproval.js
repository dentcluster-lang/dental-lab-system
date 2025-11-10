import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    CheckCircle, XCircle, Clock, Megaphone, 
    Phone, Mail, Calendar, Search, ExternalLink
} from 'lucide-react';

function AdminAdApproval({ user, userInfo }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [adminData, setAdminData] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    // 🔥 사용자 데이터 로드 및 권한 체크
    useEffect(() => {
        const checkAuth = async () => {
            const currentUser = userInfo || user;
            const uid = currentUser?.uid;

            if (!uid) {
                alert('로그인이 필요합니다.');
                window.location.href = '/';
                return;
            }

            try {
                console.log('🔍 관리자 권한 체크 시작:', uid);
                
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (!userDoc.exists()) {
                    alert('사용자 정보를 찾을 수 없습니다.');
                    window.location.href = '/';
                    return;
                }

                const userData = userDoc.data();
                setAdminData(userData);

                console.log('✅ 사용자 데이터 로드:', {
                    isAdmin: userData.isAdmin,
                    role: userData.role
                });

                // 관리자 권한 체크
                if (!userData.isAdmin && userData.role !== 'admin') {
                    console.error('❌ 관리자 권한 없음');
                    alert('관리자만 접근 가능합니다.');
                    window.location.href = '/';
                    return;
                }

                console.log('🎉 관리자 권한 확인 완료');
                setAuthChecked(true);
            } catch (error) {
                console.error('❌ 권한 확인 실패:', error);
                alert('권한 확인 중 오류가 발생했습니다.');
                window.location.href = '/';
            }
        };

        checkAuth();
    }, [user, userInfo]);

    const loadApplications = useCallback(async () => {
        if (!authChecked) return;

        try {
            setLoading(true);
            console.log('📋 광고 신청서 로드 시작...');

            let q;
            if (filter === 'all') {
                q = query(collection(db, 'advertisements'));
            } else {
                q = query(
                    collection(db, 'advertisements'),
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

            console.log(`✅ 광고 신청서 ${apps.length}건 로드 완료`);
            setApplications(apps);
        } catch (error) {
            console.error('❌ 광고 신청서 로딩 실패:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [authChecked, filter]);

    // 🔥 권한 체크 완료 후 데이터 로드
    useEffect(() => {
        if (authChecked) {
            loadApplications();
        }
    }, [authChecked, filter, loadApplications]);

    const handleApprove = async (application) => {
        if (!window.confirm(`"${application.title || '이 광고'}" 광고를 승인하시겠습니까?`)) {
            return;
        }

        try {
            const currentUser = userInfo || user;
            console.log('✅ 광고 승인 시작:', application.title);

            const updateData = {
                status: 'active',
                approvedBy: currentUser.uid,
                approvedAt: Timestamp.now()
            };

            await updateDoc(doc(db, 'advertisements', application.id), updateData);

            console.log('🎉 승인 완료');
            alert('광고 승인이 완료되었습니다!');
            loadApplications();
        } catch (error) {
            console.error('❌ 승인 처리 실패:', error);
            alert('승인 처리 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleReject = async (application) => {
        const reason = window.prompt('거부 사유를 입력하세요:');
        if (!reason) return;

        try {
            const currentUser = userInfo || user;
            console.log('❌ 광고 거부 시작:', application.title);

            const updateData = {
                status: 'rejected',
                rejectedBy: currentUser.uid,
                rejectedAt: Timestamp.now(),
                rejectionReason: reason
            };

            await updateDoc(doc(db, 'advertisements', application.id), updateData);

            console.log('✅ 거부 완료');
            alert('광고 신청이 거부되었습니다.');
            loadApplications();
        } catch (error) {
            console.error('❌ 거부 처리 실패:', error);
            alert('거부 처리 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#fef3c7', color: '#92400e', icon: <Clock size={16} /> },
            active: { bg: '#d1fae5', color: '#065f46', icon: <CheckCircle size={16} /> },
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
                {status === 'pending' ? '대기중' : status === 'active' ? '승인' : '거부'}
            </div>
        );
    };

    const filteredApplications = applications.filter(app => {
        if (!searchQuery) return true;
        return app.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.advertiserName?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (!authChecked || loading) {
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
                        <Megaphone size={32} />
                        광고 승인 관리
                    </h1>
                    <p style={styles.subtitle}>
                        광고 신청을 검토하고 승인/거부하세요
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
                        onClick={() => setFilter('active')}
                        style={filter === 'active' ? {...styles.filterButton, ...styles.filterButtonActive} : styles.filterButton}
                    >
                        승인 ({applications.filter(a => a.status === 'active').length})
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
                        placeholder="광고명, 광고주 검색..."
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 광고 목록 */}
            {filteredApplications.length === 0 ? (
                <div style={styles.emptyState}>
                    <Megaphone size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>광고 신청 내역이 없습니다</p>
                </div>
            ) : (
                <div style={styles.applicationList}>
                    {filteredApplications.map(app => (
                        <AdCard
                            key={app.id}
                            ad={app}
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

// 광고 카드 컴포넌트
function AdCard({ ad, onApprove, onReject, getStatusBadge }) {
    const [expanded, setExpanded] = useState(false);

    const getTierBadge = (tier) => {
        const colors = {
            premium: { bg: '#fef3c7', color: '#92400e', text: '프리미엄' },
            standard: { bg: '#dbeafe', color: '#1e40af', text: '스탠다드' },
            basic: { bg: '#f3f4f6', color: '#374151', text: '베이직' }
        };
        const color = colors[tier] || colors.basic;
        
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

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp.toMillis()).toLocaleDateString('ko-KR');
    };

    return (
        <div style={styles.card}>
            {/* 헤더 */}
            <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                    <div style={styles.adIcon}>
                        <Megaphone size={24} color="#6366f1" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={styles.adTitle}>{ad.title}</h3>
                            {getTierBadge(ad.tier)}
                        </div>
                        <p style={styles.advertiser}>광고주: {ad.advertiserName || '미등록'}</p>
                    </div>
                </div>
                {getStatusBadge(ad.status)}
            </div>

            {/* 기본 정보 */}
            <div style={styles.cardBody}>
                {ad.imageUrl && (
                    <div style={styles.adImageContainer}>
                        <img src={ad.imageUrl} alt={ad.title} style={styles.adImage} />
                    </div>
                )}
                
                <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                        <Mail size={18} color="#64748b" />
                        <span>{ad.advertiserEmail || '-'}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <Phone size={18} color="#64748b" />
                        <span>{ad.advertiserPhone || '-'}</span>
                    </div>
                    {ad.url && (
                        <div style={styles.infoRow}>
                            <ExternalLink size={18} color="#64748b" />
                            <a href={ad.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {ad.url}
                            </a>
                        </div>
                    )}
                    <div style={styles.infoRow}>
                        <Calendar size={18} color="#64748b" />
                        <span>
                            {formatDate(ad.startDate)} ~ {formatDate(ad.endDate)}
                        </span>
                    </div>
                </div>

                {ad.description && (
                    <div style={styles.description}>
                        <strong>광고 설명:</strong>
                        <p>{ad.description}</p>
                    </div>
                )}
            </div>

            {/* 상세 정보 (토글) */}
            {expanded && (
                <div style={styles.detailsSection}>
                    <div style={styles.detailItem}>
                        <strong>광고 위치:</strong>
                        <span>
                            {ad.position === 'top-banner' ? '상단 배너' : 
                             ad.position === 'sidebar' ? '사이드바' : 
                             ad.position === 'footer' ? '하단 배너' : ad.position}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <strong>타겟 업종:</strong>
                        <span>
                            {ad.targeting?.businessType === 'all' ? '전체' :
                             ad.targeting?.businessType === 'dental' ? '치과' :
                             ad.targeting?.businessType === 'lab' ? '기공소' : '전체'}
                        </span>
                    </div>
                    <div style={styles.detailItem}>
                        <strong>노출수 / 클릭수:</strong>
                        <span>{ad.impressions || 0} / {ad.clicks || 0}</span>
                    </div>
                    {ad.createdAt && (
                        <div style={styles.detailItem}>
                            <strong>신청일:</strong>
                            <span>{formatDate(ad.createdAt)}</span>
                        </div>
                    )}
                    {ad.rejectionReason && (
                        <div style={styles.rejectionReason}>
                            <strong>거부 사유:</strong>
                            <p>{ad.rejectionReason}</p>
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

                {ad.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onReject(ad)}
                            style={styles.rejectButton}
                        >
                            <XCircle size={18} />
                            거부
                        </button>
                        <button
                            onClick={() => onApprove(ad)}
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
    adIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '56px',
        backgroundColor: '#eef2ff',
        borderRadius: '12px',
    },
    adTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    advertiser: {
        margin: '4px 0 0 0',
        fontSize: '14px',
        color: '#64748b',
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    adImageContainer: {
        width: '100%',
        maxHeight: '200px',
        overflow: 'hidden',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
    },
    adImage: {
        width: '100%',
        height: 'auto',
        objectFit: 'cover',
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
    link: {
        color: '#6366f1',
        textDecoration: 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
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
};

export default AdminAdApproval;