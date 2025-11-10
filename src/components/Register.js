import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, Building2, Stethoscope, Microscope, Store, ArrowLeft } from 'lucide-react';
import './Register.css';
import PrivacyPolicy from './PrivacyPolicy';

function Register({ onRegister, onShowLogin, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: 유형 선택, 2: 정보 입력
    const [userType, setUserType] = useState(''); // 'individual', 'dental', 'lab', 'seller'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false); // 개인정보 동의
    const [showPrivacyModal, setShowPrivacyModal] = useState(false); // 개인정보보호방침 모달

    // 폼 데이터
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: '',
        businessName: '',
        businessNumber: '',
        address: ''
    });

    // Step 1: 회원 유형 선택
    const handleUserTypeSelect = (type) => {
        setUserType(type);
        setStep(2);
    };

    // 입력 값 변경
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // 회원가입 처리
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 개인정보 동의 확인
        if (!agreedToPrivacy) {
            setError('개인정보 처리방침에 동의해주세요.');
            return;
        }

        // 유효성 검사
        if (formData.password !== formData.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (formData.password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        if ((userType === 'dental' || userType === 'lab' || userType === 'seller') && !formData.businessName) {
            setError('업체명을 입력해주세요.');
            return;
        }

        setLoading(true);

        try {
            // 1. Firebase 인증으로 사용자 생성
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const user = userCredential.user;

            // 2. Firestore에 사용자 정보 저장
            const userData = {
                email: formData.email,
                name: formData.name,
                phone: formData.phone,
                userType: userType, // 'individual', 'dental', 'lab', 'seller'
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 판매자 회원인 경우 승인 대기 상태로 설정
            if (userType === 'seller') {
                userData.businessName = formData.businessName;
                userData.businessNumber = formData.businessNumber || '';
                userData.address = formData.address || '';
                userData.businessType = 'seller';
                userData.role = 'owner';
                userData.sellerStatus = 'pending'; // 승인 대기
                userData.isSellerApproved = false;
                userData.sellerAppliedAt = new Date().toISOString();
            }
            // 업체 회원(치과/기공소)인 경우 추가 정보
            else if (userType === 'dental' || userType === 'lab') {
                userData.businessName = formData.businessName;
                userData.businessNumber = formData.businessNumber || '';
                userData.address = formData.address || '';
                userData.businessType = userType; // 'dental' or 'lab'
                userData.role = 'owner'; // 오너
                userData.staff = []; // 직원 목록
            }

            await setDoc(doc(db, 'users', user.uid), userData);

            // 3. 회원가입 성공
            if (onRegister) onRegister(user);
            if (onSuccess) onSuccess();
            
            if (userType === 'seller') {
                alert('판매자 회원 가입이 완료되었습니다!\n관리자 승인 후 이용하실 수 있습니다.');
            } else {
                alert('회원가입이 완료되었습니다!');
            }

        } catch (error) {
            console.error('회원가입 오류:', error);

            let errorMessage = '회원가입에 실패했습니다.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = '이미 사용 중인 이메일입니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '유효하지 않은 이메일 형식입니다.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = '비밀번호가 너무 약합니다. (최소 6자)';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 뒤로 가기
    const handleBack = () => {
        if (step === 2) {
            setUserType('');
            setStep(1);
        }
    };

    return (
        <div style={styles.container}>
            {/* 개인정보보호방침 모달 */}
            {showPrivacyModal && (
                <PrivacyPolicy onClose={() => setShowPrivacyModal(false)} />
            )}

            <div className="register-box" style={styles.box}>
                {/* 헤더 */}
                <div style={styles.header}>
                    {step === 2 && (
                        <button
                            onClick={handleBack}
                            style={styles.backButton}
                            type="button"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <Building2 size={40} style={{ color: '#6366f1' }} />
                    <h1 style={styles.title}>회원가입</h1>
                    <p style={styles.subtitle}>
                        {step === 1 && '회원 유형을 선택해주세요'}
                        {step === 2 && '정보를 입력해주세요'}
                    </p>
                </div>

                {/* Step 1: 회원 유형 선택 */}
                {step === 1 && (
                    <div className="type-selection" style={styles.typeSelection}>
                        <div
                            className="type-card"
                            style={styles.typeCard}
                            onClick={() => handleUserTypeSelect('individual')}
                        >
                            <User size={32} style={{ color: '#6366f1' }} />
                            <h3 style={styles.typeTitle}>개인 회원</h3>
                            <p style={styles.typeDesc}>
                                업체에 소속되지 않은<br />
                                개인으로 가입합니다
                            </p>
                            <div style={styles.typeBadge}>
                                나중에 업체 등록 가능
                            </div>
                        </div>

                        <div
                            className="type-card"
                            style={styles.typeCard}
                            onClick={() => handleUserTypeSelect('dental')}
                        >
                            <Stethoscope size={32} style={{ color: '#10b981' }} />
                            <h3 style={styles.typeTitle}>치과</h3>
                            <p style={styles.typeDesc}>
                                치과 의원을<br />
                                운영하는 업체로 가입합니다
                            </p>
                            <div style={{ ...styles.typeBadge, backgroundColor: '#d1fae5', color: '#065f46' }}>
                                직원 관리 기능 포함
                            </div>
                        </div>

                        <div
                            className="type-card"
                            style={styles.typeCard}
                            onClick={() => handleUserTypeSelect('lab')}
                        >
                            <Microscope size={32} style={{ color: '#f59e0b' }} />
                            <h3 style={styles.typeTitle}>기공소</h3>
                            <p style={styles.typeDesc}>
                                치과 기공소를<br />
                                운영하는 업체로 가입합니다
                            </p>
                            <div style={{ ...styles.typeBadge, backgroundColor: '#fef3c7', color: '#92400e' }}>
                                프로필 광고 기능 포함
                            </div>
                        </div>

                        <div
                            className="type-card"
                            style={styles.typeCard}
                            onClick={() => handleUserTypeSelect('seller')}
                        >
                            <Store size={32} style={{ color: '#8b5cf6' }} />
                            <h3 style={styles.typeTitle}>판매자</h3>
                            <p style={styles.typeDesc}>
                                치과용품/장비를<br />
                                판매하는 업체로 가입합니다
                            </p>
                            <div style={{ ...styles.typeBadge, backgroundColor: '#ede9fe', color: '#5b21b6' }}>
                                관리자 승인 필요
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: 정보 입력 */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} style={styles.form}>
                        {/* 에러 메시지 */}
                        {error && (
                            <div style={styles.error}>
                                {error}
                            </div>
                        )}

                        {/* 기본 정보 */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>
                                기본 정보
                                {userType === 'individual' && (
                                    <span style={styles.businessTypeLabel}>개인</span>
                                )}
                                {userType === 'dental' && (
                                    <span style={{ ...styles.businessTypeLabel, backgroundColor: '#d1fae5', color: '#065f46' }}>치과</span>
                                )}
                                {userType === 'lab' && (
                                    <span style={{ ...styles.businessTypeLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>기공소</span>
                                )}
                                {userType === 'seller' && (
                                    <span style={{ ...styles.businessTypeLabel, backgroundColor: '#ede9fe', color: '#5b21b6' }}>판매자</span>
                                )}
                            </h3>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>이메일 *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="example@email.com"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>비밀번호 *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="최소 6자 이상"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>비밀번호 확인 *</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="비밀번호 재입력"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>이름 *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="홍길동"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>전화번호 *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="010-1234-5678"
                                    style={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        {/* 업체 정보 (업체 회원만) */}
                        {(userType === 'dental' || userType === 'lab' || userType === 'seller') && (
                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}>업체 정보</h3>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>업체명 *</label>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                        placeholder={
                                            userType === 'dental' ? '○○치과' :
                                            userType === 'lab' ? '○○기공소' :
                                            '○○메디컬 / ○○덴탈'
                                        }
                                        style={styles.input}
                                        required
                                    />
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>사업자등록번호</label>
                                    <input
                                        type="text"
                                        name="businessNumber"
                                        value={formData.businessNumber}
                                        onChange={handleChange}
                                        placeholder="000-00-00000"
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>주소</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="서울시 강남구..."
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 개인정보 처리방침 동의 */}
                        <div style={styles.agreementBox}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={agreedToPrivacy}
                                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                                    style={styles.checkbox}
                                />
                                <span style={styles.checkboxText}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivacyModal(true)}
                                        style={styles.linkText}
                                    >
                                        개인정보 처리방침
                                    </button>
                                    에 동의합니다 <span style={styles.required}>(필수)</span>
                                </span>
                            </label>
                        </div>

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            style={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div style={styles.spinner}></div>
                                    <span>처리 중...</span>
                                </>
                            ) : (
                                '가입하기'
                            )}
                        </button>
                    </form>
                )}

                {/* 로그인 링크 */}
                <div style={styles.footer}>
                    이미 계정이 있으신가요?{' '}
                    <button
                        onClick={onShowLogin}
                        style={styles.linkButton}
                        type="button"
                    >
                        로그인
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '20px',
    },
    box: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
    },
    title: {
        margin: '16px 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    typeSelection: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px',
        marginBottom: '24px',
    },
    typeCard: {
        padding: '24px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    typeTitle: {
        margin: '12px 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
    },
    typeDesc: {
        margin: '0 0 12px 0',
        fontSize: '13px',
        color: '#64748b',
        lineHeight: '1.5',
    },
    typeBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#e0e7ff',
        color: '#3730a3',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    businessTypeLabel: {
        padding: '4px 12px',
        backgroundColor: '#e0e7ff',
        color: '#4338ca',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        transition: 'all 0.2s',
    },
    error: {
        padding: '12px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px',
        textAlign: 'center',
    },
    agreementBox: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
        marginTop: '2px',
        flexShrink: 0,
    },
    checkboxText: {
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.6',
    },
    linkText: {
        background: 'none',
        border: 'none',
        color: '#6366f1',
        fontWeight: '600',
        textDecoration: 'underline',
        cursor: 'pointer',
        padding: 0,
        fontSize: '14px',
    },
    required: {
        color: '#dc2626',
        fontWeight: '600',
    },
    submitButton: {
        padding: '14px',
        backgroundColor: '#6366f1',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    footer: {
        marginTop: '24px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#64748b',
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: '#6366f1',
        cursor: 'pointer',
        fontWeight: '600',
        textDecoration: 'underline',
    },
};

export default Register;