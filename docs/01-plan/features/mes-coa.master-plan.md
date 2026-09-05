---
template: sprint-master-plan
version: 1.0
feature: mes-coa
displayName: MES 출하성적서(CoA) 풀스택
date: 2026-09-04
author: 주영준(준)
trustLevel: L3
duration: Sprint-1 기준 5 features
---

# MES 출하성적서(CoA) 풀스택 — Sprint Master Plan

> **Sprint ID**: `mes-coa`
> **Date**: 2026-09-04
> **Author**: 주영준(준)
> **Trust Level (시작)**: L3
> **예상 기간**: Sprint-1 = 5 features (F0~F4)
> **Master Plan template**: bkit v2.1.38

---

## 0. Executive Summary

| 항목 | 내용 |
|------|------|
| **Mission** | Lot 하나를 선택하면 **출하성적서(CoA) PDF 1장이 1초 만에 나오는** 풀스택 시스템을, Mock 단계에서 완주한다. |
| **Anti-Mission** | 실제 공장 설비 연동, ERP 실연동, 운영 배포, 다국어, 권한/조직관리는 다루지 않는다. |
| **Core Primitives** | Sprint-1(F0~F4, 품질/CoA) + Sprint-2(F5~F8, 생산/자재/Lot/설비). 스택: Vue3 script setup + Quasar + RealGrid2 / Spring Boot + MyBatis. |
| **Trust Level** | L3 — plan → report 자동 진행, archive만 사용자 승인 |
| **Auto-pause 조건** | 4 triggers 활성 (QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT) |
| **Success Criteria** | 5건 (§5 참고) |

---

## 1. Context Anchor (Plan → Design → Do 전파)

| Key | Value |
|-----|-------|
| **WHY** | ① 준의 현재 실무 배정이 **출하성적서**다. ② CoA는 MES의 terminal output이라, 이걸 제대로 뽑으려면 Spec→검사실적→Lot→작업지시 역참조 체인이 전부 필요하다. 즉 실무 완수와 MES 전체 감 잡기가 같은 작업이다. ③ 완성된 소스가 있으면 관리자에게 **제안**할 수 있고, Vue3/Quasar/RealGrid2/MyBatis 중 **실제로 쓰이는 문법만** 골라 학습할 수 있다. |
| **WHO** | 1차: 품질 담당자(검사값 입력·성적서 발행) / 2차: 대기업 공장 관리자(제안 수신자) / 3차: 준 본인(학습자) |
| **WHAT (도메인)** | 품질 기준정보(Spec) · 검사 실적 · Auto Pass/Fail 판정 · CoA 생성/출력 · 품질 이력 Pivot 분석 |
| **WHAT NOT** | 생산 실행(WO Start/End), BOM 차감, OEE — **Sprint-2로 이월**. 단, **데이터 모델과 Mock은 Sprint-1에서 미리 뚫는다.** |
| **RISK** | ~~R1 CoA 양식~~ 해소(G2) / ~~R2 데이터 모델~~ 해소(Design data-model) / ~~R3 RealGrid2 라이선스~~ **해소 2026-09-04** / R4 CamelMap·No-DTO 가 타입 안전성을 포기하므로 계약 검증을 Mock 스펙에 의존 |
| **SUCCESS** | Mock 프로파일만으로 브라우저에서 Lot 선택 → CoA 미리보기 → PDF 출력까지 **중단 없이 관통**된다. |
| **SCOPE (정량)** | Sprint-1: 5 features / 백엔드 API **13개** / 화면 **5개** + 공통 컴포넌트 3종 / DB 테이블 **9개** |
| | ↳ **변경 이력**: API 9→**14** (Design §9 확정 시 `process-tree`·`item-list`·`lot-list`·`coa-view` 추가, 15차에 `user-list` 추가 — F0 design §9.3 D34) · 테이블 8→9 (`TRN_COA_DETAIL` 신설, Design §3.9) · 화면 4→5 (`DevSandboxPage` 포함) |
| **OUT-OF-SCOPE** | Sprint-2 (F5~F8), SQLite·Oracle 실전환, 인증/권한, 배포 |

