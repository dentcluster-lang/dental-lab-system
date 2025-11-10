import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { X, ExternalLink, TrendingUp } from 'lucide-react';

// 광고 배너 컴포넌트
function AdBanner({ position, user }) {
    const [ad, setAd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        loadAd();
    }, [position, user]);

    const loadAd = async () => {
        try {
            setLoading(true);
            
            const adsRef = collection(db, 'advertisements');
            const q = query(
                adsRef,
                where('position', '==', position),
                where('status', '==', 'active'),
                where('endDate', '>=', new Date())
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                // 타겟팅 필터링
                const eligibleAds = snapshot.docs.filter(docSnap => {
                    const adData = docSnap.data();
                    
                    // 타겟 유형 확인
                    if (adData.targeting?.businessType && 
                        adData.targeting.businessType !== 'all' &&
                        adData.targeting.businessType !== user?.businessType) {
                        return false;
                    }
                    
                    return true;
                });
                
                if (eligibleAds.length > 0) {
                    // 가중치 기반 랜덤 선택 (프리미엄 광고 우선)
                    const weights = eligibleAds.map(doc => {
                        const tier = doc.data().tier;
                        return tier === 'premium' ? 5 : tier === 'standard' ? 3 : 1;
                    });
                    
                    const totalWeight = weights.reduce((a, b) => a + b, 0);
                    let random = Math.random() * totalWeight;
                    
                    for (let i = 0; i < eligibleAds.length; i++) {
                        random -= weights[i];
                        if (random <= 0) {
                            const selectedAd = { 
                                id: eligibleAds[i].id, 
                                ...eligibleAds[i].data() 
                            };
                            setAd(selectedAd);
                            
                            // 노출 수 증가
                            await updateDoc(doc(db, 'advertisements', selectedAd.id), {
                                impressions: increment(1)
                            });
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('광고 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = async () => {
        if (!ad) return;
        
        try {
            // 클릭 수 증가
            await updateDoc(doc(db, 'advertisements', ad.id), {
                clicks: increment(1)
            });
            
            // 외부 링크 열기
            if (ad.url) {
                window.open(ad.url, '_blank');
            }
        } catch (error) {
            console.error('광고 클릭 처리 실패:', error);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
    };

    if (loading || !ad || dismissed) {
        return null;
    }

    // 위치별 스타일
    const positionStyles = {
        'top-banner': {
            width: '100%',
            height: '120px',
            marginBottom: '24px',
        },
        'sidebar': {
            width: '300px',
            height: '250px',
            marginBottom: '20px',
        },
        'footer': {
            width: '100%',
            height: '90px',
            marginTop: '24px',
        }
    };

    const containerStyle = {
        ...styles.container,
        ...positionStyles[position],
        ...(ad.tier === 'premium' ? styles.premiumBorder : {})
    };

    return (
        <div style={containerStyle}>
            {/* 광고 표시 */}
            <div style={styles.adLabel}>광고</div>
            
            {/* 닫기 버튼 (사이드바만) */}
            {position === 'sidebar' && (
                <button onClick={handleDismiss} style={styles.dismissButton}>
                    <X size={16} />
                </button>
            )}
            
            {/* 광고 내용 */}
            <div 
                style={styles.content}
                onClick={handleClick}
            >
                {ad.imageUrl && (
                    <img 
                        src={ad.imageUrl} 
                        alt={ad.title}
                        style={styles.image}
                    />
                )}
                
                <div style={styles.textContent}>
                    <h3 style={styles.title}>{ad.title}</h3>
                    {ad.description && (
                        <p style={styles.description}>{ad.description}</p>
                    )}
                    {ad.url && (
                        <div style={styles.cta}>
                            <span>자세히 보기</span>
                            <ExternalLink size={16} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 스폰서 제품 목록 (마켓플레이스용)
function SponsoredProducts({ category, user }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProducts();
    }, [category]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            
            const productsRef = collection(db, 'marketplaceProducts');
            let q = query(
                productsRef,
                where('sponsored', '==', true),
                where('status', '==', 'active')
            );
            
            if (category) {
                q = query(q, where('category', '==', category));
            }
            
            const snapshot = await getDocs(q);
            const productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setProducts(productList);
        } catch (error) {
            console.error('스폰서 제품 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = async (product) => {
        try {
            // 클릭 수 증가
            await updateDoc(doc(db, 'marketplaceProducts', product.id), {
                clicks: increment(1)
            });
        } catch (error) {
            console.error('클릭 처리 실패:', error);
        }
    };

    if (loading || products.length === 0) {
        return null;
    }

    return (
        <div style={styles.sponsoredSection}>
            <div style={styles.sponsoredHeader}>
                <TrendingUp size={20} color="#6366f1" />
                <h3 style={styles.sponsoredTitle}>추천 제품</h3>
                <span style={styles.sponsoredBadge}>광고</span>
            </div>
            
            <div style={styles.productGrid}>
                {products.slice(0, 4).map(product => (
                    <div 
                        key={product.id}
                        style={styles.productCard}
                        onClick={() => handleProductClick(product)}
                    >
                        {product.imageUrl && (
                            <img 
                                src={product.imageUrl}
                                alt={product.name}
                                style={styles.productImage}
                            />
                        )}
                        <div style={styles.productInfo}>
                            <h4 style={styles.productName}>{product.name}</h4>
                            <p style={styles.productBrand}>{product.brand}</p>
                            <div style={styles.productPrice}>
                                {product.price?.toLocaleString()}원
                            </div>
                            {product.discount && (
                                <div style={styles.discountBadge}>
                                    {product.discount}% 할인
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    premiumBorder: {
        border: '2px solid #6366f1',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
    },
    adLabel: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        fontSize: '10px',
        fontWeight: '700',
        borderRadius: '4px',
        zIndex: 2,
    },
    dismissButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        display: 'flex',
        height: '100%',
        padding: '16px',
        gap: '16px',
    },
    image: {
        width: '120px',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '8px',
    },
    textContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '8px',
    },
    title: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    description: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
    },
    cta: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#6366f1',
        fontSize: '14px',
        fontWeight: '600',
        marginTop: 'auto',
    },
    sponsoredSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
    },
    sponsoredHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
    },
    sponsoredTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    sponsoredBadge: {
        padding: '4px 10px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        fontSize: '11px',
        fontWeight: '700',
        borderRadius: '6px',
    },
    productGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
    },
    productCard: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    productImage: {
        width: '100%',
        height: '150px',
        objectFit: 'cover',
        borderRadius: '8px',
        marginBottom: '12px',
    },
    productInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    productName: {
        margin: 0,
        fontSize: '14px',
        fontWeight: '700',
        color: '#0f172a',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    productBrand: {
        margin: 0,
        fontSize: '12px',
        color: '#64748b',
    },
    productPrice: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#6366f1',
        marginTop: '4px',
    },
    discountBadge: {
        display: 'inline-block',
        padding: '4px 8px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        fontSize: '11px',
        fontWeight: '700',
        borderRadius: '4px',
    },
};

export { AdBanner, SponsoredProducts };