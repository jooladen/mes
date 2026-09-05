---
template: plan
version: 1.3
feature: F0-common-core
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
---

# F0 공통 뼈대 (Common Core) — Plan

> **Summary**: 서버가 준 값이 화면까지 **이름을 잃지 않고 도착하는** 통로를 깔고, 그 통로를 쓰는 공통 콤보 3종을 만든다.
>
> **Sprint**: `mes-coa-s1` · **Date**: 2026-09-04 · **Status**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | F1~F4 네 기능이 전부 "DB → 서버 → 화면" 통로와 "코드+명칭 콤보"를 필요로 하는데, 각자 만들면 4벌이 생기고 서로 다르게 동작한다. |
| **Solution** | 통로(`CamelMap` + Profile 스위칭 + Axios 클라이언트)와 콤보 3종을 **먼저 1벌** 만들어 F1~F4가 공유한다. |
| **Function/UX Effect** | 어떤 화면이든 `{ deptCd, deptNm }` 형태를 그대로 받아 표시 방식만 슬롯에서 바꾼다. DB 문자열 결합이 사라진다. |
| **Core Value** | 이 스프린트의 **재작업 방지 장치**. F0가 흔들리면 F1~F4가 전부 흔들린다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | F1~F4의 공통 선행조건. 개별 구현 시 4중 중복 + 불일치 발생. |
| **WHO** | 개발자(준) — 최종 사용자에게 직접 보이지 않는 기반 계층 |
| **RISK** | 여기서 정한 규약이 틀리면 F1~F4 전부를 다시 고쳐야 한다 (blast radius = 스프린트 전체) |
| **SUCCESS** | Mock 프로파일에서 `/api/common/dept-list` 를 호출해 `CodeSelect` 목록에 `[0000] 개발부` 가 **2열로** 렌더된다 |
| **SCOPE** | 백엔드 기반 3종 + 프론트 공통 컴포넌트 3종 + **API 2개** (`dept-list`, `process-tree`) |

---

## 1. Overview

### 1.1 Purpose

서버가 반환한 데이터가 **필드 이름을 유지한 채** 화면 컴포넌트까지 도달하는 통로를 만든다. 그리고 그 통로를 처음으로 사용하는 콤보 컴포넌트 3종을 제공한다.

### 1.2 Background

지시서(01·03.md)가 정한 5개 아키텍처 원칙 — No JPA / No DTO / No ResponseEntity / DB Agnostic / No SQL Concatenation — 은 전부 **이 통로의 모양**을 규정한다. 원칙이 지켜지는 자리가 F0이고, F1~F4는 그 통로를 쓰기만 한다.

특히 **No SQL Concatenation** 이 F0의 존재 이유다. `DEPTCD || '|' || DEPTNM` 으로 DB에서 합쳐 보내면 화면에서 다시 쪼갤 수 없다. 코드와 명칭을 분리된 채로 보내고, 합치는 일은 화면이 한다.

### 1.3 Related Documents

- 마스터플랜: `docs/01-plan/features/mes-coa.master-plan.md`
- 요구 원문: `prompt/01.md` §1~§4, `prompt/03.md` §1·§3·§4

---

## 2. Scope

### 2.1 In Scope

- [ ] `CamelMap` 클래스 — MyBatis 스네이크 컬럼(`DEPT_CD`)을 카멜(`deptCd`)로 자동 변환하는 Map
- [ ] MyBatis 공통 설정 — `mapUnderscoreToCamelCase=true`, `CamelMap` TypeAlias 등록
- [ ] Profile 스위칭 구조 — `@Profile("mock")` / `@Profile("mybatis")` 두 구현체를 Service 인터페이스 뒤에 배치
- [ ] Mock 데이터 서비스 — DB 없이 즉시 응답하는 가짜 구현체
- [ ] **API 2개** — `POST /api/common/dept-list` (통로 검증용), `POST /api/common/process-tree` (트리 콤보용)
- [ ] Axios 공통 클라이언트 — baseURL·에러 처리·POST 규약 통일
- [ ] **`CodeSelect.vue`** — 코드+명칭을 **가로 2열로 표시**하는 단일선택 콤보 (§2.4 참조)
- [ ] `MultiCheckCombo.vue` — 다중 선택 + 체크박스 + 칩 표시
- [ ] `MultiTreeCombo.vue` — 팝업 내부 트리 + 다중 체크 + 칩 표시
- [ ] 기준정보 테이블 2종 정의 — `MST_DEPT`, `MST_PROCESS`
- [ ] **`TRN_WORK_ORDER` 테이블 정의** — Sprint-2 선반영분. 화면·API 없이 **DDL과 Mock 데이터만** 산출한다 (소유 feature 명시)

