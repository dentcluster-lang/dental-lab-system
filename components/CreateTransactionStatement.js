import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Search, Edit2, Trash2, Plus, Save, Printer, FileDown, X, Download, Send } from 'lucide-react';

// 날짜 계산 헬퍼 함수들
const formatDateHelper = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getToday = () => {
    const today = new Date();
    return {
        start: formatDateHelper(today),
        end: formatDateHelper(today)
    };
};

const getThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        start: formatDateHelper(monday),
        end: formatDateHelper(sunday)
    };
};

const getThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
        start: formatDateHelper(firstDay),
        end: formatDateHelper(lastDay)
    };
};

const getLastMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
        start: formatDateHelper(firstDay),
        end: formatDateHelper(lastDay)
    };
};

const getLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    return {
        start: formatDateHelper(sevenDaysAgo),
        end: formatDateHelper(today)
    };
};

const getLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    return {
        start: formatDateHelper(thirtyDaysAgo),
        end: formatDateHelper(today)
    };
};

// 치아 정보에서 치아 개수 파싱
const parseToothCount = (toothInfo) => {
    if (!toothInfo) return 0;

    // #11, #21, #22 또는 11, 21, 22 형식에서 치아 번호 추출
    const matches = toothInfo.match(/\d{1,2}/g);
    if (!matches) return 0;

    // 중복 제거 후 개수 반환
    const uniqueTeeth = [...new Set(matches)];
    return uniqueTeeth.length;
};

