import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Lock, Eye, EyeOff, Check, AlertCircle, Shield } from 'lucide-react';
import './PinManager.css';

function PinManager({ user, userData, onPinUpdate }) {
    const [hasPin, setHasPin] = useState(false);
    const [showSetupPin, setShowSetupPin] = useState(false);
    const [showChangePin, setShowChangePin] = useState(false);
    
    // PIN 설정 state
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    
    // PIN 변경 state
    const [currentPin, setCurrentPin] = useState('');
    const [showCurrentPin, setShowCurrentPin] = useState(false);
    const [changeNewPin, setChangeNewPin] = useState('');
    const [changeConfirmPin, setChangeConfirmPin] = useState('');
    const [showChangeNewPin, setShowChangeNewPin] = useState(false);
    const [showChangeConfirmPin, setShowChangeConfirmPin] = useState(false);
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkPinStatus();
    }, [userData]);

    // PIN 설정 여부 확인
    const checkPinStatus = async () => {
        try {
            const targetId = userData?.companyId || user?.uid;
            if (!targetId) return;

            const userDoc = await getDoc(doc(db, 'users', targetId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setHasPin(!!data.pin);
            }
        } catch (error) {
            console.error('PIN 상태 확인 실패:', error);
        }
    };

    // PIN 설정
    const handleSetupPin = async () => {
        setError('');
        setSuccess('');

        // 유효성 검사
        if (!newPin || !confirmPin) {
            setError('모든 필드를 입력해주세요.');
            return;
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            setError('PIN은 4자리 숫자여야 합니다.');
            return;
        }

        if (newPin !== confirmPin) {
            setError('PIN이 일치하지 않습니다.');
            return;
        }

        try {
            setLoading(true);
            const targetId = userData?.companyId || user?.uid;
            
            await updateDoc(doc(db, 'users', targetId), {
                pin: newPin,
                pinUpdatedAt: new Date().toISOString()
            });

            setSuccess('PIN이 성공적으로 설정되었습니다.');
            setHasPin(true);
            setShowSetupPin(false);
            setNewPin('');
            setConfirmPin('');
            
            if (onPinUpdate) {
                onPinUpdate();
            }

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('PIN 설정 실패:', error);
            setError('PIN 설정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // PIN 변경
    const handleChangePin = async () => {
        setError('');
        setSuccess('');

        // 유효성 검사
        if (!currentPin || !changeNewPin || !changeConfirmPin) {
            setError('모든 필드를 입력해주세요.');
            return;
        }

        if (changeNewPin.length !== 4 || !/^\d{4}$/.test(changeNewPin)) {
            setError('새 PIN은 4자리 숫자여야 합니다.');
            return;
        }

        if (changeNewPin !== changeConfirmPin) {
            setError('새 PIN이 일치하지 않습니다.');
            return;
        }

        if (currentPin === changeNewPin) {
            setError('현재 PIN과 다른 PIN을 설정해주세요.');
            return;
        }

        try {
            setLoading(true);
            const targetId = userData?.companyId || user?.uid;
            
            // 현재 PIN 확인
            const userDoc = await getDoc(doc(db, 'users', targetId));
            if (!userDoc.exists()) {
                setError('사용자 정보를 찾을 수 없습니다.');
                return;
            }

            const currentUserPin = userDoc.data().pin;
            if (currentPin !== currentUserPin) {
                setError('현재 PIN이 올바르지 않습니다.');
                return;
            }

            // PIN 변경
            await updateDoc(doc(db, 'users', targetId), {
                pin: changeNewPin,
                pinUpdatedAt: new Date().toISOString()
            });

            setSuccess('PIN이 성공적으로 변경되었습니다.');
            setShowChangePin(false);
            setCurrentPin('');
            setChangeNewPin('');
            setChangeConfirmPin('');
            
            if (onPinUpdate) {
                onPinUpdate();
            }

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('PIN 변경 실패:', error);
            setError('PIN 변경에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // PIN 삭제
    const handleDeletePin = async () => {
        if (!window.confirm('PIN을 삭제하시겠습니까? 설정 메뉴 보호가 해제됩니다.')) {
            return;
        }

        try {
            setLoading(true);
            const targetId = userData?.companyId || user?.uid;
            
            await updateDoc(doc(db, 'users', targetId), {
                pin: null,
                pinUpdatedAt: new Date().toISOString()
            });

            setSuccess('PIN이 삭제되었습니다.');
            setHasPin(false);
            
            if (onPinUpdate) {
                onPinUpdate();
            }

            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('PIN 삭제 실패:', error);
            setError('PIN 삭제에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pin-manager">
            <div className="pin-manager-header">
                <div className="pin-header-icon">
                    <Shield size={24} />
                </div>
                <div className="pin-header-text">
                    <h3>보안 PIN 관리</h3>
                    <p>설정 메뉴 접근을 위한 4자리 PIN 번호를 관리합니다.</p>
                </div>
            </div>

            {/* 성공/에러 메시지 */}
            {success && (
                <div className="pin-message success">
                    <Check size={18} />
                    <span>{success}</span>
                </div>
            )}

            {error && (
                <div className="pin-message error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* PIN 상태 표시 */}
            <div className="pin-status">
                <div className="pin-status-info">
                    <Lock size={20} />
                    <div>
                        <div className="pin-status-label">PIN 상태</div>
                        <div className={`pin-status-value ${hasPin ? 'active' : 'inactive'}`}>
                            {hasPin ? '설정됨' : '미설정'}
                        </div>
                    </div>
                </div>
            </div>

            {/* PIN이 없을 때 - 설정 */}
            {!hasPin && (
                <div className="pin-section">
                    {!showSetupPin ? (
                        <button 
                            className="btn-pin-setup"
                            onClick={() => setShowSetupPin(true)}
                        >
                            <Lock size={18} />
                            PIN 설정하기
                        </button>
                    ) : (
                        <div className="pin-form">
                            <h4>PIN 설정</h4>
                            
                            <div className="form-group">
                                <label>새 PIN (4자리 숫자)</label>
                                <div className="pin-input-wrapper">
                                    <input
                                        type={showNewPin ? "text" : "password"}
                                        className="pin-input-field"
                                        placeholder="••••"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-pin"
                                        onClick={() => setShowNewPin(!showNewPin)}
                                    >
                                        {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>PIN 확인</label>
                                <div className="pin-input-wrapper">
                                    <input
                                        type={showConfirmPin ? "text" : "password"}
                                        className="pin-input-field"
                                        placeholder="••••"
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSetupPin();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-pin"
                                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                                    >
                                        {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pin-form-actions">
                                <button
                                    className="btn-pin-cancel"
                                    onClick={() => {
                                        setShowSetupPin(false);
                                        setNewPin('');
                                        setConfirmPin('');
                                        setError('');
                                    }}
                                    disabled={loading}
                                >
                                    취소
                                </button>
                                <button
                                    className="btn-pin-submit"
                                    onClick={handleSetupPin}
                                    disabled={loading || !newPin || !confirmPin}
                                >
                                    {loading ? '설정 중...' : 'PIN 설정'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* PIN이 있을 때 - 변경/삭제 */}
            {hasPin && (
                <div className="pin-section">
                    {!showChangePin ? (
                        <div className="pin-actions">
                            <button 
                                className="btn-pin-change"
                                onClick={() => setShowChangePin(true)}
                            >
                                <Lock size={18} />
                                PIN 변경
                            </button>
                            <button 
                                className="btn-pin-delete"
                                onClick={handleDeletePin}
                                disabled={loading}
                            >
                                PIN 삭제
                            </button>
                        </div>
                    ) : (
                        <div className="pin-form">
                            <h4>PIN 변경</h4>
                            
                            <div className="form-group">
                                <label>현재 PIN</label>
                                <div className="pin-input-wrapper">
                                    <input
                                        type={showCurrentPin ? "text" : "password"}
                                        className="pin-input-field"
                                        placeholder="••••"
                                        value={currentPin}
                                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-pin"
                                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                                    >
                                        {showCurrentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>새 PIN (4자리 숫자)</label>
                                <div className="pin-input-wrapper">
                                    <input
                                        type={showChangeNewPin ? "text" : "password"}
                                        className="pin-input-field"
                                        placeholder="••••"
                                        value={changeNewPin}
                                        onChange={(e) => setChangeNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-pin"
                                        onClick={() => setShowChangeNewPin(!showChangeNewPin)}
                                    >
                                        {showChangeNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>새 PIN 확인</label>
                                <div className="pin-input-wrapper">
                                    <input
                                        type={showChangeConfirmPin ? "text" : "password"}
                                        className="pin-input-field"
                                        placeholder="••••"
                                        value={changeConfirmPin}
                                        onChange={(e) => setChangeConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleChangePin();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-pin"
                                        onClick={() => setShowChangeConfirmPin(!showChangeConfirmPin)}
                                    >
                                        {showChangeConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pin-form-actions">
                                <button
                                    className="btn-pin-cancel"
                                    onClick={() => {
                                        setShowChangePin(false);
                                        setCurrentPin('');
                                        setChangeNewPin('');
                                        setChangeConfirmPin('');
                                        setError('');
                                    }}
                                    disabled={loading}
                                >
                                    취소
                                </button>
                                <button
                                    className="btn-pin-submit"
                                    onClick={handleChangePin}
                                    disabled={loading || !currentPin || !changeNewPin || !changeConfirmPin}
                                >
                                    {loading ? '변경 중...' : 'PIN 변경'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 안내 사항 */}
            <div className="pin-notice">
                <AlertCircle size={18} />
                <div>
                    <strong>안내:</strong>
                    <ul>
                        <li>PIN은 설정 메뉴 접근 시 필요합니다.</li>
                        <li>4자리 숫자로만 설정 가능합니다.</li>
                        <li>PIN을 잊어버린 경우 관리자에게 문의하세요.</li>
                        <li>보안을 위해 주기적으로 PIN을 변경하세요.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default PinManager;