### 2.2 Out of Scope

- **SQLite / Oracle 실제 연결** — Sprint-1은 **Mock 프로파일만** 동작시킨다
- 인증·권한·세션
- 공통 그리드 컴포넌트 (RealGrid2는 F4에서 다룬다)
- 다국어, 테마

### 2.3 DB 전환 순서 (확정)

```
[1단계] Mock        ← Sprint-1 범위. DB 없이 메모리 데이터로 전 기능 완주
[2단계] SQLite3     ← Sprint-1 이후. MyBatis Mapper XML 첫 작성
[3단계] Oracle      ← 최종. 방언(sysdate, concat 등)만 교체
```

Controller·Service 인터페이스는 세 단계 내내 **한 글자도 바뀌지 않아야 한다.** 바뀐다면 추상화가 잘못된 것이다.

### 2.4 `CodeSelect.vue` — 코드+명칭 2열 콤보 (신규 제작)

**해결할 문제**: Quasar `q-select` 는 `option-label` 로 지정한 **키 하나만** 드롭다운에 표시한다. 부서를 고를 때 부서명만 보이고 부서코드가 안 보인다. 실무에서는 동명이부서·유사명칭이 있어 **코드를 같이 봐야 정확히 고를 수 있다.**

**원하는 동작**:

```
▼ 클릭하면 목록이 이렇게 열린다
┌────────────────────────────┐
│ [0000]   개발부             │   ← 코드와 명칭이 가로 2열
│ [0100]   개발1팀            │
│ [0200]   품질보증팀          │
└────────────────────────────┘

선택하면 선택 바에도 둘 다 표시된다
┌────────────────────────────┐
│ 개발부 | 0000            ▼ │
└────────────────────────────┘
```

**구현 수단 — Quasar 공식 Scoped Slot** (확인 완료, quasar.dev/vue-components/select)

| 슬롯 | 용도 | 제공 데이터 |
|------|------|-----------|
| `#option` | 드롭다운 각 행을 직접 그린다 | `scope.opt` = **서버 응답 객체 원본**, `scope.itemProps` |
| `#selected-item` | 선택 항목 표시를 바꾼다 | `scope.opt`, `scope.index`, `scope.removeAtIndex` |
| `#selected` | 선택 영역 전체를 바꾼다 | — |

핵심은 `scope.opt` 가 **`option-label` 을 거치지 않은 원본 Map** 이라는 점이다. `deptCd` 든 `deptNm` 이든 원하는 키를 꺼내 자유롭게 배치할 수 있다. 이것이 §1.2의 "코드와 명칭을 분리해 보내고 화면이 조립한다"를 성립시키는 실제 메커니즘이다.

> ⚠️ **주의**: `with-value` / `selected-label` / `first-option` 은 **Quasar `q-select` 의 prop이 아니다.** 공식 문서 확인 결과 QSelect가 제공하는 커스터마이징 수단은 위 슬롯 3종이다. 유사 prop을 가진 코드를 보았다면 다른 라이브러리이거나 사내 래퍼다. **본 프로젝트는 슬롯으로 직접 구현한다.**

