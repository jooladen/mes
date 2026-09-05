---
template: design
version: 1.0
feature: F4-quality-pivot
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
plan: docs/01-plan/features/F4-quality-pivot.plan.md
---

# F4 품질 이력 Pivot 분석 (RealGrid2) — Design

> **Plan**: `docs/01-plan/features/F4-quality-pivot.plan.md`
> **선행**: F0, F1, F2 · **신규 테이블 없음** — 읽기 전용 feature

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 건별 성적서로는 품질 추세를 못 본다. 관리자 관점 아웃풋 |
| **WHO** | 공장 관리자 · 품질 관리자 |
| **RISK** | 이탈 판정을 F2와 따로 구현하면 두 화면이 다른 답을 낸다 |
| **SUCCESS** | 기간 지정 → 피벗 표 → 이탈 셀 Red → Excel 다운로드 |

---

## 1. 이 feature의 성격

**쓰기(Write)가 없다.** F1 규격과 F2 실적을 다르게 보여줄 뿐이다.

| 결과 | |
|------|---|
| 데이터 모델 변경 | 없음 |
| 다른 feature를 깨뜨릴 위험 | 구조적으로 없음 |
| 실패 시 영향 | F0~F3 무영향 (P1으로 격리) |

---

## 2. 피벗 변환 위치 — 프론트 (Plan §2.3 확정)

```
서버: 평면(flat) 배열 반환          화면: 피벗 변환 + 동적 컬럼 구성
┌──────────────────────────┐       ┌────────────────────────────────┐
│ lotNo  inspItemCd  value │  ──►  │ Lot \ 항목  인장강도 경도 불순물 │
│ L-001  TS          452   │       │ L-001        452    58   0.42  │
│ L-001  HRD         58    │       │ L-002        390    60   0.51  │
│ L-002  TS          390   │       └────────────────────────────────┘
└──────────────────────────┘
```

**서버가 피벗을 만들지 않는 이유**: 피벗은 **화면의 표현 방식**이다. 서버가 피벗 형태로 반환하면 응답 키가 데이터에 따라 달라지고(`인장강도: 452`), 다른 화면에서 목록으로 쓰려면 다시 평탄화해야 한다. F0의 "표현은 화면이 한다" 원칙의 연장이다.

---

## 3. 화면 설계

```
┌──────────────────────────────────────────────────────────────────────┐
│ 기간 [2026-09-01] ~ [2026-09-04]  품목 [CodeSelect ▼]                │
│ 공정 [MultiTreeCombo ▼]                      [조회] [Excel 내보내기]  │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────┬──────────┬─────────┬────────┬────────┬────────┐          │
│ │ Lot No │ 품목      │ 판정일   │인장강도 │ 경도   │ 불순물  │ ← 동적  │
│ ├────────┼──────────┼─────────┼────────┼────────┼────────┤          │
│ │ L-001  │스틸브라켓 │09-04    │ 452.0  │  58    │ 0.420  │          │
│ │ L-002  │스틸브라켓 │09-04    │ 390.0  │  60    │ 0.510  │ ← 행 강조│
│ │        │          │         │ ▓이탈▓  │        │ ▓이탈▓ │   (FAIL)│
│ └────────┴──────────┴─────────┴────────┴────────┴────────┘          │
│                          고정 3열 │ 동적 N열                          │
└──────────────────────────────────────────────────────────────────────┘
```

- **고정 3열**: `lotNo` / `itemNm` / `judgeDt`
- **동적 N열**: 조회 결과에 등장한 검사항목. `SORT_NO` 순 (Plan FR-08)
- **조회조건 콤보**: 품목 `CodeSelect` ← F1 design §9.1 `item-list` / 공정 `MultiTreeCombo` ← F0 design §9.2 `process-tree` (§10 소비 API)

---

## 4. 동적 컬럼 구성 (Plan FR-03)

품목마다 검사항목 수가 다르므로 컬럼을 코드에 고정할 수 없다.

```
① 응답의 detailList 에서 (inspItemCd, inspItemNm, unitCd, sortNo) 중복 제거
② sortNo 오름차순 정렬
③ 고정 3열 + 동적 열 순서로 RealGrid2 필드/컬럼 재구성
④ setDataSource → 행 데이터 주입
```

**조회할 때마다 컬럼을 새로 만든다.** 이전 조회의 컬럼이 남아 있으면 품목을 바꿨을 때 없는 항목 열이 빈 채로 남는다.

