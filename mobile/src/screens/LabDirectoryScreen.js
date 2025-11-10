import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function LabDirectoryScreen() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLabs();
  }, []);

  const loadLabs = () => {
    setLoading(true);

    const q = query(
      collection(db, 'labAdvertisements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const labsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLabs(labsData);
        setLoading(false);
      },
      (error) => {
        console.error('기공소 로드 실패:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const filteredLabs = labs.filter(
    (lab) =>
      lab.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderLab = ({ item }) => (
    <View style={styles.labCard}>
      <View style={styles.labHeader}>
        <View style={styles.labIcon}>
          <Icon name="factory" size={28} color="#6366f1" />
        </View>
        <View style={styles.labHeaderInfo}>
          <Text style={styles.labName}>{item.name}</Text>
          {item.specialty && (
            <Text style={styles.specialty}>{item.specialty}</Text>
          )}
        </View>
      </View>

      <View style={styles.labBody}>
        {item.address && (
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={16} color="#64748b" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>
        )}

        {item.phone && (
          <View style={styles.infoRow}>
            <Icon name="phone" size={16} color="#64748b" />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
        )}

        {item.email && (
          <View style={styles.infoRow}>
            <Icon name="email" size={16} color="#64748b" />
            <Text style={styles.infoText}>{item.email}</Text>
          </View>
        )}

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>

      <View style={styles.labFooter}>
        {item.phone && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.phone)}
          >
            <Icon name="phone" size={18} color="#fff" />
            <Text style={styles.callButtonText}>전화하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 바 */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="기공소 검색..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 기공소 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : filteredLabs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="factory" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>등록된 기공소가 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLabs}
          renderItem={renderLab}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  labCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  labHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  labIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  labHeaderInfo: {
    flex: 1,
  },
  labName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  labBody: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 4,
  },
  labFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  },
});
