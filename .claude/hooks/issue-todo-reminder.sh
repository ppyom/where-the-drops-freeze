#!/usr/bin/env bash
# git commit 직후, feature/#<번호> 브랜치면 이슈 To-Do 체크(/check-issue-todo)를 실행하라고 Claude에게 알린다.
# 스킬은 모델이 실행해야 하므로 hook은 판단 없이 안내만 한다.

INPUT=$(cat)

# settings의 if 필터가 걸러 주지 않는 경우가 있어 커밋 명령인지 직접 확인한다
COMMAND=$(printf '%s' "$INPUT" | sed -n 's/.*"command":"\(\([^"\\]\|\\.\)*\)".*/\1/p')
printf '%s' "$COMMAND" | grep -qE '(^|[;&|[:space:]])git commit( |$)' || exit 0

# PostToolUse는 성공한 호출에만 실행되므로 커밋 실패는 따로 거르지 않는다
CWD=$(printf '%s' "$INPUT" | sed -n 's/.*"cwd":"\([^"]*\)".*/\1/p')
[ -n "$CWD" ] && cd "$CWD" 2>/dev/null

BRANCH=$(git branch --show-current 2>/dev/null)
ISSUE=$(printf '%s' "$BRANCH" | sed -n 's|^feature/#\([0-9][0-9]*\)-.*|\1|p')

[ -z "$ISSUE" ] && exit 0

cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"커밋됨 (브랜치 ${BRANCH}). 이번 작업의 커밋을 모두 마친 뒤 /check-issue-todo 스킬로 이슈 #${ISSUE}의 완료된 To-Do를 체크한다. 커밋을 이어서 더 할 예정이면 마지막 커밋 후 한 번만 실행한다."}}
EOF