> **`printSeq` 가 아니라 `sortNo` 를 쓰는 이유 (D3)**: `printSeq`(F3 §3.0)는 **한 Lot의 성적서 안에서** 1부터 조밀 재부여한 값이다. F4는 여러 Lot을 가로로 펼치므로 Lot마다 `printSeq` 가 달라 열 순서 기준이 될 수 없다. `MST_INSP_SPEC.SORT_NO` 는 품목 단위로 고정된 값이라 열 정렬 기준으로 적합하다.

> **빈 셀 채우기 (D11)**: `detailList` 에 `(lotNo, inspItemCd)` 행이 없으면 그 셀을 `null` 로 채운다. `0` 이 아니다 (FR-07).

`decimalLen` 은 각 동적 컬럼의 표시 자릿수로 쓴다 (F3 design §3.2와 동일 규칙 — 응답 키 기준).

---

## 5. 이탈 판정 — **F2 로직 재사용** (Plan §8)

⚠️ **이 feature에서 가장 중요한 제약이다.**

```
❌ 금지: F4에서 lsl/usl 비교를 새로 구현
✅ 필수: F2의 판정 결과를 그대로 쓰거나, 같은 함수를 호출 (F2 design §1.1 `SpecJudge`)
```

**1순위 — 서버 판정값을 그대로 사용**

`TRN_INSP_RESULT.JUDGE_RESULT` 가 이미 F2 서버가 계산해 저장한 값이다. F4는 이 값이 `FAIL` 인 셀을 빨갛게 칠하기만 한다. **비교 연산을 하지 않는다.**

이러면 F2와 F4가 다른 답을 내는 것이 **구조적으로 불가능**하다.

**2순위 — 화면에서 재판정이 필요하면**

`src/utils/specJudgeClient.js` (F2가 만든 프론트 판정 함수)를 **import 해서** 쓴다. 새로 짜지 않는다.

---

## 6. RealGrid2 사용

### 6.1 라이선스

F0 §7에서 `main.js` 가 주입한다. F4는 **키를 직접 다루지 않는다.**

```js
// main.js (F0 산출물)
RealGrid.setLicenseKey(import.meta.env.VITE_REALGRID_LICENSE)
```

키 값은 `.env.local`(gitignore)에만 존재한다. 소스·문서·로그에 남기지 않는다.

### 6.2 사용 기능

| 기능 | RealGrid2 수단 |
|------|--------------|
| 동적 컬럼 | `setFields()` + `setColumns()` 재호출 (§4) |
| 이탈 셀 강조 | `styleCallback` — `judgeResult === 'FAIL'` 이면 배경 Red |
| FAIL 행 강조 | 행 단위 `styleCallback` (Plan FR-06) |
| Excel Export | `exportGrid({ type: 'excel' })` (Plan FR-05) |
| 빈 값 표시 | `displayCallback` — `null` 은 빈 칸, `0` 은 `0` (Plan FR-07) |

**`null` 과 `0` 구분이 중요하다.** 측정 안 한 항목을 `0` 으로 보이면 "0을 측정했다"로 읽힌다.

> ⚠️ **`styleCallback` 이 판정값을 못 보는 함정 (D44, 2026-09-05 구현 중 발견)**: RealGrid2 는 `provider.setFields()` 로 **선언하지 않은 키를 `setRows()` 때 말없이 버린다.** 행 객체에 `judgeResult` 를 담아 보내도 `styleCallback` 안에서는 항상 `undefined` 라 **이탈 셀이 칠해지지 않는다** — 에러도 경고도 없다.
>
> 판정을 컬럼으로 선언하면 화면에 안 보여야 할 열이 검사항목 수만큼 생기고 Excel 에도 딸려 나간다. 그래서 **판정 색인을 그리드 밖에 따로 들고**, `styleCallback` 에서 `grid.getValue(dataRow, 'lotNo')` 로 행을 식별해 조회한다. 행 강조(FR-06)도 같은 방식이다.
>
> `styleCallback` 반환값은 **`styleName` 문자열**이다. `{ styleName: '...' }` 객체가 아니다. 그리고 그 클래스는 **전역 CSS** 여야 한다 — `<style scoped>` 에 두면 그리드가 만든 DOM 에 스코프 해시가 안 붙어 규칙이 먹지 않는다.

