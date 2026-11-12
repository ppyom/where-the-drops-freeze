# Where the Drops Freeze

물방울을 떨어뜨려 유리 같은 얼음 결정을 키우는 시간 때우기용 모바일 웹 게임.
완성한 얼음은 "작품"이 되고, 링크로 공유하면 받은 사람 화면에서 처음부터 다시 자란다.

## 작업 방식

- 대화는 한국어, 편하고 간결하게. 짧은 말로도 의도를 알아서 파악하고 진행한다.
- 코드는 짧고 읽기 쉽게. 주석은 핵심만. 내가 코드를 이해할 수 있는 게 최우선.
- 영리한 추상화보다 단순한 코드. 파일·함수를 필요 이상으로 쪼개지 않는다.
- 새 라이브러리는 꼭 필요할 때만, 추가 전에 먼저 물어본다.
- 큰 변경 전에는 계획을 짧게 말하고 시작한다.

## 기술 스택

- Vite + TypeScript (vanilla-ts 템플릿)
- Phaser: 플레이 화면과 재생 화면의 캔버스만 담당
- 메뉴 화면(홈, 모양 선택, 완성, 갤러리, 내 작품, 상태)은 일반 HTML/CSS
- Supabase: 익명 로그인 + RPC 함수 + pg_cron (3단계부터)

## 명령어

- `npm run dev` 개발 서버
- `npm run build` 빌드
- `npm test` 재현성 테스트 (`scripts/replay-test.ts`, 같은 입력 → 같은 격자)

## 폴더 구조

```
src/
  core/
    rng.ts        시드 PRNG (mulberry32)
    demo.ts       데모 물방울 목록 (홈, 모양 고르기, 기본 공유 이미지)
    config.ts     성장 수치 모음 (격자 크기, 덩어리, 줄기 등)
    ice.ts        격자, 낙하, 부착 — Phaser 없이 순수 TS
    replay.ts     drops 목록 → 최종 격자
  game/
    IceScene.ts   입력(길게 누르기), 낙하 연출, 반짝임, 재생
    draw.ts       얼음 5겹 그리기 (플레이 화면·썸네일 공용)
  ui/
    screens/      home(/), shape(/shape), play(/play?shape=, /a/{id}),
                  gallery(/gallery), mine(/me), complete·report(시트), message(예외 화면),
                  info(/about, /privacy)
    ad.ts         광고 칸 (메뉴 화면에만)
    icons.ts      인라인 SVG 아이콘
    styles.css    디자인 토큰 + 컴포넌트 클래스
  api/
    store.ts      Supabase 저장/불러오기/좋아요/신고
    analytics.ts  GA4 (프로덕션 빌드에서만)
  main.ts
api/              Vercel 서버 함수 (src/core를 그대로 import)
  og.ts           공유 미리보기 PNG 1200×630. 요청마다 drops로 다시 그림 (저장 X, CDN 캐시)
  share.ts        /a/{id}의 index.html에 og 태그 끼워 넣기
  _supabase.ts    서버용 작품 읽기
supabase/
  schema.sql      테이블·RLS·RPC (SQL Editor에 붙여넣기, 재실행 가능)
  cron.sql        30일 삭제 pg_cron
scripts/
  replay-test.ts  재현성 테스트
```

## 절대 규칙: 재현성

같은 시드 + 같은 시작 모양 + 같은 물방울 목록 = 어느 기기에서든 똑같은 얼음.

- `Math.random()` 금지. 모든 랜덤은 작품 시드로 만든 `rng.ts`의 PRNG만 쓴다.
- 얼음 계산은 프레임·시간·화면 크기와 무관해야 한다. 연출(애니메이션)과 계산을 분리한다.
- `core/`는 Phaser를 import하지 않는다. 같은 입력을 두 번 계산해 격자가 같은지 테스트할 수 있어야 한다.
- 이미지는 저장하지 않는다. 저장하는 건 시드, 시작 모양, 물방울 목록뿐.

## 게임 규칙

- 수치는 전부 `core/config.ts`에 있다. 작품 저장이 시작되면 이 값들도 재현 규칙의 일부라 함부로 바꾸지 않는다.
- 격자: 90 × 130 셀 고정. 화면에는 비율 유지해서 확대해 그린다. 목표: 물방울 30~40개면 나무 모양.
- 저장하는 X좌표는 화면 픽셀이 아니라 격자 X(정수).
- 입력: 누르고 있는 시간 = 물방울 크기. 떼면 그 X에서 떨어진다. 누르는 중 좌우로 움직이면 X도 따라간다.
- 크기 4단계: 0–250ms=1, 250–500ms=2, 500–750ms=3, 750ms 이상=4. 붙는 셀 수 대략 1 / 5 / 9–13 / 21 (부착 지점 중심 원형).
- 줄기: 원형 덩어리에 더해 부착 지점에서 위로 2 / 3 / 5 / 7칸 뻗는다. 한 칸마다 35% 확률로 좌우 1칸 휜다. 다른 얼음에 막히면 멈춘다.
- 낙하: 누른 X에서 곧장 아래로. 얼음 셀에 닿으면 근처에서 최대 8걸음 랜덤하게 움직이다 고정. 순서: 걸음 → 덩어리 → 줄기 (rng 호출 순서도 이대로 고정).
- 얼음에 안 닿고 바닥까지 떨어지면 사라지고, 개수·크기 합계에 포함하지 않으며 drops에도 기록하지 않는다.
- 시작 모양: 세모(기본), 플랫. 네모·동그라미는 나중에.
- 작품당 물방울 최대 200개, 크기 합계 최대 400.
- 완성 버튼은 물방울 5개 이상일 때 활성. 되돌리기는 횟수 제한 없음(마지막 물방울 빼고 재계산).
- 연출: 붙는 순간 4각 별 반짝임 약 0.3초. 공유 링크 재생은 물방울 1개당 약 60ms.

