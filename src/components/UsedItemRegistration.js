import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase/config';
import { 
    ArrowLeft, Camera, X, MapPin, Check, Loader2
} from 'lucide-react';
import './UsedItemRegistration.css';

function UsedItemRegistration() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // 심플한 폼 데이터
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        price: '',
        negotiable: false,
        description: '',
        location: '',
        contactPhone: ''
    });

    // 이미지 관련
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    // 카테고리 목록 (간소화)
    const categories = [
        '체어 유닛',
        '엑스레이 장비',
        '핸드피스',
        '광중합기',
        '스케일러',
        '컴프레서',
        '기타 장비',
        '재료/소모품'
    ];

    const loadUserData = useCallback(async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('로그인이 필요합니다.');
                navigate('/login');
                return;
            }

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = { uid: user.uid, ...userDoc.data() };
                setUserData(data);

                // 권한 확인
                const businessType = data.businessType;
                if (businessType !== 'dental' && businessType !== 'clinic' && businessType !== 'lab') {
                    alert('중고물품 등록은 치과/기공소만 가능합니다.');
                    navigate('/used-items');
                    return;
                }

                // 연락처와 위치 자동 입력
                setFormData(prev => ({
                    ...prev,
                    contactPhone: data.contactPhone || '',
                    location: data.location || ''
                }));
            }
            setLoading(false);
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
            alert('사용자 정보를 불러오는데 실패했습니다.');
            navigate('/used-items');
        }
    }, [navigate]);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    // 입력 핸들러
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // 가격 포맷팅
    const handlePriceChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        setFormData(prev => ({
            ...prev,
            price: value
        }));
    };

    const formatPrice = (price) => {
        if (!price) return '';
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 이미지 선택
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        
        if (imageFiles.length + files.length > 5) {
            alert('사진은 최대 5장까지 등록 가능합니다.');
            return;
        }

        // 파일 크기 체크 (각 5MB)
        const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            alert('각 사진은 5MB 이하여야 합니다.');
            return;
        }

        // 파일 추가
        const newFiles = [...imageFiles, ...files];
        setImageFiles(newFiles);

        // 미리보기 생성
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    // 이미지 제거
    const removeImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // 이미지 업로드
    const uploadImages = async () => {
        const uploadPromises = imageFiles.map(async (file, index) => {
            const fileName = `used-items/${userData.uid}/${Date.now()}_${index}_${file.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        });

        return await Promise.all(uploadPromises);
    };

    // 제출
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 간단한 유효성 검증
        if (!formData.title.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }
        if (!formData.category) {
            alert('카테고리를 선택해주세요.');
            return;
        }
        if (!formData.price || formData.price <= 0) {
            alert('가격을 입력해주세요.');
            return;
        }
        if (imageFiles.length === 0) {
            alert('사진을 1장 이상 등록해주세요.');
            return;
        }

        try {
            setSubmitting(true);

            // 이미지 업로드
            const imageUrls = await uploadImages();

            // Firestore에 저장
            const itemData = {
                ...formData,
                price: parseInt(formData.price),
                images: imageUrls,
                sellerId: userData.uid,
                sellerName: userData.businessName || userData.name,
                sellerType: userData.businessType,
                status: 'active',
                views: 0,
                favoriteCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'usedItems'), itemData);
            
            alert('✅ 등록이 완료되었습니다!');
            navigate(`/used-items/${docRef.id}`);
        } catch (error) {
            console.error('등록 실패:', error);
            alert('등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="simple-loading">
                <Loader2 className="spinner" size={32} />
                <p>잠시만 기다려주세요...</p>
            </div>
        );
    }

    return (
        <div className="simple-registration">
            {/* 헤더 */}
            <div className="simple-header">
                <button 
                    className="back-btn"
                    onClick={() => navigate('/used-items')}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1>중고물품 등록</h1>
                <div style={{ width: 44 }}></div>
            </div>

            {/* 폼 */}
            <form className="simple-form" onSubmit={handleSubmit}>
                {/* 사진 업로드 */}
                <div className="photo-section">
                    <div className="photo-list">
                        {/* 사진 추가 버튼 */}
                        <label className="add-photo-btn">
                            <Camera size={24} />
                            <span>{imagePreviews.length}/5</span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                                disabled={imagePreviews.length >= 5}
                            />
                        </label>

                        {/* 업로드된 사진들 */}
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="photo-item">
                                <img src={preview} alt={`사진 ${index + 1}`} />
                                {index === 0 && <span className="badge">대표사진</span>}
                                <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={() => removeImage(index)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="photo-help">* 사진은 최대 5장까지 등록 가능합니다</p>
                </div>

                {/* 제목 */}
                <div className="input-group">
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="제목"
                        maxLength={40}
                        required
                    />
                </div>

                {/* 카테고리 */}
                <div className="input-group">
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">카테고리 선택</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* 가격 */}
                <div className="input-group">
                    <div className="price-input">
                        <span className="won">₩</span>
                        <input
                            type="text"
                            name="price"
                            value={formatPrice(formData.price)}
                            onChange={handlePriceChange}
                            placeholder="가격을 입력하세요"
                            required
                        />
                    </div>
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            name="negotiable"
                            checked={formData.negotiable}
                            onChange={handleInputChange}
                        />
                        <span>가격 제안받기</span>
                    </label>
                </div>

                {/* 설명 */}
                <div className="input-group">
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="중고물품에 대한 설명을 작성해주세요.&#10;&#10;구매시기, 사용감, 하자 여부 등을 꼭 포함해주세요!"
                        rows={6}
                    />
                </div>

                {/* 거래 희망 장소 */}
                <div className="input-group">
                    <div className="location-input">
                        <MapPin size={20} />
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            placeholder="거래 희망 장소"
                        />
                    </div>
                </div>

                {/* 연락처 */}
                <div className="input-group">
                    <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        placeholder="연락처 (구매자가 연락할 번호)"
                        required
                    />
                </div>

                {/* 안내 */}
                <div className="notice">
                    <p>💡 실제 사진과 정확한 정보를 입력해주세요</p>
                    <p>💡 허위 매물은 제재 대상이 될 수 있습니다</p>
                </div>

                {/* 제출 버튼 */}
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting || imageFiles.length === 0}
                >
                    {submitting ? (
                        <>
                            <Loader2 size={20} className="spinner" />
                            등록 중...
                        </>
                    ) : (
                        <>
                            <Check size={20} />
                            완료
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

export default UsedItemRegistration;