### 6.3 그리드 인스턴스 생명주기

```
onMounted   → GridView / LocalDataProvider 생성
조회         → setFields/setColumns 재구성 → setRows
onUnmounted → destroy()   ← 필수
```

`destroy()` 를 빠뜨리면 화면을 오갈 때마다 인스턴스가 쌓여 메모리가 샌다.

---

## 7. 성능 (Plan NFR — 500건 3초)

| 대응 | |
|------|---|
| 서버 조회 기간 상한 | **92일**. 초과 시 `PERIOD_TOO_LONG` |
| 응답 행 수 상한 | **`detailList` 10,000행**. 초과 시 `TOO_MANY_ROWS` — 조건을 좁히라는 안내. **`lotList` 가 아니라 셀 원천을 센다** (D24) |
| 인덱스 | `TRN_INSP_RESULT (LOT_NO, INSP_ITEM_CD, LATEST_YN)` (data-model §3.7) |
| 렌더 | RealGrid2 가상 스크롤 (기본 동작) |

**페이징을 넣지 않는다.** 피벗은 전체를 한눈에 보는 화면이라 페이징하면 목적이 사라진다. 대신 상한으로 막는다.

> **왜 `detailList` 기준인가 (D24)**: 브라우저가 실제로 감당하는 것은 **피벗 셀 수**이고 그 원천은 `detailList` 다. `lotList` 로 세면 Lot 500건 × 검사항목 50개 = 25,000 셀이 상한을 그대로 통과해 화면이 멈춘다. 반대로 §9.1 `totalCount` 는 화면 하단 "총 N건" 표시용이라 **`lotList` 행 수 기준을 유지**한다 — 두 숫자는 기준이 다르며, 그 사실을 §9.1 응답 키 표에 명시한다.

---

## 8. 레이어 배치

```
InspectionHistoryController
    └── InspectionHistoryService (interface)
            ├── ...MockServiceImpl   @Profile("mock")
            └── ...ServiceImpl       @Profile("mybatis*")
                    └── InspectionHistoryMapper + XML   (조회 전용)
```

Mapper에 `insert`/`update`/`delete` 를 **정의하지 않는다.** 읽기 전용임을 코드로 보장한다.

---

## 9. API Contract

### 9.1 `POST /api/quality/inspect-history` — 기간별 검사 실적 (평면)

