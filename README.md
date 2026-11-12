# Where the Drops Freeze

물방울을 떨어뜨려 유리 같은 얼음 결정을 키우는 모바일 웹 게임.
완성한 얼음은 링크로 공유할 수 있고, 링크를 받은 사람 화면에서 처음부터 다시 자란다.

https://where-the-drops-freeze.vercel.app

## 플레이 방법

1. 화면을 누르고 있으면 물방울이 커진다. 크기는 4단계다.
2. 손을 떼면 그 자리에서 물방울이 떨어진다. 누른 채로 좌우로 움직이면 떨어질 위치도 따라 움직인다.
3. 물방울이 얼음에 닿으면 붙어서 가지로 자란다. 물방울 30~40개 정도면 나무 모양이 된다.
4. 물방울이 5개 이상이면 완성할 수 있다. 저장하면 공유 링크가 생기고, 작품은 30일 동안 보관된다.

## 핵심 원리: 이미지 대신 입력을 저장

작품 이미지는 저장하지 않는다. 저장하는 건 **시드, 시작 모양, 물방울 목록**(`[x, 크기, x, 크기, ...]`)뿐이다.
얼음 계산은 시드 PRNG(mulberry32)만 쓰고 프레임·시간·화면 크기와 무관해서, 같은 입력이면 어느 기기에서든 똑같은 얼음이 나온다.
공유 링크 재생, 갤러리 썸네일, 공유 미리보기 이미지는 모두 이 목록으로 다시 계산해서 그린다.

## 기술 스택

- **Vite + TypeScript**: 메뉴 화면은 일반 HTML/CSS로 만들었다.
- **Phaser**: 플레이 화면과 재생 화면의 캔버스에만 쓴다.
- **Supabase**: 익명 로그인, RLS, RPC, pg_cron을 쓴다.
- **Cloudflare Turnstile**: 남용 방지용이다.
- **Vercel**: 정적 호스팅과 서버 함수(공유 미리보기)를 맡는다.

## 시작하기

```bash
npm install
# 아래 환경 변수 표를 보고 .env를 만든다
npm run dev
```

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` | 재현성 테스트. 같은 입력을 두 번 계산해 격자가 같은지 확인 |

### 환경 변수

| 이름 | 용도 | 필수 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키 | O |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile 사이트 키 | O |
| `VITE_GA_ID` | GA4 측정 ID. 프로덕션 빌드에서만 동작 | |
| `VITE_ADSENSE_CLIENT` | AdSense 클라이언트 ID (`ca-pub-...`) | |
| `VITE_ADSENSE_SLOT` | AdSense 디스플레이 광고 단위 ID. 없으면 광고 칸이 안 보임 | |

Turnstile 시크릿 키는 이 파일이 아니라 Supabase Auth의 CAPTCHA 설정에만 넣는다. `.env`는 커밋하지 않는다.

### Supabase 설정

1. SQL Editor에서 `supabase/schema.sql`을 실행한다. 테이블, RLS, RPC가 만들어지고, 다시 실행해도 된다.
2. 이어서 `supabase/cron.sql`을 실행한다. 30일 지난 작품을 하루에 한 번 지우는 작업이 등록된다.
3. Authentication에서 Anonymous sign-ins를 켜고, CAPTCHA를 Turnstile로 설정한다.

## 폴더 구조

```
src/
  core/      얼음 계산 (PRNG, 격자, 낙하·부착, 재생). Phaser 없이 순수 TS
  game/      Phaser 씬(입력·연출)과 얼음 그리기
  ui/        메뉴 화면, 아이콘, 스타일
  api/       Supabase 저장·불러오기, GA
api/         Vercel 서버 함수 (공유 미리보기 이미지, og 태그)
supabase/    스키마·RPC, pg_cron
scripts/     재현성 테스트
```

## 배포

`main` 브랜치는 Vercel에 자동으로 배포된다. 환경 변수는 Vercel 프로젝트 설정에 넣는다.
`/a/{id}` 경로는 `api/share.ts`가 받아서 작품별 og 태그를 넣어 주고, 나머지 경로는 모두 `index.html`로 보낸다.
