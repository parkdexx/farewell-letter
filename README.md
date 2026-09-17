# farewell-letter

비밀번호를 입력해야만 내용을 볼 수 있는 1페이지 정적 웹사이트. GitHub Pages 무료 배포를 전제로, 편지 내용은 브라우저에서 AES-GCM으로 복호화된다.

## 동작 방식

- `content/letter.local.txt`: 실제 편지 평문. **로컬에만 존재하며 절대 git에 커밋되지 않는다** (`.gitignore`에 등록됨).
- `npm run encrypt`: 위 평문과 입력한 비밀번호로 `src/letter.enc.json`(암호문/salt/iv)을 생성한다. **커밋되는 것은 이 암호문뿐**이다.
- 배포된 페이지는 `src/letter.enc.json`만 불러온다. 방문자가 비밀번호를 입력하면 브라우저 안에서(`src/crypto.js`, Web Crypto API) 복호화를 시도하고, 성공하면 그 순간에만 브라우저 메모리에서 평문이 복원되어 화면에 표시된다. 틀린 비밀번호는 AES-GCM 인증 태그 검증에서 자동으로 실패한다.

## 사용법

```bash
npm install
# content/letter.local.txt 에 실제 편지 내용을 작성한 뒤
npm run encrypt        # 비밀번호를 대화형으로 입력 -> src/letter.enc.json 생성
npm run dev             # 로컬 확인
npm run build && npm run preview   # 배포 전 프로덕션 빌드 확인
```

`src/letter.enc.json`을 커밋하고 `main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 자동으로 빌드해 GitHub Pages에 배포한다 (저장소 Settings → Pages → Source를 "GitHub Actions"로 최초 1회 설정해야 함).

저장소 이름을 `farewell-letter`가 아닌 다른 이름으로 만들 경우, `vite.config.js`의 `base` 값도 함께 수정해야 한다.

## 보안 한계

저장소가 Public이므로 salt, iv, PBKDF2 반복 횟수, 암호문이 모두 공개된다. 정적 사이트 특성상 오프라인 무차별 대입 공격을 막을 방법(rate limiting 등)이 없다. 실질적인 방어는 **비밀번호(패스프레이즈)의 엔트로피**뿐이므로, 짧은 단어나 생일 조합이 아니라 긴 문장형 패스프레이즈를 사용할 것을 권장한다.
