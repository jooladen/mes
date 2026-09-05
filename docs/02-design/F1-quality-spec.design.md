---
template: design
version: 1.0
feature: F1-quality-spec
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
plan: docs/01-plan/features/F1-quality-spec.plan.md
---

# F1 품목별 품질 Spec 관리 — Design

> **Plan**: `docs/01-plan/features/F1-quality-spec.plan.md`
> **선행**: F0 (`CamelMap`, `CodeSelect`, Axios) · **데이터**: data-model §3.3·3.4

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Auto Pass/Fail 판정과 CoA 규격 표기가 참조할 유일한 기준 원천 |
| **WHO** | 품질 담당자 |
| **RISK** | 판정방식 종류를 잘못 잡으면 F2 판정 로직 전체 재작업 |
| **SUCCESS** | 품목 선택 → 검사항목 5건 등록 → 재조회 시 그대로 |

---

## 1. Overview

품목별 검사항목과 합격 범위를 등록·수정·삭제한다. F2 판정과 F3 성적서 규격 표기의 원천.

---

## 2. 화면 설계

```
┌─────────────────────────────────────────────────────────────┐
│ 품목  [CodeSelect: 전체 / itemCd·itemNm ▼]    [조회]        │  ← 검색 영역
├─────────────────────────────────────────────────────────────┤
│ 검사항목 목록            [+행추가] [행삭제] [저장]           │
│ ┌───┬────────┬────────┬──────┬──────┬───────┬──────┬─────┐ │
│ │순번│항목코드 │항목명   │단위  │판정  │ 하한  │ 상한 │소수 │ │
│ ├───┼────────┼────────┼──────┼──────┼───────┼──────┼─────┤ │
│ │ 1 │ TS     │인장강도 │ MPa  │범위형│  400  │ 500  │  1  │ │
│ │ 2 │ HRD    │경도    │ HRC  │범위형│   55  │  62  │  0  │ │
│ │ 3 │ IMP    │불순물   │  %   │상한형│ (비활)│  0.5 │  3  │ │  ← 판정방식별
│ │ 4 │ PUR    │순도    │  %   │하한형│ 99.5  │(비활)│  2  │ │     입력 제한
│ └───┴────────┴────────┴──────┴──────┴───────┴──────┴─────┘ │
└─────────────────────────────────────────────────────────────┘
```

- 그리드는 **Quasar `q-table` 편집 모드**를 쓴다. RealGrid2는 F4 전용이다 — 기준정보 CRUD에 상용 그리드를 쓸 이유가 없다.
- 품목 콤보 맨 앞은 **"전체"** 다 (`CodeSelect` 의 `firstOption="all"`). 전체를 고르면 전 품목 규격을 한 번에 훑어볼 수 있고, 이때 그리드에 **품목 열이 붙는다.**
- **"전체"는 읽기 전용이다 (D40).** 행추가·행삭제·저장을 잠그고, **왜 잠겼는지 화면에 문장으로 적는다.** 회색 버튼만 두면 고장으로 보인다.
- **순번**은 `SORT_NO`. 이 순서가 **그대로 CoA 인쇄 순서**가 된다 (F3 FR-04).

> **"전체"를 넣은 이유와, 그것이 편집일 수 없는 이유 (D40)**: 초안은 품목을 반드시 고르게 했다. 그래서 화면을 처음 열거나 탭을 옮겨 선택이 풀리면 **[조회]가 비활성**이 되고, 왜 안 눌리는지 화면이 말해주지 않아 **고장처럼 보였다**(2026-09-05 실사용 중 발견). 품목을 모르는 상태에서도 "뭐가 등록돼 있나"를 볼 수 있어야 한다.
>
> 다만 **편집까지 열 수는 없다.** §9.3 저장은 `ITEM_CD` 단위 delete-insert 이므로, 여러 품목이 섞인 목록을 통째로 보내면 **어느 품목을 교체할지 정할 수 없다.** 품목마다 나눠 보내면 트랜잭션이 품목 수만큼 쪼개져 §3의 "부분 저장이 남지 않는다"가 깨진다. 그래서 전체는 **조회 전용**으로 못박는다.

### 2.1 판정방식별 입력 제어 (Plan FR-07)