function CreateTransactionStatement({ user, onBack }) {
    // 검색 조건
    const [selectedClinic, setSelectedClinic] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // 거래처 목록
    const [clinics, setClinics] = useState([]);
    
    // 조회된 의뢰서들
    const [loading, setLoading] = useState(false);
    
    // 편집 가능한 항목들 (보철물별로 분리)
    const [items, setItems] = useState([]);
    
    // 총 할인
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('amount');
    
    // 메모
    const [notes, setNotes] = useState('');
    
    // 편집 모드
    const [editingItemId, setEditingItemId] = useState(null);

    // 🔥 저장 중 상태
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchClinics();
    }, []);

    // 빠른 날짜 선택 핸들러
    const handleQuickDateSelect = (start, end) => {
        setStartDate(start);
        setEndDate(end);
    };

    // 거래처 목록 가져오기
    const fetchClinics = async () => {
        try {
            const partnersMap = new Map();
            const connectionsQuery = query(
                collection(db, 'connections'),
                where('status', '==', 'accepted')
            );
            const connectionsSnapshot = await getDocs(connectionsQuery);
            
            for (const docSnap of connectionsSnapshot.docs) {
                const connection = docSnap.data();
                
                if (connection.requesterId === auth.currentUser.uid && connection.receiverId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', connection.receiverId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            partnersMap.set(connection.receiverId, {
                                id: connection.receiverId,
                                name: userData.businessName || userData.name || '이름 없음'
                            });
                        }
                    } catch (error) {
                        console.error('사용자 정보 조회 실패:', error);
                    }
                }
                
                if (connection.receiverId === auth.currentUser.uid && connection.requesterId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', connection.requesterId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            partnersMap.set(connection.requesterId, {
                                id: connection.requesterId,
                                name: userData.businessName || userData.name || '이름 없음'
                            });
                        }
                    } catch (error) {
                        console.error('사용자 정보 조회 실패:', error);
                    }
                }
            }
            
            setClinics(Array.from(partnersMap.values()));
        } catch (error) {
            console.error('거래처 목록 조회 실패:', error);
        }
    };

    // 의뢰서 조회
    const handleSearch = async () => {
        if (!selectedClinic) {
            alert('업체를 선택해주세요.');
            return;
        }

        if (!startDate || !endDate) {
            alert('날짜 범위를 선택해주세요.');
            return;
        }

        try {
            setLoading(true);
            const ordersRef = collection(db, 'workOrders');
            
            // 거래명세서는 내가 받은 의뢰서만 조회 (보낸 의뢰서는 제외)
            const receivedQuery = query(
                ordersRef,
                where('toUserId', '==', auth.currentUser.uid),
                where('fromUserId', '==', selectedClinic)
            );
            
            const receivedSnapshot = await getDocs(receivedQuery);
            
            const allOrders = receivedSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // 날짜 필터링
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            const filteredOrders = allOrders.filter(order => {
                if (!order.createdAt) return false;
                const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                return orderDate >= start && orderDate <= end;
            });
            
            // 중복 의뢰서 제거
            const uniqueOrders = Array.from(
                new Map(filteredOrders.map(order => [order.id, order])).values()
            );
            
            console.log('📊 필터링된 의뢰서:', uniqueOrders.length, '개');
            
            // 항목 생성 - 같은 보철물+재료 조합은 치아번호를 묶어서 표시
            const newItems = [];
            uniqueOrders.forEach((order, orderIndex) => {
                console.log(`\n🔍 의뢰서 ${orderIndex + 1}:`, order);
                
                // items 배열이 있는 경우
                if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                    // 같은 보철물+재료 조합으로 그룹화
                    const groups = {};
                    
                    order.items.forEach((item, itemIndex) => {
                        console.log(`  ✅ 항목 ${itemIndex + 1}:`, {
                            toothNumber: item.toothNumber,
                            prosthesis: item.prosthesis,
                            material: item.material,
                            implant: item.implant
                        });
                        
                        // implant가 있으면 임플란트 정보도 포함
                        const prosthesisType = item.implant 
                            ? `임플란트 ${item.implant}` 
                            : (item.prosthesis || '-');
                        
                        // 그룹 키 생성 (보철물 종류 + 재료)
                        const key = `${prosthesisType}|${item.material || '-'}`;
                        
                        if (!groups[key]) {
                            groups[key] = {
                                prosthesis: prosthesisType,
                                material: item.material || '-',
                                toothNumbers: []
                            };
                        }
                        
                        if (item.toothNumber) {
                            groups[key].toothNumbers.push(item.toothNumber);
                        }
                    });
                    
                    // 그룹별로 항목 생성
                    Object.entries(groups).forEach(([key, group], groupIndex) => {
                        // 치아 번호들을 정렬
                        const sortedTeeth = group.toothNumbers
                            .map(n => parseInt(n))
                            .filter(n => !isNaN(n))
                            .sort((a, b) => a - b);
                        
                        // 치아 정보 문자열 생성
                        const teethStr = sortedTeeth.length > 0 
                            ? `#${sortedTeeth.join(',')}` 
                            : '#-';
                        const toothInfo = `${teethStr} ${group.prosthesis} ${group.material}`;
                        
                        // 치아 개수
                        const toothCount = sortedTeeth.length;
                        
                        console.log(`  📝 그룹 ${groupIndex + 1}:`, toothInfo, `(${toothCount}개)`);
                        
                        // 리메이크 여부 표시
                        const remakeLabel = order.isRemake ? ' [리메이크]' : '';
                        
                        newItems.push({
                            id: `${order.id}-${groupIndex}-${Date.now()}-${Math.random()}`,
                            orderId: order.id,
                            createdAt: order.createdAt,
                            dueDate: order.dueDate,
                            patientName: order.patientName + remakeLabel,
                            toothInfo: toothInfo,
                            toothCount: toothCount,
                            isRemake: order.isRemake || false,
                            remakeReason: order.remakeReason || '',
                            price: 0
                        });
                    });
                } else {
                    // items가 없는 경우 기본 항목 생성
                    console.log(`  ⚠️ items 없음 또는 빈 배열`);
                    
                    const remakeLabel = order.isRemake ? ' [리메이크]' : '';
                    
                    newItems.push({
                        id: `${order.id}-${Date.now()}-${Math.random()}`,
                        orderId: order.id,
                        createdAt: order.createdAt,
                        dueDate: order.dueDate,
                        patientName: order.patientName + remakeLabel,
                        toothInfo: '-',
                        toothCount: 0,
                        isRemake: order.isRemake || false,
                        remakeReason: order.remakeReason || '',
                        price: 0
                    });
                }
            });
            
            console.log('\n✅ 생성된 항목:', newItems.length, '개');
            console.log('첫 번째 항목:', newItems[0]);
            
            setItems(newItems);
            setTotalDiscount(0);
            setDiscountType('amount');
            
        } catch (error) {
            console.error('의뢰서 조회 실패:', error);
            alert('의뢰서 조회에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Excel 다운로드
    const downloadExcel = () => {
        if (items.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }

        const selectedClinicName = clinics.find(c => c.id === selectedClinic)?.name || '업체';
        
        let csv = '작성일,마감일,환자명,치아정보,치아개수,가격\n';

        items.forEach(item => {
            const date = formatDate(item.createdAt);
            const dueDate = formatDate(item.dueDate);
            const patientName = item.patientName || '-';
            const toothInfo = (item.toothInfo || '-').replace(/,/g, ';'); // CSV 구분자 충돌 방지
            const toothCount = item.toothCount || 0;
            const price = item.price || 0;

            csv += `${date},${dueDate},${patientName},"${toothInfo}",${toothCount},${price}\n`;
        });

        const { subtotal, discountAmount, total, totalTeeth } = calculateTotal();
        csv += `\n`;
        csv += `소계,,,,${totalTeeth}개,"${subtotal}"\n`;
        if (discountAmount > 0) {
            csv += `할인,,,,,"-${discountAmount}"\n`;
        }
        csv += `최종합계,,,,${totalTeeth}개,"${total}"\n`;

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `거래명세서_${selectedClinicName}_${startDate}_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return `${date.getMonth() + 1}-${date.getDate()}`;
    };

    const handlePriceChange = (itemId, newPrice) => {
        const price = Number(newPrice) || 0;
        if (price < 0) return; // 음수 방지
        
        setItems(items.map(item => 
            item.id === itemId ? { ...item, price } : item
        ));
    };

    const handleToothInfoChange = (itemId, newToothInfo) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    toothInfo: newToothInfo,
                    toothCount: parseToothCount(newToothInfo)
                };
            }
            return item;
        }));
    };

    const handleToothCountChange = (itemId, newCount) => {
        const count = Number(newCount) || 0;
        if (count < 0) return; // 음수 방지
        
        setItems(items.map(item => 
            item.id === itemId ? { ...item, toothCount: count } : item
        ));
    };

    const handleDeleteItem = (itemId) => {
        if (window.confirm('이 항목을 삭제하시겠습니까?')) {
            setItems(items.filter(item => item.id !== itemId));
        }
    };

    const handleAddItem = () => {
        const newItem = {
            id: `manual-${Date.now()}-${Math.random()}`,
            orderId: null,
            createdAt: new Date(),
            dueDate: null,
            patientName: '',
            toothInfo: '',
            toothCount: 0,
            isRemake: false,
            remakeReason: '',
            price: 0
        };
        setItems([...items, newItem]);
        setEditingItemId(newItem.id);
    };

    const calculateTotal = () => {
        const subtotal = items.reduce((sum, item) => sum + item.price, 0);
        const totalTeeth = items.reduce((sum, item) => sum + (item.toothCount || 0), 0);
        
        let discountAmount = 0;
        if (discountType === 'percent') {
            discountAmount = Math.round(subtotal * totalDiscount / 100);
        } else {
            discountAmount = Number(totalDiscount) || 0;
        }
        
        const total = subtotal - discountAmount;
        
        return { subtotal, discountAmount, total, totalTeeth };
    };

    // 🔥 임시저장 (발송 안 됨)
    const handleSaveDraft = async () => {
        if (items.length === 0) {
            alert('항목이 없습니다.');
            return;
        }

        const { subtotal, discountAmount, total, totalTeeth } = calculateTotal();

        if (total < 0) {
            alert('할인 금액이 총액보다 클 수 없습니다.');
            return;
        }

        try {
            setSaving(true);

            const receiverDoc = await getDoc(doc(db, 'users', selectedClinic));
            const receiverData = receiverDoc.exists() ? receiverDoc.data() : {};

            const senderDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const senderData = senderDoc.exists() ? senderDoc.data() : {};

            const statementData = {
                fromUserId: auth.currentUser.uid,
                fromUserName: senderData.businessName || senderData.name,
                toUserId: selectedClinic,
                toUserName: receiverData.businessName || receiverData.name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                items: items.map(item => ({
                    createdAt: item.createdAt,
                    dueDate: item.dueDate,
                    patientName: item.patientName,
                    toothInfo: item.toothInfo,
                    toothCount: item.toothCount,
                    isRemake: item.isRemake,
                    remakeReason: item.remakeReason,
                    price: item.price
                })),
                subtotal,
                totalDiscount: totalDiscount,
                discountType: discountType,
                discountAmount: discountAmount,
                totalAmount: total,
                totalTeeth: totalTeeth,
                notes,
                createdAt: new Date(),
                createdBy: auth.currentUser.uid,
                status: 'draft' // 🔥 임시저장 상태
            };

            await addDoc(collection(db, 'transactionStatements'), statementData);

            alert('✅ 임시저장되었습니다!\n(거래처에는 발송되지 않았습니다)');
            onBack();
        } catch (error) {
            console.error('임시저장 실패:', error);
            alert('임시저장에 실패했습니다: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // 🔥 발행 (저장 + 발송)
    const handlePublish = async () => {
        if (items.length === 0) {
            alert('항목이 없습니다.');
            return;
        }

        const { subtotal, discountAmount, total, totalTeeth } = calculateTotal();

        if (total < 0) {
            alert('할인 금액이 총액보다 클 수 없습니다.');
            return;
        }

        // 🔥 발행 확인
        if (!window.confirm('거래명세서를 발행하시겠습니까?\n\n발행하면 거래처에게 즉시 발송됩니다.')) {
            return;
        }

        try {
            setSaving(true);

            const receiverDoc = await getDoc(doc(db, 'users', selectedClinic));
            const receiverData = receiverDoc.exists() ? receiverDoc.data() : {};

            const senderDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const senderData = senderDoc.exists() ? senderDoc.data() : {};

            const statementData = {
                fromUserId: auth.currentUser.uid,
                fromUserName: senderData.businessName || senderData.name,
                toUserId: selectedClinic,
                toUserName: receiverData.businessName || receiverData.name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                items: items.map(item => ({
                    createdAt: item.createdAt,
                    dueDate: item.dueDate,
                    patientName: item.patientName,
                    toothInfo: item.toothInfo,
                    toothCount: item.toothCount,
                    isRemake: item.isRemake,
                    remakeReason: item.remakeReason,
                    price: item.price
                })),
                subtotal,
                totalDiscount: totalDiscount,
                discountType: discountType,
                discountAmount: discountAmount,
                totalAmount: total,
                totalTeeth: totalTeeth,
                notes,
                createdAt: new Date(),
                createdBy: auth.currentUser.uid,
                publishedAt: new Date(), // 🔥 발행 시각
                status: 'confirmed' // 🔥 발행 완료 상태
            };

            await addDoc(collection(db, 'transactionStatements'), statementData);

            alert('✅ 거래명세서가 발행되었습니다!\n\n거래처에게 발송되었습니다.');
            onBack();
        } catch (error) {
            console.error('발행 실패:', error);
            alert('발행에 실패했습니다: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const { subtotal, discountAmount, total, totalTeeth } = calculateTotal();

    return (
        <div style={styles.container}>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-area, .print-area * {
                            visibility: visible;
                        }
                        .print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>

            <div className="no-print" style={styles.header}>
                <h1 style={styles.title}>거래명세서 작성</h1>
                <button onClick={onBack} style={styles.backButton}>
                    <X size={16} />
                    닫기
                </button>
            </div>

            {/* 검색 조건 */}
            <div className="no-print" style={styles.searchSection}>
                <div style={styles.searchRow}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>🏥 업체 선택</label>
                        <select
                            value={selectedClinic}
                            onChange={(e) => setSelectedClinic(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">업체를 선택하세요</option>
                            {clinics.map((clinic) => (
                                <option key={clinic.id} value={clinic.id}>
                                    {clinic.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>📅 시작일</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>📅 종료일</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        style={styles.searchButton}
                    >
                        <Search size={16} />
                        {loading ? '조회 중...' : '조회하기'}
                    </button>
                </div>

                {/* 빠른 선택 버튼 */}
                <div style={styles.quickSelectRow}>
                    <span style={styles.quickSelectLabel}>빠른 선택:</span>
                    <button
                        type="button"
                        onClick={() => {
                            const period = getToday();
                            handleQuickDateSelect(period.start, period.end);
                        }}
                        style={styles.quickButton}
                    >
                        오늘
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const period = getThisWeek();
                            handleQuickDateSelect(period.start, period.end);
                        }}
                        style={styles.quickButton}
                    >
                        이번 주
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const period = getThisMonth();
                            handleQuickDateSelect(period.start, period.end);
                        }}
                        style={styles.quickButton}
                    >
                        이번 달
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const period = getLastMonth();
                            handleQuickDateSelect(period.start, period.end);
                        }}
                        style={styles.quickButton}
                    >
                        지난 달
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const period = getLast7Days();
                            handleQuickDateSelect(period.start, period.end);
                        }}
                        style={styles.quickButton}
                    >
                        최근 7일
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const period = getLast30Days();
                            handleQuickDateSelect(period.start, period.end);
                        }}
                        style={styles.quickButton}
                    >
                        최근 30일
                    </button>
                </div>
            </div>

            {/* 테이블 */}
            {items.length > 0 && (
                <>
                    <div className="print-area" style={styles.tableSection}>
                        <div className="no-print" style={styles.tableSectionHeader}>
                            <h3 style={styles.tableSectionTitle}>
                                거래 내역 ({items.length}건 / 총 {totalTeeth}개)
                            </h3>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button onClick={downloadExcel} style={styles.downloadButton}>
                                    <Download size={14} />
                                    Excel 다운로드
                                </button>
                                <button onClick={handleAddItem} style={styles.addItemButton}>
                                    <Plus size={14} />
                                    항목 추가
                                </button>
                            </div>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeader}>
                                        <th style={{...styles.th, width: '70px'}}>작성일</th>
                                        <th style={{...styles.th, width: '70px'}}>마감일</th>
                                        <th style={{...styles.th, width: '100px'}}>환자명</th>
                                        <th style={{...styles.th, width: 'auto', minWidth: '250px'}}>치아정보</th>
                                        <th style={{...styles.th, width: '60px'}}>개수</th>
                                        <th style={{...styles.th, width: '140px'}}>가격</th>
                                        <th className="no-print" style={{...styles.th, width: '80px'}}>작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // 같은 환자의 행들을 그룹화
                                        const groupedItems = [];
                                        let currentPatient = null;
                                        let currentGroup = [];
                                        
                                        items.forEach((item, index) => {
                                            const patientKey = `${item.patientName}-${formatDate(item.createdAt)}-${formatDate(item.dueDate)}`;
                                            
                                            if (patientKey !== currentPatient) {
                                                if (currentGroup.length > 0) {
                                                    groupedItems.push(currentGroup);
                                                }
                                                currentPatient = patientKey;
                                                currentGroup = [item];
                                            } else {
                                                currentGroup.push(item);
                                            }
                                        });
                                        
                                        if (currentGroup.length > 0) {
                                            groupedItems.push(currentGroup);
                                        }
                                        
                                        // 렌더링
                                        return groupedItems.map((group, groupIndex) => {
                                            return group.map((item, itemIndex) => (
                                                <tr key={item.id} style={styles.tableRow}>
                                                    {/* 작성일 - 첫 번째 행에만 표시 */}
                                                    {itemIndex === 0 && (
                                                        <td style={styles.td} rowSpan={group.length}>
                                                            {editingItemId === item.id ? (
                                                                <input
                                                                    type="date"
                                                                    style={styles.editInput}
                                                                    defaultValue={item.createdAt instanceof Date ? 
                                                                        item.createdAt.toISOString().split('T')[0] : 
                                                                        ''}
                                                                />
                                                            ) : (
                                                                formatDate(item.createdAt)
                                                            )}
                                                        </td>
                                                    )}
                                                    
                                                    {/* 마감일 - 첫 번째 행에만 표시 */}
                                                    {itemIndex === 0 && (
                                                        <td style={styles.td} rowSpan={group.length}>
                                                            {editingItemId === item.id ? (
                                                                <input
                                                                    type="date"
                                                                    style={styles.editInput}
                                                                    defaultValue={item.dueDate instanceof Date ? 
                                                                        item.dueDate.toISOString().split('T')[0] : 
                                                                        ''}
                                                                    onChange={(e) => {
                                                                        const newDate = e.target.value ? new Date(e.target.value) : null;
                                                                        setItems(items.map(i => 
                                                                            i.id === item.id ? {...i, dueDate: newDate} : i
                                                                        ));
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span style={item.dueDate ? styles.dueDateText : styles.noDueDateText}>
                                                                    {item.dueDate ? formatDate(item.dueDate) : '-'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                    
                                                    {/* 환자명 - 첫 번째 행에만 표시 */}
                                                    {itemIndex === 0 && (
                                                        <td style={styles.td} rowSpan={group.length}>
                                                            {editingItemId === item.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={item.patientName}
                                                                    onChange={(e) => {
                                                                        setItems(items.map(i => 
                                                                            i.id === item.id ? {...i, patientName: e.target.value} : i
                                                                        ));
                                                                    }}
                                                                    style={styles.editInput}
                                                                    placeholder="환자명"
                                                                />
                                                            ) : (
                                                                item.patientName
                                                            )}
                                                        </td>
                                                    )}
                                                    
                                                    {/* 치아정보 */}
                                                    <td style={styles.td}>
                                                        {editingItemId === item.id ? (
                                                            <input
                                                                type="text"
                                                                value={item.toothInfo}
                                                                onChange={(e) => handleToothInfoChange(item.id, e.target.value)}
                                                                style={{...styles.editInput, width: '100%'}}
                                                                placeholder="#11 크라운 지르코니아"
                                                            />
                                                        ) : (
                                                            <span style={styles.toothInfoText}>{item.toothInfo}</span>
                                                        )}
                                                    </td>
                                                    
                                                    {/* 개수 */}
                                                    <td style={styles.tdCenter}>
                                                        {editingItemId === item.id ? (
                                                            <input
                                                                type="number"
                                                                value={item.toothCount || 0}
                                                                onChange={(e) => handleToothCountChange(item.id, e.target.value)}
                                                                style={{...styles.editInput, width: '50px'}}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                        ) : (
                                                            <span style={styles.toothCountBadge}>
                                                                {item.toothCount || 0}개
                                                            </span>
                                                        )}
                                                    </td>
                                                    
                                                    {/* 가격 */}
                                                    <td style={styles.td}>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                            style={styles.priceInput}
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    </td>
                                                    
                                                    {/* 작업 */}
                                                    <td className="no-print" style={styles.td}>
                                                        <div style={styles.actionButtons}>
                                                            {editingItemId === item.id ? (
                                                                <button
                                                                    onClick={() => setEditingItemId(null)}
                                                                    style={styles.saveButton}
                                                                    title="저장"
                                                                >
                                                                    <Save size={14} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setEditingItemId(item.id)}
                                                                    style={styles.editButton}
                                                                    title="수정"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                style={styles.deleteButton}
                                                                title="삭제"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 합계 */}
                    <div className="print-area" style={styles.totalSection}>
                        <div style={styles.totalRow}>
                            <span style={styles.totalLabel}>소계:</span>
                            <span style={styles.totalValue}>{formatCurrency(subtotal)}원</span>
                        </div>
                        
                        <div style={styles.discountRow}>
                            <span style={styles.totalLabel}>총 할인:</span>
                            <div style={styles.discountInputGroup}>
                                <input
                                    type="number"
                                    value={totalDiscount}
                                    onChange={(e) => setTotalDiscount(Number(e.target.value) || 0)}
                                    style={styles.discountInputLarge}
                                    placeholder="0"
                                    min="0"
                                />
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value)}
                                    style={styles.discountTypeSelectLarge}
                                >
                                    <option value="amount">원</option>
                                    <option value="percent">%</option>
                                </select>
                            </div>
                        </div>

                        {discountAmount > 0 && (
                            <div style={styles.totalRow}>
                                <span style={styles.totalLabel}>할인 금액:</span>
                                <span style={styles.discountValue}>-{formatCurrency(discountAmount)}원</span>
                            </div>
                        )}
                        
                        <div style={styles.totalRowFinal}>
                            <div>
                                <div style={styles.totalLabelFinal}>최종 합계</div>
                                <div style={styles.totalTeethInfo}>총 {totalTeeth}개</div>
                            </div>
                            <div style={styles.totalValueWrapper}>
                                <div style={styles.totalValueFinal}>{formatCurrency(total)}원</div>
                                {totalTeeth > 0 && (
                                    <div style={styles.avgPerTooth}>
                                        개당 평균: {formatCurrency(Math.round(total / totalTeeth))}원
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 메모 */}
                    <div className="print-area" style={styles.notesSection}>
                        <label style={styles.notesLabel}>💡 메모/특이사항</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={styles.notesTextarea}
                            placeholder="거래명세서에 추가할 메모를 입력하세요..."
                        />
                    </div>

                    {/* 🔥 액션 버튼 (저장/발행 분리) */}
                    <div className="no-print" style={styles.actions}>
                        <button onClick={handlePrint} style={styles.printButton}>
                            <Printer size={16} />
                            인쇄
                        </button>
                        <button 
                            onClick={handleSaveDraft} 
                            style={styles.saveDraftButton}
                            disabled={saving}
                        >
                            <Save size={16} />
                            {saving ? '저장 중...' : '임시저장'}
                        </button>
                        <button 
                            onClick={handlePublish} 
                            style={styles.publishButton}
                            disabled={saving}
                        >
                            <Send size={16} />
                            {saving ? '발행 중...' : '발행하기'}
                        </button>
                    </div>

                    {/* 🔥 안내 메시지 */}
                    <div className="no-print" style={styles.infoBox}>
                        <div style={styles.infoItem}>
                            <Save size={16} color="#6366f1" />
                            <span><strong>임시저장:</strong> 작성 중인 내용만 저장됩니다 (거래처에 발송 안 됨)</span>
                        </div>
                        <div style={styles.infoItem}>
                            <Send size={16} color="#059669" />
                            <span><strong>발행하기:</strong> 저장 후 거래처에 즉시 발송됩니다</span>
                        </div>
                    </div>
                </>
            )}

            {/* 검색 결과 없음 */}
            {!loading && items.length === 0 && selectedClinic && startDate && endDate && (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📋</div>
                    <p style={styles.emptyText}>해당 기간에 의뢰서가 없습니다.</p>
                    <p style={styles.emptySubtext}>다른 날짜 범위를 선택해보세요.</p>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    title: {
        margin: 0,
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '8px',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    searchSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
    },
    searchRow: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr auto',
        gap: '16px',
        alignItems: 'end',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    select: {
        padding: '10px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
    },
    input: {
        padding: '10px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    searchButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    quickSelectRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
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
    tableSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
    },
    tableSectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    tableSectionTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    downloadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    addItemButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    tableContainer: {
        overflowX: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#ffffff',
    },
    tableHeader: {
        backgroundColor: '#f8fafc',
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '700',
        color: '#475569',
        borderBottom: '2px solid #e2e8f0',
        whiteSpace: 'nowrap',
    },
    tableRow: {
        borderBottom: '1px solid #f1f5f9',
    },
    td: {
        padding: '12px',
        fontSize: '14px',
        color: '#0f172a',
        verticalAlign: 'middle',
    },
    tdCenter: {
        padding: '12px',
        fontSize: '14px',
        color: '#0f172a',
        textAlign: 'center',
        verticalAlign: 'middle',
    },
    priceInput: {
        width: '100%',
        padding: '6px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
        textAlign: 'right',
    },
    actionButtons: {
        display: 'flex',
        gap: '4px',
    },
    editButton: {
        padding: '6px',
        backgroundColor: '#dbeafe',
        color: '#2563eb',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    saveButton: {
        padding: '6px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    deleteButton: {
        padding: '6px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    editInput: {
        padding: '4px 6px',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        fontSize: '13px',
        boxSizing: 'border-box',
    },
    toothInfoText: {
        fontSize: '14px',
        color: '#0f172a',
        lineHeight: '1.5',
    },
    toothCountBadge: {
        display: 'inline-block',
        padding: '4px 10px',
        backgroundColor: '#dbeafe',
        color: '#1d4ed8',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
    },
    dueDateText: {
        color: '#0f172a',
        fontWeight: '500',
    },
    noDueDateText: {
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    totalSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        fontSize: '16px',
    },
    discountRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        fontSize: '16px',
        backgroundColor: '#fef3c7',
        margin: '8px -24px',
        borderRadius: '8px',
    },
    totalLabel: {
        color: '#64748b',
        fontWeight: '600',
    },
    totalValue: {
        color: '#0f172a',
        fontWeight: '600',
    },
    discountValue: {
        color: '#dc2626',
        fontWeight: '600',
    },
    discountInputGroup: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    discountInputLarge: {
        width: '150px',
        padding: '8px 12px',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        boxSizing: 'border-box',
        textAlign: 'right',
    },
    discountTypeSelectLarge: {
        padding: '8px 12px',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    totalRowFinal: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '20px 0 0 0',
        borderTop: '2px solid #e2e8f0',
        marginTop: '12px',
    },
    totalLabelFinal: {
        fontSize: '20px',
        color: '#0f172a',
        fontWeight: '700',
    },
    totalTeethInfo: {
        fontSize: '14px',
        color: '#64748b',
        marginTop: '4px',
    },
    totalValueWrapper: {
        textAlign: 'right',
    },
    totalValueFinal: {
        fontSize: '28px',
        color: '#6366f1',
        fontWeight: '700',
    },
    avgPerTooth: {
        fontSize: '13px',
        color: '#64748b',
        marginTop: '6px',
    },
    notesSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
    },
    notesLabel: {
        display: 'block',
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    notesTextarea: {
        width: '100%',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        minHeight: '100px',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    actions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginBottom: '16px',
    },
    printButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    // 🔥 임시저장 버튼
    saveDraftButton: {
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
    // 🔥 발행 버튼
    publishButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    // 🔥 안내 메시지
    infoBox: {
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    infoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: '#64748b',
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px dashed #e2e8f0',
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px',
    },
    emptyText: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '8px',
    },
    emptySubtext: {
        fontSize: '14px',
        color: '#94a3b8',
    },
};

export default CreateTransactionStatement;