## 데이터 (Supabase)

- 사용자: 익명 로그인(`signInAnonymously`). 화면에 로그인 과정 없음. 남용 방지로 Cloudflare Turnstile.
- 테이블 3개, 전부 RLS 켬:
  - `artworks`: id(짧은 랜덤 7자), owner(uuid), seed(bigint, uint32 범위), shape(text), drops(int[]: [x, size, x, size, ...]), drop_count, like_count, report_count, hidden(bool), created_at
  - `likes`: artwork_id, user_id, created_at — (artwork_id, user_id) 유일
  - `reports`: artwork_id, user_id, reason(ugly/spam/etc), created_at — (artwork_id, user_id) 유일
- 쓰기는 RPC 함수로만: `save_artwork`(개수·크기 합·하루 10개 검사), `like_artwork`, `report_artwork`(서로 다른 3명이면 hidden=true).
- 읽기는 hidden = false만 공개. 공개 컬럼은 id, seed, shape, drops, drop_count, like_count, created_at (owner·report_count·hidden은 안 보임). 인기순은 `popular_artworks(limit, offset)`.
- RPC 에러는 코드 문자열로 던진다: not_signed_in, invalid_shape, invalid_drops, daily_limit, not_found, invalid_reason. 30일 지난 작품은 pg_cron으로 하루 1번 삭제.
- 클라이언트 제한만 믿지 않는다. 같은 제한을 서버에서도 검사한다.
- 내 작품은 `my_artworks()` RPC (owner가 비공개라서).
- 공유 링크: `/a/{id}`. 화면 이동은 일반 링크(페이지 새로 불러오기).
- 배포: Vercel. `vercel.json`에서 `/a/{id}`는 `api/share`로, 나머지 경로는 `index.html`로 rewrite (정적 파일이 먼저). 환경 변수는 Vercel 프로젝트 설정에도 넣는다.
- 환경 변수는 `.env`에 둔다. 필수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`. 선택: `VITE_GA_ID`, `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT`(없으면 GA·광고가 꺼짐). Turnstile 시크릿은 Supabase Auth CAPTCHA 설정에만. 절대 커밋하지 않는다.

## 디자인 시스템

다크 단일 테마, 390px 폭 기준의 앱 같은 모바일 웹. 기존 디자인은 수정하지 않고, 새로 필요한 것만 추가한다.

- 배경: `#070d18` → `#0b182b` 세로 그라디언트 위에 큰 원형 빛 3개(파랑 `#2e6fb0`, 보라 `#5b4bb8`, 청록 `#1f8fa8`)를 흐리게.
- 유리 표면: 흰색 8% 배경 + 1px 흰색 14% 테두리 + `backdrop-filter: blur(24px)`. 떠 있는 바는 blur 28px + saturate 140% + `0 10px 30px rgba(0,0,0,.35)`.
- 글자: 기본 `#f2f8fc`, 보조 `#a9bcd0`, 3차 `#8ea2b8`. 강조·얼음 `#bfe9fb`.
- 주요 버튼: `#f4faff` → `#cdebfb` 가로 그라디언트, 글자 `#07111f`, 높이 56px, 완전한 알약 모양. 한 화면에 하나만.
- 하트 `#ff8fa8`(아이콘만), 보관 임박 경고 `#ffb86b`.
- 폰트: 본문 SUITE(가변), 로고 Instrument Serif, 숫자는 시스템 폰트.
- 아이콘: 24px 그리드, 선 1.8, 둥근 끝. 인라인 SVG. 이모지 금지.
- 터치 대상 최소 44px. 글자 대비 4.5:1 이상.
- 얼음 가지는 5겹: 글로우(`#7cc8f0` 35%, 흐림) → 테두리(흰색 45%) → 속(어두운 남색 62%) → 틴트(`#bfe9fb` 24%) → 하이라이트(흰색 75%, 굵기의 18%).

## 개발 단계

1. 프로토타입: 길게 누르기 → 낙하 → 부착, 크기 단계, 세모 시작 모양. 완료 기준: 물방울 200개를 떨어뜨려도 끊김 없음.
2. 시드·재생: 시드 PRNG, drops 기록, 재생, 되돌리기. 완료 기준: 같은 입력을 두 번 계산한 격자가 완전히 같음.
3. 저장·공유: Supabase 연결, 완성 화면, 링크로 열면 재생. 완료 기준: 다른 기기에서 열어도 같은 얼음.
4. 소셜·제한: 좋아요, 신고, 갤러리, 내 작품, 스팸 제한, 30일 삭제.
5. 다듬기: 플랫 모양, 홈 데모 애니메이션, 예외 화면.