| 판정방식 | 하한(LSL) | 상한(USL) |
|---------|:--------:|:--------:|
| 범위형 `RANGE` | 활성 · 필수 | 활성 · 필수 |
| 상한형 `MAX` | **비활성 · NULL 고정** | 활성 · 필수 |
| 하한형 `MIN` | 활성 · 필수 | **비활성 · NULL 고정** |

판정방식을 바꾸면 비활성 필드의 값을 **즉시 `null` 로 지운다.** 남겨두면 F2가 "상한형인데 LSL이 있네?"라는 모순 데이터를 만난다.

---

## 3. 저장 방식 — 전체 목록 일괄 (Plan §8)

```
화면 그리드 전체  ──►  { itemCd, specList: [...] }  ──►  서버
                                                          │
                                        기존 행 전체 삭제 후 재삽입 (트랜잭션 1건)
```

**행 단위 개별 저장을 쓰지 않는 이유**: 3행 수정·1행 삭제·2행 추가가 섞이면 호출이 6번 나가고, 중간에 실패하면 **일부만 반영된 상태**가 남는다. Plan NFR "저장 실패 시 부분 저장이 남지 않는다"를 만족하려면 한 번에 보내고 한 트랜잭션으로 처리해야 한다.

`ITEM_CD` 단위 delete-insert 이므로 행 식별자 추적이 불필요하다.

### 3.1 예외 — 실적이 있는 검사항목은 지우지 않는다 (D37)

```
목록에서 빠진 검사항목
   ├─ TRN_INSP_RESULT 실적 없음  →  DELETE         (그대로 사라짐)
   └─ TRN_INSP_RESULT 실적 있음  →  USE_YN = 'N'   (soft delete)
```

**무조건 delete 하면 검사실적이 고아가 된다.** `TRN_INSP_RESULT` 는 `MST_INSP_SPEC` 를 조인해야 규격·단위·정렬순서를 얻는데, Spec 행이 사라지면 F2 design §9.2 `inspList` · F3 design §9.2 `detailList` · F4 design §9.1 `detailList` 가 **모두 그 실적을 표현하지 못한다.** 더 나쁜 것은 `TRN_LOT.TOTAL_JUDGE` 다 — 이미 계산돼 저장된 값이라 **삭제 후에도 그대로 남아** 근거 없는 판정이 된다. 이미 발행된 CoA는 스냅샷(F3 design §4)이라 살아남지만, 그 근거를 화면에서 되짚을 수 없게 된다.

soft delete 된 항목의 이후 취급은 **이미 정의돼 있다** — F2 design §9.2 D27(조회 시 실적 있는 `N` 은 포함하되 `totalJudge` 계산에서 제외), F2 design §9.3 D33(`N` 항목에 저장 시도하면 `INVALID_INSP_ITEM`), F3 design §9.2 D32(CoA 본문은 `USE_YN='Y'` 만). **새 에러코드도 새 규칙도 필요 없다.**

**요청 계약은 그대로다.** §9.3은 `useYn` 을 받지 않으며(D28), `Y`/`N` 판정은 전적으로 **서버가 실적 유무를 보고** 한다. 화면은 "이 항목은 지울 수 없다"를 알 필요가 없다.

---

## 4. 검증 규칙

**서버가 1차 방어선**이다. 화면 검증은 사용자 편의이고, DB CHECK는 최후 보루다 (data-model §3.4).

| # | 규칙 | 단위 | 실리는 자리 (D4) |
|---|------|-------------------|
| V1 | `itemCd` 필수 | **요청** | 최상위 `errorCode` = `ITEM_REQUIRED` |
| V2 | `inspItemCd` **필수** | 행 | `errors[].code` = `INSP_ITEM_REQUIRED` (D42) |
| V2b | `inspItemCd` 같은 품목 내 중복 불가 (Plan FR-06) | 행 | `errors[].code` = `INSP_ITEM_DUPLICATED` |
| V3 | `inspItemNm` 필수 | 행 | `errors[].code` = `INSP_NAME_REQUIRED` |
| V4 | `judgeType` ∈ {`RANGE`,`MAX`,`MIN`} | 행 | `errors[].code` = `INVALID_JUDGE_TYPE` |
| V5 | `RANGE` → `lsl`·`usl` 필수 **및 `lsl <= usl`** (Plan FR-05) | 행 | `errors[].code` = `SPEC_RANGE_INVALID` |
| V6 | `MAX` → `usl` 필수, `lsl` 은 null | 행 | `errors[].code` = `SPEC_MAX_INVALID` |
| V7 | `MIN` → `lsl` 필수, `usl` 은 null | 행 | `errors[].code` = `SPEC_MIN_INVALID` |
| V8 | `sortNo` 필수, 같은 품목 내 중복 불가 | 행 | `errors[].code` = `SORT_NO_DUPLICATED` |
| V9 | `decimalLen` 0~6 | 행 | `errors[].code` = `INVALID_DECIMAL_LEN` |

