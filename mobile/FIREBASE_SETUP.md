# Firebase 설정 가이드

React Native 앱에서 Firebase를 사용하기 위해 필요한 설정 파일들을 추가해야 합니다.

## 🔥 Firebase Console 설정

### 1. Firebase Console 접속
```
https://console.firebase.google.com
```
→ 기존 웹 앱과 **같은 프로젝트** 선택

---

## 📱 iOS 앱 추가

### 1. iOS 앱 등록

1. **프로젝트 개요** → **iOS 앱 추가** (⊕ 아이콘) 클릭
2. 앱 정보 입력:
   - **Apple 번들 ID**: `com.dentalsystemmobile`
   - **앱 닉네임**: `Dental Lab Mobile`
   - **App Store ID**: (선택사항, 배포 시 추가)
3. **앱 등록** 클릭

### 2. GoogleService-Info.plist 다운로드

1. **GoogleService-Info.plist** 파일 다운로드
2. 파일을 iOS 프로젝트로 복사:

```bash
cp ~/Downloads/GoogleService-Info.plist ~/dental-lab-system/mobile/ios/DentalLabMobile/
```

### 3. Xcode에서 파일 추가 (중요!)

```bash
# Xcode 워크스페이스 열기
cd ~/dental-lab-system/mobile/ios
open DentalLabMobile.xcworkspace
```

Xcode에서:
1. 좌측 파일 트리에서 **DentalLabMobile** 폴더 우클릭
2. **Add Files to "DentalLabMobile"** 선택
3. `GoogleService-Info.plist` 선택
4. ✅ **Copy items if needed** 체크
5. **Add** 클릭

---

## 🤖 Android 앱 추가

### 1. Android 앱 등록

1. **프로젝트 개요** → **Android 앱 추가** (⊕ 아이콘) 클릭
2. 앱 정보 입력:
   - **Android 패키지 이름**: `com.dentalsystemmobile`
   - **앱 닉네임**: `Dental Lab Mobile`
   - **디버그 서명 인증서 SHA-1**: (선택사항)
3. **앱 등록** 클릭

### 2. google-services.json 다운로드

1. **google-services.json** 파일 다운로드
2. 파일을 Android 프로젝트로 복사:

```bash
cp ~/Downloads/google-services.json ~/dental-lab-system/mobile/android/app/
```

---

## ✅ 설정 완료 확인

### 파일 위치 확인

```bash
cd ~/dental-lab-system/mobile

# iOS 파일 확인
ls -la ios/DentalLabMobile/GoogleService-Info.plist

# Android 파일 확인
ls -la android/app/google-services.json
```

### Firebase 기능 테스트

앱을 실행하고 Firebase Console에서 실시간 데이터를 확인하세요:
- **Authentication** → 사용자 로그인 확인
- **Firestore** → 데이터 읽기/쓰기 확인
- **Analytics** (선택사항) → 앱 사용 통계 확인

---

## 🚨 중요 사항

### 보안
- ✅ `GoogleService-Info.plist`와 `google-services.json`은 `.gitignore`에 추가되어 있습니다
- ✅ 이 파일들은 **절대 Git에 커밋하지 마세요**
- ✅ 팀원들은 각자 Firebase Console에서 파일을 다운로드해야 합니다

### 템플릿 파일
- `GoogleService-Info.plist.template` - iOS 템플릿 (참고용)
- `google-services.json.template` - Android 템플릿 (참고용)
- 이 템플릿 파일들은 Git에 커밋되어 있습니다

---

## 🔧 Gradle 설정 (이미 완료됨)

다음 설정들은 이미 적용되어 있습니다:

**android/build.gradle** (프로젝트 레벨):
```gradle
dependencies {
    classpath("com.google.gms:google-services:4.4.0")
}
```

**android/app/build.gradle** (앱 레벨):
```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## 📞 문제 해결

### iOS 빌드 오류
```bash
cd ios
pod install
cd ..
npm run ios
```

### Android 빌드 오류
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Firebase 연결 안 됨
1. Firebase Console에서 앱이 올바르게 등록되었는지 확인
2. 번들 ID / 패키지 이름이 정확한지 확인:
   - iOS: `com.dentalsystemmobile`
   - Android: `com.dentalsystemmobile`
3. 설정 파일이 올바른 위치에 있는지 확인

---

완료되었으면 앱을 실행하세요:
```bash
# iOS
npm run ios

# Android
npm run android
```
