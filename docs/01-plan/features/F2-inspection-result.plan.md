---
template: plan
version: 1.3
feature: F2-inspection-result
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
---

# F2 검사 실적 등록 + Auto Pass/Fail — Plan

> **Summary**: Lot 번호로 측정값을 입력하면 **시스템이 즉시 합격/불합격을 판정**하고, 불합격이면 그 Lot의 출하를 막는다.
>
> **Sprint**: `mes-coa-s1` · **Date**: 2026-09-04 · **Status**: Draft
> **선행**: F0 공통 뼈대, F1 품질 Spec

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 측정값을 사람이 규격표와 눈으로 대조해 판정하면 느리고 틀린다. 불합격품이 출하되는 사고가 여기서 난다. |
| **Solution** | 측정값 입력 즉시 F1의 Spec과 비교해 자동 판정하고, 이탈 시 경고 + Lot 상태를 잠근다. |
| **Function/UX Effect** | 현장 작업자가 숫자만 치면 PASS/FAIL이 색으로 즉시 표시된다. 장갑 낀 손으로 조작 가능한 큰 UI. |
| **Core Value** | **이 스프린트의 심장.** CoA는 여기서 만든 판정 결과를 인쇄하는 것뿐이다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 사람 눈 판정을 시스템 계산으로 대체해 오판과 불합격품 출하를 막는다 |
| **WHO** | 현장 품질 검사자 (측정값 입력 담당) |
| **RISK** | 판정 로직이 틀리면 불합격품이 합격으로 출하된다 — 이 스프린트 최대 위험 |
| **SUCCESS** | 규격 이탈값 입력 → 즉시 FAIL 표시 + Lot 잠김 → 해당 Lot의 CoA 발행이 차단된다 |
| **SCOPE** | 화면 1개(POP) · **API 3개** (`lot-list`/`inspect-list`/`inspect-save`) · 테이블 2개(`TRN_LOT`, `TRN_INSP_RESULT`) |

---

## 1. Overview

### 1.1 Purpose

Lot 단위로 검사 측정값을 입력받아 **자동 판정**하고, 판정 결과를 이력으로 남기며, 불합격 Lot의 후속 진행을 차단한다.

### 1.2 Background

판정은 세 단계로 일어난다. 이 구분이 흐려지면 로직이 엉킨다.

| 단계 | 판정 대상 | 결과 |
|------|---------|------|
| 1 | 측정값 1건 | 항목 판정 (PASS / FAIL) |
| 2 | 그 Lot의 전체 항목 | 종합 판정 (하나라도 FAIL이면 FAIL) |
| 3 | 종합 판정 결과 | Lot 상태 전이 (합격 → 출하가능 / 불합격 → 잠김) |

**판정 로직은 순수 함수로 분리한다.** 측정값·USL·LSL·판정방식 네 개를 받아 PASS/FAIL만 돌려주는 함수여야 한다. DB나 `CamelMap`에 묶이면 단위 테스트가 불가능해지고, 이 스프린트에서 가장 검증이 필요한 코드가 검증 불가가 된다.

### 1.3 Related Documents

- F1 Plan (`JUDGE_TYPE` 3종 정의)
- 요구 원문: `prompt/03.md` §2 Phase 1-2

---

## 2. Scope

### 2.1 In Scope

- [ ] Lot 목록 조회 및 선택
- [ ] 선택 Lot의 검사항목 목록 자동 로딩 (F1 Spec 기준)
- [ ] 측정값 입력 (숫자, 소수 허용)
- [ ] **항목 판정** — 판정방식별 자동 계산 (Range / Max / Min)
- [ ] **종합 판정** — 우선순위 집계: **하나라도 `NONE` → `NONE`** / 하나라도 `FAIL` → `FAIL` / 전부 `PASS` → `PASS` (Design §1.3)
- [ ] 이탈 시 즉시 시각 경고 (셀 배경 Red + 알림)
- [ ] 불합격 Lot 상태 잠금 (`LOT_STATUS`)
- [ ] 검사 실적 저장 (검사자·검사일시 포함)
- [ ] 재검사 입력 — 같은 항목에 새 측정값 추가 가능
- [ ] Quasar 기반 현장 POP UI — 큰 버튼, 큰 입력창
- [ ] 테이블 정의 — `TRN_LOT`, `TRN_INSP_RESULT`

