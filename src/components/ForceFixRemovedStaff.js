import React, { useState } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AlertTriangle, Check } from 'lucide-react';

function ForceFixRemovedStaff() {
    const [fixing, setFixing] = useState(false);
    const [result, setResult] = useState('');
    const [userId, setUserId] = useState('');

    const fixUser = async () => {
        if (!userId.trim()) {
            alert('사용자 ID를 입력하세요');
            return;
        }

        setFixing(true);
        setResult('');

        try {
            console.log('🔧 사용자 강제 수정 시작:', userId);

            const userRef = doc(db, 'users', userId);
            
            // 모든 직원 관련 필드 완전 삭제
            await updateDoc(userRef, {
                // 기본 타입 변경
                userType: 'individual',
                memberType: 'individual',
                
                // 완전 삭제할 필드들
                businessType: deleteField(),
                companyId: deleteField(),
                companyBusinessType: deleteField(),
                businessName: deleteField(),
                role: deleteField(),
                status: deleteField(),
                approvedAt: deleteField(),
                requestedAt: deleteField(),
                pendingCompanyId: deleteField(),
                pendingCompanyName: deleteField(),
                pendingCompanyType: deleteField(),
                
                // 타임스탬프
                fixedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log('✅ 사용자 수정 완료!');
            setResult('✅ 성공! 해당 사용자가 개인 회원으로 변경되었습니다.');
            
        } catch (error) {
            console.error('❌ 수정 실패:', error);
            setResult('❌ 실패: ' + error.message);
        } finally {
            setFixing(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <AlertTriangle size={32} color="#f59e0b" />
                <h2 style={styles.title}>제거된 직원 강제 수정</h2>
            </div>

            <div style={styles.warning}>
                ⚠️ 이 도구는 직원 제거가 실패한 경우에만 사용하세요
            </div>

            <div style={styles.form}>
                <label style={styles.label}>
                    사용자 ID (UID):
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="q3qGpsxRrVh1trvnGZpmOGvMPG63"
                        style={styles.input}
                    />
                </label>

                <button
                    onClick={fixUser}
                    disabled={fixing}
                    style={styles.button}
                >
                    {fixing ? '수정 중...' : '🔧 강제 수정'}
                </button>
            </div>

            {result && (
                <div style={{
                    ...styles.result,
                    backgroundColor: result.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                    borderColor: result.startsWith('✅') ? '#bbf7d0' : '#fecaca',
                    color: result.startsWith('✅') ? '#166534' : '#991b1b'
                }}>
                    {result}
                </div>
            )}

            <div style={styles.instructions}>
                <h3 style={styles.instructionsTitle}>사용 방법:</h3>
                <ol style={styles.instructionsList}>
                    <li>Firebase Console → Firestore에서 제거된 직원의 UID 복사</li>
                    <li>위 입력란에 UID 붙여넣기</li>
                    <li>"강제 수정" 버튼 클릭</li>
                    <li>해당 직원 계정으로 재로그인</li>
                </ol>
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '600px',
        margin: '40px auto',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '2px solid #e2e8f0',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e2e8f0',
    },
    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    warning: {
        padding: '16px',
        backgroundColor: '#fffbeb',
        border: '2px solid #fbbf24',
        borderRadius: '12px',
        color: '#92400e',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '24px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
    },
    input: {
        padding: '12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'monospace',
    },
    button: {
        padding: '16px',
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    result: {
        padding: '16px',
        border: '2px solid',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '24px',
    },
    instructions: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    instructionsTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#0f172a',
    },
    instructionsList: {
        margin: 0,
        paddingLeft: '24px',
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.8',
    },
};

export default ForceFixRemovedStaff;