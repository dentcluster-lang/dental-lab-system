import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Calendar, User, Building } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './OrderSelectionModal.css';

const OrderSelectionModal = ({ show, onClose, onSelect, userId }) => {
  const [activeTab, setActiveTab] = useState('sent'); // 'sent' or 'received'
  const [searchTerm, setSearchTerm] = useState('');
  const [sentOrders, setSentOrders] = useState([]);
  const [receivedOrders, setReceivedOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && userId) {
      fetchOrders();
    }
  }, [show, userId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // 보낸 의뢰서 가져오기
      const sentQuery = query(
        collection(db, 'workOrders'),
        where('fromUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sentOrdersList = sentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderType: 'sent'
      }));
      setSentOrders(sentOrdersList);

      // 받은 의뢰서 가져오기
      const receivedQuery = query(
        collection(db, 'workOrders'),
        where('toUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      const receivedOrdersList = receivedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderType: 'received'
      }));
      setReceivedOrders(receivedOrdersList);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order) => {
    onSelect(order);
    onClose();
    setSearchTerm('');
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '대기중',
      in_progress: '진행중',
      completed: '완료',
      cancelled: '취소'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      pending: 'status-pending',
      in_progress: 'status-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return classMap[status] || '';
  };

  // 현재 탭의 의뢰서 목록
  const currentOrders = activeTab === 'sent' ? sentOrders : receivedOrders;

  // 검색 필터링
  const filteredOrders = currentOrders.filter(order => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.patientName?.toLowerCase().includes(searchLower) ||
      order.fromUserName?.toLowerCase().includes(searchLower) ||
      order.toUserName?.toLowerCase().includes(searchLower)
    );
  });

  if (!show) return null;

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="order-modal-header">
          <h3>의뢰서 전달하기</h3>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 탭 */}
        <div className="order-modal-tabs">
          <button
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            보낸 의뢰서 ({sentOrders.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            받은 의뢰서 ({receivedOrders.length})
          </button>
        </div>

        {/* 검색 */}
        <div className="order-modal-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="주문번호, 환자명, 업체명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 의뢰서 목록 */}
        <div className="order-modal-body">
          {loading ? (
            <div className="order-loading">의뢰서를 불러오는 중...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="order-empty">
              {searchTerm ? '검색 결과가 없습니다.' : '의뢰서가 없습니다.'}
            </div>
          ) : (
            <div className="order-list">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="order-card"
                  onClick={() => handleSelectOrder(order)}
                >
                  <div className="order-card-header">
                    <div className="order-number">
                      <FileText size={16} />
                      {order.orderNumber}
                    </div>
                    <span className={`order-status ${getStatusClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-info-row">
                      <User size={14} />
                      <span className="label">환자:</span>
                      <span className="value">{order.patientName}</span>
                    </div>

                    <div className="order-info-row">
                      <Building size={14} />
                      <span className="label">
                        {activeTab === 'sent' ? '기공소:' : '치과:'}
                      </span>
                      <span className="value">
                        {activeTab === 'sent' ? order.toUserName : order.fromUserName}
                      </span>
                    </div>

                    {order.dueDate && (
                      <div className="order-info-row">
                        <Calendar size={14} />
                        <span className="label">납기일:</span>
                        <span className="value">{formatDate(order.dueDate)}</span>
                      </div>
                    )}

                    {order.items && order.items.length > 0 && (
                      <div className="order-items">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="item-badge">
                            {item.toothNumber} - {item.prosthesisType || item.workType}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="item-badge more">
                            +{order.items.length - 3}개
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <span className="order-date">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSelectionModal;