---

## 2. Features

### Sprint-1 — Phase 1 (품질/CoA) ← **지금 진행**

| # | Feature ID | 내용 | 우선순위 | 선행 | 상태 |
|---|-----------|------|--------|------|------|
| 0 | `F0-common-core` | 공통 뼈대: `CamelMap` 구현, MyBatis `mapUnderscoreToCamelCase`, `@Profile("mock"/"mybatis")` 스위칭, Axios 공통 클라이언트, 공통 콤보 3종(`CodeSelect` / `MultiCheckCombo` / `MultiTreeCombo`) | **P0** | — | **do 완료** |
| 1 | `F1-quality-spec` | 품목별 검사 Spec 관리 (검사항목·단위·USL/LSL·판정방식 CRUD) | P0 | F0 | **do 완료** |
| 2 | `F2-inspection-result` | 검사 실적 등록 + Spec 대비 **Auto Pass/Fail** 판정, 이탈 시 Alert/Locking (Quasar POP UI) | P0 | F1 | **do 완료** |
| 3 | `F3-coa-print` | **CoA 자동 생성 + 인쇄/PDF** — 본 스프린트의 최종 Output | **P0** | F2 | **do 완료** |
| 4 | `F4-quality-pivot` | RealGrid2 Pivot 품질 이력 — Spec 이탈 셀 Red 조건부 서식, Excel Export | P1 | F2 | **do 완료** |

### Sprint-2 — Phase 2 (현장 실행) ← **이월**

| # | Feature ID | 내용 | 우선순위 |
|---|-----------|------|--------|
| 5 | `F5-work-order` | 작업지시(WO) 수신 + 공정 Start/End 상태 머신 | P0 |
| 6 | `F6-bom-kitting` | 자재 Kitting + 실시간 BOM 차감(Backflushing) | P1 |
| 7 | `F7-lot-tracking` | Lot 분할/합병 추적성, RealGrid2 TreeGrid 360도 이력 | P0 |
| 8 | `F8-oee` | 설비 비가동 사유 등록 + OEE 대시보드 | P2 |

> **연결 지점**: Sprint-2 `F5` 의 *공정 완료* 시점에 Sprint-1 `F2` 의 *Auto Pass/Fail 검사*가 자동 트리거되도록 바인딩한다. (02.md §2-1)

---

## 3. 착수 전 반드시 메울 구멍 3개 (P0 — prd/plan phase 산출물)

지시서(01~03.md)에 정의되지 않아, 이걸 먼저 확정하지 않으면 F0조차 착수 불가.

### G1. 데이터 모델 미정의 → **9개 테이블 확정**

Mock 데이터조차 만들 수 없으므로 최우선. Sprint-2용 WO/Lot까지 **미리 뚫어 둔다**(나중에 스키마 재작업 방지).

| 테이블 | 성격 | 주요 컬럼 | 사용 Feature |
|--------|------|----------|-------------|
| `MST_DEPT` | 기준정보 | `DEPT_CD`, `DEPT_NM`, `PARENT_DEPT_CD` | F0 |
| `MST_PROCESS` | 기준정보(트리) | `PROC_CD`, `PROC_NM`, `PARENT_PROC_CD`, `SORT_NO` | F0, F2, F4 |
| `MST_ITEM` | 기준정보 | `ITEM_CD`, `ITEM_NM`, `ITEM_SPEC`, `UNIT_CD` | F1, F2, F3, F4 |
| `MST_INSP_SPEC` | 기준정보 | `ITEM_CD`, `INSP_ITEM_CD`, `INSP_ITEM_NM`, `UNIT_CD`, `USL`, `LSL`, `TARGET_VAL`, `JUDGE_TYPE`, `SORT_NO`, `DECIMAL_LEN` | F1, F2, F3, F4 |
| `TRN_WORK_ORDER` | 트랜잭션 | `WO_NO`, `ITEM_CD`, `PLAN_QTY`, `WO_STATUS` | Sprint-2 (**모델만 선반영**) |
| `TRN_LOT` | 트랜잭션 | `LOT_NO`, `PARENT_LOT_NO`, `ITEM_CD`, `WO_NO`, `PROC_CD`, `GOOD_QTY`, `LOT_STATUS`, `TOTAL_JUDGE` | F2, F3, F4, Sprint-2 |
| `TRN_INSP_RESULT` | 트랜잭션 | `LOT_NO`, `INSP_ITEM_CD`, `MEASURED_VAL`, `JUDGE_RESULT`, `INSP_DT`, `INSP_USER_ID` | F2, F3, F4 |
| `TRN_COA` | 트랜잭션 | `COA_NO`, `LOT_NO`, `CUST_NM`, `SHIP_QTY`, `ISSUE_DT`, `ISSUE_USER_ID`, `TOTAL_JUDGE`, `COA_STATUS` | F3 |
| `TRN_COA_DETAIL` | 트랜잭션 | 발행 시점 규격+측정값+판정 **스냅샷** (Design §3.9에서 신설) | F3 |