**Request**
```json
{
  "fromDt": "2026-09-01",
  "toDt": "2026-09-04",
  "itemCd": "ITEM-001",
  "procCdList": ["P110", "P120"]
}
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `fromDt` | String | ● | `YYYY-MM-DD`. 검사일 기준 |
| `toDt` | String | ● | `fromDt` 이상, 최대 92일 (§7) |
| `itemCd` | String | | 품목 필터 |
| `procCdList` | Array\<String\> | | 공정 다중 선택 |

**Response** — `CamelMap` (Lot 헤더 + 평면 실적)
```json
{
  "totalCount": 2,
  "lotList": [
    { "lotNo":"LOT-20260904-001", "itemCd":"ITEM-001", "itemNm":"스틸 브라켓",
      "procCd":"P110", "procNm":"절삭", "judgeDt":"2026-09-04T10:30:00", "totalJudge":"PASS" },
    { "lotNo":"LOT-20260904-002", "itemCd":"ITEM-001", "itemNm":"스틸 브라켓",
      "procCd":"P110", "procNm":"절삭", "judgeDt":"2026-09-04T11:00:00", "totalJudge":"FAIL" }
  ],
  "detailList": [
    { "lotNo":"LOT-20260904-001", "inspItemCd":"TS", "inspItemNm":"인장강도", "unitCd":"MPa",
      "judgeType":"RANGE", "lsl":400, "usl":500, "decimalLen":1, "sortNo":1,
      "measuredVal":452.0, "judgeResult":"PASS" },
    { "lotNo":"LOT-20260904-002", "inspItemCd":"TS", "inspItemNm":"인장강도", "unitCd":"MPa",
      "judgeType":"RANGE", "lsl":400, "usl":500, "decimalLen":1, "sortNo":1,
      "measuredVal":390.0, "judgeResult":"FAIL" }
  ]
}
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `totalCount` | Number | N | **파생(계산)** | `lotList` 행 수 (화면 "총 N건"). **`TOO_MANY_ROWS` 상한과 기준이 다르다** — 상한은 `detailList` 기준 (§7 D24) |
| `lotList` | Array | N | `TRN_LOT` | 피벗 **행** 원천 |
| `└ lotNo` | String | N | `TRN_LOT.LOT_NO` | |
| `└ itemCd` | String | N | `TRN_LOT.ITEM_CD` | |
| `└ itemNm` | String | N | `MST_ITEM.ITEM_NM` (조인) | |
| `└ procCd` | String | **Y** | `TRN_LOT.PROC_CD` | |
| `└ procNm` | String | **Y** | `MST_PROCESS.PROC_NM` (조인) | `procCd` 가 null이면 null |
| `└ judgeDt` | String | **Y** | `TRN_LOT.JUDGE_DT` | 미판정 Lot은 null |
| `└ totalJudge` | String | N | `TRN_LOT.TOTAL_JUDGE` | 행 강조 근거 (FR-06) |
| `detailList` | Array | N | `TRN_INSP_RESULT` ⋈ `MST_INSP_SPEC` | 피벗 **셀** 원천. `LATEST_YN='Y'` 만. **`USE_YN` 미필터** — 실적 행이 주도하는 조인 (data-model §3.4 D27) |
| `└ lotNo` | String | N | `TRN_INSP_RESULT.LOT_NO` | 셀의 행 좌표 |
| `└ inspItemCd` | String | N | `TRN_INSP_RESULT.INSP_ITEM_CD` | 셀의 열 좌표 |
| `└ inspItemNm` | String | N | `MST_INSP_SPEC.INSP_ITEM_NM` | 열 제목 |
| `└ unitCd` | String | **Y** | `MST_INSP_SPEC.UNIT_CD` | **측정 단위** |
| `└ judgeType` | String | N | `MST_INSP_SPEC.JUDGE_TYPE` | |
| `└ lsl` | Number | **Y** | `MST_INSP_SPEC.LSL` | `MAX` 일 때 null |
| `└ usl` | Number | **Y** | `MST_INSP_SPEC.USL` | `MIN` 일 때 null |
| `└ decimalLen` | Number | N | `MST_INSP_SPEC.DECIMAL_LEN` | 표시 자릿수 |
| `└ sortNo` | Number | N | `MST_INSP_SPEC.SORT_NO` | **동적 컬럼 순서** (§4, FR-08) |
| `└ measuredVal` | Number | **N** | `TRN_INSP_RESULT.MEASURED_VAL` | 저장된 행이므로 **null 불가** (D11) |
| `└ judgeResult` | String | N | `TRN_INSP_RESULT.JUDGE_RESULT` | **`PASS`/`FAIL` 만.** F4는 이 값만 보고 색칠 (§5) |

> **빈 셀은 어디서 오는가 (D11)**: `detailList[].measuredVal` 은 **절대 null이 아니다.** 저장된 실적 행만 담기기 때문이다. 피벗 매트릭스의 빈 칸은 **해당 `(lotNo, inspItemCd)` 조합의 행이 `detailList` 에 없는 경우**이며, 화면이 §4 변환 과정에서 `null` 로 채운다. 즉 빈 값은 **클라이언트 파생값**이지 응답 키가 아니다.

> **봉투 구조를 쓰는 이유 (D19)**: F0 §4.1은 "응답을 래핑하지 않는다"가 원칙이다. 이 API만 예외인 것은 **리스트를 2개 반환**해야 하기 때문이다(행 원천 + 셀 원천). 하나로 합치면 Lot 정보가 검사항목 수만큼 중복된다. `{success, data, message}` 같은 **의미 없는 래퍼가 아니라 두 컬렉션을 담는 최소 봉투**이므로 원칙 위반이 아니다.

> **data-model §3.6 대비 축소 키 (D25)**: `TRN_LOT` 선언 응답 키 8종 중 `goodQty`·`scrapQty`·`lotStatus` 를 `lotList[]` 에 싣지 않는다. §3 피벗은 고정 3열(`lotNo`/`itemNm`/`judgeDt`) + 동적 N열(검사항목)이라 **수량과 Lot 상태를 표시할 자리가 없고**, 행 강조 근거는 `totalJudge` 하나로 충분하다(§5). 수량이 필요한 화면은 F2 §9.1(`goodQty`·`scrapQty`)과 F3 §9.1(`goodQty`)이며 각자 자기 API에서 받는다. (F2 §9.1 D18 · F3 §9.1 D18 역방향과 같은 규칙)

