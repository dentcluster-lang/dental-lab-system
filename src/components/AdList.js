import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Eye, MousePointer, TrendingUp, Calendar, MapPin,
    Megaphone, Search, Filter, ExternalLink
} from 'lucide-react';

function AdList({ user }) {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, pending, rejected
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAds();
    }, [filter]);

    const loadAds = async () => {
        try {
            setLoading(true);
            const adsRef = collection(db, 'advertisements');
            
            let q;
            if (filter === 'all') {
                q = query(adsRef, orderBy('createdAt', 'desc'));
            } else {
                q = query(
                    adsRef,
                    where('status', '==', filter),
                    orderBy('createdAt', 'desc')
                );
            }
            
            const snapshot = await getDocs(q);
            const adsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAds(adsList);
        } catch (error) {
            console.error('광고 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 검색 필터링
    const filteredAds = ads.filter(ad => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            ad.title?.toLowerCase().includes(searchLower) ||
            ad.description?.toLowerCase().includes(searchLower) ||
            ad.advertiserName?.toLowerCase().includes(searchLower)
        );
    });

    // 통계 계산
    const stats = {
        total: ads.length,
        active: ads.filter(ad => ad.status === 'active').length,
        pending: ads.filter(ad => ad.status === 'pending').length,
        totalImpressions: ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0),
        totalClicks: ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0),
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>등록된 광고 목록</h1>
                    <p style={styles.subtitle}>플랫폼에 등록된 모든 광고를 확인하세요</p>
                </div>
            </div>

            {/* 통계 카드 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <Megaphone size={24} color="#6366f1" />
                    <div>
                        <div style={styles.statValue}>{stats.total}</div>
                        <div style={styles.statLabel}>전체 광고</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <Eye size={24} color="#10b981" />
                    <div>
                        <div style={styles.statValue}>{stats.active}</div>
                        <div style={styles.statLabel}>활성 광고</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <TrendingUp size={24} color="#f59e0b" />
                    <div>
                        <div style={styles.statValue}>{stats.totalImpressions.toLocaleString()}</div>
                        <div style={styles.statLabel}>총 노출</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <MousePointer size={24} color="#ec4899" />
                    <div>
                        <div style={styles.statValue}>{stats.totalClicks.toLocaleString()}</div>
                        <div style={styles.statLabel}>총 클릭</div>
                    </div>
                </div>
            </div>

            {/* 필터 & 검색 */}
            <div style={styles.filterSection}>
                <div style={styles.filterTabs}>
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            ...styles.filterTab,
                            ...(filter === 'all' ? styles.filterTabActive : {})
                        }}
                    >
                        전체
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        style={{
                            ...styles.filterTab,
                            ...(filter === 'active' ? styles.filterTabActive : {})
                        }}
                    >
                        활성
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        style={{
                            ...styles.filterTab,
                            ...(filter === 'pending' ? styles.filterTabActive : {})
                        }}
                    >
                        대기중
                    </button>
                    <button
                        onClick={() => setFilter('paused')}
                        style={{
                            ...styles.filterTab,
                            ...(filter === 'paused' ? styles.filterTabActive : {})
                        }}
                    >
                        일시정지
                    </button>
                </div>

                <div style={styles.searchBox}>
                    <Search size={20} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="광고 제목, 설명으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* 광고 목록 */}
            {filteredAds.length === 0 ? (
                <div style={styles.emptyState}>
                    <Megaphone size={64} color="#cbd5e1" />
                    <h3 style={styles.emptyTitle}>등록된 광고가 없습니다</h3>
                    <p style={styles.emptyText}>아직 등록된 광고가 없습니다.</p>
                </div>
            ) : (
                <div style={styles.adsList}>
                    {filteredAds.map(ad => (
                        <div key={ad.id} style={styles.adCard}>
                            {/* 광고 이미지 */}
                            {ad.imageUrl && (
                                <div style={styles.imageContainer}>
                                    <img
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        style={styles.adImage}
                                    />
                                    <div style={styles.tierBadge}>
                                        {ad.tier === 'premium' ? '프리미엄' :
                                            ad.tier === 'standard' ? '스탠다드' : '베이직'}
                                    </div>
                                </div>
                            )}

                            {/* 광고 정보 */}
                            <div style={styles.adContent}>
                                <div style={styles.adHeader}>
                                    <div>
                                        <h3 style={styles.adTitle}>{ad.title}</h3>
                                        <p style={styles.adDescription}>{ad.description}</p>
                                    </div>
                                    <div style={styles.statusBadge}>
                                        {ad.status === 'active' && (
                                            <span style={styles.statusActive}>활성</span>
                                        )}
                                        {ad.status === 'pending' && (
                                            <span style={styles.statusPending}>대기중</span>
                                        )}
                                        {ad.status === 'paused' && (
                                            <span style={styles.statusPaused}>일시정지</span>
                                        )}
                                        {ad.status === 'rejected' && (
                                            <span style={styles.statusRejected}>거부됨</span>
                                        )}
                                    </div>
                                </div>

                                {/* 광고주 정보 */}
                                <div style={styles.advertiserInfo}>
                                    <span style={styles.advertiserLabel}>광고주:</span>
                                    <span style={styles.advertiserName}>{ad.advertiserName || '알 수 없음'}</span>
                                </div>

                                {/* 통계 */}
                                <div style={styles.adStats}>
                                    <div style={styles.statItem}>
                                        <Eye size={16} />
                                        <span>노출 {(ad.impressions || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <MousePointer size={16} />
                                        <span>클릭 {(ad.clicks || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <TrendingUp size={16} />
                                        <span>
                                            CTR {ad.impressions > 0
                                                ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                                                : '0.00'}%
                                        </span>
                                    </div>
                                </div>

                                {/* 메타 정보 */}
                                <div style={styles.adMeta}>
                                    <span style={styles.metaItem}>
                                        <MapPin size={14} />
                                        {ad.position === 'top-banner' ? '상단 배너' :
                                            ad.position === 'sidebar' ? '사이드바' : '하단'}
                                    </span>
                                    <span style={styles.metaItem}>
                                        <Calendar size={14} />
                                        {ad.startDate?.toDate().toLocaleDateString()} ~ {ad.endDate?.toDate().toLocaleDateString()}
                                    </span>
                                    {ad.url && (
                                        <a
                                            href={ad.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={styles.linkButton}
                                        >
                                            <ExternalLink size={14} />
                                            링크 보기
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
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
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        marginBottom: '32px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    filterSection: {
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
    },
    filterTabs: {
        display: 'flex',
        gap: '8px',
        backgroundColor: 'white',
        padding: '6px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
    },
    filterTab: {
        padding: '8px 20px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    filterTabActive: {
        backgroundColor: '#6366f1',
        color: 'white',
    },
    searchBox: {
        flex: 1,
        minWidth: '300px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#1e293b',
    },
    adsList: {
        display: 'grid',
        gap: '16px',
    },
    adCard: {
        display: 'flex',
        gap: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        transition: 'all 0.2s',
    },
    imageContainer: {
        position: 'relative',
        flexShrink: 0,
        width: '200px',
    },
    adImage: {
        width: '100%',
        height: '150px',
        objectFit: 'cover',
        borderRadius: '10px',
    },
    tierBadge: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '4px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontSize: '11px',
        fontWeight: '700',
        borderRadius: '6px',
    },
    adContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    adHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    adTitle: {
        margin: '0 0 6px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    adDescription: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    statusBadge: {
        flexShrink: 0,
    },
    statusActive: {
        padding: '6px 12px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    statusPending: {
        padding: '6px 12px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    statusPaused: {
        padding: '6px 12px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    statusRejected: {
        padding: '6px 12px',
        backgroundColor: '#fce7f3',
        color: '#be123c',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    advertiserInfo: {
        display: 'flex',
        gap: '8px',
        fontSize: '13px',
    },
    advertiserLabel: {
        color: '#94a3b8',
        fontWeight: '600',
    },
    advertiserName: {
        color: '#475569',
        fontWeight: '500',
    },
    adStats: {
        display: 'flex',
        gap: '20px',
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#64748b',
    },
    adMeta: {
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#94a3b8',
    },
    linkButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: '#f1f5f9',
        color: '#6366f1',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        textDecoration: 'none',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
    },
    emptyTitle: {
        margin: '20px 0 8px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    emptyText: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
};

export default AdList;