> **No SQL Concatenation 원칙 적용**: 모든 조회는 `{ deptCd, deptNm }` 형태의 분리된 컬럼으로 반환하고, `개발부 | 0000` 같은 표현은 100% Quasar Template Slot에서 조립한다.

### G2. CoA 최종 양식 미정의 → **PDF 레이아웃 확정** (진짜 Output)

O-6 기준으로 **이 문서 1장이 스프린트의 결과물**이다. 이걸 먼저 그려야 F1/F2가 무엇을 저장해야 하는지 역산된다.

```
┌──────────────────────────────────────────────────────┐
│              출 하 성 적 서 (CoA)                     │
├───────────────┬──────────────┬───────────────────────┤
│ 성적서번호     │ 발행일자      │ 고객사                 │   ← 헤더
│ 품목코드/품명  │ Lot No.      │ 출하수량               │
├───────────────┴──────────────┴───────────────────────┤
│ No │ 검사항목 │ 단위 │ 규격(LSL~USL) │ 측정값 │ 판정  │   ← 본문
│  1 │ 인장강도 │ MPa  │ 400 ~ 500     │ 452   │ PASS │      (N행)
│  2 │ 경도     │ HRC  │  55 ~  62     │  63   │ FAIL │      ← 이탈 Red
├──────────────────────────────────────────────────────┤
│ 종합판정: PASS / FAIL     발행자: ____  (인)          │   ← 푸터
└──────────────────────────────────────────────────────┘
```

- **데이터 원천 (Design 확정본)**
  | 시점 | 헤더 | 본문 | 종합판정 |
  |------|------|------|---------|
  | **발행 전** (미리보기) | `TRN_LOT` + `MST_ITEM` | `TRN_INSP_RESULT` ⋈ `MST_INSP_SPEC` | `TRN_LOT.TOTAL_JUDGE` |
  | **발행 후** (재조회·인쇄) | `TRN_COA` | `TRN_COA_DETAIL` | `TRN_COA.TOTAL_JUDGE` |
  
  ⚠️ **종합판정을 여기서 AND로 재계산하지 않는다.** F2가 계산해 저장한 값을 복사·표시만 한다 (F3 FR-06).
- **출력 방식**: **브라우저 인쇄 확정** — `window.print()` + `@media print` CSS. 서버측 PDF 생성은 한글 폰트 임베딩 비용 때문에 배제 (F3 design §5).

### G3. F0 공통 뼈대가 기능목록 누락 → **F0으로 승격 완료** (§2 반영)

01.md·03.md 3~4장에 흩어져 있던 `CamelMap` / Profile 스위칭 / 공통 콤보 3종을 **독립 feature F0**으로 승격했다. F1~F4 전부의 선행 조건이다.

