import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    collection, query, where, orderBy, getDocs, doc, getDoc, 
    updateDoc, increment, setDoc, deleteDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { 
    Recycle, Plus, Search, Filter, Eye, MapPin, Calendar,
    Building2, Package, ChevronDown, Heart,
    Grid, List, Clock, Shield, CheckCircle,
    XCircle, ChevronLeft, ChevronRight, Star,
    Tag, Loader2, Info, Share2
} from 'lucide-react';
import './UsedItemsList.css';

function UsedItemsList() {
    // 기본 상태 관리
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [favorites, setFavorites] = useState(new Set());
    
    // 검색 및 필터 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [selectedCondition, setSelectedCondition] = useState('전체');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedLocation, setSelectedLocation] = useState('전체');
    const [sortBy, setSortBy] = useState('latest');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    
    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    
    // 검색 디바운싱
    const [searchDebounce, setSearchDebounce] = useState(null);
    
    const navigate = useNavigate();

    // 카테고리 목록 (아이콘 추가)
    const categories = [
        { name: '전체', icon: '🏷️' },
        { name: '체어 유닛', icon: '🪑' },
        { name: '엑스레이 장비', icon: '📷' },
        { name: '핸드피스', icon: '🔧' },
        { name: '광중합기', icon: '💡' },
        { name: '스케일러', icon: '🦷' },
        { name: '석션', icon: '💨' },
        { name: '컴프레서', icon: '⚙️' },
        { name: '기타 장비', icon: '📦' },
        { name: '재료 및 소모품', icon: '🧪' }
    ];

    // 상태 목록 (색상 및 설명 추가)
    const conditions = [
        { name: '전체', color: null, description: '' },
        { name: '최상', color: '#10b981', description: '거의 새 제품' },
        { name: '좋음', color: '#3b82f6', description: '사용감 적음' },
        { name: '보통', color: '#f59e0b', description: '일반적 사용감' },
        { name: '수리필요', color: '#ef4444', description: '정비 필요' }
    ];

    // 지역 목록
    const locations = [
        '전체', '서울', '경기', '인천', '부산', '대구', '대전', 
        '광주', '울산', '세종', '강원', '충북', '충남', '전북', 
        '전남', '경북', '경남', '제주'
    ];

    // 초기 데이터 로드
    useEffect(() => {
        loadUserData();
        loadUsedItems();
        loadFavorites();
    }, []);

    // 디바운싱된 검색
    const handleSearch = useCallback((value) => {
        if (searchDebounce) clearTimeout(searchDebounce);
        
        const timeout = setTimeout(() => {
            setSearchTerm(value);
            setCurrentPage(1);
        }, 300);
        
        setSearchDebounce(timeout);
    }, [searchDebounce]);

    // 사용자 데이터 로드
    const loadUserData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserData({ uid: user.uid, ...userDoc.data() });
                }
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
        }
    };

    // 중고물품 로드
    const loadUsedItems = async () => {
        try {
            setLoading(true);
            const itemsRef = collection(db, 'usedItems');
            const q = query(
                itemsRef,
                where('status', 'in', ['active', 'reserved']),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const itemsData = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    
                    // 판매자 정보 로드
                    let sellerInfo = null;
                    if (data.sellerId) {
                        try {
                            const sellerDoc = await getDoc(doc(db, 'users', data.sellerId));
                            if (sellerDoc.exists()) {
                                sellerInfo = sellerDoc.data();
                            }
                        } catch (error) {
                            console.error('판매자 정보 로드 실패:', error);
                        }
                    }
                    
                    return {
                        id: docSnap.id,
                        ...data,
                        sellerInfo
                    };
                })
            );
            
            setItems(itemsData);
            setFilteredItems(itemsData);
        } catch (error) {
            console.error('중고물품 로드 실패:', error);
            alert('중고물품을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 즐겨찾기 로드
    const loadFavorites = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const favoritesRef = collection(db, 'users', user.uid, 'favorites');
                const snapshot = await getDocs(favoritesRef);
                const favIds = new Set(snapshot.docs.map(doc => doc.id));
                setFavorites(favIds);
            }
        } catch (error) {
            console.error('즐겨찾기 로드 실패:', error);
        }
    };

    // 필터링 로직
    const filterItems = useCallback(() => {
        let filtered = [...items];

        // 검색어 필터
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower) ||
                item.category.toLowerCase().includes(searchLower)
            );
        }

        // 카테고리 필터
        if (selectedCategory !== '전체') {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        // 상태 필터
        if (selectedCondition !== '전체') {
            filtered = filtered.filter(item => item.condition === selectedCondition);
        }

        // 지역 필터
        if (selectedLocation !== '전체') {
            filtered = filtered.filter(item => 
                item.location && item.location.includes(selectedLocation)
            );
        }

        // 가격 범위 필터
        if (priceRange.min) {
            filtered = filtered.filter(item => item.price >= parseInt(priceRange.min));
        }
        if (priceRange.max) {
            filtered = filtered.filter(item => item.price <= parseInt(priceRange.max));
        }

        // 정렬
        switch (sortBy) {
            case 'latest':
                filtered.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
                break;
            case 'oldest':
                filtered.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
                break;
            case 'priceHigh':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'priceLow':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'views':
                filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'favorites':
                filtered.sort((a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0));
                break;
            default:
                break;
        }

        setFilteredItems(filtered);
    }, [items, searchTerm, selectedCategory, selectedCondition, selectedLocation, priceRange, sortBy]);

    // 필터링 실행
    useEffect(() => {
        filterItems();
    }, [filterItems]);

    // 즐겨찾기 토글
    const toggleFavorite = async (e, itemId) => {
        e.stopPropagation();
        
        if (!userData) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        try {
            const favoriteRef = doc(db, 'users', userData.uid, 'favorites', itemId);
            const newFavorites = new Set(favorites);
            
            if (favorites.has(itemId)) {
                await deleteDoc(favoriteRef);
                newFavorites.delete(itemId);
            } else {
                await setDoc(favoriteRef, {
                    itemId,
                    addedAt: new Date()
                });
                newFavorites.add(itemId);
            }
            
            setFavorites(newFavorites);
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
            alert('즐겨찾기 처리 중 오류가 발생했습니다.');
        }
    };

    // 페이지네이션 계산
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    // 페이지 변경
    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 포맷팅 함수들
    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        if (days < 30) return `${Math.floor(days / 7)}주 전`;
        
        return date.toLocaleDateString('ko-KR');
    };

    const getConditionBadge = (condition) => {
        const found = conditions.find(c => c.name === condition);
        return found || conditions[2]; // 기본값: '보통'
    };

    const canRegisterItem = () => {
        if (!userData) return false;
        const businessType = userData.businessType;
        return businessType === 'dental' || businessType === 'clinic' || businessType === 'lab';
    };

    // 조회수 증가
    const handleItemClick = async (itemId) => {
        try {
            await updateDoc(doc(db, 'usedItems', itemId), {
                views: increment(1)
            });
            navigate(`/used-items/${itemId}`);
        } catch (error) {
            console.error('조회수 업데이트 실패:', error);
            navigate(`/used-items/${itemId}`);
        }
    };

    // 공유하기
    const handleShare = async (e, item) => {
        e.stopPropagation();
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `${item.title} - ${formatPrice(item.price)}원`,
                    url: window.location.href + `/${item.id}`
                });
            } catch (error) {
                console.log('공유 취소 또는 실패:', error);
            }
        } else {
            // 클립보드에 복사
            navigator.clipboard.writeText(window.location.href + `/${item.id}`);
            alert('링크가 복사되었습니다.');
        }
    };

    // 필터 초기화
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('전체');
        setSelectedCondition('전체');
        setSelectedLocation('전체');
        setPriceRange({ min: '', max: '' });
        setSortBy('latest');
        setCurrentPage(1);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 className="loading-spinner" size={48} />
                <h3>중고물품을 불러오는 중...</h3>
                <p>잠시만 기다려주세요</p>
            </div>
        );
    }

    return (
        <div className="used-items-container">
            {/* 헤더 */}
            <div className="used-items-header">
                <div className="header-content">
                    <div className="header-title">
                        <div className="title-icon">
                            <Recycle size={36} />
                        </div>
                        <div className="title-text">
                            <h1>중고물품 마켓플레이스</h1>
                            <p>치과·기공소 전문 장비 및 재료 직거래 플랫폼</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {userData && (
                            <button 
                                className="my-favorites-btn"
                                onClick={() => navigate('/used-items/favorites')}
                            >
                                <Heart size={20} />
                                내 관심물품
                                {favorites.size > 0 && (
                                    <span className="badge">{favorites.size}</span>
                                )}
                            </button>
                        )}
                        {canRegisterItem() && (
                            <button 
                                className="register-btn"
                                onClick={() => navigate('/used-items/register')}
                            >
                                <Plus size={20} />
                                물품 등록
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 검색 및 필터 섹션 */}
            <div className="search-filter-section">
                <div className="search-row">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="물품명, 설명, 카테고리로 검색..."
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="view-controls">
                        <button 
                            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="그리드 보기"
                        >
                            <Grid size={20} />
                        </button>
                        <button 
                            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="리스트 보기"
                        >
                            <List size={20} />
                        </button>
                    </div>
                    <button 
                        className={`filter-toggle ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={20} />
                        상세 필터
                        <ChevronDown 
                            size={16} 
                            style={{ 
                                transform: showFilters ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.3s'
                            }}
                        />
                    </button>
                </div>
            </div>

            {/* 필터 패널 */}
            {showFilters && (
                <div className="filter-panel">
                    {/* 카테고리 필터 */}
                    <div className="filter-group">
                        <label>카테고리</label>
                        <div className="filter-chips">
                            {categories.map(category => (
                                <button
                                    key={category.name}
                                    className={`chip ${selectedCategory === category.name ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedCategory(category.name);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <span className="chip-icon">{category.icon}</span>
                                    <span>{category.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 상태 필터 */}
                    <div className="filter-group">
                        <label>제품 상태</label>
                        <div className="filter-chips">
                            {conditions.map(condition => (
                                <button
                                    key={condition.name}
                                    className={`chip condition-chip ${selectedCondition === condition.name ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedCondition(condition.name);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        borderColor: selectedCondition === condition.name ? condition.color : undefined,
                                        backgroundColor: selectedCondition === condition.name ? `${condition.color}15` : undefined
                                    }}
                                >
                                    {condition.color && (
                                        <span 
                                            className="condition-dot" 
                                            style={{ backgroundColor: condition.color }}
                                        />
                                    )}
                                    <span>{condition.name}</span>
                                    {condition.description && (
                                        <span className="chip-description">{condition.description}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 지역 필터 */}
                    <div className="filter-group">
                        <label>지역</label>
                        <div className="filter-chips">
                            {locations.map(location => (
                                <button
                                    key={location}
                                    className={`chip ${selectedLocation === location ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedLocation(location);
                                        setCurrentPage(1);
                                    }}
                                >
                                    {location}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 가격 범위 필터 */}
                    <div className="filter-group">
                        <label>가격 범위</label>
                        <div className="price-range-inputs">
                            <input
                                type="number"
                                placeholder="최소 가격"
                                value={priceRange.min}
                                onChange={(e) => {
                                    setPriceRange({ ...priceRange, min: e.target.value });
                                    setCurrentPage(1);
                                }}
                                className="price-input"
                            />
                            <span className="price-separator">~</span>
                            <input
                                type="number"
                                placeholder="최대 가격"
                                value={priceRange.max}
                                onChange={(e) => {
                                    setPriceRange({ ...priceRange, max: e.target.value });
                                    setCurrentPage(1);
                                }}
                                className="price-input"
                            />
                            <span className="price-unit">원</span>
                        </div>
                    </div>

                    {/* 정렬 옵션 */}
                    <div className="filter-group">
                        <label>정렬 기준</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="latest">최신 등록순</option>
                            <option value="oldest">오래된 순</option>
                            <option value="priceHigh">높은 가격순</option>
                            <option value="priceLow">낮은 가격순</option>
                            <option value="views">인기순 (조회수)</option>
                            <option value="favorites">관심순 (즐겨찾기)</option>
                        </select>
                    </div>

                    {/* 필터 초기화 버튼 */}
                    <div className="filter-actions">
                        <button className="reset-filters-btn" onClick={resetFilters}>
                            <XCircle size={18} />
                            필터 초기화
                        </button>
                    </div>
                </div>
            )}

            {/* 결과 요약 및 정보 */}
            <div className="results-info-section">
                <div className="results-summary">
                    <p>
                        총 <strong>{filteredItems.length}개</strong>의 물품
                        {searchTerm && ` • "${searchTerm}" 검색 결과`}
                        {selectedCategory !== '전체' && ` • ${selectedCategory}`}
                        {selectedCondition !== '전체' && ` • ${selectedCondition}`}
                    </p>
                </div>
                {filteredItems.length > itemsPerPage && (
                    <div className="page-info">
                        {currentPage} / {totalPages} 페이지
                    </div>
                )}
            </div>

            {/* 물품 목록 */}
            {paginatedItems.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Package size={80} strokeWidth={1.5} />
                    </div>
                    <h3>검색 결과가 없습니다</h3>
                    <p>다른 검색어나 필터를 사용해보세요</p>
                    {canRegisterItem() && filteredItems.length === 0 && items.length === 0 && (
                        <>
                            <button 
                                className="register-btn empty-register"
                                onClick={() => navigate('/used-items/register')}
                            >
                                <Plus size={20} />
                                첫 물품 등록하기
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className={`items-container ${viewMode}`}>
                    {paginatedItems.map(item => (
                        <div 
                            key={item.id} 
                            className={`item-card ${viewMode}-view`}
                            onClick={() => handleItemClick(item.id)}
                        >
                            {/* 이미지 섹션 */}
                            <div className="item-image-section">
                                {item.images && item.images.length > 0 ? (
                                    <img 
                                        src={item.images[0]} 
                                        alt={item.title}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder-image.png';
                                        }}
                                    />
                                ) : (
                                    <div className="no-image">
                                        <Package size={viewMode === 'grid' ? 48 : 64} strokeWidth={1.5} />
                                        <span>이미지 없음</span>
                                    </div>
                                )}
                                
                                {/* 상태 배지 */}
                                <div className="badges">
                                    <div 
                                        className="condition-badge" 
                                        style={{ 
                                            backgroundColor: getConditionBadge(item.condition).color,
                                            color: 'white'
                                        }}
                                    >
                                        {getConditionBadge(item.condition).name}
                                    </div>
                                    {item.status === 'reserved' && (
                                        <div className="reserved-badge">
                                            <Clock size={14} />
                                            예약중
                                        </div>
                                    )}
                                </div>

                                {/* 즐겨찾기 버튼 */}
                                <button
                                    className={`favorite-btn ${favorites.has(item.id) ? 'active' : ''}`}
                                    onClick={(e) => toggleFavorite(e, item.id)}
                                    title={favorites.has(item.id) ? '관심 해제' : '관심 등록'}
                                >
                                    {favorites.has(item.id) ? (
                                        <Heart size={20} fill="currentColor" />
                                    ) : (
                                        <Heart size={20} />
                                    )}
                                </button>

                                {/* 이미지 카운트 */}
                                {item.images && item.images.length > 1 && (
                                    <div className="image-count">
                                        <Package size={16} />
                                        {item.images.length}
                                    </div>
                                )}
                            </div>

                            {/* 정보 섹션 */}
                            <div className="item-info-section">
                                <div className="item-header">
                                    <h3 className="item-title">{item.title}</h3>
                                    {item.verified && (
                                        <div className="verified-badge" title="인증된 판매자">
                                            <CheckCircle size={16} />
                                        </div>
                                    )}
                                </div>

                                <p className="item-description">{item.description}</p>
                                
                                {/* 가격 정보 */}
                                <div className="item-price-section">
                                    <div className="price-main">
                                        <span className="price-label">판매가</span>
                                        <span className="price-value">
                                            {formatPrice(item.price)}
                                            <span className="price-unit">원</span>
                                        </span>
                                    </div>
                                    {item.negotiable && (
                                        <span className="negotiable-badge">
                                            <Tag size={14} />
                                            가격협상 가능
                                        </span>
                                    )}
                                </div>

                                {/* 메타 정보 */}
                                <div className="item-meta-info">
                                    <div className="meta-item">
                                        <Package size={16} />
                                        <span>{item.category}</span>
                                    </div>
                                    <div className="meta-item">
                                        <Building2 size={16} />
                                        <span>{item.sellerType === 'dental' ? '치과' : '기공소'}</span>
                                    </div>
                                    {item.location && (
                                        <div className="meta-item">
                                            <MapPin size={16} />
                                            <span>{item.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 판매자 정보 (리스트 뷰에서만) */}
                                {viewMode === 'list' && item.sellerInfo && (
                                    <div className="seller-info">
                                        <div className="seller-name">
                                            <Shield size={16} />
                                            {item.sellerInfo.businessName || item.sellerInfo.name || '판매자'}
                                        </div>
                                        {item.sellerInfo.rating && (
                                            <div className="seller-rating">
                                                <Star size={16} fill="currentColor" />
                                                <span>{item.sellerInfo.rating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 푸터 정보 */}
                                <div className="item-footer-info">
                                    <div className="footer-left">
                                        <span className="footer-item">
                                            <Calendar size={14} />
                                            {formatDate(item.createdAt)}
                                        </span>
                                        <span className="footer-item">
                                            <Eye size={14} />
                                            조회 {item.views || 0}
                                        </span>
                                        {item.favoriteCount > 0 && (
                                            <span className="footer-item">
                                                <Heart size={14} />
                                                관심 {item.favoriteCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="footer-actions">
                                        <button
                                            className="share-btn"
                                            onClick={(e) => handleShare(e, item)}
                                            title="공유하기"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={20} />
                        이전
                    </button>

                    <div className="pagination-pages">
                        {[...Array(totalPages)].map((_, index) => {
                            const page = index + 1;
                            const showPage = 
                                page === 1 || 
                                page === totalPages || 
                                (page >= currentPage - 2 && page <= currentPage + 2);

                            if (!showPage) {
                                if (page === currentPage - 3 || page === currentPage + 3) {
                                    return <span key={page} className="pagination-ellipsis">...</span>;
                                }
                                return null;
                            }

                            return (
                                <button
                                    key={page}
                                    className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => handlePageChange(page)}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        다음
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* 안내 배너 */}
            <div className="info-banner">
                <div className="banner-icon">
                    <Info size={24} />
                </div>
                <div className="banner-content">
                    <strong>안전한 거래를 위한 안내</strong>
                    <p>
                        • 직접 만나서 물품을 확인 후 거래하세요<br />
                        • 계좌 이체 시 판매자 정보를 확인하세요<br />
                        • 고가의 장비는 전문가와 함께 점검하세요
                    </p>
                </div>
            </div>
        </div>
    );
}

export default UsedItemsList;