### 2.2 Out of Scope

- 측정 설비 자동 인터페이스 (수기 입력만)
- 바코드 스캐너 연동 (Sprint-2)
- 불합격 Lot의 재작업·폐기 처리 흐름
- 통계적 공정관리(SPC) 관리도

### 2.3 ~~결정 필요~~ **Design에서 확정 완료**

| 항목 | 선택지 | 비고 |
|------|-------|------|
| ~~판정 시점~~ | ~~ⓐ 프론트 ⓑ 서버 ⓒ 둘 다~~ | **확정: ⓒ 이중** — 프론트 즉시 표시 + 서버 최종 (design §2) |
| ~~잠김 해제~~ | ~~누가 어떤 조건으로~~ | **확정: 해제 기능 없음** — 재검사로 PASS 되면 자동 복귀 (design §5) |

> ⚠️ 판정을 프론트에서만 하면 API를 직접 호출해 우회할 수 있다. **서버 판정이 최종**이어야 한다.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|--------|------|
| FR-01 | Lot을 선택하면 해당 품목의 검사항목이 자동으로 채워진다 | High | Pending |
| FR-02 | 측정값 입력 시 항목 판정(PASS/FAIL)이 즉시 표시된다 | High | Pending |
| FR-03 | 판정방식 3종(Range/Max/Min)이 각각 올바르게 계산된다 | High | Pending |
| FR-04 | 전 항목 중 하나라도 FAIL이면 종합판정은 FAIL이다 | High | Pending |
| FR-05 | FAIL 항목은 셀 배경 Red 및 경고 메시지로 구분된다 | High | Pending |
| FR-06 | 종합판정 FAIL 시 Lot 상태가 잠김으로 전이된다 | High | Pending |
| FR-07 | 저장 시 서버가 판정을 **재계산**하고 그 결과를 저장한다 | High | Pending |
| FR-08 | 미입력 항목이 있으면 종합판정을 내리지 않는다 (미완료 상태) | High | Pending |
| FR-08b | **종합판정 결과를 Lot 단위로 영속화한다** — F3가 집계 없이 한 컬럼만 읽어 발행 대상을 거를 수 있어야 한다 | High | Pending |
| FR-09 | 검사자 ID와 검사일시가 함께 저장된다 | Medium | Pending |
| FR-10 | 같은 항목에 재검사 값을 추가 입력할 수 있고, 최신값이 판정에 사용된다 | Medium | Pending |
| FR-11 | 장갑 착용 상태로 조작 가능한 크기의 버튼·입력창 | Medium | Pending |

### 3.2 Non-Functional Requirements

| 구분 | 기준 | 측정 방법 |
|------|------|----------|
| 정확성 | 경계값(측정값 == USL, == LSL)에서 판정이 명확 | 단위 테스트 |
| 반응성 | 입력 → 판정 표시 100ms 이내 | 육안 확인 |
| 무결성 | 서버 판정 결과와 화면 표시가 불일치하지 않는다 | 저장 후 재조회 대조 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-11 구현 (FR-08b 포함)
- [ ] 저장 후 Lot 단위 종합판정 값이 재조회로 확인된다
- [ ] 경계값 테스트 통과 — USL 정확히 같은 값, LSL 정확히 같은 값, 소수점 자리
- [ ] 이탈값 입력 → 즉시 Red + FAIL → 저장 → Lot 잠김 확인
- [ ] 잠긴 Lot이 F3에서 CoA 발행 대상으로 나타나지 않는다

### 4.2 Quality Criteria

