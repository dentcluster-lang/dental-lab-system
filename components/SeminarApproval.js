import React, { useState, useEffect, useCallback } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    doc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    GraduationCap,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    MapPin,
    User,
    Building,
    Trash2
} from 'lucide-react';
import './SeminarApproval.css';

function SeminarApproval() {
    const [seminars, setSeminars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
    const [selectedSeminar, setSelectedSeminar] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // ✅ loadSeminars를 useCallback으로 감싸기
    const loadSeminars = useCallback(async () => {
        try {
            setLoading(true);
            const seminarsRef = collection(db, 'seminars');
            
            let q;
            if (filter === 'all') {
                q = query(seminarsRef, orderBy('createdAt', 'desc'));
            } else {
                q = query(
                    seminarsRef,
                    where('status', '==', filter),
                    orderBy('createdAt', 'desc')
                );
            }
            
            const querySnapshot = await getDocs(q);
            const seminarsList = [];
            
            querySnapshot.forEach((docSnap) => {
                seminarsList.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            setSeminars(seminarsList);
        } catch (error) {
            console.error('세미나 로드 실패:', error);
            alert('세미나 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        loadSeminars();
    }, [loadSeminars]);

    const handleApprove = async (seminarId) => {
        if (!window.confirm('이 세미나를 승인하시겠습니까?')) return;

        try {
            const seminarRef = doc(db, 'seminars', seminarId);
            await updateDoc(seminarRef, {
                status: 'approved',
                approvedAt: new Date().toISOString(),
                approvedBy: 'admin'
            });

            alert('세미나가 승인되었습니다. 등록자가 결제 후 게시할 수 있습니다.');
            loadSeminars();
        } catch (error) {
            console.error('승인 실패:', error);
            alert('승인에 실패했습니다.');
        }
    };

    const openRejectModal = (seminar) => {
        setSelectedSeminar(seminar);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('반려 사유를 입력해주세요.');
            return;
        }

        try {
            const seminarRef = doc(db, 'seminars', selectedSeminar.id);
            await updateDoc(seminarRef, {
                status: 'rejected',
                rejectedAt: new Date().toISOString(),
                rejectedBy: 'admin',
                rejectionReason: rejectionReason
            });

            alert('세미나가 반려되었습니다.');
            setShowRejectModal(false);
            setSelectedSeminar(null);
            setRejectionReason('');
            loadSeminars();
        } catch (error) {
            console.error('반려 실패:', error);
            alert('반려에 실패했습니다.');
        }
    };

    const handleDelete = async (seminarId) => {
        if (!window.confirm('이 세미나를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'seminars', seminarId));
            alert('세미나가 삭제되었습니다.');
            loadSeminars();
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: '승인 대기', color: '#f59e0b', bg: '#fef3c7' },
            approved: { text: '승인됨', color: '#10b981', bg: '#d1fae5' },
            rejected: { text: '반려됨', color: '#ef4444', bg: '#fee2e2' },
            active: { text: '게시 중', color: '#8b5cf6', bg: '#ede9fe' }
        };
        return badges[status] || badges.pending;
    };

    const filteredSeminars = seminars;

    if (loading) {
        return (
            <div className="seminar-approval-container">
                <div className="loading">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="seminar-approval-container">
            <div className="header">
                <div className="header-left">
                    <GraduationCap size={32} style={{ color: '#8b5cf6' }} />
                    <div>
                        <h1>세미나 승인 관리</h1>
                        <p>세미나 등록 신청을 검토하고 승인합니다</p>
                    </div>
                </div>
            </div>

            {/* 필터 */}
            <div className="filter-section">
                <button
                    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    <Clock size={16} />
                    승인 대기 ({seminars.filter(s => s.status === 'pending').length})
                </button>
                <button
                    className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                    onClick={() => setFilter('approved')}
                >
                    <CheckCircle size={16} />
                    승인됨 ({seminars.filter(s => s.status === 'approved').length})
                </button>
                <button
                    className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilter('rejected')}
                >
                    <XCircle size={16} />
                    반려됨 ({seminars.filter(s => s.status === 'rejected').length})
                </button>
                <button
                    className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                    onClick={() => setFilter('active')}
                >
                    <GraduationCap size={16} />
                    게시 중 ({seminars.filter(s => s.status === 'active').length})
                </button>
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    전체
                </button>
            </div>

            {/* 세미나 목록 */}
            {filteredSeminars.length === 0 ? (
                <div className="empty-state">
                    <GraduationCap size={64} style={{ color: '#cbd5e1' }} />
                    <p>세미나가 없습니다.</p>
                </div>
            ) : (
                <div className="seminar-list">
                    {filteredSeminars.map((seminar) => {
                        const badge = getStatusBadge(seminar.status);
                        return (
                            <div key={seminar.id} className="seminar-card">
                                <div className="seminar-header">
                                    <div className="seminar-title-section">
                                        <h3>{seminar.title}</h3>
                                        <span 
                                            className="status-badge"
                                            style={{
                                                backgroundColor: badge.bg,
                                                color: badge.color
                                            }}
                                        >
                                            {badge.text}
                                        </span>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(seminar.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="seminar-info-grid">
                                    <div className="info-item">
                                        <User size={16} />
                                        <span>강사: {seminar.instructor}</span>
                                    </div>
                                    <div className="info-item">
                                        <Calendar size={16} />
                                        <span>일시: {new Date(seminar.date).toLocaleDateString('ko-KR')} {seminar.time}</span>
                                    </div>
                                    <div className="info-item">
                                        <MapPin size={16} />
                                        <span>장소: {seminar.location}</span>
                                    </div>
                                    <div className="info-item">
                                        <Building size={16} />
                                        <span>
                                            신청자: {seminar.businessName || seminar.clinicName || seminar.userName}
                                            ({seminar.userType === 'clinic' ? '치과' : seminar.userType === 'lab' ? '기공소' : '관리자'})
                                        </span>
                                    </div>
                                </div>

                                <div className="seminar-details">
                                    <div className="detail-section">
                                        <strong>대상:</strong>
                                        <span>{seminar.targetAudience}</span>
                                    </div>
                                    {seminar.capacity && (
                                        <div className="detail-section">
                                            <strong>정원:</strong>
                                            <span>{seminar.capacity}명</span>
                                        </div>
                                    )}
                                    <div className="detail-section">
                                        <strong>소개:</strong>
                                        <p>{seminar.description}</p>
                                    </div>
                                    {seminar.topics && (
                                        <div className="detail-section">
                                            <strong>주요 내용:</strong>
                                            <p>{seminar.topics}</p>
                                        </div>
                                    )}
                                    {seminar.contactInfo && (
                                        <div className="detail-section">
                                            <strong>문의처:</strong>
                                            <span>{seminar.contactInfo}</span>
                                        </div>
                                    )}
                                </div>

                                {seminar.status === 'rejected' && seminar.rejectionReason && (
                                    <div className="rejection-reason">
                                        <strong>반려 사유:</strong>
                                        <p>{seminar.rejectionReason}</p>
                                    </div>
                                )}

                                <div className="seminar-meta">
                                    <span className="meta-date">
                                        신청일: {new Date(seminar.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                    {seminar.approvedAt && (
                                        <span className="meta-date">
                                            승인일: {new Date(seminar.approvedAt).toLocaleDateString('ko-KR')}
                                        </span>
                                    )}
                                    {seminar.paidAt && (
                                        <span className="meta-date">
                                            결제일: {new Date(seminar.paidAt).toLocaleDateString('ko-KR')}
                                        </span>
                                    )}
                                </div>

                                {seminar.status === 'pending' && (
                                    <div className="action-buttons">
                                        <button
                                            className="approve-btn"
                                            onClick={() => handleApprove(seminar.id)}
                                        >
                                            <CheckCircle size={18} />
                                            승인
                                        </button>
                                        <button
                                            className="reject-btn"
                                            onClick={() => openRejectModal(seminar)}
                                        >
                                            <XCircle size={18} />
                                            반려
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 반려 모달 */}
            {showRejectModal && selectedSeminar && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>세미나 반려</h3>
                        </div>
                        <div className="modal-body">
                            <div className="reject-info">
                                <h4>{selectedSeminar.title}</h4>
                                <p>신청자: {selectedSeminar.businessName || selectedSeminar.clinicName || selectedSeminar.userName}</p>
                            </div>
                            <div className="form-group">
                                <label>반려 사유 *</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="반려 사유를 입력하세요"
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowRejectModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="confirm-reject-btn"
                                onClick={handleReject}
                            >
                                반려하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SeminarApproval;