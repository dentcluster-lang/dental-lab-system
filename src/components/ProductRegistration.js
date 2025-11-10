import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Package, Upload, X, DollarSign, Hash, AlignLeft, Tag } from 'lucide-react';

const ProductRegistration = ({ userInfo }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'impression',
        price: '',
        stock: '',
        unit: 'EA',
        description: '',
        features: '',
        specifications: '',
        images: []
    });
    const [imagePreviews, setImagePreviews] = useState([]);

    useEffect(() => {
        // ✅ A안: businessType 체크 제거 - sellerStatus만 확인
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            window.location.href = '/signin';
            return;
        }

        // ✅ 권한 체크: 직원이면서 일반 staff는 접근 불가
        if (userInfo.companyId && userInfo.role !== 'owner' && userInfo.role !== 'manager') {
            alert('상품 등록은 관리자만 가능합니다.');
            window.location.href = '/dashboard';
            return;
        }

        if (userInfo.sellerStatus !== 'approved') {
            alert('판매자 승인 후 상품 등록이 가능합니다.');
            window.location.href = '/seller-application';
            return;
        }
    }, [userInfo]);

    const categories = [
        { value: 'impression', label: '인상재' },
        { value: 'crown', label: '크라운/브릿지' },
        { value: 'denture', label: '의치' },
        { value: 'implant', label: '임플란트' },
        { value: 'orthodontic', label: '교정' },
        { value: 'ceramic', label: '세라믹' },
        { value: 'metal', label: '금속재료' },
        { value: 'equipment', label: '장비/기구' },
        { value: 'consumable', label: '소모품' },
        { value: 'other', label: '기타' }
    ];

    const units = [
        { value: 'EA', label: '개' },
        { value: 'BOX', label: '박스' },
        { value: 'SET', label: '세트' },
        { value: 'KG', label: 'kg' },
        { value: 'G', label: 'g' },
        { value: 'ML', label: 'ml' },
        { value: 'L', label: 'L' }
    ];

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        
        if (formData.images.length + files.length > 5) {
            alert('이미지는 최대 5개까지 등록 가능합니다.');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name}은(는) 5MB를 초과합니다.`);
                return false;
            }
            if (!file.type.startsWith('image/')) {
                alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
                return false;
            }
            return true;
        });

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...validFiles]
        }));

        // 미리보기 생성
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.stock) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        if (formData.images.length === 0) {
            alert('최소 1개의 상품 이미지를 등록해주세요.');
            return;
        }

        setLoading(true);

        try {
            // 이미지 업로드
            const imageUrls = [];
            for (const image of formData.images) {
                const imageRef = ref(storage, `products/${userInfo.uid}/${Date.now()}_${image.name}`);
                await uploadBytes(imageRef, image);
                const url = await getDownloadURL(imageRef);
                imageUrls.push(url);
            }

            // 상품 정보 저장
            await addDoc(collection(db, 'marketplaceProducts'), {
                sellerId: userInfo.uid,
                sellerName: userInfo.businessName || userInfo.name || userInfo.email,
                sellerType: userInfo.businessType, // dental, lab, supplier 모두 가능
                name: formData.name,
                category: formData.category,
                price: parseInt(formData.price),
                stock: parseInt(formData.stock),
                unit: formData.unit,
                description: formData.description,
                features: formData.features,
                specifications: formData.specifications,
                images: imageUrls,
                status: 'active',
                viewCount: 0,
                likeCount: 0,
                orderCount: 0,
                rating: 0,
                reviewCount: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            alert('상품이 등록되었습니다!');
            
            // 폼 초기화
            setFormData({
                name: '',
                category: 'impression',
                price: '',
                stock: '',
                unit: 'EA',
                description: '',
                features: '',
                specifications: '',
                images: []
            });
            setImagePreviews([]);

            // 상품 관리 페이지로 이동
            window.location.href = '/product-management';

        } catch (error) {
            console.error('상품 등록 오류:', error);
            alert('상품 등록 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Package size={32} color="#6366f1" />
                <div>
                    <h1 style={styles.title}>상품 등록</h1>
                    <p style={styles.subtitle}>마켓플레이스에 판매할 상품을 등록하세요</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* 기본 정보 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>기본 정보</h2>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            <Package size={18} />
                            상품명 *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            style={styles.input}
                            placeholder="상품명을 입력하세요"
                            required
                        />
                    </div>

                    <div style={styles.row}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                <Tag size={18} />
                                카테고리 *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                style={styles.select}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                <DollarSign size={18} />
                                가격 (원) *
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                style={styles.input}
                                placeholder="0"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.row}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                <Hash size={18} />
                                재고 수량 *
                            </label>
                            <input
                                type="number"
                                value={formData.stock}
                                onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                                style={styles.input}
                                placeholder="0"
                                min="0"
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                단위
                            </label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                style={styles.select}
                            >
                                {units.map(unit => (
                                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 상품 설명 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>상품 설명</h2>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            <AlignLeft size={18} />
                            상세 설명
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            style={styles.textarea}
                            placeholder="상품에 대한 자세한 설명을 입력하세요"
                            rows="5"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            주요 특징
                        </label>
                        <textarea
                            value={formData.features}
                            onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                            style={styles.textarea}
                            placeholder="예: 높은 정밀도, 우수한 강도, 빠른 경화시간"
                            rows="3"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            제품 사양
                        </label>
                        <textarea
                            value={formData.specifications}
                            onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                            style={styles.textarea}
                            placeholder="예: 용량: 50ml, 경화시간: 3분, 보관온도: 5-25°C"
                            rows="3"
                        />
                    </div>
                </div>

                {/* 상품 이미지 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>상품 이미지 *</h2>
                    <p style={styles.imageHelp}>
                        최소 1개, 최대 5개까지 등록 가능 | 각 이미지 최대 5MB
                    </p>

                    <input
                        type="file"
                        onChange={handleImageChange}
                        style={styles.fileInput}
                        accept="image/*"
                        multiple
                        id="imageUpload"
                    />
                    <label htmlFor="imageUpload" style={styles.uploadButton}>
                        <Upload size={20} />
                        이미지 선택 ({formData.images.length}/5)
                    </label>

                    {imagePreviews.length > 0 && (
                        <div style={styles.imageGrid}>
                            {imagePreviews.map((preview, index) => (
                                <div key={index} style={styles.imagePreview}>
                                    <img src={preview} alt={`미리보기 ${index + 1}`} style={styles.previewImage} />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        style={styles.removeButton}
                                    >
                                        <X size={16} />
                                    </button>
                                    {index === 0 && (
                                        <div style={styles.mainBadge}>대표</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 제출 버튼 */}
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                        ...styles.submitButton,
                        opacity: loading ? 0.6 : 1,
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? '등록 중...' : '상품 등록하기'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '24px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '4px 0 0 0',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        paddingBottom: '12px',
        borderBottom: '1px solid #e2e8f0',
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#334155',
    },
    input: {
        padding: '12px 16px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    select: {
        padding: '12px 16px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s',
        backgroundColor: 'white',
        cursor: 'pointer',
    },
    textarea: {
        padding: '12px 16px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        resize: 'vertical',
    },
    imageHelp: {
        fontSize: '13px',
        color: '#64748b',
        margin: 0,
    },
    fileInput: {
        display: 'none',
    },
    uploadButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        border: '2px dashed #c7d2fe',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: 'fit-content',
    },
    imageGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '16px',
        marginTop: '16px',
    },
    imagePreview: {
        position: 'relative',
        aspectRatio: '1',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    removeButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    mainBadge: {
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '700',
        color: 'white',
        backgroundColor: '#6366f1',
        borderRadius: '4px',
    },
    submitButton: {
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
};

export default ProductRegistration;