import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function CreateOrderScreen({ navigation }) {
  const [formData, setFormData] = useState({
    patientName: '',
    toothNumber: '',
    prosthesis: '',
    material: '',
    shade: '',
    deadline: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const updateFormData = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  // 보철물 옵션
  const prosthesisOptions = [
    'Crown',
    'Bridge',
    'Inlay',
    'Onlay',
    'Denture',
    'Implant',
  ];

  // 재료 옵션
  const materialOptions = [
    'PFM',
    'Full Gold',
    'Zirconia',
    'E-max',
    'Metal',
    'Resin',
  ];

  const handleSubmit = async () => {
    // 필수 항목 검증
    if (!formData.patientName || !formData.toothNumber || !formData.prosthesis) {
      Alert.alert('알림', '필수 항목을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Firestore에 의뢰서 저장
      await addDoc(collection(db, 'orders'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('완료', '의뢰서가 작성되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('의뢰서 작성 실패:', error);
      Alert.alert('오류', '의뢰서 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const OptionButton = ({ label, value, selectedValue, onSelect }) => (
    <TouchableOpacity
      style={[styles.optionButton, selectedValue === value && styles.optionButtonActive]}
      onPress={() => onSelect(value)}
    >
      <Text
        style={[styles.optionText, selectedValue === value && styles.optionTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 환자 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>환자 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>환자명 *</Text>
              <TextInput
                style={styles.input}
                placeholder="환자명을 입력하세요"
                value={formData.patientName}
                onChangeText={(value) => updateFormData('patientName', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>치아 번호 *</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 11, 12, 13 (쉼표로 구분)"
                value={formData.toothNumber}
                onChangeText={(value) => updateFormData('toothNumber', value)}
              />
            </View>
          </View>

          {/* 보철물 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>보철물 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>보철물 종류 *</Text>
              <View style={styles.optionsGrid}>
                {prosthesisOptions.map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    value={option}
                    selectedValue={formData.prosthesis}
                    onSelect={(value) => updateFormData('prosthesis', value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>재료</Text>
              <View style={styles.optionsGrid}>
                {materialOptions.map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    value={option}
                    selectedValue={formData.material}
                    onSelect={(value) => updateFormData('material', value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shade</Text>
              <TextInput
                style={styles.input}
                placeholder="예: A2, B3"
                value={formData.shade}
                onChangeText={(value) => updateFormData('shade', value)}
              />
            </View>
          </View>

          {/* 추가 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>추가 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>마감 기한</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 2024-12-31"
                value={formData.deadline}
                onChangeText={(value) => updateFormData('deadline', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>특이사항</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="특이사항을 입력하세요"
                value={formData.notes}
                onChangeText={(value) => updateFormData('notes', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 제출 버튼 */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>의뢰서 제출</Text>
              </>
            )}
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  optionTextActive: {
    color: '#6366f1',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
