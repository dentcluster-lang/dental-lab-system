import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Package, Upload, X, DollarSign, Hash, AlignLeft, Tag, ArrowLeft } from 'lucide-react';

const ProductEdit = ({ userInfo, match }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'impression',
        price: '',
        stock: '',
        unit: 'EA',
        description: '',
        features: '',
        specifications: '',
        existingImages: [], // 기존 이미지 URL들
        newImages: [] // 새로 추가할 이미지 파일들
    });
    const [imagePreviews, setImagePreviews] = useState([]); // 기존 + 새 이미지 미리보기

    // URL에서 productId 가져오기
    const productId = match?.params?.id || window.location.pathname.split('/').pop();

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

    const loadProduct = useCallback(async () => {
        try {
            setLoading(true);
            const docRef = doc(db, 'marketplaceProducts', productId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert('상품을 찾을 수 없습니다.');
                window.location.href = '/product-management';
                return;
            }

            const productData = { id: docSnap.id, ...docSnap.data() };

            // 권한 체크: 본인의 상품만 수정 가능
            if (productData.sellerId !== userInfo.uid) {
                alert('본인의 상품만 수정할 수 있습니다.');
                window.location.href = '/product-management';
                return;
            }

            setFormData({
                name: productData.name || '',
                category: productData.category || 'impression',
                price: productData.price?.toString() || '',
                stock: productData.stock?.toString() || '',
                unit: productData.unit || 'EA',
                description: productData.description || '',
                features: productData.features || '',
                specifications: productData.specifications || '',
                existingImages: productData.images || [],
                newImages: []
            });
            setImagePreviews(productData.images || []);

        } catch (error) {
            console.error('상품 로딩 오류:', error);
            alert('상품 정보를 불러오는데 실패했습니다.');
            window.location.href = '/product-management';
        } finally {
            setLoading(false);
        }
    }, [productId, userInfo]);

    useEffect(() => {
        if (!userInfo) {
            alert('로그인이 필요합니다.');
            window.location.href = '/signin';
            return;
        }

        if (userInfo.companyId && userInfo.role !== 'owner' && userInfo.role !== 'manager') {
            alert('상품 수정은 관리자만 가능합니다.');
            window.location.href = '/dashboard';
            return;
        }

        if (userInfo.sellerStatus !== 'approved') {
            alert('판매자 승인 후 이용 가능합니다.');
            window.location.href = '/seller-application';
            return;
        }

        loadProduct();
    }, [userInfo, loadProduct]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        
        const totalImages = formData.existingImages.length + formData.newImages.length + files.length;
        if (totalImages > 5) {
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
            newImages: [...prev.newImages, ...validFiles]
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

    const removeExistingImage = (index) => {
        setFormData(prev => ({
            ...prev,
            existingImages: prev.existingImages.filter((_, i) => i !== index)
        }));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index) => {
        const newImageStartIndex = formData.existingImages.length;
        const actualIndex = index - newImageStartIndex;
        
        setFormData(prev => ({
            ...prev,
            newImages: prev.newImages.filter((_, i) => i !== actualIndex)
        }));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeImage = (index) => {
        if (index < formData.existingImages.length) {
            removeExistingImage(index);
        } else {
            removeNewImage(index);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.stock) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        const totalImages = formData.existingImages.length + formData.newImages.length;
        if (totalImages === 0) {
            alert('최소 1개의 상품 이미지를 등록해주세요.');
            return;
        }

        setSaving(true);

        try {
            // 새 이미지 업로드
            const newImageUrls = [];
            for (const image of formData.newImages) {
                const imageRef = ref(storage, `products/${userInfo.uid}/${Date.now()}_${image.name}`);
                await uploadBytes(imageRef, image);
                const url = await getDownloadURL(imageRef);
                newImageUrls.push(url);
            }

            // 최종 이미지 배열 = 기존 이미지 + 새 이미지
            const finalImages = [...formData.existingImages, ...newImageUrls];

            // 상품 정보 업데이트
            await updateDoc(doc(db, 'marketplaceProducts', productId), {
                name: formData.name,
                category: formData.category,
                price: parseInt(formData.price),
                stock: parseInt(formData.stock),
                unit: formData.unit,
                description: formData.description,
                features: formData.features,
                specifications: formData.specifications,
                images: finalImages,
                updatedAt: Timestamp.now()
            });

            alert('상품이 수정되었습니다!');
            window.location.href = '/product-management';

        } catch (error) {
            console.error('상품 수정 오류:', error);
            alert('상품 수정 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>상품 정보를 불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button 
                        style={styles.backButton}
                        onClick={() => window.location.href = '/product-management'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <Package size={32} color="#6366f1" />
                    <div>
                        <h1 style={styles.title}>상품 수정</h1>
                        <p style={styles.subtitle}>상품 정보를 수정하세요</p>
                    </div>
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
                                재고 *
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
                                <Tag size={18} />
                                단위 *
                            </label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                style={styles.select}
                                required
                            >
                                {units.map(unit => (
                                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 상세 정보 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>상세 정보</h2>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            <AlignLeft size={18} />
                            상품 설명
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            style={styles.textarea}
                            placeholder="상품에 대한 상세 설명을 입력하세요"
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
                            placeholder="예: 높은 정밀도, 빠른 경화시간, 우수한 생체적합성"
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
                        이미지 추가 ({formData.existingImages.length + formData.newImages.length}/5)
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
                                    {index < formData.existingImages.length ? (
                                        <div style={styles.existingBadge}>기존</div>
                                    ) : (
                                        <div style={styles.newBadge}>신규</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 제출 버튼 */}
                <div style={styles.buttonGroup}>
                    <button 
                        type="button"
                        onClick={() => window.location.href = '/product-management'}
                        style={styles.cancelButton}
                    >
                        취소
                    </button>
                    <button 
                        type="submit" 
                        disabled={saving}
                        style={{
                            ...styles.submitButton,
                            opacity: saving ? 0.6 : 1,
                            cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? '저장 중...' : '수정 완료'}
                    </button>
                </div>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: '#64748b',
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
    existingBadge: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '700',
        color: 'white',
        backgroundColor: '#10b981',
        borderRadius: '4px',
    },
    newBadge: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '700',
        color: 'white',
        backgroundColor: '#f59e0b',
        borderRadius: '4px',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
    },
    cancelButton: {
        padding: '16px 32px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitButton: {
        padding: '16px 32px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
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
};

export default ProductEdit;