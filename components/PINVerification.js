import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

function PINVerification({ user, onVerified, onCancel, menuName }) {
    const [pin, setPIN] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPIN, setShowPIN] = useState(false);

    const handleVerify = async () => {
        if (pin.length !== 6) {
            setError('6자리 PIN을 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                setError('사용자 정보를 찾을 수 없습니다.');
                return;
            }

            const userData = userDoc.data();

            // PIN이 설정되지 않은 경우
            if (!userData.securityPIN) {
                onVerified();
                return;
            }

            // PIN 확인
            if (userData.securityPIN === pin) {
                onVerified();
            } else {
                setError('PIN이 일치하지 않습니다.');
                setPIN('');
            }
        } catch (error) {
            console.error('PIN 확인 실패:', error);
            setError('PIN 확인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && pin.length === 6) {
            handleVerify();
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <button onClick={onCancel} style={styles.closeButton}>
                    <X size={20} />
                </button>

                <div style={styles.iconCircle}>
                    <Lock size={32} color="#6366f1" />
                </div>

                <h2 style={styles.title}>보안 확인</h2>
                <p style={styles.description}>
                    {menuName}에 접근하려면<br />
                    보안 PIN을 입력해주세요
                </p>

                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                <div style={styles.inputGroup}>
                    <div style={styles.inputWrapper}>
                        <input
                            type={showPIN ? 'text' : 'password'}
                            value={pin}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPIN(value);
                                setError('');
                            }}
                            onKeyPress={handleKeyPress}
                            style={styles.input}
                            placeholder="6자리 PIN"
                            maxLength="6"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setShowPIN(!showPIN)}
                            style={styles.eyeButton}
                        >
                            {showPIN ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <div style={styles.pinDots}>
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    ...styles.pinDot,
                                    ...(i < pin.length ? styles.pinDotFilled : {})
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={styles.buttonGroup}>
                    <button
                        onClick={onCancel}
                        style={styles.cancelButton}
                        disabled={loading}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={loading || pin.length !== 6}
                        style={{
                            ...styles.verifyButton,
                            ...(loading || pin.length !== 6 ? styles.buttonDisabled : {})
                        }}
                    >
                        {loading ? '확인 중...' : '확인'}
                    </button>
                </div>

                <p style={styles.helpText}>
                    PIN을 잊으셨나요? 설정에서 재설정할 수 있습니다.
                </p>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    closeButton: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
    },
    iconCircle: {
        width: '80px',
        height: '80px',
        margin: '0 auto 20px',
        borderRadius: '50%',
        backgroundColor: '#eef2ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        margin: '0 0 12px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
    },
    description: {
        margin: '0 0 32px 0',
        fontSize: '15px',
        color: '#64748b',
        textAlign: 'center',
        lineHeight: '1.6',
    },
    errorBox: {
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px',
        marginBottom: '24px',
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: '32px',
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '16px 50px 16px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '20px',
        letterSpacing: '8px',
        textAlign: 'center',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
    },
    eyeButton: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#94a3b8',
        padding: '4px',
    },
    pinDots: {
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '16px',
    },
    pinDot: {
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        backgroundColor: '#e2e8f0',
        transition: 'all 0.2s',
    },
    pinDotFilled: {
        backgroundColor: '#6366f1',
        transform: 'scale(1.3)',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
    },
    cancelButton: {
        flex: 1,
        padding: '14px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    verifyButton: {
        flex: 1,
        padding: '14px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    helpText: {
        marginTop: '20px',
        fontSize: '13px',
        color: '#94a3b8',
        textAlign: 'center',
    },
};

export default PINVerification;