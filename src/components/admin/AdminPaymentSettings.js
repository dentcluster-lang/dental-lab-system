import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
    DollarSign, Save, Settings, Calendar, Percent,
    AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';

function AdminPaymentSettings({ userInfo }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // 결제 설정 데이터
    const [settings, setSettings] = useState({
        'lab-advertisement': {
            name: '기공소 홍보',
            price: 30000,
            duration: 30,
            description: '기공소 디렉토리에 홍보 등록'
        },
        'seminar': {
            name: '세미나 등록',
            price: 50000,
            duration: 60,
            description: '세미나 게시 및 홍보'
        },
        'job-posting': {
            name: '구인공고 등록',
            price: 20000,
            duration: 30,
            description: '구인구직 게시판에 공고 등록'
        },
        'advertisement': {
            name: '광고 등록',
            basic: { price: 50000, duration: 30, description: '베이직 광고' },
            standard: { price: 100000, duration: 30, description: '스탠다드 광고' },
            premium: { price: 200000, duration: 30, description: '프리미엄 광고' }
        },
        'new-product': {
            name: '신제품 등록',
            price: 30000,
            duration: 60,
            description: '신제품 소개 및 홍보'
        },
        'marketplace': {
            name: '마켓플레이스 수수료',
            commissionRate: 5, // 5%
            description: '상품 판매 시 매출의 일정 비율'
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
            const settingsRef = doc(db, 'systemSettings', 'paymentPrices');
            const settingsDoc = await getDoc(settingsRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setSettings(prev => ({
                    ...prev,
                    ...data.prices
                }));
                console.log('✅ 결제 설정 로드 완료:', data);
            } else {
                console.log('⚠️ 결제 설정 없음 - 기본값 사용');
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
        if (!window.confirm('결제 금액을 변경하시겠습니까?\n\n변경된 금액은 즉시 적용됩니다.')) {
            return;
        }

        try {
            setSaving(true);
            const settingsRef = doc(db, 'systemSettings', 'paymentPrices');

            await setDoc(settingsRef, {
                prices: settings,
                updatedBy: userInfo.uid,
                updatedByName: userInfo.name || userInfo.email,
                updatedAt: serverTimestamp()
            }, { merge: true });

            showMessage('success', '결제 설정이 저장되었습니다!');
            console.log('✅ 결제 설정 저장 완료');
        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
            showMessage('error', '설정 저장에 실패했습니다: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // 단일 서비스 금액 변경
    const handlePriceChange = (serviceType, value, tier = null) => {
        setSettings(prev => {
            const newSettings = { ...prev };
            
            if (serviceType === 'advertisement' && tier) {
                newSettings[serviceType][tier].price = parseInt(value) || 0;
            } else if (serviceType === 'marketplace') {
                newSettings[serviceType].commissionRate = parseFloat(value) || 0;
            } else {
                newSettings[serviceType].price = parseInt(value) || 0;
            }
            
            return newSettings;
        });
    };

    // 기간 변경
    const handleDurationChange = (serviceType, value, tier = null) => {
        setSettings(prev => {
            const newSettings = { ...prev };
            
            if (serviceType === 'advertisement' && tier) {
                newSettings[serviceType][tier].duration = parseInt(value) || 0;
            } else if (serviceType !== 'marketplace') {
                newSettings[serviceType].duration = parseInt(value) || 0;
            }
            
            return newSettings;
        });
    };

    // 메시지 표시
    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    // 기본값으로 초기화
    const handleReset = () => {
        if (!window.confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) return;
        
        setSettings({
            'lab-advertisement': {
                name: '기공소 홍보',
                price: 30000,
                duration: 30,
                description: '기공소 디렉토리에 홍보 등록'
            },
            'seminar': {
                name: '세미나 등록',
                price: 50000,
                duration: 60,
                description: '세미나 게시 및 홍보'
            },
            'job-posting': {
                name: '구인공고 등록',
                price: 20000,
                duration: 30,
                description: '구인구직 게시판에 공고 등록'
            },
            'advertisement': {
                name: '광고 등록',
                basic: { price: 50000, duration: 30, description: '베이직 광고' },
                standard: { price: 100000, duration: 30, description: '스탠다드 광고' },
                premium: { price: 200000, duration: 30, description: '프리미엄 광고' }
            },
            'new-product': {
                name: '신제품 등록',
                price: 30000,
                duration: 60,
                description: '신제품 소개 및 홍보'
            },
            'marketplace': {
                name: '마켓플레이스 수수료',
                commissionRate: 5,
                description: '상품 판매 시 매출의 일정 비율'
            }
        });
        
        showMessage('success', '기본값으로 초기화되었습니다.');
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
                        <h1 style={styles.title}>결제 금액 설정</h1>
                        <p style={styles.subtitle}>
                            서비스별 결제 금액과 게시 기간을 설정합니다
                        </p>
                    </div>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={handleReset}
                        style={styles.resetButton}
                        disabled={saving}
                    >
                        <RefreshCw size={18} />
                        기본값으로 초기화
                    </button>
                    <button
                        onClick={handleSave}
                        style={styles.saveButton}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <div style={styles.spinner}></div>
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

            {/* 설정 카드들 */}
            <div style={styles.cardsContainer}>
                {/* 기공소 홍보 */}
                <ServiceCard
                    icon={<DollarSign size={24} color="#6366f1" />}
                    service={settings['lab-advertisement']}
                    serviceType="lab-advertisement"
                    onPriceChange={handlePriceChange}
                    onDurationChange={handleDurationChange}
                />

                {/* 세미나 */}
                <ServiceCard
                    icon={<DollarSign size={24} color="#10b981" />}
                    service={settings['seminar']}
                    serviceType="seminar"
                    onPriceChange={handlePriceChange}
                    onDurationChange={handleDurationChange}
                />

                {/* 구인공고 */}
                <ServiceCard
                    icon={<DollarSign size={24} color="#f59e0b" />}
                    service={settings['job-posting']}
                    serviceType="job-posting"
                    onPriceChange={handlePriceChange}
                    onDurationChange={handleDurationChange}
                />

                {/* 광고 (티어별) */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.cardIcon}>
                            <DollarSign size={24} color="#8b5cf6" />
                        </div>
                        <div style={styles.cardTitle}>
                            <h3>{settings['advertisement'].name}</h3>
                            <p>티어별 광고 금액 설정</p>
                        </div>
                    </div>

                    <div style={styles.cardBody}>
                        {/* Basic */}
                        <div style={styles.tierSection}>
                            <div style={styles.tierBadge}>베이직</div>
                            <div style={styles.inputGroup}>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>금액</label>
                                    <input
                                        type="number"
                                        value={settings['advertisement'].basic.price}
                                        onChange={(e) => handlePriceChange('advertisement', e.target.value, 'basic')}
                                        style={styles.input}
                                        min="0"
                                        step="1000"
                                    />
                                    <span style={styles.inputSuffix}>원</span>
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>기간</label>
                                    <input
                                        type="number"
                                        value={settings['advertisement'].basic.duration}
                                        onChange={(e) => handleDurationChange('advertisement', e.target.value, 'basic')}
                                        style={styles.input}
                                        min="1"
                                    />
                                    <span style={styles.inputSuffix}>일</span>
                                </div>
                            </div>
                        </div>

                        {/* Standard */}
                        <div style={styles.tierSection}>
                            <div style={{ ...styles.tierBadge, backgroundColor: '#dbeafe', color: '#1e40af' }}>
                                스탠다드
                            </div>
                            <div style={styles.inputGroup}>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>금액</label>
                                    <input
                                        type="number"
                                        value={settings['advertisement'].standard.price}
                                        onChange={(e) => handlePriceChange('advertisement', e.target.value, 'standard')}
                                        style={styles.input}
                                        min="0"
                                        step="1000"
                                    />
                                    <span style={styles.inputSuffix}>원</span>
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>기간</label>
                                    <input
                                        type="number"
                                        value={settings['advertisement'].standard.duration}
                                        onChange={(e) => handleDurationChange('advertisement', e.target.value, 'standard')}
                                        style={styles.input}
                                        min="1"
                                    />
                                    <span style={styles.inputSuffix}>일</span>
                                </div>
                            </div>
                        </div>

                        {/* Premium */}
                        <div style={styles.tierSection}>
                            <div style={{ ...styles.tierBadge, backgroundColor: '#fef3c7', color: '#92400e' }}>
                                프리미엄
                            </div>
                            <div style={styles.inputGroup}>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>금액</label>
                                    <input
                                        type="number"
                                        value={settings['advertisement'].premium.price}
                                        onChange={(e) => handlePriceChange('advertisement', e.target.value, 'premium')}
                                        style={styles.input}
                                        min="0"
                                        step="1000"
                                    />
                                    <span style={styles.inputSuffix}>원</span>
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>기간</label>
                                    <input
                                        type="number"
                                        value={settings['advertisement'].premium.duration}
                                        onChange={(e) => handleDurationChange('advertisement', e.target.value, 'premium')}
                                        style={styles.input}
                                        min="1"
                                    />
                                    <span style={styles.inputSuffix}>일</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 신제품 */}
                <ServiceCard
                    icon={<DollarSign size={24} color="#ec4899" />}
                    service={settings['new-product']}
                    serviceType="new-product"
                    onPriceChange={handlePriceChange}
                    onDurationChange={handleDurationChange}
                />

                {/* 마켓플레이스 수수료 */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.cardIcon}>
                            <Percent size={24} color="#14b8a6" />
                        </div>
                        <div style={styles.cardTitle}>
                            <h3>{settings['marketplace'].name}</h3>
                            <p>{settings['marketplace'].description}</p>
                        </div>
                    </div>

                    <div style={styles.cardBody}>
                        <div style={styles.commissionSection}>
                            <div style={styles.inputWrapper}>
                                <label style={styles.label}>판매 수수료율</label>
                                <input
                                    type="number"
                                    value={settings['marketplace'].commissionRate}
                                    onChange={(e) => handlePriceChange('marketplace', e.target.value)}
                                    style={styles.input}
                                    min="0"
                                    max="100"
                                    step="0.5"
                                />
                                <span style={styles.inputSuffix}>%</span>
                            </div>
                            <div style={styles.commissionExample}>
                                <AlertCircle size={16} />
                                <span>
                                    예시: 상품이 100,000원에 판매되면 {settings['marketplace'].commissionRate}%인{' '}
                                    {(100000 * settings['marketplace'].commissionRate / 100).toLocaleString()}원이 수수료로 부과됩니다.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
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

// 서비스 카드 컴포넌트
function ServiceCard({ icon, service, serviceType, onPriceChange, onDurationChange }) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                    {icon}
                </div>
                <div style={styles.cardTitle}>
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                </div>
            </div>

            <div style={styles.cardBody}>
                <div style={styles.inputGroup}>
                    <div style={styles.inputWrapper}>
                        <label style={styles.label}>등록 금액</label>
                        <input
                            type="number"
                            value={service.price}
                            onChange={(e) => onPriceChange(serviceType, e.target.value)}
                            style={styles.input}
                            min="0"
                            step="1000"
                        />
                        <span style={styles.inputSuffix}>원</span>
                    </div>

                    <div style={styles.inputWrapper}>
                        <label style={styles.label}>게시 기간</label>
                        <input
                            type="number"
                            value={service.duration}
                            onChange={(e) => onDurationChange(serviceType, e.target.value)}
                            style={styles.input}
                            min="1"
                        />
                        <span style={styles.inputSuffix}>일</span>
                    </div>
                </div>
            </div>
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
    resetButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
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
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '20px',
    },
    cardIcon: {
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    cardTitle: {
        flex: 1,
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    inputGroup: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    input: {
        padding: '12px 50px 12px 16px',
        fontSize: '16px',
        fontWeight: '600',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    inputSuffix: {
        position: 'absolute',
        right: '16px',
        bottom: '14px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#94a3b8',
    },
    tierSection: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    tierBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        fontSize: '12px',
        fontWeight: '700',
        borderRadius: '6px',
        marginBottom: '12px',
    },
    commissionSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    commissionExample: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1e40af',
    },
};

export default AdminPaymentSettings;