**에러 (400)**

| `errorCode` | 조건 |
|-------------|------|
| `PERIOD_REQUIRED` | 기간 누락 |
| `PERIOD_TOO_LONG` | 92일 초과 |
| `PERIOD_REVERSED` | `fromDt > toDt` |
| `TOO_MANY_ROWS` | **`detailList`** 10,000행 초과 (§7 D24). `lotList` 기준 아님 |

---

## 10. 산출 파일

**Backend**

| 파일 | 담당 엔드포인트 (D20) |
|------|--------------------|
| `InspectionHistoryController` | §9.1 |
| `InspectionHistoryService` (interface) | §9.1 |
| `InspectionHistoryMockServiceImpl` | `@Profile("mock")` |
| `InspectionHistoryServiceImpl` | `@Profile("mybatis*")` |
| `InspectionHistoryMapper.java` | 인터페이스. **조회 전용** — insert/update/delete 미정의 (§8) |
| `mapper/sqlite/InspectionHistoryMapper.xml` | SQLite 방언 (F0 design §3.3) |
| `mapper/oracle/InspectionHistoryMapper.xml` | Oracle 방언 (F0 design §3.3) |

**Frontend**

| 파일 | 소유 | 역할 |
|------|------|------|
| `src/pages/QualityPivotPage.vue` | F4 | 화면 |
| `src/composables/usePivotGrid.js` | F4 | §4 동적 컬럼 구성 + 피벗 변환 |
| `src/api/quality.js` | F1 소유 · F4 함수 추가 | API 호출 |
| `src/utils/specFormat.js` | **F2 소유** (F3·F4 소비) | `formatSpecRange` — 열 제목·툴팁 규격 표기, `decimalLen` 자릿수 |
| `src/utils/specJudgeClient.js` | **F2 산출** (D12) | §5 2순위 경로에서만 사용. 1순위는 서버 `judgeResult` |

> 마지막 두 파일은 **F4가 만들지 않는다.** F2·F3 산출물을 import 한다 (§5 재사용 제약).

**소비 API (교차 feature — D26)**

| 화면 요소 (§3) | 호출 API | 소유 | 용도 |
|---------------|---------|------|------|
| 품목 `CodeSelect` | `POST /api/quality/item-list` | **F1** design §9.1 | §9.1 `itemCd` 후보 목록 (`itemCd`·`itemNm`) |
| 공정 `MultiTreeCombo` | `POST /api/common/process-tree` | **F0** design §9.2 | §9.1 `procCdList` 후보 트리 (`procCd`·`parentProcCd`·`sortNo`) |
| [조회] 버튼 | `POST /api/quality/inspect-history` | F4 §9.1 | 본 feature 소유 |

> F4가 **새로 만드는 엔드포인트는 §9.1 하나뿐**이다. 조회조건 콤보 2종은 F1·F0의 기존 API를 그대로 호출한다. 공정 `MultiTreeCombo` 의 **유일한 소비자가 F4**이므로 (F0 plan §6.2 정정분) 이 선언이 없으면 해당 콤보를 채우는 계약이 스프린트 어디에도 존재하지 않게 된다.

**신규 테이블 없음.**

---

## 11. Plan 요구사항 → 설계 매핑

| FR | 반영 |
|----|------|
| FR-01 기간·품목 조회 | §9.1 |
| FR-02 피벗 표시 | §2, §3 |
| FR-03 동적 컬럼 | §4 |
| FR-04 이탈 셀 Red | §5, §6.2 `styleCallback` |
| FR-05 Excel Export | §6.2 `exportGrid` |
| FR-06 FAIL 행 구분 | §6.2 행 `styleCallback` |
| FR-07 빈 값 ≠ 0 | §6.2 `displayCallback`, §9.1 `measuredVal` null |
| FR-08 열 순서 = 정렬번호 | §4, §9.1 `sortNo` |

---

## 12. 테스트 계획

| 레벨 | 대상 | 케이스 |
|------|------|-------|
| L1 | `usePivotGrid` 컬럼 구성 | 항목 3개 품목 / 5개 품목 / 두 품목 혼합 / 결과 0건 |
| L1 | 피벗 변환 | 평면 → 매트릭스 매핑 정확성, 누락 셀 = null |
| L2 | `/api/quality/inspect-history` | 정상 / 92일 초과 / 기간 역전 / `LATEST_YN` 최신만 |
| L3 | 화면 | 항목 수 다른 두 품목 연속 조회 → 컬럼 재구성 확인 |
| L3 | **판정 일치** | 같은 Lot을 F2 화면과 F4에서 열어 **판정이 동일**한지 대조 (§5 검증) |
| L3 | Excel | 다운로드 파일 내용이 화면과 일치 |

