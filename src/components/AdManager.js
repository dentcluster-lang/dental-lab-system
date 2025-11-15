import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import {
    Plus, Edit2, Trash2, Eye, Clock, MousePointer, TrendingUp,
    AlertCircle, CheckCircle, Upload, Image as ImageIcon
} from 'lucide-react';

function AdManager({ user }) {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAd, setEditingAd] = useState(null);

    useEffect(() => {
        loadAds();
    }, []);

    const loadAds = async () => {
        try {
            setLoading(true);
            const adsRef = collection(db, 'advertisements');
            const q = query(adsRef, where('advertiserId', '==', user.uid));
            const snapshot = await getDocs(q);

            const adsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAds(adsList);
        } catch (error) {
            console.error('광고 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (adId) => {
        if (!window.confirm('정말 이 광고를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'advertisements', adId));
            alert('광고가 삭제되었습니다.');
            loadAds();
        } catch (error) {
            console.error('광고 삭제 실패:', error);
            alert('광고 삭제에 실패했습니다.');
        }
    };

    const handleStatusToggle = async (ad) => {
        try {
            const newStatus = ad.status === 'active' ? 'paused' : 'active';
            await updateDoc(doc(db, 'advertisements', ad.id), {
                status: newStatus
            });
            alert(`광고가 ${newStatus === 'active' ? '활성화' : '일시정지'}되었습니다.`);
            loadAds();
        } catch (error) {
            console.error('상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    // 통계 계산
    const totalStats = ads.reduce((acc, ad) => ({
        impressions: acc.impressions + (ad.impressions || 0),
        clicks: acc.clicks + (ad.clicks || 0),
        active: acc.active + (ad.status === 'active' ? 1 : 0),
    }), { impressions: 0, clicks: 0, active: 0 });

    const avgCTR = totalStats.impressions > 0
        ? ((totalStats.clicks / totalStats.impressions) * 100).toFixed(2)
        : 0;

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
                    <h1 style={styles.title}>광고 관리</h1>
                    <p style={styles.subtitle}>광고를 등록하고 성과를 확인하세요</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={styles.createButton}
                >
                    <Plus size={20} />
                    새 광고 만들기
                </button>
            </div>

            {/* 통계 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>
                        <Eye size={24} color="#6366f1" />
                    </div>
                    <div>
                        <div style={styles.statValue}>
                            {totalStats.impressions.toLocaleString()}
                        </div>
                        <div style={styles.statLabel}>총 노출 수</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}>
                        <MousePointer size={24} color="#2563eb" />
                    </div>
                    <div>
                        <div style={styles.statValue}>
                            {totalStats.clicks.toLocaleString()}
                        </div>
                        <div style={styles.statLabel}>총 클릭 수</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#d1fae5' }}>
                        <TrendingUp size={24} color="#059669" />
                    </div>
                    <div>
                        <div style={styles.statValue}>{avgCTR}%</div>
                        <div style={styles.statLabel}>평균 CTR</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7' }}>
                        <CheckCircle size={24} color="#d97706" />
                    </div>
                    <div>
                        <div style={styles.statValue}>{totalStats.active}</div>
                        <div style={styles.statLabel}>활성 광고</div>
                    </div>
                </div>
            </div>

            {/* 광고 목록 */}
            {ads.length === 0 ? (
                <div style={styles.emptyState}>
                    <ImageIcon size={64} color="#cbd5e1" />
                    <p style={styles.emptyText}>등록된 광고가 없습니다</p>
                    <p style={styles.emptySubtext}>첫 광고를 만들어보세요!</p>
                </div>
            ) : (
                <div style={styles.adsList}>
                    {ads.map(ad => (
                        <div key={ad.id} style={styles.adCard}>
                            {/* 광고 이미지 */}
                            {ad.imageUrl && (
                                <div style={styles.adImageContainer}>
                                    <img
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        style={styles.adImage}
                                    />
                                    <div style={styles.adTypebadge}>
                                        {ad.tier === 'premium' ? '프리미엄' :
                                            ad.tier === 'standard' ? '스탠다드' : '베이직'}
                                    </div>
                                </div>
                            )}

                            {/* 광고 정보 */}
                            <div style={styles.adInfo}>
                                <div style={styles.adHeader}>
                                    <div>
                                        <h3 style={styles.adTitle}>{ad.title}</h3>
                                        <p style={styles.adDescription}>{ad.description}</p>
                                    </div>
                                    <div style={styles.adStatus}>
                                        {ad.status === 'active' ? (
                                            <span style={styles.statusActive}>
                                                <CheckCircle size={16} />
                                                활성
                                            </span>
                                        ) : ad.status === 'paused' ? (
                                            <span style={styles.statusPaused}>
                                                <AlertCircle size={16} />
                                                일시정지
                                            </span>
                                        ) : (
                                            <span style={styles.statusPending}>
                                                <Clock size={16} />
                                                검토 중
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 광고 통계 */}
                                <div style={styles.adStats}>
                                    <div style={styles.adStatItem}>
                                        <Eye size={16} />
                                        <span>노출: {(ad.impressions || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.adStatItem}>
                                        <MousePointer size={16} />
                                        <span>클릭: {(ad.clicks || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.adStatItem}>
                                        <TrendingUp size={16} />
                                        <span>
                                            CTR: {ad.impressions > 0
                                                ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                                                : 0}%
                                        </span>
                                    </div>
                                </div>

                                {/* 광고 설정 */}
                                <div style={styles.adMeta}>
                                    <span style={styles.metaItem}>
                                        위치: {ad.position === 'top-banner' ? '상단 배너' :
                                            ad.position === 'sidebar' ? '사이드바' : '하단'}
                                    </span>
                                    <span style={styles.metaItem}>
                                        기간: {ad.startDate?.toDate().toLocaleDateString()} ~ {ad.endDate?.toDate().toLocaleDateString()}
                                    </span>
                                </div>

                                {/* 액션 버튼 */}
                                <div style={styles.adActions}>
                                    <button
                                        onClick={() => handleStatusToggle(ad)}
                                        style={styles.actionButton}
                                    >
                                        {ad.status === 'active' ? '일시정지' : '활성화'}
                                    </button>
                                    <button
                                        onClick={() => setEditingAd(ad)}
                                        style={styles.actionButton}
                                    >
                                        <Edit2 size={16} />
                                        수정
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ad.id)}
                                        style={{ ...styles.actionButton, color: '#dc2626' }}
                                    >
                                        <Trash2 size={16} />
                                        삭제
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 광고 생성/수정 모달 */}
            {(showCreateModal || editingAd) && (
                <AdFormModal
                    ad={editingAd}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingAd(null);
                    }}
                    onSave={() => {
                        setShowCreateModal(false);
                        setEditingAd(null);
                        loadAds();
                    }}
                    user={user}
                />
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

// 광고 생성/수정 모달
function AdFormModal({ ad, onClose, onSave, user }) {
    const [formData, setFormData] = useState({
        title: ad?.title || '',
        description: ad?.description || '',
        url: ad?.url || '',
        tier: ad?.tier || 'basic',
        position: ad?.position || 'top-banner',
        startDate: ad?.startDate?.toDate().toISOString().split('T')[0] || '',
        endDate: ad?.endDate?.toDate().toISOString().split('T')[0] || '',
        targetBusinessType: ad?.targeting?.businessType || 'all',
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(ad?.imageUrl || null);
    const [uploading, setUploading] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setUploading(true);

            let imageUrl = ad?.imageUrl;

            // 이미지 업로드
            if (imageFile) {
                const storageRef = ref(storage, `advertisements/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            const adData = {
                title: formData.title,
                description: formData.description,
                url: formData.url,
                imageUrl,
                tier: formData.tier,
                position: formData.position,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate),
                targeting: {
                    businessType: formData.targetBusinessType
                },
                advertiserId: user.uid,
                advertiserInfo: {
                    businessName: user.businessName,
                    email: user.email
                },
                status: 'pending', // 관리자 승인 필요
                impressions: ad?.impressions || 0,
                clicks: ad?.clicks || 0,
                createdAt: ad?.createdAt || new Date(),
                updatedAt: new Date()
            };

            if (ad) {
                // 수정
                await updateDoc(doc(db, 'advertisements', ad.id), adData);
                alert('광고가 수정되었습니다. 관리자 승인을 기다려주세요.');
            } else {
                // 생성
                await addDoc(collection(db, 'advertisements'), adData);
                alert('광고가 등록되었습니다. 관리자 승인을 기다려주세요.');
            }

            onSave();

        } catch (error) {
            console.error('광고 저장 실패:', error);
            alert('광고 저장에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.modalTitle}>
                    {ad ? '광고 수정' : '새 광고 만들기'}
                </h2>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* 이미지 업로드 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>광고 이미지</label>
                        <div style={styles.imageUpload}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={styles.fileInput}
                                id="image-upload"
                            />
                            <label htmlFor="image-upload" style={styles.uploadButton}>
                                <Upload size={20} />
                                이미지 선택
                            </label>
                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    style={styles.imagePreview}
                                />
                            )}
                        </div>
                    </div>

                    {/* 제목 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>광고 제목 *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>

                    {/* 설명 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>설명</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            style={styles.textarea}
                            rows={3}
                        />
                    </div>

                    {/* URL */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>링크 URL *</label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            style={styles.input}
                            placeholder="https://"
                            required
                        />
                    </div>

                    {/* 티어 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>광고 등급 *</label>
                        <select
                            value={formData.tier}
                            onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                            style={styles.select}
                            required
                        >
                            <option value="basic">베이직 (월 20만원)</option>
                            <option value="standard">스탠다드 (월 50만원)</option>
                            <option value="premium">프리미엄 (월 100만원)</option>
                        </select>
                    </div>

                    {/* 위치 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>광고 위치 *</label>
                        <select
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            style={styles.select}
                            required
                        >
                            <option value="top-banner">상단 배너</option>
                            <option value="sidebar">사이드바</option>
                            <option value="footer">하단</option>
                        </select>
                    </div>

                    {/* 타겟 */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>타겟 고객</label>
                        <select
                            value={formData.targetBusinessType}
                            onChange={(e) => setFormData({ ...formData, targetBusinessType: e.target.value })}
                            style={styles.select}
                        >
                            <option value="all">전체</option>
                            <option value="clinic">치과만</option>
                            <option value="lab">기공소만</option>
                        </select>
                    </div>

                    {/* 기간 */}
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>시작일 *</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                style={styles.input}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>종료일 *</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div style={styles.modalActions}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={styles.cancelButton}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            style={styles.submitButton}
                            disabled={uploading}
                        >
                            {uploading ? '저장 중...' : ad ? '수정' : '등록'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    loading: {
        textAlign: 'center',
        padding: '80px 20px',
        color: '#64748b',
    },
    spinner: {
        width: '50px',
        height: '50px',
        margin: '0 auto 20px',
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
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '15px',
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        backgroundColor: '#eef2ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '13px',
        color: '#64748b',
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
    },
    emptySubtext: {
        fontSize: '14px',
        color: '#94a3b8',
    },
    adsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    adCard: {
        display: 'flex',
        gap: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    adImageContainer: {
        position: 'relative',
        width: '200px',
        flexShrink: 0,
    },
    adImage: {
        width: '100%',
        height: '150px',
        objectFit: 'cover',
        borderRadius: '12px',
    },
    adTypeBadge: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '4px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontSize: '11px',
        fontWeight: '700',
        borderRadius: '6px',
    },
    adInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    adHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    adTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    adDescription: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    adStatus: {
        flexShrink: 0,
    },
    statusActive: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '700',
    },
    statusPaused: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '700',
    },
    statusPending: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '700',
    },
    adStats: {
        display: 'flex',
        gap: '24px',
    },
    adStatItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#64748b',
    },
    adMeta: {
        display: 'flex',
        gap: '24px',
        fontSize: '13px',
        color: '#94a3b8',
    },
    metaItem: {},
    adActions: {
        display: 'flex',
        gap: '12px',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#6366f1',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
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
        maxWidth: '700px',
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
    },
    select: {
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
    },
    imageUpload: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
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

export default AdManager;