import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Briefcase, Plus, MapPin, DollarSign, Clock, Trash2, Search, AlertCircle,
    Edit2, X, Building2, Phone, Mail, Users, ChevronRight, CreditCard
} from 'lucide-react';
import {
    loadIamportScript, initializeIamport, requestUnifiedPayment,
    createServicePayment, getServicePrice
} from '../services/UnifiedPaymentService';

function JobBoard({ user }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingJobData, setPendingJobData] = useState(null);
    const [servicePrice, setServicePrice] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    const [formData, setFormData] = useState({
        headerTitle: '', title: '', position: '', location: '', salary: '',
        employmentType: 'fulltime', experience: 'entry', description: '',
        requirements: '', benefits: '', contactEmail: '', contactPhone: ''
    });

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

    // 🎯 loadUserData를 useCallback으로 감싸기
    const loadUserData = useCallback(async () => {
        if (!user?.uid) return;

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserData(data);
                if (!editingJob) {
                    setFormData(prev => ({
                        ...prev,
                        contactEmail: data.email || user.email || '',
                        contactPhone: data.phone || ''
                    }));
                }
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
        }
    }, [user, editingJob]);

    // 🎯 loadJobs를 useCallback으로 감싸기
    const loadJobs = useCallback(async () => {
        try {
            const jobsRef = collection(db, 'jobPostings');
            const q = query(jobsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const jobsList = [];
            const now = new Date();

            querySnapshot.forEach((docSnap) => {
                const jobData = docSnap.data();
                const expiryDate = jobData.expiryDate?.toDate ? jobData.expiryDate.toDate() : new Date(jobData.expiryDate);
                if (expiryDate > now) {
                    const timeDiff = expiryDate - now;
                    const daysLeft = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
                    jobsList.push({ id: docSnap.id, ...jobData, daysLeft: daysLeft });
                }
            });
            setJobs(jobsList);
        } catch (error) {
            console.error('구인 공고 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    }, []); // 의존성 없음

    // 🎯 useEffect 수정 - loadJobs 추가
    useEffect(() => {
        if (user) {
            loadUserData();
            loadJobs();
        }
    }, [user, loadUserData, loadJobs]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (user.companyId) {
            alert('❌ 직원 계정은 구인공고를 등록할 수 없습니다.\n업체 대표에게 문의하세요.');
            return;
        }
        if (editingJob) {
            await updateJobPosting();
            return;
        }
        if (!servicePrice) {
            alert('가격 정보를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }
        setPendingJobData(formData);
        setShowPaymentModal(true);
        setShowForm(false);
    };

    const handlePayment = async () => {
        if (!pendingJobData || !servicePrice) {
            alert('결제 정보를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }
        try {
            setPaymentProcessing(true);
            const jobData = {
                ...pendingJobData,
                userId: user.uid,
                companyName: userData?.businessName || userData?.name || user.email,
                businessType: userData?.businessType || 'dental',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                views: 0,
                status: 'pending',
                isPaid: false
            };
            const docRef = await addDoc(collection(db, 'jobPostings'), jobData);
            console.log('✅ 구인공고 임시 저장 완료:', docRef.id);

            const paymentResult = await requestUnifiedPayment({
                serviceType: 'job-posting',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: userData?.name || user.email,
                buyerEmail: user.email,
                buyerPhone: userData?.phone || '010-0000-0000',
                additionalData: { jobId: docRef.id, title: pendingJobData.title }
            });
            console.log('✅ 결제 완료:', paymentResult);

            await createServicePayment({
                userId: user.uid,
                userInfo: userData || user,
                serviceType: 'job-posting',
                payment: paymentResult,
                contentId: docRef.id,
                contentData: { title: pendingJobData.title, position: pendingJobData.position }
            });

            await updateDoc(doc(db, 'jobPostings', docRef.id), {
                isPaid: true,
                paymentDate: serverTimestamp(),
                orderNumber: paymentResult.orderNumber
            });

            alert('✅ 결제가 완료되었습니다!\n\n관리자 승인 후 구인공고가 게시됩니다.\n승인까지 1-2일 소요될 수 있습니다.');
            setShowPaymentModal(false);
            setPendingJobData(null);
            resetForm();
            loadJobs();
        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert(error.error_msg || '결제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const updateJobPosting = async () => {
        try {
            const jobData = {
                ...formData,
                userId: user.uid,
                companyName: userData?.businessName || '',
                businessType: userData?.businessType || '',
                updatedAt: serverTimestamp()
            };
            await updateDoc(doc(db, 'jobPostings', editingJob.id), jobData);
            alert('공고가 수정되었습니다!');
            resetForm();
            loadJobs();
        } catch (error) {
            console.error('공고 수정 실패:', error);
            alert('공고 수정에 실패했습니다.');
        }
    };

    const startEdit = (job) => {
        setEditingJob(job);
        setFormData({
            headerTitle: job.headerTitle || '', title: job.title || '', position: job.position || '',
            location: job.location || '', salary: job.salary || '', employmentType: job.employmentType || 'fulltime',
            experience: job.experience || 'entry', description: job.description || '',
            requirements: job.requirements || '', benefits: job.benefits || '',
            contactEmail: job.contactEmail || '', contactPhone: job.contactPhone || ''
        });
        setShowForm(true);
        setSelectedJob(null);
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'jobPostings', jobId));
            alert('삭제되었습니다.');
            setSelectedJob(null);
            loadJobs();
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const resetForm = () => {
        setFormData({
            headerTitle: '', title: '', position: '', location: '', salary: '',
            employmentType: 'fulltime', experience: 'entry', description: '',
            requirements: '', benefits: '',
            contactEmail: userData?.email || user.email || '',
            contactPhone: userData?.phone || ''
        });
        setShowForm(false);
        setEditingJob(null);
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.position?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || job.businessType === filter;
        return matchesSearch && matchesFilter;
    });

    const canPost = () => userData?.businessType === 'dental' || userData?.businessType === 'lab';
    const canEdit = (job) => job.userId === user?.uid;
    const getEmploymentTypeLabel = (type) => ({ fulltime: '정규직', parttime: '파트타임', contract: '계약직' }[type] || type);
    const getExperienceLabel = (exp) => ({ entry: '신입', junior: '1-3년', mid: '3-5년', senior: '5년 이상' }[exp] || exp);

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: '20px', color: '#64748b' }}>로딩 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.titleSection}>
                        <Briefcase size={32} color="#6366f1" />
                        <div>
                            <h1 style={styles.title}>구인공고</h1>
                            <p style={styles.subtitle}>치과/기공소의 구인공고를 확인하고 인재를 채용하세요</p>
                        </div>
                    </div>
                </div>
                {canPost() && (
                    <button style={styles.createButton} onClick={() => { setEditingJob(null); setShowForm(true); }}>
                        <Plus size={20} />구인공고 등록
                    </button>
                )}
            </div>

            <div style={styles.searchSection}>
                <div style={styles.searchBox}>
                    <Search size={20} style={styles.searchIcon} />
                    <input type="text" placeholder="공고 제목, 업체명, 포지션으로 검색..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
                <div style={styles.filterButtons}>
                    <button style={filter === 'all' ? styles.filterButtonActive : styles.filterButton} onClick={() => setFilter('all')}>전체</button>
                    <button style={filter === 'dental' ? styles.filterButtonActive : styles.filterButton} onClick={() => setFilter('dental')}>치과</button>
                    <button style={filter === 'lab' ? styles.filterButtonActive : styles.filterButton} onClick={() => setFilter('lab')}>기공소</button>
                </div>
            </div>

            {filteredJobs.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}><Briefcase size={64} /></div>
                    <h3 style={styles.emptyTitle}>등록된 구인공고가 없습니다</h3>
                    <p style={styles.emptyText}>{canPost() && '첫 번째 구인공고를 등록해보세요!'}</p>
                </div>
            ) : (
                <div style={styles.jobGrid}>
                    {filteredJobs.map((job) => (
                        <div key={job.id} style={styles.jobCard} onClick={() => setSelectedJob(job)}>
                            {job.headerTitle && <div style={styles.headerTitleBadge}>{job.headerTitle}</div>}
                            <div style={styles.jobCardHeader}>
                                <div style={styles.companyInfo}>
                                    <Building2 size={18} />
                                    <span style={styles.companyName}>{job.companyName || '업체명 미등록'}</span>
                                    <span style={styles.businessTypeBadge}>{job.businessType === 'dental' ? '치과' : '기공소'}</span>
                                </div>
                                {canEdit(job) && <div style={styles.editBadge}>내 공고</div>}
                            </div>
                            <h3 style={styles.jobTitle}>{job.title}</h3>
                            <div style={styles.jobInfo}>
                                <div style={styles.infoRow}><Users size={16} /><span>{job.position}</span></div>
                                <div style={styles.infoRow}><MapPin size={16} /><span>{job.location || '위치 미등록'}</span></div>
                                <div style={styles.infoRow}><DollarSign size={16} /><span>{job.salary || '급여 협의'}</span></div>
                                <div style={styles.infoRow}><Clock size={16} /><span>{getEmploymentTypeLabel(job.employmentType)}</span></div>
                            </div>
                            <div style={styles.jobFooter}>
                                <span style={styles.experienceBadge}>경력: {getExperienceLabel(job.experience)}</span>
                                <span style={styles.daysLeftBadge}><Clock size={14} />{job.daysLeft}일 남음</span>
                            </div>
                            <div style={styles.arrowIcon}><ChevronRight size={20} /></div>
                        </div>
                    ))}
                </div>
            )}

            {showPaymentModal && (
                <div style={styles.paymentModalOverlay} onClick={() => !paymentProcessing && setShowPaymentModal(false)}>
                    <div style={styles.paymentModal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.paymentModalHeader}>
                            <h2 style={styles.paymentModalTitle}><CreditCard size={24} />구인공고 등록 결제</h2>
                            <button style={styles.paymentCloseButton} onClick={() => !paymentProcessing && setShowPaymentModal(false)} disabled={paymentProcessing}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={styles.paymentModalBody}>
                            <div style={styles.paymentInfoSection}>
                                <div style={styles.paymentAmountText}>
                                    <div style={styles.paymentLabel}>결제 금액</div>
                                    <div style={styles.paymentAmount}>
                                        <span style={styles.priceAmount}>{servicePrice?.price?.toLocaleString() || '20,000'}</span>
                                        <span style={styles.priceUnit}>원</span>
                                    </div>
                                </div>
                            </div>
                            <div style={styles.paymentInfoBox}>
                                <h3 style={styles.paymentInfoTitle}>포함 내용</h3>
                                <ul style={styles.paymentInfoList}>
                                    <li>{servicePrice?.duration || 30}일간 구인공고 게시</li>
                                    <li>구직자에게 노출 및 검색 가능</li>
                                    <li>관리자 승인 후 게시 (1-2일 소요)</li>
                                </ul>
                            </div>
                            <button style={styles.paymentButton} onClick={handlePayment} disabled={paymentProcessing}>
                                {paymentProcessing ? (
                                    <><div style={styles.paymentSpinner}></div>결제 처리 중...</>
                                ) : (
                                    <><CreditCard size={20} />{servicePrice?.price?.toLocaleString() || '20,000'}원 결제하기</>
                                )}
                            </button>
                            <div style={styles.paymentNotice}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>결제 안내</div>
                                    <div>• 결제 후 관리자 승인이 완료되면 구인공고가 게시됩니다</div>
                                    <div>• 승인까지 1-2일 소요될 수 있습니다</div>
                                    <div>• 부적절한 내용은 반려될 수 있으며, 환불됩니다</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{editingJob ? '구인공고 수정' : '구인공고 등록'}</h2>
                            <button style={styles.modalCloseButton} onClick={() => { setShowForm(false); resetForm(); }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <form onSubmit={handleSubmit} style={styles.form}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>헤더 타이틀 (선택, 예: "급구", "우대조건")</label>
                                    <input type="text" value={formData.headerTitle} onChange={(e) => setFormData({ ...formData, headerTitle: e.target.value })}
                                        style={styles.input} placeholder="예: 급구, 즉시 채용, 경력 우대" />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>공고 제목 *</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required style={styles.input} placeholder="예: 치과 코디네이터 채용" />
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>모집 포지션 *</label>
                                        <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                            required style={styles.input} placeholder="예: 치과위생사" />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>근무 위치</label>
                                        <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            style={styles.input} placeholder="예: 서울 강남구" />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>급여</label>
                                        <input type="text" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                            style={styles.input} placeholder="예: 연봉 3000만원 ~ 4000만원" />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>고용 형태</label>
                                        <select value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })} style={styles.select}>
                                            <option value="fulltime">정규직</option>
                                            <option value="parttime">파트타임</option>
                                            <option value="contract">계약직</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>경력 요구사항</label>
                                    <select value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} style={styles.select}>
                                        <option value="entry">신입</option>
                                        <option value="junior">1-3년</option>
                                        <option value="mid">3-5년</option>
                                        <option value="senior">5년 이상</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>업무 설명 *</label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required style={styles.textarea} rows={6} placeholder="담당할 업무를 자세히 설명해주세요..." />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>자격 요건</label>
                                    <textarea value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                                        style={styles.textarea} rows={4} placeholder="필요한 자격이나 경험을 적어주세요..." />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>복리후생</label>
                                    <textarea value={formData.benefits} onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                                        style={styles.textarea} rows={4} placeholder="제공하는 복리후생을 적어주세요..." />
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}><Mail size={16} />이메일 *</label>
                                        <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            required style={styles.input} placeholder="contact@example.com" />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}><Phone size={16} />전화번호</label>
                                        <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                            style={styles.input} placeholder="010-0000-0000" />
                                    </div>
                                </div>
                                <div style={styles.modalActions}>
                                    <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={styles.cancelButton}>취소</button>
                                    <button type="submit" style={styles.submitButton}>{editingJob ? '수정하기' : '등록하기'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {selectedJob && (
                <div style={styles.modalOverlay} onClick={() => setSelectedJob(null)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>구인공고 상세</h2>
                            <button style={styles.modalCloseButton} onClick={() => setSelectedJob(null)}><X size={24} /></button>
                        </div>
                        <div style={styles.modalBody}>
                            {selectedJob.headerTitle && <div style={styles.modalHeaderTitle}>{selectedJob.headerTitle}</div>}
                            <div style={styles.modalCompanyInfo}>
                                <div style={styles.companyInfoLeft}>
                                    <Building2 size={20} />
                                    <span style={styles.modalCompanyName}>{selectedJob.companyName || '업체명 미등록'}</span>
                                    <span style={styles.businessTypeBadgeLarge}>{selectedJob.businessType === 'dental' ? '치과' : '기공소'}</span>
                                </div>
                                {canEdit(selectedJob) && (
                                    <div style={styles.modalActionsDiv}>
                                        <button style={styles.modalEditButton} onClick={() => startEdit(selectedJob)}>
                                            <Edit2 size={16} />수정
                                        </button>
                                        <button style={styles.modalDeleteButton} onClick={() => handleDelete(selectedJob.id)}>
                                            <Trash2 size={16} />삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                            <h3 style={styles.modalJobTitle}>{selectedJob.title}</h3>
                            <div style={styles.infoGrid}>
                                <div style={styles.infoGridItem}>
                                    <span style={styles.infoLabel}>포지션</span>
                                    <span style={styles.infoValue}>{selectedJob.position}</span>
                                </div>
                                <div style={styles.infoGridItem}>
                                    <span style={styles.infoLabel}>위치</span>
                                    <span style={styles.infoValue}>{selectedJob.location || '미등록'}</span>
                                </div>
                                <div style={styles.infoGridItem}>
                                    <span style={styles.infoLabel}>급여</span>
                                    <span style={styles.infoValue}>{selectedJob.salary || '협의'}</span>
                                </div>
                                <div style={styles.infoGridItem}>
                                    <span style={styles.infoLabel}>고용형태</span>
                                    <span style={styles.infoValue}>{getEmploymentTypeLabel(selectedJob.employmentType)}</span>
                                </div>
                                <div style={styles.infoGridItem}>
                                    <span style={styles.infoLabel}>경력</span>
                                    <span style={styles.infoValue}>{getExperienceLabel(selectedJob.experience)}</span>
                                </div>
                                <div style={styles.infoGridItem}>
                                    <span style={styles.infoLabel}>남은 기간</span>
                                    <span style={styles.infoValue}>{selectedJob.daysLeft}일</span>
                                </div>
                            </div>
                            <div style={styles.detailSection}>
                                <h4 style={styles.detailTitle}>업무 설명</h4>
                                <p style={styles.detailContent}>{selectedJob.description}</p>
                            </div>
                            {selectedJob.requirements && (
                                <div style={styles.detailSection}>
                                    <h4 style={styles.detailTitle}>자격 요건</h4>
                                    <p style={styles.detailContent}>{selectedJob.requirements}</p>
                                </div>
                            )}
                            {selectedJob.benefits && (
                                <div style={styles.detailSection}>
                                    <h4 style={styles.detailTitle}>복리후생</h4>
                                    <p style={styles.detailContent}>{selectedJob.benefits}</p>
                                </div>
                            )}
                            <div style={styles.contactSection}>
                                <h4 style={styles.contactSectionTitle}>지원 문의</h4>
                                <div style={styles.contactGrid}>
                                    {selectedJob.contactEmail && (
                                        <div style={styles.contactItem}>
                                            <Mail size={20} color="#0369a1" />
                                            <div>
                                                <div style={styles.contactLabel}>이메일</div>
                                                <a href={`mailto:${selectedJob.contactEmail}`} style={styles.contactValue}>{selectedJob.contactEmail}</a>
                                            </div>
                                        </div>
                                    )}
                                    {selectedJob.contactPhone && (
                                        <div style={styles.contactItem}>
                                            <Phone size={20} color="#0369a1" />
                                            <div>
                                                <div style={styles.contactLabel}>전화번호</div>
                                                <a href={`tel:${selectedJob.contactPhone}`} style={styles.contactValue}>{selectedJob.contactPhone}</a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { maxWidth: '1400px', margin: '0 auto', padding: '32px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' },
    spinner: { width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '20px', flexWrap: 'wrap' },
    headerLeft: { flex: 1 },
    titleSection: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' },
    title: { margin: 0, fontSize: '32px', fontWeight: '700', color: '#0f172a' },
    subtitle: { margin: '4px 0 0 0', fontSize: '15px', color: '#64748b' },
    createButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' },
    searchSection: { display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' },
    searchBox: { flex: 1, position: 'relative', minWidth: '300px' },
    searchIcon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' },
    searchInput: { width: '100%', padding: '12px 16px 12px 48px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', outline: 'none', transition: 'all 0.2s' },
    filterButtons: { display: 'flex', gap: '8px' },
    filterButton: { padding: '10px 20px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' },
    filterButtonActive: { padding: '10px 20px', backgroundColor: '#6366f1', border: '2px solid #6366f1', borderRadius: '12px', fontSize: '14px', fontWeight: '600', color: 'white', cursor: 'pointer', transition: 'all 0.2s' },
    jobGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' },
    jobCard: { position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.3s' },
    headerTitleBadge: { display: 'inline-block', padding: '6px 12px', backgroundColor: '#fef3c7', border: '2px solid #fde047', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#92400e', marginBottom: '12px' },
    jobCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' },
    companyInfo: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
    companyName: { fontSize: '14px', fontWeight: '600', color: '#475569' },
    businessTypeBadge: { padding: '3px 8px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px' },
    editBadge: { padding: '4px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '6px' },
    jobTitle: { margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' },
    jobInfo: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
    infoRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' },
    jobFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
    experienceBadge: { fontSize: '13px', fontWeight: '600', color: '#6366f1' },
    daysLeftBadge: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
    arrowIcon: { position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)', color: '#cbd5e1', opacity: 0, transition: 'all 0.3s' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', backgroundColor: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' },
    emptyIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', backgroundColor: '#f8fafc', borderRadius: '50%', marginBottom: '24px', color: '#cbd5e1' },
    emptyTitle: { margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b' },
    emptyText: { margin: 0, fontSize: '14px', color: '#64748b' },
    paymentModalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' },
    paymentModal: { backgroundColor: 'white', borderRadius: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', animation: 'slideUp 0.3s ease' },
    paymentModalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px', borderBottom: '2px solid #f1f5f9' },
    paymentModalTitle: { display: 'flex', alignItems: 'center', gap: '12px', margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' },
    paymentCloseButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' },
    paymentModalBody: { padding: '32px' },
    paymentInfoSection: { padding: '32px', backgroundColor: '#f8fafc', borderRadius: '16px', marginBottom: '24px', textAlign: 'center', border: '2px solid #e2e8f0' },
    paymentAmountText: { textAlign: 'center' },
    paymentLabel: { fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '8px' },
    paymentAmount: { display: 'flex', alignItems: 'baseline', justifyContent: 'center' },
    priceAmount: { fontSize: '48px', fontWeight: '700', color: '#1e293b' },
    priceUnit: { fontSize: '18px', color: '#64748b', marginLeft: '4px' },
    paymentInfoBox: { padding: '24px', backgroundColor: '#f0f9ff', borderRadius: '12px', marginBottom: '24px', border: '2px solid #bae6fd' },
    paymentInfoTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0369a1' },
    paymentInfoList: { margin: 0, paddingLeft: '20px', listStyle: 'disc', color: '#0c4a6e', fontSize: '14px', lineHeight: '1.8' },
    paymentButton: { width: '100%', padding: '16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' },
    paymentSpinner: { width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    paymentNotice: { display: 'flex', gap: '12px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px', fontSize: '13px', color: '#64748b', lineHeight: '1.6' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'hidden', zIndex: 1000, display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '2px solid #f1f5f9', backgroundColor: '#fafbfc' },
    modalTitle: { margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' },
    modalCloseButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' },
    modalBody: { padding: '32px', overflowY: 'auto', flex: 1 },
    modalHeaderTitle: { padding: '16px 24px', backgroundColor: '#fef3c7', border: '2px solid #fde047', borderRadius: '12px', fontSize: '16px', fontWeight: '700', color: '#92400e', marginBottom: '24px', textAlign: 'center' },
    modalCompanyInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' },
    companyInfoLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
    modalCompanyName: { fontSize: '16px', fontWeight: '600', color: '#475569' },
    businessTypeBadgeLarge: { padding: '5px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px' },
    modalActionsDiv: { display: 'flex', gap: '8px' },
    modalEditButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'transparent', border: '2px solid #6366f1', borderRadius: '8px', color: '#6366f1', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    modalDeleteButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'transparent', border: '2px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    modalJobTitle: { margin: '0 0 24px 0', fontSize: '26px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' },
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' },
    infoGridItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
    infoLabel: { fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
    infoValue: { fontSize: '15px', fontWeight: '600', color: '#1e293b' },
    detailSection: { marginBottom: '24px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' },
    detailTitle: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#475569' },
    detailContent: { margin: 0, fontSize: '15px', color: '#64748b', lineHeight: '1.7', whiteSpace: 'pre-wrap' },
    contactSection: { padding: '24px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '2px solid #bae6fd' },
    contactSectionTitle: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0369a1' },
    contactGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' },
    contactItem: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
    contactLabel: { fontSize: '12px', fontWeight: '600', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
    contactValue: { fontSize: '15px', fontWeight: '600', color: '#0c4a6e', textDecoration: 'none' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    label: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#475569' },
    input: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'all 0.2s' },
    textarea: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', minHeight: '80px', transition: 'all 0.2s' },
    select: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', cursor: 'pointer' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' },
    cancelButton: { padding: '10px 24px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    submitButton: { padding: '10px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(styleSheet);

export default JobBoard;