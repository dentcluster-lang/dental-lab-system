import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { GraduationCap, Plus, Search, Calendar, MapPin, Clock, Trash2, User, CreditCard, AlertCircle, DollarSign, History, HourglassIcon } from 'lucide-react';
import { loadIamportScript, initializeIamport, requestUnifiedPayment, createServicePayment, getServicePrice } from '../services/UnifiedPaymentService';

function Seminars({ user }) {
    const [seminars, setSeminars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [showRegistrationHistory, setShowRegistrationHistory] = useState(false);
    const [pendingSeminars, setPendingSeminars] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSeminarDetail, setSelectedSeminarDetail] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState(null);
    const [servicePrice, setServicePrice] = useState(null);
    
    const [formData, setFormData] = useState({
        title: '', instructor: '', date: '', time: '', location: '',
        targetAudience: '', description: '', topics: '', contactInfo: ''
    });

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        if (imageFiles.length + files.length > 5) {
            alert('이미지는 최대 5개까지 업로드 가능합니다.');
            return;
        }
        const validFiles = [];
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name}은(는) 5MB를 초과합니다.`);
                continue;
            }
            if (!file.type.startsWith('image/')) {
                alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
                continue;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                validFiles.push({ file: file, preview: reader.result, id: Date.now() + Math.random() });
                if (validFiles.length === files.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/')).length) {
                    setImageFiles(prev => [...prev, ...validFiles]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = (imageId) => setImageFiles(prev => prev.filter(img => img.id !== imageId));

    const uploadImages = async (files) => {
        if (files.length === 0) return [];
        try {
            const uploadPromises = files.map(async (fileObj) => {
                const timestamp = Date.now();
                const fileName = `seminars/${user.uid}/${timestamp}_${fileObj.file.name}`;
                const storageRef = ref(storage, fileName);
                await uploadBytes(storageRef, fileObj.file);
                return await getDownloadURL(storageRef);
            });
            return await Promise.all(uploadPromises);
        } catch (error) {
            console.error('❌ 이미지 업로드 실패:', error);
            throw error;
        }
    };

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
                const priceInfo = await getServicePrice('seminar');
                setServicePrice(priceInfo);
                console.log('✅ 세미나 등록 가격 로드:', priceInfo);
            } catch (error) {
                console.error('❌ 가격 로드 실패:', error);
            }
        };
        loadPrice();
    }, []);

    const canRegisterSeminar = useCallback(() => {
        if (!user) return false;
        if (user.isAdmin || user.role === 'admin') return true;
        const businessType = user.companyId ? user.companyBusinessType : user.businessType;
        return businessType === 'dental' || businessType === 'clinic' || businessType === 'lab' || businessType === 'seller';
    }, [user]);

    const loadSeminars = useCallback(async () => {
        try {
            const seminarsRef = collection(db, 'seminars');
            const q = query(seminarsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const seminarsList = [];
            const now = new Date();
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const expiryDate = data.expiryDate?.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
                if (expiryDate > now) {
                    const timeDiff = expiryDate - now;
                    const daysLeft = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
                    seminarsList.push({ id: docSnap.id, ...data, daysLeft });
                }
            });
            setSeminars(seminarsList);
        } catch (error) {
            console.error('❌ 세미나 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPendingSeminars = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const seminarsRef = collection(db, 'seminars');
            const q = query(seminarsRef, where('userId', '==', user.uid), where('status', 'in', ['pending', 'approved', 'rejected']), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const pendingList = [];
            querySnapshot.forEach((docSnap) => {
                pendingList.push({ id: docSnap.id, ...docSnap.data() });
            });
            setPendingSeminars(pendingList);
        } catch (error) {
            console.error('❌ 대기중 세미나 로드 실패:', error);
        }
    }, [user?.uid]);

    const loadMyRegistrations = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const registrationsRef = collection(db, 'seminarRegistrations');
            const q = query(registrationsRef, where('userId', '==', user.uid), orderBy('registrationDate', 'desc'));
            const querySnapshot = await getDocs(q);
            const registrationsList = [];
            querySnapshot.forEach((docSnap) => {
                registrationsList.push({ id: docSnap.id, ...docSnap.data() });
            });
            setMyRegistrations(registrationsList);
        } catch (error) {
            console.error('❌ 등록 내역 로드 실패:', error);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        loadSeminars();
        loadMyRegistrations();
        loadPendingSeminars();
    }, [user, loadSeminars, loadMyRegistrations, loadPendingSeminars]);

    const handleRegisterClick = () => {
        if (!canRegisterSeminar()) {
            alert('치과, 기공소, 판매자만 세미나를 등록할 수 있습니다.');
            return;
        }
        setShowFormModal(true);
    };

    const resetForm = () => {
        setFormData({ title: '', instructor: '', date: '', time: '', location: '', targetAudience: '', description: '', topics: '', contactInfo: '' });
        setImageFiles([]);
    };

    const handlePayment = async () => {
        if (!servicePrice) {
            alert('가격 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        if (user.companyId) {
            alert('❌ 직원 계정은 결제할 수 없습니다.\n업체 대표 계정으로 로그인하여 결제해주세요.');
            setShowPaymentModal(false);
            return;
        }
        try {
            setPaymentProcessing(true);
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'seminar',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: user.name || user.email,
                buyerEmail: user.email,
                buyerPhone: user.phone || '010-0000-0000',
                additionalData: { title: pendingSaveData.title, instructor: pendingSaveData.instructor }
            });
            await createServicePayment({
                userId: user.uid,
                userInfo: user,
                serviceType: 'seminar',
                payment: paymentResult,
                contentId: pendingSaveData.seminarId,
                contentData: pendingSaveData
            });
            await updateDoc(doc(db, 'seminars', pendingSaveData.seminarId), {
                isPaid: true,
                paymentDate: serverTimestamp(),
                orderNumber: paymentResult.orderNumber
            });
            alert(`✅ 결제가 완료되었습니다!\n\n관리자 승인 후 세미나가 게시됩니다.\n승인까지 1-2일 소요될 수 있습니다.`);
            setShowPaymentModal(false);
            setPendingSaveData(null);
            loadPendingSeminars();
        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert(`결제에 실패했습니다.\n${error.error_msg || error.message || '알 수 없는 오류'}`);
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handlePayPendingSeminar = async (seminar) => {
        if (user.companyId) {
            alert('❌ 직원 계정은 결제할 수 없습니다.\n업체 대표 계정으로 로그인하여 결제해주세요.');
            return;
        }
        if (seminar.isPaid) {
            alert('이미 결제가 완료되어 관리자 승인 대기 중입니다.');
            return;
        }
        setPendingSaveData({ seminarId: seminar.id, ...seminar });
        setShowPaymentModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (user.companyId) {
            alert('❌ 직원 계정은 세미나를 등록할 수 없습니다.\n업체 대표 계정으로 로그인하여 등록해주세요.');
            return;
        }
        if (!canRegisterSeminar()) {
            alert('세미나 등록 권한이 없습니다.');
            return;
        }
        try {
            setUploading(true);
            let imageUrls = [];
            if (imageFiles.length > 0) {
                imageUrls = await uploadImages(imageFiles);
            }
            const seminarData = {
                ...formData,
                userId: user.uid,
                userName: user.name || user.email,
                userEmail: user.email,
                businessName: user.businessName || '',
                businessType: user.companyId ? user.companyBusinessType : user.businessType,
                imageUrls: imageUrls,
                status: 'pending',
                isPaid: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, 'seminars'), seminarData);
            setPendingSaveData({ seminarId: docRef.id, ...seminarData });
            setShowFormModal(false);
            setShowPaymentModal(true);
            resetForm();
        } catch (error) {
            console.error('❌ 세미나 저장 실패:', error);
            alert('세미나 저장 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (seminarId) => {
        if (!window.confirm('세미나를 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'seminars', seminarId));
            alert('삭제되었습니다.');
            setShowDetailModal(false);
            loadSeminars();
            loadPendingSeminars();
        } catch (error) {
            console.error('❌ 삭제 실패:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleSeminarClick = (seminar) => {
        setSelectedSeminarDetail(seminar);
        setShowDetailModal(true);
    };

    const getSeminarStatus = (seminar) => {
        const seminarDate = new Date(seminar.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return seminarDate < today ? 'closed' : 'upcoming';
    };

    const isRegistrationExpired = (registration) => new Date(registration.expiryDate) < new Date();
    const getDaysRemaining = (expiryDate) => {
        const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const filteredSeminars = seminars.filter(seminar => {
        const matchesSearch = seminar.title.toLowerCase().includes(searchTerm.toLowerCase()) || seminar.instructor.toLowerCase().includes(searchTerm.toLowerCase());
        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && getSeminarStatus(seminar) === statusFilter;
    });

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: '승인 대기', color: '#f59e0b', bg: '#fef3c7' },
            approved: { text: '승인됨 (결제대기)', color: '#10b981', bg: '#d1fae5' },
            rejected: { text: '반려됨', color: '#ef4444', bg: '#fee2e2' },
            active: { text: '게시 중', color: '#8b5cf6', bg: '#ede9fe' }
        };
        return badges[status] || badges.pending;
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.header}>
                    <div style={styles.titleSection}>
                        <GraduationCap size={32} style={{ color: '#8b5cf6' }} />
                        <div>
                            <h1 style={styles.title}>세미나</h1>
                            <p style={styles.subtitle}>치과·기공소 교육 및 세미나 정보</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {user && (
                            <>
                                <button onClick={() => setShowRegistrationHistory(!showRegistrationHistory)} style={styles.historyButton}>
                                    <History size={20} />내 등록 내역
                                </button>
                                <button onClick={handleRegisterClick} style={styles.registerButton}>
                                    <Plus size={20} />세미나 등록
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {pendingSeminars.length > 0 && (
                    <div style={styles.pendingSection}>
                        <h3 style={styles.sectionTitle}><HourglassIcon size={20} />내 세미나 신청 현황</h3>
                        <div style={styles.pendingList}>
                            {pendingSeminars.map((seminar) => {
                                const badge = getStatusBadge(seminar.status);
                                return (
                                    <div key={seminar.id} style={styles.pendingCard}>
                                        <div style={styles.pendingHeader}>
                                            <h4 style={styles.pendingTitle}>{seminar.title}</h4>
                                            <span style={{ ...styles.statusBadge, backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                                        </div>
                                        <div style={styles.pendingInfo}>
                                            <span>{seminar.date && new Date(seminar.date).toLocaleDateString('ko-KR')} {seminar.time}</span>
                                            <span>{seminar.location}</span>
                                        </div>
                                        {seminar.status === 'pending' && !seminar.isPaid && (
                                            <button onClick={() => handlePayPendingSeminar(seminar)} style={styles.payPendingButton}>
                                                <CreditCard size={16} />결제하기
                                            </button>
                                        )}
                                        {seminar.status === 'pending' && seminar.isPaid && (
                                            <span style={styles.waitingText}><AlertCircle size={16} />관리자 승인 대기중</span>
                                        )}
                                        {seminar.status === 'rejected' && seminar.rejectionReason && (
                                            <div style={styles.rejectionReason}><AlertCircle size={16} /><span>반려 사유: {seminar.rejectionReason}</span></div>
                                        )}
                                        <button onClick={() => handleDelete(seminar.id)} style={styles.deleteSmallButton}>
                                            <Trash2 size={14} />삭제
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {showRegistrationHistory && (
                    <div style={styles.registrationHistorySection}>
                        <h3 style={styles.sectionTitle}><CreditCard size={20} />내 세미나 등록 내역</h3>
                        {myRegistrations.length === 0 ? (
                            <div style={styles.emptyRegistrations}>등록 내역이 없습니다.</div>
                        ) : (
                            <div style={styles.registrationList}>
                                {myRegistrations.map((registration) => {
                                    const expired = isRegistrationExpired(registration);
                                    const daysRemaining = getDaysRemaining(registration.expiryDate);
                                    return (
                                        <div key={registration.id} style={styles.registrationCard}>
                                            <div style={styles.registrationHeader}>
                                                <h4 style={styles.registrationTitle}>{registration.seminarTitle}</h4>
                                                <span style={{ ...styles.registrationStatus, ...(expired ? styles.registrationStatusExpired : styles.registrationStatusActive) }}>
                                                    {expired ? '게시 종료' : '게시 중'}
                                                </span>
                                            </div>
                                            <div style={styles.registrationDetails}>
                                                <div style={styles.registrationRow}>
                                                    <span style={styles.registrationLabel}>등록 비용:</span>
                                                    <span style={styles.registrationValue}>{registration.amount.toLocaleString()}원</span>
                                                </div>
                                                <div style={styles.registrationRow}>
                                                    <span style={styles.registrationLabel}>등록일:</span>
                                                    <span style={styles.registrationValue}>{new Date(registration.registrationDate).toLocaleDateString('ko-KR')}</span>
                                                </div>
                                                <div style={styles.registrationRow}>
                                                    <span style={styles.registrationLabel}>만료일:</span>
                                                    <span style={{ ...styles.registrationValue, color: expired ? '#dc2626' : '#16a34a' }}>
                                                        {new Date(registration.expiryDate).toLocaleDateString('ko-KR')}
                                                        {!expired && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(D-{daysRemaining})</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div style={styles.filterSection}>
                    <div style={styles.searchBox}>
                        <Search size={20} style={{ color: '#94a3b8' }} />
                        <input type="text" placeholder="세미나 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                    </div>
                    <div style={styles.filterButtons}>
                        <button onClick={() => setStatusFilter('all')} style={{ ...styles.filterButton, ...(statusFilter === 'all' ? styles.filterButtonActive : {}) }}>전체</button>
                        <button onClick={() => setStatusFilter('upcoming')} style={{ ...styles.filterButton, ...(statusFilter === 'upcoming' ? styles.filterButtonActive : {}) }}>예정</button>
                        <button onClick={() => setStatusFilter('closed')} style={{ ...styles.filterButton, ...(statusFilter === 'closed' ? styles.filterButtonActive : {}) }}>종료</button>
                    </div>
                </div>

                {filteredSeminars.length === 0 ? (
                    <div style={styles.emptyState}>
                        <GraduationCap size={64} style={{ color: '#cbd5e1' }} />
                        <p style={styles.emptyText}>{searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 세미나가 없습니다.'}</p>
                    </div>
                ) : (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeader}>
                                    <th style={styles.th}>상태</th>
                                    <th style={{ ...styles.th, textAlign: 'left', minWidth: '200px' }}>세미나 제목</th>
                                    <th style={styles.th}>강사</th>
                                    <th style={styles.th}>날짜</th>
                                    <th style={styles.th}>시간</th>
                                    <th style={styles.th}>장소</th>
                                    <th style={styles.th}>대상</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSeminars.map((seminar) => {
                                    const status = getSeminarStatus(seminar);
                                    const isOwner = seminar.userId === user.uid;
                                    return (
                                        <tr key={seminar.id} style={styles.tableRow} onClick={() => handleSeminarClick(seminar)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td style={styles.td}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ ...styles.statusBadge, ...(status === 'upcoming' ? styles.statusBadgeUpcoming : styles.statusBadgeClosed) }}>
                                                        {status === 'upcoming' ? '예정' : '종료'}
                                                    </span>
                                                    {isOwner && <span style={{ ...styles.statusBadge, backgroundColor: '#dcfce7', color: '#166534', fontSize: '11px' }}>D-{seminar.daysLeft}</span>}
                                                </div>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {seminar.imageUrls && seminar.imageUrls.length > 0 && (
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                                            <img src={seminar.imageUrls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    )}
                                                    <span>{seminar.title}</span>
                                                </div>
                                            </td>
                                            <td style={styles.td}>{seminar.instructor}</td>
                                            <td style={styles.td}>{new Date(seminar.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                            <td style={styles.td}>{seminar.time}</td>
                                            <td style={styles.td}>{seminar.location}</td>
                                            <td style={styles.td}><span style={styles.targetBadge}>{seminar.targetAudience}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showFormModal && (
                <div style={styles.modalOverlay} onClick={() => setShowFormModal(false)}>
                    <div style={styles.formModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}><GraduationCap size={24} />세미나 등록 신청</h3>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.infoNotice}>
                                <AlertCircle size={16} />
                                <span>등록 후 결제를 통해 세미나를 게시할 수 있습니다.</span>
                            </div>
                            <div style={styles.form}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>세미나 제목 *</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="예: 디지털 임플란트 실전 과정" style={styles.input} />
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>강사 *</label>
                                        <input type="text" value={formData.instructor} onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                                            placeholder="예: 홍길동 원장" style={styles.input} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>대상 *</label>
                                        <input type="text" value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                            placeholder="예: 치과의사, 치과기공사" style={styles.input} />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>날짜 *</label>
                                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={styles.input} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>시간 *</label>
                                        <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} style={styles.input} />
                                    </div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>장소 *</label>
                                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="예: 서울 강남구 테헤란로 123" style={styles.input} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>세미나 소개 *</label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="세미나에 대한 설명을 입력하세요" style={styles.textarea} rows={4} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>주요 내용</label>
                                    <textarea value={formData.topics} onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                                        placeholder="세미나에서 다룰 주요 주제나 커리큘럼" style={styles.textarea} rows={3} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>문의처</label>
                                    <input type="text" value={formData.contactInfo} onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                                        placeholder="연락처 또는 이메일" style={styles.input} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>세미나 이미지 {imageFiles.length > 0 && `(${imageFiles.length}/5)`}</label>
                                    <div style={styles.imageUploadSection}>
                                        {imageFiles.length > 0 && (
                                            <div style={styles.imageList}>
                                                {imageFiles.map((img, index) => (
                                                    <div key={img.id} style={styles.imageItem}>
                                                        <div style={styles.imageNumberLabel}>이미지 {index + 1}</div>
                                                        <img src={img.preview} alt={`미리보기 ${index + 1}`} style={styles.imageThumbnail} />
                                                        <button type="button" onClick={() => handleRemoveImage(img.id)} style={styles.removeImageIconButton}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {imageFiles.length < 5 && (
                                            <label style={styles.imageUploadLabel}>
                                                <input type="file" accept="image/*" multiple onChange={handleImageChange} style={styles.imageInput} />
                                                <div style={styles.imageUploadBox}>
                                                    <div style={styles.uploadIcon}>📷</div>
                                                    <div style={styles.uploadText}>
                                                        <p style={styles.uploadMainText}>{imageFiles.length === 0 ? '이미지 업로드' : '이미지 추가'}</p>
                                                        <p style={styles.uploadSubText}>JPG, PNG (최대 5MB, {5 - imageFiles.length}개 추가 가능)</p>
                                                    </div>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowFormModal(false)} style={styles.modalCancelButton} disabled={uploading}>취소</button>
                            <button onClick={handleSubmit} style={{ ...styles.modalSubmitButton, ...(uploading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={uploading}>
                                {uploading ? '업로드 중...' : '신청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && pendingSaveData && (
                <div style={styles.modalOverlay} onClick={() => !paymentProcessing && setShowPaymentModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}><CreditCard size={24} />세미나 등록 결제</h3>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.paymentInfo}>
                                <h4 style={styles.paymentInfoTitle}>{pendingSaveData.title}</h4>
                                <div style={styles.paymentInfoGrid}>
                                    <div style={styles.paymentInfoItem}>
                                        <span style={styles.paymentInfoLabel}>등록 비용</span>
                                        <span style={styles.paymentInfoValue}>{servicePrice?.price?.toLocaleString() || '20,000'}원</span>
                                    </div>
                                    <div style={styles.paymentInfoItem}>
                                        <span style={styles.paymentInfoLabel}>게시 기간</span>
                                        <span style={styles.paymentInfoValue}>{servicePrice?.duration || 30}일</span>
                                    </div>
                                    <div style={styles.paymentInfoItem}>
                                        <span style={styles.paymentInfoLabel}>세미나 일시</span>
                                        <span style={styles.paymentInfoValue}>
                                            {pendingSaveData.date && new Date(pendingSaveData.date).toLocaleDateString('ko-KR')} {pendingSaveData.time}
                                        </span>
                                    </div>
                                </div>
                                <div style={styles.paymentNotice}>
                                    <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                    <div>
                                        <p style={styles.noticeText}>• 결제 후 관리자 승인이 완료되면 세미나가 게시됩니다</p>
                                        <p style={styles.noticeText}>• 승인까지 1-2일 소요될 수 있습니다</p>
                                        <p style={styles.noticeText}>• {servicePrice?.duration || 30}일간 세미나 공지가 게시됩니다</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => !paymentProcessing && setShowPaymentModal(false)} style={styles.modalCancelButton} disabled={paymentProcessing}>취소</button>
                            <button onClick={handlePayment} style={styles.modalPayButton} disabled={paymentProcessing}>
                                {paymentProcessing ? '결제 처리 중...' : <><DollarSign size={18} />{servicePrice?.price?.toLocaleString() || '20,000'}원 결제하기</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDetailModal && selectedSeminarDetail && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.detailModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}><GraduationCap size={24} />세미나 상세정보</h3>
                            <button onClick={() => setShowDetailModal(false)} style={styles.closeButton}>✕</button>
                        </div>
                        <div style={styles.detailModalBody}>
                            {selectedSeminarDetail.imageUrls && selectedSeminarDetail.imageUrls.length > 0 && (
                                <div style={styles.detailImagesContainer}>
                                    {selectedSeminarDetail.imageUrls.map((imageUrl, index) => (
                                        <div key={index} style={styles.detailImageWrapper}>
                                            {selectedSeminarDetail.imageUrls.length > 1 && (
                                                <div style={styles.detailImageNumberLabel}>이미지 {index + 1} / {selectedSeminarDetail.imageUrls.length}</div>
                                            )}
                                            <img src={imageUrl} alt={`${selectedSeminarDetail.title} ${index + 1}`} style={styles.detailImage} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={styles.detailHeader}>
                                <h2 style={styles.detailTitle}>{selectedSeminarDetail.title}</h2>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ ...styles.statusBadge, ...(getSeminarStatus(selectedSeminarDetail) === 'upcoming' ? styles.statusBadgeUpcoming : styles.statusBadgeClosed) }}>
                                        {getSeminarStatus(selectedSeminarDetail) === 'upcoming' ? '예정' : '종료'}
                                    </span>
                                    {selectedSeminarDetail.userId === user.uid && (
                                        <span style={{ ...styles.statusBadge, backgroundColor: '#dcfce7', color: '#166534' }}>D-{selectedSeminarDetail.daysLeft}</span>
                                    )}
                                </div>
                            </div>
                            <div style={styles.detailTargetAudience}><User size={16} /><span>대상: {selectedSeminarDetail.targetAudience}</span></div>
                            <div style={styles.detailInfoGrid}>
                                <div style={styles.detailInfoItem}>
                                    <User size={18} style={{ color: '#8b5cf6' }} />
                                    <div>
                                        <div style={styles.detailInfoLabel}>강사</div>
                                        <div style={styles.detailInfoValue}>{selectedSeminarDetail.instructor}</div>
                                    </div>
                                </div>
                                <div style={styles.detailInfoItem}>
                                    <Calendar size={18} style={{ color: '#8b5cf6' }} />
                                    <div>
                                        <div style={styles.detailInfoLabel}>날짜</div>
                                        <div style={styles.detailInfoValue}>
                                            {new Date(selectedSeminarDetail.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                        </div>
                                    </div>
                                </div>
                                <div style={styles.detailInfoItem}>
                                    <Clock size={18} style={{ color: '#8b5cf6' }} />
                                    <div>
                                        <div style={styles.detailInfoLabel}>시간</div>
                                        <div style={styles.detailInfoValue}>{selectedSeminarDetail.time}</div>
                                    </div>
                                </div>
                                <div style={styles.detailInfoItem}>
                                    <MapPin size={18} style={{ color: '#8b5cf6' }} />
                                    <div>
                                        <div style={styles.detailInfoLabel}>장소</div>
                                        <div style={styles.detailInfoValue}>{selectedSeminarDetail.location}</div>
                                    </div>
                                </div>
                            </div>
                            {selectedSeminarDetail.description && (
                                <div style={styles.detailSection}>
                                    <h4 style={styles.detailSectionTitle}>세미나 소개</h4>
                                    <p style={styles.detailSectionContent}>{selectedSeminarDetail.description}</p>
                                </div>
                            )}
                            {selectedSeminarDetail.topics && (
                                <div style={styles.detailSection}>
                                    <h4 style={styles.detailSectionTitle}>주요 내용</h4>
                                    <p style={styles.detailSectionContent}>{selectedSeminarDetail.topics}</p>
                                </div>
                            )}
                            {selectedSeminarDetail.contactInfo && (
                                <div style={styles.detailContactBox}>
                                    <div style={styles.detailContactLabel}>문의처</div>
                                    <div style={styles.detailContactValue}>{selectedSeminarDetail.contactInfo}</div>
                                </div>
                            )}
                            <div style={styles.detailFooter}>
                                <span style={styles.detailFooterText}>등록: {selectedSeminarDetail.businessName || selectedSeminarDetail.userName}</span>
                                <span style={styles.detailFooterText}>{selectedSeminarDetail.createdAt && new Date(selectedSeminarDetail.createdAt.toDate()).toLocaleDateString('ko-KR')}</span>
                            </div>
                            {selectedSeminarDetail.userId === user.uid && (
                                <div style={{ marginTop: '20px' }}>
                                    <button onClick={() => handleDelete(selectedSeminarDetail.id)} style={styles.detailDeleteButton}>
                                        <Trash2 size={18} />세미나 삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px' },
    content: { maxWidth: '1200px', margin: '0 auto' },
    loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', fontSize: '16px', color: '#64748b' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    titleSection: { display: 'flex', alignItems: 'center', gap: '16px' },
    title: { margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' },
    subtitle: { margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' },
    historyButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#ffffff', color: '#8b5cf6', border: '2px solid #8b5cf6', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    registerButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    pendingSection: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    pendingList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    pendingCard: { padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' },
    pendingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    pendingTitle: { margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' },
    pendingInfo: { display: 'flex', gap: '16px', fontSize: '14px', color: '#64748b', marginBottom: '12px' },
    deleteSmallButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', width: 'fit-content' },
    rejectionReason: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '13px', color: '#dc2626', marginTop: '12px' },
    registrationHistorySection: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    emptyRegistrations: { padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
    registrationList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    registrationCard: { padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
    registrationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    registrationTitle: { margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' },
    registrationStatus: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    registrationStatusActive: { backgroundColor: '#dcfce7', color: '#166534' },
    registrationStatusExpired: { backgroundColor: '#f1f5f9', color: '#64748b' },
    registrationDetails: { display: 'flex', flexDirection: 'column', gap: '8px' },
    registrationRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
    registrationLabel: { color: '#64748b' },
    registrationValue: { fontWeight: '600', color: '#1e293b' },
    filterSection: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
    searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' },
    searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px' },
    filterButtons: { display: 'flex', gap: '8px' },
    filterButton: { padding: '12px 20px', backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    filterButtonActive: { backgroundColor: '#8b5cf6', color: '#ffffff', borderColor: '#8b5cf6' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' },
    emptyText: { marginTop: '16px', fontSize: '14px', color: '#94a3b8' },
    infoNotice: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '13px', color: '#1e40af', marginBottom: '20px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    formModalContent: { backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0' },
    modalTitle: { display: 'flex', alignItems: 'center', gap: '12px', margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' },
    modalBody: { padding: '24px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '14px', fontWeight: '600', color: '#475569' },
    input: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
    textarea: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', resize: 'vertical' },
    paymentInfo: { display: 'flex', flexDirection: 'column', gap: '20px' },
    paymentInfoTitle: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    paymentInfoGrid: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' },
    paymentInfoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    paymentInfoLabel: { fontSize: '14px', color: '#64748b' },
    paymentInfoValue: { fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    paymentNotice: { display: 'flex', gap: '12px', padding: '16px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '8px' },
    noticeText: { margin: '4px 0', fontSize: '13px', color: '#854d0e', lineHeight: '1.5' },
    modalFooter: { display: 'flex', gap: '12px', padding: '16px 24px 24px' },
    modalCancelButton: { flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    modalSubmitButton: { flex: 2, padding: '12px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    modalPayButton: { flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    imageUploadSection: { marginTop: '8px' },
    imageInput: { display: 'none' },
    imageUploadLabel: { cursor: 'pointer', display: 'block' },
    imageUploadBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc', transition: 'all 0.3s ease' },
    uploadIcon: { fontSize: '48px', marginBottom: '12px' },
    uploadText: { textAlign: 'center' },
    uploadMainText: { margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#475569' },
    uploadSubText: { margin: 0, fontSize: '12px', color: '#94a3b8' },
    imageList: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' },
    imageItem: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'visible', minHeight: '200px' },
    imageNumberLabel: { position: 'absolute', top: '8px', left: '8px', padding: '4px 12px', backgroundColor: 'rgba(139, 92, 246, 0.95)', color: '#ffffff', fontSize: '12px', fontWeight: '600', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' },
    imageThumbnail: { width: 'auto', maxWidth: '100%', height: 'auto', objectFit: 'contain', borderRadius: '4px' },
    removeImageIconButton: { position: 'absolute', top: '8px', right: '8px', width: '32px', height: '32px', padding: 0, backgroundColor: 'rgba(239, 68, 68, 0.95)', color: '#ffffff', border: 'none', borderRadius: '50%', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' },
    detailImagesContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px', width: '100%' },
    detailImageWrapper: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '8px', overflow: 'visible' },
    detailImageNumberLabel: { alignSelf: 'flex-start', padding: '4px 12px', backgroundColor: '#8b5cf6', color: '#ffffff', fontSize: '13px', fontWeight: '600', borderRadius: '4px', marginBottom: '4px' },
    detailImage: { width: 'auto', maxWidth: '100%', height: 'auto', display: 'block', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' },
    tableContainer: { backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    th: { padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' },
    tableRow: { borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' },
    td: { padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' },
    targetBadge: { display: 'inline-block', padding: '4px 12px', backgroundColor: '#f0f9ff', color: '#1e40af', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
    detailModalContent: { backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    closeButton: { padding: '8px', backgroundColor: 'transparent', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer', lineHeight: 1 },
    detailModalBody: { padding: '24px' },
    detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' },
    detailTitle: { margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b', flex: 1 },
    statusBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    statusBadgeUpcoming: { backgroundColor: '#dbeafe', color: '#1e40af' },
    statusBadgeClosed: { backgroundColor: '#f1f5f9', color: '#64748b' },
    detailTargetAudience: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '14px', color: '#1e40af', fontWeight: '500', marginBottom: '24px' },
    detailInfoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px' },
    detailInfoItem: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
    detailInfoLabel: { fontSize: '12px', color: '#94a3b8', marginBottom: '4px' },
    detailInfoValue: { fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    detailSection: { marginBottom: '24px' },
    detailSectionTitle: { margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    detailSectionContent: { margin: 0, fontSize: '15px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' },
    detailContactBox: { padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '24px' },
    detailContactLabel: { fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '4px' },
    detailContactValue: { fontSize: '14px', color: '#78350f', fontWeight: '500' },
    detailFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' },
    detailFooterText: { fontSize: '13px', color: '#94a3b8' },
    payPendingButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px' },
    waitingText: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '14px', fontWeight: '600' },
    detailDeleteButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
};

export default Seminars;