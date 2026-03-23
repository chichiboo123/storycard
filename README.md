
# 상상이상의 카드 - 창작 스토리텔링 앱

한국어 기반의 인터랙티브 카드 스토리텔링 웹 애플리케이션입니다. 사용자가 랜덤 카드를 뒤집어 이미지를 확인하고, 이를 바탕으로 창의적인 이야기를 작성할 수 있습니다.

## 주요 기능

- **랜덤 카드 생성**: 1~30장의 파스텔 색상 카드 생성
- **이중 이미지 소스**: 실물사진(Picsum) 또는 일러스트(37개 내장) 선택 가능
- **인터랙티브 카드 뒤집기**: 클릭으로 카드 내용 확인
- **이야기 작성**: 뒤집힌 카드를 바탕으로 자유로운 창작
- **다중 내보내기**: TXT 및 JPG 형태로 작품 저장
- **반응형 디자인**: 모든 기기에서 최적화된 사용자 경험

## 기술 스택

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **빌드 도구**: Vite
- **이미지 처리**: html2canvas
- **라우팅**: Wouter
- **폰트**: Noto Sans KR, Do Hyeon
- **백엔드**: Express.js (개발 환경)

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (포트 5000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview
```

개발 서버는 `http://localhost:5000`에서 실행됩니다.

## GitHub Pages 배포

### 자동 배포 (권장)

1. GitHub 저장소의 **Settings** > **Pages**로 이동
2. **Source**를 "GitHub Actions"로 선택
3. `main` 브랜치에 푸시하면 자동으로 배포됩니다

GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 자동으로:
- 의존성을 설치하고
- 정적 사이트를 빌드하며
- GitHub Pages에 배포합니다

### 수동 배포

```bash
# 정적 사이트 빌드
node build-static.js

# dist 폴더의 내용을 GitHub Pages에 배포
```

배포된 사이트는 `https://[username].github.io/[repo-name]/`에서 확인할 수 있습니다.

## 프로젝트 구조

```
├── .github/workflows/     # GitHub Actions 배포 설정
├── client/                # 프론트엔드 소스
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   │   ├── ui/       # shadcn/ui 컴포넌트
│   │   │   ├── card-generator.tsx
│   │   │   ├── story-card.tsx
│   │   │   └── story-writer.tsx
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── lib/          # 유틸리티 함수
│   │   ├── assets/       # 일러스트 이미지 (37개)
│   │   └── hooks/        # React 커스텀 훅
├── server/               # Express 서버 (개발용)
├── build-static.js       # GitHub Pages 정적 빌드 스크립트
└── README.md
```

## 사용법

1. **카드 개수 설정**: 1~30 사이의 숫자 입력
2. **이미지 타입 선택**: 
   - 실물사진만: Picsum 랜덤 이미지 사용
   - 일러스트만: 내장된 일러스트 이미지 사용
   - 둘 다: 랜덤하게 섞여서 표시
3. **카드 생성**: "카드 만들기" 버튼 클릭
4. **카드 뒤집기**: 원하는 카드를 클릭하여 이미지 확인
5. **이야기 작성**: 텍스트 영역에 창의적인 이야기 작성
6. **저장**: 
   - **TXT로 저장**: 이야기 텍스트만 다운로드
   - **JPG로 저장**: 카드와 이야기를 포함한 전체 화면 캡처

## 이미지 소스

- **실물사진**: [Picsum Photos](https://picsum.photos/) - 고품질 무료 랜덤 이미지
- **일러스트**: 프로젝트 내장 일러스트 이미지 37개

## 환경 설정

프로젝트는 다음 설정 파일들을 사용합니다:

- `vite.config.ts`: Vite 기본 설정 (개발/프로덕션)
- `vite.config.gh-pages.ts`: GitHub Pages 전용 빌드 설정
- `tailwind.config.ts`: Tailwind CSS 설정
- `tsconfig.json`: TypeScript 설정

## 라이선스

MIT License

## 개발자

교육뮤지컬 꿈꾸는 치수쌤

---

## 문제 해결

### GitHub Pages 배포가 안 될 때

1. GitHub 저장소가 **public**인지 확인
2. Settings > Pages에서 Source가 "GitHub Actions"로 설정되어 있는지 확인
3. Actions 탭에서 워크플로우 실행 상태 확인

### 로컬 개발 시 포트 충돌

기본 포트 5000이 사용 중이면 Vite가 자동으로 다른 포트를 할당합니다. 콘솔 메시지를 확인하세요.

### 이미지가 로드되지 않을 때

- 실물사진: 인터넷 연결 확인 (Picsum은 외부 API)
- 일러스트: `client/src/assets/` 폴더에 이미지 파일 존재 여부 확인
