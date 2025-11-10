import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    Clock, CheckCircle, XCircle, AlertCircle,
    FileText, Building, Phone, Package, Calendar
} from 'lucide-react';
import './SellerApplicationStatus.css';

function SellerApplicationStatus({ userInfo }) {
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadApplication = useCallback(async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'sellerApplications'),
                where('userId', '==', userInfo.uid)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                setApplication({
                    id: snapshot.docs[0].id,
                    ...snapshot.docs[0].data()
                });
            }
        } catch (error) {
            console.error('신청서 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    }, [userInfo.uid]);

    useEffect(() => {
        loadApplication();
    }, [loadApplication]);

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusInfo = (status) => {
        const statusMap = {
            pending: {
                icon: Clock,
                color: '#f59e0b',
                bg: '#fef3c7',
                text: '승인 대기중',
                description: '관리자가 신청서를 검토 중입니다. 영업일 기준 2-3일 소요됩니다.'
            },
            approved: {
                icon: CheckCircle,
                color: '#10b981',
                bg: '#d1fae5',
                text: '승인 완료',
                description: '축하합니다! 판매자 기능을 이용하실 수 있습니다.'
            },
            rejected: {
                icon: XCircle,
                color: '#ef4444',
                bg: '#fee2e2',
                text: '승인 거부',
                description: '신청이 거부되었습니다. 아래 거부 사유를 확인해주세요.'
            }
        };
        return statusMap[status] || statusMap.pending;
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>신청 현황을 불러오는 중...</p>
            </div>
        );
    }

    if (!application) {
        return (
            <div style={styles.emptyContainer}>
                <AlertCircle size={48} style={{ color: '#94a3b8' }} />
                <h2 style={styles.emptyTitle}>신청서가 없습니다</h2>
                <p style={styles.emptyDesc}>
                    아직 판매자 신청서를 제출하지 않으셨습니다.
                </p>
                <button
                    onClick={() => window.location.href = '/seller-application'}
                    style={styles.applyButton}
                >
                    신청서 작성하기
                </button>
            </div>
        );
    }

    const statusInfo = getStatusInfo(application.status);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="application-status-container">
            {/* 상태 헤더 */}
            <div style={{
                ...styles.statusHeader,
                backgroundColor: statusInfo.bg,
                borderColor: statusInfo.color
            }}>
                <StatusIcon size={48} style={{ color: statusInfo.color }} />
                <div>
                    <h1 style={{ ...styles.statusTitle, color: statusInfo.color }}>
                        {statusInfo.text}
                    </h1>
                    <p style={styles.statusDesc}>
                        {statusInfo.description}
                    </p>
                </div>
            </div>

            {/* 신청 정보 */}
            <div style={styles.infoContainer}>
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <Building size={20} />
                        신청 정보
                    </h3>
                    <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>회사명</label>
                            <p style={styles.infoValue}>{application.companyName}</p>
                        </div>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>사업자등록번호</label>
                            <p style={styles.infoValue}>{application.businessNumber}</p>
                        </div>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>대표자명</label>
                            <p style={styles.infoValue}>{application.ownerName}</p>
                        </div>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>사업 분야</label>
                            <p style={styles.infoValue}>{application.businessType}</p>
                        </div>
                    </div>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <Phone size={20} />
                        연락처
                    </h3>
                    <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>전화번호</label>
                            <p style={styles.infoValue}>{application.contactPhone}</p>
                        </div>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>이메일</label>
                            <p style={styles.infoValue}>{application.contactEmail}</p>
                        </div>
                        <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                            <label style={styles.infoLabel}>주소</label>
                            <p style={styles.infoValue}>
                                {application.address}
                                {application.detailAddress && ` ${application.detailAddress}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <Package size={20} />
                        판매 카테고리
                    </h3>
                    <div style={styles.categoryList}>
                        {application.productCategories?.map(category => (
                            <span key={category} style={styles.categoryBadge}>
                                {category}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <FileText size={20} />
                        회사 소개
                    </h3>
                    <p style={styles.description}>{application.description}</p>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <Calendar size={20} />
                        신청 일시
                    </h3>
                    <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                            <label style={styles.infoLabel}>신청일</label>
                            <p style={styles.infoValue}>{formatDate(application.appliedAt)}</p>
                        </div>
                        {application.approvedAt && (
                            <div style={styles.infoItem}>
                                <label style={styles.infoLabel}>승인일</label>
                                <p style={styles.infoValue}>{formatDate(application.approvedAt)}</p>
                            </div>
                        )}
                        {application.rejectedAt && (
                            <div style={styles.infoItem}>
                                <label style={styles.infoLabel}>거부일</label>
                                <p style={styles.infoValue}>{formatDate(application.rejectedAt)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 거부 사유 */}
                {application.status === 'rejected' && application.rejectionReason && (
                    <div style={styles.rejectionBox}>
                        <h3 style={styles.rejectionTitle}>
                            <AlertCircle size={20} />
                            거부 사유
                        </h3>
                        <p style={styles.rejectionReason}>{application.rejectionReason}</p>
                        <button
                            onClick={() => window.location.href = '/seller-application'}
                            style={styles.reapplyButton}
                        >
                            재신청하기
                        </button>
                    </div>
                )}
            </div>

            {/* 안내 메시지 */}
            {application.status === 'pending' && (
                <div style={styles.noticeBox}>
                    <h4 style={styles.noticeTitle}>📢 안내사항</h4>
                    <ul style={styles.noticeList}>
                        <li>승인 처리는 영업일 기준 2-3일 소요됩니다</li>
                        <li>신청 내용에 문제가 있을 경우 이메일로 연락드립니다</li>
                        <li>승인 완료 시 등록하신 이메일로 알림을 보내드립니다</li>
                        <li>문의사항이 있으시면 고객센터로 연락주세요</li>
                    </ul>
                </div>
            )}

            {application.status === 'approved' && (
                <div style={styles.successBox}>
                    <h4 style={styles.successTitle}>🎉 승인 완료!</h4>
                    <p style={styles.successDesc}>
                        이제 마켓플레이스에 제품을 등록하고 판매하실 수 있습니다.
                    </p>
                    <button
                        onClick={() => window.location.href = '/seller-dashboard'}
                        style={styles.dashboardButton}
                    >
                        판매자 대시보드로 이동
                    </button>
                </div>
            )}
        </div>
    );
}

const styles = {
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #8b5cf6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    emptyContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
        padding: '40px',
    },
    emptyTitle: {
        margin: '16px 0 8px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
    },
    emptyDesc: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
        textAlign: 'center',
    },
    applyButton: {
        marginTop: '24px',
        padding: '12px 24px',
        backgroundColor: '#8b5cf6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    statusHeader: {
        padding: '32px',
        borderRadius: '12px',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px',
    },
    statusTitle: {
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
    },
    statusDesc: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    infoContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
    },
    section: {
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    sectionTitle: {
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    infoLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    infoValue: {
        margin: 0,
        fontSize: '15px',
        color: '#1e293b',
        fontWeight: '500',
    },
    categoryList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    categoryBadge: {
        padding: '6px 12px',
        backgroundColor: '#f5f3ff',
        color: '#8b5cf6',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
    },
    description: {
        margin: 0,
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.8',
        whiteSpace: 'pre-wrap',
    },
    rejectionBox: {
        padding: '24px',
        backgroundColor: '#fef2f2',
        border: '2px solid #fecaca',
        borderRadius: '12px',
    },
    rejectionTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    rejectionReason: {
        margin: '0 0 16px 0',
        fontSize: '14px',
        color: '#7f1d1d',
        lineHeight: '1.6',
    },
    reapplyButton: {
        padding: '10px 20px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    noticeBox: {
        padding: '24px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fde68a',
        borderRadius: '12px',
        marginTop: '32px',
    },
    noticeTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#92400e',
    },
    noticeList: {
        margin: 0,
        paddingLeft: '20px',
        color: '#78350f',
        fontSize: '14px',
        lineHeight: '2',
    },
    successBox: {
        padding: '32px',
        backgroundColor: '#d1fae5',
        border: '2px solid #a7f3d0',
        borderRadius: '12px',
        textAlign: 'center',
        marginTop: '32px',
    },
    successTitle: {
        margin: '0 0 12px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#065f46',
    },
    successDesc: {
        margin: '0 0 20px 0',
        fontSize: '14px',
        color: '#047857',
    },
    dashboardButton: {
        padding: '12px 32px',
        backgroundColor: '#10b981',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default SellerApplicationStatus;