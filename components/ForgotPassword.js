import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';

function ForgotPassword({ onBack }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setMessage({ type: 'error', text: '이메일을 입력해주세요.' });
            return;
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
            return;
        }

        try {
            setLoading(true);
            setMessage({ type: '', text: '' });

            await sendPasswordResetEmail(auth, email, {
                url: window.location.origin, // 비밀번호 재설정 후 돌아올 URL
                handleCodeInApp: false
            });

            setEmailSent(true);
            setMessage({
                type: 'success',
                text: '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.'
            });

        } catch (error) {
            console.error('비밀번호 재설정 오류:', error);

            switch (error.code) {
                case 'auth/user-not-found':
                    setMessage({ type: 'error', text: '등록되지 않은 이메일입니다.' });
                    break;
                case 'auth/invalid-email':
                    setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
                    break;
                case 'auth/too-many-requests':
                    setMessage({
                        type: 'error',
                        text: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
                    });
                    break;
                default:
                    setMessage({
                        type: 'error',
                        text: '비밀번호 재설정 이메일 발송에 실패했습니다.'
                    });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setEmailSent(false);
        setMessage({ type: '', text: '' });
        await handleSubmit({ preventDefault: () => { } });
    };

    return (
        <div style={styles.container}>
            <div style={styles.box}>
                <button
                    onClick={onBack}
                    style={styles.backButton}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.backButtonHover.backgroundColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <ArrowLeft size={20} />
                    로그인으로 돌아가기
                </button>

                <div style={styles.header}>
                    <div style={styles.iconWrapper}>
                        <KeyRound size={32} color="#3b82f6" />
                    </div>
                    <h1 style={styles.title}>비밀번호 찾기</h1>
                    <p style={styles.subtitle}>
                        가입하신 이메일 주소를 입력하시면<br />
                        비밀번호 재설정 링크를 보내드립니다.
                    </p>
                </div>

                {message.text && (
                    <div style={{
                        ...styles.message,
                        ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
                    }}>
                        {message.type === 'success' ? (
                            <CheckCircle size={18} />
                        ) : (
                            <AlertCircle size={18} />
                        )}
                        {message.text}
                    </div>
                )}

                {!emailSent ? (
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
                                    발송 중...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    재설정 링크 보내기
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div style={styles.successBox}>
                        <div style={styles.successIconWrapper}>
                            <CheckCircle size={48} color="#10b981" />
                        </div>
                        <h2 style={styles.successTitle}>이메일이 발송되었습니다!</h2>
                        <p style={styles.successText}>
                            <strong>{email}</strong>로<br />
                            비밀번호 재설정 링크를 보냈습니다.<br />
                            이메일을 확인하고 링크를 클릭하여<br />
                            새 비밀번호를 설정해주세요.
                        </p>

                        <div style={styles.infoBox}>
                            <p style={styles.infoText}>
                                📧 이메일이 오지 않았나요?<br />
                                스팸 폴더도 확인해보세요.
                            </p>
                        </div>

                        <button
                            onClick={handleResend}
                            style={styles.resendButton}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.resendButtonHover.backgroundColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = styles.resendButton.backgroundColor}
                        >
                            <Send size={16} />
                            이메일 다시 보내기
                        </button>
                    </div>
                )}

                <div style={styles.footer}>
                    <p style={styles.footerText}>
                        💡 비밀번호 재설정 링크는 1시간 동안 유효합니다.
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
    box: {
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '16px',
    },
    backButtonHover: {
        backgroundColor: '#f1f5f9',
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
        margin: '0 0 12px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    message: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: '500',
    },
    successMessage: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: '1px solid #10b981',
    },
    errorMessage: {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #ef4444',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
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
    successBox: {
        textAlign: 'center',
        padding: '20px 0',
    },
    successIconWrapper: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    successTitle: {
        margin: '0 0 16px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    successText: {
        margin: '0 0 24px 0',
        fontSize: '15px',
        color: '#64748b',
        lineHeight: '1.7',
    },
    infoBox: {
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
    },
    infoText: {
        margin: 0,
        fontSize: '14px',
        color: '#0369a1',
        lineHeight: '1.6',
    },
    resendButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    resendButtonHover: {
        backgroundColor: '#e2e8f0',
    },
    footer: {
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
    },
    footerText: {
        margin: 0,
        fontSize: '13px',
        color: '#94a3b8',
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

export default ForgotPassword;