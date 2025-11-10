import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 메뉴 아이템 데이터
  const menuItems = [
    {
      id: 'create-order',
      title: '의뢰서 작성',
      icon: 'file-document-edit',
      color: '#6366f1',
      screen: 'CreateOrder',
    },
    {
      id: 'order-list',
      title: '주문 목록',
      icon: 'format-list-bulleted',
      color: '#8b5cf6',
      screen: 'OrderList',
    },
    {
      id: 'chat',
      title: '채팅',
      icon: 'chat',
      color: '#10b981',
      screen: 'Chat',
    },
    {
      id: 'marketplace',
      title: '마켓플레이스',
      icon: 'shopping',
      color: '#f59e0b',
      screen: 'Marketplace',
    },
    {
      id: 'statement',
      title: '거래명세서',
      icon: 'file-chart',
      color: '#06b6d4',
      screen: 'TransactionStatement',
    },
    {
      id: 'statistics',
      title: '통계',
      icon: 'chart-line',
      color: '#ec4899',
      screen: 'Statistics',
    },
    {
      id: 'job-board',
      title: '구인/구직',
      icon: 'briefcase',
      color: '#14b8a6',
      screen: 'JobBoard',
    },
    {
      id: 'seminar',
      title: '세미나',
      icon: 'school',
      color: '#f43f5e',
      screen: 'Seminar',
    },
    {
      id: 'used-items',
      title: '중고 물품',
      icon: 'recycle',
      color: '#84cc16',
      screen: 'UsedItems',
    },
    {
      id: 'lab-directory',
      title: '기공소 찾기',
      icon: 'map-marker',
      color: '#64748b',
      screen: 'LabDirectory',
    },
  ];

  const handleMenuPress = (screen) => {
    if (screen) {
      // TODO: 해당 화면으로 네비게이션
      console.log('Navigate to:', screen);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dental Lab</Text>
          <Text style={styles.headerSubtitle}>
            {userData?.name || userData?.email || '사용자'}님 환영합니다
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 오늘의 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>오늘의 요약</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>진행 중인 의뢰</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>신규 메시지</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>완료된 주문</Text>
            </View>
          </View>
        </View>

        {/* 메뉴 그리드 */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>메뉴</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuCard}
                onPress={() => handleMenuPress(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                  <Icon name={item.icon} size={32} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 최근 활동 */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>최근 활동</Text>
          <View style={styles.emptyState}>
            <Icon name="clock-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>최근 활동이 없습니다</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  menuSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  menuCard: {
    width: '33.333%',
    padding: 8,
  },
  menuIconContainer: {
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  recentSection: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
});