- [ ] 판정 로직이 **순수 함수로 분리**되어 단위 테스트가 존재한다
- [ ] DTO 0개, `ResponseEntity` 0건
- [ ] 빌드 에러 0건

---

## 5. Risks and Mitigation

| 위험 | 영향 | 가능성 | 대응 |
|------|------|-------|------|
| 경계값 판정 오류 (`<` vs `<=`) → 불합격품 출하 | **High** | **High** | 판정 함수를 순수 함수로 분리하고 경계값 단위 테스트를 필수화 |
| 부동소수점 오차로 `452.0 != 452` 오판 | **High** | 中 | 수치 비교 방식을 design에서 명시 (BigDecimal 등) |
| 프론트 판정만 믿어 API 우회로 불합격 통과 | **High** | 中 | FR-07 — 서버 재계산을 최종 판정으로 |
| 미입력 항목을 PASS로 간주 | **High** | 中 | FR-08 — 미완료 상태를 별도 구분 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| 리소스 | 유형 | 변경 내용 |
|--------|------|----------|
| `TRN_LOT` | DB 모델 | 신규 (Sprint-2 확장 고려한 컬럼 포함) |
| `TRN_INSP_RESULT` | DB 모델 | 신규 |
| `TRN_LOT` 종합판정 컬럼 | DB 모델 | 신규 (FR-08b — F3가 소비) |
| `/api/quality/lot-list` | API | 신규 (검사 대상 Lot 목록) |
| `/api/quality/inspect-list` | API | 신규 (Lot별 검사항목 + 기존 실적 조회) |
| `/api/quality/inspect-save` | API | 신규 (저장 + 서버 판정) |
| 판정 로직 | 순수 함수 | 신규 |

### 6.2 Current Consumers

| 리소스 | 소비자 | 영향 |
|--------|-------|------|
| `TRN_INSP_RESULT` | **F3** — CoA 본문 측정값·판정 | Breaking |
| `TRN_INSP_RESULT` | **F4** — Pivot 분석 원천 데이터 | Breaking |
| `TRN_LOT.LOT_STATUS` | **F3** — 발행 가능 Lot 필터 | Breaking |
| `TRN_LOT` | **Sprint-2 F7** — Lot 계층 추적 | 컬럼 확장 예정 |
| `MST_INSP_SPEC` (F1) | 본 feature가 소비 | F1 변경 시 영향 받음 |

### 6.3 Verification

- [ ] `TRN_INSP_RESULT` 컬럼이 F3 CoA 본문과 F4 Pivot 요구를 전부 덮는지 확인
- [ ] `TRN_LOT` 이 Sprint-2 F7의 `PARENT_LOT_NO` 확장을 수용하는지 확인

---

## 7. Architecture Considerations

F0 §7 결정 상속. 추가 결정 1건:

| 결정 | 선택 | 근거 |
|------|------|------|
| 판정 로직 위치 | **도메인 순수 함수로 분리** (`CamelMap` 비의존) | 단위 테스트 가능성 확보. Map을 그대로 받으면 테스트에 DB 형태 데이터가 필요해진다 |

---

## 8. Convention Prerequisites

- 판정 결과 코드값: `PASS` / `FAIL` / `NONE`(미검사)
- Lot 상태 코드값: 최소 `WAIT` / `OK` / `LOCKED`
- 측정값은 문자열이 아닌 수치형으로 저장

---

## 9. Next Steps

1. Design — 판정 함수 시그니처, 경계값 처리 방식, `TRN_LOT`/`TRN_INSP_RESULT` DDL, POP 화면 레이아웃
2. Do — 판정 함수 + 단위 테스트 먼저, 그 다음 화면
3. F3 착수 전 잠김 Lot 동작 검증

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성 |
| 0.2 | 2026-09-04 | M4 반영 — FR-08b 신설, API 2→3종, §2.1 종합판정 NONE-우선, §2.3 결정 2건 확정 표기 |
