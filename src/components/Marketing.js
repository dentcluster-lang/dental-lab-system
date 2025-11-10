import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc as firestoreDoc,
  query,
  where,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import NaverReviewManager from './NaverReviewManager';
import ProfileAdManager from './ProfileAdManager';
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Star,
  Clock,
  Award,
  Edit2,
  Save,
  X,
  Image as ImageIcon,
  CheckCircle,
  Filter,
  TrendingUp,
  FileText,
  MessageSquare,
  Building2,
  BarChart3
} from 'lucide-react';

function Marketing({ user }) {
  const [businessType, setBusinessType] = useState(''); // 'dental' or 'lab'
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'myProfile', 'naverReview', 'adManager'
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedSpecialty, setSelectedSpecialty] = useState('전체');

  // 내 프로필 편집
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    businessName: '',
    region: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    specialties: [],
    workingHours: '',
    certifications: '',
    equipment: '',
    profileImage: null
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const regions = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  const specialtyOptions = ['크라운/브릿지', '임플란트', '틀니', '교정장치', '라미네이트', '지르코니아', '골드', '세라믹'];

  useEffect(() => {
    if (user) {
      loadUserBusinessType();
      loadAllProfiles();
      loadMyProfile();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserBusinessType = async () => {
    try {
      const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setBusinessType(userData.businessType || '');
      }
    } catch (error) {
      console.error('업체 타입 로딩 실패:', error);
    }
  };

  const loadAllProfiles = async () => {
    try {
      setLoading(true);
      const profilesRef = collection(db, 'marketingProfiles');
      const snapshot = await getDocs(profilesRef);
      const profileList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfiles(profileList);
    } catch (error) {
      console.error('프로필 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyProfile = async () => {
    try {
      const profilesRef = collection(db, 'marketingProfiles');
      const q = query(profilesRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const profile = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        };
        setMyProfile(profile);
        setEditData(profile);
      }
    } catch (error) {
      console.error('내 프로필 로딩 실패:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const storageRef = ref(storage, `marketing/${user.uid}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setEditData(prev => ({
        ...prev,
        profileImage: downloadURL
      }));

      setMessage({ type: 'success', text: '이미지가 업로드되었습니다!' });
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      setMessage({ type: 'error', text: '이미지 업로드에 실패했습니다.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSpecialtyToggle = (specialty) => {
    setEditData(prev => {
      const specialties = prev.specialties || [];
      if (specialties.includes(specialty)) {
        return {
          ...prev,
          specialties: specialties.filter(s => s !== specialty)
        };
      } else {
        return {
          ...prev,
          specialties: [...specialties, specialty]
        };
      }
    });
  };

  const handleSaveProfile = async () => {
    try {
      setUploading(true);

      if (!editData.businessName || !editData.region || !editData.phone) {
        setMessage({ type: 'error', text: '필수 항목을 모두 입력해주세요.' });
        return;
      }

      if (myProfile) {
        // 업데이트
        const profileRef = firestoreDoc(db, 'marketingProfiles', myProfile.id);
        await updateDoc(profileRef, {
          ...editData,
          updatedAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: '프로필이 수정되었습니다!' });
      } else {
        // 새로 생성
        await addDoc(collection(db, 'marketingProfiles'), {
          ...editData,
          userId: user.uid,
          businessType: businessType, // 업체 타입 저장
          views: 0,
          rating: 0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: '프로필이 생성되었습니다!' });
      }

      await loadMyProfile();
      await loadAllProfiles();
      setIsEditing(false);

    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setMessage({ type: 'error', text: '저장에 실패했습니다.' });
    } finally {
      setUploading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === '전체' || profile.region === selectedRegion;
    const matchesSpecialty = selectedSpecialty === '전체' ||
      (profile.specialties || []).includes(selectedSpecialty);

    return matchesSearch && matchesRegion && matchesSpecialty;
  });

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    subtitle: {
      fontSize: '16px',
      color: '#666666',
      marginBottom: '20px'
    },
    businessTypeIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#f0f7ff',
      border: '2px solid #4CAF50',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#4CAF50',
      marginBottom: '20px'
    },
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '30px',
      borderBottom: '2px solid #e0e0e0',
      paddingBottom: '0',
      overflowX: 'auto'
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      color: '#666666',
      borderBottom: '3px solid transparent',
      transition: 'all 0.2s',
      marginBottom: '-2px',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    tabActive: {
      color: '#4CAF50',
      borderBottom: '3px solid #4CAF50'
    },
    searchSection: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '30px'
    },
    searchRow: {
      display: 'flex',
      gap: '15px',
      alignItems: 'flex-end',
      flexWrap: 'wrap'
    },
    searchGroup: {
      flex: 1,
      minWidth: '200px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#333333'
    },
    input: {
      width: '100%',
      padding: '10px 15px',
      border: '1px solid #dddddd',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    select: {
      width: '100%',
      padding: '10px 15px',
      border: '1px solid #dddddd',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: '#ffffff',
      cursor: 'pointer'
    },
    profileGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '25px',
      marginTop: '20px'
    },
    profileCard: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '25px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
      border: '1px solid #f0f0f0'
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '15px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '1px solid #f0f0f0'
    },
    profileImage: {
      width: '80px',
      height: '80px',
      borderRadius: '12px',
      objectFit: 'cover',
      border: '2px solid #f0f0f0'
    },
    profileImagePlaceholder: {
      width: '80px',
      height: '80px',
      borderRadius: '12px',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid #e0e0e0'
    },
    profileInfo: {
      flex: 1
    },
    businessName: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '8px'
    },
    regionBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      backgroundColor: '#e8f5e9',
      color: '#4CAF50',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '8px'
    },
    rating: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '14px',
      color: '#666666'
    },
    specialtyTags: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '15px'
    },
    specialtyTag: {
      padding: '6px 12px',
      backgroundColor: '#f5f5f5',
      borderRadius: '16px',
      fontSize: '13px',
      color: '#666666'
    },
    description: {
      fontSize: '14px',
      color: '#666666',
      lineHeight: '1.6',
      marginBottom: '15px',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    },
    contactInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '14px',
      color: '#666666'
    },
    contactItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    myProfileSection: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    },
    profileViewHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '2px solid #f0f0f0'
    },
    editButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'background-color 0.2s'
    },
    profileViewContent: {
      display: 'grid',
      gap: '25px'
    },
    profileImageLarge: {
      width: '200px',
      height: '200px',
      borderRadius: '16px',
      objectFit: 'cover',
      border: '3px solid #f0f0f0',
      marginBottom: '20px'
    },
    infoSection: {
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '12px'
    },
    infoTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333333',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoContent: {
      fontSize: '14px',
      color: '#666666',
      lineHeight: '1.8'
    },
    editSection: {
      display: 'grid',
      gap: '25px'
    },
    formGroup: {
      display: 'grid',
      gap: '10px'
    },
    required: {
      color: '#ff4444',
      marginLeft: '4px'
    },
    imageUploadSection: {
      marginBottom: '20px'
    },
    imageUploadButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      backgroundColor: '#f5f5f5',
      border: '2px dashed #dddddd',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      color: '#666666',
      transition: 'all 0.2s'
    },
    uploadedImage: {
      marginTop: '15px',
      width: '200px',
      height: '200px',
      borderRadius: '12px',
      objectFit: 'cover',
      border: '2px solid #f0f0f0'
    },
    specialtyGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '10px'
    },
    specialtyButton: {
      padding: '10px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
      fontWeight: '500'
    },
    specialtyButtonSelected: {
      backgroundColor: '#4CAF50',
      borderColor: '#4CAF50',
      color: 'white'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #dddddd',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    buttonPrimary: {
      backgroundColor: '#4CAF50',
      color: 'white'
    },
    buttonSecondary: {
      backgroundColor: '#f5f5f5',
      color: '#666666'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
      color: '#999999'
    },
    emptyIcon: {
      marginBottom: '20px',
      color: '#cccccc'
    },
    message: {
      padding: '15px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      fontWeight: '500'
    },
    messageSuccess: {
      backgroundColor: '#e8f5e9',
      color: '#4CAF50',
      border: '1px solid #4CAF50'
    },
    messageError: {
      backgroundColor: '#ffebee',
      color: '#f44336',
      border: '1px solid #f44336'
    },
    noProfileAlert: {
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      textAlign: 'center'
    },
    noProfileAlertTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#856404',
      marginBottom: '10px'
    },
    noProfileAlertText: {
      fontSize: '14px',
      color: '#856404',
      lineHeight: '1.6'
    }
  };

  // 업체 타입이 설정되지 않은 경우
  if (!businessType) {
    return (
      <div style={styles.container}>
        <div style={styles.noProfileAlert}>
          <div style={styles.noProfileAlertTitle}>⚠️ 업체 타입을 먼저 설정해주세요</div>
          <div style={styles.noProfileAlertText}>
            프로필 설정에서 업체 타입(치과/기공소)을 선택해주세요.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <TrendingUp size={32} />
          마케팅 & 홍보
        </h1>
        <div style={styles.businessTypeIndicator}>
          {businessType === 'dental' ? '🦷 치과' : '🔬 기공소'}
        </div>
        <p style={styles.subtitle}>
          {businessType === 'dental'
            ? '신뢰할 수 있는 기공소를 찾고, 네이버 리뷰를 관리하세요'
            : '내 기공소를 홍보하고 더 많은 고객을 만나보세요'}
        </p>
      </div>

      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.messageSuccess : styles.messageError)
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
          {message.text}
        </div>
      )}

      {/* 탭 메뉴 */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'list' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('list')}
        >
          <Building2 size={18} />
          기공소 찾기
        </button>

        {/* 치과인 경우: 네이버 리뷰 관리 탭 */}
        {businessType === 'dental' && (
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'naverReview' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('naverReview')}
          >
            <Star size={18} />
            네이버 리뷰 관리
          </button>
        )}

        {/* 기공소인 경우: 내 홍보 프로필 + 광고 관리 탭 */}
        {businessType === 'lab' && (
          <>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'myProfile' ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab('myProfile')}
            >
              <FileText size={18} />
              내 홍보 프로필
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'adManager' ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab('adManager')}
            >
              <BarChart3 size={18} />
              광고 관리
            </button>
          </>
        )}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'list' && (
        <>
          {/* 검색 섹션 */}
          <div style={styles.searchSection}>
            <div style={styles.searchRow}>
              <div style={styles.searchGroup}>
                <label style={styles.label}>
                  <Search size={16} />
                  검색
                </label>
                <input
                  type="text"
                  placeholder="기공소명 또는 소개 내용 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.searchGroup}>
                <label style={styles.label}>
                  <MapPin size={16} />
                  지역
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  style={styles.select}
                >
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              <div style={styles.searchGroup}>
                <label style={styles.label}>
                  <Filter size={16} />
                  전문 분야
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  style={styles.select}
                >
                  <option value="전체">전체</option>
                  {specialtyOptions.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 프로필 목록 */}
          {loading ? (
            <div style={styles.emptyState}>
              <p>로딩 중...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div style={styles.emptyState}>
              <Building2 size={64} style={styles.emptyIcon} />
              <h3>검색 결과가 없습니다</h3>
              <p>다른 조건으로 검색해보세요.</p>
            </div>
          ) : (
            <div style={styles.profileGrid}>
              {filteredProfiles.map(profile => (
                <div
                  key={profile.id}
                  style={styles.profileCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                  }}
                >
                  <div style={styles.profileHeader}>
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.businessName}
                        style={styles.profileImage}
                      />
                    ) : (
                      <div style={styles.profileImagePlaceholder}>
                        <Building2 size={32} color="#cccccc" />
                      </div>
                    )}

                    <div style={styles.profileInfo}>
                      <h3 style={styles.businessName}>{profile.businessName}</h3>
                      <div style={styles.regionBadge}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {profile.region}
                      </div>
                      <div style={styles.rating}>
                        <Star size={16} fill="#FFD700" color="#FFD700" />
                        <span>{profile.rating?.toFixed(1) || '0.0'}</span>
                        <span>({profile.reviewCount || 0})</span>
                      </div>
                    </div>
                  </div>

                  {profile.specialties && profile.specialties.length > 0 && (
                    <div style={styles.specialtyTags}>
                      {profile.specialties.slice(0, 3).map(specialty => (
                        <span key={specialty} style={styles.specialtyTag}>
                          {specialty}
                        </span>
                      ))}
                      {profile.specialties.length > 3 && (
                        <span style={styles.specialtyTag}>
                          +{profile.specialties.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {profile.description && (
                    <p style={styles.description}>{profile.description}</p>
                  )}

                  <div style={styles.contactInfo}>
                    {profile.phone && (
                      <div style={styles.contactItem}>
                        <Phone size={16} />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.email && (
                      <div style={styles.contactItem}>
                        <Mail size={16} />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    {profile.workingHours && (
                      <div style={styles.contactItem}>
                        <Clock size={16} />
                        <span>{profile.workingHours}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 네이버 리뷰 관리 탭 (치과용) */}
      {activeTab === 'naverReview' && businessType === 'dental' && (
        <NaverReviewManager user={user} />
      )}

      {/* 광고 관리 탭 (기공소용) */}
      {activeTab === 'adManager' && businessType === 'lab' && (
        <ProfileAdManager user={user} />
      )}

      {/* 내 홍보 프로필 탭 (기공소용) */}
      {activeTab === 'myProfile' && businessType === 'lab' && (
        <>
          {myProfile && !isEditing ? (
            /* 프로필 보기 */
            <div style={styles.myProfileSection}>
              <div style={styles.profileViewHeader}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>내 프로필</h2>
                <button
                  style={styles.editButton}
                  onClick={() => setIsEditing(true)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  <Edit2 size={18} />
                  수정하기
                </button>
              </div>

              <div style={styles.profileViewContent}>
                {myProfile.profileImage && (
                  <img
                    src={myProfile.profileImage}
                    alt={myProfile.businessName}
                    style={styles.profileImageLarge}
                  />
                )}

                <div style={styles.infoSection}>
                  <div style={styles.infoTitle}>
                    <Building2 size={18} />
                    기본 정보
                  </div>
                  <div style={styles.infoContent}>
                    <strong>{myProfile.businessName}</strong><br />
                    {myProfile.region} | {myProfile.address}
                  </div>
                </div>

                {myProfile.specialties && myProfile.specialties.length > 0 && (
                  <div style={styles.infoSection}>
                    <div style={styles.infoTitle}>
                      <Award size={18} />
                      전문 분야
                    </div>
                    <div style={styles.specialtyTags}>
                      {myProfile.specialties.map(specialty => (
                        <span key={specialty} style={{
                          ...styles.specialtyTag,
                          backgroundColor: '#e8f5e9',
                          color: '#4CAF50',
                          fontWeight: '600'
                        }}>
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {myProfile.description && (
                  <div style={styles.infoSection}>
                    <div style={styles.infoTitle}>
                      <MessageSquare size={18} />
                      소개
                    </div>
                    <div style={styles.infoContent}>
                      {myProfile.description}
                    </div>
                  </div>
                )}

                <div style={styles.infoSection}>
                  <div style={styles.infoTitle}>
                    <Clock size={18} />
                    운영 시간
                  </div>
                  <div style={styles.infoContent}>
                    {myProfile.workingHours || '정보 없음'}
                  </div>
                </div>

                <div style={styles.infoSection}>
                  <div style={styles.infoTitle}>
                    <Phone size={18} />
                    연락처
                  </div>
                  <div style={styles.infoContent}>
                    전화: {myProfile.phone}<br />
                    이메일: {myProfile.email || '없음'}
                  </div>
                </div>

                {myProfile.certifications && (
                  <div style={styles.infoSection}>
                    <div style={styles.infoTitle}>
                      <Award size={18} />
                      자격증 및 인증
                    </div>
                    <div style={styles.infoContent}>
                      {myProfile.certifications}
                    </div>
                  </div>
                )}

                {myProfile.equipment && (
                  <div style={styles.infoSection}>
                    <div style={styles.infoTitle}>
                      <Award size={18} />
                      보유 장비
                    </div>
                    <div style={styles.infoContent}>
                      {myProfile.equipment}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 편집 모드 */
            <div style={styles.myProfileSection}>
              <div style={styles.editSection}>
                <h2 style={{ marginBottom: '25px', fontSize: '22px' }}>
                  {myProfile ? '프로필 수정' : '프로필 생성'}
                </h2>

                {/* 프로필 이미지 */}
                <div style={styles.imageUploadSection}>
                  <label style={styles.label}>프로필 이미지</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="imageUpload"
                  />
                  <label htmlFor="imageUpload" style={styles.imageUploadButton}>
                    <ImageIcon size={20} />
                    {uploading ? '업로드 중...' : '이미지 선택'}
                  </label>
                  {editData.profileImage && (
                    <img
                      src={editData.profileImage}
                      alt="프로필"
                      style={styles.uploadedImage}
                    />
                  )}
                </div>

                {/* 기본 정보 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    기공소명<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.businessName}
                    onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                    placeholder="예: 서울 프리미엄 기공소"
                    style={styles.input}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      지역<span style={styles.required}>*</span>
                    </label>
                    <select
                      value={editData.region}
                      onChange={(e) => setEditData({ ...editData, region: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">선택하세요</option>
                      {regions.filter(r => r !== '전체').map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      전화번호<span style={styles.required}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="02-1234-5678"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>상세 주소</label>
                  <input
                    type="text"
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    placeholder="예: 강남구 테헤란로 123"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>이메일</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    placeholder="example@email.com"
                    style={styles.input}
                  />
                </div>

                {/* 전문 분야 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>전문 분야 (복수 선택 가능)</label>
                  <div style={styles.specialtyGrid}>
                    {specialtyOptions.map(specialty => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => handleSpecialtyToggle(specialty)}
                        style={{
                          ...styles.specialtyButton,
                          ...((editData.specialties || []).includes(specialty)
                            ? styles.specialtyButtonSelected
                            : {})
                        }}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 소개 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>기공소 소개</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="기공소의 특징, 장점, 경력 등을 자유롭게 작성해주세요."
                    style={styles.textarea}
                  />
                </div>

                {/* 운영 시간 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>운영 시간</label>
                  <input
                    type="text"
                    value={editData.workingHours}
                    onChange={(e) => setEditData({ ...editData, workingHours: e.target.value })}
                    placeholder="예: 평일 09:00 - 18:00"
                    style={styles.input}
                  />
                </div>

                {/* 자격증 및 인증 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>자격증 및 인증</label>
                  <textarea
                    value={editData.certifications}
                    onChange={(e) => setEditData({ ...editData, certifications: e.target.value })}
                    placeholder="보유한 자격증이나 인증을 입력해주세요."
                    style={styles.textarea}
                  />
                </div>

                {/* 보유 장비 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>보유 장비</label>
                  <textarea
                    value={editData.equipment}
                    onChange={(e) => setEditData({ ...editData, equipment: e.target.value })}
                    placeholder="보유 중인 주요 장비를 입력해주세요."
                    style={styles.textarea}
                  />
                </div>

                {/* 버튼 */}
                <div style={styles.buttonGroup}>
                  {myProfile && (
                    <button
                      style={{ ...styles.button, ...styles.buttonSecondary }}
                      onClick={() => {
                        setIsEditing(false);
                        setEditData(myProfile);
                        setMessage({ type: '', text: '' });
                      }}
                    >
                      <X size={18} />
                      취소
                    </button>
                  )}
                  <button
                    style={{ ...styles.button, ...styles.buttonPrimary }}
                    onClick={handleSaveProfile}
                    disabled={uploading}
                  >
                    <Save size={18} />
                    {uploading ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 프로필이 없고 편집 모드도 아닐 때 */}
          {!myProfile && !isEditing && (
            <div style={styles.emptyState}>
              <TrendingUp size={64} style={styles.emptyIcon} />
              <h3>아직 프로필이 없습니다</h3>
              <p>프로필을 생성하고 내 기공소를 홍보해보세요!</p>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '20px' }}
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={18} />
                프로필 생성하기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Marketing;