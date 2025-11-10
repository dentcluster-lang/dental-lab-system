import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    Building, Phone, FileText, 
    AlertCircle, Check, Loader, ArrowLeft,
    Package, Store, Award
} from 'lucide-react';
import './SellerApplication.css';

function SellerApplication({ userInfo, onBack }) {
    const [step, setStep] = useState(1); // 1: 기본정보, 2: 카테고리, 3: 소개
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [hasExistingApplication, setHasExistingApplication] = useState(false);

    // 폼 데이터
    const [formData, setFormData] = useState({
        // 기본 정보 (users에서 가져옴)
        companyName: userInfo?.businessName || '',
        businessNumber: userInfo?.businessNumber || '',
        ownerName: userInfo?.name || '',
        contactEmail: userInfo?.email || '',
        contactPhone: userInfo?.phone || '',
        address: userInfo?.address || '',
        detailAddress: '',
        
        // 추가 정보
        businessType: '',
        productCategories: [],
        description: '',
        website: '',
        employeeCount: ''
    });

    // 사업 분야 옵션
    const businessTypes = [
        '치과 재료',
        '치과 장비',
        '기공 재료',
        '임플란트',
        '교정 재료',
        '소모품',
        '기타'
    ];

    // 판매 카테고리 옵션
    const categories = [
        '진료 장비',
        '임플란트',
        '교정 재료',
        '보철 재료',
        '근관 치료 재료',
        '접착제/시멘트',
        '인상 재료',
        '의료용 소모품',
        '마스크/장갑',
        '소독/멸균 용품',
        '기공 장비',
        '기공 재료',
        '치과용 의자',
        '엑스레이 장비',
        '구강 카메라',
        '레이저 장비',
        '기타'
    ];

    // 기존 신청서 확인
    const checkExistingApplication = useCallback(async () => {
        try {
            const q = query(
                collection(db, 'sellerApplications'),
                where('userId', '==', userInfo.uid)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                setHasExistingApplication(true);
                const existingApp = snapshot.docs[0].data();
                
                // 대기중이거나 거부된 경우만 표시
                if (existingApp.status === 'pending') {
                    alert('이미 신청서가 제출되어 승인 대기 중입니다.');
                    if (onBack) onBack();
                } else if (existingApp.status === 'rejected') {
                    alert('이전 신청이 거부되었습니다. 새로운 신청서를 작성해주세요.');
                    setHasExistingApplication(false);
                }
            }
        } catch (error) {
            console.error('신청서 확인 실패:', error);
        }
    }, [userInfo.uid, onBack]);

    useEffect(() => {
        checkExistingApplication();
    }, [checkExistingApplication]);

    // 입력 값 변경
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // 카테고리 선택 토글
    const toggleCategory = (category) => {
        setFormData(prev => {
            const categories = prev.productCategories.includes(category)
                ? prev.productCategories.filter(c => c !== category)
                : [...prev.productCategories, category];
            return { ...prev, productCategories: categories };
        });
    };

    // 다음 단계
    const handleNext = () => {
        setError('');

        if (step === 1) {
            // 기본 정보 유효성 검사
            if (!formData.companyName || !formData.businessNumber || !formData.ownerName) {
                setError('필수 항목을 모두 입력해주세요.');
                return;
            }
            if (!formData.contactPhone || !formData.contactEmail) {
                setError('연락처를 입력해주세요.');
                return;
            }
        } else if (step === 2) {
            // 카테고리 유효성 검사
            if (!formData.businessType) {
                setError('사업 분야를 선택해주세요.');
                return;
            }
            if (formData.productCategories.length === 0) {
                setError('판매 카테고리를 최소 1개 이상 선택해주세요.');
                return;
            }
        }

        setStep(step + 1);
    };

    // 이전 단계
    const handlePrev = () => {
        setStep(step - 1);
    };

    // 신청서 제출
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 유효성 검사
        if (!formData.description || formData.description.length < 50) {
            setError('회사 소개는 최소 50자 이상 입력해주세요.');
            return;
        }

        setLoading(true);

        try {
            // sellerApplications 컬렉션에 저장
            const applicationData = {
                userId: userInfo.uid,
                companyName: formData.companyName,
                businessNumber: formData.businessNumber,
                ownerName: formData.ownerName,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone,
                address: formData.address,
                detailAddress: formData.detailAddress || '',
                businessType: formData.businessType,
                productCategories: formData.productCategories,
                description: formData.description,
                website: formData.website || '',
                employeeCount: formData.employeeCount || '',
                status: 'pending',
                appliedAt: new Date(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'sellerApplications'), applicationData);

            // users 컬렉션 업데이트
            await updateDoc(doc(db, 'users', userInfo.uid), {
                sellerApplicationSubmitted: true,
                sellerApplicationSubmittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            alert('✅ 신청서가 제출되었습니다!\n관리자 승인 후 이용하실 수 있습니다.');
            
            // 신청 현황 페이지로 이동
            window.location.href = '/seller-application-status';

        } catch (error) {
            console.error('신청서 제출 실패:', error);
            setError('신청서 제출에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.box}>
                {/* 헤더 */}
                <div style={styles.header}>
                    <Store size={40} style={{ color: '#8b5cf6' }} />
                    <h1 style={styles.title}>판매자 신청서</h1>
                    <p style={styles.subtitle}>
                        상세한 정보를 입력해주세요
                    </p>
                    
                    {/* 진행 단계 */}
                    <div style={styles.stepper}>
                        <div style={{ ...styles.step, ...(step >= 1 ? styles.stepActive : {}) }}>
                            <div style={styles.stepNumber}>1</div>
                            <div style={styles.stepLabel}>기본정보</div>
                        </div>
                        <div style={styles.stepLine}></div>
                        <div style={{ ...styles.step, ...(step >= 2 ? styles.stepActive : {}) }}>
                            <div style={styles.stepNumber}>2</div>
                            <div style={styles.stepLabel}>카테고리</div>
                        </div>
                        <div style={styles.stepLine}></div>
                        <div style={{ ...styles.step, ...(step >= 3 ? styles.stepActive : {}) }}>
                            <div style={styles.stepNumber}>3</div>
                            <div style={styles.stepLabel}>회사소개</div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* 에러 메시지 */}
                    {error && (
                        <div style={styles.error}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Step 1: 기본 정보 */}
                    {step === 1 && (
                        <div style={styles.stepContent}>
                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}>
                                    <Building size={20} />
                                    회사 기본 정보
                                </h3>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>회사명 *</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        placeholder="(주)○○메디컬"
                                        style={styles.input}
                                        required
                                    />
                                </div>

                                <div style={styles.row}>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>사업자등록번호 *</label>
                                        <input
                                            type="text"
                                            name="businessNumber"
                                            value={formData.businessNumber}
                                            onChange={handleChange}
                                            placeholder="000-00-00000"
                                            style={styles.input}
                                            required
                                        />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>대표자명 *</label>
                                        <input
                                            type="text"
                                            name="ownerName"
                                            value={formData.ownerName}
                                            onChange={handleChange}
                                            placeholder="홍길동"
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={styles.row}>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>직원 수</label>
                                        <input
                                            type="text"
                                            name="employeeCount"
                                            value={formData.employeeCount}
                                            onChange={handleChange}
                                            placeholder="예: 10명"
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>웹사이트</label>
                                        <input
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="https://www.example.com"
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}>
                                    <Phone size={20} />
                                    연락처 정보
                                </h3>

                                <div style={styles.row}>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>전화번호 *</label>
                                        <input
                                            type="tel"
                                            name="contactPhone"
                                            value={formData.contactPhone}
                                            onChange={handleChange}
                                            placeholder="02-1234-5678"
                                            style={styles.input}
                                            required
                                        />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>이메일 *</label>
                                        <input
                                            type="email"
                                            name="contactEmail"
                                            value={formData.contactEmail}
                                            onChange={handleChange}
                                            placeholder="contact@example.com"
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>주소</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="서울시 강남구 테헤란로 123"
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>상세주소</label>
                                    <input
                                        type="text"
                                        name="detailAddress"
                                        value={formData.detailAddress}
                                        onChange={handleChange}
                                        placeholder="○○빌딩 5층"
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: 사업 분야 & 카테고리 */}
                    {step === 2 && (
                        <div style={styles.stepContent}>
                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}>
                                    <Award size={20} />
                                    사업 분야 *
                                </h3>
                                <p style={styles.description}>
                                    주력 사업 분야를 선택해주세요
                                </p>

                                <div style={styles.radioGroup}>
                                    {businessTypes.map(type => (
                                        <label key={type} style={styles.radioLabel}>
                                            <input
                                                type="radio"
                                                name="businessType"
                                                value={type}
                                                checked={formData.businessType === type}
                                                onChange={handleChange}
                                                style={styles.radio}
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}>
                                    <Package size={20} />
                                    판매 카테고리 *
                                </h3>
                                <p style={styles.description}>
                                    판매하실 제품 카테고리를 선택해주세요 (복수 선택 가능)
                                </p>

                                <div style={styles.categoryGrid}>
                                    {categories.map(category => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => toggleCategory(category)}
                                            style={{
                                                ...styles.categoryBtn,
                                                ...(formData.productCategories.includes(category) 
                                                    ? styles.categoryBtnActive 
                                                    : {})
                                            }}
                                        >
                                            {formData.productCategories.includes(category) && (
                                                <Check size={16} />
                                            )}
                                            {category}
                                        </button>
                                    ))}
                                </div>

                                {formData.productCategories.length > 0 && (
                                    <div style={styles.selectedCount}>
                                        선택된 카테고리: {formData.productCategories.length}개
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: 회사 소개 */}
                    {step === 3 && (
                        <div style={styles.stepContent}>
                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}>
                                    <FileText size={20} />
                                    회사 소개 *
                                </h3>
                                <p style={styles.description}>
                                    회사의 주요 제품, 서비스, 강점 등을 자세히 설명해주세요 (최소 50자)
                                </p>

                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="예시:
저희 회사는 치과용 임플란트 전문 공급업체로, 국내외 유명 브랜드 제품을 취급하고 있습니다. 
15년 이상의 업력을 바탕으로 전국 500여개 치과에 제품을 공급하고 있으며, 
신속한 배송과 전문적인 A/S를 제공합니다.

주요 취급 제품:
- 임플란트 시스템
- 보철 재료
- 수술 기구
..."
                                    style={styles.textarea}
                                    rows="12"
                                    required
                                />

                                <div style={styles.charCount}>
                                    {formData.description.length} / 최소 50자
                                </div>
                            </div>

                            {/* 제출 전 확인 사항 */}
                            <div style={styles.confirmBox}>
                                <h4 style={styles.confirmTitle}>📋 제출 전 확인사항</h4>
                                <ul style={styles.confirmList}>
                                    <li>입력하신 정보가 정확한지 확인해주세요</li>
                                    <li>사업자등록번호는 실제 등록된 번호여야 합니다</li>
                                    <li>관리자 승인 후 판매자 기능을 이용하실 수 있습니다</li>
                                    <li>허위 정보 작성 시 승인이 거부될 수 있습니다</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* 버튼 */}
                    <div style={styles.buttonGroup}>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                style={styles.prevButton}
                                disabled={loading}
                            >
                                <ArrowLeft size={20} />
                                이전
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                style={styles.nextButton}
                            >
                                다음
                                <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                style={styles.submitButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                        제출 중...
                                    </>
                                ) : (
                                    <>
                                        <Check size={20} />
                                        신청서 제출
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>

                {/* 취소 버튼 */}
                {onBack && (
                    <div style={styles.footer}>
                        <button
                            onClick={onBack}
                            style={styles.cancelButton}
                            type="button"
                        >
                            취소
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '40px 20px',
    },
    box: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        maxWidth: '800px',
        margin: '0 auto',
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px',
    },
    title: {
        margin: '16px 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    subtitle: {
        margin: '0 0 32px 0',
        fontSize: '14px',
        color: '#64748b',
    },
    stepper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '32px',
    },
    step: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    stepNumber: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#e2e8f0',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '16px',
    },
    stepActive: {
        '& > div:first-child': {
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
        },
    },
    stepLabel: {
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
    },
    stepLine: {
        width: '60px',
        height: '2px',
        backgroundColor: '#e2e8f0',
        marginBottom: '24px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    stepContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    description: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1,
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        transition: 'all 0.2s',
    },
    textarea: {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'inherit',
        lineHeight: '1.6',
        resize: 'vertical',
    },
    charCount: {
        textAlign: 'right',
        fontSize: '12px',
        color: '#94a3b8',
    },
    radioGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    radio: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    categoryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px',
    },
    categoryBtn: {
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    categoryBtnActive: {
        borderColor: '#8b5cf6',
        backgroundColor: '#f5f3ff',
        color: '#8b5cf6',
    },
    selectedCount: {
        textAlign: 'center',
        fontSize: '14px',
        color: '#8b5cf6',
        fontWeight: '600',
        padding: '8px',
        backgroundColor: '#f5f3ff',
        borderRadius: '8px',
    },
    confirmBox: {
        padding: '20px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
    },
    confirmTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    confirmList: {
        margin: 0,
        paddingLeft: '20px',
        color: '#475569',
        fontSize: '14px',
        lineHeight: '2',
    },
    error: {
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'space-between',
        marginTop: '16px',
    },
    prevButton: {
        padding: '14px 24px',
        backgroundColor: '#ffffff',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    nextButton: {
        padding: '14px 24px',
        backgroundColor: '#8b5cf6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    submitButton: {
        padding: '14px 24px',
        backgroundColor: '#10b981',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        flex: 1,
        transition: 'all 0.2s',
    },
    footer: {
        marginTop: '24px',
        textAlign: 'center',
    },
    cancelButton: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: '14px',
        textDecoration: 'underline',
    },
};

export default SellerApplication;