**범용성 요구**: 부서 전용이 아니라 **코드성 마스터 전반**(부서·공정·품목·검사항목·공통코드)에 재사용 가능해야 한다. 표시할 키 이름을 prop으로 받는다.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|--------|------|
| FR-01 | Mapper가 반환한 스네이크 컬럼이 카멜 키로 자동 변환되어야 한다 | High | Pending |
| FR-02 | Controller는 `CamelMap` 또는 `List<CamelMap>` 을 **그대로** 반환한다 (`ResponseEntity` 래핑 없음) | High | Pending |
| FR-03 | `application.yml` 의 profile 값만 바꿔 Mock ↔ MyBatis 구현체가 교체되어야 한다 | High | Pending |
| FR-04 | Mock 프로파일에서 DB 없이 부서 목록이 응답되어야 한다 | High | Pending |
| FR-05 | API 응답 배열이 `q-select` 의 `:options` 에 **변환 없이 그대로** 바인딩된다 | High | Pending |
| FR-06 | `CodeSelect` 드롭다운 각 행에 **코드와 명칭이 가로 2열**로 표시된다 (`#option` 슬롯) | High | Pending |
| FR-06b | `CodeSelect` 선택 바에도 코드와 명칭이 함께 표시된다 (`#selected-item` 슬롯) | High | Pending |
| FR-06c | 표시할 키 이름(`deptCd`/`deptNm` 등)을 prop으로 받아 코드성 마스터 전반에 재사용 가능하다 | High | Pending |
| FR-07 | `MultiCheckCombo` 는 항목별 체크박스로 다중 선택하고 결과를 칩으로 표시한다 | Medium | Pending |
| FR-08 | `MultiTreeCombo` 는 계층 데이터를 트리로 펼쳐 다중 체크하고 결과를 칩으로 표시한다 | Medium | Pending |
| FR-09 | 모든 조회 API는 POST 방식이며 요청 파라미터도 Map으로 받는다 | High | Pending |
| FR-10 | Mock → SQLite3 → Oracle 전환 시 Controller·Service 인터페이스가 변경되지 않는다 | High | Pending |

### 3.2 Non-Functional Requirements

| 구분 | 기준 | 측정 방법 |
|------|------|----------|
| 이식성 | 서비스 인터페이스에 DB·SQL 종속 타입이 노출되지 않는다 | 인터페이스 시그니처 육안 검토 |
| 응답 | Mock 응답 200ms 이내 | 브라우저 네트워크 탭 |
| 일관성 | 응답 키가 전부 카멜케이스 | 응답 JSON 검사 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-10 전부 구현
- [ ] Mock 프로파일로 서버 기동 → 브라우저에서 `CodeSelect` 에 부서 목록이 뜬다
- [ ] 드롭다운 각 행에 `[0000]  개발부` 가 가로 2열로 보인다
- [ ] 선택 시 선택 바에도 코드와 명칭이 함께 표시된다
- [ ] 같은 컴포넌트에 공정 목록(`procCd`/`procNm`)을 넣어도 동작한다
- [ ] 응답 JSON 어디에도 `|` 로 합쳐진 문자열이 없다

### 4.2 Quality Criteria

- [ ] DTO 클래스 0개 (`grep` 으로 확인)
- [ ] `ResponseEntity` 사용 0건
- [ ] JPA/Hibernate 의존성 0건
- [ ] 빌드 에러 0건

---

## 5. Risks and Mitigation

| 위험 | 영향 | 가능성 | 대응 |
|------|------|-------|------|
| `CamelMap` 규약이 잘못 정해져 F1~F4를 전부 수정 | **High** | 中 | F1 착수 전에 F0를 브라우저에서 눈으로 검증한다 |
| Map 기반이라 오타(`deptCd` → `depCd`)를 컴파일러가 못 잡음 | Medium | **High** | Mock 응답을 계약의 단일 원천으로 삼고, 키 목록을 design 문서에 고정 |
| `CodeSelect` 가 부서 전용으로 만들어져 F1~F4에서 재사용 불가 | Medium | **High** | FR-06c — 키 이름을 prop으로 받는 범용 형태로 설계 |
| Quasar 슬롯 구조 학습 비용 (`#option` / `#selected-item`) | Low | 中 | `CodeSelect` 하나를 레퍼런스로 완성하고 나머지 2개를 같은 패턴으로 제작 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| 리소스 | 유형 | 변경 내용 |
|--------|------|----------|
| `CamelMap` | 신규 클래스 | 신규 생성 |
| MyBatis 설정 | Config | `mapUnderscoreToCamelCase`, TypeAlias 추가 |
| `MST_DEPT` / `MST_PROCESS` | DB 모델 | 신규 정의 (Mock 단계에서는 메모리 데이터) |
| `/api/common/dept-list` | API | 신규 (부서 목록) |
| `/api/common/process-tree` | API | 신규 (공정 평면 목록) |
| `TRN_WORK_ORDER` | DB 모델 | 신규 (Sprint-2 선반영 — DDL + Mock 만) |

### 6.2 Current Consumers

신규 프로젝트로 **기존 소비자 없음**. 단, 아래가 향후 소비자로 예정되어 있다.

