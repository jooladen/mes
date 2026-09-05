---
template: plan
version: 1.3
feature: F4-quality-pivot
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
---

# F4 품질 이력 Pivot 분석 (RealGrid2) — Plan

> **Summary**: 기간을 지정하면 그 기간 Lot들의 검사값이 **한 표에 펼쳐지고, 규격을 벗어난 칸만 빨갛게** 보인다.
>
> **Sprint**: `mes-coa-s1` · **Date**: 2026-09-04 · **Status**: Draft
> **선행**: F0, F1, F2 · **우선순위**: P1 (F0~F3보다 낮음)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 성적서는 Lot 한 건씩만 본다. "지난달 인장강도가 계속 하한 근처로 내려가고 있다" 같은 **추세**를 볼 방법이 없다. |
| **Solution** | 기간별 검사 측정값을 Lot(행) × 검사항목(열) 피벗 표로 펼치고, 이탈 셀을 색으로 강조하며, Excel로 내보낸다. |
| **Function/UX Effect** | 관리자가 한 화면에서 품질 흐름을 훑고, 필요한 부분만 엑셀로 받아 간다. |
| **Core Value** | 관리자에게 **제안할 때 보여줄 화면.** F3가 실무 산출물이라면 F4는 설득 자료다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 건별 성적서만으로는 품질 추세를 못 본다. 관리자 관점 아웃풋(04.md)에 직접 대응 |
| **WHO** | 공장 관리자 · 품질 관리자 |
| **RISK** | ~~RealGrid2 라이선스 미확보~~ **해소(2026-09-04)** — 개발자용 테스트 라이선스 확보. 잔여 위험은 이탈 판정을 F2와 따로 구현해 결과가 어긋나는 것 |
| **SUCCESS** | 기간 지정 → 피벗 표 표시 → 이탈 셀 Red → Excel 다운로드 |
| **SCOPE** | 화면 1개 · **API 1개** (`inspect-history`) · 신규 테이블 없음 (F1·F2 데이터 조회만) |

---

## 1. Overview

### 1.1 Purpose

기간·품목 조건으로 검사 실적을 조회해 **Lot × 검사항목 피벗 표**로 표시하고, 규격 이탈 셀을 시각 강조하며, Excel로 내보낸다.

### 1.2 Background

이 기능은 **신규 데이터를 만들지 않는다.** F1의 규격과 F2의 측정값을 다르게 보여줄 뿐이다. 그래서 데이터 모델 변경이 없고, 실패해도 F0~F3에 영향이 없다 — 마스터플랜에서 P1으로 강등해 격리한 이유다.

**"열이 데이터에 따라 늘어난다"** 는 점이 일반 그리드와 다르다. 품목마다 검사항목 수가 다르므로 열 개수가 조회 결과에 따라 달라진다. 컬럼을 코드에 고정할 수 없고 동적으로 만들어야 한다.

### 1.3 RealGrid2 확보 — 마스터플랜 R3 **해소**

**2026-09-04 확인**: 개발자용 테스트 라이선스 확보. 동일 스택(`realgrid 2.10.0` + `quasar 2.25.0` + `vue 3.5.41` + Vite)이 이미 동작하는 참조 프로젝트가 존재한다.

라이선스는 **환경변수로 주입**한다. 키 값은 어떤 소스·문서에도 하드코딩하지 않는다.

```
.env.local :  VITE_REALGRID_LICENSE=<키>       ← .gitignore 대상
.env.example: VITE_REALGRID_LICENSE=            ← 빈 값으로 커밋
main.js     :  RealGrid.setLicenseKey(import.meta.env.VITE_REALGRID_LICENSE)
```

대체 경로(`q-table`)는 **폐기하지 않고 보류**한다. 라이선스 만료 시 되돌아올 지점이다.

---

## 2. Scope

### 2.1 In Scope

- [ ] 조회 조건 — 기간(시작~종료), 품목, 공정
- [ ] 피벗 표시 — 행 = Lot, 열 = 검사항목(동적), 값 = 측정값
- [ ] 규격 이탈 셀 배경 Red 조건부 서식
- [ ] Excel Export
- [ ] 열 개수가 조회 결과에 따라 동적으로 구성된다
- [ ] 종합판정 FAIL Lot 행 구분 표시

### 2.2 Out of Scope

- 관리도(X-bar R), Cp/Cpk 등 통계 지표
- 차트·그래프 시각화
- 저장된 조회 조건 / 즐겨찾기
- 스케줄 리포트 자동 발송

### 2.3 ~~결정 필요~~ **Design에서 확정 완료**

| 항목 | 선택지 | 비고 |
|------|-------|------|
| ~~그리드~~ | ~~ⓐ RealGrid2 ⓑ q-table~~ | **확정: RealGrid2** (§1.3) |
| ~~피벗 변환 위치~~ | ~~ⓐ 서버 피벗 ⓑ 프론트 피벗~~ | **확정: ⓑ 프론트** — 서버가 화면 형태를 모르게 유지 (F4 design §2) |

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|--------|------|
| FR-01 | 기간·품목 조건으로 검사 실적을 조회한다 | High | Pending |
| FR-02 | 조회 결과가 Lot(행) × 검사항목(열) 피벗으로 표시된다 | High | Pending |
| FR-03 | 검사항목 열이 조회 결과에 따라 동적으로 생성된다 | High | Pending |
| FR-04 | 규격을 벗어난 셀의 배경이 Red로 표시된다 | High | Pending |
| FR-05 | 현재 조회 결과를 Excel 파일로 내려받을 수 있다 | Medium | Pending |
| FR-06 | 종합판정 FAIL Lot의 행이 시각적으로 구분된다 | Medium | Pending |
| FR-07 | 측정값이 없는 항목은 빈 칸으로 표시된다 (0이 아님) | Medium | Pending |
| FR-08 | 검사항목 열 순서가 F1 정렬번호를 따른다 | Low | Pending |

