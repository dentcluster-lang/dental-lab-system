import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import {
    Search, ShoppingCart, Star, TrendingUp, Package
} from 'lucide-react';

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

    // 전체 제품 데이터
    const [allProducts, setAllProducts] = useState([]);

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

    const getCartKey = useCallback(() => {
        if (!user?.uid) return 'dentconnect_cart_temp';
        const cartUserId = userData?.companyId || user.uid;
        return `dentconnect_cart_${cartUserId}`;
    }, [user, userData]);

    // 제품 로드
    const loadAllProducts = useCallback(async () => {
        try {
            setLoading(true);
            const productsRef = collection(db, 'marketplaceProducts');
            const q = query(productsRef, where('status', '==', 'active'));
            const snapshot = await getDocs(q);

            const productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAllProducts(productList);
            setProducts(productList);
        } catch (error) {
            console.error('제품 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 필터링 함수
    const filterProducts = useCallback(() => {
        let filtered = [...allProducts];

        // 카테고리 필터
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        // 검색 필터
        if (searchQuery && searchQuery.trim().length >= 2) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(query) ||
                product.brand?.toLowerCase().includes(query) ||
                product.description?.toLowerCase().includes(query)
            );
        }

        // 정렬
        if (sortBy === 'popular') {
            filtered.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        } else if (sortBy === 'price-low') {
            filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (sortBy === 'rating') {
            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        setProducts(filtered);
    }, [allProducts, selectedCategory, searchQuery, sortBy]);

    const loadCategories = useCallback(async () => {
        setCategories([
            { id: 'all', name: '전체', icon: '📦' },
            { id: 'dental-materials', name: '치과재료', icon: '🦷' },
            { id: 'equipment', name: '장비', icon: '⚙️' },
            { id: 'instruments', name: '기구', icon: '🔧' },
            { id: 'supplies', name: '소모품', icon: '📦' },
            { id: 'lab-materials', name: '기공재료', icon: '🧪' },
            { id: 'implant', name: '임플란트', icon: '💎' },
            { id: 'orthodontics', name: '교정', icon: '🦷' },
            { id: 'endodontics', name: '근관치료', icon: '🔬' },
            { id: 'prosthetics', name: '보철', icon: '👑' },
            { id: 'other', name: '기타', icon: '📦' },
        ]);
    }, []);

    // 최초 제품 로드
    useEffect(() => {
        loadAllProducts();
    }, [loadAllProducts]);

    // 검색어/카테고리/정렬 변경 시 필터링
    useEffect(() => {
        if (allProducts.length === 0) return;

        const timer = setTimeout(() => {
            filterProducts();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, sortBy, allProducts.length, filterProducts]);

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

    const handleAddToCart = (product) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }

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
        alert(`"${product.name}"을(를) 장바구니에 담았습니다!`);
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <Package size={48} color="#cbd5e1" />
                <p>상품을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <h1 style={styles.title}>마켓플레이스</h1>
                <button
                    style={styles.cartButton}
                    onClick={() => navigate('/cart')}
                >
                    <ShoppingCart size={18} />
                    장바구니 ({cart.length})
                </button>
            </div>

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
                        autoComplete="off"
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
            <div style={styles.productsArea}>
                {products.length === 0 ? (
                    <div style={styles.emptyState}>
                        <Package size={64} color="#cbd5e1" />
                        <h3 style={styles.emptyTitle}>상품이 없습니다</h3>
                        <p style={styles.emptyText}>
                            다른 카테고리를 선택하거나 검색어를 변경해보세요.
                        </p>
                    </div>
                ) : (
                    <div style={styles.productsGrid}>
                        {products.map(product => (
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
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        color: '#64748b',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
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
    filterSection: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
    },
    searchBox: {
        flex: 1,
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
        minWidth: '140px',
    },
    categories: {
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '8px',
    },
    categoryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    categoryButtonActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
        color: 'white',
    },
    categoryIcon: {
        fontSize: '16px',
    },
    productsArea: {
        minHeight: '400px',
    },
    productsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px',
    },
    productCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s',
        cursor: 'pointer',
    },
    productImage: {
        width: '100%',
        height: '220px',
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
        fontSize: '11px',
        fontWeight: '600',
        color: '#6366f1',
        textTransform: 'uppercase',
    },
    productName: {
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '700',
        color: '#1e293b',
        lineHeight: '1.4',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '42px',
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
        fontWeight: '600',
    },
    sales: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        color: '#64748b',
    },
    productPrice: {
        marginBottom: '12px',
    },
    price: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    addToCartButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
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
        borderRadius: '12px',
    },
    emptyTitle: {
        margin: '16px 0 8px',
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

export default Marketplace;