**V5 는 `BigDecimal.compareTo` 로 비교한다.** `double` 비교는 `400.1 <= 400.1` 이 거짓이 될 수 있다 (data-model §6).

> **누락과 중복을 다른 코드로 나눈 이유 (D42, 2026-09-05 구현 중 발견)**: 초안은 V2 하나에 두 조건을 묶어 `INSP_ITEM_DUPLICATED` 를 공유했다. 그래서 항목코드를 **비워두고** 저장하면 화면에 *"항목코드는 필수입니다 `[INSP_ITEM_DUPLICATED]`"* 라는 **어긋난 메시지**가 떴다. 바로 옆 항목명(V3)은 `INSP_NAME_REQUIRED` 라는 전용 코드를 쓰는데 항목코드만 남의 코드를 빌려 쓰던 셈이다. 에러코드는 프론트가 분기 기준으로 쓰는 값이라 **조건 하나에 코드 하나**가 원칙이다.

검증은 **전 행을 다 검사한 뒤** 오류를 모아서 반환한다. 첫 오류에서 중단하면 사용자가 저장을 5번 반복하게 된다.

> **에러 코드가 실리는 자리 (D4 확정)**
>
> | 오류 단위 | 최상위 `errorCode` | `errors[]` |
> |---|---|---|
> | **요청 단위** (V1 — 대상 품목 자체가 없음) | 그 코드 자체 (`ITEM_REQUIRED`) | 없음 |
> | **행 단위** (V2~V9) | 항상 `VALIDATION_FAILED` | 위반 행마다 1건. **`rowIndex` 필수** (F0 design §8.2) |
>
> V1은 `specList` 의 행을 가리킬 수 없다(대상 품목이 없으므로 행 식별자도 없다). 따라서 요청 단위 오류는 `errors[]` 를 쓰지 않는다. 스키마 소유는 F0 design §8.2.
>
> **행 식별은 `errors[].rowIndex`(요청 `specList` 의 0-base 인덱스)로 한다.** `sortNo` 는 보조 표시용이다 — V8이 "`sortNo` 중복" 오류이므로 `sortNo` 로는 행을 특정할 수 없다 (F0 §8.2 N6).

---

## 5. 레이어 배치

```
QualitySpecController
    └── QualitySpecService (interface)
            ├── QualitySpecMockServiceImpl   @Profile("mock")     — 메모리 List
            └── QualitySpecServiceImpl       @Profile("mybatis*")
                    └── QualitySpecMapper + XML
```

검증 로직(`SpecValidator`)은 **Service 구현체 밖의 순수 클래스**로 둔다. Mock과 MyBatis 양쪽이 같은 검증을 쓰고, 단위 테스트가 DB 없이 돌아간다.

---

## 6. Mock 데이터 (data-model §7)

품목 3건 / 검사항목 12건. 아래 조건을 반드시 만족한다.

| 조건 | 이유 |
|------|------|
| `RANGE`·`MAX`·`MIN` 3종 모두 등장 | F2 판정 분기 전수 검증 |
| 품목별 검사항목 수가 다름 (5/4/3) | F4 동적 컬럼 검증 |
| `decimalLen` 이 0·1·3 등 다양 | F3 표시 자릿수 검증 |

---

## 7. 성능

Spec은 소량(품목당 수십 건)이다. 페이징·캐시 없이 전건 조회한다. **지금 필요 없는 최적화를 넣지 않는다.**

---

## 8. 명명 규칙 — 단위 키 (D2 전역 확정)

`MST_ITEM.UNIT_CD` 와 `MST_INSP_SPEC.UNIT_CD` 는 **다른 개념**이다. 응답 키를 분리한다.

