---
name: bkit-lib-location
description: bkit lib/ (measure-router.js, quality-gates) is NOT inside the mes project root; do not grep the project for it when measuring gates
metadata:
  type: reference
---

`lib/application/quality-gates/measure-router.js` 및 `lib/application/sprint-lifecycle/*` 는 mes 프로젝트 루트(`C:/Users/jooladen/Desktop/claude-code2/cdp2/mes`)에 존재하지 않는다 (2026-09-04 grep 결과 0건). bkit 플러그인 설치 경로에 있다.

**How to apply:** 게이트 측정 시 프로젝트 안에서 router를 찾느라 시간 쓰지 말고, 호출자가 준 판정 규칙(plan-exit M8 = plan 문서의 설계 섹션 인용)을 그대로 적용한다. 스프린트 상태/게이트 실패 리포트는 `docs/03-analysis/<sprint>-gate-fail-*.md` 와 `.bkit/state/sprints/<sprint>.json` 에 남는다.
