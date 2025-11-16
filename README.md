# 치과기공의뢰서 관리 시스템

치과 기공소와 치과 병원 간의 의뢰서 관리, 마켓플레이스, 커뮤니티 기능을 제공하는 통합 관리 시스템입니다.

## 주요 기능

### 1. 의뢰서 관리
- 치과 기공 의뢰서 생성 및 관리
- 의뢰서 목록 조회 및 검색
- 의뢰 상태 추적 (접수, 제작중, 완료 등)
- PDF 출력 기능

### 2. 대시보드 및 통계
- 주문 현황 대시보드
- 매출 통계 및 분석
- 거래명세서 관리
- 자동 정산 시스템

### 3. 마켓플레이스
- 치과 기공 제품 판매/구매
- 판매자 등록 및 관리
- 제품 등록 및 관리
- 장바구니 및 결제 시스템
- 중고 거래 기능

### 4. 커뮤니티
- 구인구직 게시판
- 신제품 소개
- 세미나 정보
- 기공소 디렉토리
- 광고 관리

### 5. 소통 기능
- 실시간 채팅 시스템
- 알림 시스템
- 네이버 리뷰 관리

### 6. 관리 기능
- 회원 관리 (개인/업체)
- 직원 관리
- 프로필 관리
- 관리자 승인 시스템

## 시작하기

### 필수 요구사항

- Node.js (v14 이상)
- npm 또는 yarn
- Firebase 프로젝트 (Firestore, Authentication, Storage)

### 설치 방법

1. **저장소 클론**
```bash
git clone [repository-url]
cd dental-lab-system
```

2. **의존성 설치**
```bash
npm install
```

3. **Firebase 설정**

Firebase Console에서 프로젝트를 생성하고 다음 서비스를 활성화하세요:
- Authentication (이메일/비밀번호 로그인)
- Cloud Firestore
- Cloud Storage

Firebase 설정 정보를 얻는 방법:
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 설정 > 일반 > 내 앱 > 웹 앱 추가
3. Firebase SDK 스니펫에서 구성 정보 복사

설정 파일 생성:
```bash
cp src/firebase/config.example.js src/firebase/config.js
```

`src/firebase/config.js` 파일을 열어 실제 Firebase 프로젝트 정보로 수정:
```javascript
const firebaseConfig = {
  apiKey: "실제_API_키",
  authDomain: "프로젝트ID.firebaseapp.com",
  projectId: "실제_프로젝트_ID",
  storageBucket: "프로젝트ID.appspot.com",
  messagingSenderId: "실제_메시징_센더_ID",
  appId: "실제_앱_ID"
};
```

4. **Firestore 데이터베이스 규칙 설정**

Firebase Console > Firestore Database에서 규칙을 설정하세요:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 읽기/쓰기 가능
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Storage 규칙 설정**

Firebase Console > Storage에서 규칙을 설정하세요:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 실행 방법

**개발 모드 실행**
```bash
npm start
```
브라우저에서 http://localhost:3000 으로 접속

**프로덕션 빌드**
```bash
npm run build
```

**Firebase 배포**
```bash
# Firebase CLI 설치 (최초 1회)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# Firebase 프로젝트 초기화
firebase init

# 배포
npm run deploy
```

## 사용 방법

### 1. 회원가입 및 로그인

1. 앱 접속 후 "회원가입" 클릭
2. 개인 또는 업체 회원 선택
3. 필수 정보 입력 (이메일, 비밀번호, 사업자 정보 등)
4. 이메일로 받은 인증 링크 클릭
5. 로그인하여 서비스 이용

### 2. 의뢰서 생성

1. 로그인 후 대시보드에서 "새 의뢰서 작성" 클릭
2. 환자 정보 입력
3. 의뢰 항목 선택 (크라운, 브릿지, 임플란트 등)
4. 제작 요청사항 입력
5. 필요 시 파일 첨부 (스캔 파일, 사진 등)
6. 제출 버튼 클릭

### 3. 의뢰서 관리

