# GitHub Pages 배포 가이드

이 프로젝트를 GitHub Pages에 배포하는 방법을 안내합니다.

## 사전 준비

1. GitHub 계정과 저장소가 필요합니다
2. 저장소는 public이어야 합니다 (또는 GitHub Pro 계정)

## 배포 단계

### 1. 저장소 설정

```bash
# 저장소 클론
git clone https://github.com/username/your-repo-name.git
cd your-repo-name

# 의존성 설치
npm install
```

### 2. GitHub Pages 활성화

1. GitHub 저장소 페이지로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Pages** 선택
4. **Source**를 "GitHub Actions"로 설정

### 3. 자동 배포

GitHub Actions 워크플로우가 이미 설정되어 있습니다:
- `.github/workflows/deploy.yml`

main 브랜치에 코드를 푸시하면 자동으로:
1. 의존성을 설치합니다
2. 정적 사이트를 빌드합니다
3. GitHub Pages에 배포합니다

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### 4. 배포 확인

1. **Actions** 탭에서 배포 진행 상황 확인
2. 완료 후 `https://username.github.io/repo-name/`에서 사이트 확인

## 빌드 스크립트

`build-static.js`는 GitHub Pages용 정적 사이트를 생성합니다:

- React 앱을 정적 HTML/CSS/JS로 빌드
- 상대 경로 사용으로 서브디렉토리 배포 지원
- 프로덕션 최적화 적용

## 문제 해결

### 빌드 실패
- Actions 탭에서 에러 로그 확인
- 의존성 버전 충돌 체크
- Node.js 버전 호환성 확인

### 사이트 접속 불가
- GitHub Pages 설정 재확인
- 저장소가 public인지 확인
- DNS 전파 대기 (최대 10분)

### 이미지 로딩 실패
- 상대 경로 설정 확인
- 빌드된 파일에서 경로 검증

## 커스텀 도메인 (선택사항)

1. 저장소 루트에 `CNAME` 파일 생성
2. 파일에 커스텀 도메인 입력: `example.com`
3. DNS 설정에서 CNAME 레코드 추가

## 성능 최적화

GitHub Pages에서 최적의 성능을 위해:
- 이미지 파일 크기 최소화
- 불필요한 의존성 제거
- 코드 분할 및 지연 로딩 활용