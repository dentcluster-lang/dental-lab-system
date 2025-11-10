import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db, storage } from '../firebase/config';
import {
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    FileText,
    Lock,
    Key,
    Edit2,
    Save,
    X,
    Upload,
    Image as ImageIcon,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Stethoscope,
    Microscope,
    Shield,
    Trash2,
    Megaphone
} from 'lucide-react';
import './Profile.css';

function Profile({ user }) {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // 🔥 기공소 홍보 관리 PIN 확인용 상태
    const [showLabAdvertisingPinCheck, setShowLabAdvertisingPinCheck] = useState(false);
    const [labAdvertisingPin, setLabAdvertisingPin] = useState('');
    const [labAdvertisingPinError, setLabAdvertisingPinError] = useState('');

    // 편집 가능한 데이터
    const [editData, setEditData] = useState({
        name: '',
        phone: '',
        businessName: '',
        businessNumber: '',
        address: '',
        businessType: ''
    });

    // 인감 이미지
    const [sealImage, setSealImage] = useState(null);
    const [sealPreview, setSealPreview] = useState(null);
    const [uploadingSeal, setUploadingSeal] = useState(false);

    // 비밀번호 변경
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // 🔒 PIN 설정 개선
    const [showPinManager, setShowPinManager] = useState(false);
    const [pinMode, setPinMode] = useState(''); // 'set', 'change', 'remove'
    const [pinForm, setPinForm] = useState({
        currentPin: '',
        newPin: '',
        confirmPin: ''
    });
    const [showPinFields, setShowPinFields] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // 메시지
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // 자동 메시지 숨김
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // 사용자 데이터 로드
    const loadUserData = async () => {
        if (!user) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                setUserData(data);
                setEditData({
                    name: data.name || '',
                    phone: data.phone || '',
                    businessName: data.businessName || '',
                    businessNumber: data.businessNumber || '',
                    address: data.address || '',
                    businessType: data.businessType || ''
                });
                setSealPreview(data.sealImageUrl || null);

                console.log('📋 Profile.js - 사용자 데이터:', {
                    userType: data.userType,
                    businessType: data.businessType,
                    companyBusinessType: data.companyBusinessType,
                    businessName: data.businessName,
                    hasPin: !!data.pin
                });
            }
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
            showError('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 메시지 헬퍼
    const showSuccess = (message) => {
        setSuccessMessage(message);
        setErrorMessage('');
    };

    const showError = (message) => {
        setErrorMessage(message);
        setSuccessMessage('');
    };

    // 프로필 정보 저장
    const handleSaveProfile = async () => {
        setSaving(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            let sealImageUrl = userData?.sealImageUrl || null;

            // 인감 이미지 업로드
            if (sealImage) {
                setUploadingSeal(true);
                const sealRef = ref(storage, `seals/${user.uid}/${Date.now()}_${sealImage.name}`);
                await uploadBytes(sealRef, sealImage);
                sealImageUrl = await getDownloadURL(sealRef);
                setUploadingSeal(false);
            }

            // Firestore 업데이트
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                name: editData.name,
                phone: editData.phone,
                businessName: editData.businessName,
                businessNumber: editData.businessNumber,
                address: editData.address,
                businessType: editData.businessType,
                sealImageUrl: sealImageUrl,
                updatedAt: new Date().toISOString()
            });

            // 로컬 상태 업데이트
            await loadUserData();
            setEditMode(false);
            setSealImage(null);
            showSuccess('프로필이 저장되었습니다.');
        } catch (error) {
            console.error('프로필 저장 실패:', error);
            showError('프로필 저장에 실패했습니다.');
        } finally {
            setSaving(false);
            setUploadingSeal(false);
        }
    };

    // 비밀번호 변경
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            showError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(
                auth.currentUser.email,
                passwordForm.currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, passwordForm.newPassword);

            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setShowPasswordChange(false);
            showSuccess('비밀번호가 변경되었습니다.');
        } catch (error) {
            console.error('비밀번호 변경 실패:', error);
            if (error.code === 'auth/wrong-password') {
                showError('현재 비밀번호가 올바르지 않습니다.');
            } else {
                showError('비밀번호 변경에 실패했습니다.');
            }
        }
    };

    // 🔒 PIN 설정 시작
    const startPinSetup = (mode) => {
        setPinMode(mode);
        setShowPinManager(true);
        setPinForm({
            currentPin: '',
            newPin: '',
            confirmPin: ''
        });
        setShowPinFields({
            current: false,
            new: false,
            confirm: false
        });
    };

    // 🔒 PIN 설정/변경/삭제
    const handlePinAction = async () => {
        setErrorMessage('');

        // PIN 설정
        if (pinMode === 'set') {
            if (pinForm.newPin.length !== 4 || !/^\d+$/.test(pinForm.newPin)) {
                showError('PIN은 4자리 숫자여야 합니다.');
                return;
            }
            if (pinForm.newPin !== pinForm.confirmPin) {
                showError('PIN이 일치하지 않습니다.');
                return;
            }

            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    pin: pinForm.newPin,
                    pinUpdatedAt: new Date().toISOString()
                });
                await loadUserData();
                setShowPinManager(false);
                showSuccess('PIN이 설정되었습니다.');
            } catch (error) {
                console.error('PIN 설정 실패:', error);
                showError('PIN 설정에 실패했습니다.');
            }
        }

        // PIN 변경
        else if (pinMode === 'change') {
            if (pinForm.currentPin !== userData.pin) {
                showError('현재 PIN이 올바르지 않습니다.');
                return;
            }
            if (pinForm.newPin.length !== 4 || !/^\d+$/.test(pinForm.newPin)) {
                showError('새 PIN은 4자리 숫자여야 합니다.');
                return;
            }
            if (pinForm.newPin !== pinForm.confirmPin) {
                showError('새 PIN이 일치하지 않습니다.');
                return;
            }

            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    pin: pinForm.newPin,
                    pinUpdatedAt: new Date().toISOString()
                });
                await loadUserData();
                setShowPinManager(false);
                showSuccess('PIN이 변경되었습니다.');
            } catch (error) {
                console.error('PIN 변경 실패:', error);
                showError('PIN 변경에 실패했습니다.');
            }
        }

        // PIN 삭제
        else if (pinMode === 'remove') {
            if (pinForm.currentPin !== userData.pin) {
                showError('현재 PIN이 올바르지 않습니다.');
                return;
            }

            if (!window.confirm('PIN을 삭제하시겠습니까? 설정 메뉴 접근 시 보안 기능이 해제됩니다.')) {
                return;
            }

            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    pin: null,
                    pinUpdatedAt: new Date().toISOString()
                });
                await loadUserData();
                setShowPinManager(false);
                showSuccess('PIN이 삭제되었습니다.');
            } catch (error) {
                console.error('PIN 삭제 실패:', error);
                showError('PIN 삭제에 실패했습니다.');
            }
        }
    };

    // 🔥 기공소 홍보 관리 - PIN 확인 시작
    const handleLabAdvertisingClick = () => {
        if (!userData?.pin) {
            showError('먼저 PIN을 설정해주세요.');
            return;
        }
        setShowLabAdvertisingPinCheck(true);
        setLabAdvertisingPin('');
        setLabAdvertisingPinError('');
    };

    // 🔥 기공소 홍보 관리 - PIN 확인 및 이동
    const verifyLabAdvertisingPin = () => {
        if (labAdvertisingPin !== userData.pin) {
            setLabAdvertisingPinError('PIN이 올바르지 않습니다.');
            return;
        }
        
        // PIN 확인 성공 - 기공소 홍보 페이지로 이동
        setShowLabAdvertisingPinCheck(false);
        navigate('/lab-advertising');
    };

    // 🔥 기공소 홍보 PIN 확인 모달 닫기
    const closeLabAdvertisingPinCheck = () => {
        setShowLabAdvertisingPinCheck(false);
        setLabAdvertisingPin('');
        setLabAdvertisingPinError('');
    };

    // 업체 유형 레이블
    const getBusinessTypeLabel = () => {
        const type = userData?.companyBusinessType || userData?.businessType;
        if (type === 'dental' || type === 'clinic') return '치과';
        if (type === 'lab') return '기공소';
        return '-';
    };

    // 인감 이미지 선택
    const handleSealImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // 파일 크기 체크 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                showError('파일 크기는 5MB를 초과할 수 없습니다.');
                return;
            }
            
            // 이미지 파일 타입 체크
            if (!file.type.startsWith('image/')) {
                showError('이미지 파일만 업로드할 수 있습니다.');
                return;
            }
            
            setSealImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setSealPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // 🔥 인감 이미지 독립적으로 저장
    const handleSaveSealImage = async () => {
        if (!sealImage) {
            showError('업로드할 이미지를 선택해주세요.');
            return;
        }

        try {
            setUploadingSeal(true);
            setErrorMessage('');
            setSuccessMessage('');

            // Firebase Storage에 업로드
            const sealRef = ref(storage, `seals/${user.uid}/${Date.now()}_${sealImage.name}`);
            await uploadBytes(sealRef, sealImage);
            const sealImageUrl = await getDownloadURL(sealRef);

            // Firestore 업데이트
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                sealImageUrl: sealImageUrl,
                updatedAt: new Date().toISOString()
            });

            // 상태 업데이트
            await loadUserData();
            setSealImage(null);
            setSealPreview(null);
            showSuccess('인감 이미지가 저장되었습니다.');
        } catch (error) {
            console.error('인감 이미지 저장 실패:', error);
            showError('인감 이미지 저장에 실패했습니다.');
        } finally {
            setUploadingSeal(false);
        }
    };

    // 🔥 인감 이미지 삭제
    const handleDeleteSealImage = async () => {
        if (!window.confirm('인감 이미지를 삭제하시겠습니까?')) {
            return;
        }

        try {
            setSaving(true);
            setErrorMessage('');
            setSuccessMessage('');

            // Firestore 업데이트 (URL만 null로)
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                sealImageUrl: null,
                updatedAt: new Date().toISOString()
            });

            // 상태 업데이트
            await loadUserData();
            setSealPreview(null);
            showSuccess('인감 이미지가 삭제되었습니다.');
        } catch (error) {
            console.error('인감 이미지 삭제 실패:', error);
            showError('인감 이미지 삭제에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="loading">로딩 중...</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>
                    <User size={28} />
                    프로필
                </h1>
            </div>

            {/* 메시지 */}
            {successMessage && (
                <div className="message success">
                    <CheckCircle size={18} />
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="message error">
                    <AlertCircle size={18} />
                    {errorMessage}
                </div>
            )}

            <div className="profile-content">
                {/* 기본 정보 */}
                {userData && (
                    <>
                        <div className="profile-section">
                            <div className="section-header">
                                <h2>
                                    <User size={20} />
                                    기본 정보
                                </h2>
                                {!editMode ? (
                                    <button onClick={() => setEditMode(true)} className="edit-btn">
                                        <Edit2 size={16} />
                                        수정
                                    </button>
                                ) : (
                                    <button onClick={() => setEditMode(false)} className="edit-btn">
                                        <X size={16} />
                                        취소
                                    </button>
                                )}
                            </div>

                            <div className="info-grid">
                                <div className="info-item">
                                    <label>
                                        <Mail size={14} />
                                        이메일
                                    </label>
                                    <div className="info-value readonly">{user?.email}</div>
                                </div>

                                <div className="info-item">
                                    <label>
                                        <User size={14} />
                                        이름 <span className="required">*</span>
                                    </label>
                                    {editMode ? (
                                        <input
                                            type="text"
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        />
                                    ) : (
                                        <div className="info-value">{userData.name || '-'}</div>
                                    )}
                                </div>

                                <div className="info-item">
                                    <label>
                                        <Phone size={14} />
                                        전화번호
                                    </label>
                                    {editMode ? (
                                        <input
                                            type="tel"
                                            value={editData.phone}
                                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                        />
                                    ) : (
                                        <div className="info-value">{userData.phone || '-'}</div>
                                    )}
                                </div>

                                {/* 업체 정보는 개인 회원이 아닐 때만 */}
                                {userData.userType !== 'individual' && (
                                    <>
                                        <div className="info-item">
                                            <label>
                                                <Building2 size={14} />
                                                업체명 <span className="required">*</span>
                                            </label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    value={editData.businessName}
                                                    onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                                                />
                                            ) : (
                                                <div className="info-value">{userData.businessName || '-'}</div>
                                            )}
                                        </div>

                                        <div className="info-item">
                                            <label>
                                                <FileText size={14} />
                                                사업자 번호
                                            </label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    value={editData.businessNumber}
                                                    onChange={(e) => setEditData({ ...editData, businessNumber: e.target.value })}
                                                />
                                            ) : (
                                                <div className="info-value">{userData.businessNumber || '-'}</div>
                                            )}
                                        </div>

                                        <div className="info-item full-width">
                                            <label>
                                                <MapPin size={14} />
                                                주소
                                            </label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    value={editData.address}
                                                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                                />
                                            ) : (
                                                <div className="info-value">{userData.address || '-'}</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {editMode && (
                                <div className="action-buttons">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving || uploadingSeal}
                                        className="save-btn"
                                    >
                                        <Save size={16} />
                                        {saving || uploadingSeal ? '저장 중...' : '저장'}
                                    </button>
                                    <button
                                        onClick={() => setEditMode(false)}
                                        disabled={saving || uploadingSeal}
                                        className="cancel-btn"
                                    >
                                        <X size={16} />
                                        취소
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 인감 이미지 (업체만) */}
                        {userData.userType !== 'individual' && (
                            <div className="profile-section">
                                <div className="section-header">
                                    <h2>
                                        <ImageIcon size={20} />
                                        인감 이미지
                                    </h2>
                                    <p style={{ 
                                        fontSize: '14px', 
                                        color: '#64748b',
                                        marginTop: '4px',
                                        fontWeight: 'normal'
                                    }}>
                                        거래명세서에 사용되는 인감 이미지를 등록하세요
                                    </p>
                                </div>

                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    gap: '20px'
                                }}>
                                    {/* 현재 저장된 인감 이미지 또는 새로 선택한 이미지 */}
                                    <div style={{
                                        width: '100%',
                                        maxWidth: '300px',
                                        padding: '20px',
                                        border: '2px dashed #cbd5e1',
                                        borderRadius: '12px',
                                        backgroundColor: '#f8fafc',
                                        textAlign: 'center'
                                    }}>
                                        {(sealPreview || userData.sealImageUrl) ? (
                                            <div style={{ position: 'relative' }}>
                                                <img
                                                    src={sealPreview || userData.sealImageUrl}
                                                    alt="인감"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '200px',
                                                        objectFit: 'contain',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                {sealPreview && (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        padding: '8px 12px',
                                                        backgroundColor: '#dbeafe',
                                                        border: '1px solid #93c5fd',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        color: '#1e40af'
                                                    }}>
                                                        ✨ 새로 선택된 이미지 (저장 필요)
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ 
                                                padding: '40px 20px',
                                                color: '#94a3b8'
                                            }}>
                                                <ImageIcon size={48} style={{ marginBottom: '12px' }} />
                                                <p style={{ fontSize: '14px', margin: 0 }}>
                                                    인감 이미지가 없습니다
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 버튼 영역 */}
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '12px',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        width: '100%'
                                    }}>
                                        {/* 파일 선택 버튼 */}
                                        <label style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            backgroundColor: '#6366f1',
                                            color: 'white',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            border: 'none'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                                        >
                                            <Upload size={18} />
                                            {userData.sealImageUrl || sealPreview ? '다른 이미지 선택' : '이미지 선택'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleSealImageChange}
                                                style={{ display: 'none' }}
                                            />
                                        </label>

                                        {/* 저장 버튼 (이미지 선택 시에만) */}
                                        {sealImage && (
                                            <button
                                                onClick={handleSaveSealImage}
                                                disabled={uploadingSeal}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '12px 24px',
                                                    backgroundColor: uploadingSeal ? '#94a3b8' : '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: uploadingSeal ? 'not-allowed' : 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!uploadingSeal) e.currentTarget.style.backgroundColor = '#059669';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!uploadingSeal) e.currentTarget.style.backgroundColor = '#10b981';
                                                }}
                                            >
                                                <Save size={18} />
                                                {uploadingSeal ? '저장 중...' : '저장'}
                                            </button>
                                        )}

                                        {/* 삭제 버튼 (저장된 이미지가 있을 때만) */}
                                        {userData.sealImageUrl && !sealImage && (
                                            <button
                                                onClick={handleDeleteSealImage}
                                                disabled={saving}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '12px 24px',
                                                    backgroundColor: 'transparent',
                                                    color: '#ef4444',
                                                    border: '2px solid #ef4444',
                                                    borderRadius: '8px',
                                                    cursor: saving ? 'not-allowed' : 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!saving) {
                                                        e.currentTarget.style.backgroundColor = '#ef4444';
                                                        e.currentTarget.style.color = 'white';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!saving) {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = '#ef4444';
                                                    }
                                                }}
                                            >
                                                <Trash2 size={18} />
                                                삭제
                                            </button>
                                        )}
                                    </div>

                                    {/* 안내 메시지 */}
                                    <div style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#0369a1',
                                        lineHeight: '1.5'
                                    }}>
                                        💡 <strong>권장사항:</strong> PNG 또는 JPG 형식, 배경이 투명한 이미지를 권장합니다. (최대 5MB)
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* 직원 소속 정보 (직원만) */}
                {userData && userData.userType === 'staff' && (
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>
                                <Building2 size={20} />
                                소속 정보
                            </h2>
                        </div>

                        <div className="info-grid">
                            <div className="info-item">
                                <label>
                                    <Building2 size={14} />
                                    소속 업체
                                </label>
                                <div className="info-value readonly">{userData?.businessName || '-'}</div>
                            </div>

                            <div className="info-item">
                                <label>
                                    {userData?.companyBusinessType === 'dental' ? <Stethoscope size={14} /> : <Microscope size={14} />}
                                    업체 유형
                                </label>
                                <div className="info-value readonly">
                                    {getBusinessTypeLabel()}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#16a34a'
                        }}>
                            <strong>안내:</strong> 직원은 소속 업체의 주문, 거래내역 등을 함께 관리할 수 있습니다.
                        </div>
                    </div>
                )}

                {/* 🎨 기공소 홍보 프로필 (기공소 본인만) */}
                {userData && userData.businessType === 'lab' && !userData.companyId && (
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>
                                <Megaphone size={20} />
                                기공소 홍보 프로필
                            </h2>
                            <p style={{ 
                                fontSize: '14px', 
                                color: '#64748b',
                                marginTop: '4px',
                                fontWeight: 'normal'
                            }}>
                                기공소 찾기에 표시되는 홍보 정보입니다
                            </p>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            {/* 소개글 */}
                            <div style={{
                                marginBottom: '24px',
                                padding: '16px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    marginBottom: '8px'
                                }}>
                                    소개글
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#1e293b',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {userData.labAdvertising?.introduction || '아직 소개글이 없습니다.'}
                                </div>
                            </div>

                            {/* 전문분야 */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    marginBottom: '12px'
                                }}>
                                    전문 분야
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    {userData.labAdvertising?.specialties && userData.labAdvertising.specialties.length > 0 ? (
                                        userData.labAdvertising.specialties.map((specialty, index) => (
                                            <span
                                                key={index}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#eef2ff',
                                                    color: '#4f46e5',
                                                    borderRadius: '16px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    border: '1px solid #c7d2fe'
                                                }}
                                            >
                                                {specialty}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                                            전문 분야가 설정되지 않았습니다.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 포트폴리오 */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    marginBottom: '12px'
                                }}>
                                    포트폴리오
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {userData.labAdvertising?.portfolioImages && userData.labAdvertising.portfolioImages.length > 0 ? (
                                        userData.labAdvertising.portfolioImages.map((image, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    position: 'relative',
                                                    paddingBottom: '100%',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: '2px solid #e2e8f0',
                                                    backgroundColor: '#f1f5f9'
                                                }}
                                            >
                                                <img
                                                    src={image}
                                                    alt={`포트폴리오 ${index + 1}`}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <span style={{ 
                                            fontSize: '14px', 
                                            color: '#94a3b8',
                                            gridColumn: '1 / -1'
                                        }}>
                                            포트폴리오 이미지가 없습니다.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 수정 버튼 */}
                            {userData.pin ? (
                                <button
                                    onClick={handleLabAdvertisingClick}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        backgroundColor: '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                                >
                                    <Megaphone size={18} />
                                    홍보 정보 수정하기
                                </button>
                            ) : (
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #fde047',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    color: '#92400e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <AlertCircle size={18} />
                                    <div>
                                        <strong>홍보 정보를 수정하려면 PIN을 먼저 설정해주세요.</strong>
                                        <div style={{ fontSize: '13px', marginTop: '4px' }}>
                                            보안 설정 섹션에서 PIN을 설정할 수 있습니다.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 🔒 보안 설정 */}
                <div className="profile-section">
                    <div className="section-header">
                        <h2>
                            <Lock size={20} />
                            보안 설정
                        </h2>
                    </div>

                    <div className="security-options">
                        <button
                            onClick={() => setShowPasswordChange(!showPasswordChange)}
                            className="security-btn"
                        >
                            <Lock size={20} />
                            비밀번호 변경
                        </button>

                        {/* 🔒 PIN 상태에 따른 버튼 */}
                        {!userData?.pin ? (
                            <button
                                onClick={() => startPinSetup('set')}
                                className="security-btn"
                                style={{ 
                                    borderColor: '#10b981',
                                    color: '#10b981'
                                }}
                            >
                                <Shield size={20} />
                                PIN 설정하기
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => startPinSetup('change')}
                                    className="security-btn"
                                    style={{ 
                                        borderColor: '#f59e0b',
                                        color: '#f59e0b'
                                    }}
                                >
                                    <Key size={20} />
                                    PIN 변경
                                </button>
                                <button
                                    onClick={() => startPinSetup('remove')}
                                    className="security-btn"
                                    style={{ 
                                        borderColor: '#ef4444',
                                        color: '#ef4444'
                                    }}
                                >
                                    <Trash2 size={20} />
                                    PIN 삭제
                                </button>
                            </>
                        )}
                    </div>

                    {/* 🔒 PIN 상태 표시 */}
                    {userData?.pin && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <CheckCircle size={16} />
                            <strong>PIN이 설정되어 있습니다.</strong> 설정 메뉴 접근 시 PIN이 필요합니다.
                        </div>
                    )}

                    {/* 비밀번호 변경 폼 */}
                    {showPasswordChange && (
                        <form onSubmit={handlePasswordChange} className="change-form">
                            <h3>비밀번호 변경</h3>

                            <div className="form-group">
                                <label>현재 비밀번호</label>
                                <div className="pin-input-container">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="toggle-visibility"
                                    >
                                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>새 비밀번호</label>
                                <div className="pin-input-container">
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        className="toggle-visibility"
                                    >
                                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>새 비밀번호 확인</label>
                                <div className="pin-input-container">
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="toggle-visibility"
                                    >
                                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="submit-btn">
                                비밀번호 변경
                            </button>
                        </form>
                    )}

                    {/* 🔒 PIN 관리 폼 */}
                    {showPinManager && (
                        <div className="change-form">
                            <h3>
                                {pinMode === 'set' && 'PIN 설정'}
                                {pinMode === 'change' && 'PIN 변경'}
                                {pinMode === 'remove' && 'PIN 삭제'}
                            </h3>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                                {pinMode === 'set' && '중요한 기능 접근 시 사용할 4자리 숫자를 설정하세요.'}
                                {pinMode === 'change' && '현재 PIN을 입력하고 새로운 PIN을 설정하세요.'}
                                {pinMode === 'remove' && '현재 PIN을 입력하여 삭제를 확인하세요.'}
                            </p>

                            {/* 현재 PIN (변경/삭제 시) */}
                            {(pinMode === 'change' || pinMode === 'remove') && (
                                <div className="form-group">
                                    <label>현재 PIN</label>
                                    <div className="pin-input-container">
                                        <input
                                            type={showPinFields.current ? 'text' : 'password'}
                                            value={pinForm.currentPin}
                                            onChange={(e) => setPinForm({
                                                ...pinForm,
                                                currentPin: e.target.value.replace(/\D/g, '').slice(0, 4)
                                            })}
                                            placeholder="0000"
                                            maxLength={4}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPinFields({ ...showPinFields, current: !showPinFields.current })}
                                            className="toggle-visibility"
                                        >
                                            {showPinFields.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 새 PIN (설정/변경 시) */}
                            {(pinMode === 'set' || pinMode === 'change') && (
                                <>
                                    <div className="form-group">
                                        <label>새 PIN (4자리)</label>
                                        <div className="pin-input-container">
                                            <input
                                                type={showPinFields.new ? 'text' : 'password'}
                                                value={pinForm.newPin}
                                                onChange={(e) => setPinForm({
                                                    ...pinForm,
                                                    newPin: e.target.value.replace(/\D/g, '').slice(0, 4)
                                                })}
                                                placeholder="0000"
                                                maxLength={4}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPinFields({ ...showPinFields, new: !showPinFields.new })}
                                                className="toggle-visibility"
                                            >
                                                {showPinFields.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>PIN 확인</label>
                                        <div className="pin-input-container">
                                            <input
                                                type={showPinFields.confirm ? 'text' : 'password'}
                                                value={pinForm.confirmPin}
                                                onChange={(e) => setPinForm({
                                                    ...pinForm,
                                                    confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4)
                                                })}
                                                placeholder="0000"
                                                maxLength={4}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPinFields({ ...showPinFields, confirm: !showPinFields.confirm })}
                                                className="toggle-visibility"
                                            >
                                                {showPinFields.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button 
                                    onClick={() => setShowPinManager(false)}
                                    className="submit-btn"
                                    style={{ background: '#e8e8e8', color: '#555' }}
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={handlePinAction}
                                    className="submit-btn"
                                    style={{
                                        background: pinMode === 'remove' ? '#ef4444' : 
                                                    pinMode === 'change' ? '#f59e0b' : '#10b981'
                                    }}
                                >
                                    {pinMode === 'set' && 'PIN 설정'}
                                    {pinMode === 'change' && 'PIN 변경'}
                                    {pinMode === 'remove' && 'PIN 삭제'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 🔥 기공소 홍보 관리 PIN 확인 모달 */}
                    {showLabAdvertisingPinCheck && (
                        <div className="change-form">
                            <h3 style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                color: '#6366f1'
                            }}>
                                <Megaphone size={20} />
                                기공소 홍보 관리
                            </h3>
                            <p style={{ 
                                fontSize: '14px', 
                                color: '#64748b',
                                marginBottom: '20px'
                            }}>
                                기공소 홍보 정보를 수정하려면 PIN을 입력해주세요.
                            </p>

                            <div className="form-group">
                                <label>PIN 입력</label>
                                <input
                                    type="password"
                                    value={labAdvertisingPin}
                                    onChange={(e) => {
                                        setLabAdvertisingPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                        setLabAdvertisingPinError('');
                                    }}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            verifyLabAdvertisingPin();
                                        }
                                    }}
                                    placeholder="4자리 PIN"
                                    maxLength={4}
                                    autoFocus
                                    style={{
                                        borderColor: labAdvertisingPinError ? '#ef4444' : undefined
                                    }}
                                />
                                {labAdvertisingPinError && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        backgroundColor: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        color: '#dc2626',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <AlertCircle size={14} />
                                        {labAdvertisingPinError}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button 
                                    onClick={closeLabAdvertisingPinCheck}
                                    className="submit-btn"
                                    style={{ background: '#e8e8e8', color: '#555' }}
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={verifyLabAdvertisingPin}
                                    className="submit-btn"
                                    style={{ background: '#6366f1' }}
                                    disabled={labAdvertisingPin.length !== 4}
                                >
                                    <Megaphone size={16} />
                                    홍보 관리하기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;