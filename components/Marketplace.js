import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import {
    Search, ShoppingCart, Star, TrendingUp, Package, Sparkles,
    Camera, X, Loader, Zap, CheckCircle, Send, Bot, 
    User as UserIcon, ThumbsUp, ThumbsDown, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';

/**
 * 🚀 분할 화면 AI 쇼핑 어시스턴트
 * 
 * 레이아웃:
 * - 왼쪽 60%: 쇼핑몰 제품 목록
 * - 오른쪽 40%: AI 어시스턴트 (항상 표시)
 */

function Marketplace({ user }) {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('popular');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false); // 🔥 검색 중 상태 추가
    const [cart, setCart] = useState([]);
    const [userData, setUserData] = useState(null);
    const [pageEnabled, setPageEnabled] = useState(true); // 페이지 활성화 상태

    // 🎯 AI 어시스턴트 상태
    const [chatMessages, setChatMessages] = useState([]);
    const [userMessage, setUserMessage] = useState('');
    const [aiThinking, setAiThinking] = useState(false);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiSearchResults, setAiSearchResults] = useState([]);
    const [searchContext, setSearchContext] = useState(null);

    // 🎨 레이아웃 상태
    const [isAIPanelCollapsed, setIsAIPanelCollapsed] = useState(false);

    // ⚙️ OpenAI API 설정
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || 'your-api-key-here';

    // 페이지 활성화 상태 확인
    useEffect(() => {
        const checkPageStatus = async () => {
            try {
                const settingsRef = doc(db, 'systemSettings', 'pageVisibility');
                const settingsDoc = await getDoc(settingsRef);

                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    const marketplaceStatus = data.marketplace?.enabled;
                    setPageEnabled(marketplaceStatus !== false);
                } else {
                    setPageEnabled(true);
                }
            } catch (error) {
                console.error('페이지 상태 확인 실패:', error);
                setPageEnabled(true);
            }
        };

        checkPageStatus();
    }, []);

    // 초기 환영 메시지
    useEffect(() => {
        if (chatMessages.length === 0) {
            setChatMessages([{
                role: 'assistant',
                content: `안녕하세요! 👋

DentConnect AI 쇼핑 어시스턴트입니다.

저는 **GPT-4 Vision**을 사용해서 이미지도 분석할 수 있어요! 📸

💬 **텍스트 검색**
"임플란트 추천해줘"

📸 **이미지 분석** ✨
사진 업로드하면 제품을 식별하고 유사한 제품을 찾아드려요!
- 제품 사진
- 카탈로그 사진
- 스크린샷 모두 가능!

🔥 **조합 검색**
사진 + "이것보다 더 고급"

자연스럽게 물어보세요! 😊`,
                timestamp: new Date(),
                suggestions: [
                    '임플란트 추천',
                    '저렴한 제품',
                    '오스템 제품',
                    '사진으로 제품 찾기'
                ]
            }]);
        }
    }, [chatMessages.length]);

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

    // 🔥 전체 제품 데이터 캐싱 (검색용)
    const [allProducts, setAllProducts] = useState([]);

    // 제품 로드 (최초 1회만)
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

    // 🔥 필터링 함수 (리렌더링 없이 제품만 필터링)
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

    // 🔥 최초 1회만 전체 제품 로드
    useEffect(() => {
        loadAllProducts();
    }, [loadAllProducts]);

    // 🔥 검색어/카테고리/정렬 변경 시 필터링만 (포커스 유지!)
    useEffect(() => {
        if (allProducts.length === 0) return;

        const timer = setTimeout(() => {
            setSearching(true);
            filterProducts();
            setSearching(false);
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

    // 🎯 이미지 업로드
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('이미지 크기는 10MB 이하여야 합니다.');
            return;
        }

        setUploadedImage(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // 🎯 이미지 제거
    const removeImage = () => {
        setUploadedImage(null);
        setImagePreview(null);
    };

    // 🚀 통합 AI 검색
    const handleSendMessage = async () => {
        if (!userMessage.trim() && !uploadedImage) {
            alert('메시지를 입력하거나 이미지를 업로드해주세요.');
            return;
        }

        if (!user?.uid) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }

        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-api-key-here') {
            alert('OpenAI API 키가 설정되지 않았습니다.');
            return;
        }

        try {
            setAiThinking(true);

            const newUserMessage = {
                role: 'user',
                content: userMessage || '이 이미지와 관련된 제품을 추천해주세요',
                image: imagePreview,
                timestamp: new Date()
            };

            setChatMessages(prev => [...prev, newUserMessage]);
            setUserMessage('');

            // 🔥 이미지 처리 개선
            let imageUrlForAPI = null;
            
            if (uploadedImage) {
                try {
                    // Firebase Storage에 업로드
                    const timestamp = Date.now();
                    const storageRef = ref(storage, `ai-chat/${user.uid}/${timestamp}_${uploadedImage.name}`);
                    await uploadBytes(storageRef, uploadedImage);
                    const firebaseUrl = await getDownloadURL(storageRef);
                    
                    // 🔥 base64 이미지 사용 (더 안정적)
                    imageUrlForAPI = imagePreview;
                    
                    console.log('✅ 이미지 업로드 성공');
                    console.log('Firebase URL:', firebaseUrl);
                    console.log('API에 전달할 이미지:', imageUrlForAPI ? '있음 (base64)' : '없음');
                } catch (error) {
                    console.error('❌ 이미지 업로드 실패:', error);
                    alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
                    setAiThinking(false);
                    return;
                }
            }

            const productsData = allProducts.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                price: p.price,
                rating: p.rating,
                sales: p.sales
            }));

            const aiResponse = await callOpenAI({
                userQuery: newUserMessage.content,
                imageUrl: imageUrlForAPI, // 🔥 수정된 변수명
                productsData: productsData,
                conversationHistory: chatMessages.slice(-2),
                userPreferences: {
                    budget: userData?.budget,
                    brands: userData?.preferredBrands,
                    categories: userData?.preferredCategories
                }
            });

            const recommendedProducts = matchProductsWithAI(aiResponse.recommendations, allProducts);

            const aiMessage = {
                role: 'assistant',
                content: aiResponse.message,
                products: recommendedProducts,
                reasoning: aiResponse.reasoning,
                suggestions: aiResponse.suggestions,
                timestamp: new Date()
            };

            setChatMessages(prev => [...prev, aiMessage]);

            if (recommendedProducts && recommendedProducts.length > 0) {
                setAiSearchResults(recommendedProducts);
                setSearchContext({
                    query: newUserMessage.content,
                    imageUrl: imageUrlForAPI, // 🔥 수정된 변수명
                    timestamp: new Date()
                });
            }

            removeImage();

        } catch (error) {
            console.error('AI 어시스턴트 오류:', error);
            
            const errorMessage = {
                role: 'assistant',
                content: `죄송합니다. 오류가 발생했습니다: ${error.message}\n\n다시 시도해주세요.`,
                timestamp: new Date(),
                isError: true
            };

            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setAiThinking(false);
        }
    };

    const callOpenAI = async ({ userQuery, imageUrl, productsData, conversationHistory, userPreferences }) => {
        const messages = [
            {
                role: 'system',
                content: `당신은 DentConnect 치과 마켓플레이스의 AI 쇼핑 어시스턴트입니다.

[역할]
- 사용자의 텍스트와 이미지를 분석하여 최적의 치과 제품을 추천합니다
- 이미지가 제공되면 제품의 외형, 브랜드, 특징을 자세히 분석하세요
- 이미지에서 보이는 제품과 유사한 제품을 DB에서 찾아 추천하세요

[제품 데이터베이스]
${JSON.stringify(productsData.slice(0, 50), null, 2)}

[사용자 선호도]
예산: ${userPreferences.budget || '제한 없음'}
선호 브랜드: ${userPreferences.brands?.join(', ') || '없음'}

[이미지 분석 방법]
1. 이미지가 제공되면 먼저 제품의 종류를 파악하세요
2. 브랜드 로고나 모델명이 보이면 정확히 식별하세요
3. 제품의 색상, 크기, 형태를 분석하세요
4. DB에서 가장 유사한 제품을 찾으세요

[응답 형식] JSON만 출력:
{
  "message": "추천 설명 (이미지 분석 내용 포함, 3-5문장)",
  "recommendations": [
    {"productId": "ID", "reason": "이유", "matchScore": 95}
  ],
  "reasoning": "추천 근거 (이미지 분석 결과 포함)",
  "suggestions": ["질문1", "질문2", "질문3"]
}

[규칙]
1. 실제 DB 제품만 추천
2. 최대 5개 제품
3. matchScore 70점 이상만
4. 한국어로 답변
5. 이미지가 있으면 반드시 분석 내용을 message에 포함`
            }
        ];

        conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                messages.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'assistant' && !msg.isError && !msg.isSystem) {
                messages.push({ role: 'assistant', content: msg.content });
            }
        });

        const currentMessage = {
            role: 'user',
            content: []
        };

        currentMessage.content.push({
            type: 'text',
            text: userQuery
        });

        if (imageUrl) {
            // 🔥 base64 이미지 처리
            console.log('📸 이미지 전송 시작');
            console.log('이미지 타입:', imageUrl.substring(0, 30) + '...');
            
            currentMessage.content.push({
                type: 'image_url',
                image_url: {
                    url: imageUrl, // base64 또는 URL 모두 지원
                    detail: 'high'
                }
            });
            
            console.log('✅ 이미지 OpenAI에 전달 완료');
        }

        messages.push(currentMessage);

        console.log('🚀 OpenAI API 호출 시작');
        console.log('메시지 개수:', messages.length);
        console.log('이미지 포함:', !!imageUrl);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages,
                max_tokens: 1500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ OpenAI API 에러:', errorData);
            throw new Error(errorData.error?.message || 'OpenAI API 호출 실패');
        }

        const data = await response.json();
        console.log('✅ OpenAI API 응답 성공');
        console.log('응답 내용:', data.choices[0].message.content.substring(0, 100) + '...');
        
        const aiResponseText = data.choices[0].message.content;

        try {
            const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('JSON 파싱 실패:', e);
        }

        return {
            message: aiResponseText,
            recommendations: [],
            reasoning: 'AI가 분석한 결과입니다.',
            suggestions: ['다른 제품 보기', '가격대 조정', '브랜드 변경']
        };
    };

    const matchProductsWithAI = (recommendations, allProducts) => {
        if (!recommendations || recommendations.length === 0) {
            return [];
        }

        const matchedProducts = [];

        recommendations.forEach(rec => {
            const product = allProducts.find(p => p.id === rec.productId);
            if (product) {
                matchedProducts.push({
                    ...product,
                    aiScore: rec.matchScore,
                    aiReason: rec.reason
                });
            }
        });

        return matchedProducts.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    };

    const handleSuggestionClick = (suggestion) => {
        setUserMessage(suggestion);
    };

    const handleFeedback = async (messageIndex, isPositive) => {
        try {
            const message = chatMessages[messageIndex];
            console.log('피드백:', {
                messageIndex,
                isPositive,
                content: message.content,
                timestamp: new Date()
            });
            alert(isPositive ? '좋은 평가 감사합니다! 👍' : '피드백 감사합니다. 개선하겠습니다! 🙏');
        } catch (error) {
            console.error('피드백 저장 실패:', error);
        }
    };

    const resetConversation = () => {
        setChatMessages([]);
        setAiSearchResults([]);
        setSearchContext(null);
        removeImage();
        setUserMessage('');
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
        
        const confirmMessage = {
            role: 'assistant',
            content: `✅ "${product.name}"을(를) 장바구니에 담았습니다!`,
            timestamp: new Date(),
            isSystem: true
        };
        setChatMessages(prev => [...prev, confirmMessage]);
    };

    const displayProducts = aiSearchResults.length > 0 ? aiSearchResults : products;

    // 🔥 최초 로딩 화면
    if (loading && allProducts.length === 0) {
        return (
            <div style={styles.loading}>
                <Loader size={40} className="spin" />
                <p>상품을 불러오는 중...</p>
            </div>
        );
    }

    // 🚧 점검중 화면
    if (!pageEnabled) {
        return (
            <div style={styles.maintenanceContainer}>
                <div style={styles.maintenanceBox}>
                    <Settings size={64} color="#f59e0b" />
                    <h1 style={styles.maintenanceTitle}>마켓플레이스 점검중</h1>
                    <p style={styles.maintenanceText}>
                        현재 마켓플레이스 페이지는 점검 중입니다.<br />
                        빠른 시일 내에 정상화하겠습니다.
                    </p>
                    <p style={styles.maintenanceSubtext}>
                        이용에 불편을 드려 죄송합니다.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={styles.maintenanceButton}
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.splitContainer}>
            {/* 🛍️ 왼쪽: 쇼핑몰 영역 (60%) */}
            <div style={{
                ...styles.shopArea,
                ...(isAIPanelCollapsed ? styles.shopAreaExpanded : {})
            }}>
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

                {/* 검색 결과 컨텍스트 */}
                {searchContext && aiSearchResults.length > 0 && (
                    <div style={styles.searchResultBanner}>
                        <CheckCircle size={16} color="#10b981" />
                        <span>
                            "{searchContext.query}"에 대한 {aiSearchResults.length}개 AI 추천 제품
                        </span>
                        <button 
                            style={styles.clearSearchButton}
                            onClick={() => {
                                setAiSearchResults([]);
                                setSearchContext(null);
                            }}
                        >
                            전체 제품 보기
                        </button>
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
                            autoComplete="off"
                        />
                        {/* 🔥 검색 중 인디케이터 */}
                        {searching && (
                            <Loader size={16} className="spin" color="#6366f1" />
                        )}
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
                <div style={styles.productsScrollArea}>
                    {displayProducts.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Package size={64} color="#cbd5e1" />
                            <h3 style={styles.emptyTitle}>상품이 없습니다</h3>
                            <p style={styles.emptyText}>
                                AI 어시스턴트에게 원하는 제품을 물어보세요!
                            </p>
                        </div>
                    ) : (
                        <div style={styles.productsGrid}>
                            {displayProducts.map(product => (
                                <div key={product.id} style={styles.productCard}>
                                    {product.aiScore && (
                                        <div style={styles.aiRecommendBadge}>
                                            <Sparkles size={12} />
                                            AI {product.aiScore}점
                                        </div>
                                    )}

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
                                        
                                        {product.aiReason && (
                                            <p style={styles.aiReasonBadge}>
                                                💡 {product.aiReason}
                                            </p>
                                        )}

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
                                                    <span>{product.sales}개</span>
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
                                            장바구니
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 🤖 오른쪽: AI 어시스턴트 영역 (40%) */}
            <div style={{
                ...styles.aiArea,
                ...(isAIPanelCollapsed ? styles.aiAreaCollapsed : {})
            }}>
                {/* 접기/펼치기 버튼 */}
                <button 
                    style={styles.collapseButton}
                    onClick={() => setIsAIPanelCollapsed(!isAIPanelCollapsed)}
                    title={isAIPanelCollapsed ? "AI 패널 열기" : "AI 패널 접기"}
                >
                    {isAIPanelCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>

                {!isAIPanelCollapsed && (
                    <>
                        {/* AI 헤더 */}
                        <div style={styles.aiHeader}>
                            <div style={styles.aiHeaderInfo}>
                                <Bot size={24} color="#6366f1" />
                                <div>
                                    <h3 style={styles.aiTitle}>
                                        AI 쇼핑 어시스턴트
                                        <span style={styles.aiStatusBadge}>
                                            <Zap size={12} />
                                            GPT-4
                                        </span>
                                    </h3>
                                    <p style={styles.aiSubtitle}>
                                        텍스트 + 이미지 통합 검색
                                    </p>
                                </div>
                            </div>
                            <button 
                                style={styles.resetButton}
                                onClick={resetConversation}
                                title="대화 초기화"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        {/* 채팅 메시지 */}
                        <div style={styles.chatMessages}>
                            {chatMessages.map((message, index) => (
                                <div
                                    key={index}
                                    style={{
                                        ...styles.messageWrapper,
                                        ...(message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper)
                                    }}
                                >
                                    <div style={styles.messageAvatar}>
                                        {message.role === 'user' ? (
                                            <UserIcon size={20} color="#6366f1" />
                                        ) : (
                                            <Bot size={20} color="#10b981" />
                                        )}
                                    </div>

                                    <div style={styles.messageContent}>
                                        <div
                                            style={{
                                                ...styles.messageBubble,
                                                ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
                                                ...(message.isError ? styles.errorMessage : {}),
                                                ...(message.isSystem ? styles.systemMessage : {})
                                            }}
                                        >
                                            {message.image && (
                                                <img 
                                                    src={message.image} 
                                                    alt="업로드"
                                                    style={styles.messageImage}
                                                />
                                            )}

                                            <p style={styles.messageText}>{message.content}</p>

                                            {message.reasoning && (
                                                <details style={styles.reasoningDetails}>
                                                    <summary style={styles.reasoningSummary}>
                                                        💡 AI 분석
                                                    </summary>
                                                    <p style={styles.reasoningText}>{message.reasoning}</p>
                                                </details>
                                            )}

                                            {message.products && message.products.length > 0 && (
                                                <div style={styles.miniProductsGrid}>
                                                    {message.products.slice(0, 3).map(product => (
                                                        <div key={product.id} style={styles.miniProductCard}>
                                                            <img 
                                                                src={product.images?.[0] || product.imageUrl || '/placeholder.png'}
                                                                alt={product.name}
                                                                style={styles.miniProductImage}
                                                            />
                                                            <div style={styles.miniProductInfo}>
                                                                <p style={styles.miniProductName}>{product.name}</p>
                                                                <p style={styles.miniProductPrice}>
                                                                    {product.price?.toLocaleString()}원
                                                                </p>
                                                                {product.aiScore && (
                                                                    <span style={styles.miniAiScore}>
                                                                        {product.aiScore}점
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {message.suggestions && message.suggestions.length > 0 && (
                                                <div style={styles.suggestions}>
                                                    {message.suggestions.map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            style={styles.suggestionButton}
                                                            onClick={() => handleSuggestionClick(suggestion)}
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {message.role === 'assistant' && !message.isSystem && (
                                            <div style={styles.feedbackButtons}>
                                                <button
                                                    style={styles.feedbackButton}
                                                    onClick={() => handleFeedback(index, true)}
                                                >
                                                    <ThumbsUp size={14} />
                                                </button>
                                                <button
                                                    style={styles.feedbackButton}
                                                    onClick={() => handleFeedback(index, false)}
                                                >
                                                    <ThumbsDown size={14} />
                                                </button>
                                            </div>
                                        )}

                                        <span style={styles.messageTime}>
                                            {message.timestamp.toLocaleTimeString('ko-KR', { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {aiThinking && (
                                <div style={styles.thinkingIndicator}>
                                    <Bot size={20} color="#10b981" />
                                    <div style={styles.thinkingDots}>
                                        <span style={styles.dot}></span>
                                        <span style={styles.dot}></span>
                                        <span style={styles.dot}></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 입력 영역 */}
                        <div style={styles.chatInputArea}>
                            {imagePreview && (
                                <div style={styles.imagePreviewContainer}>
                                    <img 
                                        src={imagePreview} 
                                        alt="업로드 예정"
                                        style={styles.imagePreviewSmall}
                                    />
                                    <button 
                                        style={styles.removeImageButton}
                                        onClick={removeImage}
                                    >
                                        <X size={16} />
                                    </button>
                                    <div style={styles.imageReadyBadge}>
                                        <Camera size={12} />
                                        <span>이미지 분석 준비됨</span>
                                    </div>
                                </div>
                            )}

                            <div style={styles.chatInputWrapper}>
                                <label 
                                    style={styles.imageUploadButton}
                                    title="이미지로 제품 찾기 (GPT-4 Vision)"
                                >
                                    <Camera size={20} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                </label>

                                <input
                                    type="text"
                                    value={userMessage}
                                    onChange={(e) => setUserMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={imagePreview ? "이미지에 대해 질문하세요..." : "제품 검색..."}
                                    style={styles.chatInput}
                                    disabled={aiThinking}
                                />

                                <button
                                    style={{
                                        ...styles.sendButton,
                                        ...(aiThinking ? styles.sendButtonDisabled : {})
                                    }}
                                    onClick={handleSendMessage}
                                    disabled={aiThinking}
                                    title={imagePreview ? "이미지 분석하기" : "검색하기"}
                                >
                                    {aiThinking ? (
                                        <Loader size={20} className="spin" />
                                    ) : (
                                        <Send size={20} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes bounce {
                    0%, 80%, 100% { 
                        transform: scale(0.8);
                        opacity: 0.5;
                    }
                    40% { 
                        transform: scale(1.2);
                        opacity: 1;
                    }
                }
                
                /* 호버 효과 */
                input[type="text"]:focus {
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                label:hover {
                    opacity: 0.8;
                    transform: scale(1.05);
                    transition: all 0.2s;
                }
            `}</style>
        </div>
    );
}

const styles = {
    // 🎨 분할 레이아웃
    splitContainer: {
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
    },
    shopArea: {
        flex: '0 0 60%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '24px',
        transition: 'all 0.3s ease',
    },
    shopAreaExpanded: {
        flex: '0 0 95%',
    },
    aiArea: {
        flex: '0 0 40%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        borderLeft: '2px solid #e2e8f0',
        position: 'relative',
        transition: 'all 0.3s ease',
    },
    aiAreaCollapsed: {
        flex: '0 0 50px',
    },
    collapseButton: {
        position: 'absolute',
        left: '-12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '24px',
        height: '60px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '6px 0 0 6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
    },
    // 쇼핑몰 영역
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexShrink: 0,
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
    searchResultBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        backgroundColor: '#d1fae5',
        borderRadius: '12px',
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#065f46',
        flexShrink: 0,
    },
    clearSearchButton: {
        marginLeft: 'auto',
        padding: '6px 12px',
        backgroundColor: 'white',
        color: '#065f46',
        border: '1px solid #a7f3d0',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    filterSection: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexShrink: 0,
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
    },
    categories: {
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '8px',
        flexShrink: 0,
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
    productsScrollArea: {
        flex: 1,
        overflowY: 'auto',
        paddingRight: '8px',
    },
    productsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '20px',
    },
    productCard: {
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s',
        cursor: 'pointer',
    },
    aiRecommendBadge: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '700',
        zIndex: 1,
    },
    productImage: {
        width: '100%',
        height: '200px',
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
        padding: '14px',
    },
    productBrand: {
        margin: '0 0 4px 0',
        fontSize: '11px',
        fontWeight: '600',
        color: '#6366f1',
        textTransform: 'uppercase',
    },
    productName: {
        margin: '0 0 8px 0',
        fontSize: '14px',
        fontWeight: '700',
        color: '#1e293b',
        lineHeight: '1.4',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    aiReasonBadge: {
        margin: '0 0 10px 0',
        padding: '6px 10px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderRadius: '6px',
        fontSize: '11px',
        lineHeight: '1.4',
    },
    productMeta: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
    },
    rating: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#64748b',
    },
    sales: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#64748b',
    },
    productPrice: {
        marginBottom: '10px',
    },
    price: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
    },
    addToCartButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
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
    // AI 영역
    aiHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '2px solid #f1f5f9',
        flexShrink: 0,
    },
    aiHeaderInfo: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    aiTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    aiStatusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        fontSize: '10px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        borderRadius: '6px',
    },
    aiSubtitle: {
        margin: '4px 0 0 0',
        fontSize: '12px',
        color: '#64748b',
    },
    resetButton: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#64748b',
        transition: 'all 0.2s',
    },
    chatMessages: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    messageWrapper: {
        display: 'flex',
        gap: '10px',
    },
    userMessageWrapper: {
        flexDirection: 'row-reverse',
    },
    assistantMessageWrapper: {
        flexDirection: 'row',
    },
    messageAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    messageContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    messageBubble: {
        padding: '10px 14px',
        borderRadius: '12px',
        maxWidth: '90%',
    },
    userMessage: {
        backgroundColor: '#6366f1',
        color: 'white',
        marginLeft: 'auto',
    },
    assistantMessage: {
        backgroundColor: '#f8fafc',
        color: '#1e293b',
        border: '1px solid #e2e8f0',
    },
    errorMessage: {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fecaca',
    },
    systemMessage: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: '1px solid #a7f3d0',
    },
    messageImage: {
        maxWidth: '100%',
        borderRadius: '8px',
        marginBottom: '8px',
    },
    messageText: {
        margin: 0,
        fontSize: '13px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
    },
    reasoningDetails: {
        marginTop: '8px',
        fontSize: '12px',
    },
    reasoningSummary: {
        cursor: 'pointer',
        color: '#6366f1',
        fontWeight: '600',
        fontSize: '12px',
    },
    reasoningText: {
        margin: '6px 0 0 0',
        fontSize: '12px',
        color: '#64748b',
        fontStyle: 'italic',
    },
    miniProductsGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '10px',
    },
    miniProductCard: {
        display: 'flex',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
    },
    miniProductImage: {
        width: '50px',
        height: '50px',
        objectFit: 'cover',
        borderRadius: '6px',
        flexShrink: 0,
    },
    miniProductInfo: {
        flex: 1,
    },
    miniProductName: {
        margin: '0 0 4px 0',
        fontSize: '12px',
        fontWeight: '600',
        color: '#1e293b',
    },
    miniProductPrice: {
        margin: 0,
        fontSize: '13px',
        fontWeight: '700',
        color: '#6366f1',
    },
    miniAiScore: {
        fontSize: '10px',
        fontWeight: '700',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        padding: '2px 6px',
        borderRadius: '4px',
        marginTop: '4px',
        display: 'inline-block',
    },
    suggestions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '10px',
    },
    suggestionButton: {
        padding: '5px 10px',
        backgroundColor: 'white',
        color: '#6366f1',
        border: '1px solid #c7d2fe',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    feedbackButtons: {
        display: 'flex',
        gap: '8px',
        marginTop: '4px',
    },
    feedbackButton: {
        padding: '4px 8px',
        backgroundColor: 'transparent',
        color: '#94a3b8',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
    },
    messageTime: {
        fontSize: '10px',
        color: '#94a3b8',
    },
    thinkingIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    thinkingDots: {
        display: 'flex',
        gap: '4px',
    },
    dot: {
        width: '6px',
        height: '6px',
        backgroundColor: '#6366f1',
        borderRadius: '50%',
        animation: 'bounce 1.4s infinite ease-in-out',
    },
    chatInputArea: {
        padding: '16px 20px',
        borderTop: '2px solid #f1f5f9',
        backgroundColor: 'white',
        flexShrink: 0,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: '10px',
        display: 'inline-block',
    },
    imagePreviewSmall: {
        width: '70px',
        height: '70px',
        objectFit: 'cover',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
    },
    removeImageButton: {
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
    },
    imageReadyBadge: {
        position: 'absolute',
        bottom: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: '#10b981',
        color: 'white',
        fontSize: '10px',
        fontWeight: '600',
        borderRadius: '12px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    chatInputWrapper: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
    },
    imageUploadButton: {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#64748b',
        transition: 'all 0.2s',
        flexShrink: 0,
    },
    chatInput: {
        flex: 1,
        padding: '10px 14px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '13px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    sendButton: {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
    },
    sendButtonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    // 점검중 화면
    maintenanceContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '20px',
    },
    maintenanceBox: {
        maxWidth: '500px',
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '48px 32px',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e2e8f0',
    },
    maintenanceTitle: {
        margin: '24px 0 16px',
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    maintenanceText: {
        margin: '0 0 12px',
        fontSize: '16px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    maintenanceSubtext: {
        margin: '0 0 32px',
        fontSize: '14px',
        color: '#94a3b8',
    },
    maintenanceButton: {
        padding: '12px 32px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default Marketplace;