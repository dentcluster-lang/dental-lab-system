import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    Package, Calendar, Clock, Search, 
    Eye, Trash2, CheckCircle, 
    XCircle, AlertTriangle, Plus, MessageSquare,
    Send, Inbox, List
} from 'lucide-react';
import { ToothChartMini } from './ToothChart';
import { createNotification } from '../services/NotificationSystem';
import './OrderList.css';
import './ToothChart.css';

function OrderList({ user }) {
    const navigate = useNavigate();
    const [sentOrders, setSentOrders] = useState([]);
    const [receivedOrders, setReceivedOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [orderTypeTab, setOrderTypeTab] = useState('all');
    const [sortBy, setSortBy] = useState('latest');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actualBusinessType, setActualBusinessType] = useState(null);

    // ✅ 거래처 이름 가져오기 (업체명 우선)
    const getPartnerName = (order, isSent) => {
        if (isSent) {
            // 발신: 기공소 이름 (업체명 우선)
            return order.toCompanyName || order.labName || order.toUserName || order.receiverName || '업체명 없음';
        } else {
            // 수신: 치과 이름 (업체명 우선)
            return order.fromCompanyName || order.dentistName || order.fromUserName || order.senderName || '업체명 없음';
        }
    };

    // 납기일 가져오기 (여러 필드명 체크)
    const getDeliveryDate = (order) => {
        // 여러 가능한 필드명 체크
        const dateValue = order.deliveryDate || order.dueDate || order.completionDate || order.deliveryDueDate;
        
        if (!dateValue) return null;
        
        // Timestamp 객체인 경우
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
        }
        
        // Date 객체인 경우
        if (dateValue instanceof Date) {
            return dateValue;
        }
        
        // 문자열인 경우
        if (typeof dateValue === 'string') {
            return new Date(dateValue);
        }
        
        return null;
    };

    // 치아번호 가져오기 (여러 필드명 체크)
    const getToothNumbers = (item) => {
        const teeth = item.selectedTeeth || item.teeth || item.toothNumbers || item.toothNumber;
        
        if (Array.isArray(teeth)) {
            return teeth;
        }
        
        if (typeof teeth === 'string') {
            // "11,12,13" 형태의 문자열을 배열로 변환
            return teeth.split(',').map(t => t.trim()).filter(t => t);
        }
        
        if (typeof teeth === 'number') {
            return [teeth.toString()];
        }
        
        return [];
    };

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError('사용자 정보가 없습니다.');
            return;
        }

        let unsubscribeSent = null;
        let unsubscribeReceived = null;

        const setupOrderListeners = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('=== OrderList 초기화 ===');

                const targetId = user.companyId || user.uid;
                let businessType = null;

                if (user.userType === 'staff' || user.businessType === 'staff') {
                    console.log('👤 직원 계정 감지');
                    
                    if (!user.companyId) {
                        setError('소속 회사 정보가 없습니다.');
                        setLoading(false);
                        return;
                    }

                    const companyDoc = await getDoc(doc(db, 'users', user.companyId));
                    if (companyDoc.exists()) {
                        const companyData = companyDoc.data();
                        businessType = companyData.businessType || companyData.companyBusinessType;
                        console.log('✅ 회사 businessType:', businessType);
                    } else {
                        setError('회사 정보를 찾을 수 없습니다.');
                        setLoading(false);
                        return;
                    }
                } else {
                    businessType = user.businessType || user.companyBusinessType;
                }

                if (!businessType || (businessType !== 'dental' && businessType !== 'clinic' && businessType !== 'lab')) {
                    setError('사업자 유형이 올바르지 않습니다.');
                    setLoading(false);
                    return;
                }

                setActualBusinessType(businessType);

                // 발신 주문
                const sentQuery = query(
                    collection(db, 'workOrders'),
                    where('fromUserId', '==', targetId),
                    orderBy('createdAt', 'desc')
                );

                unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
                    console.log('📤 발신 주문:', snapshot.size, '건');
                    
                    const ordersList = snapshot.docs.map(docSnapshot => {
                        const data = docSnapshot.data();
                        
                        // 🔍 첫 번째 주문 상세 로그
                        if (snapshot.docs.indexOf(docSnapshot) === 0 && data.items && data.items.length > 0) {
                            console.log('📤 발신 주문 샘플:', {
                                id: docSnapshot.id,
                                // 거래처 관련
                                toCompanyName: data.toCompanyName,
                                labName: data.labName,
                                toUserName: data.toUserName,
                                receiverName: data.receiverName,
                                // 날짜 관련
                                deliveryDate: data.deliveryDate,
                                dueDate: data.dueDate,
                                completionDate: data.completionDate,
                                // 기공물 관련
                                items: data.items[0],
                                firstItem: {
                                    prosthesisType: data.items[0].prosthesisType,
                                    selectedTeeth: data.items[0].selectedTeeth,
                                    teeth: data.items[0].teeth,
                                    toothNumbers: data.items[0].toothNumbers,
                                    toothNumber: data.items[0].toothNumber
                                }
                            });
                        }
                        
                        return {
                            id: docSnapshot.id,
                            ...data,
                            orderType: 'sent',
                            orderDate: data.orderDate?.toDate() || data.createdAt?.toDate() || new Date()
                        };
                    });
                    setSentOrders(ordersList);
                    setLoading(false);
                });

                // 수신 주문
                const receivedQuery = query(
                    collection(db, 'workOrders'),
                    where('toUserId', '==', targetId),
                    orderBy('createdAt', 'desc')
                );

                unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
                    console.log('📥 수신 주문:', snapshot.size, '건');
                    
                    const ordersList = snapshot.docs.map(docSnapshot => {
                        const data = docSnapshot.data();
                        
                        // 🔍 첫 번째 주문 상세 로그
                        if (snapshot.docs.indexOf(docSnapshot) === 0 && data.items && data.items.length > 0) {
                            console.log('📥 수신 주문 샘플:', {
                                id: docSnapshot.id,
                                // 거래처 관련
                                fromCompanyName: data.fromCompanyName,
                                dentistName: data.dentistName,
                                fromUserName: data.fromUserName,
                                senderName: data.senderName,
                                // 날짜 관련
                                deliveryDate: data.deliveryDate,
                                dueDate: data.dueDate,
                                completionDate: data.completionDate,
                                // 기공물 관련
                                items: data.items[0],
                                firstItem: {
                                    prosthesisType: data.items[0].prosthesisType,
                                    selectedTeeth: data.items[0].selectedTeeth,
                                    teeth: data.items[0].teeth,
                                    toothNumbers: data.items[0].toothNumbers,
                                    toothNumber: data.items[0].toothNumber
                                }
                            });
                        }
                        
                        return {
                            id: docSnapshot.id,
                            ...data,
                            orderType: 'received',
                            orderDate: data.orderDate?.toDate() || data.createdAt?.toDate() || new Date()
                        };
                    });
                    setReceivedOrders(ordersList);
                    setLoading(false);
                });

            } catch (error) {
                console.error('❌ 설정 중 오류:', error);
                setError('주문 목록 초기화에 실패했습니다: ' + error.message);
                setLoading(false);
            }
        };

        setupOrderListeners();

        return () => {
            if (unsubscribeSent) unsubscribeSent();
            if (unsubscribeReceived) unsubscribeReceived();
        };
    }, [user]);

    // 검색 및 필터링
    useEffect(() => {
        let allOrders = [];
        if (orderTypeTab === 'all') {
            allOrders = [...sentOrders, ...receivedOrders];
        } else if (orderTypeTab === 'sent') {
            allOrders = [...sentOrders];
        } else if (orderTypeTab === 'received') {
            allOrders = [...receivedOrders];
        }

        let filtered = [...allOrders];

        if (searchQuery) {
            filtered = filtered.filter(order => {
                const partnerName = getPartnerName(order, order.orderType === 'sent');
                return (
                    order.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    partnerName.toLowerCase().includes(searchQuery.toLowerCase())
                );
            });
        }

        if (filterStatus && filterStatus !== 'all') {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        filtered.sort((a, b) => {
            if (sortBy === 'latest') {
                return b.orderDate - a.orderDate;
            } else if (sortBy === 'oldest') {
                return a.orderDate - b.orderDate;
            } else if (sortBy === 'partner') {
                const aName = getPartnerName(a, a.orderType === 'sent');
                const bName = getPartnerName(b, b.orderType === 'sent');
                return aName.localeCompare(bName);
            }
            return 0;
        });

        setFilteredOrders(filtered);
    }, [searchQuery, filterStatus, sortBy, sentOrders, receivedOrders, orderTypeTab]);

    // ✅ 상태 변경 기능 (모든 사용자 가능)
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            // 주문 정보 가져오기
            const orderDoc = await getDoc(doc(db, 'workOrders', orderId));
            if (!orderDoc.exists()) {
                throw new Error('주문을 찾을 수 없습니다.');
            }

            const orderData = orderDoc.data();
            
            // 상태 업데이트
            await updateDoc(doc(db, 'workOrders', orderId), {
                status: newStatus,
                updatedAt: new Date()
            });
            console.log('✅ 상태 변경 성공:', orderId, '→', newStatus);

            // ✅ 상태 변경 알림 전송 (발신자에게)
            try {
                const statusTexts = {
                    pending: '대기중',
                    in_progress: '진행중',
                    completed: '완료',
                    cancelled: '취소'
                };

                await createNotification({
                    userId: orderData.fromUserId,
                    type: `order_${newStatus}`,
                    title: `주문 상태가 "${statusTexts[newStatus]}"(으)로 변경되었습니다`,
                    message: `주문번호: ${orderData.orderNumber}\n환자명: ${orderData.patientName}\n상태: ${statusTexts[newStatus]}`,
                    orderId: orderId,
                    orderNumber: orderData.orderNumber
                });
                console.log('✅ 상태 변경 알림 전송 성공');
            } catch (notificationError) {
                console.error('⚠️ 알림 전송 실패 (상태 변경은 성공):', notificationError);
            }
        } catch (error) {
            console.error('❌ 상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다: ' + error.message);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (window.confirm('정말로 이 주문을 삭제하시겠습니까?')) {
            try {
                await deleteDoc(doc(db, 'workOrders', orderId));
                console.log('✅ 주문 삭제 성공:', orderId);
            } catch (error) {
                console.error('❌ 삭제 실패:', error);
                alert('삭제에 실패했습니다: ' + error.message);
            }
        }
    };

    const getStatusInfo = (status) => {
        const statusInfo = {
            pending: { color: '#fbbf24', icon: <AlertTriangle size={16} />, text: '대기중' },
            in_progress: { color: '#60a5fa', icon: <Package size={16} />, text: '진행중' },
            completed: { color: '#34d399', icon: <CheckCircle size={16} />, text: '완료' },
            cancelled: { color: '#f87171', icon: <XCircle size={16} />, text: '취소' }
        };
        return statusInfo[status] || statusInfo.pending;
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="order-list-container">
                <div className="loading-state">
                    <Package size={48} className="spin" />
                    <p>주문 목록을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="order-list-container">
                <div className="error-state">
                    <AlertTriangle size={48} />
                    <h3>오류 발생</h3>
                    <p>{error}</p>
                    <button 
                        className="btn-primary"
                        onClick={() => window.location.reload()}
                    >
                        새로고침
                    </button>
                </div>
            </div>
        );
    }

    const totalCount = sentOrders.length + receivedOrders.length;

    return (
        <div className="order-list-container">
            <div className="page-header">
                <div className="header-left">
                    <Package size={32} />
                    <div>
                        <h1>주문 관리</h1>
                        <p>
                            전체 {totalCount}건 
                            (발신 {sentOrders.length}건 / 수신 {receivedOrders.length}건)
                        </p>
                    </div>
                </div>
                <button 
                    className="btn-primary"
                    onClick={() => navigate('/create-order')}
                >
                    <Plus size={20} />
                    새 주문 작성
                </button>
            </div>

            {/* 주문 타입 탭 */}
            <div className="order-type-tabs">
                <button 
                    className={`tab-button ${orderTypeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setOrderTypeTab('all')}
                >
                    <List size={18} />
                    전체 ({totalCount})
                </button>
                <button 
                    className={`tab-button ${orderTypeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setOrderTypeTab('sent')}
                >
                    <Send size={18} />
                    보낸 의뢰서 ({sentOrders.length})
                </button>
                <button 
                    className={`tab-button ${orderTypeTab === 'received' ? 'active' : ''}`}
                    onClick={() => setOrderTypeTab('received')}
                >
                    <Inbox size={18} />
                    받은 의뢰서 ({receivedOrders.length})
                </button>
            </div>

            {/* 검색 및 필터 */}
            <div className="filters-section">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="환자명 또는 거래처로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-controls">
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">전체 상태</option>
                        <option value="pending">대기중</option>
                        <option value="in_progress">진행중</option>
                        <option value="completed">완료</option>
                        <option value="cancelled">취소</option>
                    </select>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="latest">최신순</option>
                        <option value="oldest">오래된순</option>
                        <option value="partner">업체순</option>
                    </select>
                </div>
            </div>

            {/* 주문 목록 테이블 */}
            {filteredOrders.length > 0 ? (
                <div className="orders-grid">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>구분</th>
                                <th>환자</th>
                                <th>거래처</th>
                                <th>주문일</th>
                                <th>납기일</th>
                                <th>기공물</th>
                                <th>상태</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => {
                                const statusInfo = getStatusInfo(order.status);
                                const isSent = order.orderType === 'sent';
                                const partnerName = getPartnerName(order, isSent);
                                const deliveryDate = getDeliveryDate(order);
                                
                                return (
                                    <tr key={order.id}>
                                        {/* 구분 */}
                                        <td data-label="구분">
                                            <span className={`order-type-badge ${isSent ? 'sent' : 'received'}`}>
                                                {isSent ? (
                                                    <>
                                                        <Send size={14} />
                                                        발신
                                                    </>
                                                ) : (
                                                    <>
                                                        <Inbox size={14} />
                                                        수신
                                                    </>
                                                )}
                                            </span>
                                        </td>

                                        {/* 환자 정보 */}
                                        <td data-label="환자">
                                            <div className="patient-info">
                                                <span className="patient-name">{order.patientName || '환자명 없음'}</span>
                                            </div>
                                        </td>

                                        {/* 거래처 */}
                                        <td data-label="거래처">
                                            <span className="partner-name" title={partnerName}>
                                                {partnerName}
                                            </span>
                                        </td>

                                        {/* 주문일 */}
                                        <td data-label="주문일">
                                            <div className="date-cell">
                                                <Calendar size={14} />
                                                {formatDate(order.orderDate)}
                                            </div>
                                        </td>

                                        {/* 납기일 */}
                                        <td data-label="납기일">
                                            <div className="date-cell">
                                                <Clock size={14} />
                                                {formatDate(deliveryDate)}
                                            </div>
                                        </td>

                                        {/* ✅ 기공물 (치아 다이어그램 + 보철물 정보) */}
                                        <td data-label="기공물">
                                            {order.items && order.items.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {/* 치아 다이어그램 */}
                                                    {(() => {
                                                        // 모든 아이템의 치아 번호 수집
                                                        const allTeeth = [];
                                                        order.items.forEach(item => {
                                                            const teeth = getToothNumbers(item);
                                                            allTeeth.push(...teeth);
                                                        });
                                                        
                                                        return allTeeth.length > 0 ? (
                                                            <ToothChartMini selectedTeeth={allTeeth} />
                                                        ) : null;
                                                    })()}
                                                    
                                                    {/* 보철물 종류와 치아번호 */}
                                                    <div className="items-list">
                                                        {order.items.slice(0, 2).map((item, idx) => {
                                                            const toothNumbers = getToothNumbers(item);
                                                            const prosthesisType = item.prosthesisType || item.type || '보철물';
                                                            
                                                            return toothNumbers.length > 0 ? (
                                                                <div key={idx} style={{ 
                                                                    fontSize: '12px',
                                                                    color: '#374151',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    <span style={{ fontWeight: '600', color: '#2563eb' }}>
                                                                        #{toothNumbers.join(', #')}
                                                                    </span>
                                                                    <span style={{ margin: '0 4px', color: '#9ca3af' }}>·</span>
                                                                    <span>{prosthesisType}</span>
                                                                    {item.shade && (
                                                                        <>
                                                                            <span style={{ margin: '0 4px', color: '#9ca3af' }}>·</span>
                                                                            <span style={{ 
                                                                                background: '#dbeafe',
                                                                                color: '#1e40af',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                fontSize: '11px'
                                                                            }}>
                                                                                {item.shade}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ) : null;
                                                        })}
                                                        {order.items.length > 2 && (
                                                            <span className="item-tag more">
                                                                외 {order.items.length - 2}건
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted">항목 없음</span>
                                            )}
                                        </td>

                                        {/* ✅ 상태 (수신자만 변경 가능, 발신자는 읽기 전용) */}
                                        <td data-label="상태">
                                            {!isSent ? (
                                                // 수신자: select로 변경 가능
                                                <select 
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    className="status-select"
                                                >
                                                    <option value="pending">대기중</option>
                                                    <option value="in_progress">진행중</option>
                                                    <option value="completed">완료</option>
                                                    <option value="cancelled">취소</option>
                                                </select>
                                            ) : (
                                                // 발신자: 읽기 전용 뱃지로 표시
                                                <span className={`status-badge ${order.status}`}>
                                                    {statusInfo.icon}
                                                    <span>{statusInfo.text}</span>
                                                </span>
                                            )}
                                        </td>

                                        {/* 작업 버튼 */}
                                        <td data-label="작업">
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-action view"
                                                    onClick={() => navigate(`/view-order/${order.id}`)}
                                                    title="의뢰서 상세보기"
                                                >
                                                    <Eye size={16} />
                                                    상세
                                                </button>
                                                
                                                <button 
                                                    onClick={() => navigate(`/chat/${order.id}`)}
                                                    className="btn-action chat"
                                                    title="채팅하기"
                                                >
                                                    <MessageSquare size={16} />
                                                    채팅
                                                </button>
                                                
                                                {!isSent && actualBusinessType === 'lab' && order.status === 'pending' && (
                                                    <button 
                                                        className="btn-action delete"
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        title="주문 삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <Package size={64} />
                    <h3>주문이 없습니다</h3>
                    <p>새로운 주문을 작성해보세요.</p>
                    <button 
                        className="btn-create-order"
                        onClick={() => navigate('/create-order')}
                    >
                        <Plus size={20} />
                        새 주문 작성
                    </button>
                </div>
            )}
        </div>
    );
}

export default OrderList;