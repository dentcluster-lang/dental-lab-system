import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  MessageSquare,
  Send,
  Star,
  TrendingUp,
  Copy,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  BarChart3,
  X,
  Link as LinkIcon,
  Save,
  ExternalLink
} from 'lucide-react';

function NaverReviewManager({ user }) {
  const [reviewRequests, setReviewRequests] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSent: 0,
    totalResponses: 0,
    responseRate: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 🔥 네이버 플레이스 URL 상태 추가
  const [naverPlaceUrl, setNaverPlaceUrl] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlSaved, setUrlSaved] = useState(false);

  // 리뷰 요청 폼
  const [newRequest, setNewRequest] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    treatmentType: '',
    sendMethod: 'sms', // 'sms', 'email', 'kakao'
    customMessage: ''
  });


  const treatmentTypes = [
    '임플란트',
    '치아교정',
    '심미치료',
    '충치치료',
    '신경치료',
    '잇몸치료',
    '사랑니발치',
    '일반진료',
    '기타'
  ];

  // 🔥 네이버 플레이스 URL에서 리뷰 작성 링크 생성
  const generateReviewLink = (placeUrl) => {
    if (!placeUrl) return '';

    // URL에서 플레이스 ID 추출
    // 예: https://map.naver.com/p/entry/place/13491210
    // 또는: https://m.place.naver.com/place/13491210
    const match = placeUrl.match(/place\/(\d+)/);
    if (match) {
      const placeId = match[1];
      // 모바일 리뷰 작성 링크 생성
      return `https://m.place.naver.com/place/${placeId}/review/write`;
    }
    return placeUrl; // ID를 찾지 못하면 원본 URL 반환
  };

  // 🔥 네이버 플레이스 URL 저장
  const saveNaverPlaceUrl = async () => {
    try {
      setSavingUrl(true);
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        naverPlaceUrl: naverPlaceUrl,
        reviewLink: reviewLink,
        updatedAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: '네이버 플레이스 URL이 저장되었습니다!' });
      setUrlSaved(true);
      setTimeout(() => {
        setMessage({ type: '', text: '' });
        setUrlSaved(false);
      }, 3000);
    } catch (error) {
      console.error('URL 저장 실패:', error);
      setMessage({ type: 'error', text: 'URL 저장에 실패했습니다.' });
    } finally {
      setSavingUrl(false);
    }
  };

  // 🔥 네이버 플레이스 URL 불러오기
  const loadNaverPlaceUrl = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.naverPlaceUrl) {
          setNaverPlaceUrl(userData.naverPlaceUrl);
          setReviewLink(userData.reviewLink || generateReviewLink(userData.naverPlaceUrl));
        }
      }
    } catch (error) {
      console.error('URL 로딩 실패:', error);
    }
  };

  // URL 변경 시 리뷰 링크 자동 생성
  useEffect(() => {
    if (naverPlaceUrl) {
      const link = generateReviewLink(naverPlaceUrl);
      setReviewLink(link);
    }
  }, [naverPlaceUrl]);

  // 기본 메시지 템플릿 (리뷰 링크 포함)
  const getMessageTemplate = () => {
    const link = reviewLink || '[네이버 플레이스 URL을 먼저 설정해주세요]';

    return `안녕하세요, ${newRequest.patientName || '[환자명]'}님!

[병원명]에서 진료해주셔서 감사합니다.
${newRequest.treatmentType ? newRequest.treatmentType + ' 치료는 잘 진행되고 계신가요?' : '치료는 잘 진행되고 계신가요?'}

저희 병원은 환자분들의 소중한 의견을 경청하고자 합니다.
네이버에 짧은 후기를 남겨주시면 큰 도움이 됩니다.

▼ 리뷰 작성하기
${link}

감사합니다. 😊`;
  };

  useEffect(() => {
    if (user) {
      loadNaverPlaceUrl(); // 🔥 URL 먼저 로드
      loadReviewRequests();
      loadStatistics();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReviewRequests = async () => {
    try {
      setLoading(true);
      const requestsRef = collection(db, 'reviewRequests');
      const q = query(
        requestsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviewRequests(requests);
    } catch (error) {
      console.error('리뷰 요청 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const requestsRef = collection(db, 'reviewRequests');
      const q = query(requestsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      const requests = snapshot.docs.map(doc => doc.data());
      const totalSent = requests.length;
      const responses = requests.filter(r => r.hasResponded);
      const totalResponses = responses.length;
      const responseRate = totalSent > 0 ? (totalResponses / totalSent * 100) : 0;
      const averageRating = responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.rating || 0), 0) / responses.length
        : 0;

      setStatistics({
        totalSent,
        totalResponses,
        responseRate: responseRate.toFixed(1),
        averageRating: averageRating.toFixed(1)
      });
    } catch (error) {
      console.error('통계 로딩 실패:', error);
    }
  };

  const handleSendReviewRequest = async () => {
    try {
      if (!newRequest.patientName || !newRequest.patientPhone) {
        setMessage({ type: 'error', text: '환자명과 연락처는 필수입니다.' });
        return;
      }

      if (!naverPlaceUrl) {
        setMessage({ type: 'error', text: '네이버 플레이스 URL을 먼저 설정해주세요.' });
        return;
      }

      const finalMessage = newRequest.customMessage || getMessageTemplate();

      const requestData = {
        userId: user.uid,
        patientName: newRequest.patientName,
        patientPhone: newRequest.patientPhone,
        patientEmail: newRequest.patientEmail || '',
        treatmentType: newRequest.treatmentType,
        sendMethod: newRequest.sendMethod,
        message: finalMessage,
        reviewLink: reviewLink,
        status: 'sent',
        hasResponded: false,
        rating: 0,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reviewRequests'), requestData);

      setMessage({ type: 'success', text: '리뷰 요청이 전송되었습니다!' });
      setNewRequest({
        patientName: '',
        patientPhone: '',
        patientEmail: '',
        treatmentType: '',
        sendMethod: 'sms',
        customMessage: ''
      });

      await loadReviewRequests();
      await loadStatistics();
    } catch (error) {
      console.error('리뷰 요청 전송 실패:', error);
      setMessage({ type: 'error', text: '전송에 실패했습니다.' });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '날짜 없음';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
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
    // 🔥 네이버 플레이스 URL 설정 스타일
    urlSection: {
      backgroundColor: '#f0f7ff',
      borderRadius: '12px',
      padding: '25px',
      marginBottom: '30px',
      border: '2px solid #6366f1'
    },
    urlSectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    urlInputGroup: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px'
    },
    urlInput: {
      flex: 1,
      padding: '12px 16px',
      fontSize: '14px',
      border: '2px solid #ddd',
      borderRadius: '8px',
      outline: 'none',
      transition: 'border-color 0.3s'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: '#6366f1',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'background-color 0.3s'
    },
    saveButtonDisabled: {
      backgroundColor: '#94a3b8',
      cursor: 'not-allowed'
    },
    reviewLinkBox: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px'
    },
    reviewLinkText: {
      fontSize: '13px',
      color: '#666',
      wordBreak: 'break-all'
    },
    copyButton: {
      padding: '8px 12px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      whiteSpace: 'nowrap',
      fontSize: '12px'
    },
    urlHelp: {
      fontSize: '13px',
      color: '#666',
      marginTop: '10px',
      padding: '10px',
      backgroundColor: 'white',
      borderRadius: '6px'
    },
    featureInfoBox: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginBottom: '20px',
      '@media (max-width: 768px)': {
        gridTemplateColumns: '1fr'
      }
    },
    featureAvailable: {
      display: 'flex',
      gap: '12px',
      padding: '16px',
      backgroundColor: '#f0fdf4',
      border: '2px solid #86efac',
      borderRadius: '8px',
      fontSize: '13px',
      lineHeight: '1.6'
    },
    featureUnavailable: {
      display: 'flex',
      gap: '12px',
      padding: '16px',
      backgroundColor: '#fefce8',
      border: '2px solid #fde047',
      borderRadius: '8px',
      fontSize: '13px',
      lineHeight: '1.6'
    },
    featureList: {
      margin: '8px 0 0 0',
      paddingLeft: '20px',
      color: '#333',
      fontSize: '12px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      backgroundColor: '#ffffff',
      padding: '25px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #f0f0f0'
    },
    statIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '15px',
      backgroundColor: '#f0f7ff'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#666666'
    },
    section: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '30px'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    formGrid: {
      display: 'grid',
      gap: '20px'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#333333'
    },
    required: {
      color: '#f44336',
      marginLeft: '4px'
    },
    input: {
      padding: '12px 16px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      outline: 'none'
    },
    select: {
      padding: '12px 16px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      outline: 'none',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    textarea: {
      padding: '12px 16px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      outline: 'none',
      minHeight: '200px',
      fontFamily: 'inherit',
      resize: 'vertical'
    },
    radioGroup: {
      display: 'flex',
      gap: '10px'
    },
    radioLabel: {
      flex: 1,
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.3s',
      backgroundColor: 'white'
    },
    radioLabelSelected: {
      borderColor: '#6366f1',
      backgroundColor: '#f0f7ff',
      fontWeight: '600'
    },
    button: {
      padding: '12px 24px',
      backgroundColor: '#6366f1',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'background-color 0.3s'
    },
    alert: {
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    alertSuccess: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    alertError: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    legalNotice: {
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '12px',
      padding: '25px',
      marginBottom: '30px'
    },
    legalHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    },
    legalIcon: {
      fontSize: '28px'
    },
    legalTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      margin: 0
    },
    legalContent: {
      display: 'grid',
      gap: '20px',
      marginBottom: '20px'
    },
    legalSection: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px'
    },
    legalSectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px',
      fontSize: '15px'
    },
    legalList: {
      margin: 0,
      paddingLeft: '20px',
      color: '#333'
    },
    legalWarning: {
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#856404',
      borderLeft: '4px solid #ffc107'
    },
    requestList: {
      display: 'grid',
      gap: '15px'
    },
    requestCard: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e0e0e0'
    },
    requestHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '15px'
    },
    requestInfo: {
      display: 'grid',
      gap: '8px',
      fontSize: '14px',
      color: '#666666'
    },
    badge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    },
    badgeSent: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2'
    },
    badgeResponded: {
      backgroundColor: '#e8f5e9',
      color: '#388e3c'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#999999'
    },
    emptyIcon: {
      opacity: 0.3,
      marginBottom: '20px'
    }

  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Star size={28} />
          네이버 리뷰 관리
        </h1>
        <p style={styles.subtitle}>
          환자분들께 정중하게 리뷰를 요청하고 병원의 온라인 평판을 관리하세요.
        </p>
      </div>

      {/* 메시지 알림 */}
      {message.text && (
        <div style={{
          ...styles.alert,
          ...(message.type === 'success' ? styles.alertSuccess : styles.alertError)
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* 🔥 네이버 플레이스 URL 설정 */}
      <div style={styles.urlSection}>
        <h3 style={styles.urlSectionTitle}>
          <LinkIcon size={20} />
          네이버 플레이스 연결
        </h3>

        {/* ✨ 기능 안내 박스 */}
        <div style={styles.featureInfoBox}>
          <div style={styles.featureAvailable}>
            <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#10b981', fontSize: '14px' }}>✅ 이용 가능</strong>
              <ul style={styles.featureList}>
                <li>리뷰 요청 메시지 전송</li>
                <li>리뷰 알림 받기</li>
              </ul>
            </div>
          </div>

          <div style={styles.featureUnavailable}>
            <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#f59e0b', fontSize: '14px' }}>❌ 네이버 앱에서 관리</strong>
              <ul style={styles.featureList}>
                <li>리뷰 답글 달기</li>
                <li>리뷰 삭제 요청</li>
                <li>평점 관리</li>
              </ul>
              <div style={{ fontSize: '11px', color: '#78716c', marginTop: '6px' }}>
                * 리뷰 관리는 네이버 플레이스 앱에서 진행하세요
              </div>
            </div>
          </div>
        </div>

        <div style={styles.urlInputGroup}>
          <input
            type="text"
            value={naverPlaceUrl}
            onChange={(e) => setNaverPlaceUrl(e.target.value)}
            placeholder="https://map.naver.com/p/entry/place/13491210"
            style={styles.urlInput}
          />
          <button
            onClick={saveNaverPlaceUrl}
            disabled={!naverPlaceUrl || savingUrl}
            style={{
              ...styles.saveButton,
              ...((!naverPlaceUrl || savingUrl) && styles.saveButtonDisabled)
            }}
          >
            {urlSaved ? (
              <>
                <CheckCircle size={18} />
                저장됨
              </>
            ) : (
              <>
                <Save size={18} />
                {savingUrl ? '저장 중...' : 'URL 저장'}
              </>
            )}
          </button>
        </div>

        {reviewLink && (
          <div style={styles.reviewLinkBox}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', fontWeight: '600' }}>
                📝 생성된 리뷰 작성 링크:
              </div>
              <div style={styles.reviewLinkText}>{reviewLink}</div>
            </div>
            <button
              onClick={() => copyToClipboard(reviewLink)}
              style={styles.copyButton}
            >
              <Copy size={14} />
              복사
            </button>
            <a
              href={reviewLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...styles.copyButton,
                backgroundColor: '#6366f1',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} />
              열기
            </a>
          </div>
        )}

        <div style={styles.urlHelp}>
          <strong>💡 URL 찾는 방법:</strong>
          <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>네이버 지도에서 병원 검색</li>
            <li>병원 상세 페이지 URL 복사</li>
            <li>여기에 붙여넣기 후 저장</li>
          </ol>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
            예시: https://map.naver.com/p/entry/place/13491210
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Send size={24} color="#6366f1" />
          </div>
          <div style={styles.statValue}>{statistics.totalSent}</div>
          <div style={styles.statLabel}>총 요청 건수</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <MessageSquare size={24} color="#10b981" />
          </div>
          <div style={styles.statValue}>{statistics.totalResponses}</div>
          <div style={styles.statLabel}>리뷰 응답</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <TrendingUp size={24} color="#f59e0b" />
          </div>
          <div style={styles.statValue}>{statistics.responseRate}%</div>
          <div style={styles.statLabel}>응답률</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Star size={24} color="#f59e0b" />
          </div>
          <div style={styles.statValue}>{statistics.averageRating}</div>
          <div style={styles.statLabel}>평균 평점</div>
        </div>
      </div>

      {/* 법적 주의사항 */}
      <div style={styles.legalNotice}>
        <div style={styles.legalHeader}>
          <div style={styles.legalIcon}>⚖️</div>
          <h3 style={styles.legalTitle}>리뷰 요청 시 주의사항</h3>
        </div>

        <div style={styles.legalContent}>
          <div style={styles.legalSection}>
            <div style={styles.legalSectionTitle}>
              <CheckCircle size={16} color="#4CAF50" />
              <strong>✅ 합법적인 사용</strong>
            </div>
            <ul style={styles.legalList}>
              <li style={{ marginBottom: '8px' }}>실제로 진료받은 환자에게만 요청</li>
              <li style={{ marginBottom: '8px' }}>정중하고 순수한 리뷰 요청</li>
              <li style={{ marginBottom: '8px' }}>솔직한 후기 작성 장려</li>
              <li>개인정보 동의 받은 연락처만 사용</li>
            </ul>
          </div>

          <div style={styles.legalSection}>
            <div style={styles.legalSectionTitle}>
              <X size={16} color="#f44336" />
              <strong>❌ 절대 금지 (불법)</strong>
            </div>
            <ul style={styles.legalList}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f44336' }}>금전/혜택 제공 금지</strong> - "리뷰 쓰면 할인" 등</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f44336' }}>허위 리뷰 유도 금지</strong> - "좋은 내용만" 등</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#f44336' }}>강요/압박 금지</strong> - 반복적 독촉 등</li>
              <li><strong style={{ color: '#f44336' }}>무단 개인정보 사용 금지</strong></li>
            </ul>
          </div>
        </div>

        <div style={styles.legalWarning}>
          ⚠️ 위반 시 <strong>부정청탁금지법, 표시광고법, 개인정보보호법</strong> 등에 저촉될 수 있습니다.
        </div>
      </div>

      {/* 리뷰 요청 보내기 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Send size={24} />
          새 리뷰 요청 보내기
        </h2>

        <div style={styles.formGrid}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                환자명<span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={newRequest.patientName}
                onChange={(e) => setNewRequest({ ...newRequest, patientName: e.target.value })}
                placeholder="홍길동"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                연락처<span style={styles.required}>*</span>
              </label>
              <input
                type="tel"
                value={newRequest.patientPhone}
                onChange={(e) => setNewRequest({ ...newRequest, patientPhone: e.target.value })}
                placeholder="010-1234-5678"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>이메일 (선택)</label>
              <input
                type="email"
                value={newRequest.patientEmail}
                onChange={(e) => setNewRequest({ ...newRequest, patientEmail: e.target.value })}
                placeholder="example@email.com"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>진료 종류</label>
              <select
                value={newRequest.treatmentType}
                onChange={(e) => setNewRequest({ ...newRequest, treatmentType: e.target.value })}
                style={styles.select}
              >
                <option value="">선택하세요</option>
                {treatmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>전송 방법</label>
            <div style={styles.radioGroup}>
              <label
                style={{
                  ...styles.radioLabel,
                  ...(newRequest.sendMethod === 'sms' ? styles.radioLabelSelected : {})
                }}
              >
                <input
                  type="radio"
                  name="sendMethod"
                  value="sms"
                  checked={newRequest.sendMethod === 'sms'}
                  onChange={(e) => setNewRequest({ ...newRequest, sendMethod: e.target.value })}
                  style={{ display: 'none' }}
                />
                <Phone size={16} />
                SMS
              </label>

              <label
                style={{
                  ...styles.radioLabel,
                  ...(newRequest.sendMethod === 'email' ? styles.radioLabelSelected : {})
                }}
              >
                <input
                  type="radio"
                  name="sendMethod"
                  value="email"
                  checked={newRequest.sendMethod === 'email'}
                  onChange={(e) => setNewRequest({ ...newRequest, sendMethod: e.target.value })}
                  style={{ display: 'none' }}
                />
                <Mail size={16} />
                이메일
              </label>

              <label
                style={{
                  ...styles.radioLabel,
                  ...(newRequest.sendMethod === 'kakao' ? styles.radioLabelSelected : {})
                }}
              >
                <input
                  type="radio"
                  name="sendMethod"
                  value="kakao"
                  checked={newRequest.sendMethod === 'kakao'}
                  onChange={(e) => setNewRequest({ ...newRequest, sendMethod: e.target.value })}
                  style={{ display: 'none' }}
                />
                <MessageSquare size={16} />
                카카오톡
              </label>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              메시지 내용
              <button
                style={{
                  marginLeft: '10px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => copyToClipboard(getMessageTemplate())}
              >
                <Copy size={12} style={{ display: 'inline', marginRight: '4px' }} />
                템플릿 복사
              </button>
            </label>
            <textarea
              value={newRequest.customMessage}
              onChange={(e) => setNewRequest({ ...newRequest, customMessage: e.target.value })}
              placeholder={getMessageTemplate()}
              style={styles.textarea}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              style={styles.button}
              onClick={handleSendReviewRequest}
            >
              <Send size={18} />
              요청 전송
            </button>
          </div>
        </div>
      </div>

      {/* 리뷰 요청 내역 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <BarChart3 size={24} />
          요청 내역
        </h2>

        {loading ? (
          <div style={styles.emptyState}>
            <p>로딩 중...</p>
          </div>
        ) : reviewRequests.length === 0 ? (
          <div style={styles.emptyState}>
            <MessageSquare size={64} style={styles.emptyIcon} />
            <h3>아직 요청 내역이 없습니다</h3>
            <p>첫 번째 리뷰 요청을 보내보세요!</p>
          </div>
        ) : (
          <div style={styles.requestList}>
            {reviewRequests.map(request => (
              <div key={request.id} style={styles.requestCard}>
                <div style={styles.requestHeader}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                      {request.patientName}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#999999' }}>
                      {formatDate(request.createdAt)}
                    </div>
                  </div>
                  <div style={{
                    ...styles.badge,
                    ...(request.hasResponded ? styles.badgeResponded : styles.badgeSent)
                  }}>
                    {request.hasResponded ? '✓ 응답 완료' : '전송 완료'}
                  </div>
                </div>

                <div style={styles.requestInfo}>
                  <div>📞 {request.patientPhone}</div>
                  {request.patientEmail && <div>📧 {request.patientEmail}</div>}
                  {request.treatmentType && <div>💊 {request.treatmentType}</div>}
                  <div>
                    📤 전송 방법: {
                      request.sendMethod === 'sms' ? 'SMS' :
                        request.sendMethod === 'email' ? '이메일' :
                          '카카오톡'
                    }
                  </div>
                  {request.hasResponded && request.rating > 0 && (
                    <div style={{ color: '#4CAF50', fontWeight: '600' }}>
                      ⭐ 평점: {request.rating}/5
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NaverReviewManager;