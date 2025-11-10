import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import LabAdvertising from './components/LabAdvertising';
import LabDirectory from './components/LabDirectory';


// 레이아웃
import MainLayout from './components/MainLayout';

// 인증 페이지
import Login from './components/Login';
import Register from './components/Register';
import SignUp from './components/SignUp';

// 메인 기능 페이지
import Dashboard from './components/Dashboard';
import CreateOrder from './components/CreateOrder';
import OrderList from './components/OrderList';
import ViewOrder from './components/ViewOrder';
import Marketing from './components/Marketing';
import ConnectionList from './components/ConnectionList';
import Profile from './components/Profile';
import Statistics from './components/Statistics';
import TransactionStatementList from './components/TransactionStatementList';
import AutoSettlement from './components/AutoSettlement';
import Marketplace from './components/Marketplace';
import AdManager from './components/AdManager';
import TermsOfService from './components/TermsOfService';
import NaverReviewManager from './components/NaverReviewManager';
import ProfileAdManager from './components/ProfileAdManager';
import CalendarView from './components/CalendarView';
import ChatSystem from './components/ChatSystem';
import SellerApplication from './components/SellerApplication';
import SellerApplicationStatus from './components/SellerApplicationStatus';
import ProductRegistration from './components/ProductRegistration';
import ProductManagement from './components/ProductManagement';
import SellerDashboard from './components/SellerDashboard';
import SellerOrderList from './components/SellerOrderList';
import SellerSettlement from './components/SellerSettlement';
import AdminSellerApproval from './components/AdminSellerApproval';
import AdminProductApproval from './components/AdminProductApproval';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import OrderComplete from './components/OrderComplete';
import AdminAdApproval from './components/AdminAdApproval';
import AdRegistration from './components/AdRegistration';

// 🆕 통합 결제 시스템 관리자 페이지
import AdminLabApproval from './components/admin/AdminLabApproval';
import AdminLabDirectory from './components/admin/AdminLabDirectory';
import AdminJobPostingApproval from './components/admin/AdminJobPostingApproval';
import AdminMarketplaceApproval from './components/admin/AdminMarketplaceApproval';
import UsedItemsList from './components/UsedItemsList';
import UsedItemRegistration from './components/UsedItemRegistration';
import UsedItemDetail from './components/UsedItemDetail';
import ProductEdit from './components/ProductEdit';
import OrderManagement from './components/OrderManagement';
import ProductDetail from './components/ProductDetail';
import SeminarApproval from './components/SeminarApproval';


// 개인/업체 회원 기능
import StaffJoin from './components/StaffJoin';
import CompanyManager from './components/CompanyManager';
import CompanyRegister from './components/CompanyRegister';

// 🆕 커뮤니티 기능
import JobBoard from './components/JobBoard';
import NewProducts from './components/NewProducts';
import Seminars from './components/Seminars';

// 🆕 관리자 커뮤니티 관리 기능
import AdList from './components/AdList';
import JobPostManagement from './components/JobPostManagement';
import SeminarManagement from './components/SeminarManagement';
import MarketplaceProductManagement from './components/MarketplaceProductManagement';

