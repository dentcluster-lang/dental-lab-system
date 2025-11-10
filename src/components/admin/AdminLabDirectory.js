import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
    Building2, Trash2, Eye, Plus, Search, Filter,
    CheckCircle, XCircle, Calendar, Phone, Mail, MapPin
} from 'lucide-react';

function AdminLabDirectory({ user }) {
    const [labs, setLabs] = useState([]);
    const [filteredLabs, setFilteredLabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedLab, setSelectedLab] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // 통계
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0
    });

    // 신규 기공소 폼
    const [newLabForm, setNewLabForm] = useState({
        businessName: '',
        introduction: '',
        address: '',
        phone: '',
        email: '',
        specialties: [],
        experience: '',
        equipment: '',
        certifications: '',
        services: '',
        workingHours: '',
        contactInfo: ''
    });

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

    useEffect(() => {
        loadLabs();
    }, []);

    useEffect(() => {
        filterLabs();
        calculateStats();
    }, [labs, searchQuery, filterStatus]);

    const loadLabs = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'labAdvertisements'),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const labsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setLabs(labsList);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterLabs = () => {
        let filtered = labs;

        // 상태 필터
        if (filterStatus === 'active') {
            filtered = filtered.filter(lab => lab.isActive);
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter(lab => !lab.isActive);
        }

        // 검색
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(lab =>
                (lab.businessName || '').toLowerCase().includes(query) ||
                (lab.introduction || '').toLowerCase().includes(query) ||
                (lab.address || '').toLowerCase().includes(query) ||
                (lab.email || '').toLowerCase().includes(query)
            );
        }

        setFilteredLabs(filtered);
    };

    const calculateStats = () => {
        setStats({
            total: labs.length,
            active: labs.filter(lab => lab.isActive).length,
            inactive: labs.filter(lab => !lab.isActive).length
        });
    };

    const handleDelete = async (labId) => {
        if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            setProcessing(true);
            await deleteDoc(doc(db, 'labAdvertisements', labId));
            alert('삭제되었습니다.');
            loadLabs();
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleViewDetail = (lab) => {
        setSelectedLab(lab);
        setShowDetailModal(true);
    };

    const handleAddLab = async () => {
        if (!newLabForm.businessName.trim()) {
            alert('기공소명을 입력해주세요.');
            return;
        }

        try {
            setProcessing(true);
            
            await addDoc(collection(db, 'labAdvertisements'), {
                ...newLabForm,
                isActive: false,
                status: 'inactive',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userId: user?.uid || 'admin'
            });

            alert('기공소가 등록되었습니다.');
            setShowAddModal(false);
            setNewLabForm({
                businessName: '',
                introduction: '',
                address: '',
                phone: '',
                email: '',
                specialties: [],
                experience: '',
                equipment: '',
                certifications: '',
                services: '',
                workingHours: '',
                contactInfo: ''
            });
            loadLabs();
        } catch (error) {
            console.error('등록 실패:', error);
            alert('등록에 실패했습니다: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleFormChange = (field, value) => {
        setNewLabForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const toggleSpecialty = (specialty) => {
        setNewLabForm(prev => {
            const specialties = prev.specialties.includes(specialty)
                ? prev.specialties.filter(s => s !== specialty)
                : [...prev.specialties, specialty];
            return { ...prev, specialties };
        });
    };

    const getStatusBadge = (isActive) => {
        return isActive ? (
            <span style={styles.activeBadge}>
                <CheckCircle size={14} />
                활성
            </span>
        ) : (
            <span style={styles.inactiveBadge}>
                <XCircle size={14} />
                비활성
            </span>
        );
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
                    <h1 style={styles.title}>기공소 찾기 관리</h1>
                    <p style={styles.subtitle}>기공소 목록을 관리하세요</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={styles.addButton}
                >
                    <Plus size={20} />
                    기공소 등록
                </button>
            </div>

            {/* 통계 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="blue">
                        <Building2 size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.total}</div>
                        <div style={styles.statLabel}>전체</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="green">
                        <CheckCircle size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.active}</div>
                        <div style={styles.statLabel}>활성</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} data-color="gray">
                        <XCircle size={24} />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.inactive}</div>
                        <div style={styles.statLabel}>비활성</div>
                    </div>
                </div>
            </div>

            {/* 검색 및 필터 */}
            <div style={styles.controls}>
                <div style={styles.searchBox}>
                    <Search size={20} color="#64748b" />
                    <input
                        type="text"
                        placeholder="기공소명, 주소, 이메일로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <div style={styles.filterBox}>
                    <Filter size={18} color="#64748b" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="all">전체 상태</option>
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                    </select>
                </div>
            </div>

            {/* 테이블 */}
            <div style={styles.tableContainer}>
                {filteredLabs.length === 0 ? (
                    <div style={styles.emptyState}>
                        <Building2 size={64} color="#cbd5e1" />
                        <p style={styles.emptyText}>기공소가 없습니다</p>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>기공소명</th>
                                <th style={styles.th}>주소</th>
                                <th style={styles.th}>연락처</th>
                                <th style={styles.th}>전문분야</th>
                                <th style={styles.th}>등록일</th>
                                <th style={styles.th}>상태</th>
                                <th style={styles.th}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLabs.map(lab => (
                                <tr key={lab.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <strong>{lab.businessName || '-'}</strong>
                                    </td>
                                    <td style={styles.td}>
                                        {lab.address || '-'}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.contactInfo}>
                                            {lab.phone && (
                                                <div style={styles.contactItem}>
                                                    <Phone size={14} color="#64748b" />
                                                    <span>{lab.phone}</span>
                                                </div>
                                            )}
                                            {lab.email && (
                                                <div style={styles.contactItem}>
                                                    <Mail size={14} color="#64748b" />
                                                    <span>{lab.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.specialtyTags}>
                                            {(lab.specialties || []).slice(0, 2).map((specialty, idx) => (
                                                <span key={idx} style={styles.specialtyTag}>
                                                    {specialty}
                                                </span>
                                            ))}
                                            {(lab.specialties || []).length > 2 && (
                                                <span style={styles.moreTag}>
                                                    +{lab.specialties.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        {lab.createdAt?.toDate?.().toLocaleDateString() || '-'}
                                    </td>
                                    <td style={styles.td}>
                                        {getStatusBadge(lab.isActive)}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button
                                                onClick={() => handleViewDetail(lab)}
                                                style={styles.actionButton}
                                                title="상세보기"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lab.id)}
                                                style={{...styles.actionButton, ...styles.deleteButton}}
                                                disabled={processing}
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 상세 보기 모달 */}
            {showDetailModal && selectedLab && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>기공소 상세 정보</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.modalCloseButton}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>기본 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>기공소명</span>
                                        <span style={styles.detailValue}>{selectedLab.businessName || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>상태</span>
                                        {getStatusBadge(selectedLab.isActive)}
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>소개</span>
                                        <span style={styles.detailValue}>{selectedLab.introduction || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>연락 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>주소</span>
                                        <span style={styles.detailValue}>{selectedLab.address || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>전화번호</span>
                                        <span style={styles.detailValue}>{selectedLab.phone || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>이메일</span>
                                        <span style={styles.detailValue}>{selectedLab.email || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>전문 분야</h3>
                                <div style={styles.specialtyGrid}>
                                    {(selectedLab.specialties || []).map((specialty, idx) => (
                                        <span key={idx} style={styles.specialtyTagLarge}>
                                            {specialty}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>기타 정보</h3>
                                <div style={styles.detailGrid}>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>경력</span>
                                        <span style={styles.detailValue}>{selectedLab.experience || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>장비</span>
                                        <span style={styles.detailValue}>{selectedLab.equipment || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>인증</span>
                                        <span style={styles.detailValue}>{selectedLab.certifications || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>서비스</span>
                                        <span style={styles.detailValue}>{selectedLab.services || '-'}</span>
                                    </div>
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>영업시간</span>
                                        <span style={styles.detailValue}>{selectedLab.workingHours || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.closeButtonLarge}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 기공소 추가 모달 */}
            {showAddModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.addModalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>기공소 등록</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={styles.modalCloseButton}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.formSection}>
                                <label style={styles.formLabel}>기공소명 *</label>
                                <input
                                    type="text"
                                    value={newLabForm.businessName}
                                    onChange={(e) => handleFormChange('businessName', e.target.value)}
                                    style={styles.formInput}
                                    placeholder="기공소명을 입력하세요"
                                />
                            </div>

                            <div style={styles.formSection}>
                                <label style={styles.formLabel}>소개</label>
                                <textarea
                                    value={newLabForm.introduction}
                                    onChange={(e) => handleFormChange('introduction', e.target.value)}
                                    style={styles.formTextarea}
                                    placeholder="기공소 소개를 입력하세요"
                                    rows={3}
                                />
                            </div>

                            <div style={styles.formSection}>
                                <label style={styles.formLabel}>주소</label>
                                <input
                                    type="text"
                                    value={newLabForm.address}
                                    onChange={(e) => handleFormChange('address', e.target.value)}
                                    style={styles.formInput}
                                    placeholder="주소를 입력하세요"
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formSection}>
                                    <label style={styles.formLabel}>전화번호</label>
                                    <input
                                        type="tel"
                                        value={newLabForm.phone}
                                        onChange={(e) => handleFormChange('phone', e.target.value)}
                                        style={styles.formInput}
                                        placeholder="전화번호"
                                    />
                                </div>
                                <div style={styles.formSection}>
                                    <label style={styles.formLabel}>이메일</label>
                                    <input
                                        type="email"
                                        value={newLabForm.email}
                                        onChange={(e) => handleFormChange('email', e.target.value)}
                                        style={styles.formInput}
                                        placeholder="이메일"
                                    />
                                </div>
                            </div>

                            <div style={styles.formSection}>
                                <label style={styles.formLabel}>전문 분야</label>
                                <div style={styles.specialtySelectGrid}>
                                    {specialtyOptions.map(specialty => (
                                        <button
                                            key={specialty}
                                            onClick={() => toggleSpecialty(specialty)}
                                            style={{
                                                ...styles.specialtySelectButton,
                                                ...(newLabForm.specialties.includes(specialty) ? styles.specialtySelectButtonActive : {})
                                            }}
                                        >
                                            {specialty}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={handleAddLab}
                                style={styles.submitButton}
                                disabled={processing || !newLabForm.businessName.trim()}
                            >
                                등록
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={styles.cancelButton}
                            >
                                취소
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
        padding: '32px',
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
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: '8px 0 0 0',
        fontSize: '15px',
        color: '#64748b',
    },
    addButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: 1,
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#64748b',
    },
    controls: {
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
    },
    searchBox: {
        flex: '1 1 300px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#0f172a',
    },
    filterBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
    },
    filterSelect: {
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#0f172a',
        cursor: 'pointer',
        backgroundColor: 'transparent',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '16px',
        textAlign: 'left',
        fontSize: '13px',
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '2px solid #e2e8f0',
        backgroundColor: '#f8fafc',
    },
    tr: {
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s',
    },
    td: {
        padding: '16px',
        fontSize: '14px',
        color: '#0f172a',
    },
    contactInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    contactItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#64748b',
    },
    specialtyTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    },
    specialtyTag: {
        padding: '4px 8px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        fontSize: '12px',
        fontWeight: '600',
        borderRadius: '6px',
    },
    moreTag: {
        padding: '4px 8px',
        backgroundColor: '#e0e7ff',
        color: '#6366f1',
        fontSize: '12px',
        fontWeight: '600',
        borderRadius: '6px',
    },
    activeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
    },
    inactiveBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
    },
    actionButtons: {
        display: 'flex',
        gap: '8px',
    },
    actionButton: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    deleteButton: {
        borderColor: '#ef4444',
        color: '#ef4444',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        gap: '16px',
    },
    emptyText: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
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
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    addModalContent: {
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    modalCloseButton: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '24px',
        color: '#64748b',
        cursor: 'pointer',
        borderRadius: '6px',
    },
    modalBody: {
        padding: '24px',
    },
    detailSection: {
        marginBottom: '24px',
    },
    detailSectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    detailLabel: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: '15px',
        color: '#0f172a',
        fontWeight: '500',
    },
    specialtyGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
    },
    specialtyTagLarge: {
        padding: '8px 16px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '600',
        borderRadius: '8px',
        textAlign: 'center',
    },
    modalFooter: {
        display: 'flex',
        gap: '12px',
        padding: '24px',
        borderTop: '1px solid #e2e8f0',
        justifyContent: 'flex-end',
    },
    closeButtonLarge: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    formSection: {
        marginBottom: '20px',
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    formLabel: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
    },
    formInput: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '15px',
        outline: 'none',
    },
    formTextarea: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '15px',
        fontFamily: 'inherit',
        resize: 'vertical',
        outline: 'none',
    },
    specialtySelectGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
    },
    specialtySelectButton: {
        padding: '10px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    specialtySelectButtonActive: {
        backgroundColor: '#6366f1',
        color: 'white',
        borderColor: '#6366f1',
    },
    submitButton: {
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    cancelButton: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

// CSS 추가
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`
            [data-color="blue"] {
                background-color: #dbeafe;
                color: #3b82f6;
            }
        `, styleSheet.cssRules.length);
        
        styleSheet.insertRule(`
            [data-color="green"] {
                background-color: #d1fae5;
                color: #10b981;
            }
        `, styleSheet.cssRules.length);
        
        styleSheet.insertRule(`
            [data-color="gray"] {
                background-color: #f1f5f9;
                color: #64748b;
            }
        `, styleSheet.cssRules.length);

        styleSheet.insertRule(`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);

        styleSheet.insertRule(`
            table tr:hover {
                background-color: #f8fafc;
            }
        `, styleSheet.cssRules.length);

        styleSheet.insertRule(`
            button:hover:not(:disabled) {
                opacity: 0.8;
                transform: translateY(-1px);
            }
        `, styleSheet.cssRules.length);

        styleSheet.insertRule(`
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `, styleSheet.cssRules.length);
    } catch (e) {
        console.error('스타일 추가 실패:', e);
    }
}

export default AdminLabDirectory;