| 응답 키 | 원천 | 의미 | 예 |
|---------|------|------|-----|
| **`itemUnitCd`** | `MST_ITEM.UNIT_CD` | **재고/출하 단위** | `EA`, `KG` |
| **`unitCd`** | `MST_INSP_SPEC.UNIT_CD` | **측정 단위** | `MPa`, `HRC`, `%` |

**스프린트 전역 규칙이다.** F1 §9.1, F3 §9.1·9.2·9.3 이 모두 이 규칙을 따른다. 같은 응답 객체 안에 두 단위가 함께 나올 수 있으므로(F3 §9.2 헤더+본문) 키 이름이 달라야 한다.

---

## 8.1 접근성

- 그리드 행 추가/삭제는 키보드로 가능해야 한다
- 검증 오류는 색상뿐 아니라 **텍스트로도** 표시한다 (색맹 대응)

---

## 9. API Contract

### 9.1 `POST /api/quality/item-list` — 품목 목록

**Request**
```json
{ "useYn": "Y" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `useYn` | String | | `'Y'` 이면 사용중만. 생략 시 전체 |

**Response** — `List<CamelMap>`
```json
[{ "itemCd": "ITEM-001", "itemNm": "스틸 브라켓", "itemSpec": "SUS304 t2.0", "itemUnitCd": "EA", "useYn": "Y" }]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `itemCd` | String | N | `MST_ITEM.ITEM_CD` | 품목코드 |
| `itemNm` | String | N | `MST_ITEM.ITEM_NM` | 품목명 |
| `itemSpec` | String | **Y** | `MST_ITEM.ITEM_SPEC` | 규격 텍스트 |
| `itemUnitCd` | String | N | `MST_ITEM.UNIT_CD` | **재고 단위** (`EA`). 측정 단위 `unitCd` 와 구분 — §8 명명 규칙 |
| `useYn` | String | N | `MST_ITEM.USE_YN` | `Y`/`N` |

**에러**: 없음. 결과 0건은 빈 배열 `[]`.

### 9.2 `POST /api/quality/spec-list` — 품목별 Spec 조회

**Request**
```json
{ "itemCd": "ITEM-001" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `itemCd` | String | | **생략·null 이면 전 품목** (D40). 이때 정렬은 품목 → `sortNo` 순 |

**Response** — `List<CamelMap>` (`sortNo` 오름차순, **`useYn='Y'` 만** — D39)
```json
[
  { "itemCd":"ITEM-001", "inspItemCd":"TS",  "inspItemNm":"인장강도", "unitCd":"MPa",
    "judgeType":"RANGE", "lsl":400, "usl":500, "targetVal":null, "decimalLen":1, "sortNo":1, "useYn":"Y" },
  { "itemCd":"ITEM-001", "inspItemCd":"IMP", "inspItemNm":"불순물",   "unitCd":"%",
    "judgeType":"MAX",   "lsl":null, "usl":0.5, "targetVal":null, "decimalLen":3, "sortNo":2, "useYn":"Y" }
]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `itemCd` | String | N | `MST_INSP_SPEC.ITEM_CD` | |
| `inspItemCd` | String | N | `MST_INSP_SPEC.INSP_ITEM_CD` | |
| `inspItemNm` | String | N | `MST_INSP_SPEC.INSP_ITEM_NM` | |
| `unitCd` | String | **Y** | `MST_INSP_SPEC.UNIT_CD` | **측정 단위** (재고 단위는 `itemUnitCd`) |
| `judgeType` | String | N | `MST_INSP_SPEC.JUDGE_TYPE` | `RANGE`/`MAX`/`MIN` |
| `lsl` | Number | **Y** | `MST_INSP_SPEC.LSL` | `MAX` 일 때 null |
| `usl` | Number | **Y** | `MST_INSP_SPEC.USL` | `MIN` 일 때 null |
| `targetVal` | Number | **Y** | `MST_INSP_SPEC.TARGET_VAL` | 목표치. **Sprint-1 은 항상 null** — §9.3 요청이 이 키를 받지 않는다 (D28) |
| `decimalLen` | Number | N | `MST_INSP_SPEC.DECIMAL_LEN` | 0~6 |
| `sortNo` | Number | N | `MST_INSP_SPEC.SORT_NO` | CoA 인쇄 **정렬 기준**. F3 `printSeq` 가 이 순서로 재부여 (D3) |
| `useYn` | String | N | `MST_INSP_SPEC.USE_YN` | `Y`/`N` |

