import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, orderBy, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Briefcase, Plus, Trash2, MapPin, DollarSign, Clock,
    Building2, Users, Calendar, Search, Mail, Phone,
    CreditCard, AlertCircle
} from 'lucide-react';
// 🔥 UnifiedPaymentService import 추가
import {
    loadIamportScript,
    initializeIamport,
    requestUnifiedPayment,
    createServicePayment,
    getServicePrice
} from '../services/UnifiedPaymentService';

function JobPostManagement({ user }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // 🔥 결제 관련 상태 추가
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState(null);
    const [servicePrice, setServicePrice] = useState(null);
    const [myPendingJobs, setMyPendingJobs] = useState([]);
    
    const [formData, setFormData] = useState({
        headerTitle: '',
        title: '',
        position: '',
        location: '',
        salary: '',
        employmentType: 'fulltime',
        experience: 'entry',
        description: '',
        requirements: '',
        benefits: '',
        contactEmail: user?.email || '',
        contactPhone: ''
    });

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
                const priceInfo = await getServicePrice('job-posting');
                setServicePrice(priceInfo);
                console.log('✅ 구인공고 가격 로드:', priceInfo);
            } catch (error) {
                console.error('❌ 가격 로드 실패:', error);
            }
        };
        loadPrice();
    }, []);

    // 승인된 구인공고 로드
    const loadJobs = async () => {
        try {
            setLoading(true);
            const jobsRef = collection(db, 'jobPostings');
            const q = query(
                jobsRef,
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            
            const jobsList = [];
            const now = new Date();

            snapshot.docs.forEach((docSnap) => {
                const jobData = docSnap.data();
                const expiryDate = jobData.expiryDate?.toDate ? 
                    jobData.expiryDate.toDate() : 
                    new Date(jobData.expiryDate);
                
                // 만료되지 않은 공고만 표시
                if (expiryDate > now) {
                    const timeDiff = expiryDate - now;
                    const daysLeft = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
                    jobsList.push({
                        id: docSnap.id,
                        ...jobData,
                        daysLeft: daysLeft
                    });
                }
            });
            
            setJobs(jobsList);
        } catch (error) {
            console.error('구인공고 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 🔥 내 대기중 구인공고 로드
    const loadMyPendingJobs = useCallback(async () => {
        if (!user?.uid) return;
        
        try {
            console.log('⏳ 내 대기중 구인공고 로딩...');
            const jobsRef = collection(db, 'jobPostings');
            const q = query(
                jobsRef,
                where('userId', '==', user.uid),
                where('status', 'in', ['pending', 'approved', 'rejected']),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            
            const pendingList = [];
            snapshot.forEach((docSnap) => {
                pendingList.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });
            
            console.log(`✅ 내 대기중 구인공고: ${pendingList.length}개`);
            setMyPendingJobs(pendingList);
        } catch (error) {
            console.error('❌ 대기중 구인공고 로드 실패:', error);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadJobs();
        if (user?.uid) {
            loadMyPendingJobs();
        }
    }, [user?.uid, loadMyPendingJobs]);

    // 🔥 1단계: 임시 저장 (pending)
    const handleSavePending = async (e) => {
        e.preventDefault();
        
        // 🚫 직원 계정 차단
        if (user.companyId) {
            alert('❌ 직원 계정은 구인공고를 등록할 수 없습니다.\n업체 대표에게 문의하세요.');
            return;
        }
        
        if (!formData.title || !formData.position || !formData.description) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        try {
            const jobData = {
                ...formData,
                userId: user.uid,
                companyName: user.businessName || user.name || user.email,
                businessType: user.businessType || 'dental',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                views: 0,
                status: 'pending', // 🔥 pending 상태로 저장
                isPaid: false
            };

            const docRef = await addDoc(collection(db, 'jobPostings'), jobData);
            console.log('✅ 구인공고 임시 저장 완료:', docRef.id);

            // 결제 모달 표시
            setPendingSaveData({ jobId: docRef.id, jobData });
            setShowCreateModal(false);
            setShowPaymentModal(true);

        } catch (error) {
            console.error('구인공고 저장 실패:', error);
            alert('구인공고 저장에 실패했습니다.');
        }
    };

    // 🔥 2단계: 결제 처리
    const handlePayment = async () => {
        if (!pendingSaveData || !servicePrice) {
            alert('결제 정보를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }

        try {
            setPaymentProcessing(true);

            // 아임포트 결제 요청
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'job-posting',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: user.name || user.email,
                buyerEmail: user.email,
                buyerPhone: user.phone || '010-0000-0000',
                additionalData: {
                    jobId: pendingSaveData.jobId,
                    title: pendingSaveData.jobData.title
                }
            });

            console.log('✅ 결제 완료:', paymentResult);

            // 결제 데이터 생성 (관리자 승인 대기)
            await createServicePayment({
                userId: user.uid,
                userInfo: user,
                serviceType: 'job-posting',
                payment: paymentResult,
                contentId: pendingSaveData.jobId,
                contentData: {
                    title: pendingSaveData.jobData.title,
                    position: pendingSaveData.jobData.position
                }
            });

            // 구인공고에 결제 완료 표시
            await updateDoc(doc(db, 'jobPostings', pendingSaveData.jobId), {
                isPaid: true,
                paymentDate: new Date().toISOString(),
                orderNumber: paymentResult.orderNumber
            });

            alert('✅ 결제가 완료되었습니다!\n관리자 승인 후 구인공고가 게시됩니다.');
            
            setShowPaymentModal(false);
            setPendingSaveData(null);
            resetForm();
            loadMyPendingJobs();

        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert(error.error_msg || '결제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    // 🔥 pending 구인공고 결제하기
    const handlePayPendingJob = async (job) => {
        if (!servicePrice) {
            alert('결제 정보를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }

        if (job.isPaid) {
            alert('이미 결제가 완료된 구인공고입니다.');
            return;
        }

        const confirmPay = window.confirm(
            `"${job.title}" 구인공고를 결제하시겠습니까?\n\n` +
            `금액: ${servicePrice.price.toLocaleString()}원\n` +
            `기간: ${servicePrice.duration}일`
        );

        if (!confirmPay) return;

        try {
            setPaymentProcessing(true);

            // 아임포트 결제 요청
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'job-posting',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: user.name || user.email,
                buyerEmail: user.email,
                buyerPhone: user.phone || '010-0000-0000',
                additionalData: {
                    jobId: job.id,
                    title: job.title
                }
            });

            // 결제 데이터 생성
            await createServicePayment({
                userId: user.uid,
                userInfo: user,
                serviceType: 'job-posting',
                payment: paymentResult,
                contentId: job.id,
                contentData: {
                    title: job.title,
                    position: job.position
                }
            });

            // 구인공고 결제 완료 표시
            await updateDoc(doc(db, 'jobPostings', job.id), {
                isPaid: true,
                paymentDate: new Date().toISOString(),
                orderNumber: paymentResult.orderNumber
            });

            alert('✅ 결제가 완료되었습니다!\n관리자 승인 후 구인공고가 게시됩니다.');
            loadMyPendingJobs();

        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert(error.error_msg || '결제에 실패했습니다.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('정말 이 구인공고를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'jobPostings', jobId));
            alert('구인공고가 삭제되었습니다.');
            setSelectedJob(null);
            loadJobs();
            loadMyPendingJobs();
        } catch (error) {
            console.error('구인공고 삭제 실패:', error);
            alert('구인공고 삭제에 실패했습니다.');
        }
    };

    const resetForm = () => {
        setFormData({
            headerTitle: '',
            title: '',
            position: '',
            location: '',
            salary: '',
            employmentType: 'fulltime',
            experience: 'entry',
            description: '',
            requirements: '',
            benefits: '',
            contactEmail: user?.email || '',
            contactPhone: ''
        });
    };

    const filteredJobs = jobs.filter(job => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            job.title?.toLowerCase().includes(searchLower) ||
            job.companyName?.toLowerCase().includes(searchLower) ||
            job.position?.toLowerCase().includes(searchLower) ||
            job.location?.toLowerCase().includes(searchLower)
        );
    });

    const getEmploymentTypeLabel = (type) => {
        const types = {
            fulltime: '정규직',
            parttime: '파트타임',
            contract: '계약직'
        };
        return types[type] || type;
    };

    const getExperienceLabel = (exp) => {
        const experiences = {
            entry: '신입',
            junior: '경력 1-3년',
            senior: '경력 3년 이상'
        };
        return experiences[exp] || exp;
    };

    const getBusinessTypeLabel = (type) => {
        if (type === 'dental' || type === 'clinic') return '치과';
        if (type === 'lab') return '기공소';
        return '';
    };

    // 🔥 상태 배지 렌더링
    const renderStatusBadge = (status, isPaid) => {
        if (status === 'pending' && !isPaid) {
            return <span style={styles.statusBadgePending}>결제 대기</span>;
        }
        if (status === 'pending' && isPaid) {
            return <span style={styles.statusBadgeWaiting}>승인 대기</span>;
        }
        if (status === 'approved') {
            return <span style={styles.statusBadgeApproved}>승인됨</span>;
        }
        if (status === 'rejected') {
            return <span style={styles.statusBadgeRejected}>반려됨</span>;
        }
        return null;
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
                    <h1 style={styles.title}>구인공고 관리</h1>
                    <p style={styles.subtitle}>구인공고를 등록하고 관리하세요</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={styles.createButton}
                    disabled={user?.companyId} // 🚫 직원 계정 버튼 비활성화
                >
                    <Plus size={20} />
                    구인공고 등록
                </button>
            </div>

            {/* 🔥 직원 계정 안내 */}
            {user?.companyId && (
                <div style={styles.staffNotice}>
                    <AlertCircle size={20} />
                    <span>직원 계정은 구인공고를 등록할 수 없습니다. 업체 대표에게 문의하세요.</span>
                </div>
            )}

            {/* 통계 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <Briefcase size={24} color="#6366f1" />
                    <div>
                        <div style={styles.statValue}>{jobs.length}</div>
                        <div style={styles.statLabel}>활성 공고</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <Clock size={24} color="#10b981" />
                    <div>
                        <div style={styles.statValue}>
                            {myPendingJobs.filter(j => j.status === 'pending').length}
                        </div>
                        <div style={styles.statLabel}>대기중</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <Users size={24} color="#f59e0b" />
                    <div>
                        <div style={styles.statValue}>
                            {jobs.reduce((sum, j) => sum + (j.views || 0), 0)}
                        </div>
                        <div style={styles.statLabel}>총 조회수</div>
                    </div>
                </div>
            </div>

            {/* 🔥 내 대기중 구인공고 */}
            {myPendingJobs.length > 0 && (
                <div style={styles.pendingSection}>
                    <h3 style={styles.pendingSectionTitle}>
                        내 구인공고 ({myPendingJobs.length})
                    </h3>
                    <div style={styles.pendingList}>
                        {myPendingJobs.map(job => (
                            <div key={job.id} style={styles.pendingCard}>
                                <div style={styles.pendingCardHeader}>
                                    <h4 style={styles.pendingCardTitle}>{job.title}</h4>
                                    {renderStatusBadge(job.status, job.isPaid)}
                                </div>
                                <div style={styles.pendingCardMeta}>
                                    <span>{job.position}</span>
                                    <span>•</span>
                                    <span>{job.location || '지역 미지정'}</span>
                                </div>
                                <div style={styles.pendingCardActions}>
                                    {!job.isPaid && job.status === 'pending' && (
                                        <button
                                            onClick={() => handlePayPendingJob(job)}
                                            style={styles.payButton}
                                            disabled={paymentProcessing}
                                        >
                                            <CreditCard size={16} />
                                            {paymentProcessing ? '처리 중...' : '결제하기'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(job.id)}
                                        style={styles.deleteButtonSmall}
                                    >
                                        <Trash2 size={16} />
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 검색 */}
            <div style={styles.searchBox}>
                <Search size={20} color="#94a3b8" />
                <input
                    type="text"
                    placeholder="직무, 회사명, 지역으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* 구인공고 목록 */}
            {filteredJobs.length === 0 ? (
                <div style={styles.emptyState}>
                    <Briefcase size={64} color="#cbd5e1" />
                    <h3 style={styles.emptyTitle}>등록된 구인공고가 없습니다</h3>
                    <p style={styles.emptyText}>첫 구인공고를 등록해보세요!</p>
                </div>
            ) : (
                <div style={styles.jobsList}>
                    {filteredJobs.map(job => (
                        <div key={job.id} style={styles.jobCard}>
                            <div style={styles.jobHeader}>
                                <div>
                                    {job.headerTitle && (
                                        <div style={styles.headerTitleBadge}>
                                            {job.headerTitle}
                                        </div>
                                    )}
                                    <h3 style={styles.jobTitle}>{job.title}</h3>
                                    <div style={styles.companyInfo}>
                                        <Building2 size={16} />
                                        <span>{job.companyName}</span>
                                        <span style={styles.businessTypeBadge}>
                                            {getBusinessTypeLabel(job.businessType)}
                                        </span>
                                    </div>
                                </div>
                                {job.userId === user.uid && (
                                    <button
                                        onClick={() => handleDelete(job.id)}
                                        style={styles.deleteButton}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div style={styles.jobMeta}>
                                {job.position && (
                                    <span style={styles.metaItem}>
                                        <Briefcase size={14} />
                                        {job.position}
                                    </span>
                                )}
                                {job.location && (
                                    <span style={styles.metaItem}>
                                        <MapPin size={14} />
                                        {job.location}
                                    </span>
                                )}
                                {job.salary && (
                                    <span style={styles.metaItem}>
                                        <DollarSign size={14} />
                                        {job.salary}
                                    </span>
                                )}
                            </div>

                            <div style={styles.jobTags}>
                                <span style={styles.tag}>
                                    {getEmploymentTypeLabel(job.employmentType)}
                                </span>
                                <span style={styles.tag}>
                                    {getExperienceLabel(job.experience)}
                                </span>
                            </div>

                            {job.description && (
                                <p style={styles.jobDescription}>
                                    {job.description.substring(0, 150)}
                                    {job.description.length > 150 && '...'}
                                </p>
                            )}

                            <div style={styles.jobFooter}>
                                <span style={styles.postedDate}>
                                    <Calendar size={14} />
                                    {new Date(job.createdAt).toLocaleDateString('ko-KR')}
                                </span>
                                {job.daysLeft !== undefined && (
                                    <span style={styles.daysLeft}>
                                        D-{job.daysLeft}
                                    </span>
                                )}
                                <button
                                    onClick={() => setSelectedJob(job)}
                                    style={styles.detailButton}
                                >
                                    상세보기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 🔥 결제 모달 */}
            {showPaymentModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>구인공고 결제</h2>
                        
                        {servicePrice && (
                            <div style={styles.paymentInfo}>
                                <div style={styles.paymentInfoRow}>
                                    <span style={styles.paymentLabel}>서비스</span>
                                    <span style={styles.paymentValue}>{servicePrice.name}</span>
                                </div>
                                <div style={styles.paymentInfoRow}>
                                    <span style={styles.paymentLabel}>기간</span>
                                    <span style={styles.paymentValue}>{servicePrice.duration}일</span>
                                </div>
                                <div style={styles.paymentInfoRow}>
                                    <span style={styles.paymentLabel}>금액</span>
                                    <span style={styles.paymentAmount}>
                                        {servicePrice.price.toLocaleString()}원
                                    </span>
                                </div>
                            </div>
                        )}

                        <div style={styles.paymentNotice}>
                            <AlertCircle size={20} color="#6366f1" />
                            <div>
                                <p style={styles.noticeText}>
                                    결제 완료 후 관리자 승인이 필요합니다.
                                </p>
                                <p style={styles.noticeSubtext}>
                                    승인 완료 시 구인공고가 게시됩니다.
                                </p>
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setPendingSaveData(null);
                                }}
                                style={styles.cancelButton}
                                disabled={paymentProcessing}
                            >
                                취소
                            </button>
                            <button
                                onClick={handlePayment}
                                style={styles.payButton}
                                disabled={paymentProcessing || !servicePrice}
                            >
                                <CreditCard size={18} />
                                {paymentProcessing ? '처리 중...' : '결제하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 등록 모달 */}
            {showCreateModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>구인공고 등록</h2>
                        
                        <form onSubmit={handleSavePending} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>헤더 타이틀 (선택)</label>
                                <input
                                    type="text"
                                    value={formData.headerTitle}
                                    onChange={(e) => setFormData({...formData, headerTitle: e.target.value})}
                                    placeholder="예: [긴급채용] 또는 [우대조건]"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>제목 *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="예: 치과 코디네이터 모집"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>직무 *</label>
                                    <input
                                        type="text"
                                        value={formData.position}
                                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                                        placeholder="예: 치과위생사, 치과의사"
                                        style={styles.input}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>지역</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        placeholder="예: 서울 강남구"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>급여</label>
                                    <input
                                        type="text"
                                        value={formData.salary}
                                        onChange={(e) => setFormData({...formData, salary: e.target.value})}
                                        placeholder="예: 연봉 3000만원"
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>고용 형태</label>
                                    <select
                                        value={formData.employmentType}
                                        onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                                        style={styles.select}
                                    >
                                        <option value="fulltime">정규직</option>
                                        <option value="parttime">파트타임</option>
                                        <option value="contract">계약직</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>경력</label>
                                <select
                                    value={formData.experience}
                                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                                    style={styles.select}
                                >
                                    <option value="entry">신입</option>
                                    <option value="junior">경력 1-3년</option>
                                    <option value="senior">경력 3년 이상</option>
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>업무 설명 *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="담당 업무와 역할을 상세히 작성해주세요"
                                    style={{...styles.textarea, minHeight: '120px'}}
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>자격 요건</label>
                                <textarea
                                    value={formData.requirements}
                                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                                    placeholder="필수 자격 요건을 작성해주세요"
                                    style={styles.textarea}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>복리후생</label>
                                <textarea
                                    value={formData.benefits}
                                    onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                                    placeholder="복리후생 내용을 작성해주세요"
                                    style={styles.textarea}
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>연락처 이메일</label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                                        placeholder="example@email.com"
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>연락처 전화</label>
                                    <input
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                                        placeholder="010-0000-0000"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                    style={styles.cancelButton}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={styles.submitButton}
                                >
                                    다음 (결제)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 상세 모달 */}
            {selectedJob && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.detailBody}>
                            {selectedJob.headerTitle && (
                                <div style={styles.headerTitleBadgeLarge}>
                                    {selectedJob.headerTitle}
                                </div>
                            )}

                            <div style={styles.detailCompanyInfo}>
                                <Building2 size={20} color="#6366f1" />
                                <span style={styles.detailCompanyName}>
                                    {selectedJob.companyName}
                                </span>
                                <span style={styles.businessTypeBadge}>
                                    {getBusinessTypeLabel(selectedJob.businessType)}
                                </span>
                            </div>

                            <h2 style={styles.detailJobTitle}>{selectedJob.title}</h2>

                            <div style={styles.infoGrid}>
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>직무</span>
                                    <span style={styles.infoValue}>{selectedJob.position}</span>
                                </div>
                                {selectedJob.location && (
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>지역</span>
                                        <span style={styles.infoValue}>{selectedJob.location}</span>
                                    </div>
                                )}
                                {selectedJob.salary && (
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>급여</span>
                                        <span style={styles.infoValue}>{selectedJob.salary}</span>
                                    </div>
                                )}
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>고용형태</span>
                                    <span style={styles.infoValue}>
                                        {getEmploymentTypeLabel(selectedJob.employmentType)}
                                    </span>
                                </div>
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>경력</span>
                                    <span style={styles.infoValue}>
                                        {getExperienceLabel(selectedJob.experience)}
                                    </span>
                                </div>
                            </div>

                            {selectedJob.description && (
                                <div style={styles.detailSection}>
                                    <h3 style={styles.detailSectionTitle}>업무 설명</h3>
                                    <p style={styles.detailText}>{selectedJob.description}</p>
                                </div>
                            )}

                            {selectedJob.requirements && (
                                <div style={styles.detailSection}>
                                    <h3 style={styles.detailSectionTitle}>자격 요건</h3>
                                    <p style={styles.detailText}>{selectedJob.requirements}</p>
                                </div>
                            )}

                            {selectedJob.benefits && (
                                <div style={styles.detailSection}>
                                    <h3 style={styles.detailSectionTitle}>복리후생</h3>
                                    <p style={styles.detailText}>{selectedJob.benefits}</p>
                                </div>
                            )}

                            {(selectedJob.contactEmail || selectedJob.contactPhone) && (
                                <div style={styles.contactSection}>
                                    <h3 style={styles.contactTitle}>지원 문의</h3>
                                    <div style={styles.contactGrid}>
                                        {selectedJob.contactEmail && (
                                            <div style={styles.contactItem}>
                                                <Mail size={20} color="#0369a1" />
                                                <div>
                                                    <div style={styles.contactLabel}>이메일</div>
                                                    <a
                                                        href={`mailto:${selectedJob.contactEmail}`}
                                                        style={styles.contactValue}
                                                    >
                                                        {selectedJob.contactEmail}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {selectedJob.contactPhone && (
                                            <div style={styles.contactItem}>
                                                <Phone size={20} color="#0369a1" />
                                                <div>
                                                    <div style={styles.contactLabel}>전화</div>
                                                    <a
                                                        href={`tel:${selectedJob.contactPhone}`}
                                                        style={styles.contactValue}
                                                    >
                                                        {selectedJob.contactPhone}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                onClick={() => setSelectedJob(null)}
                                style={styles.cancelButton}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px',
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
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        gap: '20px',
        flexWrap: 'wrap',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '16px',
        color: '#64748b',
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)',
    },
    // 🔥 직원 계정 안내
    staffNotice: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: '#fef3c7',
        border: '2px solid #fde047',
        borderRadius: '12px',
        marginBottom: '24px',
        color: '#92400e',
        fontSize: '14px',
        fontWeight: '500',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    // 🔥 대기중 구인공고 섹션
    pendingSection: {
        marginBottom: '32px',
        padding: '24px',
        backgroundColor: '#fef3c7',
        border: '2px solid #fde047',
        borderRadius: '16px',
    },
    pendingSectionTitle: {
        margin: '0 0 20px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#92400e',
    },
    pendingList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    pendingCard: {
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #fde047',
    },
    pendingCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    pendingCardTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
    },
    pendingCardMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '16px',
    },
    pendingCardActions: {
        display: 'flex',
        gap: '8px',
    },
    // 🔥 상태 배지
    statusBadgePending: {
        padding: '4px 12px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
    },
    statusBadgeWaiting: {
        padding: '4px 12px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
    },
    statusBadgeApproved: {
        padding: '4px 12px',
        backgroundColor: '#dcfce7',
        color: '#16a34a',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
    },
    statusBadgeRejected: {
        padding: '4px 12px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        marginBottom: '24px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#1e293b',
    },
    jobsList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '24px',
    },
    jobCard: {
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s',
        cursor: 'pointer',
    },
    jobHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '12px',
    },
    headerTitleBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fde047',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '700',
        color: '#92400e',
        marginBottom: '8px',
    },
    jobTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    companyInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#64748b',
    },
    businessTypeBadge: {
        padding: '2px 8px',
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
    },
    deleteButton: {
        padding: '8px',
        backgroundColor: 'transparent',
        color: '#ef4444',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    deleteButtonSmall: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    jobMeta: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '12px',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#64748b',
    },
    jobTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '16px',
    },
    tag: {
        padding: '6px 12px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '500',
    },
    jobDescription: {
        margin: '0 0 16px 0',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#475569',
    },
    jobFooter: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #e2e8f0',
    },
    postedDate: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#94a3b8',
    },
    daysLeft: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#ef4444',
    },
    detailButton: {
        marginLeft: 'auto',
        padding: '6px 16px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
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
        padding: '80px 20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
    },
    emptyTitle: {
        margin: '20px 0 8px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    emptyText: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    // 🔥 결제 모달 스타일
    paymentInfo: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        marginBottom: '20px',
    },
    paymentInfoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0',
    },
    paymentLabel: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    paymentValue: {
        fontSize: '15px',
        color: '#1e293b',
        fontWeight: '600',
    },
    paymentAmount: {
        fontSize: '24px',
        color: '#6366f1',
        fontWeight: '700',
    },
    paymentNotice: {
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        marginBottom: '24px',
    },
    noticeText: {
        margin: '0 0 4px 0',
        fontSize: '14px',
        color: '#1e40af',
        fontWeight: '600',
    },
    noticeSubtext: {
        margin: 0,
        fontSize: '13px',
        color: '#3b82f6',
    },
    payButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
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
        padding: '20px',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '32px',
    },
    modalTitle: {
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    formRow: {
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
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
    },
    textarea: {
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        minHeight: '80px',
    },
    select: {
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '8px',
    },
    cancelButton: {
        padding: '10px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitButton: {
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    detailBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    headerTitleBadgeLarge: {
        padding: '12px 20px',
        backgroundColor: '#fef3c7',
        border: '2px solid #fde047',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '700',
        color: '#92400e',
        textAlign: 'center',
    },
    detailCompanyInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    detailCompanyName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#475569',
    },
    detailJobTitle: {
        margin: 0,
        fontSize: '26px',
        fontWeight: '700',
        color: '#1e293b',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    infoLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
    },
    detailSection: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    detailSectionTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#475569',
    },
    detailText: {
        margin: 0,
        fontSize: '15px',
        color: '#64748b',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
    },
    contactSection: {
        padding: '24px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px',
        border: '2px solid #bae6fd',
    },
    contactTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0369a1',
    },
    contactGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
    },
    contactItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
    },
    contactLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#0369a1',
        textTransform: 'uppercase',
        marginBottom: '4px',
    },
    contactValue: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#0c4a6e',
        textDecoration: 'none',
    },
};

export default JobPostManagement;