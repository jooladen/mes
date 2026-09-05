---
template: plan
version: 1.3
feature: F1-quality-spec
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
---

# F1 품목별 품질 Spec 관리 — Plan

> **Summary**: 품목마다 "무엇을, 어느 범위 안에서 측정해야 합격인가"를 등록·수정하는 기준정보 화면.
>
> **Sprint**: `mes-coa-s1` · **Date**: 2026-09-04 · **Status**: Draft
> **선행**: F0 공통 뼈대

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 합격/불합격을 자동 판정하려면 **판정 잣대**가 시스템 안에 있어야 하는데, 지금은 그 잣대를 담을 곳이 없다. |
| **Solution** | 품목별로 검사항목·단위·상한(USL)·하한(LSL)·목표치·판정방식을 등록하는 기준정보 관리 화면을 만든다. |
| **Function/UX Effect** | 품목을 고르면 그 품목의 검사항목 목록이 뜨고, 행 단위로 추가·수정·삭제할 수 있다. |
| **Core Value** | F2의 자동판정과 F3의 성적서 "규격" 열이 **전부 여기서 나온다.** 이게 틀리면 성적서가 거짓말을 한다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Auto Pass/Fail 판정과 CoA의 규격 표기가 참조할 유일한 기준 원천이 필요하다 |
| **WHO** | 품질 담당자 (기준정보 등록·유지) |
| **RISK** | 판정방식 종류를 잘못 잡으면 F2 판정 로직 전체를 다시 짠다 |
| **SUCCESS** | 품목 선택 → 검사항목 5건 등록 → 재조회 시 그대로 보인다 |
| **SCOPE** | 화면 1개 · **API 3개** (`item-list`/`spec-list`/`spec-save`) · 테이블 2개(`MST_ITEM`, `MST_INSP_SPEC`) |

---

## 1. Overview

### 1.1 Purpose

품목(Item)별로 **검사해야 할 항목과 그 합격 범위**를 정의하고 관리한다.

### 1.2 Background

MES에서 "합격"은 의견이 아니라 **계산 결과**여야 한다. 측정값 452가 합격인지 아닌지는 그 품목의 인장강도 규격이 400~500이라는 사실을 시스템이 알고 있을 때만 판정된다. F1은 그 사실을 저장하는 자리다.

판정방식이 한 종류가 아니라는 점이 중요하다. 실무에서는 최소 세 가지가 나온다.

- **범위형(Range)** — LSL ≤ 측정값 ≤ USL (예: 인장강도 400~500)
- **상한형(Max)** — 측정값 ≤ USL (예: 불순물 0.5 이하)
- **하한형(Min)** — LSL ≤ 측정값 (예: 순도 99.5 이상)

이 셋을 `JUDGE_TYPE` 으로 구분한다. 여기서 종류를 빠뜨리면 F2에서 판정이 안 되는 항목이 생긴다.

### 1.3 Related Documents

- 마스터플랜 §3 G1 (데이터 모델)
- 요구 원문: `prompt/03.md` §2 Phase 1-1

---

## 2. Scope

### 2.1 In Scope

- [ ] 품목 목록 조회 (`MST_ITEM`)
- [ ] 선택 품목의 검사항목 Spec 목록 조회
- [ ] Spec 행 추가 / 수정 / 삭제 (그리드 편집)
- [ ] 판정방식 3종 지원 — 범위형 / 상한형 / 하한형
- [ ] 저장 시 유효성 검증 — LSL ≤ USL, 필수값 누락, 항목코드 중복
- [ ] 테이블 정의 — `MST_ITEM`, `MST_INSP_SPEC`

### 2.2 Out of Scope

- Spec 변경 이력 관리 / 버전 관리 (변경 전 값 추적)
- Spec 승인 결재 흐름
- 품목 마스터 자체의 CRUD (Mock 고정 데이터로 제공)
- 계량형이 아닌 **관능검사**(외관 양호/불량 같은 정성 판정)

> 🔸 이력 관리와 관능검사는 실제 MES에는 있는 기능이다. Sprint-1에서는 의도적으로 제외하고, `report` phase의 carry item 으로 남긴다.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|--------|------|
| FR-01 | 품목 목록을 조회해 선택할 수 있다 | High | Pending |
| FR-02 | 선택 품목의 검사항목 Spec 목록이 표시된다 | High | Pending |
| FR-03 | Spec 행을 추가/수정/삭제하고 일괄 저장할 수 있다 | High | Pending |
| FR-04 | 판정방식 3종(Range/Max/Min)을 선택할 수 있다 | High | Pending |
| FR-05 | 저장 시 LSL ≤ USL 을 검증하고 위반 시 저장을 거부한다 | High | Pending |
| FR-06 | 같은 품목 내 검사항목코드 중복을 거부한다 | High | Pending |
| FR-07 | 판정방식이 상한형이면 LSL을, 하한형이면 USL을 입력 불가로 막는다 | Medium | Pending |
| FR-08 | 검사항목의 표시 순서(정렬번호)를 지정할 수 있다 — CoA 인쇄 순서와 동일하게 | Medium | Pending |

