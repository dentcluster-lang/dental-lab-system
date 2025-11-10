# Dental Lab Mobile App 📱

치과 기공소 관리 시스템의 모바일 애플리케이션입니다.

## 📋 주요 기능

### ✅ 구현 완료된 기능
- 🔐 **로그인/회원가입** - Firebase Authentication
- 🏠 **홈 화면** - 네모 아이콘 그리드 메뉴
- 📝 **의뢰서 작성** - 실시간 주문 생성
- 📋 **의뢰서 목록** - 상태별 필터링 및 조회
- 💬 **채팅** - 실시간 메시징 (스켈레톤)
- 👤 **프로필** - 사용자 정보 및 설정

### 🚧 구현 예정 기능
- 🛒 마켓플레이스
- 💼 구인/구직
- 🎓 세미나
- ♻️ 중고 물품
- 📊 통계
- 📄 거래명세서
- 🔔 푸시 알림

## 🏗️ 프로젝트 구조

```
mobile/
├── src/
│   ├── screens/          # 화면 컴포넌트
│   │   ├── HomeScreen.js
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── OrderListScreen.js
│   │   ├── CreateOrderScreen.js
│   │   ├── ChatListScreen.js
│   │   └── ProfileScreen.js
│   ├── navigation/        # 네비게이션 설정
│   │   └── AppNavigator.js
│   ├── components/        # 재사용 컴포넌트
│   ├── services/          # 비즈니스 로직
│   ├── config/            # 설정 파일
│   │   └── firebase.js
│   └── assets/            # 이미지, 폰트 등
├── App.js                 # 메인 앱 컴포넌트
├── index.js               # 앱 엔트리 포인트
└── package.json           # 의존성 관리
```

## 🚀 시작하기

### 1. 사전 요구사항

- Node.js (v18 이상)
- npm 또는 yarn
- React Native 개발 환경 설정
  - Android: Android Studio + SDK
  - iOS: Xcode (Mac만 해당)

### 2. 설치

```bash
# mobile 폴더로 이동
cd mobile

# 의존성 설치
npm install

# iOS 의존성 설치 (Mac만 해당)
cd ios && pod install && cd ..
```

### 3. Firebase 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일을 열어 Firebase 설정 입력
# 웹 앱과 동일한 Firebase 프로젝트 사용
```

**.env 파일 예시:**
```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. 실행

```bash
# Metro 번들러 시작
npm start

# Android 실행 (새 터미널)
npm run android

# iOS 실행 (Mac만 해당, 새 터미널)
npm run ios
```

## 🔧 개발 가이드

### 화면 추가하기

1. `src/screens/` 에 새 화면 컴포넌트 생성
2. `src/navigation/AppNavigator.js` 에 라우트 추가

### Firebase 데이터 연동

웹 앱과 동일한 Firestore 컬렉션 사용:
- `users` - 사용자 정보
- `orders` - 의뢰서
- `chatRooms` - 채팅방
- `messages` - 채팅 메시지

### 스타일링 가이드

웹 앱과 동일한 디자인 시스템 사용:
- 주요 색상: `#6366f1` (인디고)
- 배경색: `#f8fafc`
- 텍스트: `#0f172a`

## 📱 네비게이션 구조

```
인증되지 않음:
  ├─ Login
  └─ Register

인증됨 (하단 탭):
  ├─ Home (홈)
  │   └─ HomeMain
  ├─ Orders (의뢰서)
  │   ├─ OrderList
  │   └─ CreateOrder
  ├─ Chat (채팅)
  │   └─ ChatList
  └─ Profile (마이)
      └─ ProfileMain
```

## 🔥 Firebase 서비스

- **Authentication**: 이메일/비밀번호 로그인
- **Firestore**: 실시간 데이터베이스
- **Storage**: 파일 업로드 (이미지 등)
- **Messaging**: 푸시 알림 (예정)

## 🐛 문제 해결

### Metro 번들러 캐시 초기화

```bash
npm start -- --reset-cache
```

### Android 빌드 초기화

```bash
cd android && ./gradlew clean && cd ..
```

### iOS 빌드 초기화

```bash
cd ios && pod install && cd ..
```

## 📝 개발 노트

### 완료된 작업
✅ 프로젝트 구조 생성
✅ Firebase 설정 및 연동
✅ 네비게이션 구조 (탭 + 스택)
✅ 홈 화면 UI (네모 아이콘 그리드)
✅ 로그인/회원가입 화면
✅ 의뢰서 작성/목록 화면
✅ 채팅 리스트 화면
✅ 프로필 화면

### 다음 단계
🚧 마켓플레이스 화면
🚧 구인공고/세미나 화면
🚧 거래명세서/통계 화면
🚧 푸시 알림 설정
🚧 이미지 업로드 기능
🚧 오프라인 모드

## 📞 문의

문제가 발생하면 이슈를 등록해주세요.

---

**웹 버전과 동일한 Firebase 프로젝트를 사용하여 데이터가 실시간으로 동기화됩니다!** 🎉
