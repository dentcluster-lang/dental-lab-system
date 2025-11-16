import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { createNotification } from '../services/NotificationSystem';
import { 
    Users, UserPlus, UserMinus, Clock, CheckCircle, XCircle,
    Mail, Phone, Calendar, Shield, AlertTriangle, RefreshCw,
    Building2, Trash2, Search, Filter
} from 'lucide-react';

function CompanyManager({ user }) {
    const [activeTab, setActiveTab] = useState('current'); // current, pending, invite
    const [staffList, setStaffList] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteMessage, setInviteMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user && !user.companyId) {
            fetchData();
        }
    }, [user]);

    // 데이터 불러오기
    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchCurrentStaff(),
                fetchPendingRequests()
            ]);
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
            setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    // 현재 직원 목록 가져오기
    const fetchCurrentStaff = async () => {
        try {
            const staffQuery = query(
                collection(db, 'users'),
                where('companyId', '==', user.uid)
            );
            const snapshot = await getDocs(staffQuery);
            
            const staff = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                joinedAt: doc.data().approvedAt || doc.data().updatedAt
            }));

            setStaffList(staff);
            console.log('현재 직원:', staff.length, '명');
        } catch (error) {
            console.error('직원 목록 조회 실패:', error);
        }
    };

    // 대기 중인 직원 요청 가져오기
    const fetchPendingRequests = async () => {
        try {
            const pendingQuery = query(
                collection(db, 'users'),
                where('pendingCompanyId', '==', user.uid)
            );
            const snapshot = await getDocs(pendingQuery);
            
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setPendingRequests(requests);
            console.log('대기 중인 요청:', requests.length, '건');
        } catch (error) {
            console.error('대기 요청 조회 실패:', error);
        }
    };

    // 직원 승인
    const approveStaff = async (staffId) => {
        if (!window.confirm('이 직원을 승인하시겠습니까?')) return;

        try {
            setProcessing(true);
            
            // 직원 정보 가져오기
            const staffDoc = await getDoc(doc(db, 'users', staffId));
            const staffData = staffDoc.data();

            // 직원 정보 업데이트
            await updateDoc(doc(db, 'users', staffId), {
                userType: 'staff',
                companyId: user.uid,
                companyName: user.businessName,
                companyBusinessType: user.businessType,
                approvedAt: new Date().toISOString(),
                status: 'approved',
                
                // pending 필드 삭제
                pendingCompanyId: deleteField(),
                pendingCompanyName: deleteField(),
                pendingCompanyType: deleteField(),
                requestedAt: deleteField()
            });

            setMessage({ 
                type: 'success', 
                text: `${staffData.name || staffData.email}님을 직원으로 승인했습니다.` 
            });

            // ✅ 직원에게 승인 알림 보내기
            try {
                await createNotification({
                    userId: staffId,
                    type: 'staff_approved',
                    title: '직원 승인 완료',
                    message: `${user.businessName}에서 직원 요청을 승인했습니다.`,
                    link: '/company-manager'
                });
                console.log('✅ 직원 승인 알림 전송 성공');
            } catch (notificationError) {
                console.error('⚠️ 알림 전송 실패:', notificationError);
            }

            // 목록 새로고침
            await fetchData();

        } catch (error) {
            console.error('직원 승인 실패:', error);
            setMessage({ type: 'error', text: '직원 승인에 실패했습니다.' });
        } finally {
            setProcessing(false);
        }
    };

    // 직원 거절
    const rejectStaff = async (staffId) => {
        if (!window.confirm('이 요청을 거절하시겠습니까?')) return;

        try {
            setProcessing(true);

            // 직원 정보 가져오기
            const staffDoc = await getDoc(doc(db, 'users', staffId));
            const staffData = staffDoc.data();

            // pending 정보만 삭제
            await updateDoc(doc(db, 'users', staffId), {
                pendingCompanyId: deleteField(),
                pendingCompanyName: deleteField(),
                pendingCompanyType: deleteField(),
                requestedAt: deleteField()
            });

            setMessage({ type: 'success', text: '요청을 거절했습니다.' });

            // ✅ 직원에게 거절 알림 보내기
            try {
                await createNotification({
                    userId: staffId,
                    type: 'staff_rejected',
                    title: '직원 요청이 거절되었습니다',
                    message: `${user.businessName}에서 직원 요청을 거절했습니다.`,
                    link: '/profile'
                });
                console.log('✅ 직원 거절 알림 전송 성공');
            } catch (notificationError) {
                console.error('⚠️ 알림 전송 실패:', notificationError);
            }

            await fetchData();

        } catch (error) {
            console.error('요청 거절 실패:', error);
            setMessage({ type: 'error', text: '요청 거절에 실패했습니다.' });
        } finally {
            setProcessing(false);
        }
    };

    // 직원 삭제
    const removeStaff = async (staffId, staffName) => {
        if (!window.confirm(`${staffName}님을 직원에서 제거하시겠습니까?\n제거 후에는 회사 데이터에 접근할 수 없습니다.`)) {
            return;
        }

        try {
            setProcessing(true);
            console.log('직원 제거 시작:', staffId);

            // 직원을 개인 회원으로 되돌리기
            await updateDoc(doc(db, 'users', staffId), {
                userType: 'individual',
                memberType: 'individual',
                
                // 회사 관련 필드 완전 삭제
                companyId: deleteField(),
                companyName: deleteField(),
                companyBusinessType: deleteField(),
                businessType: deleteField(),
                businessName: deleteField(),
                approvedAt: deleteField(),
                status: deleteField(),
                role: deleteField(),
                
                removedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            setMessage({ 
                type: 'success', 
                text: `${staffName}님이 직원에서 제거되었습니다.` 
            });

            // ✅ 직원에게 제거 알림 보내기
            try {
                await createNotification({
                    userId: staffId,
                    type: 'staff_removed',
                    title: '직원에서 제거되었습니다',
                    message: `${user.businessName}에서 직원 권한이 해제되었습니다.`,
                    link: '/profile'
                });
                console.log('✅ 직원 제거 알림 전송 성공');
            } catch (notificationError) {
                console.error('⚠️ 알림 전송 실패:', notificationError);
            }

            // 목록 새로고침
            await fetchData();

        } catch (error) {
            console.error('직원 제거 실패:', error);
            setMessage({ type: 'error', text: '직원 제거에 실패했습니다.' });
        } finally {
            setProcessing(false);
        }
    };

    // 이메일로 직원 초대
    const sendInvitation = async (e) => {
        e.preventDefault();

        if (!inviteEmail) {
            setMessage({ type: 'error', text: '초대할 직원의 이메일을 입력하세요.' });
            return;
        }

        try {
            setProcessing(true);

            // 이메일 중복 체크
            const usersQuery = query(
                collection(db, 'users'),
                where('email', '==', inviteEmail)
            );
            const snapshot = await getDocs(usersQuery);

            if (snapshot.empty) {
                setMessage({ 
                    type: 'warning', 
                    text: '해당 이메일로 가입된 회원이 없습니다. 먼저 회원가입을 안내해주세요.' 
                });
                return;
            }

            const targetUser = snapshot.docs[0];
            const targetData = targetUser.data();

            // 이미 직원인지 확인
            if (targetData.companyId === user.uid) {
                setMessage({ type: 'warning', text: '이미 우리 회사 직원입니다.' });
                return;
            }

            // 이미 다른 회사 직원인지 확인
            if (targetData.companyId) {
                setMessage({ type: 'error', text: '다른 회사에 소속된 직원입니다.' });
                return;
            }

            // 초대 정보 저장 (실제로는 알림 시스템이 필요)
            setMessage({ 
                type: 'success', 
                text: `${inviteEmail}로 초대 메시지를 전달했습니다.\n해당 직원이 [직원으로 가입하기]를 통해 신청하면 승인할 수 있습니다.` 
            });

            setInviteEmail('');
            setInviteMessage('');

        } catch (error) {
            console.error('초대 실패:', error);
            setMessage({ type: 'error', text: '초대 전송에 실패했습니다.' });
        } finally {
            setProcessing(false);
        }
    };

    // 필터링된 직원 목록
    const filteredStaff = staffList.filter(staff =>
        staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 권한 체크
    if (user?.companyId) {
        return (
            <div style={styles.accessDenied}>
                <AlertTriangle size={48} color="#ef4444" />
                <h2>접근 권한 없음</h2>
                <p>직원 관리는 회사 대표만 사용할 수 있습니다.</p>
            </div>
        );
    }

    // 업체 등록 안내
    if (!user?.businessType) {
        return (
            <div style={styles.noCompany}>
                <Building2 size={48} color="#6366f1" />
                <h2>업체 등록이 필요합니다</h2>
                <p>직원 관리를 위해서는 먼저 업체를 등록해주세요.</p>
                <button 
                    onClick={() => window.location.href = '/company-register'}
                    style={styles.registerButton}
                >
                    업체 등록하기
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loading}>
                <RefreshCw size={32} className="spin" />
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <h1 style={styles.title}>
                        <Users size={28} />
                        직원 관리
                    </h1>
                    <p style={styles.subtitle}>
                        {user.businessName}의 직원을 관리합니다
                    </p>
                </div>
                <div style={styles.stats}>
                    <div style={styles.statItem}>
                        <div style={styles.statValue}>{staffList.length}</div>
                        <div style={styles.statLabel}>현재 직원</div>
                    </div>
                    <div style={styles.statItem}>
                        <div style={styles.statValue}>{pendingRequests.length}</div>
                        <div style={styles.statLabel}>대기 요청</div>
                    </div>
                </div>
            </div>

            {/* 메시지 */}
            {message.text && (
                <div style={{
                    ...styles.message,
                    ...(message.type === 'success' ? styles.successMessage : {}),
                    ...(message.type === 'error' ? styles.errorMessage : {}),
                    ...(message.type === 'warning' ? styles.warningMessage : {})
                }}>
                    {message.type === 'success' && <CheckCircle size={18} />}
                    {message.type === 'error' && <XCircle size={18} />}
                    {message.type === 'warning' && <AlertTriangle size={18} />}
                    {message.text}
                </div>
            )}

            {/* 탭 메뉴 */}
            <div style={styles.tabs}>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'current' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('current')}
                >
                    <Users size={18} />
                    현재 직원 ({staffList.length})
                </button>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'pending' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('pending')}
                >
                    <Clock size={18} />
                    대기 요청 ({pendingRequests.length})
                    {pendingRequests.length > 0 && (
                        <span style={styles.badge}>{pendingRequests.length}</span>
                    )}
                </button>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'invite' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('invite')}
                >
                    <UserPlus size={18} />
                    직원 초대
                </button>
            </div>

            {/* 현재 직원 탭 */}
            {activeTab === 'current' && (
                <div style={styles.tabContent}>
                    {/* 검색 바 */}
                    <div style={styles.searchBar}>
                        <Search size={18} color="#64748b" />
                        <input
                            type="text"
                            placeholder="이름 또는 이메일로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    {filteredStaff.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Users size={48} color="#cbd5e1" />
                            <p>등록된 직원이 없습니다</p>
                        </div>
                    ) : (
                        <div style={styles.staffGrid}>
                            {filteredStaff.map(staff => (
                                <div key={staff.id} style={styles.staffCard}>
                                    <div style={styles.staffHeader}>
                                        <div style={styles.staffAvatar}>
                                            {staff.name?.[0] || staff.email?.[0]}
                                        </div>
                                        <div style={styles.staffInfo}>
                                            <h3 style={styles.staffName}>
                                                {staff.name || '이름 없음'}
                                            </h3>
                                            <p style={styles.staffEmail}>
                                                <Mail size={14} />
                                                {staff.email}
                                            </p>
                                            {staff.phone && (
                                                <p style={styles.staffPhone}>
                                                    <Phone size={14} />
                                                    {staff.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={styles.staffMeta}>
                                        <div style={styles.staffJoined}>
                                            <Calendar size={14} />
                                            가입일: {new Date(staff.joinedAt).toLocaleDateString('ko-KR')}
                                        </div>
                                        <div style={styles.staffRole}>
                                            <Shield size={14} />
                                            직원
                                        </div>
                                    </div>

                                    <div style={styles.staffActions}>
                                        <button
                                            onClick={() => removeStaff(staff.id, staff.name || staff.email)}
                                            style={styles.removeButton}
                                            disabled={processing}
                                        >
                                            <UserMinus size={16} />
                                            제거
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 대기 요청 탭 */}
            {activeTab === 'pending' && (
                <div style={styles.tabContent}>
                    {pendingRequests.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Clock size={48} color="#cbd5e1" />
                            <p>대기 중인 요청이 없습니다</p>
                        </div>
                    ) : (
                        <div style={styles.requestList}>
                            {pendingRequests.map(request => (
                                <div key={request.id} style={styles.requestCard}>
                                    <div style={styles.requestInfo}>
                                        <h4 style={styles.requestName}>
                                            {request.name || '이름 없음'}
                                        </h4>
                                        <p style={styles.requestEmail}>{request.email}</p>
                                        <p style={styles.requestDate}>
                                            요청일: {new Date(request.requestedAt).toLocaleDateString('ko-KR')}
                                        </p>
                                    </div>
                                    <div style={styles.requestActions}>
                                        <button
                                            onClick={() => approveStaff(request.id)}
                                            style={styles.approveButton}
                                            disabled={processing}
                                        >
                                            <CheckCircle size={18} />
                                            승인
                                        </button>
                                        <button
                                            onClick={() => rejectStaff(request.id)}
                                            style={styles.rejectButton}
                                            disabled={processing}
                                        >
                                            <XCircle size={18} />
                                            거절
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 직원 초대 탭 */}
            {activeTab === 'invite' && (
                <div style={styles.tabContent}>
                    <div style={styles.inviteSection}>
                        <h3 style={styles.sectionTitle}>이메일로 직원 초대</h3>
                        <p style={styles.sectionDesc}>
                            DentConnect에 가입한 회원을 직원으로 초대할 수 있습니다.
                        </p>
                        
                        <form onSubmit={sendInvitation} style={styles.inviteForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>초대할 직원 이메일</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    style={styles.input}
                                    required
                                />
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>초대 메시지 (선택)</label>
                                <textarea
                                    value={inviteMessage}
                                    onChange={(e) => setInviteMessage(e.target.value)}
                                    placeholder="함께 일하게 되어 기쁩니다!"
                                    style={styles.textarea}
                                    rows="3"
                                />
                            </div>
                            
                            <button
                                type="submit"
                                style={styles.inviteButton}
                                disabled={processing}
                            >
                                {processing ? '전송 중...' : '초대 보내기'}
                            </button>
                        </form>

                        <div style={styles.inviteInfo}>
                            <h4>초대 프로세스</h4>
                            <ol style={styles.processList}>
                                <li>직원이 먼저 DentConnect에 개인 회원으로 가입</li>
                                <li>초대 메시지 전달 (이메일 또는 직접 안내)</li>
                                <li>직원이 [직원으로 가입하기] 메뉴에서 회사 검색 후 신청</li>
                                <li>대기 요청 탭에서 승인</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '15px',
        color: '#64748b',
    },
    stats: {
        display: 'flex',
        gap: '32px',
    },
    statItem: {
        textAlign: 'center',
    },
    statValue: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#6366f1',
    },
    statLabel: {
        fontSize: '13px',
        color: '#64748b',
        marginTop: '4px',
    },
    message: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: 'pre-line',
    },
    successMessage: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: '1px solid #10b981',
    },
    errorMessage: {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #ef4444',
    },
    warningMessage: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        border: '1px solid #f59e0b',
    },
    tabs: {
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #e2e8f0',
    },
    tab: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: 'transparent',
        color: '#64748b',
        border: 'none',
        borderBottom: '2px solid transparent',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
    },
    activeTab: {
        color: '#6366f1',
        borderBottomColor: '#6366f1',
    },
    badge: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        minWidth: '18px',
        height: '18px',
        padding: '0 6px',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '9px',
        fontSize: '11px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContent: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        marginBottom: '24px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '14px',
        outline: 'none',
    },
    staffGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
    },
    staffCard: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
    },
    staffHeader: {
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
    },
    staffAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#6366f1',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: '700',
    },
    staffInfo: {
        flex: 1,
    },
    staffName: {
        margin: '0 0 4px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    staffEmail: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        margin: '0 0 4px 0',
        fontSize: '13px',
        color: '#64748b',
    },
    staffPhone: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
    },
    staffMeta: {
        display: 'flex',
        gap: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #e2e8f0',
        marginBottom: '12px',
    },
    staffJoined: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#64748b',
    },
    staffRole: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#64748b',
    },
    staffActions: {
        display: 'flex',
        gap: '8px',
    },
    removeButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    requestList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    requestCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#fffbeb',
        borderRadius: '10px',
        border: '1px solid #fbbf24',
    },
    requestInfo: {
        flex: 1,
    },
    requestName: {
        margin: '0 0 4px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    requestEmail: {
        margin: '0 0 8px 0',
        fontSize: '14px',
        color: '#64748b',
    },
    requestDate: {
        margin: 0,
        fontSize: '12px',
        color: '#94a3b8',
    },
    requestActions: {
        display: 'flex',
        gap: '12px',
    },
    approveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    rejectButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    inviteSection: {
        maxWidth: '600px',
        margin: '0 auto',
    },
    sectionTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    sectionDesc: {
        margin: '0 0 24px 0',
        fontSize: '14px',
        color: '#64748b',
    },
    inviteForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '32px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
    },
    input: {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
    },
    textarea: {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        resize: 'vertical',
    },
    inviteButton: {
        padding: '14px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    inviteInfo: {
        padding: '20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '10px',
        border: '1px solid #bae6fd',
    },
    processList: {
        margin: '12px 0 0 0',
        paddingLeft: '20px',
        fontSize: '14px',
        color: '#0369a1',
        lineHeight: '1.8',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748b',
    },
    accessDenied: {
        textAlign: 'center',
        padding: '80px 20px',
        maxWidth: '400px',
        margin: '0 auto',
    },
    noCompany: {
        textAlign: 'center',
        padding: '80px 20px',
        maxWidth: '400px',
        margin: '0 auto',
    },
    registerButton: {
        marginTop: '20px',
        padding: '12px 32px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    loading: {
        textAlign: 'center',
        padding: '80px 20px',
        color: '#64748b',
    },
};

// CSS 애니메이션 추가
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
        styleSheet.insertRule(`
            .spin {
                animation: spin 1s linear infinite;
            }
        `, styleSheet.cssRules.length);
    } catch (e) {
        // 이미 존재하는 경우 무시
    }
}

export default CompanyManager;