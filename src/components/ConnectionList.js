import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Search, UserPlus, Check, X, Users, Trash2, Building2, Mail, Filter, Phone, MapPin, Clock, AlertCircle } from 'lucide-react';

function ConnectionList({ user }) {
    const [connections, setConnections] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [filterType, setFilterType] = useState('all'); // all, clinic, lab
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // 🔥 직원 여부 확인
    const isStaff = user?.userType === 'staff';
    const isOwner = user?.businessType === 'dental' || user?.businessType === 'lab';

    useEffect(() => {
        fetchConnections();
    }, [user]);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const connectionsRef = collection(db, 'connections');
            
            const sentQuery = query(connectionsRef, where('requesterId', '==', user.uid));
            const receivedQuery = query(connectionsRef, where('receiverId', '==', user.uid));

            const [sentSnapshot, receivedSnapshot] = await Promise.all([
                getDocs(sentQuery),
                getDocs(receivedQuery)
            ]);

            const allConnections = [];

            for (const docSnap of sentSnapshot.docs) {
                const data = docSnap.data();
                const partnerDoc = await getDoc(doc(db, 'users', data.receiverId));
                if (partnerDoc.exists()) {
                    allConnections.push({
                        id: docSnap.id,
                        ...data,
                        partnerData: partnerDoc.data(),
                        partnerId: data.receiverId,
                        type: 'sent'
                    });
                }
            }

            for (const docSnap of receivedSnapshot.docs) {
                const data = docSnap.data();
                const partnerDoc = await getDoc(doc(db, 'users', data.requesterId));
                if (partnerDoc.exists()) {
                    allConnections.push({
                        id: docSnap.id,
                        ...data,
                        partnerData: partnerDoc.data(),
                        partnerId: data.requesterId,
                        type: 'received'
                    });
                }
            }

            setConnections(allConnections);
        } catch (error) {
            console.error('연결 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            alert('검색어를 입력하세요.');
            return;
        }

        try {
            setSearching(true);
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            
            const results = [];
            usersSnapshot.docs.forEach(docSnap => {
                const userData = docSnap.data();
                const userId = docSnap.id;
                
                if (userId === user.uid) return;
                
                const businessName = (userData.businessName || '').toLowerCase();
                const email = (userData.email || '').toLowerCase();
                const query = searchQuery.toLowerCase();
                
                if (businessName.includes(query) || email.includes(query)) {
                    const existingConnection = connections.find(
                        conn => conn.partnerId === userId
                    );
                    
                    results.push({
                        id: userId,
                        ...userData,
                        connectionStatus: existingConnection ? existingConnection.status : null,
                        connectionId: existingConnection ? existingConnection.id : null
                    });
                }
            });

            setSearchResults(results);
        } catch (error) {
            console.error('검색 실패:', error);
            alert('검색에 실패했습니다.');
        } finally {
            setSearching(false);
        }
    };

    const handleConnect = async (partnerId) => {
        try {
            await addDoc(collection(db, 'connections'), {
                requesterId: user.uid,
                receiverId: partnerId,
                status: 'pending',
                createdAt: new Date()
            });

            alert('연결 요청을 보냈습니다.');
            handleSearch();
            fetchConnections();
        } catch (error) {
            console.error('연결 요청 실패:', error);
            alert('연결 요청에 실패했습니다.');
        }
    };

    const handleAccept = async (connectionId) => {
        try {
            await updateDoc(doc(db, 'connections', connectionId), {
                status: 'accepted',
                updatedAt: new Date()
            });

            alert('연결을 수락했습니다.');
            fetchConnections();
        } catch (error) {
            console.error('수락 실패:', error);
            alert('수락에 실패했습니다.');
        }
    };

    const handleReject = async (connectionId) => {
        try {
            await updateDoc(doc(db, 'connections', connectionId), {
                status: 'rejected',
                updatedAt: new Date()
            });

            alert('연결을 거부했습니다.');
            fetchConnections();
        } catch (error) {
            console.error('거부 실패:', error);
            alert('거부에 실패했습니다.');
        }
    };

    const handleDisconnect = async (connectionId, partnerName) => {
        if (!window.confirm(`"${partnerName}"와의 연결을 해제하시겠습니까?\n\n해제 후에는 다시 연결 요청을 보내야 합니다.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'connections', connectionId));
            alert('연결이 해제되었습니다.');
            setShowDetailModal(false);
            fetchConnections();
            
            if (searchResults.length > 0) {
                handleSearch();
            }
        } catch (error) {
            console.error('연결 해제 실패:', error);
            alert('연결 해제에 실패했습니다.');
        }
    };

    const handleCardClick = (conn) => {
        setSelectedPartner(conn);
        setShowDetailModal(true);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('ko-KR');
        if (timestamp instanceof Date) return timestamp.toLocaleDateString('ko-KR');
        return '-';
    };

    const pendingRequests = connections.filter(
        conn => conn.type === 'received' && conn.status === 'pending'
    );
    
    let connectedPartners = connections.filter(conn => conn.status === 'accepted');
    
    if (filterType !== 'all') {
        connectedPartners = connectedPartners.filter(conn => {
            if (filterType === 'dental') {
                return conn.partnerData?.businessType === 'dental';
            } else if (filterType === 'lab') {
                return conn.partnerData?.businessType === 'lab';
            }
            return true;
        });
    }

    const stats = {
        total: connections.filter(conn => conn.status === 'accepted').length,
        clinics: connections.filter(conn => conn.status === 'accepted' && conn.partnerData?.businessType === 'dental').length,
        labs: connections.filter(conn => conn.status === 'accepted' && conn.partnerData?.businessType === 'lab').length,
        pending: pendingRequests.length
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
        <div>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>거래처 관리</h1>
                    <p style={styles.subtitle}>치과와 치과기공소를 연결하고 관리하세요</p>
                </div>
            </div>

            {/* 통계 대시보드 */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>
                        <Users size={24} color="#6366f1" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.total}</div>
                        <div style={styles.statLabel}>전체 연결</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#dbeafe'}}>
                        <Building2 size={24} color="#2563eb" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.clinics}</div>
                        <div style={styles.statLabel}>치과</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#d1fae5'}}>
                        <Building2 size={24} color="#059669" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.labs}</div>
                        <div style={styles.statLabel}>기공소</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: '#fef3c7'}}>
                        <Mail size={24} color="#d97706" />
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{stats.pending}</div>
                        <div style={styles.statLabel}>대기 중</div>
                    </div>
                </div>
            </div>

            {/* 검색 */}
            <div style={styles.searchSection}>
                <h2 style={styles.sectionTitle}>🔍 업체 검색</h2>
                
                {/* 🔥 직원일 경우 안내 메시지 표시 */}
                {isStaff ? (
                    <div style={styles.staffNotice}>
                        <AlertCircle size={48} color="#f59e0b" />
                        <h3 style={styles.staffNoticeTitle}>직원 계정은 거래처 신청을 할 수 없습니다</h3>
                        <p style={styles.staffNoticeText}>
                            거래처 신청은 업체 오너만 가능합니다.<br />
                            회사 소속으로 등록되어 있으며, 회사의 기존 거래처를 이용할 수 있습니다.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={styles.searchBox}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                style={styles.searchInput}
                                placeholder="업체명 또는 이메일로 검색하세요..."
                            />
                            <button onClick={handleSearch} style={styles.searchButton} disabled={searching}>
                                <Search size={18} />
                                {searching ? '검색 중...' : '검색'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div style={styles.searchResults}>
                                <div style={styles.searchResultsHeader}>
                                    검색 결과 {searchResults.length}개
                                </div>
                        {searchResults.map((result) => (
                            <div 
                                key={result.id} 
                                style={styles.resultCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#6366f1';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={styles.resultInfo}>
                                    <div style={styles.resultHeader}>
                                        <h3 style={styles.resultName}>{result.businessName}</h3>
                                        <span style={{
                                            ...styles.resultType,
                                            backgroundColor: result.businessType === 'clinic' ? '#dbeafe' : '#d1fae5',
                                            color: result.businessType === 'clinic' ? '#2563eb' : '#059669'
                                        }}>
                                            {result.businessType === 'clinic' ? '🏥 치과' : '🔧 기공소'}
                                        </span>
                                    </div>
                                    <div style={styles.resultDetails}>
                                        <p style={styles.resultEmail}>
                                            <Mail size={14} />
                                            {result.email}
                                        </p>
                                        {result.phone && (
                                            <p style={styles.resultEmail}>
                                                <Phone size={14} />
                                                {result.phone}
                                            </p>
                                        )}
                                        {result.address && (
                                            <p style={styles.resultEmail}>
                                                <MapPin size={14} />
                                                {result.address}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    {!result.connectionStatus && (
                                        <button
                                            onClick={() => handleConnect(result.id)}
                                            style={styles.connectButton}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <UserPlus size={18} />
                                            연결 요청
                                        </button>
                                    )}
                                    {result.connectionStatus === 'pending' && (
                                        <span style={styles.statusBadge}>⏳ 요청 대기중</span>
                                    )}
                                    {result.connectionStatus === 'accepted' && (
                                        <span style={styles.statusBadgeConnected}>✓ 연결됨</span>
                                    )}
                                    {result.connectionStatus === 'rejected' && (
                                        <span style={styles.statusBadgeRejected}>✗ 거부됨</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </>
            )}
            </div>

            {/* 연결 요청 */}
            {pendingRequests.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>
                            📩 받은 연결 요청
                        </h2>
                        <span style={styles.badge}>{pendingRequests.length}건</span>
                    </div>
                    <div style={styles.grid}>
                        {pendingRequests.map((conn) => (
                            <div 
                                key={conn.id} 
                                style={styles.requestCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={styles.requestBadge}>NEW</div>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>
                                        {conn.partnerData?.businessName || '이름 없음'}
                                    </h3>
                                    <span style={{
                                        ...styles.cardType,
                                        backgroundColor: conn.partnerData?.businessType === 'dental' ? '#dbeafe' : '#d1fae5',
                                        color: conn.partnerData?.businessType === 'dental' ? '#2563eb' : '#059669'
                                    }}>
                                        {conn.partnerData?.businessType === 'dental' ? '치과' : '기공소'}
                                    </span>
                                </div>
                                <div style={styles.cardInfo}>
                                    <p style={styles.cardEmail}>
                                        <Mail size={14} />
                                        {conn.partnerData?.email}
                                    </p>
                                    {conn.partnerData?.phone && (
                                        <p style={styles.cardEmail}>
                                            <Phone size={14} />
                                            {conn.partnerData?.phone}
                                        </p>
                                    )}
                                </div>
                                <div style={styles.cardActions}>
                                    <button
                                        onClick={() => handleAccept(conn.id)}
                                        style={styles.acceptButton}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Check size={16} />
                                        수락
                                    </button>
                                    <button
                                        onClick={() => handleReject(conn.id)}
                                        style={styles.rejectButton}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <X size={16} />
                                        거부
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 연결된 업체 */}
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <div>
                        <h2 style={styles.sectionTitle}>
                            🤝 연결된 업체
                        </h2>
                        <p style={styles.sectionSubtitle}>
                            현재 {connectedPartners.length}개 업체와 연결되어 있습니다 • 카드를 클릭하면 상세정보를 볼 수 있습니다
                        </p>
                    </div>
                    <div style={styles.filterGroup}>
                        <Filter size={16} />
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            style={styles.filterSelect}
                        >
                            <option value="all">전체</option>
                            <option value="dental">치과만</option>
                            <option value="lab">기공소만</option>
                        </select>
                    </div>
                </div>
                {connectedPartners.length === 0 ? (
                    <div style={styles.emptyState}>
                        <Users size={64} color="#cbd5e1" />
                        <p style={styles.emptyText}>
                            {filterType === 'all' 
                                ? '연결된 업체가 없습니다' 
                                : filterType === 'dental'
                                ? '연결된 치과가 없습니다'
                                : '연결된 기공소가 없습니다'}
                        </p>
                        <p style={styles.emptySubtext}>위의 검색 기능을 통해 업체를 찾아보세요</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {connectedPartners.map((conn) => (
                            <div 
                                key={conn.id} 
                                style={styles.connectedCard}
                                onClick={() => handleCardClick(conn)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={styles.connectedBadge}>✓ 연결됨</div>
                                <h3 style={styles.connectedName}>
                                    {conn.partnerData?.businessName || '이름 없음'}
                                </h3>
                                <p style={styles.connectedEmail}>
                                    <Mail size={14} />
                                    {conn.partnerData?.email}
                                </p>
                                {conn.partnerData?.phone && (
                                    <p style={styles.connectedPhone}>
                                        <Phone size={14} />
                                        {conn.partnerData?.phone}
                                    </p>
                                )}
                                <span style={{
                                    ...styles.connectedType,
                                    backgroundColor: conn.partnerData?.businessType === 'dental' ? '#dbeafe' : '#d1fae5',
                                    color: conn.partnerData?.businessType === 'dental' ? '#2563eb' : '#059669'
                                }}>
                                    {conn.partnerData?.businessType === 'dental' ? '치과' : '기공소'}
                                </span>
                                <div style={styles.clickHint}>
                                    클릭하여 상세정보 보기 →
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 상세 정보 모달 */}
            {showDetailModal && selectedPartner && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>업체 상세 정보</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            {/* 업체명 및 타입 */}
                            <div style={styles.modalSection}>
                                <div style={styles.modalBusinessHeader}>
                                    <h3 style={styles.modalBusinessName}>
                                        {selectedPartner.partnerData?.businessName || '이름 없음'}
                                    </h3>
                                    <span style={{
                                        ...styles.modalTypeBadge,
                                        backgroundColor: selectedPartner.partnerData?.businessType === 'dental' ? '#dbeafe' : '#d1fae5',
                                        color: selectedPartner.partnerData?.businessType === 'dental' ? '#2563eb' : '#059669'
                                    }}>
                                        {selectedPartner.partnerData?.businessType === 'dental' ? '치과' : '기공소'}
                                    </span>
                                </div>
                            </div>

                            {/* 연락 정보 */}
                            <div style={styles.modalSection}>
                                <h4 style={styles.modalSectionTitle}>연락 정보</h4>
                                
                                <div style={styles.modalDetailItem}>
                                    <Mail size={18} color="#64748b" />
                                    <div style={styles.modalDetailContent}>
                                        <div style={styles.modalDetailLabel}>이메일</div>
                                        <div style={styles.modalDetailValue}>
                                            {selectedPartner.partnerData?.email || '-'}
                                        </div>
                                    </div>
                                </div>

                                {selectedPartner.partnerData?.phone && (
                                    <div style={styles.modalDetailItem}>
                                        <Phone size={18} color="#64748b" />
                                        <div style={styles.modalDetailContent}>
                                            <div style={styles.modalDetailLabel}>전화번호</div>
                                            <div style={styles.modalDetailValue}>
                                                {selectedPartner.partnerData.phone}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 사업장 정보 */}
                            {(selectedPartner.partnerData?.address || selectedPartner.partnerData?.businessNumber) && (
                                <div style={styles.modalSection}>
                                    <h4 style={styles.modalSectionTitle}>사업장 정보</h4>
                                    
                                    {selectedPartner.partnerData?.address && (
                                        <div style={styles.modalDetailItem}>
                                            <MapPin size={18} color="#64748b" />
                                            <div style={styles.modalDetailContent}>
                                                <div style={styles.modalDetailLabel}>주소</div>
                                                <div style={styles.modalDetailValue}>
                                                    {selectedPartner.partnerData.address}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedPartner.partnerData?.businessNumber && (
                                        <div style={styles.modalDetailItem}>
                                            <Building2 size={18} color="#64748b" />
                                            <div style={styles.modalDetailContent}>
                                                <div style={styles.modalDetailLabel}>사업자번호</div>
                                                <div style={styles.modalDetailValue}>
                                                    {selectedPartner.partnerData.businessNumber}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 연결 정보 */}
                            <div style={styles.modalSection}>
                                <h4 style={styles.modalSectionTitle}>연결 정보</h4>
                                
                                <div style={styles.modalDetailItem}>
                                    <Clock size={18} color="#64748b" />
                                    <div style={styles.modalDetailContent}>
                                        <div style={styles.modalDetailLabel}>연결일</div>
                                        <div style={styles.modalDetailValue}>
                                            {formatDate(selectedPartner.updatedAt || selectedPartner.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => handleDisconnect(
                                    selectedPartner.id, 
                                    selectedPartner.partnerData?.businessName
                                )}
                                style={styles.modalDisconnectButton}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dc2626';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ef4444';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <Trash2 size={18} />
                                연결 해제
                            </button>
                        </div>
                    </div>
                </div>
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

const styles = {
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
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
    },
    statCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
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
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    searchSection: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '32px',
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    sectionSubtitle: {
        margin: '4px 0 0 0',
        fontSize: '13px',
        color: '#94a3b8',
    },
    searchBox: {
        display: 'flex',
        gap: '12px',
    },
    searchInput: {
        flex: 1,
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        transition: 'all 0.2s',
        outline: 'none',
    },
    searchButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 28px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    searchResults: {
        marginTop: '20px',
    },
    staffNotice: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        backgroundColor: '#fffbeb',
        borderRadius: '16px',
        border: '2px dashed #fbbf24',
        textAlign: 'center',
        marginTop: '20px',
    },
    staffNoticeTitle: {
        margin: '20px 0 12px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#92400e',
    },
    staffNoticeText: {
        margin: 0,
        fontSize: '15px',
        color: '#78350f',
        lineHeight: '1.6',
    },
    searchResultsHeader: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '2px solid #f1f5f9',
    },
    resultCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        marginBottom: '12px',
        transition: 'all 0.2s',
    },
    resultInfo: {
        flex: 1,
    },
    resultHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
    },
    resultName: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    resultDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    resultEmail: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    resultType: {
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    connectButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    statusBadge: {
        padding: '10px 20px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '700',
    },
    statusBadgeConnected: {
        padding: '10px 20px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '700',
    },
    statusBadgeRejected: {
        padding: '10px 20px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '700',
    },
    section: {
        marginBottom: '32px',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    badge: {
        padding: '6px 14px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
    },
    filterGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
    },
    filterSelect: {
        padding: '4px 8px',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        outline: 'none',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
    },
    requestCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '2px solid #fef3c7',
        position: 'relative',
        transition: 'all 0.3s',
    },
    requestBadge: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        padding: '4px 10px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    cardTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    cardType: {
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
    },
    cardInfo: {
        marginBottom: '20px',
    },
    cardEmail: {
        margin: '0 0 8px 0',
        fontSize: '13px',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    cardActions: {
        display: 'flex',
        gap: '10px',
    },
    acceptButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    },
    rejectButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
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
    connectedCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '2px solid #e2e8f0',
        position: 'relative',
        transition: 'all 0.3s',
        textAlign: 'center',
        cursor: 'pointer',
    },
    connectedBadge: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        padding: '4px 10px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
    },
    connectedName: {
        margin: '0 0 12px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    connectedEmail: {
        margin: '0 0 8px 0',
        fontSize: '13px',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
    },
    connectedPhone: {
        margin: '0 0 16px 0',
        fontSize: '13px',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
    },
    connectedType: {
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '700',
        display: 'inline-block',
        marginBottom: '12px',
    },
    clickHint: {
        fontSize: '12px',
        color: '#94a3b8',
        fontWeight: '500',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f1f5f9',
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
        maxWidth: '600px',
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
    modalSection: {
        marginBottom: '28px',
        paddingBottom: '28px',
        borderBottom: '1px solid #f1f5f9',
    },
    modalBusinessHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
    },
    modalBusinessName: {
        margin: 0,
        fontSize: '22px',
        fontWeight: '700',
        color: '#0f172a',
    },
    modalTypeBadge: {
        padding: '8px 16px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '700',
    },
    modalSectionTitle: {
        margin: '0 0 20px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    modalDetailItem: {
        display: 'flex',
        gap: '16px',
        padding: '16px 0',
        borderBottom: '1px solid #f8fafc',
    },
    modalDetailContent: {
        flex: 1,
    },
    modalDetailLabel: {
        fontSize: '12px',
        color: '#94a3b8',
        marginBottom: '6px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    modalDetailValue: {
        fontSize: '15px',
        color: '#0f172a',
        fontWeight: '500',
        wordBreak: 'break-word',
    },
    modalFooter: {
        padding: '24px 28px',
        borderTop: '2px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: '#f8fafc',
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
    },
    modalDisconnectButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 28px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    },
};

export default ConnectionList;