### 3.2 Non-Functional Requirements

| 구분 | 기준 | 측정 방법 |
|------|------|----------|
| 정합성 | 저장 실패 시 부분 저장이 남지 않는다 | 저장 실패 후 재조회 |
| 응답 | 목록 조회 500ms 이내 (Mock) | 네트워크 탭 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-08 구현
- [ ] 품목 선택 → 검사항목 5건 등록 → 저장 → 새로고침 → 5건 그대로 조회
- [ ] LSL > USL 로 저장 시도 시 저장 거부 + 사유 표시
- [ ] 판정방식별로 입력 가능 필드가 달라진다

### 4.2 Quality Criteria

- [ ] F0의 `CamelMap` 통로만 사용 (DTO 0개)
- [ ] 빌드 에러 0건
- [ ] 응답에 결합 문자열 없음

---

## 5. Risks and Mitigation

| 위험 | 영향 | 가능성 | 대응 |
|------|------|-------|------|
| 판정방식 종류를 빠뜨려 F2에서 판정 불가 항목 발생 | **High** | 中 | Range/Max/Min 3종을 Plan 단계에서 못박고, F2 Plan의 판정 로직과 1:1 대조 |
| 검사항목 정렬 순서가 없어 CoA 인쇄 순서가 매번 바뀜 | Medium | **High** | FR-08 로 정렬번호를 필수화 |
| Spec 변경 시 과거 성적서 규격이 같이 바뀜 (이력 미관리) | Medium | 中 | Sprint-1은 감수. carry item 으로 명시하고 F3 설계 시 "발행 시점 규격 스냅샷" 여부를 재검토 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| 리소스 | 유형 | 변경 내용 |
|--------|------|----------|
| `MST_ITEM` | DB 모델 | 신규 |
| `MST_INSP_SPEC` | DB 모델 | 신규 |
| `/api/quality/item-list` | API | 신규 (품목 목록) |
| `/api/quality/spec-list` | API | 신규 (Spec 조회) |
| `/api/quality/spec-save` | API | 신규 (Spec 일괄 저장) |

### 6.2 Current Consumers

| 리소스 | 소비자 | 영향 |
|--------|-------|------|
| `MST_INSP_SPEC` | **F2** — 측정값 판정 시 USL/LSL/판정방식 조회 | 컬럼 변경 시 Breaking |
| `MST_INSP_SPEC` | **F3** — CoA 본문 "규격" 열 + 검사항목명 | Breaking |
| `MST_INSP_SPEC` | **F4** — 열 제목·규격 표기·자릿수 표시용 (이탈 판정은 F2 `judgeResult` 사용 — F4 design §5) | Breaking |
| `MST_ITEM` | F3 — CoA 헤더 품명 | Breaking |
| F0 공통 콤보 | 품목 선택 UI | F0 변경 시 영향 받음 |

### 6.3 Verification

- [ ] `MST_INSP_SPEC` 컬럼 집합이 F2·F3·F4 Plan의 요구를 전부 덮는지 확인
- [ ] `JUDGE_TYPE` 3종이 F2 판정 로직 요구사항과 일치하는지 확인

---

## 7. Architecture Considerations

F0 §7 의 결정을 그대로 상속한다. 본 feature 고유의 추가 결정 없음.

---

## 8. Convention Prerequisites

- 판정방식 코드값: `RANGE` / `MAX` / `MIN` (문자열 상수, 매직값 금지)
- 수치 컬럼은 소수 자리를 허용해야 한다 (정수 가정 금지)
- 저장은 전체 목록 단위 일괄 처리 (행 단위 개별 저장 아님)

---

## 9. Next Steps

1. Design **완료** — `MST_ITEM`/`MST_INSP_SPEC` DDL, API **3종** 계약, 화면 레이아웃
2. Do — Mock 데이터로 CRUD 구현
3. F2 착수 전 Spec 등록 결과 검증

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성 |
| 0.2 | 2026-09-04 | M4 반영 — API 2→3종, §6.1 `item-list` 추가, §6.2 F4 용도 정정(이탈 판정 아님) |
