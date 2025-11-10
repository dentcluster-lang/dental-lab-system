import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Clock, X, Save, Trash2, SendHorizontal, Inbox, Calendar } from 'lucide-react';

function CalendarView({ user }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [orders, setOrders] = useState([]);
    const [partners, setPartners] = useState({});
    const [memos, setMemos] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [editingMemo, setEditingMemo] = useState(null);
    const [memoText, setMemoText] = useState('');
    const [loading, setLoading] = useState(true);

    // ✅ 직원인 경우 회사 ID 사용
    const targetUserId = user.companyId || user.uid;

    useEffect(() => {
        fetchMonthData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, user]);

    // 거래처 정보 가져오기
    const fetchPartnerInfo = async (partnerId) => {
        if (partners[partnerId]) return partners[partnerId];

        try {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                const partnerInfo = {
                    name: partnerData.businessName || partnerData.displayName || '알 수 없음',
                    color: getPartnerColor(partnerId)
                };
                setPartners(prev => ({ ...prev, [partnerId]: partnerInfo }));
                return partnerInfo;
            }
        } catch (error) {
            console.error('거래처 정보 가져오기 실패:', error);
        }

        return { name: '알 수 없음', color: '#94a3b8' };
    };

    // 거래처별 고유 색상 생성
    const getPartnerColor = (partnerId) => {
        const colors = [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
        ];
        const hash = partnerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // 의뢰서 상태 계산
    const getOrderStatus = (order) => {
        if (order.status === 'completed') return 'completed';

        if (!order.dueDate) return 'active';

        const dueDate = order.dueDate.toDate ? order.dueDate.toDate() : new Date(order.dueDate);
        const now = new Date();

        if (dueDate < now) return 'overdue';
        return 'active';
    };

    // 해당 월의 의뢰서 및 메모 가져오기
    const fetchMonthData = async () => {
        try {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

            console.log('📅 캘린더 데이터 가져오기 시작:', `${year}년 ${month + 1}월`);
            console.log('👤 대상 사용자 ID:', targetUserId);
            console.log('👤 직원 여부:', !!user.companyId);

            // ✅ 발신/수신 주문 각각 조회 (보안 준수)
            const sentOrdersQuery = query(
                collection(db, 'workOrders'),
                where('fromUserId', '==', targetUserId)
            );

            const receivedOrdersQuery = query(
                collection(db, 'workOrders'),
                where('toUserId', '==', targetUserId)
            );

            // 병렬 실행
            const [sentSnapshot, receivedSnapshot] = await Promise.all([
                getDocs(sentOrdersQuery),
                getDocs(receivedOrdersQuery)
            ]);

            console.log('📦 발신 주문:', sentSnapshot.size);
            console.log('📦 수신 주문:', receivedSnapshot.size);

            // 합치기
            const userOrders = [
                ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            ];

            console.log('👥 내 주문 총:', userOrders.length);

            // ✅ 해당 월의 주문만 필터링
            const monthOrders = userOrders.filter(order => {
                const dateField = order.dueDate || order.deliveryDate || order.completionDate;

                if (!dateField) {
                    console.log('⚠️ 날짜 필드 없음:', order.id);
                    return false;
                }

                const orderDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
                const isInMonth = orderDate >= startOfMonth && orderDate <= endOfMonth;

                if (isInMonth) {
                    console.log('✅ 해당 월 주문:', {
                        id: order.id,
                        date: orderDate.toLocaleDateString('ko-KR'),
                        type: order.fromUserId === targetUserId ? '발신' : '수신'
                    });
                }

                return isInMonth;
            });

            console.log(`📊 ${year}년 ${month + 1}월 주문:`, monthOrders.length);

            // ✅ 날짜 필드 통일
            const ordersData = monthOrders.map(order => {
                const dateField = order.dueDate || order.deliveryDate || order.completionDate;
                return {
                    ...order,
                    dueDate: dateField
                };
            });

            setOrders(ordersData);

            // 거래처 정보 미리 가져오기
            const partnerIds = [...new Set(ordersData.map(o =>
                o.fromUserId === targetUserId ? o.toUserId : o.fromUserId
            ))];

            for (const partnerId of partnerIds) {
                await fetchPartnerInfo(partnerId);
            }

            // ✅ 메모 가져오기 (직원인 경우 회사 메모 조회)
            const memosQuery = query(
                collection(db, 'calendarMemos'),
                where('userId', '==', targetUserId),
                where('year', '==', year),
                where('month', '==', month)
            );

            const memosSnapshot = await getDocs(memosQuery);
            const memosData = {};
            memosSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const key = `${data.year}-${data.month}-${data.day}`;
                memosData[key] = { id: doc.id, ...data };
            });

            console.log('📝 메모 개수:', Object.keys(memosData).length);
            setMemos(memosData);
        } catch (error) {
            console.error('❌ 데이터 가져오기 실패:', error);
            alert('데이터를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 이전 달
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // 다음 달
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // 오늘로 이동
    const goToday = () => {
        setCurrentDate(new Date());
    };

    // 날짜 클릭
    const handleDateClick = (date) => {
        setSelectedDate(date);
        setShowSidebar(true);

        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const existingMemo = memos[key];

        if (existingMemo) {
            setEditingMemo(existingMemo);
            setMemoText(existingMemo.memo);
        } else {
            setEditingMemo(null);
            setMemoText('');
        }
    };

    // ✅ 메모 저장 (직원인 경우 회사 ID로 저장)
    const saveMemo = async () => {
        if (!selectedDate || !memoText.trim()) return;

        try {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();
            const key = `${year}-${month}-${day}`;

            if (editingMemo) {
                await updateDoc(doc(db, 'calendarMemos', editingMemo.id), {
                    memo: memoText,
                    updatedAt: new Date()
                });

                setMemos(prev => ({
                    ...prev,
                    [key]: { ...editingMemo, memo: memoText }
                }));
            } else {
                const newMemo = {
                    userId: targetUserId, // ✅ 직원인 경우 회사 ID 사용
                    year,
                    month,
                    day,
                    memo: memoText,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const docRef = await addDoc(collection(db, 'calendarMemos'), newMemo);

                setMemos(prev => ({
                    ...prev,
                    [key]: { id: docRef.id, ...newMemo }
                }));
            }

            alert('메모가 저장되었습니다.');
        } catch (error) {
            console.error('메모 저장 실패:', error);
            alert('메모 저장에 실패했습니다: ' + error.message);
        }
    };

    // 메모 삭제
    const deleteMemo = async () => {
        if (!editingMemo) return;
        if (!window.confirm('메모를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'calendarMemos', editingMemo.id));

            const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
            setMemos(prev => {
                const newMemos = { ...prev };
                delete newMemos[key];
                return newMemos;
            });

            setEditingMemo(null);
            setMemoText('');
            alert('메모가 삭제되었습니다.');
        } catch (error) {
            console.error('메모 삭제 실패:', error);
            alert('메모 삭제에 실패했습니다: ' + error.message);
        }
    };

    // ✅ 해당 날짜의 의뢰서 가져오기
    const getOrdersForDate = (date) => {
        const filtered = orders.filter(order => {
            if (!order.dueDate) return false;

            const dueDate = order.dueDate.toDate ? order.dueDate.toDate() : new Date(order.dueDate);
            const isSameDate = dueDate.getFullYear() === date.getFullYear() &&
                dueDate.getMonth() === date.getMonth() &&
                dueDate.getDate() === date.getDate();

            return isSameDate;
        });

        return filtered;
    };

    // 상태별 색상 가져오기
    const getStatusColor = (order) => {
        const status = getOrderStatus(order);
        switch (status) {
            case 'completed': return '#10b981';
            case 'overdue': return '#ef4444';
            case 'active': return '#3b82f6';
            default: return '#94a3b8';
        }
    };

    // 상태별 텍스트
    const getStatusText = (order) => {
        const status = getOrderStatus(order);
        switch (status) {
            case 'completed': return '완료';
            case 'overdue': return '지연';
            case 'active': return '진행중';
            default: return '';
        }
    };

    // 달력 렌더링
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days = [];

        // 이전 달 빈 칸
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} style={styles.emptyDay}></div>);
        }

        // 현재 달 날짜
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = `${year}-${month}-${day}`;
            const dayOrders = getOrdersForDate(date);
            const hasMemo = memos[dateKey];
            const isToday = new Date().toDateString() === date.toDateString();
            const dayOfWeek = date.getDay();
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;

            // ✅ 보내는/받는 의뢰서 분류
            const sentOrders = dayOrders.filter(o => o.fromUserId === targetUserId);
            const receivedOrders = dayOrders.filter(o => o.toUserId === targetUserId);

            const hasContent = dayOrders.length > 0 || hasMemo;

            days.push(
                <div
                    key={day}
                    onClick={() => handleDateClick(date)}
                    style={{
                        ...styles.day,
                        ...(isToday ? styles.today : {}),
                        ...(hasContent ? styles.hasEvent : {})
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        if (!isToday) {
                            e.currentTarget.style.borderColor = '#6366f1';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                        if (!isToday) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }
                    }}
                >
                    <div style={{
                        ...styles.dayNumber,
                        ...(isSunday ? styles.sundayText : {}),
                        ...(isSaturday ? styles.saturdayText : {})
                    }}>
                        {day}
                    </div>

                    {/* ✅ 발신 의뢰서 - 작은 파란색 점들로 표시 */}
                    {sentOrders.length > 0 && (
                        <div style={styles.orderDots}>
                            {sentOrders.slice(0, 5).map((_, idx) => (
                                <div key={`sent-${idx}`} style={{ ...styles.dot, backgroundColor: '#3b82f6' }} />
                            ))}
                            {sentOrders.length > 5 && (
                                <span style={{ fontSize: '9px', color: '#3b82f6', marginLeft: '2px', fontWeight: '600' }}>
                                    +{sentOrders.length - 5}
                                </span>
                            )}
                        </div>
                    )}

                    {/* ✅ 수신 의뢰서 - 작은 초록색 점들로 표시 */}
                    {receivedOrders.length > 0 && (
                        <div style={styles.orderDots}>
                            {receivedOrders.slice(0, 5).map((_, idx) => (
                                <div key={`received-${idx}`} style={{ ...styles.dot, backgroundColor: '#10b981' }} />
                            ))}
                            {receivedOrders.length > 5 && (
                                <span style={{ fontSize: '9px', color: '#10b981', marginLeft: '2px', fontWeight: '600' }}>
                                    +{receivedOrders.length - 5}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 메모 아이콘 */}
                    {hasMemo && (
                        <div style={styles.memoIcon}>📝</div>
                    )}
                </div>
            );
        }

        return days;
    };

    return (
        <div style={styles.container}>
            <div style={styles.mainContent}>
                {/* 헤더 */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>
                            <Calendar size={28} />
                            일정 관리
                        </h1>
                        <p style={styles.subtitle}>의뢰서 마감일과 메모를 관리하세요</p>
                    </div>
                </div>

                {/* 달력 컨트롤 */}
                <div style={styles.calendarControls}>
                    <button
                        onClick={prevMonth}
                        style={styles.controlButton}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#6366f1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div style={styles.currentMonth}>
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                    </div>

                    <button
                        onClick={nextMonth}
                        style={styles.controlButton}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#6366f1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <ChevronRight size={18} />
                    </button>

                    <button
                        onClick={goToday}
                        style={styles.todayButton}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#4f46e5';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#6366f1';
                        }}
                    >
                        오늘
                    </button>
                </div>

                {/* 범례 */}
                <div style={styles.legend}>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: '#eef2ff', border: '2px solid #6366f1' }}></div>
                        <span>오늘</span>
                    </div>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.dot, backgroundColor: '#3b82f6' }} />
                        <span>발신 의뢰서</span>
                    </div>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.dot, backgroundColor: '#10b981' }} />
                        <span>수신 의뢰서</span>
                    </div>
                    <div style={styles.legendItem}>
                        <span>📝 메모</span>
                    </div>
                </div>

                {/* 달력 */}
                {loading ? (
                    <div style={styles.loading}>
                        <div style={styles.spinner}></div>
                        <p>로딩 중...</p>
                    </div>
                ) : (
                    <div style={styles.calendar}>
                        {/* 요일 헤더 */}
                        <div style={styles.weekHeader}>
                            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                                <div
                                    key={day}
                                    style={{
                                        ...styles.weekDay,
                                        ...(index === 0 ? styles.sunday : {}),
                                        ...(index === 6 ? styles.saturday : {})
                                    }}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* 날짜 그리드 */}
                        <div style={styles.daysGrid}>
                            {renderCalendar()}
                        </div>
                    </div>
                )}
            </div>

            {/* 오른쪽 사이드바 */}
            {showSidebar && selectedDate && (
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <h2 style={styles.sidebarTitle}>
                            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                        </h2>
                        <button
                            onClick={() => setShowSidebar(false)}
                            style={styles.closeButton}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={styles.sidebarContent}>
                        {/* 의뢰서 목록 */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>
                                <Clock size={18} />
                                의뢰서 ({getOrdersForDate(selectedDate).length}건)
                            </h3>

                            {getOrdersForDate(selectedDate).length > 0 ? (
                                <div style={styles.ordersList}>
                                    {getOrdersForDate(selectedDate).map(order => {
                                        const partnerId = order.fromUserId === targetUserId ? order.toUserId : order.fromUserId;
                                        const partner = partners[partnerId] || { name: '로딩중...', color: '#94a3b8' };
                                        const statusColor = getStatusColor(order);
                                        const isSent = order.fromUserId === targetUserId;

                                        return (
                                            <div
                                                key={order.id}
                                                style={styles.orderItemCompact}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                                }}
                                            >
                                                {/* 상태 */}
                                                <span style={{
                                                    ...styles.compactStatus,
                                                    color: statusColor
                                                }}>
                                                    {getStatusText(order)}
                                                </span>

                                                <span style={styles.separator}>·</span>

                                                {/* 발신/수신 */}
                                                <span style={{
                                                    ...styles.compactDirection,
                                                    color: isSent ? '#3b82f6' : '#10b981'
                                                }}>
                                                    {isSent ? '발신' : '수신'}
                                                </span>

                                                <span style={styles.separator}>·</span>

                                                {/* 업체명 */}
                                                <span style={styles.compactPartner}>
                                                    {partner.name}
                                                </span>

                                                <span style={styles.separator}>·</span>

                                                {/* 환자명 */}
                                                <span style={styles.compactPatient}>
                                                    {order.patientName}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={styles.emptyMessage}>
                                    이 날짜에 예정된 의뢰서가 없습니다
                                </div>
                            )}
                        </div>

                        {/* 메모 섹션 */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <h3 style={styles.sectionTitle}>메모</h3>
                                {editingMemo && (
                                    <button
                                        onClick={deleteMemo}
                                        style={styles.deleteButton}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#fecaca';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#fee2e2';
                                        }}
                                    >
                                        <Trash2 size={14} />
                                        삭제
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={memoText}
                                onChange={(e) => setMemoText(e.target.value)}
                                placeholder="메모를 입력하세요..."
                                style={styles.memoInput}
                            />
                            <button
                                onClick={saveMemo}
                                style={styles.saveButton}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#4f46e5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#6366f1';
                                }}
                            >
                                <Save size={18} />
                                메모 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 스타일
const styles = {
    container: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
    },
    mainContent: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
    },
    header: {
        marginBottom: '20px',
    },
    title: {
        margin: '0 0 6px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    calendarControls: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '16px',
    },
    controlButton: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    currentMonth: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
        minWidth: '160px',
        textAlign: 'center',
    },
    todayButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#6366f1',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    legend: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
    },
    legendColor: {
        width: '18px',
        height: '18px',
        borderRadius: '4px',
    },
    loading: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748b',
    },
    spinner: {
        width: '40px',
        height: '40px',
        margin: '0 auto 16px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    calendar: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    weekHeader: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        marginBottom: '8px',
    },
    weekDay: {
        textAlign: 'center',
        padding: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    sunday: {
        color: '#ef4444',
    },
    saturday: {
        color: '#3b82f6',
    },
    sundayText: {
        color: '#ef4444',
    },
    saturdayText: {
        color: '#3b82f6',
    },
    daysGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
    },
    emptyDay: {
        aspectRatio: '1',
    },
    day: {
        minHeight: '70px',
        padding: '8px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    today: {
        backgroundColor: '#eef2ff',
        border: '2px solid #6366f1',
    },
    hasEvent: {
        backgroundColor: '#f8fafc',
    },
    dayNumber: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
    },
    orderDots: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flexWrap: 'wrap',
    },
    dot: {
        width: '5px',
        height: '5px',
        borderRadius: '50%',
    },
    memoIcon: {
        position: 'absolute',
        top: '6px',
        right: '6px',
        fontSize: '14px',
    },
    sidebar: {
        width: '400px',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.05)',
    },
    sidebarHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
    },
    sidebarTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    closeButton: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#f1f5f9',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        transition: 'all 0.2s',
    },
    sidebarContent: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '15px',
        fontWeight: '600',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    ordersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    orderItemCompact: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '13px',
        transition: 'all 0.2s',
        cursor: 'pointer',
    },
    compactStatus: {
        fontWeight: '600',
        fontSize: '12px',
    },
    separator: {
        color: '#cbd5e1',
        fontSize: '12px',
    },
    compactDirection: {
        fontWeight: '600',
        fontSize: '12px',
    },
    compactPartner: {
        color: '#64748b',
        fontSize: '13px',
    },
    compactPatient: {
        color: '#0f172a',
        fontWeight: '600',
        fontSize: '13px',
    },
    emptyMessage: {
        textAlign: 'center',
        padding: '20px',
        color: '#94a3b8',
        fontSize: '13px',
    },
    memoInput: {
        width: '100%',
        minHeight: '100px',
        padding: '10px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'inherit',
        resize: 'vertical',
        boxSizing: 'border-box',
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    deleteButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default CalendarView;