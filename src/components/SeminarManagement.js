import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import {
    GraduationCap, Plus, Trash2, Calendar, MapPin, Users,
    DollarSign, Clock, Upload, Image as ImageIcon, Search,
    ExternalLink
} from 'lucide-react';

function SeminarManagement({ user }) {
    const [seminars, setSeminars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        instructor: '',
        instructorTitle: '',
        category: 'clinical', // clinical, management, technology, marketing
        date: '',
        time: '',
        duration: '',
        location: '',
        locationType: 'offline', // offline, online, hybrid
        onlineLink: '',
        maxParticipants: '',
        fee: '',
        earlyBirdFee: '',
        earlyBirdDeadline: '',
        targetAudience: '',
        curriculum: '',
        materials: '',
        certificate: false,
        imageUrl: '',
        contactEmail: '',
        contactPhone: '',
        registrationLink: ''
    });

    useEffect(() => {
        loadSeminars();
    }, []);

    const loadSeminars = async () => {
        try {
            setLoading(true);
            const seminarsRef = collection(db, 'seminars');
            const q = query(seminarsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            
            const seminarsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setSeminars(seminarsList);
        } catch (error) {
            console.error('세미나 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const storageRef = ref(storage, `seminars/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            setFormData({ ...formData, imageUrl: url });
            alert('이미지가 업로드되었습니다.');
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.description || !formData.date) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }

        try {
            await addDoc(collection(db, 'seminars'), {
                ...formData,
                postedBy: user.uid,
                postedByName: user.businessName || user.name || user.email,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                participants: 0,
                views: 0
            });

            alert('세미나가 등록되었습니다.');
            setShowCreateModal(false);
            resetForm();
            loadSeminars();
        } catch (error) {
            console.error('세미나 등록 실패:', error);
            alert('세미나 등록에 실패했습니다.');
        }
    };

    const handleDelete = async (seminarId) => {
        if (!window.confirm('정말 이 세미나를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'seminars', seminarId));
            alert('세미나가 삭제되었습니다.');
            loadSeminars();
        } catch (error) {
            console.error('세미나 삭제 실패:', error);
            alert('세미나 삭제에 실패했습니다.');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            instructor: '',
            instructorTitle: '',
            category: 'clinical',
            date: '',
            time: '',
            duration: '',
            location: '',
            locationType: 'offline',
            onlineLink: '',
            maxParticipants: '',
            fee: '',
            earlyBirdFee: '',
            earlyBirdDeadline: '',
            targetAudience: '',
            curriculum: '',
            materials: '',
            certificate: false,
            imageUrl: '',
            contactEmail: '',
            contactPhone: '',
            registrationLink: ''
        });
    };

    const filteredSeminars = seminars.filter(seminar => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            seminar.title?.toLowerCase().includes(searchLower) ||
            seminar.instructor?.toLowerCase().includes(searchLower) ||
            seminar.description?.toLowerCase().includes(searchLower)
        );
    });

    const getCategoryLabel = (category) => {
        const labels = {
            clinical: '임상',
            management: '경영',
            technology: '기술',
            marketing: '마케팅'
        };
        return labels[category] || category;
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
                    <h1 style={styles.title}>세미나 관리</h1>
                    <p style={styles.subtitle}>세미나를 등록하고 관리하세요</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={styles.createButton}
                >
                    <Plus size={20} />
                    세미나 등록
                </button>
            </div>

            {/* 통계 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <GraduationCap size={24} color="#6366f1" />
                    <div>
                        <div style={styles.statValue}>{seminars.length}</div>
                        <div style={styles.statLabel}>전체 세미나</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <Calendar size={24} color="#10b981" />
                    <div>
                        <div style={styles.statValue}>
                            {seminars.filter(s => {
                                if (!s.date) return false;
                                return new Date(s.date) > new Date();
                            }).length}
                        </div>
                        <div style={styles.statLabel}>예정된 세미나</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <Users size={24} color="#f59e0b" />
                    <div>
                        <div style={styles.statValue}>
                            {seminars.reduce((sum, s) => sum + (s.participants || 0), 0)}
                        </div>
                        <div style={styles.statLabel}>총 참가자</div>
                    </div>
                </div>
            </div>

            {/* 검색 */}
            <div style={styles.searchBox}>
                <Search size={20} color="#94a3b8" />
                <input
                    type="text"
                    placeholder="세미나 제목, 강사명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* 세미나 목록 */}
            {filteredSeminars.length === 0 ? (
                <div style={styles.emptyState}>
                    <GraduationCap size={64} color="#cbd5e1" />
                    <h3 style={styles.emptyTitle}>등록된 세미나가 없습니다</h3>
                    <p style={styles.emptyText}>첫 세미나를 등록해보세요!</p>
                </div>
            ) : (
                <div style={styles.seminarsList}>
                    {filteredSeminars.map(seminar => {
                        const isPast = seminar.date && new Date(seminar.date) < new Date();
                        
                        return (
                            <div key={seminar.id} style={styles.seminarCard}>
                                {/* 세미나 이미지 */}
                                {seminar.imageUrl && (
                                    <div style={styles.imageContainer}>
                                        <img
                                            src={seminar.imageUrl}
                                            alt={seminar.title}
                                            style={styles.seminarImage}
                                        />
                                        <div style={styles.categoryBadge}>
                                            {getCategoryLabel(seminar.category)}
                                        </div>
                                    </div>
                                )}

                                <div style={styles.seminarContent}>
                                    <div style={styles.seminarHeader}>
                                        <div>
                                            <h3 style={styles.seminarTitle}>{seminar.title}</h3>
                                            {seminar.instructor && (
                                                <div style={styles.instructorInfo}>
                                                    <span>{seminar.instructor}</span>
                                                    {seminar.instructorTitle && (
                                                        <span style={styles.instructorTitle}>
                                                            {seminar.instructorTitle}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(seminar.id)}
                                            style={styles.deleteButton}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <p style={styles.seminarDescription}>
                                        {seminar.description?.length > 120
                                            ? seminar.description.substring(0, 120) + '...'
                                            : seminar.description}
                                    </p>

                                    <div style={styles.seminarMeta}>
                                        {seminar.date && (
                                            <span style={styles.metaItem}>
                                                <Calendar size={14} />
                                                {seminar.date}
                                                {seminar.time && ` ${seminar.time}`}
                                            </span>
                                        )}
                                        {seminar.location && (
                                            <span style={styles.metaItem}>
                                                <MapPin size={14} />
                                                {seminar.location}
                                            </span>
                                        )}
                                        {seminar.duration && (
                                            <span style={styles.metaItem}>
                                                <Clock size={14} />
                                                {seminar.duration}
                                            </span>
                                        )}
                                        {seminar.maxParticipants && (
                                            <span style={styles.metaItem}>
                                                <Users size={14} />
                                                정원 {seminar.maxParticipants}명
                                            </span>
                                        )}
                                        {seminar.fee && (
                                            <span style={styles.metaItem}>
                                                <DollarSign size={14} />
                                                {seminar.fee}
                                            </span>
                                        )}
                                    </div>

                                    <div style={styles.seminarFooter}>
                                        <div style={styles.locationType}>
                                            {seminar.locationType === 'online' ? '온라인' :
                                                seminar.locationType === 'offline' ? '오프라인' : '하이브리드'}
                                        </div>
                                        {seminar.registrationLink && (
                                            <a
                                                href={seminar.registrationLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={styles.linkButton}
                                            >
                                                <ExternalLink size={14} />
                                                신청하기
                                            </a>
                                        )}
                                        {isPast && (
                                            <span style={styles.pastBadge}>종료됨</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 등록 모달 */}
            {showCreateModal && (
                <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>세미나 등록</h2>
                        
                        <form onSubmit={handleSubmit} style={styles.form}>
                            {/* 이미지 업로드 */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>썸네일 이미지</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={styles.fileInput}
                                    id="image-upload"
                                />
                                <label htmlFor="image-upload" style={styles.uploadButton}>
                                    <Upload size={16} />
                                    {uploading ? '업로드 중...' : '이미지 선택'}
                                </label>
                                {formData.imageUrl && (
                                    <img
                                        src={formData.imageUrl}
                                        alt="Preview"
                                        style={styles.imagePreview}
                                    />
                                )}
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>세미나 제목 *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="임상 케이스 중심의 실전 보철 치료"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>강사명</label>
                                    <input
                                        type="text"
                                        value={formData.instructor}
                                        onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                                        placeholder="홍길동"
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>강사 직함</label>
                                    <input
                                        type="text"
                                        value={formData.instructorTitle}
                                        onChange={(e) => setFormData({...formData, instructorTitle: e.target.value})}
                                        placeholder="서울대학교 치과대학 교수"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>카테고리</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        style={styles.select}
                                    >
                                        <option value="clinical">임상</option>
                                        <option value="management">경영</option>
                                        <option value="technology">기술</option>
                                        <option value="marketing">마케팅</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>진행 방식</label>
                                    <select
                                        value={formData.locationType}
                                        onChange={(e) => setFormData({...formData, locationType: e.target.value})}
                                        style={styles.select}
                                    >
                                        <option value="offline">오프라인</option>
                                        <option value="online">온라인</option>
                                        <option value="hybrid">하이브리드</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>세미나 설명 *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="세미나 내용을 자세히 설명해주세요"
                                    style={styles.textarea}
                                    rows="4"
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>일자 *</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        style={styles.input}
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>시간</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>소요 시간</label>
                                    <input
                                        type="text"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                        placeholder="3시간"
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>정원</label>
                                    <input
                                        type="number"
                                        value={formData.maxParticipants}
                                        onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
                                        placeholder="50"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>장소</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    placeholder="서울 강남구 테헤란로 123"
                                    style={styles.input}
                                />
                            </div>

                            {formData.locationType !== 'offline' && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>온라인 링크</label>
                                    <input
                                        type="url"
                                        value={formData.onlineLink}
                                        onChange={(e) => setFormData({...formData, onlineLink: e.target.value})}
                                        placeholder="https://zoom.us/..."
                                        style={styles.input}
                                    />
                                </div>
                            )}

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>수강료</label>
                                    <input
                                        type="text"
                                        value={formData.fee}
                                        onChange={(e) => setFormData({...formData, fee: e.target.value})}
                                        placeholder="50,000원"
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>조기 등록 할인</label>
                                    <input
                                        type="text"
                                        value={formData.earlyBirdFee}
                                        onChange={(e) => setFormData({...formData, earlyBirdFee: e.target.value})}
                                        placeholder="40,000원"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>커리큘럼</label>
                                <textarea
                                    value={formData.curriculum}
                                    onChange={(e) => setFormData({...formData, curriculum: e.target.value})}
                                    placeholder="세미나 커리큘럼을 입력해주세요"
                                    style={styles.textarea}
                                    rows="4"
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>이메일</label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                                        placeholder="contact@example.com"
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>연락처</label>
                                    <input
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                                        placeholder="010-1234-5678"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>신청 링크</label>
                                <input
                                    type="url"
                                    value={formData.registrationLink}
                                    onChange={(e) => setFormData({...formData, registrationLink: e.target.value})}
                                    placeholder="https://..."
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.certificate}
                                        onChange={(e) => setFormData({...formData, certificate: e.target.checked})}
                                    />
                                    수료증 발급
                                </label>
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
                                <button type="submit" style={styles.submitButton}>
                                    등록하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
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
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
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
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '24px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#1e293b',
    },
    seminarsList: {
        display: 'grid',
        gap: '16px',
    },
    seminarCard: {
        display: 'flex',
        gap: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        transition: 'all 0.2s',
    },
    imageContainer: {
        position: 'relative',
        flexShrink: 0,
        width: '240px',
    },
    seminarImage: {
        width: '100%',
        height: '160px',
        objectFit: 'cover',
        borderRadius: '10px',
    },
    categoryBadge: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '6px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontSize: '12px',
        fontWeight: '700',
        borderRadius: '6px',
    },
    seminarContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    seminarHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    seminarTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    instructorInfo: {
        display: 'flex',
        gap: '8px',
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    instructorTitle: {
        color: '#94a3b8',
        fontSize: '13px',
    },
    deleteButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
    },
    seminarDescription: {
        margin: 0,
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#475569',
    },
    seminarMeta: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#64748b',
    },
    seminarFooter: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #e2e8f0',
        marginTop: 'auto',
    },
    locationType: {
        padding: '4px 10px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
    },
    linkButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        backgroundColor: '#6366f1',
        color: 'white',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        textDecoration: 'none',
        transition: 'all 0.2s',
    },
    pastBadge: {
        padding: '4px 10px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        marginLeft: 'auto',
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
        maxWidth: '900px',
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
    },
    select: {
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
    },
    fileInput: {
        display: 'none',
    },
    uploadButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#f8fafc',
        border: '2px dashed #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    imagePreview: {
        width: '100%',
        maxHeight: '200px',
        objectFit: 'cover',
        borderRadius: '8px',
        marginTop: '8px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#475569',
        cursor: 'pointer',
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
};

export default SeminarManagement;