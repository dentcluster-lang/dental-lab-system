import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import PrivacyPolicy from './PrivacyPolicy';

function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false); // 개인정보 동의
    const [showPrivacyModal, setShowPrivacyModal] = useState(false); // 개인정보보호방침 모달
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 개인정보 동의 확인
        if (!agreedToPrivacy) {
            setError('개인정보 처리방침에 동의해주세요.');
            return;
        }

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        if (!businessType) {
            setError('업체 유형을 선택해주세요.');
            return;
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 기본 사용자 데이터
            const userData = {
                email: email,
                businessName: businessName,
                businessType: businessType,
                role: businessType === 'advertiser' ? 'advertiser' : 'user',
                createdAt: new Date(),
            };

            // 재료 판매업체인 경우 판매자 정보 추가
            if (businessType === 'supplier') {
                userData.isSeller = true;
                userData.sellerInfo = {
                    status: 'pending', // 관리자 승인 대기
                    sellerType: 'material_supplier',
                    commission: 7, // 기본 수수료율 7%
                    createdAt: new Date().toISOString()
                };
            }

            await setDoc(doc(db, 'users', user.uid), userData);

            alert(businessType === 'supplier' 
                ? '회원가입이 완료되었습니다! 판매자 승인까지 1-2일 소요됩니다.' 
                : '회원가입이 완료되었습니다!');
            navigate('/login');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setError('이미 사용 중인 이메일입니다.');
            } else {
                setError('회원가입에 실패했습니다. 다시 시도해주세요.');
            }
            console.error('회원가입 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* 개인정보보호방침 모달 */}
            {showPrivacyModal && (
                <PrivacyPolicy onClose={() => setShowPrivacyModal(false)} />
            )}

            <div style={styles.card}>
                <h1 style={styles.title}>🦷 회원가입</h1>
                <p style={styles.subtitle}>DentConnect에 오신 것을 환영합니다</p>
                
                <form onSubmit={handleSubmit} style={styles.form}>
                    {error && <div style={styles.error}>{error}</div>}
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>업체명</label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            style={styles.input}
                            placeholder="업체명을 입력하세요"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>업체 유형</label>
                        <select
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            style={styles.select}
                            required
                        >
                            <option value="">선택하세요</option>
                            <option value="clinic">치과</option>
                            <option value="lab">치과기공소</option>
                            <option value="supplier">재료 판매업체 🛒</option>
                            <option value="advertiser">광고주 (광고 등록 업체)</option>
                        </select>
                        {businessType === 'supplier' && (
                            <div style={styles.infoBox}>
                                💡 재료 판매업체로 가입하시면 마켓플레이스에서 상품을 판매하실 수 있습니다.
                            </div>
                        )}
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            placeholder="example@email.com"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            placeholder="최소 6자 이상"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>비밀번호 확인</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={styles.input}
                            placeholder="비밀번호를 다시 입력하세요"
                            required
                        />
                    </div>

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

                    <button
                        type="submit"
                        disabled={loading}
                        style={styles.button}
                    >
                        {loading ? '가입 중...' : '회원가입'}
                    </button>
                </form>

                <p style={styles.loginText}>
                    이미 계정이 있으신가요?{' '}
                    <span
                        onClick={() => navigate('/login')}
                        style={styles.link}
                    >
                        로그인
                    </span>
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F7FAFC',
        padding: '20px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center',
    },
    subtitle: {
        margin: '0 0 32px 0',
        fontSize: '15px',
        color: '#718096',
        textAlign: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#2D3748',
    },
    input: {
        padding: '14px',
        border: '2px solid #E8EAF0',
        borderRadius: '10px',
        fontSize: '15px',
        transition: 'all 0.3s',
    },
    select: {
        padding: '14px',
        border: '2px solid #E8EAF0',
        borderRadius: '10px',
        fontSize: '15px',
        backgroundColor: 'white',
        transition: 'all 0.3s',
    },
    infoBox: {
        marginTop: '8px',
        padding: '12px',
        backgroundColor: '#EFF6FF',
        border: '2px solid #BFDBFE',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1E40AF',
        lineHeight: '1.5',
    },
    agreementBox: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #E8EAF0',
        borderRadius: '10px',
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
        color: '#2D3748',
        lineHeight: '1.6',
    },
    linkText: {
        background: 'none',
        border: 'none',
        color: '#667eea',
        fontWeight: '600',
        textDecoration: 'underline',
        cursor: 'pointer',
        padding: 0,
        fontSize: '14px',
    },
    required: {
        color: '#E53E3E',
        fontWeight: '600',
    },
    button: {
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        marginTop: '8px',
    },
    error: {
        padding: '12px',
        backgroundColor: '#FFE5E5',
        color: '#E53E3E',
        borderRadius: '8px',
        fontSize: '14px',
        textAlign: 'center',
    },
    loginText: {
        marginTop: '24px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#718096',
    },
    link: {
        color: '#667eea',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default SignUp;