- **목록 보기**: 사이드바에서 "주문 관리" 클릭
- **검색**: 환자명, 주문번호로 검색 가능
- **상태 필터**: 전체/진행중/완료 등으로 필터링
- **상세 보기**: 의뢰서 클릭하여 상세 정보 확인
- **PDF 출력**: 의뢰서 상세 페이지에서 "PDF 다운로드" 클릭

### 4. 마켓플레이스 이용

**구매자**
1. "마켓플레이스" 메뉴 클릭
2. 원하는 제품 검색 및 선택
3. "장바구니 담기" 또는 "바로 구매"
4. 결제 정보 입력 후 결제

**판매자**
1. "판매자 신청" 메뉴에서 판매자 등록
2. 관리자 승인 대기
3. 승인 후 "제품 등록" 메뉴에서 제품 등록
4. "판매 관리" 메뉴에서 주문 확인 및 발송 처리

### 5. 커뮤니티 이용

- **구인구직**: 채용 공고 등록 및 지원
- **신제품**: 새로운 제품 및 기술 정보 공유
- **세미나**: 교육 및 세미나 정보 확인
- **기공소 찾기**: 지역별 기공소 검색

### 6. 관리자 기능

관리자 계정으로 로그인 시:
- 회원 승인 및 관리
- 판매자/제품 승인
- 광고 승인
- 게시물 관리
- 통계 및 분석

## 프로젝트 구조

```
dental-lab-system/
├── public/              # 정적 파일
│   └── index.html
├── src/
│   ├── components/      # React 컴포넌트
│   │   ├── Dashboard.js
│   │   ├── CreateOrder.js
│   │   ├── OrderList.js
│   │   └── ...
│   ├── context/         # React Context (인증 등)
│   │   └── AuthContext.js
│   ├── services/        # 서비스 레이어
│   │   ├── PaymentService.js
│   │   └── NotificationSystem.js
│   ├── firebase/        # Firebase 설정
│   │   ├── config.js    # Firebase 설정 (gitignore)
│   │   └── config.example.js
│   ├── styles/          # 스타일 파일
│   ├── App.js           # 메인 앱 컴포넌트
│   ├── App.css
│   └── index.js         # 진입점
├── package.json
└── README.md
```

## 주요 라이브러리

- **React 19**: UI 프레임워크
- **React Router**: 라우팅
- **Firebase**: 백엔드 서비스 (인증, 데이터베이스, 스토리지)
- **jsPDF**: PDF 생성
- **html2canvas**: 화면 캡처
- **Recharts**: 차트 및 그래프
- **date-fns**: 날짜 처리
- **QRCode**: QR 코드 생성
- **Toss Payments**: 결제 시스템

## 문제 해결

### Firebase 연결 오류
- `src/firebase/config.js` 파일이 올바르게 설정되었는지 확인
- Firebase Console에서 프로젝트가 활성화되어 있는지 확인
- 네트워크 연결 상태 확인

### 빌드 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 권한 오류
- Firebase Console에서 Firestore 및 Storage 규칙 확인
- 사용자 인증 상태 확인

## 개발 환경 설정

### VS Code 추천 확장 프로그램
- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets
- Firebase Explorer

### 코드 포맷팅
```bash
# Prettier 설치
npm install --save-dev prettier

# 포맷팅 실행
npx prettier --write "src/**/*.{js,jsx,json,css}"
```

## 테스트

```bash
# 테스트 실행
npm test

# 커버리지 확인
npm test -- --coverage
```

## 배포

### Firebase Hosting
```bash
npm run deploy
```

### 기타 호스팅 서비스
빌드 후 `build` 폴더를 호스팅 서비스에 업로드

## 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 지원 및 문의

문제가 발생하거나 문의사항이 있으시면 프로젝트 관리자에게 연락해주세요.

---

**중요**: `src/firebase/config.js` 파일은 절대 공개 저장소에 업로드하지 마세요. API 키와 같은 민감한 정보가 포함되어 있습니다.
