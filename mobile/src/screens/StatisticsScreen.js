import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const { width } = Dimensions.get('window');

export default function StatisticsScreen() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    revenue: 0,
    averagePrice: 0,
  });

  useEffect(() => {
    loadStatistics();
  }, [period]);

  const loadStatistics = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const q = query(
        collection(db, 'orders'),
        where('userId', '==', auth.currentUser.uid),
        where('createdAt', '>=', startDate)
      );

      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((doc) => doc.data());

      const totalOrders = orders.length;
      const completedOrders = orders.filter((o) => o.status === 'completed').length;
      const revenue = orders
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + (o.price || 0), 0);
      const averagePrice = totalOrders > 0 ? revenue / totalOrders : 0;

      setStats({
        totalOrders,
        completedOrders,
        revenue,
        averagePrice,
      });
    } catch (error) {
      console.error('통계 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const PeriodButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.periodButton, period === value && styles.periodButtonActive]}
      onPress={() => setPeriod(value)}
    >
      <Text style={[styles.periodText, period === value && styles.periodTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, label, value, color, prefix = '', suffix = '' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>
          {prefix}
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>통계</Text>
          <Text style={styles.subtitle}>의뢰서 및 매출 통계</Text>
        </View>

        {/* 기간 선택 */}
        <View style={styles.periodContainer}>
          <PeriodButton label="최근 7일" value="week" />
          <PeriodButton label="최근 1개월" value="month" />
          <PeriodButton label="최근 1년" value="year" />
        </View>

        {/* 통계 카드들 */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="file-document"
            label="총 의뢰서"
            value={stats.totalOrders}
            color="#6366f1"
            suffix="건"
          />

          <StatCard
            icon="check-circle"
            label="완료된 의뢰서"
            value={stats.completedOrders}
            color="#10b981"
            suffix="건"
          />

          <StatCard
            icon="currency-krw"
            label="총 매출"
            value={stats.revenue}
            color="#f59e0b"
            suffix="원"
          />

          <StatCard
            icon="calculator"
            label="평균 단가"
            value={Math.round(stats.averagePrice)}
            color="#8b5cf6"
            suffix="원"
          />
        </View>

        {/* 완료율 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>완료율</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>
                {stats.totalOrders > 0
                  ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                  : 0}
                %
              </Text>
              <Text style={styles.progressSubtext}>
                {stats.completedOrders} / {stats.totalOrders} 건 완료
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${
                      stats.totalOrders > 0
                        ? (stats.completedOrders / stats.totalOrders) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 추가 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상세 분석</Text>
          <View style={styles.infoCard}>
            <Icon name="information-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              더 자세한 통계와 차트는 웹 버전에서 확인하실 수 있습니다.
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  periodContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366f1',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  periodTextActive: {
    color: '#fff',
  },
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressInfo: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  progressSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    lineHeight: 18,
  },
});
