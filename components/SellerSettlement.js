import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    DollarSign, TrendingUp, Calendar, FileText, 
    Clock, CheckCircle, AlertCircle, Download,
    ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';

function SellerSettlement({ userInfo }) {
    const [settlements, setSettlements] = useState([]);
    const [currentMonthData, setCurrentMonthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('current'); // current, history
    const [showRequestModal, setShowRequestModal] = useState(false);

    // 권한 체크
    useEffect(() => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            window.location.href = '/';
            return;
        }

        if (userInfo.companyId && 
            userInfo.role !== 'owner' && 
            userInfo.role !== 'manager') {
            alert('관리자만 사용 가능합니다.');
            window.location.href = '/dashboard';
            return;
        }

        if (userInfo.sellerStatus !== 'approved') {
            alert('판매자 승인 후 이용 가능합니다.');
            window.location.href = '/seller-dashboard';
            return;
        }

        loadSettlementData();
    }, [userInfo]);

    // 정산 데이터 로드
    const loadSettlementData = async () => {
        try {
            setLoading(true);
            const sellerId = userInfo.companyId || userInfo.uid;

            // 1. 당월 주문 데이터 조회
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const monthStart = new Date(currentMonth + '-01');
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);

            const ordersRef = collection(db, 'marketplace_orders');
            const ordersQuery = query(
                ordersRef,
                where('sellerId', '==', sellerId),
                where('status', 'in', ['completed']), // 완료된 주문만
                where('orderDate', '>=', monthStart),
                where('orderDate', '<', monthEnd)
            );

            const ordersSnapshot = await getDocs(ordersQuery);
            const orders = ordersSnapshot.docs.map(doc => doc.data());

            // 당월 통계 계산
            const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            const commission = Math.floor(totalSales * 0.1); // 10% 수수료
            const settlementAmount = totalSales - commission;

            setCurrentMonthData({
                period: currentMonth,
                totalOrders: orders.length,
                totalSales,
                commission,
                settlementAmount,
                orders
            });

            // 2. 정산 내역 조회
            const settlementsRef = collection(db, 'marketplace_settlements');
            const settlementsQuery = query(
                settlementsRef,
                where('sellerId', '==', sellerId),
                orderBy('requestDate', 'desc')
            );

            const settlementsSnapshot = await getDocs(settlementsQuery);
            const settlementsList = settlementsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSettlements(settlementsList);
            setLoading(false);
        } catch (error) {
            console.error('정산 데이터 로드 실패:', error);
            alert('정산 데이터를 불러오는데 실패했습니다.');
            setLoading(false);
        }
    };

    // 정산 신청
    const handleRequestSettlement = async () => {
        if (!currentMonthData || currentMonthData.settlementAmount === 0) {
            alert('정산할 금액이 없습니다.');
            return;
        }

        // 이미 신청된 정산이 있는지 확인
        const existingSettlement = settlements.find(
            s => s.period === currentMonthData.period && s.status === 'pending'
        );

        if (existingSettlement) {
            alert('이미 정산 신청이 처리 중입니다.');
            return;
        }

        if (!window.confirm(`${currentMonthData.settlementAmount.toLocaleString()}원을 정산 신청하시겠습니까?`)) {
            return;
        }

        try {
            const sellerId = userInfo.companyId || userInfo.uid;
            const settlementData = {
                settlementId: `ST${Date.now()}`,
                sellerId,
                sellerName: userInfo.companyId ? userInfo.companyName : userInfo.userName,
                period: currentMonthData.period,
                totalOrders: currentMonthData.totalOrders,
                totalSales: currentMonthData.totalSales,
                commission: currentMonthData.commission,
                settlementAmount: currentMonthData.settlementAmount,
                status: 'pending',
                requestDate: new Date(),
                createdAt: new Date()
            };

            await addDoc(collection(db, 'marketplace_settlements'), settlementData);
            
            alert('정산 신청이 완료되었습니다.');
            setShowRequestModal(false);
            loadSettlementData();
        } catch (error) {
            console.error('정산 신청 실패:', error);
            alert('정산 신청에 실패했습니다.');
        }
    };

    // 날짜 포맷팅
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // 기간 포맷팅
    const formatPeriod = (period) => {
        const [year, month] = period.split('-');
        return `${year}년 ${parseInt(month)}월`;
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <DollarSign size={48} color="#6366f1" />
                <p style={styles.loadingText}>정산 데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <DollarSign size={28} color="#6366f1" />
                    <h1 style={styles.title}>정산 관리</h1>
                </div>
            </div>

            {/* 당월 정산 현황 */}
            {currentMonthData && (
                <div style={styles.currentSection}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>
                            <Calendar size={20} />
                            {formatPeriod(currentMonthData.period)} 정산 현황
                        </h2>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            style={styles.requestButton}
                            disabled={currentMonthData.settlementAmount === 0}
                        >
                            <FileText size={18} />
                            정산 신청
                        </button>
                    </div>

                    <div style={styles.statsGrid}>
                        {/* 총 매출 */}
                        <div style={styles.statCard}>
                            <div style={styles.statHeader}>
                                <span style={styles.statLabel}>총 매출액</span>
                                <TrendingUp size={20} color="#10b981" />
                            </div>
                            <div style={styles.statValue}>
                                {currentMonthData.totalSales.toLocaleString()}
                                <span style={styles.statUnit}>원</span>
                            </div>
                            <div style={styles.statMeta}>
                                <ArrowUpRight size={16} color="#10b981" />
                                <span style={{ color: '#10b981' }}>
                                    {currentMonthData.totalOrders}건
                                </span>
                            </div>
                        </div>

                        {/* 수수료 */}
                        <div style={styles.statCard}>
                            <div style={styles.statHeader}>
                                <span style={styles.statLabel}>플랫폼 수수료</span>
                                <ArrowDownRight size={20} color="#ef4444" />
                            </div>
                            <div style={styles.statValue}>
                                {currentMonthData.commission.toLocaleString()}
                                <span style={styles.statUnit}>원</span>
                            </div>
                            <div style={styles.statMeta}>
                                <AlertCircle size={16} color="#64748b" />
                                <span style={{ color: '#64748b' }}>10%</span>
                            </div>
                        </div>

                        {/* 정산 예정 금액 */}
                        <div style={styles.statCardHighlight}>
                            <div style={styles.statHeader}>
                                <span style={styles.statLabel}>정산 예정 금액</span>
                                <CheckCircle size={20} color="#6366f1" />
                            </div>
                            <div style={styles.statValueLarge}>
                                {currentMonthData.settlementAmount.toLocaleString()}
                                <span style={styles.statUnit}>원</span>
                            </div>
                            <div style={styles.statMeta}>
                                <BarChart3 size={16} color="#6366f1" />
                                <span style={{ color: '#6366f1' }}>
                                    익월 15일 지급
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 당월 주문 내역 */}
                    {currentMonthData.orders.length > 0 && (
                        <div style={styles.ordersSection}>
                            <h3 style={styles.ordersSectionTitle}>
                                당월 완료 주문 ({currentMonthData.orders.length}건)
                            </h3>
                            <div style={styles.ordersList}>
                                {currentMonthData.orders.map((order, index) => (
                                    <div key={index} style={styles.orderItem}>
                                        <div style={styles.orderInfo}>
                                            <span style={styles.orderDate}>
                                                {formatDate(order.orderDate)}
                                            </span>
                                            <span style={styles.orderBuyer}>
                                                {order.buyerName}
                                            </span>
                                        </div>
                                        <span style={styles.orderAmount}>
                                            +{order.totalAmount.toLocaleString()}원
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 정산 내역 */}
            <div style={styles.historySection}>
                <h2 style={styles.sectionTitle}>
                    <FileText size={20} />
                    정산 내역
                </h2>

                {settlements.length === 0 ? (
                    <div style={styles.emptyState}>
                        <FileText size={64} color="#cbd5e1" />
                        <p style={styles.emptyText}>정산 내역이 없습니다</p>
                    </div>
                ) : (
                    <div style={styles.settlementList}>
                        {settlements.map(settlement => (
                            <div key={settlement.id} style={styles.settlementCard}>
                                <div style={styles.settlementHeader}>
                                    <div style={styles.settlementInfo}>
                                        <span style={styles.settlementPeriod}>
                                            {formatPeriod(settlement.period)}
                                        </span>
                                        <span 
                                            style={{
                                                ...styles.settlementStatus,
                                                ...(settlement.status === 'completed' 
                                                    ? styles.statusCompleted 
                                                    : styles.statusPending
                                                )
                                            }}
                                        >
                                            {settlement.status === 'completed' ? (
                                                <>
                                                    <CheckCircle size={14} />
                                                    정산 완료
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={14} />
                                                    처리중
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <button style={styles.downloadButton}>
                                        <Download size={16} />
                                    </button>
                                </div>

                                <div style={styles.settlementBody}>
                                    <div style={styles.settlementRow}>
                                        <span style={styles.settlementLabel}>신청일</span>
                                        <span style={styles.settlementValue}>
                                            {formatDate(settlement.requestDate)}
                                        </span>
                                    </div>
                                    {settlement.completeDate && (
                                        <div style={styles.settlementRow}>
                                            <span style={styles.settlementLabel}>정산일</span>
                                            <span style={styles.settlementValue}>
                                                {formatDate(settlement.completeDate)}
                                            </span>
                                        </div>
                                    )}
                                    <div style={styles.settlementRow}>
                                        <span style={styles.settlementLabel}>총 매출</span>
                                        <span style={styles.settlementValue}>
                                            {settlement.totalSales.toLocaleString()}원
                                        </span>
                                    </div>
                                    <div style={styles.settlementRow}>
                                        <span style={styles.settlementLabel}>수수료</span>
                                        <span style={{ ...styles.settlementValue, color: '#ef4444' }}>
                                            -{settlement.commission.toLocaleString()}원
                                        </span>
                                    </div>
                                    <div style={styles.settlementRowTotal}>
                                        <span style={styles.settlementLabelTotal}>정산 금액</span>
                                        <span style={styles.settlementValueTotal}>
                                            {settlement.settlementAmount.toLocaleString()}원
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 정산 신청 모달 */}
            {showRequestModal && currentMonthData && (
                <div style={styles.modalOverlay} onClick={() => setShowRequestModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>정산 신청</h2>
                            <button
                                onClick={() => setShowRequestModal(false)}
                                style={styles.closeButton}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.confirmSection}>
                                <div style={styles.confirmItem}>
                                    <span style={styles.confirmLabel}>정산 기간</span>
                                    <span style={styles.confirmValue}>
                                        {formatPeriod(currentMonthData.period)}
                                    </span>
                                </div>
                                <div style={styles.confirmItem}>
                                    <span style={styles.confirmLabel}>총 매출액</span>
                                    <span style={styles.confirmValue}>
                                        {currentMonthData.totalSales.toLocaleString()}원
                                    </span>
                                </div>
                                <div style={styles.confirmItem}>
                                    <span style={styles.confirmLabel}>플랫폼 수수료 (10%)</span>
                                    <span style={{ ...styles.confirmValue, color: '#ef4444' }}>
                                        -{currentMonthData.commission.toLocaleString()}원
                                    </span>
                                </div>
                                <div style={styles.confirmItemTotal}>
                                    <span style={styles.confirmLabelTotal}>정산 예정 금액</span>
                                    <span style={styles.confirmValueTotal}>
                                        {currentMonthData.settlementAmount.toLocaleString()}원
                                    </span>
                                </div>
                            </div>

                            <div style={styles.noticeBox}>
                                <AlertCircle size={18} color="#f59e0b" />
                                <div style={styles.noticeContent}>
                                    <p style={styles.noticeTitle}>정산 안내</p>
                                    <ul style={styles.noticeList}>
                                        <li>정산 신청 후 영업일 기준 3-5일 내 처리됩니다.</li>
                                        <li>정산금은 등록하신 계좌로 입금됩니다.</li>
                                        <li>정산 내역은 세금계산서 발행 대상입니다.</li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={handleRequestSettlement}
                                style={styles.submitButton}
                            >
                                정산 신청하기
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
    currentSection: {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        border: '2px solid #e2e8f0',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    requestButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    statCard: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        border: '2px solid #e2e8f0',
    },
    statCardHighlight: {
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        border: 'none',
        color: 'white',
    },
    statHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    statLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: 'inherit',
        opacity: 0.8,
    },
    statValue: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '8px',
    },
    statValueLarge: {
        fontSize: '36px',
        fontWeight: '700',
        color: 'white',
        marginBottom: '8px',
    },
    statUnit: {
        fontSize: '18px',
        fontWeight: '500',
        marginLeft: '4px',
    },
    statMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: '600',
    },
    ordersSection: {
        paddingTop: '24px',
        borderTop: '2px solid #f1f5f9',
    },
    ordersSectionTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#475569',
        marginBottom: '16px',
    },
    ordersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '300px',
        overflowY: 'auto',
    },
    orderItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
    },
    orderInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    orderDate: {
        fontSize: '12px',
        color: '#94a3b8',
        fontWeight: '500',
    },
    orderBuyer: {
        fontSize: '14px',
        color: '#1e293b',
        fontWeight: '600',
    },
    orderAmount: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#10b981',
    },
    historySection: {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '32px',
        border: '2px solid #e2e8f0',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '16px',
    },
    emptyText: {
        fontSize: '16px',
        color: '#94a3b8',
        fontWeight: '500',
    },
    settlementList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    settlementCard: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        border: '2px solid #e2e8f0',
    },
    settlementHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
    },
    settlementInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    settlementPeriod: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
    },
    settlementStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
    },
    statusCompleted: {
        backgroundColor: '#dcfce7',
        color: '#16a34a',
    },
    statusPending: {
        backgroundColor: '#fef3c7',
        color: '#ca8a04',
    },
    downloadButton: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
        backgroundColor: 'white',
        color: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    settlementBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    settlementRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settlementRowTotal: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        marginTop: '8px',
        borderTop: '2px solid #e2e8f0',
    },
    settlementLabel: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    settlementValue: {
        fontSize: '15px',
        color: '#1e293b',
        fontWeight: '600',
    },
    settlementLabelTotal: {
        fontSize: '16px',
        color: '#1e293b',
        fontWeight: '700',
    },
    settlementValueTotal: {
        fontSize: '20px',
        color: '#6366f1',
        fontWeight: '700',
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
        maxWidth: '600px',
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
    confirmSection: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        marginBottom: '24px',
    },
    confirmItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0',
    },
    confirmItemTotal: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
        paddingTop: '20px',
        marginTop: '8px',
        borderTop: '2px solid #cbd5e1',
    },
    confirmLabel: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '600',
    },
    confirmValue: {
        fontSize: '15px',
        color: '#1e293b',
        fontWeight: '600',
    },
    confirmLabelTotal: {
        fontSize: '16px',
        color: '#1e293b',
        fontWeight: '700',
    },
    confirmValueTotal: {
        fontSize: '24px',
        color: '#6366f1',
        fontWeight: '700',
    },
    noticeBox: {
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#fffbeb',
        borderRadius: '12px',
        marginBottom: '24px',
    },
    noticeContent: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#92400e',
        marginBottom: '8px',
    },
    noticeList: {
        margin: 0,
        paddingLeft: '20px',
        fontSize: '13px',
        color: '#78350f',
        lineHeight: '1.8',
    },
    submitButton: {
        width: '100%',
        padding: '16px',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default SellerSettlement;