import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Plus, DollarSign, Eye, Calendar, Download, ChevronLeft, ChevronRight, X, FileText, Send } from 'lucide-react';
import CreateTransactionStatement from './CreateTransactionStatement';
import ViewTransactionStatement from './ViewTransactionStatement';

// 월별 조회를 위한 헬퍼 함수
const getMonthRange = (year, month) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return {
        start: firstDay,
        end: lastDay
    };
};

// 월 이름
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function TransactionStatementList({ user }) {
    const [statements, setStatements] = useState([]);
    const [filteredStatements, setFilteredStatements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('list');
    const [selectedStatementId, setSelectedStatementId] = useState(null);

    // 필터 상태
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState('all');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    
    // 달력 모달 상태
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (user) {
            fetchPartners();
            fetchStatements();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // 필터 적용
    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statements, selectedPartner, selectedYear, selectedMonth]);

    // 거래처 목록 가져오기
    const fetchPartners = async () => {
        try {
            const partnersMap = new Map();
            const connectionsQuery = query(
                collection(db, 'connections'),
                where('status', '==', 'accepted')
            );
            const connectionsSnapshot = await getDocs(connectionsQuery);
            
            for (const docSnap of connectionsSnapshot.docs) {
                const connection = docSnap.data();
                
                if (connection.requesterId === user.uid && connection.receiverId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', connection.receiverId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            partnersMap.set(connection.receiverId, {
                                id: connection.receiverId,
                                name: userData.businessName || userData.companyName || userData.name || '이름 없음'
                            });
                        }
                    } catch (error) {
                        console.error('파트너 정보 조회 실패:', error);
                    }
                }
                
                if (connection.receiverId === user.uid && connection.requesterId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', connection.requesterId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            partnersMap.set(connection.requesterId, {
                                id: connection.requesterId,
                                name: userData.businessName || userData.companyName || userData.name || '이름 없음'
                            });
                        }
                    } catch (error) {
                        console.error('파트너 정보 조회 실패:', error);
                    }
                }
            }
            
            setPartners(Array.from(partnersMap.values()));
        } catch (error) {
            console.error('거래처 목록 조회 실패:', error);
        }
    };

    const fetchStatements = async () => {
        try {
            setLoading(true);
            const statementsRef = collection(db, 'transactionStatements');
            
            const sentQuery = query(statementsRef, where('fromUserId', '==', user.uid));
            const receivedQuery = query(statementsRef, where('toUserId', '==', user.uid));

            const [sentSnapshot, receivedSnapshot] = await Promise.all([
                getDocs(sentQuery),
                getDocs(receivedQuery)
            ]);

            const allStatements = [
                ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'sent' })),
                ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'received' }))
            ];

            allStatements.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setStatements(allStatements);
        } catch (error) {
            console.error('거래명세서 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 필터 적용 함수
    const applyFilters = () => {
        let filtered = [...statements];

        // 업체별 필터
        if (selectedPartner !== 'all') {
            filtered = filtered.filter(statement => {
                const partnerId = statement.type === 'sent' ? statement.toUserId : statement.fromUserId;
                return partnerId === selectedPartner;
            });
        }

        // 년/월 필터
        const monthRange = getMonthRange(selectedYear, selectedMonth);
        const start = monthRange.start;
        const end = new Date(monthRange.end);
        end.setHours(23, 59, 59, 999);

        filtered = filtered.filter(statement => {
            if (!statement.orderDate && !statement.createdAt) return false;
            const statementDate = statement.orderDate?.toDate ? statement.orderDate.toDate() : 
                                 statement.createdAt?.toDate ? statement.createdAt.toDate() : 
                                 new Date(statement.createdAt);
            return statementDate >= start && statementDate <= end;
        });

        setFilteredStatements(filtered);
    };

    // 필터 초기화
    const resetFilters = () => {
        setSelectedPartner('all');
        const now = new Date();
        setSelectedYear(now.getFullYear());
        setSelectedMonth(now.getMonth() + 1);
    };

    // 달력에서 월 선택
    const handleMonthSelect = (month) => {
        setSelectedYear(calendarYear);
        setSelectedMonth(month);
        setShowCalendar(false);
    };

    // Excel 다운로드 (CSV)
    const downloadExcel = () => {
        if (filteredStatements.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }

        let csv = '날짜,주문번호,환자명,업체명,항목수,치아개수,금액,상태\n';

        filteredStatements.forEach(statement => {
            const date = formatDate(statement.orderDate || statement.createdAt);
            const orderNumber = statement.orderNumber || '-';
            const patientName = statement.patientName || '-';
            const partnerName = statement.type === 'sent' ? statement.toUserName : statement.fromUserName;
            const itemCount = statement.items?.length || 0;
            const toothCount = statement.totalTeeth || 0;
            const amount = statement.totalAmount || 0;
            const status = statement.status === 'draft' ? '임시저장' : '발행완료';

            csv += `${date},${orderNumber},${patientName},${partnerName},${itemCount},${toothCount},${amount},${status}\n`;
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `거래명세서_${selectedYear}년${selectedMonth}월_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount || 0);
    };

    const handleViewStatement = (statementId) => {
        setSelectedStatementId(statementId);
        setCurrentView('detail');
    };

    const handleBackToList = () => {
        setCurrentView('list');
        setSelectedStatementId(null);
        fetchStatements();
    };

    if (currentView === 'create') {
        return <CreateTransactionStatement user={user} onBack={handleBackToList} />;
    }

    if (currentView === 'detail' && selectedStatementId) {
        return <ViewTransactionStatement statementId={selectedStatementId} user={user} onBack={handleBackToList} />;
    }

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>

            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>거래명세서</h1>
                    <p style={styles.subtitle}>업체별·월별 거래 내역을 확인하세요</p>
                </div>
                <button onClick={() => setCurrentView('create')} style={styles.createButton}>
                    <Plus size={20} />
                    거래명세서 작성
                </button>
            </div>

            {/* 필터 섹션 */}
            <div style={styles.filterSection}>
                <div style={styles.filterRow}>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>업체</label>
                        <select 
                            value={selectedPartner} 
                            onChange={(e) => setSelectedPartner(e.target.value)}
                            style={styles.filterSelect}
                        >
                            <option value="all">전체</option>
                            {partners.map(partner => (
                                <option key={partner.id} value={partner.id}>
                                    {partner.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 달력 버튼 */}
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>
                            <Calendar size={16} />
                            기간 선택
                        </label>
                        <button 
                            onClick={() => setShowCalendar(true)}
                            style={styles.calendarButton}
                        >
                            <Calendar size={16} />
                            {selectedYear}년 {selectedMonth}월
                        </button>
                    </div>

                    <button onClick={resetFilters} style={styles.resetButton}>
                        초기화
                    </button>

                    <button onClick={downloadExcel} style={styles.downloadButton}>
                        <Download size={16} />
                        Excel
                    </button>
                </div>

                {/* 빠른 월 선택 버튼 */}
                <div style={styles.quickSelectRow}>
                    <span style={styles.quickSelectLabel}>빠른 선택:</span>
                    <button
                        onClick={() => {
                            const now = new Date();
                            setSelectedYear(now.getFullYear());
                            setSelectedMonth(now.getMonth() + 1);
                        }}
                        style={styles.quickButton}
                    >
                        이번 달
                    </button>
                    <button
                        onClick={() => {
                            const now = new Date();
                            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                            setSelectedYear(lastMonth.getFullYear());
                            setSelectedMonth(lastMonth.getMonth() + 1);
                        }}
                        style={styles.quickButton}
                    >
                        지난 달
                    </button>
                    <button
                        onClick={() => {
                            const now = new Date();
                            const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2);
                            setSelectedYear(twoMonthsAgo.getFullYear());
                            setSelectedMonth(twoMonthsAgo.getMonth() + 1);
                        }}
                        style={styles.quickButton}
                    >
                        2개월 전
                    </button>
                    <button
                        onClick={() => {
                            const now = new Date();
                            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3);
                            setSelectedYear(threeMonthsAgo.getFullYear());
                            setSelectedMonth(threeMonthsAgo.getMonth() + 1);
                        }}
                        style={styles.quickButton}
                    >
                        3개월 전
                    </button>
                </div>

                <div style={styles.filterSummary}>
                    {selectedYear}년 {selectedMonth}월 | 총 <strong>{filteredStatements.length}</strong>건 | 
                    치아 <strong>{filteredStatements.reduce((sum, s) => sum + (s.totalTeeth || 0), 0)}</strong>개 |
                    합계: <strong>{formatCurrency(filteredStatements.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}</strong>
                </div>
            </div>

            {/* 달력 모달 */}
            {showCalendar && (
                <div style={styles.modalOverlay} onClick={() => setShowCalendar(false)}>
                    <div style={styles.calendarModal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.calendarHeader}>
                            <button 
                                onClick={() => setCalendarYear(calendarYear - 1)}
                                style={styles.calendarNavButton}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <h3 style={styles.calendarTitle}>{calendarYear}년</h3>
                            <button 
                                onClick={() => setCalendarYear(calendarYear + 1)}
                                style={styles.calendarNavButton}
                            >
                                <ChevronRight size={20} />
                            </button>
                            <button 
                                onClick={() => setShowCalendar(false)}
                                style={styles.calendarCloseButton}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={styles.calendarGrid}>
                            {monthNames.map((monthName, index) => {
                                const month = index + 1;
                                const isSelected = selectedYear === calendarYear && selectedMonth === month;
                                const isCurrent = new Date().getFullYear() === calendarYear && 
                                                new Date().getMonth() + 1 === month;

                                return (
                                    <button
                                        key={month}
                                        onClick={() => handleMonthSelect(month)}
                                        style={{
                                            ...styles.monthButton,
                                            ...(isSelected ? styles.monthButtonSelected : {}),
                                            ...(isCurrent ? styles.monthButtonCurrent : {})
                                        }}
                                    >
                                        {monthName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {filteredStatements.length === 0 ? (
                <div style={styles.emptyState}>
                    <DollarSign size={48} color="#cbd5e1" />
                    <p style={styles.emptyText}>
                        {statements.length === 0 ? '거래명세서가 없습니다' : `${selectedYear}년 ${selectedMonth}월에 거래명세서가 없습니다`}
                    </p>
                    {statements.length > 0 && (
                        <button onClick={resetFilters} style={styles.resetButtonLarge}>
                            이번 달로 돌아가기
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredStatements.map((statement) => {
                        // 🔥 상태 구분
                        const isDraft = statement.status === 'draft';
                        const isCreator = statement.fromUserId === user.uid;

                        return (
                            <div 
                                key={statement.id} 
                                style={styles.card}
                                onClick={() => handleViewStatement(statement.id)}
                            >
                                <div style={styles.cardHeader}>
                                    <div style={styles.cardHeaderLeft}>
                                        <span style={statement.type === 'sent' ? styles.typeSent : styles.typeReceived}>
                                            {statement.type === 'sent' ? '발행' : '수신'}
                                        </span>
                                        {/* 🔥 상태 배지 */}
                                        {isDraft ? (
                                            <span style={styles.statusDraft}>
                                                <FileText size={12} />
                                                임시저장
                                            </span>
                                        ) : (
                                            <span style={styles.statusPublished}>
                                                <Send size={12} />
                                                발행완료
                                            </span>
                                        )}
                                    </div>
                                    <span style={styles.cardDate}>
                                        <Calendar size={14} />
                                        {formatDate(statement.orderDate || statement.createdAt)}
                                    </span>
                                </div>

                                <div style={styles.cardBody}>
                                    {statement.orderNumber && (
                                        <div style={styles.orderNumber}>
                                            {statement.orderNumber}
                                        </div>
                                    )}

                                    <h3 style={styles.cardTitle}>
                                        {statement.type === 'sent' 
                                            ? statement.toUserName 
                                            : statement.fromUserName}
                                    </h3>

                                    {statement.patientName && (
                                        <div style={styles.patientName}>
                                            환자: {statement.patientName}
                                        </div>
                                    )}

                                    <div style={styles.cardAmount}>
                                        {formatCurrency(statement.totalAmount)}
                                    </div>

                                    <div style={styles.cardInfo}>
                                        <div style={styles.cardInfoItem}>
                                            <span style={styles.cardInfoLabel}>항목:</span>
                                            <span style={styles.cardInfoValue}>{statement.items?.length || 0}건</span>
                                        </div>
                                        {statement.totalTeeth > 0 && (
                                            <div style={styles.cardInfoItem}>
                                                <span style={styles.cardInfoLabel}>치아:</span>
                                                <span style={{...styles.cardInfoValue, ...styles.toothBadge}}>
                                                    {statement.totalTeeth}개
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {statement.items && statement.items.length > 0 && (
                                        <div style={styles.itemsPreview}>
                                            {statement.items.slice(0, 2).map((item, idx) => 
                                                item.toothInfo ? item.toothInfo.substring(0, 20) : `#${item.toothNumber || '?'}`
                                            ).join(', ')}
                                            {statement.items.length > 2 && ` 외 ${statement.items.length - 2}개`}
                                        </div>
                                    )}

                                    {/* 🔥 임시저장 안내 */}
                                    {isDraft && isCreator && (
                                        <div style={styles.draftNotice}>
                                            ⚠️ 거래처에 발송되지 않음
                                        </div>
                                    )}
                                </div>

                                <div style={styles.cardFooter}>
                                    <Eye size={16} />
                                    <span>상세보기</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const styles = {
    loading: {
        textAlign: 'center',
        padding: '80px 20px',
        color: '#64748b',
    },
    spinner: {
        width: '50px',
        height: '50px',
        margin: '0 auto 20px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '15px',
        color: '#64748b',
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    emptyText: {
        marginTop: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#64748b',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    // 🔥 헤더 왼쪽 (발행/수신 + 상태)
    cardHeaderLeft: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    typeSent: {
        padding: '6px 12px',
        backgroundColor: '#dbeafe',
        color: '#2563eb',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    typeReceived: {
        padding: '6px 12px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    // 🔥 임시저장 배지
    statusDraft: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
    },
    // 🔥 발행완료 배지
    statusPublished: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
    },
    cardDate: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#94a3b8',
    },
    cardBody: {
        marginBottom: '16px',
    },
    cardTitle: {
        margin: '0 0 12px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    cardAmount: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#6366f1',
        marginBottom: '12px',
    },
    cardInfo: {
        display: 'flex',
        gap: '16px',
        marginBottom: '8px',
    },
    cardInfoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    cardInfoLabel: {
        fontSize: '13px',
        color: '#94a3b8',
        fontWeight: '500',
    },
    cardInfoValue: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '600',
    },
    toothBadge: {
        padding: '2px 8px',
        backgroundColor: '#dbeafe',
        color: '#2563eb',
        borderRadius: '4px',
        fontSize: '12px',
    },
    itemsPreview: {
        fontSize: '12px',
        color: '#94a3b8',
        lineHeight: '1.5',
    },
    // 🔥 임시저장 안내
    draftNotice: {
        marginTop: '8px',
        padding: '8px 12px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        border: '1px solid #fbbf24',
    },
    cardFooter: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6366f1',
    },
    filterSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #e2e8f0',
    },
    filterRow: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        marginBottom: '16px',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '150px',
    },
    filterLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    filterSelect: {
        padding: '10px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
    },
    calendarButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        border: '2px solid #6366f1',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    resetButton: {
        padding: '10px 20px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: 'auto',
    },
    downloadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: 'auto',
    },
    quickSelectRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        paddingTop: '12px',
        borderTop: '1px solid #e2e8f0',
        marginBottom: '16px',
    },
    quickSelectLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    quickButton: {
        padding: '6px 12px',
        backgroundColor: '#f8fafc',
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    filterSummary: {
        fontSize: '14px',
        color: '#64748b',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
    },
    resetButtonLarge: {
        marginTop: '16px',
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    orderNumber: {
        fontSize: '12px',
        color: '#6366f1',
        fontWeight: '600',
        marginBottom: '8px',
    },
    patientName: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '12px',
    },
    // 달력 모달 스타일
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    calendarModal: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    calendarHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        position: 'relative',
    },
    calendarTitle: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
        textAlign: 'center',
    },
    calendarNavButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#64748b',
        transition: 'all 0.2s',
    },
    calendarCloseButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        color: '#94a3b8',
        transition: 'all 0.2s',
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
    },
    monthButton: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    monthButtonSelected: {
        backgroundColor: '#6366f1',
        color: 'white',
        borderColor: '#6366f1',
    },
    monthButtonCurrent: {
        borderColor: '#6366f1',
        color: '#6366f1',
    },
};

export default TransactionStatementList;