| 리소스 | 향후 소비자 | 영향 |
|--------|-----------|------|
| `CamelMap` | F1·F2·F3·F4 전 API | 규약 변경 시 전부 Breaking |
| 공통 콤보 3종 (`CodeSelect` / `MultiCheckCombo` / `MultiTreeCombo`) | F1(품목·검사항목 `CodeSelect`), **F2(검사자 `CodeSelect`)**, F3(품목 · **발행자** `CodeSelect`), F4(품목 `CodeSelect` · **공정 `MultiTreeCombo`**) | 인터페이스 변경 시 Breaking |

> **F2는 품목 필터를 쓰지 않는다.** 현장 POP 화면(F2 design §3)의 입력 컨트롤은 `Lot ▼` 와 `검사자 ▼` 뿐이며, 품목·상태는 선택된 Lot의 읽기 전용 라벨이다(F2 design §9.1 D35). `검사자`·`발행자` 는 F0 design §9.3 `user-list` 를 `CodeSelect` 로 렌더한 것이다(D34).
>
> **공정 `MultiTreeCombo` 의 유일한 소비자는 F4다.** 초안은 F2로 적었으나 F2 design §3 화면과 §9.1 요청 파라미터 어디에도 공정 필터가 없다 (F2는 `itemCd` 만 받는다). data-model §3.2 기재와 일치시킨 정정분이다.

### 6.3 Verification

- [ ] F1~F4 Plan의 요구사항이 F0가 제공하는 것만으로 충족되는지 대조
- [ ] 콤보 3종의 props/emit 이름이 F1~F4에서 그대로 쓸 수 있는 일반형인지 확인

---

## 7. Architecture Considerations

### 7.1 Project Level

| Level | 선택 |
|-------|:---:|
| Starter | ☐ |
| **Dynamic** | ☑ |
| Enterprise | ☐ |

→ 백엔드 있는 웹앱. 단 BaaS가 아니라 자체 Spring Boot 서버.

### 7.2 Key Architectural Decisions

> 아래는 지시서(01·03.md)에서 **이미 확정된** 제약이다. 재논의 대상이 아니라 기록이다.

| 결정 | 선택 | 근거 |
|------|------|------|
| Frontend | Vue3 `script setup` | 지시서 확정 |
| UI 라이브러리 | Quasar | 지시서 확정 |
| 그리드 | RealGrid2 | 지시서 확정 (F4에서 사용) |
| Backend | Spring Boot | 지시서 확정 |
| ORM | **MyBatis 전용, JPA 금지** | 지시서 확정 |
| 데이터 전달 객체 | **DTO 없음, `CamelMap` 단일** | 지시서 확정 |
| Controller 반환 | **`ResponseEntity` 없이 직접 반환** | 지시서 확정 |
| DB | Mock → SQLite → Oracle (Profile 스위칭) | 지시서 확정 |
| API Client | Axios | 지시서 확정 |

---

## 8. Convention Prerequisites

- 응답 키: 카멜케이스
- 코드/명칭 키 이름은 **도메인 접두어 + `Cd`/`Nm`** 으로 통일한다 (`deptCd`/`deptNm`, `procCd`/`procNm`, `itemCd`/`itemNm`)
- 코드/명칭은 **항상 분리된 두 키**로 반환. 결합 문자열 금지
- 조회 API도 POST
- Mock 구현체는 실제 Mapper와 **동일한 키 집합**을 반환해야 한다
- Mock 데이터는 SQLite/Oracle 전환 시 그대로 seed 데이터로 재사용할 수 있는 형태로 작성한다

---

## 9. Next Steps

1. Design **완료** — `CamelMap` 시그니처, `CodeSelect` props/slot 계약, 콤보 2종 계약, **API 2종** 계약, `MST_DEPT`/`MST_PROCESS`/**`TRN_WORK_ORDER`** DDL
2. Do phase — Mock 프로파일 우선 구현
3. F1 착수 전 브라우저 육안 검증 (드롭다운 2열 표시 확인)

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성 |
| 0.2 | 2026-09-05 | M4 12차 반영 — §6.2 공통 콤보 소비자 정정 (공정 `MultiTreeCombo` 소비자 F2 → F4, F3 품목 필터 추가) |
| 0.3 | 2026-09-05 | M4 15차 반영 — §6.2 에 F2 검사자·F3 발행자 `CodeSelect` 소비 추가, F2 품목 필터 미사용 명시 |