> L3 "판정 일치"가 §5 재사용 제약이 실제로 지켜졌는지 확인하는 테스트다.

---

## 13. 미결정 사항

없음. Plan §2.3의 2건을 확정했다.

| 항목 | 결정 | 근거 |
|------|------|------|
| 그리드 | **RealGrid2 2.10.0** | 테스트 라이선스 확보. 참조 프로젝트 검증분 |
| 피벗 변환 위치 | **프론트** | §2 — 서버가 화면 형태를 모르게 유지 |

**잔여 위험**: 테스트 라이선스 만료 시 `q-table` 대체 경로 (Plan §1.3에 보존).

---

## 14. 설계 자가진단 체크리스트

- [x] Plan의 모든 FR이 설계 요소로 매핑되었다 (§11 — FR-01~FR-08 전건)
- [x] API 계약이 Request/Response 키·타입·Null 여부까지 명시되었다 (§9.1)
- [x] 이탈 판정 중복 구현이 구조적으로 차단되었다 (§5 — 서버 판정값 사용)
- [x] 서버가 화면 형태(피벗)를 모르게 유지된다 (§2 — 평면 반환)
- [x] 동적 컬럼 구성 절차가 단계로 명시되었다 (§4)
- [x] 이전 조회의 컬럼 잔존 문제가 처리되었다 (§4 — 매 조회 재구성)
- [x] `null` 과 `0` 이 구분되어 표시된다 (§6.2, §9.1)
- [x] 라이선스 키가 소스·문서에 노출되지 않는다 (§6.1 — 환경변수)
- [x] 그리드 인스턴스 해제가 명시되었다 (§6.3 `destroy()`)
- [x] 성능 상한이 수치로 정의되었다 (§7 — 92일 / 10,000행)
- [x] 페이징을 넣지 않은 근거가 있다 (§7)
- [x] 읽기 전용이 코드 수준에서 보장된다 (§8 — Mapper에 쓰기 없음)
- [x] F2와의 판정 일치를 검증할 테스트가 있다 (§12 L3)
- [x] 미결정 사항이 명시적으로 처리되었다 (§13 — 2건 확정 + 잔여 위험 명시)

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성. RealGrid2 확정(라이선스 확보), 피벗 변환 프론트 확정 |
| 0.2 | 2026-09-04 | M4 지적 반영 — D5 응답 키 표, D3 `sortNo` 사용 근거, D11 `measuredVal` Null=N 정정 + 빈 셀 출처, D12 교차 feature 파일, D19 봉투 구조 근거, D20 엔드포인트 매핑 |
| 0.3 | 2026-09-04 | M4 재측정 반영 — 변경 없음. `unitCd`(측정 단위) 사용이 F1 §8 명명 규칙과 이미 일치 |
| 0.4 | 2026-09-04 | M4 4차 반영 — N17 Mapper XML 방언 분리 |
| 0.5 | 2026-09-04 | M4 5차 반영 — N16 문서 수식 참조(`F3 design §3.2`, `F2 design §1.1`), 컬럼명→응답 키 표기 |
| 0.6 | 2026-09-05 | M4 12차 반영 — D24 `TOO_MANY_ROWS` 를 `detailList` 기준으로 확정(`totalCount` 와 기준 차이 명시), D25 `lotList[]` 축소 키 3종 근거, D26 §3·§10 조회조건 소비 API(`item-list`·`process-tree`) 선언 |
| 0.7 | 2026-09-05 | M4 13차 반영 — D27 §9.1 조인 `USE_YN` 미필터 명시 |
| 0.8 | 2026-09-05 | do 단계 구현 반영 — **D44 §6.2 `styleCallback` 함정 기록**(setFields 미선언 키는 버려져 판정값이 undefined 가 된다 / 반환은 styleName 문자열 / 클래스는 전역 CSS). §4 순수 함수(`buildDynamicColumns`·`buildPivotRows`)를 `composables/usePivotGrid.js` 로 분리해 단위 테스트 16건 추가 |