**에러**: 없음. `itemCd` 가 없으면 전 품목을 반환하므로 요청 단위 오류가 성립하지 않는다 (D40). `ITEM_REQUIRED` 는 **§9.3 저장에만** 남는다 — 저장은 대상 품목이 반드시 있어야 한다.

결과 0건(Spec 미등록)은 에러가 아니라 빈 배열 `[]`.

> **`useYn='N'` 을 내려보내지 않는 이유 (D39)**: §3.1(D37)이 실적 있는 검사항목을 삭제 대신 `USE_YN='N'` 으로 남기면서 생긴 구멍이다. 이 조회가 전건을 주면 **비활성 항목이 §2 편집 그리드에 그대로 올라온다.** 그런데 그리드에는 `useYn` 열이 없고 §9.3 요청도 `useYn` 을 받지 않으므로(D28), **사용자가 아무것도 건드리지 않고 저장만 눌러도 비활성 항목이 `'Y'` 로 부활한다.** §2는 "지금 검사할 항목"을 편집하는 자리이므로 `'Y'` 만 내려보낸다. 목록에서 빠진 비활성 항목은 §3.1 서버 규칙이 `'N'` 으로 그대로 유지하므로 재삭제도 안전하다. 과거 실적의 규격 표기는 F2 design §9.2(D27)가 따로 책임진다 — 그쪽은 실적이 원천이라 Spec 의 `useYn` 과 무관하게 행이 존재한다.

### 9.3 `POST /api/quality/spec-save` — Spec 일괄 저장

**Request**
```json
{
  "itemCd": "ITEM-001",
  "specList": [
    { "inspItemCd":"TS", "inspItemNm":"인장강도", "unitCd":"MPa",
      "judgeType":"RANGE", "lsl":400, "usl":500, "decimalLen":1, "sortNo":1 }
  ]
}
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `itemCd` | String | ● | 대상 품목 |
| `specList` | Array | ● | **전체 목록.** 빈 배열이면 전건 삭제 |
| `└ inspItemCd` | String | ● | 검사항목코드. 같은 품목 내 중복 불가 (V2) |
| `└ inspItemNm` | String | ● | 검사항목명 (V3) |
| `└ unitCd` | String | | 측정 단위. 없으면 null |
| `└ judgeType` | String | ● | `RANGE`/`MAX`/`MIN` (V4) |
| `└ lsl` | Number | 조건부 | `RANGE`·`MIN` 필수 / `MAX` 는 **null 이어야** 함 (V5~V7) |
| `└ usl` | Number | 조건부 | `RANGE`·`MAX` 필수 / `MIN` 은 **null 이어야** 함 (V5~V7) |
| `└ decimalLen` | Number | ● | 0~6 (V9) |
| `└ sortNo` | Number | ● | 같은 품목 내 중복 불가 (V8) |

**Response**
```json
{ "itemCd": "ITEM-001", "savedCount": 5 }
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `itemCd` | String | N | 요청값 반향 | 저장 대상 품목 |
| `savedCount` | Number | N | **파생(계산)** | 저장된 행 수 |

**에러 (400)**

| 단위 | `code` | 조건 |
|------|--------|------|
| 요청 | `ITEM_REQUIRED` | `itemCd` 누락 (V1) |
| 요청 | `SPEC_LIST_REQUIRED` | `specList` 자체가 누락 (빈 배열은 전건 삭제로 정상) |
| **행** | `INSP_ITEM_REQUIRED` / `INSP_ITEM_DUPLICATED` / `INSP_NAME_REQUIRED` / `INVALID_JUDGE_TYPE` / `SPEC_RANGE_INVALID` / `SPEC_MAX_INVALID` / `SPEC_MIN_INVALID` / `SORT_NO_DUPLICATED` / `INVALID_DECIMAL_LEN` | V2~V9 (§4) |

행 단위 오류는 최상위 `errorCode = VALIDATION_FAILED` + `errors[]`. 검증 실패 시 전 행 오류를 모아 반환
```json
{
  "errorCode": "VALIDATION_FAILED",
  "errorMessage": "검증에 실패했습니다.",
  "errors": [
    { "rowIndex": 1, "sortNo": 2, "field": "usl", "code": "SPEC_RANGE_INVALID",
      "message": "상한은 하한보다 크거나 같아야 합니다." }
  ]
}
```

