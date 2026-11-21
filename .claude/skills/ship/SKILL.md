---
name: ship
description: 현재 작업을 검증하고 gitmoji 커밋으로 나눠 커밋한 뒤 develop으로 PR을 올린다. "커밋하고 PR 올려줘", "/ship" 요청 시 사용.
disable-model-invocation: true
---

# 커밋 & PR

## 1. 브랜치 확인

- 현재 브랜치가 `main` 또는 `develop`이면 멈추고, 이슈 번호를 확인해서 `develop`에서 `feature/#<번호>-<설명>` 브랜치를 만든다.
- 이슈 번호를 모르면 물어본다.

## 2. 검증

package.json의 스크립트를 확인하고 있는 것을 실행한다. 하나라도 실패하면 고친 뒤 다시 실행한다.

```bash
npm run lint
npx tsc --noEmit
```

빌드 영향이 큰 변경(라우트, 설정, 의존성)이면 `npm run build`까지 돌린다.

## 3. 커밋

- `git diff`를 보고 **작업 단위별로** 나눠 커밋한다. 한 커밋에 성격이 다른 변경을 섞지 않는다.
  - 예: 컴포넌트 구현(✨) / 스토리(📸) / 문서(📝)는 각각 따로
- 메시지: `<gitmoji> <한국어 설명>` (전역 CLAUDE.md의 이모지 표 참고)
- `.env*`, 빌드 산출물, 개인 설정 파일은 절대 커밋하지 않는다.

## 4. PR

- `git push -u origin <브랜치>`
- `gh pr create --base develop`
- 레포에 `.github/PULL_REQUEST_TEMPLATE.md`가 있으면 그 형식을 채운다.
  - 관련 이슈: `- #<번호>`
  - 변경 사항 체크박스: 해당하는 항목만 `[x]`
  - 작업 내용: 커밋 단위 요약 + 리뷰할 때 볼 포인트
  - 스크린샷: UI 변경이 있으면 "스크린샷 첨부 필요"라고 남긴다
- 제목은 이슈 제목과 맞춘다.

## 5. 마무리

PR 링크와 커밋 목록을 짧게 보여준다. 머지는 하지 않는다.
