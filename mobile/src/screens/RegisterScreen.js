import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    businessType: 'lab', // 'lab' 또는 'clinic'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateFormData = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleRegister = async () => {
    // 유효성 검사
    if (!formData.email || !formData.password || !formData.name) {
      Alert.alert('알림', '필수 항목을 모두 입력해주세요.');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      // Firebase Auth 회원가입
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email,
        name: formData.name,
        phone: formData.phone || '',
        businessType: formData.businessType,
        userType: 'business',
        isAdmin: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('가입 완료', '회원가입이 완료되었습니다!', [
        { text: '확인', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      console.error('회원가입 실패:', error);
      let errorMessage = '회원가입에 실패했습니다.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }

      Alert.alert('회원가입 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* 헤더 */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-left" size={24} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.title}>회원가입</Text>
              <Text style={styles.subtitle}>Dental Lab 계정을 만들어보세요</Text>
            </View>

            {/* 회원가입 폼 */}
            <View style={styles.form}>
              {/* 이름 */}
              <View style={styles.inputContainer}>
                <Icon name="account-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="이름 *"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                />
              </View>

              {/* 이메일 */}
              <View style={styles.inputContainer}>
                <Icon name="email-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="이메일 *"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* 전화번호 */}
              <View style={styles.inputContainer}>
                <Icon name="phone-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="전화번호"
                  value={formData.phone}
                  onChangeText={(value) => updateFormData('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* 업체 유형 */}
              <View style={styles.businessTypeContainer}>
                <Text style={styles.label}>업체 유형 *</Text>
                <View style={styles.businessTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.businessTypeButton,
                      formData.businessType === 'lab' && styles.businessTypeButtonActive,
                    ]}
                    onPress={() => updateFormData('businessType', 'lab')}
                  >
                    <Icon
                      name="factory"
                      size={24}
                      color={formData.businessType === 'lab' ? '#6366f1' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.businessTypeText,
                        formData.businessType === 'lab' && styles.businessTypeTextActive,
                      ]}
                    >
                      기공소
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.businessTypeButton,
                      formData.businessType === 'clinic' && styles.businessTypeButtonActive,
                    ]}
                    onPress={() => updateFormData('businessType', 'clinic')}
                  >
                    <Icon
                      name="hospital-building"
                      size={24}
                      color={formData.businessType === 'clinic' ? '#6366f1' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.businessTypeText,
                        formData.businessType === 'clinic' && styles.businessTypeTextActive,
                      ]}
                    >
                      치과
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 비밀번호 */}
              <View style={styles.inputContainer}>
                <Icon name="lock-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 (6자 이상) *"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              {/* 비밀번호 확인 */}
              <View style={styles.inputContainer}>
                <Icon name="lock-check-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 확인 *"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>

              {/* 회원가입 버튼 */}
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>가입하기</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 로그인 링크 */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>로그인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeIcon: {
    padding: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  businessTypeContainer: {
    marginBottom: 16,
  },
  businessTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  businessTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  businessTypeButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  businessTypeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  businessTypeTextActive: {
    color: '#6366f1',
  },
  registerButton: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  loginLink: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
});
