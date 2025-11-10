import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    Search, Building2, Phone, Mail, MapPin,
    Clock, CheckCircle, X, Filter, ChevronRight, Eye
} from 'lucide-react';

function LabDirectory({ user }) {
    const [labs, setLabs] = useState([]);
    const [filteredLabs, setFilteredLabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLab, setSelectedLab] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterSpecialty, setFilterSpecialty] = useState('all');

    const specialtyOptions = [
        'all',
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

    const loadLabs = async () => {
        try {
            setLoading(true);
            const adsRef = collection(db, 'labAdvertisements');
            const q = query(adsRef, where('isActive', '==', true));
            const snapshot = await getDocs(q);

            const labsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setLabs(labsData);
            setFilteredLabs(labsData);
        } catch (error) {
            console.error('기공소 목록 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterLabs = useCallback(() => {
        let filtered = labs;

        // 검색어 필터
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(lab =>
                (lab.businessName || '').toLowerCase().includes(query) ||
                (lab.introduction || '').toLowerCase().includes(query) ||
                (lab.address || '').toLowerCase().includes(query)
            );
        }

        // 전문 분야 필터
        if (filterSpecialty !== 'all') {
            filtered = filtered.filter(lab =>
                lab.specialties && lab.specialties.includes(filterSpecialty)
            );
        }

        setFilteredLabs(filtered);
    }, [labs, searchQuery, filterSpecialty]);

    useEffect(() => {
        loadLabs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        filterLabs();
    }, [filterLabs]);

    const handleCardClick = (lab) => {
        setSelectedLab(lab);
        setShowDetailModal(true);
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
                    <h1 style={styles.title}>기공소 찾기</h1>
                    <p style={styles.subtitle}>
                        믿을 수 있는 기공소를 찾아보세요 • 총 {filteredLabs.length}개
                    </p>
                </div>
            </div>

            {/* 검색 및 필터 */}
            <div style={styles.searchSection}>
                <div style={styles.searchBox}>
                    <Search size={20} color="#64748b" />
                    <input
                        type="text"
                        placeholder="기공소명, 지역 등으로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                <div style={styles.filterBox}>
                    <Filter size={18} color="#64748b" />
                    <select
                        value={filterSpecialty}
                        onChange={(e) => setFilterSpecialty(e.target.value)}
                        style={styles.filterSelect}
                    >
                        {specialtyOptions.map(option => (
                            <option key={option} value={option}>
                                {option === 'all' ? '전체 전문 분야' : option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 기공소 목록 */}
            {filteredLabs.length === 0 ? (
                <div style={styles.emptyState}>
                    <Building2 size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>검색 결과가 없습니다</p>
                    <p style={styles.emptySubtext}>다른 검색어나 필터를 시도해보세요</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredLabs.map(lab => (
                        <div
                            key={lab.id}
                            style={styles.card}
                            onClick={() => handleCardClick(lab)}
                        >
                            {/* 프로필 이미지 */}
                            {lab.profileImageUrl ? (
                                <div style={styles.cardImageContainer}>
                                    <img 
                                        src={lab.profileImageUrl} 
                                        alt={lab.businessName}
                                        style={styles.cardImage}
                                    />
                                </div>
                            ) : (
                                <div style={styles.cardImagePlaceholder}>
                                    <Building2 size={48} color="#cbd5e1" />
                                </div>
                            )}

                            {/* 기본 정보 */}
                            <div style={styles.cardContent}>
                                <h3 style={styles.cardTitle}>{lab.businessName}</h3>
                                
                                {/* 전문 분야 */}
                                {lab.specialties && lab.specialties.length > 0 && (
                                    <div style={styles.specialtyTags}>
                                        {lab.specialties.slice(0, 3).map(specialty => (
                                            <span key={specialty} style={styles.specialtyTag}>
                                                {specialty}
                                            </span>
                                        ))}
                                        {lab.specialties.length > 3 && (
                                            <span style={styles.specialtyTag}>
                                                +{lab.specialties.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* 소개 */}
                                {lab.introduction && (
                                    <p style={styles.cardIntro}>
                                        {lab.introduction.length > 100 
                                            ? `${lab.introduction.substring(0, 100)}...` 
                                            : lab.introduction}
                                    </p>
                                )}

                                {/* 위치 */}
                                {lab.address && (
                                    <div style={styles.cardInfo}>
                                        <MapPin size={14} color="#94a3b8" />
                                        <span>{lab.address}</span>
                                    </div>
                                )}

                                {/* 연락처 */}
                                {lab.phone && (
                                    <div style={styles.cardInfo}>
                                        <Phone size={14} color="#94a3b8" />
                                        <span>{lab.phone}</span>
                                    </div>
                                )}

                                {/* 더보기 버튼 */}
                                <button style={styles.viewButton}>
                                    <Eye size={16} />
                                    상세보기
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 상세 모달 */}
            {showDetailModal && selectedLab && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{selectedLab.businessName}</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            {/* 프로필 이미지 */}
                            {selectedLab.profileImageUrl && (
                                <div style={styles.modalImageSection}>
                                    <img 
                                        src={selectedLab.profileImageUrl} 
                                        alt={selectedLab.businessName}
                                        style={styles.modalImage}
                                    />
                                </div>
                            )}

                            {/* 기본 정보 */}
                            <div style={styles.modalSection}>
                                <h3 style={styles.modalSectionTitle}>기공소 소개</h3>
                                <p style={styles.modalText}>{selectedLab.introduction || '-'}</p>
                            </div>

                            {/* 전문 분야 */}
                            {selectedLab.specialties && selectedLab.specialties.length > 0 && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>전문 분야</h3>
                                    <div style={styles.modalSpecialties}>
                                        {selectedLab.specialties.map(specialty => (
                                            <span key={specialty} style={styles.modalSpecialtyTag}>
                                                <CheckCircle size={14} />
                                                {specialty}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 경력 */}
                            {selectedLab.experience && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>경력 및 경험</h3>
                                    <p style={styles.modalText}>{selectedLab.experience}</p>
                                </div>
                            )}

                            {/* 장비 */}
                            {selectedLab.equipment && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>보유 장비</h3>
                                    <p style={styles.modalText}>{selectedLab.equipment}</p>
                                </div>
                            )}

                            {/* 인증 */}
                            {selectedLab.certifications && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>인증 및 자격</h3>
                                    <p style={styles.modalText}>{selectedLab.certifications}</p>
                                </div>
                            )}

                            {/* 서비스 */}
                            {selectedLab.services && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>제공 서비스</h3>
                                    <p style={styles.modalText}>{selectedLab.services}</p>
                                </div>
                            )}

                            {/* 연락 정보 */}
                            <div style={styles.modalSection}>
                                <h3 style={styles.modalSectionTitle}>연락 정보</h3>
                                
                                {selectedLab.email && (
                                    <div style={styles.modalDetailItem}>
                                        <Mail size={18} color="#64748b" />
                                        <div>
                                            <div style={styles.modalDetailLabel}>이메일</div>
                                            <div style={styles.modalDetailValue}>{selectedLab.email}</div>
                                        </div>
                                    </div>
                                )}

                                {selectedLab.phone && (
                                    <div style={styles.modalDetailItem}>
                                        <Phone size={18} color="#64748b" />
                                        <div>
                                            <div style={styles.modalDetailLabel}>전화번호</div>
                                            <div style={styles.modalDetailValue}>{selectedLab.phone}</div>
                                        </div>
                                    </div>
                                )}

                                {selectedLab.address && (
                                    <div style={styles.modalDetailItem}>
                                        <MapPin size={18} color="#64748b" />
                                        <div>
                                            <div style={styles.modalDetailLabel}>주소</div>
                                            <div style={styles.modalDetailValue}>{selectedLab.address}</div>
                                        </div>
                                    </div>
                                )}

                                {selectedLab.workingHours && (
                                    <div style={styles.modalDetailItem}>
                                        <Clock size={18} color="#64748b" />
                                        <div>
                                            <div style={styles.modalDetailLabel}>운영 시간</div>
                                            <div style={styles.modalDetailValue}>{selectedLab.workingHours}</div>
                                        </div>
                                    </div>
                                )}

                                {selectedLab.contactInfo && (
                                    <div style={styles.modalDetailItem}>
                                        <div style={styles.modalDetailLabel}>추가 정보</div>
                                        <div style={styles.modalDetailValue}>{selectedLab.contactInfo}</div>
                                    </div>
                                )}
                            </div>

                            {/* 포트폴리오 */}
                            {selectedLab.portfolioImages && selectedLab.portfolioImages.length > 0 && (
                                <div style={styles.modalSection}>
                                    <h3 style={styles.modalSectionTitle}>포트폴리오</h3>
                                    <div style={styles.modalPortfolioGrid}>
                                        {selectedLab.portfolioImages.map((imageUrl, index) => (
                                            <div key={index} style={styles.modalPortfolioItem}>
                                                <img 
                                                    src={imageUrl} 
                                                    alt={`포트폴리오 ${index + 1}`}
                                                    style={styles.modalPortfolioImage}
                                                />
                                            </div>
                                        ))}
                                    </div>
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
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
    },
    header: {
        marginBottom: '32px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '800',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '16px',
        color: '#64748b',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#64748b',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    searchSection: {
        display: 'flex',
        gap: '16px',
        marginBottom: '32px',
        flexWrap: 'wrap',
    },
    searchBox: {
        flex: 1,
        minWidth: '300px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
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
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
    },
    filterSelect: {
        border: 'none',
        outline: 'none',
        fontSize: '15px',
        color: '#0f172a',
        fontWeight: '600',
        cursor: 'pointer',
        backgroundColor: 'transparent',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '24px',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    cardImageContainer: {
        width: '100%',
        height: '200px',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    cardContent: {
        padding: '24px',
    },
    cardTitle: {
        margin: '0 0 12px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    specialtyTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '16px',
    },
    specialtyTag: {
        padding: '6px 12px',
        backgroundColor: '#ede9fe',
        color: '#6366f1',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
    },
    cardIntro: {
        margin: '0 0 16px 0',
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    cardInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        fontSize: '14px',
        color: '#64748b',
    },
    viewButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px',
        marginTop: '16px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '2px dashed #e2e8f0',
    },
    emptyText: {
        marginTop: '20px',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '8px',
    },
    emptySubtext: {
        fontSize: '14px',
        color: '#94a3b8',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px',
        borderBottom: '2px solid #f1f5f9',
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff',
        zIndex: 10,
    },
    modalTitle: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    modalCloseButton: {
        padding: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        transition: 'all 0.2s',
    },
    modalBody: {
        padding: '28px',
    },
    modalImageSection: {
        marginBottom: '28px',
        borderRadius: '16px',
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: 'auto',
        display: 'block',
    },
    modalSection: {
        marginBottom: '28px',
        paddingBottom: '28px',
        borderBottom: '1px solid #f1f5f9',
    },
    modalSectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    modalText: {
        margin: 0,
        fontSize: '15px',
        color: '#475569',
        lineHeight: '1.8',
        whiteSpace: 'pre-wrap',
    },
    modalSpecialties: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
    },
    modalSpecialtyTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        backgroundColor: '#ede9fe',
        color: '#6366f1',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
    },
    modalDetailItem: {
        display: 'flex',
        gap: '16px',
        padding: '16px 0',
        borderBottom: '1px solid #f8fafc',
    },
    modalDetailLabel: {
        fontSize: '12px',
        color: '#94a3b8',
        marginBottom: '6px',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    modalDetailValue: {
        fontSize: '15px',
        color: '#0f172a',
        fontWeight: '500',
    },
    modalPortfolioGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
    },
    modalPortfolioItem: {
        paddingBottom: '100%',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
    },
    modalPortfolioImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
};

export default LabDirectory;