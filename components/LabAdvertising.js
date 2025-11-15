import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { 
    X, Save, Image as ImageIcon, 
    CheckCircle, AlertCircle,
    Trash2, Plus, CreditCard, Calendar
} from 'lucide-react';

// 🔥 통합 결제 서비스 (이 부분이 중요!)
import {
    loadIamportScript,
    initializeIamport,
    requestUnifiedPayment,
    createServicePayment,
    getServicePrice,
    checkPaymentStatus
} from '../services/UnifiedPaymentService';

function LabAdvertising({ user }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adData, setAdData] = useState(null);

    // 폼 데이터
    const [formData, setFormData] = useState({
        introduction: '',
        specialties: [],
        experience: '',
        equipment: '',
        certifications: '',
        services: '',
        workingHours: '',
        contactInfo: ''
    });

    // 이미지 관련
    const [profileImage, setProfileImage] = useState(null);
    const [profilePreview, setProfilePreview] = useState(null);
    const [portfolioImages, setPortfolioImages] = useState([]);
    const [portfolioPreviews, setPortfolioPreviews] = useState([]);
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

    // 🔥 결제 관련 상태
    const [expiryDate, setExpiryDate] = useState(null);
    const [isExpired, setIsExpired] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [servicePrice, setServicePrice] = useState(null);
    const [isActive, setIsActive] = useState(false);

    // 전문 분야 옵션
    const specialtyOptions = [
        '크라운/브릿지',
        '임플란트',
        '교정장치',
        '틀니',
        '라미네이트',
        '지르코니아',
        '금속도재',
        '올세라믹',
        '투명교정',
        '스플린트'
    ];

    // 메시지
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // 메시지 헬퍼
    const showSuccess = (message) => {
        setSuccessMessage(message);
        setErrorMessage('');
    };

    const showError = (message) => {
        setErrorMessage(message);
        setSuccessMessage('');
    };

    // 🔥 아임포트 초기화
    useEffect(() => {
        const initPayment = async () => {
            try {
                await loadIamportScript();
                initializeIamport();
                console.log('✅ 아임포트 초기화 완료');
            } catch (error) {
                console.error('❌ 아임포트 초기화 실패:', error);
            }
        };

        initPayment();
    }, []);

    // 🔥 가격 정보 로드
    useEffect(() => {
        const loadPrice = async () => {
            try {
                const price = await getServicePrice('lab-advertisement');
                setServicePrice(price);
                console.log('✅ 가격 정보 로드:', price);
            } catch (error) {
                console.error('❌ 가격 정보 로드 실패:', error);
            }
        };

        loadPrice();
    }, []);

    // 만료일 계산
    const calculateExpiry = useCallback((expiryDateStr) => {
        if (!expiryDateStr) return;

        const expiry = new Date(expiryDateStr);
        const now = new Date();

        const expired = expiry < now;
        setIsExpired(expired);

        if (!expired) {
            const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            setDaysRemaining(diff);
        } else {
            setDaysRemaining(0);
        }
    }, []);

    // 🔥 결제 상태 확인 (servicePayments 컬렉션에서)
    const checkCurrentPaymentStatus = useCallback(async () => {
        if (!user?.uid) return;

        try {
            const status = await checkPaymentStatus(user.uid, 'lab-advertisement', user.uid);

            if (status.isPaid && status.isActive) {
                setIsActive(true);
                setExpiryDate(status.expiryDate.toISOString());
                setIsExpired(false);
                calculateExpiry(status.expiryDate.toISOString());
                console.log('✅ 활성 결제 확인:', status);
            } else {
                setIsActive(false);
                setIsExpired(true);
                console.log('⚠️ 활성 결제 없음');
            }
        } catch (error) {
            console.error('❌ 결제 상태 확인 실패:', error);
        }
    }, [user?.uid, calculateExpiry]);

    // 광고 데이터 로드
    const loadAdvertisement = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const adRef = doc(db, 'labAdvertisements', user.uid);
            const adSnap = await getDoc(adRef);

            if (adSnap.exists()) {
                const data = adSnap.data();
                setAdData(data);
                setFormData({
                    introduction: data.introduction || '',
                    specialties: data.specialties || [],
                    experience: data.experience || '',
                    equipment: data.equipment || '',
                    certifications: data.certifications || '',
                    services: data.services || '',
                    workingHours: data.workingHours || '',
                    contactInfo: data.contactInfo || ''
                });
                setProfilePreview(data.profileImageUrl || null);
                setPortfolioPreviews(data.portfolioImages || []);
            }

            // 🔥 결제 상태 확인 (servicePayments 컬렉션 기준)
            await checkCurrentPaymentStatus();

        } catch (error) {
            console.error('광고 데이터 로드 실패:', error);
            showError('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [user, checkCurrentPaymentStatus]);

    useEffect(() => {
        loadAdvertisement();
    }, [loadAdvertisement]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    useEffect(() => {
        if (expiryDate) {
            calculateExpiry(expiryDate);
        }
    }, [expiryDate, calculateExpiry]);

    const handleProfileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showError('프로필 이미지는 5MB 이하로 업로드해주세요.');
                return;
            }
            setProfileImage(file);
            setProfilePreview(URL.createObjectURL(file));
        }
    };

    const handlePortfolioImagesChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + portfolioPreviews.length > 10) {
            showError('포트폴리오 이미지는 최대 10개까지 업로드 가능합니다.');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                showError(`${file.name}은(는) 5MB를 초과합니다.`);
                return false;
            }
            return true;
        });

        setPortfolioImages([...portfolioImages, ...validFiles]);
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setPortfolioPreviews([...portfolioPreviews, ...newPreviews]);
    };

    const removePortfolioImage = (index) => {
        const newImages = portfolioImages.filter((_, i) => i !== index);
        const newPreviews = portfolioPreviews.filter((_, i) => i !== index);
        setPortfolioImages(newImages);
        setPortfolioPreviews(newPreviews);
    };

    const toggleSpecialty = (specialty) => {
        if (formData.specialties.includes(specialty)) {
            setFormData({
                ...formData,
                specialties: formData.specialties.filter(s => s !== specialty)
            });
        } else {
            setFormData({
                ...formData,
                specialties: [...formData.specialties, specialty]
            });
        }
    };

    const handleSave = async () => {
        if (formData.specialties.length === 0) {
            showError('최소 1개 이상의 전문 분야를 선택해주세요.');
            return;
        }

        if (!formData.introduction.trim()) {
            showError('기공소 소개를 입력해주세요.');
            return;
        }

        try {
            setSaving(true);

            // 사용자 정보 가져오기
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            let profileImageUrl = adData?.profileImageUrl || null;
            let portfolioUrls = adData?.portfolioImages || [];

            // 프로필 이미지 업로드
            if (profileImage) {
                setUploadingProfile(true);
                const profileRef = ref(storage, `labAds/${user.uid}/profile_${Date.now()}.jpg`);
                await uploadBytes(profileRef, profileImage);
                profileImageUrl = await getDownloadURL(profileRef);
                setUploadingProfile(false);
            }

            // 포트폴리오 이미지 업로드
            if (portfolioImages.length > 0) {
                setUploadingPortfolio(true);
                const uploadPromises = portfolioImages.map(async (file, index) => {
                    const portfolioRef = ref(storage, `labAds/${user.uid}/portfolio_${Date.now()}_${index}.jpg`);
                    await uploadBytes(portfolioRef, file);
                    return await getDownloadURL(portfolioRef);
                });
                const newUrls = await Promise.all(uploadPromises);
                portfolioUrls = [...portfolioUrls, ...newUrls];
                setUploadingPortfolio(false);
            }

            // Firestore에 저장
            const adRef = doc(db, 'labAdvertisements', user.uid);
            const adDataToSave = {
                ...formData,
                profileImageUrl,
                portfolioImages: portfolioUrls,
                isActive: isActive && !isExpired,
                status: isActive && !isExpired ? 'active' : 'inactive',
                labId: user.uid,
                businessName: userData?.businessName || '',
                email: userData?.email || '',
                phone: userData?.phone || '',
                address: userData?.address || '',
                updatedAt: new Date(),
                createdAt: adData?.createdAt || new Date()
            };

            if (adData) {
                await updateDoc(adRef, adDataToSave);
            } else {
                await setDoc(adRef, adDataToSave);
            }

            setProfileImage(null);
            setPortfolioImages([]);
            await loadAdvertisement();
            showSuccess('광고가 저장되었습니다.');
        } catch (error) {
            console.error('저장 실패:', error);
            showError('저장에 실패했습니다.');
        } finally {
            setSaving(false);
            setUploadingProfile(false);
            setUploadingPortfolio(false);
        }
    };

    // 🔥 결제 처리 (아임포트)
    const handlePayment = async () => {
        // 🚫 직원 계정 결제 차단
        if (user.companyId) {
            alert('❌ 직원 계정은 결제할 수 없습니다.\n\n업체 대표 계정으로 로그인하여 결제해주세요.');
            return;
        }

        if (!adData) {
            showError('먼저 광고 내용을 저장해주세요.');
            return;
        }

        if (!servicePrice) {
            showError('가격 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        try {
            setPaymentProcessing(true);
            console.log('💳 결제 시작...');

            // 🔥 아임포트 결제 요청
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'lab-advertisement',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: user.name || user.businessName || user.email,
                buyerEmail: user.email,
                buyerPhone: user.phone || '010-0000-0000',
                additionalData: {
                    businessName: adData.businessName || user.businessName,
                    labId: user.uid
                }
            });

            console.log('✅ 결제 성공:', paymentResult);

            // 🔥 결제 완료 후 서비스 처리
            const servicePaymentResult = await createServicePayment({
                userId: user.uid,
                userInfo: user,
                serviceType: 'lab-advertisement',
                payment: paymentResult,
                contentId: user.uid, // labAdvertisements의 문서 ID가 userId
                contentData: {
                    businessName: adData.businessName || user.businessName,
                    introduction: adData.introduction,
                    specialties: adData.specialties
                }
            });

            console.log('✅ 서비스 결제 데이터 생성 완료:', servicePaymentResult);

            // 🔥 광고 상태 업데이트 - pending으로 설정 (관리자 승인 대기)
            const adRef = doc(db, 'labAdvertisements', user.uid);
            await updateDoc(adRef, {
                status: 'pending',
                paymentId: servicePaymentResult.paymentId,
                updatedAt: new Date()
            });

            showSuccess('결제가 완료되었습니다! 관리자 승인 후 광고가 활성화됩니다.');

            // 상태 새로고침
            await loadAdvertisement();

        } catch (error) {
            console.error('❌ 결제 실패:', error);
            showError(error.error_msg || error.message || '결제에 실패했습니다.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>기공소 광고 관리</h1>
                    <p style={styles.subtitle}>치과에 우리 기공소를 홍보하세요</p>
                </div>
                <div style={styles.headerActions}>
                    {expiryDate && !isExpired && (
                        <div style={styles.expiryBadge}>
                            <Calendar size={16} />
                            <span>{daysRemaining}일 남음</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 메시지 */}
            {successMessage && (
                <div style={styles.successMessage}>
                    <CheckCircle size={20} />
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div style={styles.errorMessage}>
                    <AlertCircle size={20} />
                    {errorMessage}
                </div>
            )}

            {/* 🔥 결제 상태 섹션 */}
            <div style={styles.section}>
                <div style={styles.paymentHeader}>
                    <div>
                        <h2 style={styles.sectionTitle}>광고 이용 현황</h2>
                        <p style={styles.sectionDesc}>
                            {servicePrice
                                ? `${servicePrice.duration}일 이용권 - ${servicePrice.price.toLocaleString()}원`
                                : '가격 정보 로딩 중...'}
                        </p>
                    </div>
                    <CreditCard size={32} color="#6366f1" />
                </div>

                {expiryDate && !isExpired ? (
                    <div style={styles.activePayment}>
                        <div style={styles.paymentInfo}>
                            <div style={styles.statusBadge}>
                                <CheckCircle size={16} />
                                활성화됨
                            </div>
                            <div style={styles.expiryInfo}>
                                <p style={styles.expiryLabel}>만료일</p>
                                <p style={styles.expiryDate}>
                                    {new Date(expiryDate).toLocaleDateString('ko-KR')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handlePayment}
                            disabled={paymentProcessing}
                            style={{
                                ...styles.renewButton,
                                opacity: paymentProcessing ? 0.6 : 1,
                                cursor: paymentProcessing ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {paymentProcessing ? '처리 중...' : '기간 연장하기'}
                        </button>
                    </div>
                ) : (
                    <div style={styles.inactivePayment}>
                        <p style={styles.inactiveText}>
                            {isExpired ? '광고가 만료되었습니다' : '광고가 비활성화 상태입니다'}
                        </p>
                        <button
                            onClick={handlePayment}
                            disabled={paymentProcessing || !servicePrice}
                            style={{
                                ...styles.activateButton,
                                opacity: (paymentProcessing || !servicePrice) ? 0.6 : 1,
                                cursor: (paymentProcessing || !servicePrice) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <CreditCard size={20} />
                            {paymentProcessing ? '처리 중...' : '광고 활성화하기'}
                        </button>
                        {!adData && (
                            <p style={styles.warningText}>
                                ⚠️ 먼저 광고 내용을 작성하고 저장해주세요
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 프로필 이미지 섹션 */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>프로필 이미지</h2>
                <p style={styles.sectionDesc}>기공소를 대표하는 이미지를 업로드하세요 (최대 5MB)</p>

                <div style={styles.imageUploadContainer}>
                    {profilePreview ? (
                        <div style={styles.profileImagePreview}>
                            <img
                                src={profilePreview}
                                alt="프로필"
                                style={styles.profileImage}
                            />
                            <button
                                onClick={() => {
                                    setProfileImage(null);
                                    setProfilePreview(null);
                                }}
                                style={styles.removeImageButton}
                                type="button"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <label style={styles.uploadButton}>
                            <ImageIcon size={48} />
                            <span>프로필 이미지 업로드</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleProfileImageChange}
                                style={styles.fileInput}
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* 기본 정보 섹션 */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>기본 정보</h2>

                <div style={styles.formGroup}>
                    <label style={styles.label}>기공소 소개 *</label>
                    <textarea
                        value={formData.introduction}
                        onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                        placeholder="기공소를 간단히 소개해주세요"
                        style={styles.textarea}
                        rows={5}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>전문 분야 * (복수 선택 가능)</label>
                    <div style={styles.specialtyGrid}>
                        {specialtyOptions.map(specialty => (
                            <button
                                key={specialty}
                                type="button"
                                onClick={() => toggleSpecialty(specialty)}
                                style={{
                                    ...styles.specialtyButton,
                                    ...(formData.specialties.includes(specialty) ? styles.specialtyButtonActive : {})
                                }}
                            >
                                {specialty}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>주요 경력</label>
                    <textarea
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        placeholder="주요 경력 사항을 입력해주세요"
                        style={styles.textarea}
                        rows={4}
                    />
                </div>
            </div>

            {/* 상세 정보 섹션 */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>상세 정보</h2>

                <div style={styles.formGroup}>
                    <label style={styles.label}>보유 장비</label>
                    <textarea
                        value={formData.equipment}
                        onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                        placeholder="보유하고 있는 주요 장비를 입력해주세요"
                        style={styles.textarea}
                        rows={4}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>인증 및 자격</label>
                    <textarea
                        value={formData.certifications}
                        onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                        placeholder="보유하고 있는 인증 및 자격을 입력해주세요"
                        style={styles.textarea}
                        rows={3}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>제공 서비스</label>
                    <textarea
                        value={formData.services}
                        onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                        placeholder="제공하는 주요 서비스를 입력해주세요"
                        style={styles.textarea}
                        rows={4}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>근무 시간</label>
                    <input
                        type="text"
                        value={formData.workingHours}
                        onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                        placeholder="예: 평일 09:00-18:00, 토요일 09:00-13:00"
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>연락처 정보</label>
                    <textarea
                        value={formData.contactInfo}
                        onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                        placeholder="전화번호, 이메일 등 연락처 정보를 입력해주세요"
                        style={styles.textarea}
                        rows={3}
                    />
                </div>
            </div>

            {/* 포트폴리오 섹션 */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>포트폴리오 이미지</h2>
                <p style={styles.sectionDesc}>작업 사례를 보여주는 이미지를 업로드하세요 (최대 10개, 각 5MB 이하)</p>

                <div style={styles.portfolioGrid}>
                    {portfolioPreviews.map((preview, index) => (
                        <div key={index} style={styles.portfolioItem}>
                            <img
                                src={preview}
                                alt={`포트폴리오 ${index + 1}`}
                                style={styles.portfolioImage}
                            />
                            <button
                                onClick={() => removePortfolioImage(index)}
                                style={styles.removePortfolioButton}
                                type="button"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {portfolioPreviews.length < 10 && (
                        <label style={styles.addPortfolioButton}>
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Plus size={32} />
                                <span>이미지 추가</span>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePortfolioImagesChange}
                                style={styles.fileInput}
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* 저장 버튼 */}
            <div style={styles.actions}>
                <button
                    onClick={handleSave}
                    disabled={saving || uploadingProfile || uploadingPortfolio}
                    style={{
                        ...styles.saveButton,
                        opacity: (saving || uploadingProfile || uploadingPortfolio) ? 0.6 : 1,
                        cursor: (saving || uploadingProfile || uploadingPortfolio) ? 'not-allowed' : 'pointer'
                    }}
                >
                    <Save size={20} />
                    {saving ? '저장 중...' : uploadingProfile ? '프로필 업로드 중...' : uploadingPortfolio ? '포트폴리오 업로드 중...' : '저장하기'}
                </button>
            </div>
        </div>
    );
}

const styles = {
    
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 20px',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
    },
    title: {
        margin: 0,
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: '8px 0 0 0',
        fontSize: '16px',
        color: '#64748b',
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
    },
    expiryBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
    },
    successMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '15px',
        fontWeight: '500',
    },
    errorMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '15px',
        fontWeight: '500',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    sectionTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    sectionDesc: {
        margin: '0 0 24px 0',
        fontSize: '14px',
        color: '#64748b',
    },
    formGroup: {
        marginBottom: '24px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#334155',
    },
    paymentHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
    },
    activePayment: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        flexWrap: 'wrap',
    },
    paymentInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flex: 1,
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
    },
    expiryInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    expiryLabel: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
    },
    expiryDate: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#0f172a',
    },
    renewButton: {
        padding: '12px 24px',
        backgroundColor: '#ffffff',
        color: '#6366f1',
        border: '2px solid #6366f1',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
    inactivePayment: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '32px 20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    inactiveText: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#64748b',
    },
    activateButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 32px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    warningText: {
        margin: 0,
        fontSize: '13px',
        color: '#f59e0b',
    },
    imageUploadContainer: {
        display: 'flex',
        justifyContent: 'center',
    },
    profileImagePreview: {
        position: 'relative',
        width: '300px',
        height: '300px',
    },
    profileImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '16px',
        border: '2px solid #e2e8f0',
    },
    removeImageButton: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    },
    uploadButton: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '300px',
        height: '300px',
        border: '3px dashed #cbd5e1',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: '#64748b',
        backgroundColor: '#f8fafc',
    },
    fileInput: {
        display: 'none',
    },
    textarea: {
        width: '100%',
        padding: '16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        fontFamily: 'inherit',
        resize: 'vertical',
        outline: 'none',
        transition: 'all 0.2s',
    },
    input: {
        width: '100%',
        padding: '16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    specialtyGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px',
    },
    specialtyButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    specialtyButtonActive: {
        backgroundColor: '#6366f1',
        color: 'white',
        borderColor: '#6366f1',
    },
    portfolioGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
    },
    portfolioItem: {
        position: 'relative',
        paddingBottom: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
    },
    portfolioImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    removePortfolioButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
    },
    addPortfolioButton: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        paddingBottom: '100%',
        border: '3px dashed #cbd5e1',
        borderRadius: '12px',
        cursor: 'pointer',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        position: 'relative',
    },
    actions: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '16px',
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 48px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
    },
};

// 애니메이션 추가
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
    } catch (e) {
        // 이미 존재하는 경우 무시
    }
}

export default LabAdvertising;