> **`useYn`·`targetVal` 을 요청에서 받지 않는 이유 (D28)**: 이 요청의 **유일한 생산자는 §2 그리드**인데 거기에 두 컬럼이 없다. `useYn` 은 필수(●)인데 채울 출처가 없었고, `targetVal` 은 §3의 `ITEM_CD` 단위 delete-insert(전체 일괄) 때문에 **저장할 때마다 반드시 null이 되는** 키였다. 화면에 없는 값을 계약이 요구하는 상태를 없앤다.
>
> 서버는 신규·유지 행을 `USE_YN='Y'`, `TARGET_VAL=null` 로 insert 한다. 그리드에서 뺀 항목은 **실적이 없으면 삭제, 실적이 있으면 `USE_YN='N'`** 으로 남는다(§3.1 D37) — `useYn` 값을 요청이 아니라 **서버가 실적 유무로 결정**한다. 두 컬럼은 §9.2 조회 응답과 data-model §3.4 응답 키에는 **그대로 남긴다** — Sprint-2에서 목표치 입력·비활성화 기능을 붙일 때 조회 계약을 바꾸지 않기 위해서다. 이에 따라 V10(`useYn` 검증)과 `INVALID_YN_FLAG` 도 삭제한다.

> `errors` 배열은 **에러 응답에만** 존재한다. 정상 응답은 여전히 래핑되지 않는다 (F0 §4.1).

---

## 10. 산출 파일

**Backend**

| 파일 | 담당 엔드포인트 (D20) |
|------|--------------------|
| `QualitySpecController` | §9.1 · §9.2 · §9.3 |
| `QualitySpecService` (interface) | 위 3종 |
| `QualitySpecMockServiceImpl` | `@Profile("mock")` |
| `QualitySpecServiceImpl` | `@Profile("mybatis*")` |
| `QualitySpecMapper.java` | 인터페이스 |
| `mapper/sqlite/QualitySpecMapper.xml` | SQLite 방언 (F0 design §3.3) |
| `mapper/oracle/QualitySpecMapper.xml` | Oracle 방언 (F0 design §3.3) |
| `SpecValidator` (순수) | 엔드포인트 없음 - §9.3이 호출. §4 **V1~V9** |
| **`JudgeType`** (상수) | `RANGE`/`MAX`/`MIN` - data-model §4.1 소유. F2·F3·F4가 소비 |

**Frontend**: `src/pages/QualitySpecPage.vue` / `src/api/quality.js`

**DDL**: `MST_ITEM`, `MST_INSP_SPEC` (data-model §3.3·3.4)

---

## 11. Plan 요구사항 → 설계 매핑

| FR | 반영 |
|----|------|
| FR-01 품목 조회·선택 | §2 검색영역, §9.1 |
| FR-02 Spec 목록 표시 | §2 그리드, §9.2 |
| FR-03 추가/수정/삭제 일괄저장 | §3, §9.3 |
| FR-04 판정방식 3종 | §2.1, §9 `judgeType` |
| FR-05 `LSL <= USL` 검증 | §4 V5 |
| FR-06 항목코드 중복 거부 | §4 V2 |
| FR-07 판정방식별 입력 제한 | §2.1, §4 V6·V7 |
| FR-08 정렬번호 | §2 순번열, §4 V8, §9.2 `sortNo` |

---

## 12. 테스트 계획

| 레벨 | 대상 | 케이스 |
|------|------|-------|
| L1 | `SpecValidator` | **V1~V9** 각각 / `lsl == usl` 경계 / `MAX` 인데 `lsl` 존재 |
| L2 | `/api/quality/spec-save` | 정상 / 중복코드 / 범위역전 / 빈 배열(전건삭제) |
| L3 | 화면 | 판정방식 변경 시 필드 비활성 + 값 초기화 |

---

## 13. 미결정 사항

없음.

**Sprint-1 의도적 제외** (Plan §2.2): Spec 변경 이력·승인 결재·관능검사. → F3가 스냅샷(data-model §3.9)으로 이력 부재를 보완하므로 Sprint-1 범위에서 문제되지 않는다.

---

