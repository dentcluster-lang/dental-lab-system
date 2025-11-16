import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DollarSign, Calendar, Check, X, AlertCircle, TrendingUp } from 'lucide-react';
import './AutoSettlement.css';

function AutoSettlement({ user }) {
    const [settlements, setSettlements] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [stats, setStats] = useState({
        totalAmount: 0,
        completedAmount: 0,
        pendingAmount: 0
    });

    useEffect(() => {
        if (user) {
            loadSettlementData();
        }
    }, [user, selectedMonth]);

    const loadSettlementData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const targetId = user.companyId || user.uid;
            const businessType = user.userType || user.businessType;

            // 해당 월의 시작/끝 날짜
            const startDate = new Date(selectedMonth + '-01');
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

            // 완료된 주문 가져오기
            let ordersQuery;
            if (businessType === 'lab') {
                ordersQuery = query(
                    collection(db, 'workOrders'),
                    where('toUserId', '==', targetId),
                    where('status', '==', 'completed')
                );
            } else {
                ordersQuery = query(
                    collection(db, 'workOrders'),
                    where('fromUserId', '==', targetId),
                    where('status', '==', 'completed')
                );
            }

            const ordersSnapshot = await getDocs(ordersQuery);
            const orders = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                dueDate: doc.data().dueDate?.toDate()
            }));

            // 해당 월의 주문만 필터링
            const monthOrders = orders.filter(order => {
                const orderDate = order.createdAt;
                return orderDate >= startDate && orderDate <= endDate;
            });

            // 정산 데이터 가져오기
            const settlementsQuery = query(
                collection(db, 'settlements'),
                where('userId', '==', targetId),
                where('month', '==', selectedMonth)
            );

            const settlementsSnapshot = await getDocs(settlementsQuery);
            const settlementsData = settlementsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 정산되지 않은 주문 찾기
            const settledOrderIds = settlementsData.flatMap(s => s.orderIds || []);
            const pending = monthOrders.filter(order => !settledOrderIds.includes(order.id));

            // 통계 계산
            const totalAmount = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            const completedAmount = settlementsData
                .filter(s => s.status === 'completed')
                .reduce((sum, s) => sum + (s.amount || 0), 0);
            const pendingAmount = pending.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            setSettlements(settlementsData);
            setPendingOrders(pending);
            setStats({
                totalAmount,
                completedAmount,
                pendingAmount
            });
        } catch (error) {
            console.error('정산 데이터 로드 실패:', error);
            alert('정산 데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 자동 정산 생성
    const handleCreateSettlement = async () => {
        if (pendingOrders.length === 0) {
            alert('정산할 주문이 없습니다.');
            return;
        }

        try {
            const targetId = user.companyId || user.uid;
            const businessType = user.userType || user.businessType;

            const settlementData = {
                userId: targetId,
                userName: user.companyName || user.name,
                userType: businessType,
                month: selectedMonth,
                orderIds: pendingOrders.map(o => o.id),
                orderCount: pendingOrders.length,
                amount: pendingOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
                status: 'pending',
                createdAt: Timestamp.now(),
                dueDate: new Date(new Date().setDate(new Date().getDate() + 30)) // 30일 후
            };

            await addDoc(collection(db, 'settlements'), settlementData);

            alert('정산이 생성되었습니다.');
            loadSettlementData();
        } catch (error) {
            console.error('정산 생성 실패:', error);
            alert('정산 생성에 실패했습니다.');
        }
    };

    // 정산 승인
    const handleApproveSettlement = async (settlementId) => {
        if (!window.confirm('이 정산을 승인하시겠습니까?')) return;

        try {
            await updateDoc(doc(db, 'settlements', settlementId), {
                status: 'completed',
                completedAt: Timestamp.now()
            });

            alert('정산이 승인되었습니다.');
            loadSettlementData();
        } catch (error) {
            console.error('정산 승인 실패:', error);
            alert('정산 승인에 실패했습니다.');
        }
    };

    // 정산 거부
    const handleRejectSettlement = async (settlementId) => {
        if (!window.confirm('이 정산을 거부하시겠습니까?')) return;

        try {
            await updateDoc(doc(db, 'settlements', settlementId), {
                status: 'rejected',
                rejectedAt: Timestamp.now()
            });

            alert('정산이 거부되었습니다.');
            loadSettlementData();
        } catch (error) {
            console.error('정산 거부 실패:', error);
            alert('정산 거부에 실패했습니다.');
        }
    };

    // 금액 포맷
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount || 0);
    };

    // 날짜 포맷
    const formatDate = (date) => {
        if (!date) return '-';
        if (date.toDate) date = date.toDate();
        return date.toLocaleDateString('ko-KR');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>정산 데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="auto-settlement-container">
            {/* 헤더 */}
            <div className="settlement-header">
                <div>
                    <h1>자동 정산</h1>
                    <p>주문 기반 자동 정산 관리</p>
                </div>
                <div className="header-controls">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="month-selector"
                    />
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">총 금액</p>
                        <p className="stat-value">{formatCurrency(stats.totalAmount)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon completed">
                        <Check size={24} />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">정산 완료</p>
                        <p className="stat-value">{formatCurrency(stats.completedAmount)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon pending">
                        <AlertCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">정산 대기</p>
                        <p className="stat-value">{formatCurrency(stats.pendingAmount)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon progress">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">정산률</p>
                        <p className="stat-value">
                            {stats.totalAmount > 0
                                ? Math.round((stats.completedAmount / stats.totalAmount) * 100)
                                : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* 정산 대기 주문 */}
            {pendingOrders.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2>정산 대기 주문 ({pendingOrders.length}건)</h2>
                        <button
                            className="btn-create-settlement"
                            onClick={handleCreateSettlement}
                        >
                            <DollarSign size={18} />
                            정산 생성
                        </button>
                    </div>

                    <div className="pending-orders">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>주문번호</th>
                                    <th>환자명</th>
                                    <th>주문일</th>
                                    <th>금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>{order.orderNumber || order.id.slice(0, 8)}</td>
                                        <td>{order.patientName || '-'}</td>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td className="amount">{formatCurrency(order.totalAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 정산 내역 */}
            <div className="section">
                <div className="section-header">
                    <h2>정산 내역</h2>
                </div>

                {settlements.length > 0 ? (
                    <div className="settlements-list">
                        {settlements.map(settlement => (
                            <div key={settlement.id} className="settlement-card">
                                <div className="settlement-info">
                                    <div className="settlement-main">
                                        <h3>{settlement.userName}</h3>
                                        <span className={`status-badge ${settlement.status}`}>
                                            {settlement.status === 'pending' && '대기중'}
                                            {settlement.status === 'completed' && '완료'}
                                            {settlement.status === 'rejected' && '거부됨'}
                                        </span>
                                    </div>
                                    <div className="settlement-details">
                                        <div className="detail-item">
                                            <Calendar size={14} />
                                            <span>생성일: {formatDate(settlement.createdAt)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <DollarSign size={14} />
                                            <span>금액: {formatCurrency(settlement.amount)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span>주문: {settlement.orderCount}건</span>
                                        </div>
                                    </div>
                                </div>

                                {settlement.status === 'pending' && (
                                    <div className="settlement-actions">
                                        <button
                                            className="btn-approve"
                                            onClick={() => handleApproveSettlement(settlement.id)}
                                        >
                                            <Check size={16} />
                                            승인
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleRejectSettlement(settlement.id)}
                                        >
                                            <X size={16} />
                                            거부
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <DollarSign size={48} />
                        <p>정산 내역이 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AutoSettlement;