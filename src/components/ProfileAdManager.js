import React, { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    updateDoc,
    doc as firestoreDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    TrendingUp,
    Eye,
    Users,
    CreditCard,
    CheckCircle,
    AlertCircle,
    DollarSign,
    BarChart3,
    Award,
    Zap,
    X
} from 'lucide-react';

function ProfileAdManager({ user }) {
    const [subscription, setSubscription] = useState(null);
    const [statistics, setStatistics] = useState({
        totalViews: 0,
        totalClicks: 0,
        clickRate: 0,
        inquiries: 0
    });
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    // 구독 플랜
    const plans = [
        {
            id: 'basic',
            name: '베이직',
            price: 30000,
            duration: '월',
            features: [
                '프로필 상단 노출',
                '월 500회 노출 보장',
                '기본 통계 제공',
                '이메일 지원'
            ],
            color: '#4CAF50',
            recommended: false
        },
        {
            id: 'premium',
            name: '프리미엄',
            price: 50000,
            duration: '월',
            features: [
                '프로필 최상단 고정',
                '월 2,000회 노출 보장',
                '상세 통계 및 분석',
                '배지 표시',
                '우선 고객 지원'
            ],
            color: '#FF9800',
            recommended: true
        },
        {
            id: 'enterprise',
            name: '엔터프라이즈',
            price: 100000,
            duration: '월',
            features: [
                '지역별 독점 노출',
                '무제한 노출',
                '맞춤형 통계 리포트',
                '프리미엄 배지',
                '전담 매니저 배정',
                '마케팅 컨설팅'
            ],
            color: '#9C27B0',
            recommended: false
        }
    ];

    useEffect(() => {
        if (user) {
            loadSubscription();
            loadStatistics();
            loadPaymentHistory();
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadSubscription = async () => {
        try {
            const subRef = collection(db, 'subscriptions');
            const q = query(subRef, where('userId', '==', user.uid));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const sub = {
                    id: snapshot.docs[0].id,
                    ...snapshot.docs[0].data()
                };
                setSubscription(sub);
            }
        } catch (error) {
            console.error('구독 정보 로딩 실패:', error);
        }
    };

    const loadStatistics = async () => {
        try {
            const statsRef = collection(db, 'adStatistics');
            const q = query(statsRef, where('userId', '==', user.uid));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const stats = snapshot.docs[0].data();
                const clickRate = stats.totalViews > 0
                    ? (stats.totalClicks / stats.totalViews * 100).toFixed(1)
                    : 0;

                setStatistics({
                    totalViews: stats.totalViews || 0,
                    totalClicks: stats.totalClicks || 0,
                    clickRate,
                    inquiries: stats.inquiries || 0
                });
            }
        } catch (error) {
            console.error('통계 로딩 실패:', error);
        }
    };

    const loadPaymentHistory = async () => {
        try {
            const paymentsRef = collection(db, 'payments');
            const q = query(
                paymentsRef,
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const payments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPaymentHistory(payments);
        } catch (error) {
            console.error('결제 내역 로딩 실패:', error);
        }
    };

    const handleSubscribe = async (planId) => {
        try {
            const plan = plans.find(p => p.id === planId);

            if (subscription) {
                setMessage({
                    type: 'error',
                    text: '이미 구독 중입니다. 플랜을 변경하려면 먼저 현재 구독을 취소해주세요.'
                });
                return;
            }

            // 결제 처리 (실제로는 결제 API 연동 필요)
            const subscriptionData = {
                userId: user.uid,
                planId: plan.id,
                planName: plan.name,
                price: plan.price,
                status: 'active',
                startDate: serverTimestamp(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
                autoRenew: true,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'subscriptions'), subscriptionData);

            // 결제 내역 추가
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                planId: plan.id,
                planName: plan.name,
                amount: plan.price,
                status: 'completed',
                paymentMethod: 'card',
                createdAt: serverTimestamp()
            });

            setMessage({ type: 'success', text: `${plan.name} 플랜 구독이 완료되었습니다!` });
            await loadSubscription();
            await loadPaymentHistory();
        } catch (error) {
            console.error('구독 처리 실패:', error);
            setMessage({ type: 'error', text: '구독 처리에 실패했습니다.' });
        }
    };

    const handleCancelSubscription = async () => {
        try {
            if (!subscription) return;

            const subRef = firestoreDoc(db, 'subscriptions', subscription.id);
            await updateDoc(subRef, {
                status: 'cancelled',
                cancelledAt: serverTimestamp()
            });

            setMessage({ type: 'success', text: '구독이 취소되었습니다.' });
            await loadSubscription();
        } catch (error) {
            console.error('구독 취소 실패:', error);
            setMessage({ type: 'error', text: '구독 취소에 실패했습니다.' });
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '날짜 없음';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const styles = {
        container: {
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto'
        },
        header: {
            marginBottom: '30px'
        },
        title: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        subtitle: {
            fontSize: '16px',
            color: '#666666',
            marginBottom: '20px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
        },
        statCard: {
            backgroundColor: '#ffffff',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #f0f0f0'
        },
        statIcon: {
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px'
        },
        statValue: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '5px'
        },
        statLabel: {
            fontSize: '14px',
            color: '#666666'
        },
        section: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '30px'
        },
        sectionTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        plansGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '25px',
            marginTop: '20px'
        },
        planCard: {
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            transition: 'all 0.3s',
            position: 'relative',
            backgroundColor: '#ffffff'
        },
        planCardRecommended: {
            borderColor: '#FF9800',
            boxShadow: '0 8px 24px rgba(255,152,0,0.2)',
            transform: 'scale(1.05)'
        },
        recommendedBadge: {
            position: 'absolute',
            top: '-12px',
            right: '20px',
            backgroundColor: '#FF9800',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        planName: {
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#1a1a1a'
        },
        planPrice: {
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '5px'
        },
        planDuration: {
            fontSize: '14px',
            color: '#666666',
            marginBottom: '25px'
        },
        featureList: {
            textAlign: 'left',
            marginBottom: '25px',
            listStyle: 'none',
            padding: 0
        },
        featureItem: {
            padding: '10px 0',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '14px',
            color: '#666666',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        button: {
            width: '100%',
            padding: '14px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        },
        buttonPrimary: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        buttonSecondary: {
            backgroundColor: '#f5f5f5',
            color: '#666666'
        },
        buttonDisabled: {
            backgroundColor: '#e0e0e0',
            color: '#999999',
            cursor: 'not-allowed'
        },
        currentSubscription: {
            backgroundColor: '#e8f5e9',
            border: '2px solid #4CAF50',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '30px'
        },
        subscriptionHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #4CAF50'
        },
        subscriptionInfo: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            fontSize: '14px',
            color: '#333333'
        },
        badge: {
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        badgeActive: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        badgeCancelled: {
            backgroundColor: '#f44336',
            color: 'white'
        },
        paymentList: {
            display: 'grid',
            gap: '12px'
        },
        paymentCard: {
            padding: '20px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#fafafa'
        },
        paymentInfo: {
            display: 'grid',
            gap: '5px'
        },
        message: {
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500'
        },
        messageSuccess: {
            backgroundColor: '#e8f5e9',
            color: '#4CAF50',
            border: '1px solid #4CAF50'
        },
        messageError: {
            backgroundColor: '#ffebee',
            color: '#f44336',
            border: '1px solid #f44336'
        },
        emptyState: {
            textAlign: 'center',
            padding: '60px 20px',
            color: '#999999'
        },
        emptyIcon: {
            marginBottom: '15px',
            color: '#cccccc'
        },
        adNotice: {
            backgroundColor: '#f0f7ff',
            border: '2px solid #42a5f5',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '30px',
            boxShadow: '0 2px 8px rgba(66,165,245,0.2)'
        },
        adHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #42a5f5'
        },
        adIcon: {
            fontSize: '32px'
        },
        adTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333333',
            margin: 0
        },
        adContent: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '25px',
            marginBottom: '20px'
        },
        adSection: {
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
        },
        adSectionTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontSize: '16px',
            color: '#333333'
        },
        adList: {
            margin: '0',
            paddingLeft: '20px',
            lineHeight: '1.8',
            fontSize: '14px',
            color: '#555555'
        },
        adWarning: {
            padding: '15px',
            backgroundColor: '#e3f2fd',
            border: '1px solid #42a5f5',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#1565c0',
            textAlign: 'center',
            fontWeight: '500'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <TrendingUp size={32} />
                    프로필 광고 관리
                </h1>
                <p style={styles.subtitle}>
                    내 기공소를 더 많은 치과에 노출하고 고객을 늘리세요
                </p>
            </div>

            {message.text && (
                <div style={{
                    ...styles.message,
                    ...(message.type === 'success' ? styles.messageSuccess : styles.messageError)
                }}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* 현재 구독 정보 */}
            {subscription && subscription.status === 'active' && (
                <div style={styles.currentSubscription}>
                    <div style={styles.subscriptionHeader}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                                현재 구독 중
                            </h2>
                            <div style={{ ...styles.badge, ...styles.badgeActive }}>
                                {subscription.planName} 플랜
                            </div>
                        </div>
                        <button
                            style={{ ...styles.button, ...styles.buttonSecondary, width: 'auto', padding: '10px 20px' }}
                            onClick={handleCancelSubscription}
                        >
                            구독 취소
                        </button>
                    </div>

                    <div style={styles.subscriptionInfo}>
                        <div>
                            <strong>시작일:</strong><br />
                            {formatDate(subscription.startDate)}
                        </div>
                        <div>
                            <strong>종료일:</strong><br />
                            {formatDate(subscription.endDate)}
                        </div>
                        <div>
                            <strong>월 결제액:</strong><br />
                            {formatPrice(subscription.price)}원
                        </div>
                        <div>
                            <strong>자동 갱신:</strong><br />
                            {subscription.autoRenew ? '활성화' : '비활성화'}
                        </div>
                    </div>
                </div>
            )}

            {/* 통계 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#e3f2fd' }}>
                        <Eye size={24} color="#1976d2" />
                    </div>
                    <div style={styles.statValue}>{formatPrice(statistics.totalViews)}</div>
                    <div style={styles.statLabel}>총 노출 수</div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#e8f5e9' }}>
                        <Users size={24} color="#4CAF50" />
                    </div>
                    <div style={styles.statValue}>{formatPrice(statistics.totalClicks)}</div>
                    <div style={styles.statLabel}>클릭 수</div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#fff3e0' }}>
                        <BarChart3 size={24} color="#ff9800" />
                    </div>
                    <div style={styles.statValue}>{statistics.clickRate}%</div>
                    <div style={styles.statLabel}>클릭률</div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#fce4ec' }}>
                        <Award size={24} color="#e91e63" />
                    </div>
                    <div style={styles.statValue}>{statistics.inquiries}</div>
                    <div style={styles.statLabel}>문의 수</div>
                </div>
            </div>

            {/* 광고 운영 안내문 */}
            <div style={styles.adNotice}>
                <div style={styles.adHeader}>
                    <div style={styles.adIcon}>💡</div>
                    <h3 style={styles.adTitle}>광고 운영 가이드</h3>
                </div>

                <div style={styles.adContent}>
                    <div style={styles.adSection}>
                        <div style={styles.adSectionTitle}>
                            <CheckCircle size={16} color="#4CAF50" />
                            <strong>✅ 권장 사항</strong>
                        </div>
                        <ul style={styles.adList}>
                            <li style={{ marginBottom: '8px' }}>정확하고 진실된 정보만 게시</li>
                            <li style={{ marginBottom: '8px' }}>실제 보유한 장비와 자격증만 표시</li>
                            <li style={{ marginBottom: '8px' }}>과장되지 않은 홍보 문구 사용</li>
                            <li>정기적인 프로필 정보 업데이트</li>
                        </ul>
                    </div>

                    <div style={styles.adSection}>
                        <div style={styles.adSectionTitle}>
                            <X size={16} color="#f44336" />
                            <strong>❌ 주의 사항</strong>
                        </div>
                        <ul style={styles.adList}>
                            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f44336' }}>허위 정보 게재 금지</strong> - 없는 장비, 자격증 등</li>
                            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f44336' }}>과장 광고 금지</strong> - "최고", "1등" 등 근거 없는 표현</li>
                            <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f44336' }}>경쟁사 비방 금지</strong></li>
                            <li><strong style={{ color: '#f44336' }}>의료법 준수</strong> - 의료 광고 규정 확인</li>
                        </ul>
                    </div>
                </div>

                <div style={styles.adWarning}>
                    ⚠️ <strong>표시광고법, 의료법</strong> 등 관련 법규를 준수해주세요. 위반 시 광고 중단 및 법적 제재를 받을 수 있습니다.
                </div>
            </div>

            {/* 구독 플랜 */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>
                    <Zap size={24} />
                    구독 플랜
                </h2>

                <div style={styles.plansGrid}>
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            style={{
                                ...styles.planCard,
                                ...(plan.recommended ? styles.planCardRecommended : {})
                            }}
                        >
                            {plan.recommended && (
                                <div style={styles.recommendedBadge}>
                                    ⭐ 추천
                                </div>
                            )}

                            <div style={styles.planName}>{plan.name}</div>
                            <div style={{ ...styles.planPrice, color: plan.color }}>
                                {formatPrice(plan.price)}원
                            </div>
                            <div style={styles.planDuration}>/{plan.duration}</div>

                            <ul style={styles.featureList}>
                                {plan.features.map((feature, index) => (
                                    <li key={index} style={styles.featureItem}>
                                        <CheckCircle size={16} color={plan.color} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                style={{
                                    ...styles.button,
                                    ...(subscription && subscription.status === 'active'
                                        ? styles.buttonDisabled
                                        : { ...styles.buttonPrimary, backgroundColor: plan.color })
                                }}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={subscription && subscription.status === 'active'}
                            >
                                {subscription && subscription.status === 'active' ? (
                                    '구독 중'
                                ) : (
                                    <>
                                        <CreditCard size={18} />
                                        구독하기
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 결제 내역 */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>
                    <DollarSign size={24} />
                    결제 내역
                </h2>

                {paymentHistory.length === 0 ? (
                    <div style={styles.emptyState}>
                        <CreditCard size={64} style={styles.emptyIcon} />
                        <h3>결제 내역이 없습니다</h3>
                        <p>구독을 시작하면 결제 내역이 표시됩니다.</p>
                    </div>
                ) : (
                    <div style={styles.paymentList}>
                        {paymentHistory.map(payment => (
                            <div key={payment.id} style={styles.paymentCard}>
                                <div style={styles.paymentInfo}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                        {payment.planName} 플랜
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666666' }}>
                                        {formatDate(payment.createdAt)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#999999' }}>
                                        결제 방법: {
                                            payment.paymentMethod === 'card' ? '신용카드' :
                                                payment.paymentMethod === 'transfer' ? '계좌이체' :
                                                    '기타'
                                        }
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
                                        {formatPrice(payment.amount)}원
                                    </div>
                                    <div style={{
                                        ...styles.badge,
                                        ...(payment.status === 'completed' ? styles.badgeActive : styles.badgeCancelled)
                                    }}>
                                        {payment.status === 'completed' ? '완료' : '취소'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfileAdManager;