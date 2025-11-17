import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Settings, Save, Power, AlertCircle, CheckCircle,
    ShoppingBag, GraduationCap, Briefcase, Building2
} from 'lucide-react';

function AdminPageToggle({ userInfo }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // 페이지 상태 데이터
    const [pageSettings, setPageSettings] = useState({
        marketplace: {
            name: '마켓플레이스',
            enabled: true,
            description: '치과재료 및 장비 판매 플랫폼',
            icon: 'ShoppingBag',
            color: '#6366f1'
        },
        seminars: {
            name: '세미나',
            enabled: true,
            description: '치과 관련 세미나 및 교육 정보',
            icon: 'GraduationCap',
            color: '#10b981'
        },
        jobBoard: {
            name: '구인공고',
            enabled: true,
            description: '치과 및 기공소 구인구직 정보',
            icon: 'Briefcase',
            color: '#f59e0b'
        },
        labDirectory: {
            name: '기공소찾기',
            enabled: true,
            description: '전국 치과기공소 검색 및 홍보',
            icon: 'Building2',
            color: '#ec4899'
        }
    });

    useEffect(() => {
        if (!userInfo || (!userInfo.isAdmin && userInfo.role !== 'admin')) {
            alert('관리자만 접근 가능합니다.');
            window.location.href = '/';
            return;
        }
        loadSettings();
    }, [userInfo]);

    // 설정 로드
    const loadSettings = async () => {
        try {
            setLoading(true);
            const settingsRef = doc(db, 'systemSettings', 'pageVisibility');
            const settingsDoc = await getDoc(settingsRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setPageSettings(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(key => {
                        if (data[key]) {
                            updated[key] = {
                                ...updated[key],
                                enabled: data[key].enabled !== undefined ? data[key].enabled : true
                            };
                        }
                    });
                    return updated;
                });
                console.log('✅ 페이지 상태 설정 로드 완료:', data);
            } else {
                console.log('⚠️ 페이지 상태 설정 없음 - 기본값(모두 활성화) 사용');
            }
        } catch (error) {
            console.error('❌ 설정 로드 실패:', error);
            showMessage('error', '설정을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 설정 저장
    const handleSave = async () => {
        if (!window.confirm('페이지 상태를 변경하시겠습니까?\n\n변경사항은 즉시 적용됩니다.')) {
            return;
        }

        try {
            setSaving(true);
            const settingsRef = doc(db, 'systemSettings', 'pageVisibility');

            // 저장할 데이터 준비
            const dataToSave = {};
            Object.keys(pageSettings).forEach(key => {
                dataToSave[key] = {
                    name: pageSettings[key].name,
                    enabled: pageSettings[key].enabled,
                    description: pageSettings[key].description
                };
            });

            await setDoc(settingsRef, {
                ...dataToSave,
                updatedBy: userInfo.uid,
                updatedByName: userInfo.name || userInfo.email,
                updatedAt: serverTimestamp()
            }, { merge: true });

            showMessage('success', '페이지 상태가 저장되었습니다!');
            console.log('✅ 페이지 상태 저장 완료');
        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
            showMessage('error', '설정 저장에 실패했습니다: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // 페이지 토글
    const handleToggle = (pageKey) => {
        setPageSettings(prev => ({
            ...prev,
            [pageKey]: {
                ...prev[pageKey],
                enabled: !prev[pageKey].enabled
            }
        }));
    };

    // 메시지 표시
    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    // 아이콘 컴포넌트 가져오기
    const getIcon = (iconName, color) => {
        const iconProps = { size: 28, color };
        switch (iconName) {
            case 'ShoppingBag': return <ShoppingBag {...iconProps} />;
            case 'GraduationCap': return <GraduationCap {...iconProps} />;
            case 'Briefcase': return <Briefcase {...iconProps} />;
            case 'Building2': return <Building2 {...iconProps} />;
            default: return <Power {...iconProps} />;
        }
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>설정을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Settings size={32} color="#6366f1" />
                    <div>
                        <h1 style={styles.title}>페이지 관리</h1>
                        <p style={styles.subtitle}>
                            각 페이지를 점검중 상태로 전환하거나 활성화할 수 있습니다
                        </p>
                    </div>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={handleSave}
                        style={styles.saveButton}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <div style={styles.smallSpinner}></div>
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                저장하기
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 메시지 */}
            {message.text && (
                <div style={{
                    ...styles.message,
                    ...(message.type === 'success' ? styles.messageSuccess : styles.messageError)
                }}>
                    {message.type === 'success' ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            {/* 안내 메시지 */}
            <div style={styles.infoBox}>
                <AlertCircle size={20} color="#6366f1" />
                <div>
                    <strong>페이지 점검 기능</strong>
                    <p>페이지를 점검중으로 설정하면 사용자에게 점검 안내 메시지가 표시되며, 해당 페이지의 기능이 일시적으로 제한됩니다.</p>
                </div>
            </div>

            {/* 페이지 토글 카드들 */}
            <div style={styles.cardsContainer}>
                {Object.keys(pageSettings).map(pageKey => {
                    const page = pageSettings[pageKey];
                    return (
                        <div key={pageKey} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={{
                                    ...styles.cardIcon,
                                    backgroundColor: `${page.color}15`
                                }}>
                                    {getIcon(page.icon, page.color)}
                                </div>
                                <div style={styles.cardContent}>
                                    <h3 style={styles.cardTitle}>{page.name}</h3>
                                    <p style={styles.cardDescription}>{page.description}</p>
                                </div>
                            </div>

                            <div style={styles.cardBody}>
                                <div style={styles.statusRow}>
                                    <div style={styles.statusInfo}>
                                        <span style={styles.statusLabel}>현재 상태:</span>
                                        <span style={{
                                            ...styles.statusBadge,
                                            ...(page.enabled ? styles.statusActive : styles.statusMaintenance)
                                        }}>
                                            {page.enabled ? '활성화' : '점검중'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleToggle(pageKey)}
                                        style={{
                                            ...styles.toggleButton,
                                            ...(page.enabled ? styles.toggleActive : styles.toggleInactive)
                                        }}
                                    >
                                        <div style={{
                                            ...styles.toggleSlider,
                                            ...(page.enabled ? styles.sliderActive : styles.sliderInactive)
                                        }}>
                                            <Power size={14} color="white" />
                                        </div>
                                    </button>
                                </div>

                                {!page.enabled && (
                                    <div style={styles.warningBox}>
                                        <AlertCircle size={16} color="#f59e0b" />
                                        <span>이 페이지는 현재 점검중 상태입니다. 사용자에게 점검 안내 메시지가 표시됩니다.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    smallSpinner: {
        width: '18px',
        height: '18px',
        border: '2px solid #ffffff50',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: '4px 0 0 0',
        fontSize: '14px',
        color: '#64748b',
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    message: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: '600',
    },
    messageSuccess: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: '2px solid #6ee7b7',
    },
    messageError: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        border: '2px solid #fca5a5',
    },
    infoBox: {
        display: 'flex',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#eff6ff',
        border: '2px solid #bfdbfe',
        borderRadius: '12px',
        marginBottom: '32px',
    },
    cardsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '2px solid #e2e8f0',
        transition: 'all 0.2s',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
    },
    cardIcon: {
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        flexShrink: 0,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        margin: '0 0 4px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    cardDescription: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
        lineHeight: '1.5',
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    statusRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    statusInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    statusLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
    },
    statusBadge: {
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '700',
    },
    statusActive: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
    },
    statusMaintenance: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
    },
    toggleButton: {
        position: 'relative',
        width: '60px',
        height: '32px',
        borderRadius: '16px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s',
        padding: 0,
    },
    toggleActive: {
        backgroundColor: '#10b981',
    },
    toggleInactive: {
        backgroundColor: '#e2e8f0',
    },
    toggleSlider: {
        position: 'absolute',
        top: '4px',
        width: '24px',
        height: '24px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    },
    sliderActive: {
        left: '32px',
        backgroundColor: '#059669',
    },
    sliderInactive: {
        left: '4px',
        backgroundColor: '#94a3b8',
    },
    warningBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#92400e',
    },
};

export default AdminPageToggle;