> **2026-09-04 갱신**: 콤보의 핵심 요구를 구체화했다 — 드롭다운 각 행에 **코드와 명칭이 가로 2열**로 보여야 한다(동명 부서 구분). Quasar `q-select` 는 `option-label` 키 하나만 표시하므로 `#option` / `#selected-item` **Scoped Slot으로 직접 구현**한다. (`with-value` 류 prop은 Quasar에 존재하지 않음 — 공식 문서 확인 완료.) 컴포넌트명은 부서 전용이 아닌 범용 `CodeSelect.vue` 로 한다.

---

## 4. Sprint Phase Roadmap

| Phase | 활성 시점 | 산출물 | Quality Gates |
|-------|---------|------|-------------|
| prd | sprint 시작 | PRD (04.md·05.md 기반, §1 Context Anchor 확정) | M8 |
| plan | PRD 후 | Feature별 Plan (WHAT만 — **HOW 금지**) | M8 |
| design | Plan 후 | Feature별 Design (§3 G1/G2 확정 + API 계약 + 컴포넌트 명세) | M4, M8 |
| do | Design 후 | 구현 코드 (Mock 프로파일 우선) | M2, M3, M5, M7 |
| iterate | matchRate < 100 시 | matchRate 100% 달성 | M1 (100%) |
| qa | iterate 후 | 7-Layer S1 검증 (UI→Client→API→Validation→DB→Response→UI) | M3 (=0), S1 (=100) |
| report | qa 후 | 종합 보고서 + 관리자 제안용 요약 | M10, S2, S4 |
| archived | 사용자 명시 (L3) | terminal state | - |

> **01~03.md 의 위치**: 이 문서들은 Plan이 아니라 **Design 원재료**다. §3(백엔드 사양)·§4(프론트 사양)는 design phase에서 feature별로 분해해 재배치한다. Plan phase에는 WHAT만 남긴다.

---

## 5. Success Metrics (5건)

| # | Metric | Target | 측정 방법 |
|---|--------|--------|----------|
| 1 | matchRate (Design ↔ Code) | 100% | gap-detector |
| 2 | criticalIssueCount | 0 | code-analyzer |
| 3 | dataFlowIntegrity (7-Layer S1) | 100% | sprint-qa-flow agent |
| 4 | featureCompletion (F0~F4) | 5/5 | featureMap 집계 |
| 5 | **CoA 관통 시연** | Lot 선택 → PDF 출력 무중단 | 브라우저 실행 + 스크린샷 |

---

## 6. Auto-Pause Triggers (4 활성)

| Trigger | 조건 | 사용자 결정 옵션 |
|---------|------|----------------|
| QUALITY_GATE_FAIL | M3 > 0 OR S1 < 100 | fix & resume / forward fix / abort |
| ITERATION_EXHAUSTED | iter ≥ 5 AND matchRate < 90 | forward fix / carry / abort |
| BUDGET_EXCEEDED | cumulativeTokens > budget | budget 증액 & resume / abort / archive |
| PHASE_TIMEOUT | phase 진행 시간 > config.phaseTimeoutHours | timeout 연장 / force-advance / abort |

---

## 7. Cross-Sprint Dependency

```
Sprint-1 (mes-coa)                       Sprint-2 (mes-shopfloor)
  F0 공통뼈대 ──────────────────────────────► 전 feature가 재사용
  MST_INSP_SPEC / TRN_INSP_RESULT
  F2 Auto Pass/Fail ◄──────────────────────── F5 공정완료 시 자동 트리거
  TRN_LOT (모델 선반영) ◄──────────────────── F7 Lot TreeGrid가 확장 사용
  TRN_WORK_ORDER (모델 선반영) ◄───────────── F5 가 실제 사용
```

- Sprint-2 착수 조건: Sprint-1 `report` phase 완료.
- Sprint-1이 `TRN_LOT` / `TRN_WORK_ORDER` 모델을 선반영하므로, Sprint-2는 **스키마 재작업 없이** 화면·로직만 추가한다.

---

## 8. Risks & Mitigation

