import React, { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { 
    Megaphone, Image as ImageIcon, Calendar, DollarSign,
    Target, CheckCircle, AlertCircle, CreditCard, X
} from 'lucide-react';
import {
    loadIamportScript,
    initializeIamport,
    getServicePrice,
    requestUnifiedPayment,
    createServicePayment
} from '../services/UnifiedPaymentService';

function AdRegistration({ userInfo }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        url: '',
        position: 'top-banner',
        tier: 'basic',
        targetBusinessType: 'all',
        advertiserName: userInfo?.businessName || userInfo?.name || '',
        advertiserEmail: userInfo?.email || '',
        advertiserPhone: userInfo?.phone || ''
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingAdData, setPendingAdData] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [tierPrices, setTierPrices] = useState(null);

    useEffect(() => {
        initializePayment();
        loadPrices();
    }, []);

    // 아임포트 초기화
    const initializePayment = async () => {
        try {
            await loadIamportScript();
            initializeIamport();
            console.log('✅ 아임포트 초기화 완료');
        } catch (error) {
            console.error('❌ 아임포트 초기화 실패:', error);
        }
    };

    // 티어별 가격 로드
    const loadPrices = async () => {
        try {
            const adPrices = await getServicePrice('advertisement');
            setTierPrices(adPrices);
            console.log('✅ 광고 가격:', adPrices);
        } catch (error) {
            console.error('❌ 가격 정보 로드 실패:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // 에러 클리어
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('이미지 크기는 5MB 이하여야 합니다.');
                return;
            }

            setImageFile(file);
            
            // 미리보기 생성
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = '광고 제목을 입력해주세요';
        }

        if (!formData.advertiserName.trim()) {
            newErrors.advertiserName = '광고주명을 입력해주세요';
        }

        if (!formData.advertiserEmail.trim()) {
            newErrors.advertiserEmail = '이메일을 입력해주세요';
        }

        if (!imageFile && !imagePreview) {
            newErrors.image = '광고 이미지를 업로드해주세요';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 1단계: 광고 데이터 준비 및 이미지 업로드
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        // 🚫 직원 계정 체크
        if (userInfo.companyId) {
            alert('직원 계정은 광고를 등록할 수 없습니다.\n\n업체 대표에게 문의해주세요.');
            return;
        }

        setUploading(true);

        try {
            let imageUrl = '';

            // 이미지 업로드
            if (imageFile) {
                const storageRef = ref(storage, `advertisements/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            // 광고 데이터 준비 (status: 'pending')
            const adData = {
                ...formData,
                imageUrl,
                status: 'pending', // 결제 대기
                userId: userInfo.uid,
                createdAt: Timestamp.now(),
                impressions: 0,
                clicks: 0,
                targeting: {
                    businessType: formData.targetBusinessType
                }
            };

            // Firestore에 임시 저장
            const docRef = await addDoc(collection(db, 'advertisements'), adData);

            // 결제 진행을 위해 데이터 저장
            setPendingAdData({
                ...adData,
                contentId: docRef.id
            });

            // 결제 모달 열기
            setShowPaymentModal(true);

        } catch (error) {
            console.error('광고 등록 실패:', error);
            alert('광고 등록에 실패했습니다: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    // 2단계: 결제 진행
    const handlePayment = async () => {
        if (!pendingAdData || !tierPrices) {
            alert('결제 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        const selectedTier = pendingAdData.tier;
        const tierInfo = tierPrices[selectedTier];

        if (!tierInfo) {
            alert('티어 정보를 찾을 수 없습니다.');
            return;
        }

        try {
            setPaymentProcessing(true);

            // 아임포트 결제 요청
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'advertisement',
                tier: selectedTier,
                amount: tierInfo.price,
                serviceName: `광고: ${pendingAdData.title} (${getTierLabel(selectedTier)})`,
                buyerName: userInfo.name || userInfo.email,
                buyerEmail: userInfo.email,
                buyerPhone: userInfo.phone || '',
                additionalData: {
                    adTitle: pendingAdData.title,
                    position: pendingAdData.position,
                    tier: selectedTier
                }
            });

            console.log('✅ 결제 성공:', paymentResult);

            // 서비스 결제 기록 생성
            await createServicePayment({
                userId: userInfo.uid,
                userInfo: userInfo,
                serviceType: 'advertisement',
                tier: selectedTier,
                payment: paymentResult,
                contentId: pendingAdData.contentId,
                contentData: {
                    title: pendingAdData.title,
                    position: pendingAdData.position,
                    tier: selectedTier,
                    imageUrl: pendingAdData.imageUrl
                }
            });

            alert(
                '결제가 완료되었습니다!\n\n' +
                '관리자 승인 후 광고가 게시됩니다.\n' +
                '승인까지 1-2 영업일이 소요될 수 있습니다.'
            );

            // 초기화
            setShowPaymentModal(false);
            setPendingAdData(null);
            resetForm();

        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert('결제에 실패했습니다.\n\n' + (error.error_msg || error.message || '다시 시도해주세요.'));
        } finally {
            setPaymentProcessing(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            url: '',
            position: 'top-banner',
            tier: 'basic',
            targetBusinessType: 'all',
            advertiserName: userInfo?.businessName || userInfo?.name || '',
            advertiserEmail: userInfo?.email || '',
            advertiserPhone: userInfo?.phone || ''
        });
        setImageFile(null);
        setImagePreview(null);
    };

    const getTierPrice = (tier) => {
        if (!tierPrices) return '로딩 중...';
        const tierInfo = tierPrices[tier];
        return tierInfo ? `${tierInfo.price.toLocaleString()}원` : '-';
    };

    const getTierLabel = (tier) => {
        const labels = {
            basic: '베이직',
            standard: '스탠다드',
            premium: '프리미엄'
        };
        return labels[tier] || tier;
    };

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <Megaphone size={32} />
                    광고 등록
                </h1>
                <p style={styles.subtitle}>
                    DentConnect 플랫폼에 광고를 게재하세요
                </p>
            </div>

            {/* 안내사항 */}
            <div style={styles.notice}>
                <AlertCircle size={20} color="#6366f1" />
                <div>
                    <strong>광고 승인 안내</strong>
                    <p>제출하신 광고는 관리자 검토 후 승인됩니다. 승인까지 1-2영업일이 소요될 수 있습니다.</p>
                </div>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} style={styles.form}>
                {/* 기본 정보 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>기본 정보</h2>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            광고 제목 <span style={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="예: 최신 임플란트 특가 행사"
                            style={errors.title ? {...styles.input, ...styles.inputError} : styles.input}
                            maxLength={50}
                        />
                        {errors.title && <span style={styles.errorText}>{errors.title}</span>}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>광고 설명</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="광고에 대한 간단한 설명을 입력하세요"
                            style={styles.textarea}
                            rows={4}
                            maxLength={200}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>랜딩 URL</label>
                        <input
                            type="url"
                            name="url"
                            value={formData.url}
                            onChange={handleInputChange}
                            placeholder="https://example.com"
                            style={styles.input}
                        />
                        <span style={styles.helpText}>클릭 시 이동할 웹사이트 주소</span>
                    </div>
                </div>

                {/* 이미지 업로드 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>
                        <ImageIcon size={20} />
                        광고 이미지 <span style={styles.required}>*</span>
                    </h2>
                    
                    <div style={styles.formGroup}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={styles.fileInput}
                            id="adImage"
                        />
                        <label htmlFor="adImage" style={styles.fileLabel}>
                            <ImageIcon size={20} />
                            이미지 선택 (최대 5MB)
                        </label>
                        {errors.image && <span style={styles.errorText}>{errors.image}</span>}
                        
                        {imagePreview && (
                            <div style={styles.imagePreview}>
                                <img 
                                    src={imagePreview} 
                                    alt="미리보기" 
                                    style={styles.previewImage}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 광고 설정 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>
                        <Target size={20} />
                        광고 설정
                    </h2>

                    <div style={styles.formGrid}>
                        {/* 광고 위치 */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>광고 위치</label>
                            <select
                                name="position"
                                value={formData.position}
                                onChange={handleInputChange}
                                style={styles.select}
                            >
                                <option value="top-banner">상단 배너</option>
                                <option value="sidebar">사이드바</option>
                                <option value="footer">하단</option>
                            </select>
                        </div>

                        {/* 타겟 업종 */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>타겟 업종</label>
                            <select
                                name="targetBusinessType"
                                value={formData.targetBusinessType}
                                onChange={handleInputChange}
                                style={styles.select}
                            >
                                <option value="all">전체</option>
                                <option value="dental">치과</option>
                                <option value="lab">기공소</option>
                            </select>
                        </div>
                    </div>

                    {/* 광고 티어 선택 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            <DollarSign size={16} />
                            광고 티어 <span style={styles.required}>*</span>
                        </label>
                        
                        <div style={styles.tierOptions}>
                            {/* Basic */}
                            <label style={{
                                ...styles.tierOption,
                                ...(formData.tier === 'basic' ? styles.tierOptionActive : {})
                            }}>
                                <input
                                    type="radio"
                                    name="tier"
                                    value="basic"
                                    checked={formData.tier === 'basic'}
                                    onChange={handleInputChange}
                                    style={styles.tierRadio}
                                />
                                <div style={styles.tierInfo}>
                                    <div style={styles.tierName}>베이직</div>
                                    <div style={styles.tierPrice}>{getTierPrice('basic')}</div>
                                    <div style={styles.tierFeatures}>
                                        <div>• 기본 노출</div>
                                        <div>• 30일 게시</div>
                                    </div>
                                </div>
                            </label>

                            {/* Standard */}
                            <label style={{
                                ...styles.tierOption,
                                ...(formData.tier === 'standard' ? styles.tierOptionActive : {})
                            }}>
                                <input
                                    type="radio"
                                    name="tier"
                                    value="standard"
                                    checked={formData.tier === 'standard'}
                                    onChange={handleInputChange}
                                    style={styles.tierRadio}
                                />
                                <div style={styles.tierInfo}>
                                    <div style={styles.tierName}>스탠다드</div>
                                    <div style={styles.tierPrice}>{getTierPrice('standard')}</div>
                                    <div style={styles.tierFeatures}>
                                        <div>• 우선 노출</div>
                                        <div>• 30일 게시</div>
                                        <div>• 통계 제공</div>
                                    </div>
                                </div>
                            </label>

                            {/* Premium */}
                            <label style={{
                                ...styles.tierOption,
                                ...(formData.tier === 'premium' ? styles.tierOptionActive : {})
                            }}>
                                <input
                                    type="radio"
                                    name="tier"
                                    value="premium"
                                    checked={formData.tier === 'premium'}
                                    onChange={handleInputChange}
                                    style={styles.tierRadio}
                                />
                                <div style={styles.tierInfo}>
                                    <div style={styles.tierName}>프리미엄</div>
                                    <div style={styles.tierPrice}>{getTierPrice('premium')}</div>
                                    <div style={styles.tierFeatures}>
                                        <div>• 최우선 노출</div>
                                        <div>• 30일 게시</div>
                                        <div>• 상세 통계</div>
                                        <div>• 전용 배너</div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 광고주 정보 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>광고주 정보</h2>
                    
                    <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                광고주명 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                name="advertiserName"
                                value={formData.advertiserName}
                                onChange={handleInputChange}
                                style={errors.advertiserName ? {...styles.input, ...styles.inputError} : styles.input}
                            />
                            {errors.advertiserName && <span style={styles.errorText}>{errors.advertiserName}</span>}
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                이메일 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="email"
                                name="advertiserEmail"
                                value={formData.advertiserEmail}
                                onChange={handleInputChange}
                                style={errors.advertiserEmail ? {...styles.input, ...styles.inputError} : styles.input}
                            />
                            {errors.advertiserEmail && <span style={styles.errorText}>{errors.advertiserEmail}</span>}
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>연락처</label>
                            <input
                                type="tel"
                                name="advertiserPhone"
                                value={formData.advertiserPhone}
                                onChange={handleInputChange}
                                placeholder="010-1234-5678"
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>

                {/* 제출 버튼 */}
                <div style={styles.submitSection}>
                    <button 
                        type="submit" 
                        disabled={uploading}
                        style={uploading ? {...styles.submitButton, ...styles.submitButtonDisabled} : styles.submitButton}
                    >
                        {uploading ? (
                            <>
                                <div style={styles.spinner}></div>
                                업로드 중...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                다음 단계 (결제)
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* 결제 모달 */}
            {showPaymentModal && pendingAdData && tierPrices && (
                <div style={styles.modalOverlay}>
                    <div style={styles.paymentModal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <CreditCard size={24} />
                                광고 결제
                            </h2>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                style={styles.closeButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={styles.paymentBody}>
                            {/* 광고 정보 */}
                            <div style={styles.paymentInfo}>
                                <h3 style={styles.paymentInfoTitle}>광고 정보</h3>
                                <div style={styles.infoGrid}>
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>광고 제목</span>
                                        <span style={styles.infoValue}>{pendingAdData.title}</span>
                                    </div>
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>광고 티어</span>
                                        <span style={styles.infoValue}>{getTierLabel(pendingAdData.tier)}</span>
                                    </div>
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>광고 위치</span>
                                        <span style={styles.infoValue}>
                                            {pendingAdData.position === 'top-banner' ? '상단 배너' :
                                             pendingAdData.position === 'sidebar' ? '사이드바' : '하단'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 결제 정보 */}
                            <div style={styles.paymentSummary}>
                                <div style={styles.summaryRow}>
                                    <span>광고 금액 ({getTierLabel(pendingAdData.tier)})</span>
                                    <span style={styles.summaryAmount}>
                                        {tierPrices[pendingAdData.tier].price.toLocaleString()}원
                                    </span>
                                </div>
                                <div style={styles.summaryRow}>
                                    <span>게시 기간</span>
                                    <span>{tierPrices[pendingAdData.tier].duration}일</span>
                                </div>
                                <div style={styles.summaryDivider}></div>
                                <div style={{...styles.summaryRow, ...styles.summaryTotal}}>
                                    <span>총 결제금액</span>
                                    <span style={styles.totalAmount}>
                                        {tierPrices[pendingAdData.tier].price.toLocaleString()}원
                                    </span>
                                </div>
                            </div>

                            {/* 안내사항 */}
                            <div style={styles.paymentNotice}>
                                <AlertCircle size={20} />
                                <div>
                                    <p style={{margin: '0 0 8px 0', fontWeight: '600'}}>결제 안내</p>
                                    <ul style={{margin: 0, paddingLeft: '20px', fontSize: '13px'}}>
                                        <li>결제 완료 후 관리자 승인이 필요합니다</li>
                                        <li>승인까지 1-2 영업일이 소요될 수 있습니다</li>
                                        <li>승인 완료 시 광고가 게시됩니다</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                style={styles.cancelButton}
                                disabled={paymentProcessing}
                            >
                                취소
                            </button>
                            <button
                                onClick={handlePayment}
                                style={styles.payButton}
                                disabled={paymentProcessing}
                            >
                                {paymentProcessing ? (
                                    <>
                                        <div style={styles.spinner}></div>
                                        결제 처리 중...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={20} />
                                        {tierPrices[pendingAdData.tier].price.toLocaleString()}원 결제하기
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '24px',
    },
    header: {
        marginBottom: '32px',
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '8px 0 0 0',
    },
    notice: {
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#eef2ff',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '14px',
        color: '#475569',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '20px',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '8px',
    },
    required: {
        color: '#ef4444',
    },
    input: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    textarea: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        backgroundColor: 'white',
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    fileInput: {
        display: 'none',
    },
    fileLabel: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#f8fafc',
        color: '#475569',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    imagePreview: {
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    previewImage: {
        width: '100%',
        maxHeight: '300px',
        objectFit: 'contain',
        borderRadius: '8px',
    },
    helpText: {
        display: 'block',
        fontSize: '12px',
        color: '#94a3b8',
        marginTop: '6px',
    },
    errorText: {
        display: 'block',
        fontSize: '12px',
        color: '#ef4444',
        marginTop: '6px',
    },
    tierOptions: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '12px',
    },
    tierOption: {
        position: 'relative',
        display: 'flex',
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    tierOptionActive: {
        backgroundColor: '#eef2ff',
        borderColor: '#6366f1',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
    },
    tierRadio: {
        position: 'absolute',
        opacity: 0,
    },
    tierInfo: {
        flex: 1,
    },
    tierName: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '8px',
    },
    tierPrice: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#6366f1',
        marginBottom: '12px',
    },
    tierFeatures: {
        fontSize: '12px',
        color: '#64748b',
        lineHeight: 1.6,
    },
    submitSection: {
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '12px',
    },
    submitButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 48px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitButtonDisabled: {
        backgroundColor: '#94a3b8',
        cursor: 'not-allowed',
    },
    spinner: {
        width: '20px',
        height: '20px',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderTop: '3px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    paymentModal: {
        width: '90%',
        maxWidth: '600px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    modalTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    closeButton: {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    paymentBody: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    paymentInfo: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    paymentInfoTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    infoGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    infoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
    },
    infoLabel: {
        color: '#64748b',
        fontWeight: '500',
    },
    infoValue: {
        color: '#0f172a',
        fontWeight: '600',
    },
    paymentSummary: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        fontSize: '14px',
        color: '#64748b',
    },
    summaryAmount: {
        fontWeight: '600',
        color: '#0f172a',
    },
    summaryDivider: {
        height: '1px',
        backgroundColor: '#e2e8f0',
        margin: '16px 0',
    },
    summaryTotal: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 0,
    },
    totalAmount: {
        fontSize: '20px',
        color: '#6366f1',
    },
    paymentNotice: {
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#92400e',
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
        padding: '20px 24px',
        borderTop: '2px solid #e2e8f0',
    },
    cancelButton: {
        flex: 1,
        padding: '12px',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    payButton: {
        flex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default AdRegistration;