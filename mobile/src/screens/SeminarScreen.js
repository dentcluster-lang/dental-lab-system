import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function SeminarScreen({ navigation }) {
  const [seminars, setSeminars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past'

  useEffect(() => {
    loadSeminars();
  }, [filter]);

  const loadSeminars = () => {
    setLoading(true);

    const now = new Date();
    let q;

    if (filter === 'upcoming') {
      q = query(
        collection(db, 'seminars'),
        where('status', '==', 'active'),
        where('date', '>=', now),
        orderBy('date', 'asc')
      );
    } else {
      q = query(
        collection(db, 'seminars'),
        where('status', '==', 'active'),
        where('date', '<', now),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const seminarsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSeminars(seminarsData);
        setLoading(false);
      },
      (error) => {
        console.error('세미나 로드 실패:', error);
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
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  };

  const renderSeminar = ({ item }) => (
    <TouchableOpacity
      style={styles.seminarCard}
      onPress={() => navigation.navigate('SeminarDetail', { seminarId: item.id })}
    >
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="school" size={48} color="#cbd5e1" />
          </View>
        )}
      </View>

      <View style={styles.seminarInfo}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category || '일반'}</Text>
        </View>

        <Text style={styles.seminarTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color="#64748b" />
            <Text style={styles.detailText}>{formatDate(item.date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.location || '장소 미정'}
            </Text>
          </View>

          {item.speaker && (
            <View style={styles.detailRow}>
              <Icon name="account" size={16} color="#64748b" />
              <Text style={styles.detailText}>{item.speaker}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {item.price === 0 ? '무료' : `${item.price?.toLocaleString()}원`}
            </Text>
          </View>
          <View style={styles.participantsContainer}>
            <Icon name="account-group" size={14} color="#64748b" />
            <Text style={styles.participantsText}>
              {item.participantCount || 0} / {item.maxParticipants || '∞'}
            </Text>
          </View>
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
        <FilterButton label="예정된 세미나" value="upcoming" />
        <FilterButton label="지난 세미나" value="past" />
      </View>

      {/* 세미나 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : seminars.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="school-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>
            {filter === 'upcoming' ? '예정된 세미나가 없습니다' : '지난 세미나가 없습니다'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={seminars}
          renderItem={renderSeminar}
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
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
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
  seminarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#f8fafc',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seminarInfo: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  seminarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  participantsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
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
    textAlign: 'center',
  },
});
