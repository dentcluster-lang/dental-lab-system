import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    Shield, CheckCircle, XCircle, Clock, Building, 
    Phone, Mail, MapPin, FileText, Search
} from 'lucide-react';

function AdminSellerApproval({ user, userInfo }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [filter, setFilter] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [adminData, setAdminData] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    // 🔥 사용자 데이터 로드 및 권한 체크
    useEffect(() => {
        const checkAuth = async () => {
            // userInfo 또는 user 중 uid가 있는 것 사용
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
                    role: userData.role,
                    email: userData.email
                });

                // 관리자 권한 체크
                if (!userData.isAdmin && userData.role !== 'admin') {
                    console.error('❌ 관리자 권한 없음');
                    alert('관리자만 접근할 수 있습니다.');
                    window.location.href = '/dashboard';
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
            console.log('📋 판매자 신청서 로드 시작...');
            
            const appsRef = collection(db, 'sellerApplications');
            const snapshot = await getDocs(appsRef);
            
            const appsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 최신순 정렬
            appsData.sort((a, b) => {
                const aTime = a.appliedAt?.toMillis() || 0;
                const bTime = b.appliedAt?.toMillis() || 0;
                return bTime - aTime;
            });

            console.log(`✅ 판매자 신청서 ${appsData.length}건 로드 완료`);
            setApplications(appsData);
        } catch (error) {
            console.error('❌ 신청서 로드 실패:', error);
            alert('신청서를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [authChecked]);

    // 🔥 권한 체크 완료 후 데이터 로드
    useEffect(() => {
        if (authChecked) {
            loadApplications();
        }
    }, [authChecked, loadApplications]);

    const handleApprove = async (application) => {
        if (!window.confirm(`${application.companyName}의 판매자 신청을 승인하시겠습니까?`)) {
            return;
        }

        try {
            setProcessing(true);
            const currentUser = userInfo || user;

            console.log('✅ 승인 처리 시작:', application.companyName);

            // users 컬렉션 업데이트
            await updateDoc(doc(db, 'users', application.userId), {
                sellerStatus: 'approved',
                approvedAt: serverTimestamp(),
                approvedBy: currentUser.uid
            });

            // sellerApplications 컬렉션 업데이트
            await updateDoc(doc(db, 'sellerApplications', application.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
                approvedBy: currentUser.uid,
                updatedAt: serverTimestamp()
            });

            console.log('🎉 승인 완료');
            alert('✅ 승인되었습니다!');
            await loadApplications();
        } catch (error) {
            console.error('❌ 승인 실패:', error);
            alert('승인 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (application) => {
        const reason = window.prompt('거부 사유를 입력해주세요:');
        if (!reason) return;

        if (!window.confirm(`${application.companyName}의 판매자 신청을 거부하시겠습니까?`)) {
            return;
        }

        try {
            setProcessing(true);
            const currentUser = userInfo || user;

            console.log('❌ 거부 처리 시작:', application.companyName);

            // users 컬렉션 업데이트
            await updateDoc(doc(db, 'users', application.userId), {
                sellerStatus: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectedBy: currentUser.uid,
                rejectionReason: reason
            });

            // sellerApplications 컬렉션 업데이트
            await updateDoc(doc(db, 'sellerApplications', application.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectedBy: currentUser.uid,
                rejectionReason: reason,
                updatedAt: serverTimestamp()
            });

            console.log('✅ 거부 완료');
            alert('❌ 거부되었습니다.');
            await loadApplications();
        } catch (error) {
            console.error('❌ 거부 실패:', error);
            alert('거부 중 오류가 발생했습니다: ' + error.message);
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
                {status === 'pending' ? '대기중' : status === 'approved' ? '승인' : '거부'}
            </div>
        );
    };

    const filteredApplications = applications.filter(app => {
        if (!searchQuery) return true;
        return app.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               app.businessNumber?.includes(searchQuery);
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
                        <Shield size={32} />
                        판매자 신청 승인 관리
                    </h1>
                    <p style={styles.subtitle}>
                        판매자 신청을 검토하고 승인/거부하세요
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
                        placeholder="회사명, 대표자명, 사업자번호 검색..."
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 판매자 신청 목록 */}
            {filteredApplications.filter(app => filter === 'all' || app.status === filter).length === 0 ? (
                <div style={styles.emptyState}>
                    <Shield size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>판매자 신청 내역이 없습니다</p>
                </div>
            ) : (
                <div style={styles.applicationList}>
                    {filteredApplications
                        .filter(app => filter === 'all' || app.status === filter)
                        .map(app => (
                            <SellerCard
                                key={app.id}
                                application={app}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                getStatusBadge={getStatusBadge}
                                processing={processing}
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

// 판매자 신청 카드 컴포넌트
function SellerCard({ application, onApprove, onReject, getStatusBadge, processing }) {
    const [expanded, setExpanded] = useState(false);

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate();
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={styles.card}>
            {/* 헤더 */}
            <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                    <div style={styles.sellerIcon}>
                        <Shield size={24} color="#6366f1" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={styles.companyTitle}>{application.companyName}</h3>
                        </div>
                        <p style={styles.businessType}>
                            {application.businessType}
                        </p>
                    </div>
                </div>
                {getStatusBadge(application.status)}
            </div>

            {/* 기본 정보 */}
            <div style={styles.cardBody}>
                <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                        <Building size={18} color="#64748b" />
                        <span>대표자: {application.ownerName}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <FileText size={18} color="#64748b" />
                        <span>사업자번호: {application.businessNumber}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <Phone size={18} color="#64748b" />
                        <span>{application.contactPhone}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <Mail size={18} color="#64748b" />
                        <span>{application.contactEmail}</span>
                    </div>
                </div>

                {/* 주소 */}
                <div style={styles.addressSection}>
                    <div style={styles.infoRow}>
                        <MapPin size={18} color="#64748b" />
                        <span>
                            {application.address}
                            {application.detailAddress && ` ${application.detailAddress}`}
                        </span>
                    </div>
                </div>

                {/* 판매 카테고리 */}
                {application.productCategories && application.productCategories.length > 0 && (
                    <div style={styles.categorySection}>
                        <strong>판매 카테고리:</strong>
                        <div style={styles.categoryTags}>
                            {application.productCategories.map((cat, idx) => (
                                <span key={idx} style={styles.categoryTag}>
                                    {cat}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 상세 정보 (토글) */}
            {expanded && (
                <div style={styles.detailsSection}>
                    {application.description && (
                        <div style={styles.description}>
                            <strong>회사 소개:</strong>
                            <p>{application.description}</p>
                        </div>
                    )}
                    <div style={styles.detailItem}>
                        <strong>신청일시:</strong>
                        <span>{formatDate(application.appliedAt)}</span>
                    </div>
                    {application.approvedAt && (
                        <div style={styles.detailItem}>
                            <strong>승인일시:</strong>
                            <span>{formatDate(application.approvedAt)}</span>
                        </div>
                    )}
                    {application.rejectionReason && (
                        <div style={styles.rejectionReason}>
                            <strong>거부 사유:</strong>
                            <p>{application.rejectionReason}</p>
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

                {application.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onReject(application)}
                            style={styles.rejectButton}
                            disabled={processing}
                        >
                            <XCircle size={18} />
                            거부
                        </button>
                        <button
                            onClick={() => onApprove(application)}
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
    sellerIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '56px',
        backgroundColor: '#eef2ff',
        borderRadius: '12px',
    },
    companyTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    businessType: {
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
    addressSection: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    categorySection: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '14px',
    },
    categoryTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
    },
    categoryTag: {
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
    description: {
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '12px',
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

export default AdminSellerApproval;