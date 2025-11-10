import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function TransactionStatementScreen({ navigation }) {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'draft', 'published'

  useEffect(() => {
    loadStatements();
  }, [filter]);

  const loadStatements = () => {
    if (!auth.currentUser) return;

    setLoading(true);

    let q = query(
      collection(db, 'transactionStatements'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    if (filter !== 'all') {
      q = query(q, where('status', '==', filter));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const statementsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStatements(statementsData);
        setLoading(false);
      },
      (error) => {
        console.error('거래명세서 로드 실패:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
      date.getDate()
    ).padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    return amount ? amount.toLocaleString() + '원' : '0원';
  };

  const handleShare = (statement) => {
    Alert.alert(
      '공유',
      '거래명세서를 공유하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: 'PDF로 공유',
          onPress: () => {
            // TODO: PDF 생성 및 공유
            Alert.alert('준비 중', 'PDF 공유 기능은 준비 중입니다.');
          },
        },
      ]
    );
  };

  const renderStatement = ({ item }) => (
    <TouchableOpacity
      style={styles.statementCard}
      onPress={() => navigation.navigate('StatementDetail', { statementId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clinicName}>{item.clinicName || '업체명 없음'}</Text>
          <Text style={styles.period}>
            {formatDate(item.startDate)} ~ {formatDate(item.endDate)}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.status === 'published' ? '발행' : '임시저장'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="file-document" size={16} color="#64748b" />
          <Text style={styles.infoText}>총 {item.itemCount || 0}건</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="tooth" size={16} color="#64748b" />
          <Text style={styles.infoText}>총 {item.totalTeeth || 0}개</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalAmount}>
          합계: {formatCurrency(item.totalAmount)}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleShare(item);
            }}
          >
            <Icon name="share-variant" size={20} color="#6366f1" />
          </TouchableOpacity>
          <Icon name="chevron-right" size={20} color="#cbd5e1" />
        </View>
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
        <FilterButton label="임시저장" value="draft" />
        <FilterButton label="발행완료" value="published" />
      </View>

      {/* 거래명세서 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : statements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="file-document-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>거래명세서가 없습니다</Text>
          <Text style={styles.emptySubtext}>
            웹 버전에서 거래명세서를 작성하실 수 있습니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={statements}
          renderItem={renderStatement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
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
  statementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  period: {
    fontSize: 13,
    color: '#64748b',
  },
  statusBadge: {
    backgroundColor: '#eef2ff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
  },
});
