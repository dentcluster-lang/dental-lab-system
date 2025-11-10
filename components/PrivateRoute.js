import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

/**
 * PrivateRoute - 페이지별 접근 권한 관리
 * 
 * @param {Object} props
 * @param {React.Component} props.children - 보호할 컴포넌트
 * @param {Object} props.user - 현재 사용자 정보
 * @param {Array} props.allowedTypes - 접근 허용 사용자 타입
 * @param {Array} props.allowedBusinessTypes - 접근 허용 업체 타입
 * @param {boolean} props.requireBusiness - 업체 등록 필수 여부
 * @param {boolean} props.ownerOnly - 오너만 접근 가능 여부
 */
function PrivateRoute({
    children,
    user,
    allowedTypes = [],
    allowedBusinessTypes = [],
    requireBusiness = false,
    ownerOnly = false
}) {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const [userData, setUserData] = useState(null);
    const [companyData, setCompanyData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthorization();
    }, [user]);

    const checkAuthorization = async () => {
        try {
            if (!user) {
                setIsAuthorized(false);
                setLoading(false);
                return;
            }

            // 사용자 데이터 가져오기
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                setIsAuthorized(false);
                setLoading(false);
                return;
            }

            const userInfo = userDoc.data();
            setUserData(userInfo);

            // 직원인 경우 회사 정보도 가져오기
            let companyInfo = null;
            if (userInfo.companyId) {
                const companyDoc = await getDoc(doc(db, 'users', userInfo.companyId));
                if (companyDoc.exists()) {
                    companyInfo = companyDoc.data();
                    setCompanyData(companyInfo);
                }
            }

            // 권한 체크
            let authorized = true;

            // 1. 오너 전용 페이지 체크
            if (ownerOnly && userInfo.companyId) {
                authorized = false;
            }

            // 2. 업체 등록 필수 체크
            if (requireBusiness) {
                const hasBusiness = userInfo.businessType || userInfo.companyId;
                if (!hasBusiness) {
                    authorized = false;
                }
            }

            // 3. 사용자 타입 체크
            if (allowedTypes.length > 0) {
                const userType = userInfo.userType || 'individual';
                if (!allowedTypes.includes(userType)) {
                    authorized = false;
                }
            }

            // 4. 업체 타입 체크
            if (allowedBusinessTypes.length > 0) {
                const businessType = userInfo.companyId
                    ? companyInfo?.businessType
                    : userInfo.businessType;

                if (!businessType || !allowedBusinessTypes.includes(businessType)) {
                    authorized = false;
                }
            }

            setIsAuthorized(authorized);
            console.log('권한 체크 결과:', {
                authorized,
                userType: userInfo.userType,
                businessType: userInfo.businessType,
                companyId: userInfo.companyId,
                ownerOnly,
                requireBusiness
            });

        } catch (error) {
            console.error('권한 체크 실패:', error);
            setIsAuthorized(false);
        } finally {
            setLoading(false);
        }
    };

    // 로딩 중
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>권한 확인 중...</p>
                </div>
            </div>
        );
    }

    // 권한 없음
    if (!isAuthorized) {
        return (
            <div style={styles.container}>
                <div style={styles.deniedBox}>
                    <div style={styles.iconWrapper}>
                        <Lock size={48} color="#ef4444" />
                    </div>
                    <h2 style={styles.title}>접근 권한 없음</h2>
                    <p style={styles.message}>
                        {getAccessDeniedMessage()}
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        style={styles.backButton}
                    >
                        이전 페이지로
                    </button>
                </div>
            </div>
        );
    }

    // 권한 있음 - 자식 컴포넌트 렌더링
    return children;

    // 접근 거부 메시지 생성
    function getAccessDeniedMessage() {
        if (!user) {
            return '로그인이 필요한 페이지입니다.';
        }

        if (ownerOnly && userData?.companyId) {
            return '이 페이지는 업체 대표만 접근할 수 있습니다.';
        }

        if (requireBusiness && !userData?.businessType && !userData?.companyId) {
            return '업체 등록 또는 직원 가입 후 이용 가능합니다.';
        }

        if (allowedBusinessTypes.length > 0) {
            const typeNames = allowedBusinessTypes.map(type => {
                if (type === 'dental' || type === 'clinic') return '치과';
                if (type === 'lab') return '기공소';
                return type;
            }).join(', ');
            return `이 페이지는 ${typeNames} 회원만 접근할 수 있습니다.`;
        }

        return '이 페이지에 접근할 권한이 없습니다.';
    }
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '20px',
    },
    loadingBox: {
        textAlign: 'center',
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
    loadingText: {
        fontSize: '16px',
        color: '#64748b',
    },
    deniedBox: {
        maxWidth: '400px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '48px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
    },
    iconWrapper: {
        width: '96px',
        height: '96px',
        margin: '0 auto 24px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        margin: '0 0 12px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
    },
    message: {
        margin: '0 0 32px 0',
        fontSize: '15px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    backButton: {
        padding: '14px 32px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

// 페이지별 권한 설정
export const RoutePermissions = {
    // 모든 사용자 접근 가능
    PUBLIC: {
        allowedTypes: [],
        requireBusiness: false,
    },

    // 업체 등록 필수
    BUSINESS_ONLY: {
        requireBusiness: true,
    },

    // 치과만 접근 가능
    DENTAL_ONLY: {
        allowedBusinessTypes: ['dental', 'clinic'],
        requireBusiness: true,
    },

    // 기공소만 접근 가능
    LAB_ONLY: {
        allowedBusinessTypes: ['lab'],
        requireBusiness: true,
    },

    // 오너만 접근 가능
    OWNER_ONLY: {
        ownerOnly: true,
        requireBusiness: true,
    },

    // 개인 회원 (업체 미등록)만 접근
    INDIVIDUAL_ONLY: {
        allowedTypes: ['individual'],
        requireBusiness: false,
    }
};

export default PrivateRoute;