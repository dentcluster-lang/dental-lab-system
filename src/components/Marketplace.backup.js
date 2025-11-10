import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import {
    Search, ShoppingCart, Star, TrendingUp,
    Package, Sparkles, Camera, X, Loader,
    Image as ImageIcon, Zap, CheckCircle
} from 'lucide-react';

/**
 * 1단계: 기본 이미지 검색 (AI 없이)
 * - 파일명 기반 키워드 추출
 * - 메타데이터 분석
 * - 즉시 사용 가능, 무료
 */

function Marketplace({ user }) {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('popular');
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [userData, setUserData] = useState(null);

    // 🎯 이미지 검색 관련 상태
    const [showImageSearch, setShowImageSearch] = useState(false);
    const [imageSearchFile, setImageSearchFile] = useState(null);
    const [imageSearchPreview, setImageSearchPreview] = useState(null);
    const [imageSearching, setImageSearching] = useState(false);
    const [imageSearchResults, setImageSearchResults] = useState([]);
    const [extractedKeywords, setExtractedKeywords] = useState([]);

    // 사용자 데이터 로드
    useEffect(() => {
        const loadUserData = async () => {
            if (!user?.uid) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            } catch (error) {
                console.error('사용자 데이터 로드 실패:', error);
            }
        };

        loadUserData();
    }, [user]);

    // 장바구니 키 생성
    const getCartKey = useCallback(() => {
        if (!user?.uid) return 'dentconnect_cart_temp';
        const cartUserId = userData?.companyId || user.uid;
        return `dentconnect_cart_${cartUserId}`;
    }, [user, userData]);

    // 제품 로드
    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            const productsRef = collection(db, 'marketplaceProducts');

            let q = query(productsRef, where('status', '==', 'active'));

            if (selectedCategory !== 'all') {
                q = query(q, where('category', '==', selectedCategory));
            }

            const snapshot = await getDocs(q);
            let productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 정렬
            if (sortBy === 'popular') {
                productList.sort((a, b) => (b.sales || 0) - (a.sales || 0));
            } else if (sortBy === 'price-low') {
                productList.sort((a, b) => (a.price || 0) - (b.price || 0));
            } else if (sortBy === 'price-high') {
                productList.sort((a, b) => (b.price || 0) - (a.price || 0));
            } else if (sortBy === 'rating') {
                productList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            }

            // 🔥 검색 필터 적용
            if (searchQuery && searchQuery.trim().length >= 2) {
                productList = productList.filter(product =>
                    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            setProducts(productList);
        } catch (error) {
            console.error('제품 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, sortBy, searchQuery]);

    // 카테고리 로드
    const loadCategories = useCallback(async () => {
        setCategories([
            { id: 'all', name: '전체', icon: '📦' },
            { id: 'protective', name: '마스크/장갑/가운', icon: '😷' },
            { id: 'syringe', name: '주사기/바늘', icon: '💉' },
            { id: 'gauze', name: '거즈/솜/탈지면', icon: '🧻' },
            { id: 'disinfectant', name: '소독제/세정제', icon: '🧴' },
            { id: 'medical-tape', name: '의료용 테이프', icon: '📋' },
            { id: 'disposable', name: '일회용품', icon: '🗑️' },
            { id: 'office', name: '사무용품', icon: '📎' },
            { id: 'cleaning', name: '청소용품', icon: '🧹' },
            { id: 'dental-care', name: '구강용품', icon: '🦷' },
            { id: 'other', name: '기타', icon: '📦' },
        ]);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, loadProducts]);

    useEffect(() => {
        loadProducts();
    }, [selectedCategory, sortBy, loadProducts]);

    useEffect(() => {
        loadCategories();

        if (userData) {
            const cartKey = getCartKey();
            const savedCart = localStorage.getItem(cartKey);
            if (savedCart) {
                try {
                    setCart(JSON.parse(savedCart));
                } catch (error) {
                    console.error('장바구니 로드 실패:', error);
                }
            }
        }
    }, [userData, user, getCartKey, loadCategories]);

    // 🎯 키워드 추출 함수 (AI 없이)
    const extractKeywordsFromImage = (file) => {
        const keywords = [];
        const filename = file.name.toLowerCase();

        // 치과 관련 키워드 매핑
        const keywordMap = {
            // 임플란트
            'implant': ['임플란트', 'implant'],
            '임플란트': ['임플란트', 'implant'],
            
            // 크라운
            'crown': ['크라운', 'crown', '보철'],
            '크라운': ['크라운', 'crown'],
            
            // 브릿지
            'bridge': ['브릿지', 'bridge', '보철'],
            '브릿지': ['브릿지', 'bridge'],
            
            // 교정
            'ortho': ['교정', 'orthodontics', '브라켓'],
            '교정': ['교정', 'orthodontics'],
            'bracket': ['브라켓', 'bracket', '교정'],
            
            // 근관치료
            'endo': ['근관', 'endodontics', '신경치료'],
            '근관': ['근관', 'endodontics'],
            'file': ['파일', 'file', '근관'],
            
            // 보철
            'prosth': ['보철', 'prosthetics'],
            'denture': ['틀니', 'denture', '보철'],
            '틀니': ['틀니', 'denture'],
            
            // 재료
            'resin': ['레진', 'resin', '충전'],
            '레진': ['레진', 'resin'],
            'composite': ['컴포짓', 'composite', '레진'],
            'ceramic': ['세라믹', 'ceramic', '도재'],
            '세라믹': ['세라믹', 'ceramic'],
            
            // 기구
            'forceps': ['포셉', 'forceps', '겸자'],
            'explorer': ['탐침', 'explorer'],
            'mirror': ['미러', 'mirror', '구강경'],
            'scaler': ['스케일러', 'scaler', '치석제거'],
            
            // 소모품
            'glove': ['장갑', 'glove'],
            'mask': ['마스크', 'mask'],
            'gauze': ['거즈', 'gauze'],
            '거즈': ['거즈', 'gauze'],
            'syringe': ['주사기', 'syringe'],
            '주사기': ['주사기', 'syringe'],
            
            // 브랜드
            'nobel': ['노벨', 'nobel'],
            'straumann': ['스트라우만', 'straumann'],
            'osstem': ['오스템', 'osstem'],
            'dentium': ['덴티움', 'dentium'],
        };

        // 파일명에서 키워드 찾기
        Object.entries(keywordMap).forEach(([key, values]) => {
            if (filename.includes(key)) {
                keywords.push(...values);
            }
        });

        // 파일 크기로 제품 유형 추정
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 5) {
            keywords.push('장비', 'equipment');
        } else if (fileSizeMB < 0.5) {
            keywords.push('소모품', 'supplies');
        }

        // 중복 제거
        return [...new Set(keywords)];
    };

    // 🎯 이미지로 제품 검색 (키워드 기반)
    const searchProductsByKeywords = (keywords) => {
        if (!keywords || keywords.length === 0) {
            return products;
        }

        return products.filter(product => {
            const searchText = `
                ${product.name} 
                ${product.brand || ''} 
                ${product.description || ''} 
                ${product.category || ''}
                ${product.features || ''}
            `.toLowerCase();

            return keywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
            );
        });
    };

    // 🎯 이미지 업로드 핸들러
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 파일 검증
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        // 파일 크기 제한 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('이미지 크기는 10MB 이하여야 합니다.');
            return;
        }

        setImageSearchFile(file);

        // 미리보기 생성
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageSearchPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // 🎯 이미지 검색 실행
    const handleImageSearch = async () => {
        if (!imageSearchFile) {
            alert('이미지를 먼저 선택해주세요.');
            return;
        }

        try {
            setImageSearching(true);

            // 1. 키워드 추출
            const keywords = extractKeywordsFromImage(imageSearchFile);
            setExtractedKeywords(keywords);

            console.log('🔍 추출된 키워드:', keywords);

            // 2. 키워드로 제품 검색
            const results = searchProductsByKeywords(keywords);

            // 3. 관련도 순으로 정렬
            const sortedResults = results.sort((a, b) => {
                const aRelevance = keywords.filter(k => 
                    a.name.toLowerCase().includes(k.toLowerCase()) ||
                    a.description?.toLowerCase().includes(k.toLowerCase())
                ).length;

                const bRelevance = keywords.filter(k => 
                    b.name.toLowerCase().includes(k.toLowerCase()) ||
                    b.description?.toLowerCase().includes(k.toLowerCase())
                ).length;

                return bRelevance - aRelevance;
            });

            setImageSearchResults(sortedResults);

            if (sortedResults.length === 0) {
                alert('관련된 상품을 찾을 수 없습니다. 다른 이미지로 시도해보세요.');
            } else {
                alert(`${sortedResults.length}개의 유사한 상품을 찾았습니다!`);
            }

        } catch (error) {
            console.error('이미지 검색 실패:', error);
            alert('이미지 검색 중 오류가 발생했습니다.');
        } finally {
            setImageSearching(false);
        }
    };

    // 🎯 이미지 검색 초기화
    const resetImageSearch = () => {
        setImageSearchFile(null);
        setImageSearchPreview(null);
        setImageSearchResults([]);
        setExtractedKeywords([]);
        setShowImageSearch(false);
    };

    const handleAddToCart = (product) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }

        const cartUserId = userData?.companyId || user.uid;
        const existingItem = cart.find(item => item.id === product.id);

        let updatedCart;
        if (existingItem) {
            updatedCart = cart.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        } else {
            updatedCart = [...cart, { ...product, quantity: 1 }];
        }

        setCart(updatedCart);
        const cartKey = getCartKey();
        localStorage.setItem(cartKey, JSON.stringify(updatedCart));
        alert('장바구니에 추가되었습니다!');
    };

    // 표시할 제품 결정 (이미지 검색 결과 또는 일반 제품)
    const displayProducts = imageSearchResults.length > 0 ? imageSearchResults : products;

    if (loading) {
        return (
            <div style={styles.loading}>
                <Loader size={40} className="spin" />
                <p>상품을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <h1 style={styles.title}>마켓플레이스</h1>
                <div style={styles.headerActions}>
                    {/* 🎯 이미지 검색 버튼 */}
                    <button 
                        style={styles.imageSearchButton}
                        onClick={() => setShowImageSearch(!showImageSearch)}
                    >
                        <Camera size={18} />
                        이미지로 검색
                        <Sparkles size={14} />
                    </button>

                    <button 
                        style={styles.cartButton}
                        onClick={() => navigate('/cart')}
                    >
                        <ShoppingCart size={18} />
                        장바구니 ({cart.length})
                    </button>
                </div>
            </div>

            {/* 🎯 이미지 검색 패널 */}
            {showImageSearch && (
                <div style={styles.imageSearchPanel}>
                    <div style={styles.imageSearchHeader}>
                        <div style={styles.imageSearchTitle}>
                            <Camera size={24} />
                            <div>
                                <h3 style={styles.imageSearchTitleText}>이미지로 상품 검색</h3>
                                <p style={styles.imageSearchSubtitle}>
                                    찾고 싶은 제품의 사진을 업로드하세요
                                </p>
                            </div>
                        </div>
                        <button 
                            style={styles.closeButton}
                            onClick={resetImageSearch}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={styles.imageSearchContent}>
                        {!imageSearchPreview ? (
                            <label style={styles.imageUploadArea}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                                <ImageIcon size={48} color="#cbd5e1" />
                                <p style={styles.uploadText}>클릭하거나 이미지를 드래그하세요</p>
                                <p style={styles.uploadSubtext}>JPG, PNG, WEBP (최대 10MB)</p>
                            </label>
                        ) : (
                            <div style={styles.imagePreviewArea}>
                                <img 
                                    src={imageSearchPreview} 
                                    alt="업로드된 이미지"
                                    style={styles.previewImage}
                                />
                                <div style={styles.imageActions}>
                                    <button 
                                        style={styles.changeImageButton}
                                        onClick={() => {
                                            setImageSearchFile(null);
                                            setImageSearchPreview(null);
                                        }}
                                    >
                                        다른 이미지 선택
                                    </button>
                                    <button 
                                        style={styles.searchImageButton}
                                        onClick={handleImageSearch}
                                        disabled={imageSearching}
                                    >
                                        {imageSearching ? (
                                            <>
                                                <Loader size={16} className="spin" />
                                                검색 중...
                                            </>
                                        ) : (
                                            <>
                                                <Search size={16} />
                                                검색하기
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 추출된 키워드 표시 */}
                        {extractedKeywords.length > 0 && (
                            <div style={styles.keywordsArea}>
                                <p style={styles.keywordsTitle}>
                                    <Zap size={16} />
                                    추출된 키워드:
                                </p>
                                <div style={styles.keywordsList}>
                                    {extractedKeywords.map((keyword, index) => (
                                        <span key={index} style={styles.keywordTag}>
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 검색 결과 알림 */}
                        {imageSearchResults.length > 0 && (
                            <div style={styles.searchResultsInfo}>
                                <CheckCircle size={20} color="#10b981" />
                                <span>{imageSearchResults.length}개의 유사한 상품을 찾았습니다!</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 필터 & 검색 */}
            <div style={styles.filterSection}>
                <div style={styles.searchBox}>
                    <Search size={18} color="#64748b" />
                    <input
                        type="text"
                        placeholder="상품명, 브랜드로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={styles.select}
                >
                    <option value="popular">인기순</option>
                    <option value="price-low">낮은 가격순</option>
                    <option value="price-high">높은 가격순</option>
                    <option value="rating">평점순</option>
                </select>
            </div>

            {/* 카테고리 */}
            <div style={styles.categories}>
                {categories.map(category => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        style={{
                            ...styles.categoryButton,
                            ...(selectedCategory === category.id ? styles.categoryButtonActive : {})
                        }}
                    >
                        <span style={styles.categoryIcon}>{category.icon}</span>
                        {category.name}
                    </button>
                ))}
            </div>

            {/* 상품 목록 */}
            {displayProducts.length === 0 ? (
                <div style={styles.emptyState}>
                    <Package size={64} color="#cbd5e1" />
                    <h3 style={styles.emptyTitle}>상품이 없습니다</h3>
                    <p style={styles.emptyText}>
                        {imageSearchResults.length === 0 && searchQuery
                            ? '검색 결과가 없습니다.'
                            : '등록된 상품이 없습니다.'}
                    </p>
                </div>
            ) : (
                <div style={styles.productsGrid}>
                    {displayProducts.map(product => (
                        <div key={product.id} style={styles.productCard}>
                            <div style={styles.productImage}>
                                {product.images?.[0] || product.imageUrl ? (
                                    <img 
                                        src={product.images?.[0] || product.imageUrl} 
                                        alt={product.name}
                                        style={styles.productImg}
                                    />
                                ) : (
                                    <div style={styles.noImage}>
                                        <Package size={48} color="#cbd5e1" />
                                    </div>
                                )}
                            </div>

                            <div style={styles.productInfo}>
                                {product.brand && (
                                    <p style={styles.productBrand}>{product.brand}</p>
                                )}
                                <h3 style={styles.productName}>{product.name}</h3>
                                
                                <div style={styles.productMeta}>
                                    {product.rating && (
                                        <div style={styles.rating}>
                                            <Star size={14} fill="#fbbf24" color="#fbbf24" />
                                            <span>{product.rating}</span>
                                        </div>
                                    )}
                                    {product.sales > 0 && (
                                        <div style={styles.sales}>
                                            <TrendingUp size={14} />
                                            <span>{product.sales}개 판매</span>
                                        </div>
                                    )}
                                </div>

                                <div style={styles.productPrice}>
                                    <span style={styles.price}>
                                        {product.price?.toLocaleString()}원
                                    </span>
                                    {product.originalPrice && (
                                        <span style={styles.originalPrice}>
                                            {product.originalPrice.toLocaleString()}원
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleAddToCart(product)}
                                    style={styles.addToCartButton}
                                >
                                    <ShoppingCart size={16} />
                                    장바구니 담기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
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
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    // 🎯 이미지 검색 버튼
    imageSearchButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    cartButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: 'white',
        color: '#1e293b',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    // 🎯 이미지 검색 패널
    imageSearchPanel: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e0e7ff',
    },
    imageSearchHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
    },
    imageSearchTitle: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    imageSearchTitleText: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    imageSearchSubtitle: {
        margin: '4px 0 0 0',
        fontSize: '13px',
        color: '#64748b',
    },
    closeButton: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#64748b',
    },
    imageSearchContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    imageUploadArea: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        border: '3px dashed #cbd5e1',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: '#f8fafc',
    },
    uploadText: {
        margin: '16px 0 4px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#475569',
    },
    uploadSubtext: {
        margin: 0,
        fontSize: '13px',
        color: '#94a3b8',
    },
    imagePreviewArea: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '400px',
        borderRadius: '12px',
        objectFit: 'contain',
        border: '2px solid #e2e8f0',
    },
    imageActions: {
        display: 'flex',
        gap: '12px',
    },
    changeImageButton: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    searchImageButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    keywordsArea: {
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '10px',
        border: '1px solid #bae6fd',
    },
    keywordsTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0369a1',
    },
    keywordsList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    keywordTag: {
        padding: '6px 12px',
        backgroundColor: 'white',
        color: '#0369a1',
        border: '1px solid #bae6fd',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
    },
    searchResultsInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#d1fae5',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#065f46',
    },
    filterSection: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
    },
    searchBox: {
        flex: 1,
        minWidth: '300px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        height: '48px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '15px',
    },
    select: {
        padding: '12px 16px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        backgroundColor: 'white',
        cursor: 'pointer',
        fontWeight: '600',
    },
    categories: {
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '8px',
    },
    categoryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
    categoryButtonActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
        color: 'white',
    },
    categoryIcon: {
        fontSize: '18px',
    },
    productsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
    },
    productCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s',
        cursor: 'pointer',
    },
    productImage: {
        width: '100%',
        height: '240px',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    productImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    noImage: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        padding: '16px',
    },
    productBrand: {
        margin: '0 0 4px 0',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6366f1',
        textTransform: 'uppercase',
    },
    productName: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e293b',
        lineHeight: '1.4',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    productMeta: {
        display: 'flex',
        gap: '12px',
        marginBottom: '12px',
    },
    rating: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        color: '#64748b',
    },
    sales: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        color: '#64748b',
    },
    productPrice: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
    },
    price: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    originalPrice: {
        fontSize: '14px',
        color: '#94a3b8',
        textDecoration: 'line-through',
    },
    addToCartButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        backgroundColor: 'white',
        borderRadius: '16px',
    },
    emptyTitle: {
        margin: '20px 0 8px',
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
    },
    emptyText: {
        margin: 0,
        fontSize: '16px',
        color: '#64748b',
    },
};

export default Marketplace;