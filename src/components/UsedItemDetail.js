import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { 
    ArrowLeft, Eye, Calendar, MapPin, Phone, Mail, 
    Building2, Package, DollarSign, ChevronLeft, ChevronRight,
    Edit, Trash2, AlertCircle, MessageCircle, Share2,
    CheckCircle
} from 'lucide-react';
import './UsedItemDetail.css';

function UsedItemDetail() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showContactInfo, setShowContactInfo] = useState(false);

    useEffect(() => {
        loadUserData();
        loadItemDetail();
        incrementViews();
    }, [itemId]);

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

    const loadItemDetail = async () => {
        try {
            setLoading(true);
            const itemDoc = await getDoc(doc(db, 'usedItems', itemId));
            
            if (itemDoc.exists()) {
                setItem({ id: itemDoc.id, ...itemDoc.data() });
            } else {
                alert('물품을 찾을 수 없습니다.');
                navigate('/used-items');
            }
        } catch (error) {
            console.error('물품 로드 실패:', error);
            alert('물품 정보를 불러오는데 실패했습니다.');
            navigate('/used-items');
        } finally {
            setLoading(false);
        }
    };

    const incrementViews = async () => {
        try {
            await updateDoc(doc(db, 'usedItems', itemId), {
                views: increment(1)
            });
        } catch (error) {
            console.error('조회수 증가 실패:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'usedItems', itemId));
            alert('✅ 물품이 삭제되었습니다.');
            navigate('/used-items');
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `${item.title} - ${formatPrice(item.price)}원`,
                    url: url
                });
            } catch (error) {
                console.log('공유 취소');
            }
        } else {
            // 클립보드에 복사
            try {
                await navigator.clipboard.writeText(url);
                alert('링크가 복사되었습니다!');
            } catch (error) {
                alert('링크 복사에 실패했습니다.');
            }
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getConditionBadge = (condition) => {
        const badges = {
            '최상': { color: '#10b981', text: '최상' },
            '좋음': { color: '#3b82f6', text: '좋음' },
            '보통': { color: '#f59e0b', text: '보통' },
            '수리필요': { color: '#ef4444', text: '수리필요' }
        };
        return badges[condition] || badges['보통'];
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => 
            prev === item.images.length - 1 ? 0 : prev + 1
        );
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => 
            prev === 0 ? item.images.length - 1 : prev - 1
        );
    };

    const isOwner = userData && item && userData.uid === item.sellerId;

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>물품 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (!item) {
        return null;
    }

    return (
        <div className="item-detail-container">
            {/* 헤더 */}
            <div className="detail-header">
                <button 
                    className="back-btn"
                    onClick={() => navigate('/used-items')}
                >
                    <ArrowLeft size={20} />
                    목록으로
                </button>
                <div className="header-actions">
                    <button className="action-btn" onClick={handleShare}>
                        <Share2 size={20} />
                        공유
                    </button>
                    {isOwner && (
                        <>
                            <button 
                                className="action-btn"
                                onClick={() => navigate(`/used-items/edit/${itemId}`)}
                            >
                                <Edit size={20} />
                                수정
                            </button>
                            <button 
                                className="action-btn danger"
                                onClick={handleDelete}
                            >
                                <Trash2 size={20} />
                                삭제
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="detail-content">
                {/* 이미지 갤러리 */}
                <div className="image-gallery">
                    {item.images && item.images.length > 0 ? (
                        <>
                            <div className="main-image">
                                <img 
                                    src={item.images[currentImageIndex]} 
                                    alt={item.title} 
                                />
                                {item.images.length > 1 && (
                                    <>
                                        <button 
                                            className="nav-btn prev"
                                            onClick={prevImage}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button 
                                            className="nav-btn next"
                                            onClick={nextImage}
                                        >
                                            <ChevronRight size={24} />
                                        </button>
                                        <div className="image-counter">
                                            {currentImageIndex + 1} / {item.images.length}
                                        </div>
                                    </>
                                )}
                            </div>
                            {item.images.length > 1 && (
                                <div className="thumbnail-list">
                                    {item.images.map((img, index) => (
                                        <img
                                            key={index}
                                            src={img}
                                            alt={`${item.title} ${index + 1}`}
                                            className={currentImageIndex === index ? 'active' : ''}
                                            onClick={() => setCurrentImageIndex(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-image">
                            <Package size={64} color="#cbd5e1" />
                            <p>이미지 없음</p>
                        </div>
                    )}
                </div>

                {/* 물품 정보 */}
                <div className="item-details">
                    {/* 가격 및 상태 */}
                    <div className="price-section">
                        <div className="price">
                            {formatPrice(item.price)}원
                            {item.negotiable && (
                                <span className="negotiable">협상가능</span>
                            )}
                        </div>
                        <div 
                            className="condition-badge"
                            style={{ backgroundColor: getConditionBadge(item.condition).color }}
                        >
                            {getConditionBadge(item.condition).text}
                        </div>
                    </div>

                    {/* 제목 */}
                    <h1>{item.title}</h1>

                    {/* 메타 정보 */}
                    <div className="meta-info">
                        <span>
                            <Package size={16} />
                            {item.category}
                        </span>
                        <span>
                            <Eye size={16} />
                            조회 {item.views || 0}
                        </span>
                        <span>
                            <Calendar size={16} />
                            {formatDate(item.createdAt)}
                        </span>
                    </div>

                    {/* 구분선 */}
                    <div className="divider"></div>

                    {/* 상세 설명 */}
                    <div className="description-section">
                        <h3>상세 설명</h3>
                        <p>{item.description}</p>
                    </div>

                    {/* 거래 정보 */}
                    {item.location && (
                        <div className="location-section">
                            <h3>
                                <MapPin size={20} />
                                거래 지역
                            </h3>
                            <p>{item.location}</p>
                        </div>
                    )}

                    {/* 구분선 */}
                    <div className="divider"></div>

                    {/* 판매자 정보 */}
                    <div className="seller-section">
                        <h3>판매자 정보</h3>
                        <div className="seller-info">
                            <div className="seller-icon">
                                <Building2 size={24} />
                            </div>
                            <div className="seller-details">
                                <div className="seller-name">{item.sellerName}</div>
                                <div className="seller-type">
                                    {item.sellerType === 'dental' ? '치과' : '기공소'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 연락하기 버튼 */}
                    {!isOwner && (
                        <div className="contact-section">
                            {!showContactInfo ? (
                                <button 
                                    className="contact-btn"
                                    onClick={() => setShowContactInfo(true)}
                                >
                                    <MessageCircle size={20} />
                                    판매자에게 연락하기
                                </button>
                            ) : (
                                <div className="contact-info">
                                    <div className="contact-info-header">
                                        <CheckCircle size={20} color="#10b981" />
                                        <span>연락처가 공개되었습니다</span>
                                    </div>
                                    <div className="contact-details">
                                        {item.contactPhone && (
                                            <a 
                                                href={`tel:${item.contactPhone}`}
                                                className="contact-link"
                                            >
                                                <Phone size={18} />
                                                {item.contactPhone}
                                            </a>
                                        )}
                                        {item.contactEmail && (
                                            <a 
                                                href={`mailto:${item.contactEmail}`}
                                                className="contact-link"
                                            >
                                                <Mail size={18} />
                                                {item.contactEmail}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 안내 사항 */}
                    <div className="warning-box">
                        <AlertCircle size={20} />
                        <div>
                            <strong>안전거래 유의사항</strong>
                            <ul>
                                <li>직접 만나서 거래하는 것을 권장합니다</li>
                                <li>선입금 요구 시 사기일 수 있으니 주의하세요</li>
                                <li>물품 상태를 꼼꼼히 확인 후 거래하세요</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    }
};

export default UsedItemDetail;