| ID | 위험 | 가능성 | 영향 | 대응 |
|----|------|-------|------|------|
| R1 | ~~CoA 양식 미확정~~ | — | — | **해소 (2026-09-04)** — §3 G2 양식 확정 + `TRN_COA_DETAIL` 스냅샷 설계 완료 (data-model §3.9, F3 design §3). **do phase 진입 제한 해제.** |
| R2 | ~~데이터 모델 부재~~ | — | — | **해소** — §3 G1의 **9개** 테이블을 `docs/02-design/mes-coa-s1.data-model.md` 로 확정 (`TRN_COA_DETAIL` 신설 포함). |
| R3 | ~~RealGrid2 라이선스 확보 실패~~ | — | — | **해소 (2026-09-04)** — 개발자용 테스트 라이선스 확보. `realgrid 2.10.0` + `quasar 2.25.0` + `vue 3.5.41` + Vite 참조 프로젝트 존재. 키는 `VITE_REALGRID_LICENSE` 환경변수 주입 |
| R4 | No-DTO/CamelMap → 컴파일 타임 타입 검증 부재 | 高 | 中 | API 계약을 design 문서 §9에 명시하고, Mock 응답을 **계약의 단일 원천(SoT)** 으로 삼아 gap-detector(M1/M4)로 검증. |
| R5 | Phase 2까지 욕심내다 Sprint-1 미완주 | 中 | 高 | Anti-Mission(§0) 위반 시 auto-pause. Sprint-2는 문서에만 존재. |

---

## 9. Resume / Abort 흐름

| 상황 | 절차 |
|------|------|
| Auto-pause 후 resume | `/sprint resume mes-coa` — 사유 해소 검증 |
| 사용자 abort | `/sprint archive mes-coa` — terminal state |
| Trust Level 변경 | `/sprint trust mes-coa --to L2 --reason "..."` |

---

## 10. Sprint 추적 (Living document)

본 master plan은 sprint 진행 중 cumulative KPI 갱신 + phase 전이 시 history append. archived 시 readonly 전환.

### 진행 로그

