# DentConnect 모바일 앱 (React Native)

치과-기공소 연결 플랫폼의 React Native 모바일 앱입니다.

## 새로운 홈화면 구조

### 5개 하단 네비게이션 탭

1. **홈** - 대시보드 및 퀵 액세스
2. **주문** - 의뢰서 관리
3. **채팅** - 실시간 메시징 (배지 지원)
4. **마켓** - 마켓플레이스
5. **마이** - 프로필 및 설정

## 파일 구조

```
mobile/
├── navigation/
│   └── AppNavigator.js          # 메인 네비게이션 (5개 탭)
│
├── screens/
│   ├── HomeScreen.js             # 홈 화면 (대시보드)
│   ├── OrderListScreen.js        # 주문 목록
│   ├── CreateOrderScreen.js      # 의뢰서 작성
│   ├── ChatListScreen.js         # 채팅 목록
│   ├── ChatRoomScreen.js         # 채팅방 (새로 추가)
│   ├── ProfileScreen.js          # 프로필
│   ├── MarketplaceScreen.js      # 마켓플레이스 (새로 추가)
│   ├── ProductDetailScreen.js    # 상품 상세 (새로 추가)
│   ├── CartScreen.js             # 장바구니 (새로 추가)
│   ├── LoginScreen.js            # 로그인
│   └── RegisterScreen.js         # 회원가입
│
└── README.md
```

## 주요 변경사항

### 1. AppNavigator.js
- **5개 탭**: 홈, 주문, 채팅, 마켓플레이스, 마이
- **채팅 배지**: 미읽은 메시지 수 표시
- **커스텀 아이콘**: Material Community Icons 사용
- **스택 네비게이션**: 각 탭마다 독립적인 스택

### 2. 새로운 화면

#### MarketplaceScreen.js
- 제품 검색 및 필터링
- 카테고리 선택
- 그리드 레이아웃 (2열)
- 장바구니 바로가기

#### ProductDetailScreen.js
- 제품 이미지 슬라이더
- 상세 정보 및 특징
- 판매자 정보
- 수량 선택 및 구매

#### CartScreen.js
- 장바구니 관리
- 제품 선택/해제
- 수량 조절
- 결제 금액 계산

#### ChatRoomScreen.js
- 실시간 메시징
- 날짜 구분
- 메시지 전송
- 키보드 회피

## 사용 방법

### 1. 웹 프로젝트에 통합

기존 React 웹 프로젝트와 분리된 React Native 모바일 앱입니다.

```bash
# React Native 프로젝트 초기화 (아직 없는 경우)
npx react-native init DentalLabMobile

# 이 파일들을 React Native 프로젝트에 복사
cp -r mobile/navigation DentalLabMobile/src/
cp -r mobile/screens DentalLabMobile/src/
```

### 2. 필요한 패키지 설치

```bash
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-vector-icons
```

#### iOS 추가 설정
```bash
cd ios && pod install && cd ..
```

### 3. App.js 수정

```javascript
import React, { useState, useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { auth } from './src/firebase/config';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Firebase 인증 상태 감지
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });

    return unsubscribe;
  }, []);

  return (
    <AppNavigator
      isAuthenticated={isAuthenticated}
      unreadCount={unreadCount}
    />
  );
}
```

## 스타일 가이드

### 색상
- Primary: `#6366f1` (인디고)
- Success: `#10b981` (초록)
- Warning: `#f59e0b` (주황)
- Danger: `#ef4444` (빨강)
- Background: `#f8fafc` (연한 회색)

### 폰트 크기
- 제목: 24-28px
- 본문: 14-16px
- 캡션: 11-13px

### 간격
- 기본 패딩: 16px
- 카드 간격: 12px
- 섹션 간격: 24px

## Firebase 연동

각 화면에서 Firebase 데이터 로딩 로직을 추가해야 합니다:

```javascript
// MarketplaceScreen.js
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

const loadProducts = async () => {
  const productsQuery = query(
    collection(db, 'products'),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(productsQuery);
  const productsData = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setProducts(productsData);
};
```

## 알려진 이슈

1. **채팅 배지**: 실제 미읽은 메시지 수는 Firebase에서 가져와야 합니다.
2. **이미지**: placeholder 이미지를 실제 이미지로 교체해야 합니다.
3. **결제 기능**: 실제 결제 연동이 필요합니다.

## 다음 단계

1. Firebase 인증 연동
2. Firestore 데이터 CRUD 구현
3. 푸시 알림 설정
4. 이미지 업로드 기능
5. 실시간 채팅 구현
6. 결제 시스템 연동

## 라이선스

MIT
