import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import {
    LayoutDashboard, FileText, Calendar, Users,
    DollarSign, TrendingUp, Building2, LogOut, Menu, X,
    User, Package, Star, Briefcase, GraduationCap,
    ShoppingBag, MessageSquare, FilePlus, UserPlus,
    Megaphone, CheckCircle, Building, AlertCircle,
    Lock, Search, Shield, Recycle, Plus, Settings
} from 'lucide-react';
import './MainLayout.css';
import './PinModal.css';
import NotificationBell from './NotificationBell';

function MainLayout({ children, user, currentPage, refreshUserData }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userData, setUserData] = useState(null);
    const [companyData, setCompanyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 🔒 PIN 관련 상태
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinAuthenticated, setPinAuthenticated] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState(null);

    useEffect(() => {
        if (!user) return;

        // 🔥 사용자 데이터 실시간 동기화 (PIN 업데이트 즉시 반영)
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
            if (docSnap.exists()) {
                const userInfo = docSnap.data();
                setUserData({
                    uid: user.uid,
                    email: user.email,
                    ...userInfo
                });

                console.log('🔄 MainLayout - 유저 데이터 실시간 업데이트:', {
                    hasPin: !!userInfo.pin,
                    userType: userInfo.userType,
                    isAdmin: userInfo.isAdmin,
                    role: userInfo.role
                });

                // 회사 정보가 있으면 가져오기
                if (userInfo.companyId) {
                    const companyDoc = await getDoc(doc(db, 'users', userInfo.companyId));
                    if (companyDoc.exists()) {
                        setCompanyData(companyDoc.data());
                    }
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        // 모바일에서 페이지 변경시 사이드바 닫기
        setSidebarOpen(false);
    }, [currentPage]);

    // 로그아웃 처리
    const handleLogout = async () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            try {
                await signOut(auth);
                navigate('/login');
            } catch (error) {
                console.error('로그아웃 실패:', error);
                alert('로그아웃에 실패했습니다.');
            }
        }
    };

    // 🔒 PIN 보호가 필요한 경로 확인
    const isProtectedRoute = (path) => {
        const protectedRoutes = [
            '/profile',
            '/connections',
            '/transactions',
            '/statistics',
            '/company-manager'
        ];
        return protectedRoutes.includes(path);
    };

    // 🔒 PIN 입력 모달 열기
    const openPinModal = (path) => {
        setPendingNavigation(path);
        setPinInput('');
        setPinError('');
        setShowPinModal(true);
    };

    // 🔒 PIN 검증
    const verifyPin = () => {
        if (!userData?.pin) {
            // PIN이 설정되지 않은 경우 -> 프로필로 이동하여 설정 유도
            setShowPinModal(false);
            navigate('/profile');
            alert('먼저 프로필에서 PIN을 설정해주세요.');
            return;
        }

        if (pinInput === userData.pin) {
            // PIN 인증 성공
            setPinAuthenticated(true);
            setShowPinModal(false);
            if (pendingNavigation) {
                navigate(pendingNavigation);
                setPendingNavigation(null);
            }
            setPinInput('');
            setPinError('');
        } else {
            // PIN 틀림
            setPinError('PIN이 올바르지 않습니다.');
            setPinInput('');
        }
    };

    // 🔒 PIN 모달 닫기
    const closePinModal = () => {
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
        setPendingNavigation(null);
    };

    // 🔒 Enter 키로 제출
    const handlePinKeyPress = (e) => {
        if (e.key === 'Enter' && pinInput.length === 4) {
            verifyPin();
        } else if (e.key === 'Escape') {
            closePinModal();
        }
    };

    // 메뉴 아이템 클릭 처리 (PIN 검증 포함)
    const handleMenuClick = (path) => {
        // 🔒 보호된 경로이고, 아직 인증되지 않은 경우
        if (isProtectedRoute(path) && !pinAuthenticated) {
            openPinModal(path);
            return;
        }

        // 일반 경로 또는 이미 인증된 경우
        navigate(path);
        setSidebarOpen(false);
    };

    // 사용자 타입별 메뉴 구성
    const getMenuItems = () => {
        if (!userData) return [];

        // 업체 타입 결정 (직원이면 회사 타입, 아니면 본인 타입)
        const businessType = userData.companyId ? companyData?.businessType : userData.businessType;

        // 🔥 관리자 전용 메뉴 (최우선 - businessType 상관없이)
        if (userData.isAdmin || userData.role === 'admin') {
            return [
                {
                    section: '관리자',
                    items: [
                        { name: '판매자 승인', icon: <Shield size={20} />, path: '/admin/seller-approval' },
                        { name: '신제품 승인', icon: <Package size={20} />, path: '/admin/product-approval' },
                        { name: '세미나 승인', icon: <GraduationCap size={20} />, path: '/admin/seminar-approval' },
                        { name: '광고 승인', icon: <Megaphone size={20} />, path: '/admin/ad-approval' }
                    ]
                },
                {
                    section: '결제 승인 관리',
                    items: [
                        { name: '기공소 홍보 승인', icon: <Building2 size={20} />, path: '/admin/lab-approval' },
                        { name: '구인공고 승인', icon: <Briefcase size={20} />, path: '/admin/job-posting-approval' },
                        { name: '마켓플레이스 승인', icon: <ShoppingBag size={20} />, path: '/admin/marketplace-approval' },
                        { name: '결제 금액 설정', icon: <Settings size={20} />, path: '/admin/payment-settings' }
                    ]
                },
                {
                    section: '커뮤니티 관리',
                    items: [
                        { name: '기공소 디렉토리', icon: <Building2 size={20} />, path: '/admin/lab-directory' },
                        { name: '광고 내역', icon: <Megaphone size={20} />, path: '/admin/ad-list' },
                        { name: '구인공고 관리', icon: <Briefcase size={20} />, path: '/admin/job-management' },
                        { name: '세미나 관리', icon: <GraduationCap size={20} />, path: '/admin/seminar-management' },
                        { name: '상품 관리', icon: <ShoppingBag size={20} />, path: '/admin/marketplace-management' }
                    ]
                },
                {
                    section: '커뮤니티',
                    items: [
                        { name: '광고 등록', icon: <Megaphone size={20} />, path: '/ad-registration' },
                        { name: '구인공고', icon: <Briefcase size={20} />, path: '/job-board' },
                        { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                        { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' }
                    ]
                }
            ];
        }

        // 1. 개인 회원 - 업체 미등록
        if (userData.userType === 'individual' && !userData.businessType && !userData.companyId) {
            return [
                {
                    section: '시작하기',
                    items: [
                        {
                            name: '업체 등록하기',
                            icon: <Building size={20} />,
                            path: '/company-register',
                            highlight: true
                        },
                        {
                            name: '직원으로 가입하기',
                            icon: <UserPlus size={20} />,
                            path: '/staff-join',
                            highlight: true
                        }
                    ]
                },
                {
                    section: '커뮤니티',
                    items: [
                        { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                        { name: '구인공고', icon: <Briefcase size={20} />, path: '/job-board' },
                        { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                        { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
                    ]
                }
            ];
        }

        // 2. 치과 메뉴 (본인 또는 직원)
        if (businessType === 'dental' || businessType === 'clinic') {
            const menuSections = [
                {
                    section: '주요 기능',
                    items: [
                        { name: '대시보드', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
                        { name: '캘린더', icon: <Calendar size={20} />, path: '/calendar' },
                        { name: '주문 생성', icon: <FilePlus size={20} />, path: '/create-order' },
                        { name: '주문 목록', icon: <FileText size={20} />, path: '/orders' },
                        { name: '채팅', icon: <MessageSquare size={20} />, path: '/chat', badge: '' }
                    ]
                },
                {
                    section: '마케팅/커뮤니티',
                    items: [
                        { name: '기공소 찾기', icon: <Search size={20} />, path: '/lab-directory' },
                        { name: '네이버 리뷰', icon: <Star size={20} />, path: '/naver-review' },
                        { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                        { name: '중고물품', icon: <Recycle size={20} />, path: '/used-items' },
                        { name: '구인공고', icon: <Briefcase size={20} />, path: '/job-board' },
                        { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                        { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
                    ]
                }
            ];

            // ⚠️ 치과는 판매자 기능 사용 불가 (마켓플레이스 조회만 가능)

            // 🔒 직원이 아닌 경우에만 설정 섹션 표시
            if (!userData.companyId) {
                menuSections.push({
                    section: '설정',
                    protected: true, // 🔒 보호된 섹션 표시
                    items: [
                        { name: '프로필', icon: <User size={20} />, path: '/profile', protected: true },
                        { name: '거래처', icon: <Building2 size={20} />, path: '/connections', protected: true },
                        { name: '거래명세서', icon: <DollarSign size={20} />, path: '/transactions', protected: true },
                        { name: '통계', icon: <TrendingUp size={20} />, path: '/statistics', protected: true },
                        { name: '직원 관리', icon: <Users size={20} />, path: '/company-manager', protected: true }
                    ]
                });
            }

            // 🔒 관리자 메뉴 (isAdmin = true인 경우)
            if (userData.isAdmin) {
                menuSections.push({
                    section: '관리자',
                    items: [
                        { name: '판매자 승인', icon: <CheckCircle size={20} />, path: '/admin/seller-approval' },
                        { name: '신제품 승인', icon: <Package size={20} />, path: '/admin/product-approval' },
                        { name: '세미나 승인', icon: <GraduationCap size={20} />, path: '/admin/seminar-approval' },
                        { name: '광고 승인', icon: <Megaphone size={20} />, path: '/admin/ad-approval' },
                        // 🆕 통합 결제 시스템 관리
                        { name: '기공소 홍보 승인', icon: <Building size={20} />, path: '/admin/lab-approval' },
                        { name: '기공소 찾기 관리', icon: <Search size={20} />, path: '/admin/lab-directory' },
                        { name: '구인공고 승인', icon: <Briefcase size={20} />, path: '/admin/job-posting-approval' },
                        { name: '마켓플레이스 승인', icon: <ShoppingBag size={20} />, path: '/admin/marketplace-approval' },
                        { name: '결제 금액 설정', icon: <Settings size={20} />, path: '/admin/payment-settings' }
                    ]
                });
            }

            return menuSections;
        }

        // 3. 기공소 메뉴 (본인 또는 직원)
        if (businessType === 'lab') {
            const menuSections = [
                {
                    section: '주요 기능',
                    items: [
                        { name: '대시보드', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
                        { name: '캘린더', icon: <Calendar size={20} />, path: '/calendar' },
                        { name: '주문 생성', icon: <FilePlus size={20} />, path: '/create-order' },
                        { name: '주문 목록', icon: <FileText size={20} />, path: '/orders' },
                        { name: '채팅', icon: <MessageSquare size={20} />, path: '/chat', badge: '' }
                    ]
                }
            ];

            // ✅ 마케팅/커뮤니티 섹션 (직원 여부에 따라 다른 메뉴)
            const marketingItems = [
                { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                { name: '중고물품', icon: <Recycle size={20} />, path: '/used-items' },
                { name: '구인공고', icon: <Briefcase size={20} />, path: '/job-board' },
                { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
            ];

            // ⚠️ 직원이 아닌 경우에만 홍보하기와 세미나 추가
            if (!userData.companyId) {
                marketingItems.unshift({ name: '기공소 홍보하기', icon: <Megaphone size={20} />, path: '/lab-advertising' });
                marketingItems.splice(4, 0, { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' });
            }

            menuSections.push({
                section: '마케팅/커뮤니티',
                items: marketingItems
            });

            // 🔒 직원이 아닌 경우에만 설정 섹션 표시
            if (!userData.companyId) {
                menuSections.push({
                    section: '설정',
                    protected: true,
                    items: [
                        { name: '프로필', icon: <User size={20} />, path: '/profile', protected: true },
                        { name: '거래처', icon: <Building2 size={20} />, path: '/connections', protected: true },
                        { name: '거래명세서', icon: <DollarSign size={20} />, path: '/transactions', protected: true },
                        { name: '통계', icon: <TrendingUp size={20} />, path: '/statistics', protected: true },
                        { name: '직원 관리', icon: <Users size={20} />, path: '/company-manager', protected: true }
                    ]
                });
            }

            // 🔒 관리자 메뉴
            if (userData.isAdmin) {
                menuSections.push({
                    section: '관리자',
                    items: [
                        { name: '판매자 승인', icon: <CheckCircle size={20} />, path: '/admin/seller-approval' },
                        { name: '신제품 승인', icon: <Package size={20} />, path: '/admin/product-approval' },
                        { name: '세미나 승인', icon: <GraduationCap size={20} />, path: '/admin/seminar-approval' },
                        { name: '광고 승인', icon: <Megaphone size={20} />, path: '/admin/ad-approval' },
                        // 🆕 통합 결제 시스템 관리
                        { name: '기공소 홍보 승인', icon: <Building size={20} />, path: '/admin/lab-approval' },
                        { name: '기공소 찾기 관리', icon: <Search size={20} />, path: '/admin/lab-directory' },
                        { name: '구인공고 승인', icon: <Briefcase size={20} />, path: '/admin/job-posting-approval' },
                        { name: '마켓플레이스 승인', icon: <ShoppingBag size={20} />, path: '/admin/marketplace-approval' },
                        { name: '결제 금액 설정', icon: <Settings size={20} />, path: '/admin/payment-settings' }
                    ]
                });
            }

            return menuSections;
        }

        // 4. 재료 판매업체 메뉴
        // ✅ A안: supplier는 기본적으로 판매자 기능 사용 (별도 승인 불필요)
        if (businessType === 'supplier') {
            const menuSections = [
                {
                    section: '판매 관리',
                    items: [
                        { name: '판매자 대시보드', icon: <LayoutDashboard size={20} />, path: '/seller-dashboard' },
                        { name: '상품 등록', icon: <Package size={20} />, path: '/product-registration' },
                        { name: '상품 관리', icon: <FileText size={20} />, path: '/product-management' },
                        { name: '주문 관리', icon: <FileText size={20} />, path: '/seller-orders' },
                        { name: '정산 내역', icon: <DollarSign size={20} />, path: '/seller-settlement' },
                    ]
                },
                {
                    section: '마켓플레이스',
                    items: [
                        { name: '마켓 둘러보기', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                        { name: '구인공고', icon: <Briefcase size={20} />, path: '/job-board' },
                        { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                        { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
                    ]
                }
            ];

            // 설정 섹션
            menuSections.push({
                section: '설정',
                protected: true,
                items: [
                    { name: '프로필', icon: <User size={20} />, path: '/profile', protected: true },
                    { name: '판매자 정보', icon: <Shield size={20} />, path: '/seller-info', protected: true }
                ]
            });

            // 🔒 관리자 메뉴 (isAdmin = true인 경우)
            if (userData.isAdmin) {
                menuSections.push({
                    section: '관리자',
                    items: [
                        { name: '판매자 승인', icon: <CheckCircle size={20} />, path: '/admin/seller-approval' },
                        { name: '신제품 승인', icon: <Package size={20} />, path: '/admin/product-approval' },
                        { name: '세미나 승인', icon: <GraduationCap size={20} />, path: '/admin/seminar-approval' },
                        { name: '광고 승인', icon: <Megaphone size={20} />, path: '/admin/ad-approval' },
                        // 🆕 통합 결제 시스템 관리
                        { name: '기공소 홍보 승인', icon: <Building size={20} />, path: '/admin/lab-approval' },
                        { name: '기공소 찾기 관리', icon: <Search size={20} />, path: '/admin/lab-directory' },
                        { name: '구인공고 승인', icon: <Briefcase size={20} />, path: '/admin/job-posting-approval' },
                        { name: '마켓플레이스 승인', icon: <ShoppingBag size={20} />, path: '/admin/marketplace-approval' },
                        { name: '결제 금액 설정', icon: <Settings size={20} />, path: '/admin/payment-settings' }
                    ]
                });
            }

            return menuSections;
        }

        // 5. 판매자 회원 메뉴 ⭐ 신규
        if (businessType === 'seller') {
            // 승인된 판매자만 기능 사용 가능
            if (userData.sellerStatus === 'approved') {
                const menuSections = [
                    {
                        section: '판매자 관리',
                        items: [
                            { name: '대시보드', icon: <LayoutDashboard size={20} />, path: '/seller-dashboard' },
                            { name: '상품 관리', icon: <ShoppingBag size={20} />, path: '/product-management' },
                            { name: '상품 등록', icon: <Plus size={20} />, path: '/product-registration' },
                            { name: '주문 관리', icon: <FileText size={20} />, path: '/seller-orders' },
                            { name: '정산 내역', icon: <DollarSign size={20} />, path: '/seller-settlement' }
                        ]
                    },
                    {
                        section: '콘텐츠 관리',
                        items: [
                            { name: '광고 관리', icon: <Megaphone size={20} />, path: '/ad-registration' },
                            { name: '세미나 관리', icon: <GraduationCap size={20} />, path: '/seminars' },
                            { name: '신제품 관리', icon: <Package size={20} />, path: '/new-products' }
                        ]
                    },
                    {
                        section: '커뮤니티',
                        items: [
                            { name: '마켓플레이스 보기', icon: <ShoppingBag size={20} />, path: '/marketplace' }
                        ]
                    },
                    {
                        section: '설정',
                        protected: true,
                        items: [
                            { name: '프로필', icon: <User size={20} />, path: '/profile', protected: true }
                        ]
                    }
                ];

                return menuSections;
            }
            // 승인 대기중
            else if (userData.sellerStatus === 'pending') {
                return [
                    {
                        section: '승인 대기중',
                        items: [
                            {
                                name: '신청 현황 확인',
                                icon: <AlertCircle size={20} />,
                                path: '/seller-application-status',
                                highlight: true
                            }
                        ]
                    },
                    {
                        section: '커뮤니티',
                        items: [
                            { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                            { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                            { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
                        ]
                    }
                ];
            }
            // 거부됨
            else if (userData.sellerStatus === 'rejected') {
                return [
                    {
                        section: '신청 거부됨',
                        items: [
                            {
                                name: '신청 현황 확인',
                                icon: <AlertCircle size={20} />,
                                path: '/seller-application-status',
                                highlight: true
                            }
                        ]
                    },
                    {
                        section: '커뮤니티',
                        items: [
                            { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                            { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                            { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
                        ]
                    }
                ];
            }
            // 아직 신청하지 않음
            else {
                return [
                    {
                        section: '시작하기',
                        items: [
                            {
                                name: '판매자 신청하기',
                                icon: <Building size={20} />,
                                path: '/seller-application',
                                highlight: true
                            }
                        ]
                    },
                    {
                        section: '커뮤니티',
                        items: [
                            { name: '마켓플레이스', icon: <ShoppingBag size={20} />, path: '/marketplace' },
                            { name: '세미나', icon: <GraduationCap size={20} />, path: '/seminars' },
                            { name: '신제품', icon: <Package size={20} />, path: '/new-products' }
                        ]
                    }
                ];
            }
        }

        // 기본값 (에러 방지)
        return [];
    };

    const menuItems = getMenuItems();

    // 사용자 표시 이름 결정
    const getDisplayName = () => {
        if (userData?.companyId && companyData) {
            // 직원인 경우: 회사명 (직원)
            return `${companyData.businessName} (직원)`;
        } else if (userData?.businessName) {
            // 사업자인 경우: 업체명
            return userData.businessName;
        } else if (userData?.name) {
            // 개인 회원: 이름
            return userData.name;
        } else {
            // 기본값: 이메일
            return user?.email || '사용자';
        }
    };

    // 사용자 타입 표시
    const getUserTypeLabel = () => {
        const businessType = userData?.companyId ? companyData?.businessType : userData?.businessType;

        if (businessType === 'dental' || businessType === 'clinic') {
            return '치과';
        } else if (businessType === 'lab') {
            return '기공소';
        } else if (businessType === 'supplier') {
            return '재료 판매업체';
        } else if (businessType === 'seller') {
            return '판매자 회원';
        } else {
            return '개인회원';
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="main-layout">
            {/* 🔒 PIN 입력 모달 */}
            {showPinModal && (
                <>
                    <div className="pin-modal-overlay" onClick={closePinModal}></div>
                    <div className="pin-modal">
                        <div className="pin-modal-header">
                            <div className="pin-modal-icon">
                                <Lock size={24} />
                            </div>
                            <h2>PIN 입력</h2>
                            <p>보안이 필요한 기능입니다. PIN을 입력해주세요.</p>
                        </div>

                        <div className="pin-modal-body">
                            <input
                                type="password"
                                value={pinInput}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setPinInput(value);
                                    setPinError('');
                                }}
                                onKeyPress={handlePinKeyPress}
                                placeholder="4자리 PIN"
                                maxLength={4}
                                className={`pin-modal-input ${pinError ? 'error' : ''}`}
                                autoFocus
                            />
                            {pinError && (
                                <div className="pin-modal-error">
                                    <AlertCircle size={16} />
                                    {pinError}
                                </div>
                            )}
                            <div className="pin-modal-hint">
                                PIN을 잊으셨나요? 프로필에서 재설정할 수 있습니다.
                            </div>
                        </div>

                        <div className="pin-modal-actions">
                            <button
                                onClick={closePinModal}
                                className="pin-modal-btn pin-modal-btn-cancel"
                            >
                                취소
                            </button>
                            <button
                                onClick={verifyPin}
                                disabled={pinInput.length !== 4}
                                className="pin-modal-btn pin-modal-btn-confirm"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* 사이드바 */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                {/* 로고 */}
                <div className="sidebar-logo">
                    <Building2 size={24} />
                    <div>
                        <h1>DentalCluster</h1>
                        <p>치과 통합 관리 시스템</p>
                    </div>
                </div>

                {/* 사용자 정보 */}
                <div className="user-info">
                    <div className="user-avatar">
                        <User size={20} />
                    </div>
                    <div className="user-details">
                        <div className="user-name">{getDisplayName()}</div>
                        <div className="user-type">{getUserTypeLabel()}</div>
                        {userData?.companyId && companyData && (
                            <div className="user-business">{companyData.businessType}</div>
                        )}
                    </div>
                    {/* 🔔 알림 버튼을 유저 정보 옆에 배치 */}
                    <div style={{ marginLeft: 'auto' }}>
                        {userData && <NotificationBell user={userData} integrated={true} />}
                    </div>
                </div>

                {/* ✅ A안: 판매자 승인 상태 배지 */}
                {userData?.sellerStatus === 'approved' && (
                    <div className="seller-badge-container" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            <CheckCircle size={14} />
                            판매자 인증
                        </div>
                    </div>
                )}
                {userData?.sellerStatus === 'pending' && (
                    <div className="seller-badge-container" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            <AlertCircle size={14} />
                            승인 대기중
                        </div>
                    </div>
                )}

                {/* 직원 상태 표시 */}
                {userData?.companyId && companyData && (
                    <div className="staff-notice">
                        <CheckCircle size={16} />
                        <div>
                            <div className="staff-notice-label">소속 회사</div>
                            <div className="staff-notice-name">{companyData.businessName}</div>
                        </div>
                    </div>
                )}

                {/* 네비게이션 */}
                <nav className="sidebar-nav">
                    {menuItems.map((section, idx) => (
                        <div key={idx} className="nav-section">
                            <div className="nav-section-title">
                                {section.section}
                                {section.protected && (
                                    <Lock size={12} style={{ marginLeft: '6px', display: 'inline' }} />
                                )}
                            </div>
                            {section.items.map((item, itemIdx) => (
                                <button
                                    key={itemIdx}
                                    className={`nav-item ${item.highlight ? 'highlight' : ''} ${currentPage === item.path ? 'active' : ''}`}
                                    onClick={() => handleMenuClick(item.path)}
                                >
                                    {item.icon}
                                    <span>{item.name}</span>
                                    {item.protected && (
                                        <Lock size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                    )}
                                    {item.badge && (
                                        <span className={`nav-badge ${item.badge}`}>
                                            {item.badge === 'soon' ? 'SOON' : item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}

                    {/* 구분선 */}
                    <div className="nav-divider"></div>

                    {/* 로그아웃 */}
                    <button className="nav-item logout" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>로그아웃</span>
                    </button>
                </nav>

                {/* 하단 정보 */}
                <div className="sidebar-footer">
                    <div className="version">v1.0.0</div>
                </div>
            </aside>

            {/* 모바일 헤더 */}
            <header className="mobile-header">
                <button
                    className="menu-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <h1 className="mobile-title">DentConnect</h1>
            </header>

            {/* 메인 컨텐츠 */}
            <main className="main-content">
                {children}
            </main>

            {/* 모바일 오버레이 */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}

const styles = {
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
};

export default MainLayout;