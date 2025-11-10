import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);

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
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error('로그아웃 실패:', error);
            Alert.alert('오류', '로그아웃에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, onPress, showArrow = true, color = '#0f172a' }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color={color} />
        <Text style={[styles.menuItemText, { color }]}>{title}</Text>
      </View>
      {showArrow && <Icon name="chevron-right" size={24} color="#cbd5e1" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={80} color="#6366f1" />
          </View>
          <Text style={styles.userName}>{userData?.name || '사용자'}</Text>
          <Text style={styles.userEmail}>{userData?.email || ''}</Text>
          <View style={styles.businessTypeBadge}>
            <Text style={styles.businessTypeText}>
              {userData?.businessType === 'lab' ? '기공소' : '치과'}
            </Text>
          </View>
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>총 의뢰</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>진행 중</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>완료</Text>
          </View>
        </View>

        {/* 메뉴 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon="account-edit" title="프로필 수정" onPress={() => {}} />
            <MenuItem icon="lock-outline" title="비밀번호 변경" onPress={() => {}} />
            <MenuItem icon="bell-outline" title="알림 설정" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon="information-outline" title="버전 정보" showArrow={false} />
            <MenuItem icon="file-document-outline" title="이용약관" onPress={() => {}} />
            <MenuItem icon="shield-check-outline" title="개인정보처리방침" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="logout"
              title="로그아웃"
              onPress={handleLogout}
              showArrow={false}
              color="#ef4444"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Dental Lab Mobile v1.0.0</Text>
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
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  businessTypeBadge: {
    backgroundColor: '#eef2ff',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  businessTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 20,
    marginBottom: 8,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