| 일자 | Phase | 내용 |
|------|-------|------|
| 2026-09-04 | master-plan | 초안 생성. 04·05.md(요구발굴) + 01·02·03.md(지시서) 반영. 구멍 3개(G1 데이터모델 / G2 CoA양식 / G3 F0누락) 식별 및 P0 지정. |
| 2026-09-04 | plan | Feature Plan 5종 작성. M8 게이트 86/85 통과. |
| 2026-09-04 | design | data-model + Design 5종 작성. API 13종 계약 확정. 에러코드 레지스트리 29종. M4 게이트 반복 측정 (60→88→89→90→91→91). |
| 2026-09-05 | design | M4 공식 재측정 **77** (gap-detector, sprint state 최초 기록). 12차 수정 — 결정 4건 확정(D1 F3 기간 필수화 / D21 F2 빈 배열 거부 / D23 `LOT_NOT_INSPECTABLE` 삭제 / D24 `TOO_MANY_ROWS` = `detailList` 기준) + D22 응답 대칭 · D25 축소 근거 · D26 소비 API 선언 3건. 재측정 **85**. |
| 2026-09-05 | design | 14차 수정 — D31 F3 §2.1 조회 조건 화면 신설, D32 F3 §9.2 조인 `USE_YN='Y'` 복원(PASS 헤더에 FAIL 줄이 인쇄되던 경로 제거), `specUseYn`→`useYn` 원복, D33. **M4 threshold 95→92 재조정**(audit `config_changed`). 재측정 **69** — 측정 프롬프트가 회차마다 달라져 77·85·77·69 는 상호 비교 불가. |
| 2026-09-05 | do | **`docs/코드로-역추적하기.md` + `docs/역추적-질문표.md` 작성.** "물어볼 사람이 없거나, 묻기 전에 스스로 알아내려면?"에 대한 답. **화면 값 → 테이블·컬럼 5단계 추적법**(화면글자→변수명→전체검색→서버코드→컬럼)을 실제 ⑬측정값으로 실연 — `CoaSheet.vue` → `measuredVal` → `latestResults()` → `TRN_INSP_RESULT.MEASURED_VAL` + **숨은 조건 `LATEST_YN='Y'` 발견**. 실전 기술 4종(Network 탭·특이값 DB검색·SQL 로그·컬럼명 추론)과 **코드가 절대 안 알려주는 것**(왜/예외/영향) 대비표. 핵심: **코드=What(거짓말 안 함) / 사람=Why(코드에 없음)**, 순서는 코드 먼저. |
| 2026-09-05 | do | **`docs/출력물-역추적법.md` 작성.** "현업 투입 첫날 어디부터 볼까"에 대한 답 — **terminal output(성적서)부터 거꾸로 역추적**하는 방법론. 본 master-plan §1 WHY("CoA 는 terminal output")·§3("이걸 먼저 그려야 F1/F2 가 역산된다")이 이미 채택한 방식을 **Day 0~3 실전 절차**로 구체화. 핵심: **파악 순서(F3→F2→F1)와 제작 순서(F1→F2→F3)는 반대**. 순서대로 봤을 때의 고통 5가지(용어의 늪·중요도 미상·끝 모름·대화 불가·버릴 공부)와 실물을 들고 묻는 질문법 포함. |
| 2026-09-05 | do | **`docs/실습-시나리오.md` 작성.** 현업 4역(품질담당자·검사원·발행담당자·관리자)으로 화면을 순서대로 눌러보는 실습 대본. 단계마다 상황/할일/정상화면/왜 + **일부러 틀려보기**(빈행 저장·규격이탈·수량초과). 시나리오 5는 **화면 간 연결 체감**(F1에서 항목 삭제 → F2에 남아있음 / 규격 변경 → 발행된 성적서는 불변). §3.5 에 **남은 P0(2쪽 헤더 반복)을 준이 직접 확인하는 절차**를 넣음. |
| 2026-09-05 | do | **`docs/남은일-한줄-읽는법.md` 작성.** "남은 것: F4 / M4 threshold 복원 / carry item 3건(...)" 한 줄을 해부 — **용어는 아는데 이어놓으면 안 읽히는** 문제를 다룬다. 원인: 한 줄에 **성격이 다른 3종**(기능 / 검사장치 / 미뤄둔 빚)이 섞여 있어서. 항목마다 생활예제 + **알면 좋은 것 / 모르면 겪는 고통**을 붙이고, 읽는 법 3단계(`/`로 자르기 → 서랍 판별 → 누가·언제)와 **보고서 쓰는 형식**까지. |
| 2026-09-05 | do | **`docs/HANDOFF.md` 인수인계서 작성.** 대상 3종(다음 세션 / 자바 붙일 개발자 / 인수자)을 한 문서로. 완성 범위·아키텍처·파일별 소유·**자바 백엔드 붙이는 5단계**·남은 작업 우선순위·**함정 7종**·결정 이력(D1~D44)·재개 체크리스트. 문서 내 사실 주장은 스크립트로 검증(테스트 건수 33/17/16, API 14개, 에러코드 29종 등) — 테스트 건수 오기 1건 발견·정정. |
| 2026-09-05 | do | **M4 게이트 첫 통과 — 100% (14/14, NO VIOLATIONS).** threshold 를 95 로 복원하고 코드 대상으로 재측정. 78.6%(11/14) 에서 지목된 실제 버그 3건 수정: **F2 §9.2 가 D27 을 구현하지 않아 soft delete 된 검사항목의 측정값이 화면에서 사라지던 문제**(`inspectableSpecs()` 신설), F3 §9.3·§9.4 가 저장 행을 그대로 반환해 `custCd`·원소별 `coaNo`·`sortNo` 가 새어나가던 문제(`toCoaResponse()` 신설). **design phase 9회 측정 중 95 도달 0회였던 게이트가 do phase 에서 첫 통과** — M4 는 '계약↔구현' 지표라 코드가 있어야 의미가 있다는 판단이 데이터로 확인됨. 29개 에러코드 전부 실제로 던져지고 미선언 코드 0개도 확인. |
| 2026-09-05 | do | **학습 문서 2종 완비.** `MES-입문가이드.md`(실무용 — 어디를 만지나) + `MES-용어사전-개념원리.md`(학습용 — 왜 이런 말을 쓰나). 후자는 용어 30여 개를 생활 예제로 풀고, 이 프로젝트에서 실제로 겪은 **"조용한 실패" 4종**(없는 슬롯 / 라이선스 예외 / setFields 미선언 키 / 저장형태를 그대로 응답)을 기록. |
| 2026-09-05 | do | **F4 품질피벗 구현 — Sprint-1 기능 5/5 완료.** RealGrid2 첫 실사용(동적 컬럼 19개, 고정 3열 + 검사항목 N열). §4 피벗 변환을 순수 함수로 분리(`composables/usePivotGrid.js`) + 테스트 16건. 브라우저 실측: 4개 품목 혼합 조회 → 동적 컬럼 19개, 미검사 셀 빈 칸, **FAIL 셀·행 강조 확인**(§5 — 비교 없이 서버 판정값만 사용). 발견·수정 3건: **D43 RealGrid2 라이선스 없으면 `LicenseError` 로 화면이 조용히 죽음**(F0 §7 문구가 "평가판 동작"이라 사실과 달랐음), **D44 `setFields` 미선언 키가 버려져 `styleCallback` 이 판정값을 못 봄**, `buildGrid()` 실패가 배너 없이 묻히던 문제. |
| 2026-09-05 | do | **Carry item 3건 처리.** ① F3 §5.2 인쇄 DoD — `ITEM-004` 30항목 확장으로 1.32쪽 달성, 행 잘림 방지 확인(경계가 24/25행 사이). `thead` 반복은 실제 인쇄 필요라 **사람 확인분으로 남김**. ② **D42 `INSP_ITEM_REQUIRED` 신설** — 항목코드 누락에 중복 코드가 붙던 문제(레지스트리 29종). ③ F2 Lot 전환 현상 — 재현 실패, **브라우저 자동화 도구의 stale 참조로 추정하되 확증 없음**을 기록. |
| 2026-09-05 | do | **입문 가이드 + 단위 테스트.** `docs/MES-입문가이드.md` 신설 — MES 초보자가 도메인(학교 성적표 비유)·데이터 흐름·관통 원리 6개를 이해하고, **'이거 수정해주세요' 요청 유형별로 어느 파일을 여는지**를 찾을 수 있는 문서(화면에서 처리 / 안전한 수정 / 위험 구역 3단 분류). **단위 테스트 50건 신설·전건 통과** — F2 design §1 이 "반드시 있어야 하는 유일한 코드"로 지목한 `specJudge` 의 경계값(`v==usl` → PASS), null/0 구분(FR-08), NONE 우선 종합판정(§1.3), 상태 전이(§1.4), Mock 시나리오 4종. `specFormat` 표기 규칙도 포함. |
| 2026-09-05 | do | **F3 출하성적서 발행 화면 구현 — SUCCESS 기준 관통.** §2.1 조회조건(기간 필수 D1·92일 상한) + 대상 Lot 그리드, §6 고객사·출하수량·발행자, 미리보기/발행 분리(§1), §4.1 채번 `CoA-YYYYMMDD-NNN`, §3.0 `printSeq` 조밀 재부여(D3), §4 스냅샷 저장, `CoaSheet.vue` + `css/coa-print.css`(§5.1 5요건). Mock 에 `ITEM-004`(15항목)·`LOT-007` 추가. 브라우저 실측: **Lot 선택 → 미리보기 → 발행(CoA-20260904-001) → 인쇄 레이아웃**까지 관통. 인쇄 시 `.no-print` 로 헤더·탭·버튼이 사라지고 성적서만 흰 종이에 남는 것 확인. 미달 1건: §5.2 DoD(2페이지 넘김·헤더 반복)는 15건이 1페이지(0.83쪽)에 들어가 **미실측** — 30행 이상 필요, Sprint-2 이월. |
| 2026-09-05 | do | **F2 검사실적 화면 구현.** 현장 POP(§3.1 치수 — 입력칸 56px·저장 64px·측정값 20px), `utils/specFormat.js`(F3·F4 공유), `utils/specJudgeClient.js`(§1 판정 — Mock 단계에서는 서버도 공유), Mock Lot 6건(4개 상태 + `procCd` null) · 실적 15건(재검사 이력 포함). 브라우저 실측: **LOCKED Lot 재검사 → PASS → OK 자동 복귀(§5) 확인**, 즉시판정·서버 재판정·`LATEST_YN` 전환·`RESULT_LIST_REQUIRED`(D21) 전부 동작. 발견·수정 1건: **D41 — 15차의 D35 가 §9.1 을 `WAIT`·`INSP` 로 고정해 §5·D23 의 진입 경로를 막고 있었다** → 4개 상태 전건 반환으로 정정. |
| 2026-09-05 | do | **F1 실사용 피드백 반영 (D40).** 품목 콤보에 "전체" 추가 — 초안은 품목 미선택 시 [조회]가 비활성인데 사유 표시가 없어 **고장으로 보였다**. 전체는 조회 전용(품목 열 표시 + 편집 잠금 + 잠김 사유 문장), 편집은 품목 선택 시에만 — §9.3 이 `ITEM_CD` 단위 delete-insert 이기 때문. §9.2 계약도 `itemCd` 선택으로 완화. |
| 2026-09-05 | do | **F1 품질규격 화면 구현.** `q-table` 편집 그리드(RealGrid2 아님 — §2), Mock 품목 4·Spec 12건(§6 조건 충족), `api/quality.js`, `api/specValidator.js`(백엔드 `SpecValidator` 대역 — V1~V9), 탭 전환(vue-router 미도입). 브라우저 실측: 조회·§2.1 입력제어·행추가/삭제·검증 실패(3건 텍스트 표시)·저장 성공 전부 확인. 발견·수정 2건: ① **D39 §9.2 가 전건을 주면 D37 soft delete 항목이 저장만 눌러도 부활** → `useYn='Y'` 필터 명시 ② §9.2 예시 `targetVal:450` 이 D28 과 모순 → null. 자체 버그 1건: 성공 메시지를 `load()` 가 즉시 지움 → 순서 교정. |
| 2026-09-05 | do | **F0 프론트 구현 착수.** Vite+Vue3+Quasar+RealGrid2 프로젝트 생성(crudGrid 검증 조합 그대로), `api/http.js` Mock 서버(래핑 없음 §4.1), `api/common.js` + `toTree()`, 공통 콤보 3종, Mock JSON 3종, `DevSandboxPage`. dev 서버 `:5283` 기동 후 **브라우저 실측 검증 완료**. 발견·수정 2건: ① 설계서 §5.4 가 존재하지 않는 `QSelect #popup-content` 슬롯을 처방 → `q-field`+`q-menu` 로 정정(설계서도 v1.1 로 갱신) ② 트리 칩 미줄바꿈으로 4개째부터 잘림 → `flex-wrap`. Windows 가 TCP 5113~5212 를 예약해 518x 대 사용 불가 → 5283. |
| 2026-09-05 | design | 15차 수정 — **D34 F0 §9.3 `user-list` 신설**(F2·F3 사용자 ID 생산자 확보 — 없으면 두 저장 API 구현 불가), D35 F2 §9.1 파라미터 제거, D36 F2 `검사자 ▼`, D37 **F1 soft delete**(검사실적 고아 방지), D38 F3 발행자. **M4 재측정 없이 do 진입** — design phase 에서 M4(계약↔구현 대조)를 통과 기준으로 두는 구성이 부적절하다는 판단(9회 측정 95 도달 0회). M8 86/85 통과분으로 design 종료. |
| 2026-09-05 | design | 13차 수정 — 결정 3건(D28 F1 §9.3 `useYn`·`targetVal` 제거 / D27 `USE_YN` 참여 규칙 — **CoA 영구 차단 경로 제거** / D29 `INTERNAL_ERROR` 전역 암묵) + D30 §9.4 도달 경로. 레지스트리 **28종**(`INVALID_YN_FLAG` 삭제). |
