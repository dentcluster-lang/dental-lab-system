import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function OrderListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'processing', 'completed'

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = () => {
    if (!auth.currentUser) return;

    setLoading(true);

    // Firestore 쿼리 생성
    let q = query(
      collection(db, 'orders'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    // 필터 적용
    if (filter !== 'all') {
      q = query(q, where('status', '==', filter));
    }

    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(ordersData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('주문 목록 로드 실패:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '접수대기', color: '#f59e0b' },
      processing: { label: '작업중', color: '#3b82f6' },
      completed: { label: '완료', color: '#10b981' },
      cancelled: { label: '취소', color: '#ef4444' },
    };

    const statusInfo = statusMap[status] || { label: '알 수 없음', color: '#64748b' };

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{item.orderNumber || item.id.substring(0, 8)}</Text>
        {getStatusBadge(item.status)}
      </View>

      <Text style={styles.patientName}>환자명: {item.patientName || '미지정'}</Text>

      <View style={styles.orderDetails}>
        <View style={styles.detailItem}>
          <Icon name="tooth" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            {item.prosthesis || '보철물 정보 없음'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="calendar" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            마감: {item.deadline ? formatDate(item.deadline) : '미지정'}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.createdAt}>
          {item.createdAt ? formatDate(item.createdAt) : ''}
        </Text>
        <Icon name="chevron-right" size={20} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 필터 */}
      <View style={styles.filterContainer}>
        <FilterButton label="전체" value="all" />
        <FilterButton label="접수대기" value="pending" />
        <FilterButton label="작업중" value="processing" />
        <FilterButton label="완료" value="completed" />
      </View>

      {/* 주문 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="clipboard-text-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>의뢰서가 없습니다</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateOrder')}
          >
            <Text style={styles.createButtonText}>의뢰서 작성하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* 작성 버튼 */}
      {orders.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateOrder')}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 12,
  },
  orderDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  createdAt: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
