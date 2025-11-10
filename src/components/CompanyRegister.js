import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Building, Stethoscope, Microscope, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

function CompanyRegister({ user }) {
    const [step, setStep] = useState(1);
    const [businessType, setBusinessType] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // 업체 타입 선택
    const handleTypeSelect = (type) => {
        setBusinessType(type);
        setStep(2);
    };

    // 등록 처리
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!businessName || !businessNumber || !phone || !address) {
            setError('모든 필수 정보를 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Firebase에 업체 정보 업데이트
            await updateDoc(doc(db, 'users', user.uid), {
                userType: businessType === 'dental' ? 'dental' : 'lab',
                businessType: businessType,
                businessName: businessName.trim(),
                businessNumber: businessNumber.trim(),
                phone: phone.trim(),
                address: address.trim(),
                registeredAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            alert('🎉 업체 등록이 완료되었습니다!');

            // App.js의 refreshUserData 호출 후 대시보드로 이동
            if (window.refreshUserData) {
                await window.refreshUserData();
            }
            navigate('/dashboard');

        } catch (error) {
            console.error('업체 등록 실패:', error);
            setError('업체 등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <Building size={32} />
                    업체 등록
                </h1>
                <p style={styles.subtitle}>
                    DentConnect에서 비즈니스를 시작하세요
                </p>
            </div>

            {/* Step 1: 업체 타입 선택 */}
            {step === 1 && (
                <div style={styles.typeSelection}>
                    <h2 style={styles.stepTitle}>업체 타입을 선택하세요</h2>

                    <div style={styles.typeCards}>
                        <div
                            style={styles.typeCard}
                            onClick={() => handleTypeSelect('dental')}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={styles.typeIcon}>
                                <Stethoscope size={48} color="#3b82f6" />
                            </div>
                            <h3 style={styles.typeCardTitle}>치과</h3>
                            <p style={styles.typeCardDesc}>
                                치과 의원 또는 치과 병원
                            </p>
                            <ul style={styles.featureList}>
                                <li>✓ 기공소에 주문 발송</li>
                                <li>✓ 네이버 리뷰 관리</li>
                                <li>✓ 환자 일정 관리</li>
                            </ul>
                            <button style={styles.selectButton}>
                                선택하기
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div
                            style={styles.typeCard}
                            onClick={() => handleTypeSelect('lab')}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={styles.typeIcon}>
                                <Microscope size={48} color="#10b981" />
                            </div>
                            <h3 style={styles.typeCardTitle}>기공소</h3>
                            <p style={styles.typeCardDesc}>
                                치과 기공소
                            </p>
                            <ul style={styles.featureList}>
                                <li>✓ 치과 주문 접수</li>
                                <li>✓ 기공소 광고 등록</li>
                                <li>✓ 작업 일정 관리</li>
                            </ul>
                            <button style={styles.selectButton}>
                                선택하기
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: 상세 정보 입력 */}
            {step === 2 && (
                <div style={styles.formContainer}>
                    <div style={styles.selectedType}>
                        {businessType === 'dental' ? (
                            <>
                                <Stethoscope size={24} color="#3b82f6" />
                                <span>치과로 등록</span>
                            </>
                        ) : (
                            <>
                                <Microscope size={24} color="#10b981" />
                                <span>기공소로 등록</span>
                            </>
                        )}
                        <button
                            onClick={() => {
                                setStep(1);
                                setBusinessType('');
                            }}
                            style={styles.changeButton}
                        >
                            변경
                        </button>
                    </div>

                    {error && (
                        <div style={styles.errorBox}>
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                업체명 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder={businessType === 'dental' ? '예: 행복한치과의원' : '예: 우수치과기공소'}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                사업자등록번호 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={businessNumber}
                                onChange={(e) => setBusinessNumber(e.target.value)}
                                placeholder="123-45-67890"
                                style={styles.input}
                                maxLength="12"
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                대표 전화번호 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="02-1234-5678"
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                주소 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="서울시 강남구 테헤란로 123"
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.buttonGroup}>
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setBusinessType('');
                                    setBusinessName('');
                                    setBusinessNumber('');
                                    setPhone('');
                                    setAddress('');
                                }}
                                style={styles.cancelButton}
                                disabled={loading}
                            >
                                이전으로
                            </button>
                            <button
                                type="submit"
                                style={styles.submitButton}
                                disabled={loading}
                            >
                                {loading ? '등록 중...' : '업체 등록 완료'}
                            </button>
                        </div>
                    </form>

                    <div style={styles.infoBox}>
                        <p style={styles.infoText}>
                            <strong>📌 안내사항</strong><br />
                            • 업체 등록 후 직원을 초대할 수 있습니다.<br />
                            • 등록 정보는 프로필에서 수정 가능합니다.<br />
                            • 허위 정보 입력 시 서비스 이용이 제한될 수 있습니다.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '48px',
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '0 0 12px 0',
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '16px',
        color: '#64748b',
    },
    stepTitle: {
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '32px',
    },
    typeSelection: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #e2e8f0',
    },
    typeCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
    },
    typeCard: {
        padding: '32px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.3s',
        textAlign: 'center',
    },
    typeIcon: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    typeCardTitle: {
        margin: '0 0 8px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    typeCardDesc: {
        margin: '0 0 24px 0',
        fontSize: '14px',
        color: '#64748b',
    },
    featureList: {
        listStyle: 'none',
        padding: 0,
        margin: '0 0 24px 0',
        textAlign: 'left',
    },
    selectButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px 24px',
        backgroundColor: '#f8fafc',
        color: '#475569',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    formContainer: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #e2e8f0',
    },
    selectedType: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#0369a1',
    },
    changeButton: {
        marginLeft: 'auto',
        padding: '6px 12px',
        backgroundColor: '#ffffff',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px',
        marginBottom: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
    },
    required: {
        color: '#ef4444',
    },
    input: {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '15px',
        transition: 'all 0.2s',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        marginTop: '12px',
    },
    cancelButton: {
        flex: 1,
        padding: '14px 24px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitButton: {
        flex: 2,
        padding: '14px 24px',
        backgroundColor: '#6366f1',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    infoBox: {
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    infoText: {
        margin: 0,
        fontSize: '13px',
        color: '#475569',
        lineHeight: '1.6',
    },
};

export default CompanyRegister;