### 3.2 Non-Functional Requirements

| 구분 | 기준 | 측정 방법 |
|------|------|----------|
| 성능 | Lot 500건 조회 시 3초 이내 렌더 | Mock 대량 데이터로 확인 |
| 정확성 | 이탈 판정이 F2 판정 결과와 일치 | 표시 결과 대조 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-08 구현 (또는 대체 경로로 구현)
- [ ] 기간 지정 → 피벗 표 표시 → 이탈 셀 Red 확인
- [ ] Excel 다운로드 파일이 화면 내용과 일치
- [ ] 검사항목 수가 다른 두 품목을 조회해도 열이 올바르게 구성됨

### 4.2 Quality Criteria

- [ ] 이탈 판정 기준이 F2 판정 함수와 **동일 로직**을 사용 (중복 구현 금지)
- [ ] DTO 0개, `ResponseEntity` 0건
- [ ] 빌드 에러 0건

---

## 5. Risks and Mitigation

| 위험 | 영향 | 가능성 | 대응 |
|------|------|-------|------|
| ~~RealGrid2 미확보~~ | — | — | **해소** (§1.3). 테스트 라이선스 확보 |
| 라이선스 키가 소스/문서에 하드코딩되어 유출 | **High** | 中 | 환경변수 주입만 허용. `.env.local` 은 `.gitignore`, `.env.example` 은 빈 값 |
| 테스트 라이선스 만료로 로컬 실행 불가 | Medium | 中 | `q-table` 대체 경로를 문서에 보존 (§1.3) |
| 이탈 판정을 F4에서 다시 구현해 F2와 결과가 어긋남 | **High** | 中 | F2의 판정 순수 함수를 **재사용**. 새로 짜지 않는다 |
| 동적 컬럼 구성 실패 (품목별 항목 수 차이) | Medium | 中 | 항목 수가 다른 두 품목으로 사전 검증 |
| 대량 데이터 렌더 지연 | Medium | 中 | 조회 기간 상한을 두거나 페이징 검토 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| 리소스 | 유형 | 변경 내용 |
|--------|------|----------|
| `/api/quality/inspect-history` | API | 신규 (기간별 평면 조회) |
| **신규 테이블 없음** | — | F1·F2 데이터만 읽는다 |

### 6.2 Current Consumers

| 리소스 | 관계 | 영향 |
|--------|------|------|
| `TRN_INSP_RESULT` (F2) | 본 feature가 **읽기만** 함 | F2 변경 시 영향 받음 |
| `MST_INSP_SPEC` (F1) | **열 제목·규격 표기·자릿수 표시용**으로 읽음 (이탈 판정은 F2 `judgeResult` 사용 — Design §5) | F1 변경 시 영향 받음 |
| F2 판정 함수 (`SpecJudge` / `specJudgeClient.js`) | 재사용 | 시그니처 변경 시 영향 받음 |
| F2 `specFormat.js` (`formatSpecRange`) | 재사용 | 열 제목·자릿수 표기 |

> 본 feature는 **쓰기(Write)가 없다.** 따라서 다른 feature를 깨뜨릴 위험이 구조적으로 낮다.

### 6.3 Verification

- [ ] F2 판정 함수를 재사용 가능한 형태로 노출했는지 확인 (F2 Design 의존)
- [ ] 조회 API가 피벗이 아닌 평면 형태를 반환하는지 확인

---

## 7. Architecture Considerations

F0 §7 결정 상속. 추가 결정 1건:

| 결정 | 선택 | 근거 |
|------|------|------|
| 그리드 라이브러리 | **RealGrid2 2.10.0** | 테스트 라이선스 확보. 동일 스택 참조 프로젝트 존재 |
| 라이선스 주입 | `import.meta.env.VITE_REALGRID_LICENSE` | 하드코딩 금지. 빌드 도구는 Vite |

---

## 8. Convention Prerequisites

- 서버는 **평면 데이터**를 반환한다 (피벗 변환은 화면 책임) — F0의 "표현은 화면이 한다" 원칙 연장
- 이탈 판정 로직은 F2 것을 재사용하고 신규 구현하지 않는다
- 빈 값과 0을 구분해 표현한다

---

## 9. Next Steps

1. ~~라이선스 확보 확인~~ **완료**
2. Design — 조회 API 계약, 동적 컬럼 구성 방식, RealGrid2 Pivot 설정
3. Do — F0~F3 완료 후 착수

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성 |
| 0.2 | 2026-09-04 | M4 반영 — RealGrid2 확정(R3 해소), §2.3 결정 2건 확정 표기, §6.2 용도·재사용 파일 명시 |