// ✨ ViewOrder Wrapper 컴포넌트 (App 컴포넌트 밖에 정의)
function ViewOrderWrapper({ user }) {
  const { orderId } = useParams();
  const navigate = useNavigate();

  return (
    <ViewOrder
      orderId={orderId}
      user={user}
      onBack={() => navigate('/orders')}
    />
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [userInfo,] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserData(firebaseUser.uid);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 사용자 데이터 로드 함수 (업체 가입 후 새로고침용)
  const loadUserData = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const freshData = {
          uid: uid,
          email: auth.currentUser?.email || '',
          ...userDocSnap.data()
        };

        // 🔥🔥🔥 CRITICAL: 제거된 직원 비정상 상태 즉시 감지
        const hasStaffData = freshData.companyBusinessType || freshData.companyName;
        const hasNoCompany = !freshData.companyId;
        const isIndividual = freshData.userType === 'individual';

        console.log('🚨 비정상 상태 체크:', {
          userType: freshData.userType,
          hasStaffData,
          hasNoCompany,
          companyId: freshData.companyId,
          companyBusinessType: freshData.companyBusinessType,
          companyName: freshData.companyName
        });

        // 비정상 상태: individual인데 회사 정보가 남아있음
        if (isIndividual && hasStaffData && hasNoCompany) {
          console.error('⛔ 비정상 상태 감지! 즉시 수정합니다...');
          alert('계정 정보에 오류가 있어 수정합니다. 잠시만 기다려주세요.');

          // Firestore에서 완전히 삭제
          const { deleteField } = await import('firebase/firestore');
          await updateDoc(userDocRef, {
            businessType: deleteField(),
            companyId: deleteField(),
            companyName: deleteField(),
            companyBusinessType: deleteField(),
            businessName: deleteField(),
            role: deleteField(),
            staff: deleteField(),
            pendingCompanyId: deleteField(),
            pendingCompanyName: deleteField(),
            pendingCompanyType: deleteField()
          });

          console.log('✅ 비정상 데이터 삭제 완료');

          // 깨끗한 데이터로 다시 로드
          const cleanSnapshot = await getDoc(userDocRef);
          const cleanData = {
            uid: uid,
            email: auth.currentUser?.email || '',
            ...cleanSnapshot.data()
          };

          setUserData(cleanData);
          alert('계정 정보가 정상화되었습니다.');
          return cleanData;
        }

        setUserData(freshData);

        // 🔥 디버깅: 최신 데이터 확인
        console.log('📊 App.js - 사용자 데이터 로드:', {
          userType: freshData.userType,
          businessType: freshData.businessType,
          companyId: freshData.companyId,
          companyBusinessType: freshData.companyBusinessType
        });

        return freshData;
      } else {
        const basicData = {
          uid: uid,
          email: auth.currentUser?.email || ''
        };
        setUserData(basicData);
        return basicData;
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      const errorData = {
        uid: uid,
        email: auth.currentUser?.email || ''
      };
      setUserData(errorData);
      return errorData;
    }
  };

  // 🆕 강제 새로고침 함수 (MainLayout에서 사용)
  const refreshUserData = async () => {
    if (user?.uid) {
      console.log('🔄 사용자 데이터 강제 새로고침...');
      return await loadUserData(user.uid);
    }
    return null;
  };

  // CompanyRegister에서 사용할 수 있도록 window 객체에 추가
  useEffect(() => {
    window.refreshUserData = refreshUserData;
    return () => {
      delete window.refreshUserData;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>로딩 중...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 로그인하지 않은 경우: Login 또는 Register 표시
  if (!user) {
    return showRegister ? (
      <Register
        onRegister={(user) => setUser(user)}
        onShowLogin={() => setShowRegister(false)}
        onClose={() => setShowRegister(false)}
        onSuccess={() => setShowRegister(false)}
      />
    ) : (
      <Login
        onLogin={(user) => setUser(user)}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  // 로그인한 경우: 메인 앱 표시
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 인증 라우트 */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" /> : <Login />
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/dashboard" /> : <SignUp />
            }
          />

          {/* 기공소 광고 관리 */}
          <Route
            path="/lab-advertising"
            element={
              user ? (
                <MainLayout user={userData} currentPage="lab-advertising" refreshUserData={refreshUserData}>
                  <LabAdvertising user={userData} />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* 기공소 찾기 (치과용) */}
          <Route
            path="/lab-directory"
            element={
              user ? (
                <MainLayout user={userData} currentPage="lab-directory" refreshUserData={refreshUserData}>
                  <LabDirectory user={userData} />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* 보호된 라우트 - MainLayout으로 감싸기 */}
          <Route
            path="/*"
            element={
              user ? (
                <MainLayout user={userData} refreshUserData={refreshUserData}>
                  <Routes>
                    {/* 메인 기능 */}
                    <Route path="/dashboard" element={<Dashboard user={userData} />} />

                    {/* 주문 작성 - 모든 사업자 계정 접근 가능 */}
                    <Route path="/create-order" element={<CreateOrder user={userData} />} />

                    <Route path="/orders" element={<OrderList user={userData} />} />

                    {/* ✨ ViewOrder 라우트 - 경로 수정 */}
                    <Route
                      path="/view-order/:orderId"
                      element={<ViewOrderWrapper user={{ ...user, ...userData }} />}
                    />

                    <Route path="/calendar" element={<CalendarView user={userData} />} />
                    <Route path="/marketing" element={<Marketing user={userData} />} />
                    <Route path="/marketplace" element={<Marketplace user={userData} />} />
                    <Route path="/naver-review" element={<NaverReviewManager user={userData} />} />
                    <Route path="/profile-ad" element={<ProfileAdManager user={userData} />} />
                    <Route path="/chat" element={<ChatSystem user={userData} />} />
                    <Route path="/chat/:orderId?" element={<ChatSystem user={userData} />} />
                    <Route path="/checkout" element={<Checkout user={user} userInfo={userInfo} />} />
                    {/* 판매자 기능 */}
                    <Route
                      path="/seller/product-management"
                      element={<MarketplaceProductManagement user={userData} />}
                    />
                    <Route
                      path="/seller-application"
                      element={<SellerApplication userInfo={userData} />}
                    />
                    <Route
                      path="/seller-application-status"
                      element={<SellerApplicationStatus userInfo={userData} />}
                    />
                    <Route
                      path="/seller-dashboard"
                      element={<SellerDashboard userInfo={userData} />}
                    />
                    <Route
                      path="/product-registration"
                      element={<ProductRegistration userInfo={userData} />}
                    />
                    <Route path="/product-edit/:id" element={<ProductEdit userInfo={userInfo} />} />
                    <Route path="/orders" element={<OrderManagement userInfo={userInfo} />} />
                    <Route path="/product/:id" element={<ProductDetail userInfo={userInfo} />} />
                    <Route
                      path="/product-management"
                      element={<ProductManagement userInfo={userData} />}
                    />
                    <Route
                      path="/seller-orders"
                      element={<SellerOrderList userInfo={userData} />}
                    />
                    <Route
                      path="/seller-settlement"
                      element={<SellerSettlement userInfo={userData} />}
                    />
                    <Route
                      path="/admin/seller-approval"
                      element={<AdminSellerApproval userInfo={userData} />}
                    />
                    <Route
                      path="/admin/product-approval"
                      element={<AdminProductApproval userInfo={userData} />}
                    />

                    {/* 장바구니 & 주문 */}
                    <Route path="/cart" element={<Cart user={user} />} />
                    <Route path="/checkout" element={<Checkout user={user} userInfo={userData} />} />
                    <Route path="/order-complete" element={<OrderComplete />} />

                    {/* 중고물품 */}
                    <Route path="/used-items" element={<UsedItemsList />} />
                    <Route path="/used-items/register" element={<UsedItemRegistration />} />
                    <Route path="/used-items/:itemId" element={<UsedItemDetail />} />

                    {/* 설정 메뉴 (일부 PIN 보호) */}
                    <Route path="/profile" element={<Profile user={userData} />} />
                    <Route path="/connections" element={<ConnectionList user={userData} />} />
                    <Route path="/transactions" element={<TransactionStatementList user={userData} />} />
                    <Route path="/statistics" element={<Statistics user={userData} />} />
                    <Route path="/settlement" element={<AutoSettlement user={userData} />} />


                    {/* 기타 */}
                    <Route path="/ad-manager" element={<AdManager user={userData} />} />
                    <Route path="/terms" element={<TermsOfService />} />

                    {/* 개인 회원 전용 - 업체 가입 */}
                    <Route
                      path="/staff-join"
                      element={
                        <StaffJoin
                          user={userData}
                          onSuccess={() => loadUserData(userData.uid)}
                        />
                      }
                    />

                    {/* 개인 회원 전용 - 업체 등록 */}
                    <Route
                      path="/company-register"
                      element={
                        <CompanyRegister
                          user={userData}
                        />
                      }
                    />

                    {/* 업체 오너 전용 - 직원 관리 */}
                    <Route
                      path="/company-manager"
                      element={<CompanyManager user={userData} />}
                    />

                    {/* 🆕 커뮤니티 기능 */}
                    <Route path="/job-board" element={<JobBoard user={userData} />} />
                    <Route path="/new-products" element={<NewProducts user={userData} />} />
                    <Route path="/seminars" element={<Seminars user={userData} />} />

                    {/* 🆕 관리자 커뮤니티 관리 */}
                    <Route
                      path="/admin/ad-list"
                      element={<AdList user={userData} />}
                    />
                    <Route
                      path="/admin/job-management"
                      element={<JobPostManagement user={userData} />}
                    />
                    <Route
                      path="/admin/seminar-management"
                      element={<SeminarManagement user={userData} />}
                    />
                    <Route
                      path="/admin/marketplace-management"
                      element={<MarketplaceProductManagement user={userData} />}
                    />

                    {/* 관리자 승인 */}
                    <Route
                      path="/admin/seller-approval"
                      element={<AdminSellerApproval userInfo={userData} />}
                    />
                    <Route
                      path="/admin/product-approval"
                      element={<AdminProductApproval userInfo={userData} />}
                    />
                    <Route
                      path="/admin/ad-approval"
                      element={<AdminAdApproval userInfo={userData} />}
                    />
                    <Route
                      path="/admin/seminar-approval"
                      element={<SeminarApproval userInfo={userData} />}
                    />

                    {/* 🆕 통합 결제 시스템 관리자 페이지 */}
                    <Route
                      path="/admin/lab-approval"
                      element={<AdminLabApproval user={userData} />}
                    />
                    <Route
                      path="/admin/lab-directory"
                      element={<AdminLabDirectory user={userData} />}
                    />
                    <Route
                      path="/admin/job-posting-approval"
                      element={<AdminJobPostingApproval user={userData} />}
                    />
                    <Route
                      path="/admin/marketplace-approval"
                      element={<AdminMarketplaceApproval user={userData} />}
                    />

                    {/* 광고 등록 */}
                    <Route
                      path="/ad-registration"
                      element={<AdRegistration userInfo={userData} />}
                    />

                    {/* 기본 리다이렉트 */}
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </AuthProvider >
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
    width: '60px',
    height: '60px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '24px',
  },
  loadingText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b',
  },
};

export default App;