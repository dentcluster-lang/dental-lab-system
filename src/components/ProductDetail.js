import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { 
    Package, ShoppingCart, Heart, Star, Eye, TrendingUp, 
    ChevronLeft, ChevronRight, X 
} from 'lucide-react';

const ProductDetail = ({ userInfo, match }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [seller, setSeller] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const productId = match?.params?.id || window.location.pathname.split('/').pop();

    const loadProduct = useCallback(async () => {
        try {
            setLoading(true);
            
            // 상품 정보 로드
            const docRef = doc(db, 'marketplaceProducts', productId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert('상품을 찾을 수 없습니다.');
                window.location.href = '/marketplace';
                return;
            }

            const productData = { id: docSnap.id, ...docSnap.data() };
            setProduct(productData);

            // 조회수 증가
            await updateDoc(docRef, {
                viewCount: increment(1)
            });

            // 판매자 정보 로드 (선택사항)
            if (productData.sellerId) {
                // 실제로는 users 컬렉션에서 판매자 정보를 가져와야 함
                setSeller({
                    name: productData.sellerName,
                    type: productData.sellerType
                });
            }

        } catch (error) {
            console.error('상품 로딩 오류:', error);
            alert('상품 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        loadProduct();
    }, [loadProduct]);

    const handleAddToCart = () => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }

        if (quantity > product.stock) {
            alert('재고가 부족합니다.');
            return;
        }

        // ✅ localStorage에 장바구니 저장
        try {
            const cartItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.images?.[0] || product.imageUrl || null,
                imageUrl: product.images?.[0] || product.imageUrl || null,
                stock: product.stock,
                unit: product.unit || '개',
                brand: product.brand || '',
                sellerId: product.sellerId || null,
                sellerName: product.sellerName || '알 수 없음',
                sellerType: product.sellerType || 'unknown'
            };

            // 기존 장바구니 불러오기
            const savedCart = localStorage.getItem('dentconnect_cart');
            const currentCart = savedCart ? JSON.parse(savedCart) : [];

            // 이미 있는 상품인지 확인
            const existingIndex = currentCart.findIndex(item => item.id === product.id);

            if (existingIndex > -1) {
                // 이미 있으면 수량 증가
                currentCart[existingIndex].quantity += quantity;
                alert(`장바구니에 ${quantity}개가 추가되었습니다! (총 ${currentCart[existingIndex].quantity}개)`);
            } else {
                // 새로운 상품 추가
                currentCart.push(cartItem);
                alert(`${product.name} ${quantity}개를 장바구니에 담았습니다!`);
            }

            // 장바구니 저장
            localStorage.setItem('dentconnect_cart', JSON.stringify(currentCart));

            // 장바구니로 이동할지 물어보기
            if (window.confirm('장바구니로 이동하시겠습니까?')) {
                navigate('/cart');
            }
        } catch (error) {
            console.error('장바구니 추가 오류:', error);
            alert('장바구니에 추가하는 중 오류가 발생했습니다.');
        }
    };

    const handleBuyNow = () => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }

        if (quantity > product.stock) {
            alert('재고가 부족합니다.');
            return;
        }

        // ✅ CheckoutPage로 올바른 데이터 구조로 이동
        navigate('/checkout', {
            state: {
                items: [{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: quantity,
                    image: product.images?.[0] || product.imageUrl || null,
                    stock: product.stock,
                    unit: product.unit || '개',
                    sellerId: product.sellerId || null,
                    sellerName: product.sellerName || '알 수 없음',
                    sellerType: product.sellerType || 'unknown'
                }],
                buyNow: true  // 바로 구매
            }
        });
    };

    const handleLike = async () => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            const newLikedState = !isLiked;
            setIsLiked(newLikedState);

            await updateDoc(doc(db, 'marketplaceProducts', productId), {
                likeCount: increment(newLikedState ? 1 : -1)
            });

            setProduct(prev => ({
                ...prev,
                likeCount: (prev.likeCount || 0) + (newLikedState ? 1 : -1)
            }));
        } catch (error) {
            console.error('좋아요 오류:', error);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const getCategoryLabel = (value) => {
        const categories = {
            'impression': '인상재',
            'crown': '크라운/브릿지',
            'denture': '의치',
            'implant': '임플란트',
            'orthodontic': '교정',
            'ceramic': '세라믹',
            'metal': '금속재료',
            'equipment': '장비/기구',
            'consumable': '소모품',
            'other': '기타'
        };
        return categories[value] || value;
    };

    const nextImage = () => {
        if (product.images && product.images.length > 0) {
            setCurrentImageIndex((prev) => 
                prev === product.images.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (product.images && product.images.length > 0) {
            setCurrentImageIndex((prev) => 
                prev === 0 ? product.images.length - 1 : prev - 1
            );
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>상품 정보를 불러오는 중...</div>
            </div>
        );
    }

    if (!product) {
        return null;
    }

    return (
        <div style={styles.container}>
            {/* 뒤로가기 */}
            <button 
                style={styles.backButton}
                onClick={() => window.history.back()}
            >
                <ChevronLeft size={20} />
                목록으로
            </button>

            <div style={styles.productContainer}>
                {/* 이미지 갤러리 */}
                <div style={styles.imageSection}>
                    <div style={styles.mainImageContainer}>
                        {product.images && product.images.length > 0 ? (
                            <>
                                <img 
                                    src={product.images[currentImageIndex]} 
                                    alt={product.name}
                                    style={styles.mainImage}
                                    onClick={() => setShowImageModal(true)}
                                />
                                {product.images.length > 1 && (
                                    <>
                                        <button 
                                            style={{...styles.imageNav, left: '16px'}}
                                            onClick={prevImage}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button 
                                            style={{...styles.imageNav, right: '16px'}}
                                            onClick={nextImage}
                                        >
                                            <ChevronRight size={24} />
                                        </button>
                                    </>
                                )}
                                <div style={styles.imageCounter}>
                                    {currentImageIndex + 1} / {product.images.length}
                                </div>
                            </>
                        ) : (
                            <div style={styles.noImage}>
                                <Package size={80} color="#cbd5e1" />
                            </div>
                        )}
                    </div>

                    {/* 썸네일 */}
                    {product.images && product.images.length > 1 && (
                        <div style={styles.thumbnailGrid}>
                            {product.images.map((img, index) => (
                                <div 
                                    key={index}
                                    style={{
                                        ...styles.thumbnail,
                                        border: index === currentImageIndex ? '3px solid #6366f1' : '2px solid #e2e8f0'
                                    }}
                                    onClick={() => setCurrentImageIndex(index)}
                                >
                                    <img src={img} alt={`${product.name} ${index + 1}`} style={styles.thumbnailImage} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 상품 정보 */}
                <div style={styles.infoSection}>
                    <div style={styles.categoryBadge}>
                        {getCategoryLabel(product.category)}
                    </div>

                    <h1 style={styles.productTitle}>{product.name}</h1>

                    {/* 통계 */}
                    <div style={styles.statsRow}>
                        <div style={styles.stat}>
                            <Eye size={16} />
                            <span>{product.viewCount || 0}</span>
                        </div>
                        <div style={styles.stat}>
                            <Heart size={16} />
                            <span>{product.likeCount || 0}</span>
                        </div>
                        <div style={styles.stat}>
                            <TrendingUp size={16} />
                            <span>{product.orderCount || 0}건</span>
                        </div>
                        {product.rating > 0 && (
                            <div style={styles.stat}>
                                <Star size={16} color="#f59e0b" fill="#f59e0b" />
                                <span>{product.rating.toFixed(1)} ({product.reviewCount})</span>
                            </div>
                        )}
                    </div>

                    {/* 가격 */}
                    <div style={styles.priceSection}>
                        <div style={styles.price}>{formatPrice(product.price)}원</div>
                        <div style={styles.unit}>/ {product.unit}</div>
                    </div>

                    {/* 재고 */}
                    <div style={styles.stockInfo}>
                        <Package size={18} />
                        <span style={styles.stockLabel}>재고:</span>
                        <span style={styles.stockValue}>
                            {product.stock > 0 ? `${product.stock}개 남음` : '품절'}
                        </span>
                    </div>

                    {/* 수량 선택 */}
                    <div style={styles.quantitySection}>
                        <span style={styles.quantityLabel}>수량</span>
                        <div style={styles.quantityControl}>
                            <button 
                                style={styles.quantityButton}
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                            >
                                -
                            </button>
                            <input 
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                style={styles.quantityInput}
                                min="1"
                                max={product.stock}
                            />
                            <button 
                                style={styles.quantityButton}
                                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                disabled={quantity >= product.stock}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* 총 금액 */}
                    <div style={styles.totalSection}>
                        <span style={styles.totalLabel}>총 금액</span>
                        <span style={styles.totalPrice}>
                            {formatPrice(product.price * quantity)}원
                        </span>
                    </div>

                    {/* 구매 버튼 */}
                    <div style={styles.actionButtons}>
                        <button 
                            style={styles.likeButton}
                            onClick={handleLike}
                        >
                            <Heart 
                                size={20} 
                                color={isLiked ? '#ef4444' : '#64748b'}
                                fill={isLiked ? '#ef4444' : 'none'}
                            />
                        </button>
                        <button 
                            style={styles.cartButton}
                            onClick={handleAddToCart}
                            disabled={product.stock === 0}
                        >
                            <ShoppingCart size={20} />
                            장바구니
                        </button>
                        <button 
                            style={styles.buyButton}
                            onClick={handleBuyNow}
                            disabled={product.stock === 0}
                        >
                            바로구매
                        </button>
                    </div>

                    {/* 판매자 정보 */}
                    {seller && (
                        <div style={styles.sellerInfo}>
                            <div style={styles.sellerLabel}>판매자</div>
                            <div style={styles.sellerName}>{seller.name}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* 상세 설명 */}
            <div style={styles.detailSection}>
                <div style={styles.detailTabs}>
                    <button style={{...styles.tab, ...styles.activeTab}}>상품 설명</button>
                </div>

                <div style={styles.detailContent}>
                    {product.description && (
                        <div style={styles.descriptionSection}>
                            <h2 style={styles.detailTitle}>상품 설명</h2>
                            <p style={styles.descriptionText}>{product.description}</p>
                        </div>
                    )}

                    {product.features && (
                        <div style={styles.descriptionSection}>
                            <h2 style={styles.detailTitle}>주요 특징</h2>
                            <p style={styles.descriptionText}>{product.features}</p>
                        </div>
                    )}

                    {product.specifications && (
                        <div style={styles.descriptionSection}>
                            <h2 style={styles.detailTitle}>제품 사양</h2>
                            <p style={styles.descriptionText}>{product.specifications}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 이미지 모달 */}
            {showImageModal && product.images && (
                <div style={styles.modalOverlay} onClick={() => setShowImageModal(false)}>
                    <div style={styles.imageModal} onClick={(e) => e.stopPropagation()}>
                        <button 
                            style={styles.modalClose}
                            onClick={() => setShowImageModal(false)}
                        >
                            <X size={24} />
                        </button>
                        <img 
                            src={product.images[currentImageIndex]} 
                            alt={product.name}
                            style={styles.modalImage}
                        />
                        {product.images.length > 1 && (
                            <>
                                <button 
                                    style={{...styles.modalNav, left: '24px'}}
                                    onClick={prevImage}
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button 
                                    style={{...styles.modalNav, right: '24px'}}
                                    onClick={nextImage}
                                >
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
    },
    backButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        marginBottom: '24px',
    },
    productContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        marginBottom: '40px',
        '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr',
        },
    },
    imageSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    mainImageContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
    },
    mainImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        cursor: 'zoom-in',
    },
    noImage: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageNav: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        color: '#1e293b',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    imageCounter: {
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        padding: '8px 12px',
        fontSize: '14px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '8px',
    },
    thumbnailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '12px',
    },
    thumbnail: {
        aspectRatio: '1',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    infoSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    categoryBadge: {
        display: 'inline-block',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        borderRadius: '8px',
        width: 'fit-content',
    },
    productTitle: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        lineHeight: 1.2,
    },
    statsRow: {
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
    },
    stat: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#64748b',
    },
    priceSection: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        paddingTop: '12px',
        borderTop: '2px solid #e2e8f0',
    },
    price: {
        fontSize: '36px',
        fontWeight: '700',
        color: '#6366f1',
    },
    unit: {
        fontSize: '18px',
        color: '#64748b',
    },
    stockInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
    },
    stockLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
    },
    stockValue: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#1e293b',
    },
    quantitySection: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quantityLabel: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    quantityControl: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    quantityButton: {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    quantityInput: {
        width: '80px',
        padding: '10px',
        fontSize: '16px',
        fontWeight: '600',
        textAlign: 'center',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
    },
    totalSection: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    totalLabel: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#64748b',
    },
    totalPrice: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#6366f1',
    },
    actionButtons: {
        display: 'flex',
        gap: '12px',
    },
    likeButton: {
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    cartButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    buyButton: {
        flex: 1,
        padding: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    sellerInfo: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        borderLeft: '4px solid #6366f1',
    },
    sellerLabel: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '4px',
    },
    sellerName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    detailSection: {
        backgroundColor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    detailTabs: {
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
    },
    tab: {
        padding: '16px 32px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#94a3b8',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
    },
    activeTab: {
        color: '#6366f1',
        borderBottom: '2px solid #6366f1',
        marginBottom: '-2px',
    },
    detailContent: {
        padding: '32px',
    },
    descriptionSection: {
        marginBottom: '32px',
    },
    detailTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '16px',
    },
    descriptionText: {
        fontSize: '15px',
        lineHeight: 1.8,
        color: '#475569',
        whiteSpace: 'pre-wrap',
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748b',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    imageModal: {
        position: 'relative',
        maxWidth: '90vw',
        maxHeight: '90vh',
    },
    modalImage: {
        maxWidth: '100%',
        maxHeight: '90vh',
        objectFit: 'contain',
    },
    modalClose: {
        position: 'absolute',
        top: '-60px',
        right: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        backgroundColor: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        color: '#1e293b',
    },
    modalNav: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '56px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        color: '#1e293b',
    },
};

export default ProductDetail;