## 14. 설계 자가진단 체크리스트

- [x] Plan의 모든 FR이 설계 요소로 매핑되었다 (§11 — FR-01~FR-08 전건)
- [x] API 계약이 Request/Response 키·타입·Null 여부까지 명시되었다 (§9.1~9.3)
- [x] 데이터 모델을 참조하고 중복 정의하지 않았다 (§10 — data-model §3.3·3.4)
- [x] 검증 규칙이 코드와 함께 열거되었다 (§4 V1~V9)
- [x] 검증 위치가 계층별로 명시되었다 (§4 — 서버 1차, 화면 편의, DB 최후)
- [x] 트랜잭션 경계가 정의되었다 (§3 — itemCd 단위 delete-insert 1건)
- [x] 판정방식 3종이 F2·F3 요구와 일관된다 (§9 `judgeType` ↔ data-model §4.1)
- [x] 정렬순서가 F3 인쇄 순서와 연결되었다 (§2, §9.2 `sortNo`)
- [x] 테스트 가능한 순수 로직이 분리되었다 (§5 `SpecValidator`)
- [x] Mock 데이터가 후속 feature 검증 조건을 만족한다 (§6)
- [x] 산출 파일이 열거되었다 (§10)
- [x] 미결정 사항이 명시적으로 처리되었다 (§13)
- [x] 과잉 설계를 배제한 근거가 있다 (§7 페이징·캐시 없음)

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성 |
| 0.2 | 2026-09-04 | M4 지적 반영 — D4 에러코드 위치, D5 응답 키 표, D15 `specList` 원소 스키마, D17 요청 파라미터 표, D7 에러 계약 |
| 0.3 | 2026-09-04 | M4 재측정 반영 — D4 요청/행 단위 오류 분리 확정, N2 §9.2 원천 열, D2 전역 통일(`itemUnitCd`) + §8 명명 규칙 신설 |
| 0.4 | 2026-09-04 | M4 4차 반영 — N19 §9.3 에러코드 표 신설, N17 Mapper XML 방언 분리 |
| 0.5 | 2026-09-04 | M4 5차 반영 — V10 `useYn` 검증 + `INVALID_YN_FLAG` 신설, N16 참조 수식 |
| 0.6 | 2026-09-04 | M4 6차 반영 — V10 파급 4곳 정정(§4·§10·§12·§14), `SPEC_LIST_REQUIRED` 반영 |
| 0.7 | 2026-09-05 | M4 13차 반영 — D28 §9.3 요청에서 `useYn`·`targetVal` 제거(§2 그리드에 생산자 없음). 연쇄로 V10 삭제 + `INVALID_YN_FLAG` 폐기, §4·§9.3·§10·§12·§14 의 V 범위를 **V1~V9** 로 통일. §9.2 응답 키는 유지 |
| 0.8 | 2026-09-05 | M4 15차 반영 — **D37 §3.1 soft delete 신설**(실적 있는 검사항목은 삭제 대신 `USE_YN='N'`). 무조건 delete 가 `TRN_INSP_RESULT` 를 고아로 만들고 `TOTAL_JUDGE` 를 stale 로 남기던 경로 제거. D28 문구를 서버 판정 기준으로 정정 |
| 0.9 | 2026-09-05 | do 단계 구현 반영 — **D39 §9.2 를 `useYn='Y'` 만 반환하도록 명시**(D37 soft delete 가 만든 '저장만 눌러도 비활성 항목 부활' 경로 차단). §9.2 예시·키 표의 `targetVal` 을 D28(Sprint-1 항상 null)과 정합 |
| 0.10 | 2026-09-05 | 실사용 피드백 반영 — **D40 검색조건에 "전체" 추가**. §9.2 `itemCd` 를 선택으로 완화(생략 시 전 품목), §9.2 에서 `ITEM_REQUIRED` 제거(§9.3 저장에만 유지), §2 에 '전체=읽기 전용 + 잠김 사유를 문장으로' 규칙 신설 |
| 0.11 | 2026-09-05 | do 단계 구현 반영 — **D42 V2 를 V2(필수)/V2b(중복)로 분리**하고 `INSP_ITEM_REQUIRED` 신설. 항목코드를 비우면 "필수입니다" 메시지에 `INSP_ITEM_DUPLICATED` 코드가 붙던 문제 해소 |
