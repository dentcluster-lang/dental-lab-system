import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Mail, Lock, AlertCircle, LogIn, KeyRound } from 'lucide-react';
import ForgotPassword from './ForgotPassword';

function Login({ onLogin, onShowRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || !password) {
            setError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // onLogin이 전달된 경우 호출, 아니면 페이지 새로고침
            if (onLogin && typeof onLogin === 'function') {
                onLogin(userCredential.user);
            } else {
                window.location.reload();
            }
            
        } catch (error) {
            console.error('로그인 실패:', error);
            
            switch (error.code) {
                case 'auth/user-not-found':
                    setError('등록되지 않은 이메일입니다.');
                    break;
                case 'auth/wrong-password':
                    setError('비밀번호가 올바르지 않습니다.');
                    break;
                case 'auth/invalid-email':
                    setError('올바른 이메일 형식이 아닙니다.');
                    break;
                case 'auth/invalid-credential':
                    setError('이메일 또는 비밀번호가 올바르지 않습니다.');
                    break;
                case 'auth/too-many-requests':
                    setError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
                    break;
                default:
                    setError('로그인에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 비밀번호 찾기 화면 표시
    if (showForgotPassword) {
        return (
            <ForgotPassword 
                onBack={() => setShowForgotPassword(false)}
            />
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <div style={styles.header}>
                    <div style={styles.iconWrapper}>
                        <LogIn size={32} color="#3b82f6" />
                    </div>
                    <h1 style={styles.title}>로그인</h1>
                    <p style={styles.subtitle}>계정에 로그인하세요</p>
                </div>

                {error && (
                    <div style={styles.errorMessage}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            <Mail size={16} />
                            이메일
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            style={styles.input}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            <Lock size={16} />
                            비밀번호
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={styles.input}
                            disabled={loading}
                        />
                    </div>

                    <div style={styles.forgotPasswordLink}>
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            style={styles.linkButton}
                            onMouseEnter={(e) => e.currentTarget.style.color = styles.linkButtonHover.color}
                            onMouseLeave={(e) => e.currentTarget.style.color = styles.linkButton.color}
                        >
                            <KeyRound size={14} />
                            비밀번호를 잊으셨나요?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.submitButton,
                            ...(loading ? styles.submitButtonDisabled : {})
                        }}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = styles.submitButtonHover.backgroundColor)}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = styles.submitButton.backgroundColor)}
                    >
                        {loading ? (
                            <>
                                <div style={styles.spinner}></div>
                                로그인 중...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                로그인
                            </>
                        )}
                    </button>
                </form>

                <div style={styles.footer}>
                    <p style={styles.footerText}>
                        계정이 없으신가요?{' '}
                        <button 
                            onClick={onShowRegister}
                            style={styles.registerLink}
                            onMouseEnter={(e) => e.currentTarget.style.color = styles.registerLinkHover.color}
                            onMouseLeave={(e) => e.currentTarget.style.color = styles.registerLink.color}
                        >
                            회원가입
                        </button>
                    </p>
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
    },
    loginBox: {
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '48px 40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    iconWrapper: {
        width: '64px',
        height: '64px',
        margin: '0 auto 16px',
        borderRadius: '50%',
        backgroundColor: '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '15px',
        color: '#64748b',
    },
    errorMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: '500',
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
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        padding: '14px 16px',
        fontSize: '15px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        transition: 'all 0.2s',
        outline: 'none',
    },
    forgotPasswordLink: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '-8px',
    },
    linkButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        color: '#3b82f6',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'all 0.2s',
    },
    linkButtonHover: {
        color: '#2563eb',
    },
    submitButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginTop: '8px',
    },
    submitButtonHover: {
        backgroundColor: '#2563eb',
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
        cursor: 'not-allowed',
    },
    spinner: {
        width: '18px',
        height: '18px',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderTop: '3px solid white',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    footer: {
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
    },
    footerText: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    registerLink: {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#3b82f6',
        fontWeight: '600',
        textDecoration: 'none',
        cursor: 'pointer',
        padding: 0,
        fontSize: '14px',
        transition: 'all 0.2s',
    },
    registerLinkHover: {
        color: '#2563eb',
    },
};

// CSS animation
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
    } catch (e) {
        // 이미 존재하는 경우 무시
    }
}

export default Login;