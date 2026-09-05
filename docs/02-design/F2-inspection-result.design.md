---
template: design
version: 1.0
feature: F2-inspection-result
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
plan: docs/01-plan/features/F2-inspection-result.plan.md
---

# F2 검사 실적 등록 + Auto Pass/Fail — Design

> **Plan**: `docs/01-plan/features/F2-inspection-result.plan.md`
> **선행**: F0, F1 · **데이터**: data-model §3.6·3.7
> ⚠️ **이 스프린트에서 가장 위험한 코드가 여기 있다.** 판정이 틀리면 불합격품이 출하된다.

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 사람 눈 판정을 시스템 계산으로 대체해 오판·불합격품 출하를 막는다 |
| **WHO** | 현장 품질 검사자 |
| **RISK** | 판정 로직이 틀리면 불합격품이 합격으로 출하된다 |
| **SUCCESS** | 이탈값 입력 → 즉시 FAIL + Lot 잠김 → CoA 발행 차단 |

---

## 1. 판정 로직 — 순수 함수 (Plan §7 결정)

이 스프린트에서 **유일하게 반드시 단위 테스트가 있어야 하는 코드**다.

### 1.1 시그니처

```java
// 측정값 하나를 규격과 비교해 PASS/FAIL 만 돌려준다.
// CamelMap·DB·Spring 을 전혀 모른다 → 테스트에 DB 형태 데이터가 필요 없다.
public final class SpecJudge {

    public static JudgeResult judge(
        BigDecimal measured,      // 측정값 (null 이면 NONE)
        String     judgeType,     // RANGE | MAX | MIN
        BigDecimal lsl,           // 하한 (MAX 일 때 null)
        BigDecimal usl            // 상한 (MIN 일 때 null)
    ) { ... }

    // Lot 전체 종합판정. 한 건이라도 NONE 이면 NONE, 한 건이라도 FAIL 이면 FAIL.
    public static JudgeResult total(List<JudgeResult> items) { ... }
}

public enum JudgeResult { NONE, PASS, FAIL }
```

**`BigDecimal` 인 이유** (data-model §6): `double` 로 `452.0 <= 452` 를 비교하면 표현 오차로 거짓이 될 수 있다. 합격품이 불합격으로 나가는 사고가 여기서 난다.

### 1.2 판정 규칙

| `judgeType` | 합격 조건 | 경계 |
|------------|----------|:----:|
| `RANGE` | `lsl <= v && v <= usl` | **포함** |
| `MAX` | `v <= usl` | **포함** |
| `MIN` | `lsl <= v` | **포함** |

**경계값은 합격이다.** `v == usl` 이면 PASS. `compareTo(...) <= 0` 을 쓴다. `< 0` 을 쓰면 규격 딱 맞는 제품이 불합격 처리된다.

`measured == null` → `NONE`. **`0` 과 구분한다** (Plan FR-08). 측정 안 한 것과 0을 측정한 것은 다르다.

### 1.3 종합판정 (`total`)

```
항목 판정 목록 → 종합판정
  하나라도 NONE  →  NONE   (검사 미완료. PASS 아님)
  하나라도 FAIL  →  FAIL
  전부 PASS      →  PASS
```

**NONE 을 FAIL보다 먼저 보는 이유**: 미입력 항목이 있는데 나머지가 전부 PASS라고 PASS를 주면, **검사하지 않은 항목을 통과시킨 성적서**가 나간다.

### 1.4 Lot 상태 전이 (Plan FR-06)

| 종합판정 | `LOT_STATUS` | `TOTAL_JUDGE` | F3 발행 |
|---------|-------------|--------------|:------:|
| `NONE` (일부 입력) | `INSP` | `NONE` | ✗ |
| `PASS` | `OK` | `PASS` | **✓** |
| `FAIL` | `LOCKED` | `FAIL` | ✗ |

`TOTAL_JUDGE` 를 `TRN_LOT` 에 저장한다 (Plan FR-08b). F3가 검사실적을 집계하지 않고 한 컬럼만 읽는다.

---

## 2. 판정 시점 — 이중 (Plan §2.3 확정)

```
[화면] 입력 즉시 JS 계산  →  색·문구 즉시 표시    ← 사용자 편의. 신뢰하지 않는다
[서버] 저장 시 재계산     →  DB에 기록           ← 최종 진실 (Plan FR-07)
```

**프론트 계산을 신뢰하지 않는 이유**: API를 직접 호출하면 화면을 우회할 수 있다. 서버가 다시 계산해 저장하므로, 화면이 뭐라 표시했든 **DB에 남는 값은 서버 판정**이다.

저장 응답에 서버 판정 결과를 담아 화면이 갱신하게 한다. 프론트/서버 판정이 다르면 **서버 값으로 화면이 바뀐다** — 불일치가 눈에 보인다.

---

## 3. 화면 설계 (현장 POP)

```
┌──────────────────────────────────────────────────────────┐
│ Lot [LOT-20260904-001 ▼]  품목: 스틸 브라켓  상태: 검사중 │
│ 검사자 [홍길동 ▼]                                        │
├──────────────────────────────────────────────────────────┤
│ 검사항목          규격          측정값        판정        │
│ ┌──────────┬─────────────┬───────────────┬────────────┐ │
│ │ 인장강도  │ 400 ~ 500   │ ┌─────────┐  │  ✅ PASS   │ │
│ │  (MPa)   │             │ │  452.0  │  │            │ │
│ ├──────────┼─────────────┼───────────────┼────────────┤ │
│ │ 경도     │  55 ~ 62    │ ┌─────────┐  │  ❌ FAIL   │ │ ← 행 전체
│ │  (HRC)   │             │ │   63    │  │            │ │   Red 배경
│ ├──────────┼─────────────┼───────────────┼────────────┤ │
│ │ 불순물   │  ≤ 0.5      │ ┌─────────┐  │   —        │ │ ← 미입력
│ │  (%)     │             │ │         │  │            │ │
│ └──────────┴─────────────┴───────────────┴────────────┘ │
│                                                          │
│  종합판정: ❌ FAIL          [  저   장  ]                 │
└──────────────────────────────────────────────────────────┘
```

**화면 입력 요소 → API 매핑 (D36)**

| 화면 요소 | 값이 가는 곳 | 값의 출처 |
|----------|-------------|----------|
| `Lot ▼` | §9.2 `lotNo` · §9.3 `lotNo` | **§9.1 `lot-list`** (본 feature 소유) |
| `검사자 ▼` | §9.3 `inspUserId` | **F0 design §9.3 `user-list`** (§10 소비 API) |
| 측정값 입력칸 | §9.3 `resultList[].measuredVal` | 사용자 직접 입력 |
| 비고 | §9.3 `resultList[].remark` | 사용자 직접 입력 |

품목·상태·규격·판정은 **읽기 전용 표시**다 — 선택된 Lot의 §9.2 응답값을 그대로 보여줄 뿐 요청으로 되돌아가지 않는다. 즉 이 화면의 입력 컨트롤은 **`Lot ▼` 와 `검사자 ▼` 둘뿐**이다(§9.1 D35).

### 3.1 현장 UI 치수 (Plan FR-11 수치화)

Plan에 "장갑 끼고 조작 가능"만 있고 수치가 없었다. 확정한다.

| 요소 | 최소 크기 | 근거 |
|------|----------|------|
| 입력 필드 터치 영역 | **56 × 56 px** 이상 | 장갑 낀 손가락 접촉면 |
| 저장 버튼 | **높이 64px**, 화면 폭 40% 이상 | 오조작 방지 |
| 요소 간 간격 | **12px** 이상 | 인접 오터치 방지 |
| 측정값 글꼴 | **20px** 이상 | 공장 조명 환경 |
| 판정 표시 | 색 + **아이콘 + 텍스트** | 색맹·조명 대응 |

**판정을 색으로만 표시하지 않는다.** 공장 조명과 색각 이상에서 빨강/초록 구분이 안 될 수 있다. `✅ PASS` / `❌ FAIL` 텍스트를 함께 둔다.

### 3.2 규격 표기

`judgeType` 에 따라 화면에서 조립한다. **DB에서 문자열로 만들지 않는다** (F0 원칙).

| `judgeType` | 표기 |
|------------|------|
| `RANGE` | `400 ~ 500` |
| `MAX` | `≤ 0.5` |
| `MIN` | `≥ 99.5` |

이 조립 함수는 **F3 성적서와 동일한 것을 공유**한다 (`formatSpecRange()`). 두 벌로 만들면 화면과 성적서 표기가 달라진다.

---

## 4. 재검사 처리 (Plan FR-10)

```
저장 요청 도착
   │
   ├─ 대상 (lotNo, inspItemCd) 의 기존 행 → LATEST_YN = 'N'
   └─ 새 행 INSERT → LATEST_YN = 'Y'
```

조회·판정·성적서는 항상 `LATEST_YN = 'Y'` 만 본다. 과거 측정값은 남지만 판정에 쓰이지 않는다.

**행을 UPDATE 하지 않는 이유**: 덮어쓰면 첫 측정값이 사라진다. 불합격이 났다가 재측정으로 합격된 이력은 품질 추적의 핵심 정보다.

---

## 5. 잠김 해제 (Plan §2.3 확정)

**Sprint-1: 해제 기능 없음.**

`LOCKED` Lot은 재검사 값을 입력해 종합판정이 `PASS` 가 되면 자동으로 `OK` 로 돌아간다. 별도 해제 버튼·권한을 만들지 않는다.

> 관리자 강제 해제는 권한 체계를 전제하는데, 인증·권한이 Sprint-1 Out of Scope다. 권한 없는 해제 버튼은 **아무나 누를 수 있는 뒷문**이 된다.

---

## 6. 레이어 배치

```
InspectionController
    └── InspectionService (interface)
            ├── InspectionMockServiceImpl   @Profile("mock")
            └── InspectionServiceImpl       @Profile("mybatis*")
                    └── InspectionMapper + XML

SpecJudge (순수 클래스)  ← Service 두 구현체가 공유. Spring 빈 아님
```

`SpecJudge` 를 Spring 빈으로 만들지 않는다. static 메서드면 테스트에서 컨텍스트 없이 바로 부른다.

---

## 7. 트랜잭션

저장은 한 트랜잭션이다.

```
1. 기존 실적 LATEST_YN = 'N'
2. 신규 실적 INSERT (여러 건)
3. 서버 재판정 → 종합판정 계산
4. TRN_LOT 의 LOT_STATUS / TOTAL_JUDGE / JUDGE_DT 갱신
```

3~4가 실패하면 1~2도 롤백된다. **실적은 저장됐는데 Lot 상태가 안 바뀐 상태**가 남으면 F3가 잘못된 Lot을 발행 목록에 올린다.

---

## 8. 성능

Lot당 검사항목은 수~수십 건이다. 판정은 메모리 연산이므로 최적화가 불필요하다. Plan NFR "입력→판정 표시 100ms"는 프론트 JS 계산으로 충족된다.

---

## 9. API Contract

### 9.1 `POST /api/quality/lot-list` — 검사 가능 Lot 목록 (**4개 상태 전부** — D41)

**Request**
```json
{}
```
**요청 파라미터가 없다** (D35). 서버는 **필터 없이 전건**을 반환한다 (D41) — `WAIT`·`INSP`·`OK`·`LOCKED` 4개 상태가 모두 온다.

**Response** — `List<CamelMap>`
```json
[{ "lotNo":"LOT-20260904-001", "itemCd":"ITEM-001", "itemNm":"스틸 브라켓",
   "procCd":"P110", "procNm":"절삭", "goodQty":100, "scrapQty":0,
   "lotStatus":"INSP", "totalJudge":"NONE", "judgeDt":null }]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `lotNo` | String | N | `TRN_LOT.LOT_NO` | |
| `itemCd` | String | N | `TRN_LOT.ITEM_CD` | |
| `itemNm` | String | N | `MST_ITEM.ITEM_NM` (조인) | |
| `procCd` | String | **Y** | `TRN_LOT.PROC_CD` | |
| `procNm` | String | **Y** | `MST_PROCESS.PROC_NM` (조인) | `procCd` 가 null이면 null |
| `goodQty` | Number | N | `TRN_LOT.GOOD_QTY` | 양품수량 |
| `scrapQty` | Number | N | `TRN_LOT.SCRAP_QTY` | 불량수량 |
| `lotStatus` | String | N | `TRN_LOT.LOT_STATUS` | `WAIT`/`INSP`/`OK`/`LOCKED` |
| `totalJudge` | String | N | `TRN_LOT.TOTAL_JUDGE` | `NONE`/`PASS`/`FAIL` |
| `judgeDt` | String | **Y** | `TRN_LOT.JUDGE_DT` | 미판정 시 null |

> **`itemUnitCd` 를 싣지 않는 이유 (D18)**: 검사 화면은 수량 단위를 표시하지 않는다. 출하수량 단위가 필요한 F3 §9.1만 `itemUnitCd` 를 제공한다.

**에러**: 없음. 결과 0건은 빈 배열 `[]`.

> **요청 파라미터를 두지 않는 이유 (D35)**: 초안은 `lotStatusList`·`itemCd` 를 받았으나 **§3 현장 POP 화면에 두 필터의 UI가 없다.** 품목·상태는 선택된 Lot의 읽기 전용 표시이고, 입력 컨트롤은 `Lot ▼` 와 `검사자 ▼` 뿐이다. §3.1이 장갑 낀 손 조작을 위해 컨트롤을 56×56px 이상으로 키우라고 요구하므로 **컨트롤 수를 늘리지 않는 쪽**을 택한다. Lot 상태는 §1.4 전이가 정하는 값이라 **화면이 고를 성질이 아니다.** 품목·상태 필터가 필요해지는 규모(Lot 수백 건)는 Sprint-2에서 다시 본다.
>
> **다만 상태로 걸러서도 안 된다 (D41)**: D35 초안은 서버가 `LOT_STATUS IN ('WAIT','INSP')` 를 고정 적용하게 했는데, 그러면 **§5의 "`LOCKED` Lot은 재검사 값을 입력해 `PASS` 가 되면 자동으로 `OK` 로 돌아간다"가 성립하지 않는다** — 그 Lot 을 목록에서 고를 방법이 없기 때문이다. D23이 확정한 "4개 상태 전부 저장 허용"(`OK` Lot 오입력 정정 포함)도 같은 이유로 죽는다. 그래서 **필터 없이 전건**을 반환하고, 화면은 Lot 콤보 라벨에 상태를 함께 적어 사용자가 구분하게 한다(§3). 2026-09-05 F2 구현 중 발견.

### 9.2 `POST /api/quality/inspect-list` — Lot 검사항목 + 기존 실적

**Request**
```json
{ "lotNo": "LOT-20260904-001" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `lotNo` | String | ● | 대상 Lot |

**Response** — `CamelMap` (헤더 + 목록 1회 조회)
```json
{
  "lotNo": "LOT-20260904-001",
  "itemCd": "ITEM-001",
  "itemNm": "스틸 브라켓",
  "lotStatus": "INSP",
  "totalJudge": "NONE",
  "inspList": [
    { "inspItemCd":"TS", "inspItemNm":"인장강도", "unitCd":"MPa",
      "judgeType":"RANGE", "lsl":400, "usl":500, "decimalLen":1, "sortNo":1,
      "useYn":"Y", "inspSeq":1001, "measuredVal":452.0, "judgeResult":"PASS",
      "inspDt":"2026-09-04T10:12:00", "inspUserId":"user01", "remark":null },
    { "inspItemCd":"IMP", "inspItemNm":"불순물", "unitCd":"%",
      "judgeType":"MAX", "lsl":null, "usl":0.5, "decimalLen":3, "sortNo":2,
      "useYn":"Y", "inspSeq":null, "measuredVal":null, "judgeResult":"NONE",
      "inspDt":null, "inspUserId":null, "remark":null }
  ]
}
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `lotNo` | String | N | `TRN_LOT.LOT_NO` | |
| `itemCd` | String | N | `TRN_LOT.ITEM_CD` | |
| `itemNm` | String | N | `MST_ITEM.ITEM_NM` (조인) | |
| `lotStatus` | String | N | `TRN_LOT.LOT_STATUS` | |
| `totalJudge` | String | N | `TRN_LOT.TOTAL_JUDGE` | `NONE`/`PASS`/`FAIL` |
| `inspList` | Array | N | Spec ⋈ 실적 | **`USE_YN='Y'` Spec 전건** (실적 유무 무관) **+ 실적이 있는 `USE_YN='N'` 항목**, `sortNo` 순 (D27) |
| `└ inspItemCd` | String | N | `MST_INSP_SPEC.INSP_ITEM_CD` | |
| `└ inspItemNm` | String | N | `MST_INSP_SPEC.INSP_ITEM_NM` | |
| `└ unitCd` | String | **Y** | `MST_INSP_SPEC.UNIT_CD` | **측정 단위** |
| `└ judgeType` | String | N | `MST_INSP_SPEC.JUDGE_TYPE` | `RANGE`/`MAX`/`MIN` |
| `└ lsl` | Number | **Y** | `MST_INSP_SPEC.LSL` | `MAX` 일 때 null |
| `└ usl` | Number | **Y** | `MST_INSP_SPEC.USL` | `MIN` 일 때 null |
| `└ decimalLen` | Number | N | `MST_INSP_SPEC.DECIMAL_LEN` | |
| `└ sortNo` | Number | N | `MST_INSP_SPEC.SORT_NO` | |
| `└ useYn` | String | N | `MST_INSP_SPEC.USE_YN` | `Y`/`N`. **`N` 은 읽기 전용 표시 + `totalJudge` 계산 제외** (D27). 키 이름은 data-model §3.4 응답 키와 동일 — 이 응답에 `MST_ITEM.USE_YN` 은 없으므로 F1 design §8 분리 규칙 대상이 아니다 |
| `└ inspSeq` | Number | **Y** | `TRN_INSP_RESULT.INSP_SEQ` | 미검사 항목은 null |
| `└ measuredVal` | Number | **Y** | `TRN_INSP_RESULT.MEASURED_VAL` | 미검사 시 null. **0이 아님** |
| `└ judgeResult` | String | N | 저장값 또는 **합성** | 실적 행이 없으면 서버가 `NONE` 합성 (D1) |
| `└ inspDt` | String | **Y** | `TRN_INSP_RESULT.INSP_DT` | 미검사 시 null |
| `└ inspUserId` | String | **Y** | `TRN_INSP_RESULT.INSP_USER_ID` | 미검사 시 null |
| `└ remark` | String | **Y** | `TRN_INSP_RESULT.REMARK` | 비고. 저장한 값을 재조회할 수 있어야 한다 (N7) |

> **`judgeResult` 의 도메인 (D1)**: 이 API는 `NONE`/`PASS`/`FAIL` 3값을 낸다. `TRN_INSP_RESULT` 에 **저장**되는 값은 `PASS`/`FAIL` 뿐이며, 미검사 항목은 **행이 없어서** 서버가 `NONE` 을 합성한다.

> **비활성 Spec(`USE_YN='N'`) 을 다루는 규칙 (D27)**: `inspList` 는 원칙적으로 **`USE_YN='Y'` 전건**이다. 비활성 항목까지 판정 대상에 넣으면 §1.3(NONE 우선) 때문에 `totalJudge` 가 영원히 `NONE` 에 머물고, Lot이 `OK` 에 도달하지 못해 **F3 성적서 발행이 영구 차단된다.**
>
> 다만 **이미 실적이 있는 비활성 항목은 담는다.** 과거에 실제로 측정한 값을 화면에서 통째로 감추면 F3 §4 발행 스냅샷과 화면이 어긋난다. 이 행은 `useYn='N'` 으로 구분해 화면이 **읽기 전용**으로 렌더하고, **`totalJudge` 계산 대상에서 제외**한다 (§9.3 서버 재판정도 동일 규칙).
>
> Sprint-1에서 `USE_YN='N'` 은 **F1 design §3.1의 soft delete 로 실제로 발생한다**(F1 D37) — 실적이 있는 검사항목을 Spec 목록에서 빼면 서버가 삭제 대신 비활성화한다. 즉 이 규칙은 Sprint-2 대비 방어 계약이 아니라 **Sprint-1에서 동작하는 경로**이며, §12 테스트 대상이다.

**에러 (400)**

| `errorCode` | 조건 |
|-------------|------|
| `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |
| `SPEC_NOT_DEFINED` | 해당 품목에 Spec 미등록 |

> Spec(F1)과 실적(F2)을 **한 번에** 반환한다. 두 번 호출하면 화면이 두 응답을 조립해야 하고, 그 사이 Spec이 바뀌면 어긋난다.

### 9.3 `POST /api/quality/inspect-save` — 검사 실적 저장 + 서버 판정

**Request**
```json
{
  "lotNo": "LOT-20260904-001",
  "inspUserId": "user01",
  "resultList": [
    { "inspItemCd": "TS",  "measuredVal": 452.0, "remark": null },
    { "inspItemCd": "IMP", "measuredVal": 0.42,  "remark": "재측정" }
  ]
}
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `lotNo` | String | ● | |
| `inspUserId` | String | ● | 검사자 (Plan FR-09). **§3 `검사자 ▼` 가 생산** — F0 design §9.3 `user-list` 의 `userId` (D36) |
| `resultList` | Array | ● | **입력한 항목만.** 미입력 항목은 보내지 않는다. **빈 배열 `[]` 도 거부** — F1 §9.3(빈 배열 = 전건 삭제)과 의도적으로 다르다 (D21) |
| `└ inspItemCd` | String | ● | 해당 품목 Spec에 존재해야 함 |
| `└ measuredVal` | Number | ● | null 불가. 지우려면 항목 자체를 제외 |
| `└ remark` | String | | 비고. 선택, null 허용 (D16) |

**Response** — 서버 재판정 결과
```json
{
  "lotNo": "LOT-20260904-001",
  "lotStatus": "LOCKED",
  "totalJudge": "FAIL",
  "judgeDt": "2026-09-04T10:30:00",
  "resultList": [
    { "inspItemCd":"TS",  "inspSeq":1005, "measuredVal":452.0, "judgeResult":"PASS",
      "inspDt":"2026-09-04T10:30:00", "inspUserId":"user01", "remark":null },
    { "inspItemCd":"IMP", "inspSeq":1006, "measuredVal":0.42,  "judgeResult":"PASS",
      "inspDt":"2026-09-04T10:30:00", "inspUserId":"user01", "remark":"재측정" },
    { "inspItemCd":"HRD", "inspSeq":1004, "measuredVal":63.0,  "judgeResult":"FAIL",
      "inspDt":"2026-09-04T09:15:00", "inspUserId":"user02", "remark":null }
  ]
}
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `lotNo` | String | N | `TRN_LOT.LOT_NO` | |
| `lotStatus` | String | N | `TRN_LOT.LOT_STATUS` | 서버가 전이시킨 결과 |
| `totalJudge` | String | N | `TRN_LOT.TOTAL_JUDGE` | `NONE`/`PASS`/`FAIL` |
| `judgeDt` | String | **Y** | `TRN_LOT.JUDGE_DT` | `totalJudge='NONE'` 이면 null |
| `resultList` | Array | N | `TRN_INSP_RESULT` (`LATEST_YN='Y'`) | 이번 저장분이 아니라 **그 Lot 최신 실적 전체** |
| `└ inspItemCd` | String | N | `TRN_INSP_RESULT.INSP_ITEM_CD` | |
| `└ inspSeq` | Number | N | `TRN_INSP_RESULT.INSP_SEQ` | 저장된 행 번호 |
| `└ measuredVal` | Number | N | `TRN_INSP_RESULT.MEASURED_VAL` | 저장된 행이므로 **null 불가** |
| `└ judgeResult` | String | N | `TRN_INSP_RESULT.JUDGE_RESULT` | **`PASS`/`FAIL` 만.** 저장값이라 `NONE` 없음 (D1) |
| `└ inspDt` | String | N | `TRN_INSP_RESULT.INSP_DT` | 검사일시. 저장된 행이므로 **null 불가** — §9.2 `inspList[]` 와 대칭 (D22) |
| `└ inspUserId` | String | N | `TRN_INSP_RESULT.INSP_USER_ID` | 검사자. 이번 저장분은 요청 `inspUserId`, 기존 행은 그때 저장한 검사자 (D22) |
| `└ remark` | String | **Y** | `TRN_INSP_RESULT.REMARK` | 요청에서 받은 비고 반향 (N7) |

`resultList` 에는 **이번에 보낸 항목뿐 아니라 그 Lot의 최신 실적 전체**가 돌아온다. 화면이 종합판정 근거를 그대로 볼 수 있어야 한다.

> **`inspDt`·`inspUserId` 를 싣는 이유 (D22)**: 이 응답과 §9.2 `inspList[]` 는 **같은 그리드를 채운다.** 저장 응답에서 두 키를 빼면 저장 직후 화면의 검사일시·검사자 열이 비거나 이전 값이 남는다(stale). 재조회로 메우면 §9.3 한 번으로 화면을 갱신한다는 설계가 무너진다. 두 API의 행 모델을 대칭으로 유지한다.

**에러 (400)** — F1 §9.3과 동일하게 **요청 단위 / 행 단위**를 나눈다 (F0 §8.2 스키마)

| 오류 단위 | 최상위 `errorCode` | `errors[]` |
|---|---|---|
| **요청 단위** | 그 코드 자체 | 없음 |
| **행 단위** | 항상 `VALIDATION_FAILED` | 위반 행마다 1건 |

| 단위 | `code` | 조건 |
|------|--------|------|
| 요청 | `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |
| 요청 | `SPEC_NOT_DEFINED` | 해당 품목에 Spec 미등록 |
| 요청 | `RESULT_LIST_REQUIRED` | `resultList` 누락 **또는 빈 배열 `[]`** (D21) |
| 요청 | `INSP_USER_REQUIRED` | `inspUserId` 누락 |
| **행** | `INVALID_INSP_ITEM` | 그 품목 Spec에 없는 검사항목 **또는 `useYn='N'` 인 비활성 항목** (D33) |
| **행** | `MEASURED_VAL_REQUIRED` | `measuredVal` 이 null |
| **행** | `INSP_ITEM_DUPLICATED` | 한 요청에 같은 `inspItemCd` 가 두 번 |

**행 단위 오류 응답** — `rowIndex` 는 요청 `resultList` 의 0-base 인덱스 (F0 §8.2 N6)
```json
{
  "errorCode": "VALIDATION_FAILED",
  "errorMessage": "검증에 실패했습니다.",
  "errors": [
    { "rowIndex": 1, "inspItemCd": "XXX", "field": "inspItemCd",
      "code": "INVALID_INSP_ITEM", "message": "해당 품목의 검사항목이 아닙니다." }
  ]
}
```

> **F1과 같은 규칙을 쓰는 이유 (N12)**: `resultList` 를 받는 목록 저장 API이므로 **어느 행이 틀렸는지 프론트가 표시할 수 있어야** 한다. 최상위 `errorCode` 하나만 내면 화면이 전체를 빨갛게 칠하는 수밖에 없다. F1 §9.3과 계약 형태를 통일해 저장 에러 처리를 한 벌로 유지한다.
> `inspItemCd` 는 보조 표시용이며, **식별 기준은 `rowIndex`** 다. 보조 키 추가는 F0 design §8.2 확장 규칙에 따라 본 절에서 선언한 것이다 (R7).

> **빈 배열 `[]` 을 거부하는 이유 (D21)**: F1 §9.3은 `specList: []` 를 **전건 삭제**로 해석한다. F2는 **반대로 거부**한다. Spec은 기준정보라 다시 등록하면 되지만 **검사실적은 실측값이라 지우면 복구 경로가 없다.** 그리드 전체선택 후 실수로 저장하는 조작 하나로 Lot의 검사 근거가 사라지는 것을 계약 수준에서 막는다. 누락과 빈 배열을 같은 코드(`RESULT_LIST_REQUIRED`)로 묶어 프론트 분기를 하나로 유지한다. 실적 삭제가 필요해지면 Sprint-2에서 **전용 API**로 분리해 추가한다.

> **읽기 전용 규칙을 저장 계약에서 강제한다 (D33)**: §9.2가 `useYn='N'` 항목을 "읽기 전용"으로 내려보내도 **저장 계약이 그 값을 거부하지 않으면 규칙은 선언에 그친다.** 화면 버그나 API 직접 호출로 비활성 항목에 값이 들어오면, `totalJudge` 계산에서 제외된 항목의 실적만 갱신되어 헤더 판정과 본문이 어긋난다. 새 코드를 만드는 대신 `INVALID_INSP_ITEM` 의 정의를 **"Spec에 없거나 비활성인 항목"** 으로 넓힌다 — 프론트 입장에서 둘 다 "지금 입력할 수 없는 항목"이라 처리 분기가 같다.

> **`LOT_STATUS` 4값 전부에서 저장을 허용하는 이유 (D23)**: 초안에는 `LOT_NOT_INSPECTABLE` 이 있었으나 **어느 상태가 검사 불가인지 끝내 열거되지 않았다.** §5는 `LOCKED` Lot에 재검사 값을 넣어 `OK` 로 되돌리는 흐름을 이미 확정했으므로 `LOCKED` 는 검사 가능이어야 하고, `WAIT`·`INSP` 는 정상 경로다. 남은 `OK` 하나를 막자고 코드를 유지하면 **오입력 정정 경로가 사라진다.** 따라서 Sprint-1은 4개 상태를 모두 허용하고 코드를 **삭제**한다(F0 design §8.1.1에서도 제거). 발행된 CoA 보호가 필요해지는 시점은 `TRN_COA` 연동 이후이므로, Sprint-2에서 `LOT_ALREADY_ISSUED` 로 **F3 재발행 정책과 함께** 다시 도입한다.

---

## 10. 산출 파일

**Backend**

| 파일 | 담당 엔드포인트 (D20) |
|------|--------------------|
| `InspectionController` | §9.1 · §9.2 · §9.3 |
| `InspectionService` (interface) | 위 3종 |
| `InspectionMockServiceImpl` | `@Profile("mock")` |
| `InspectionServiceImpl` | `@Profile("mybatis*")` |
| `InspectionMapper.java` | 인터페이스 |
| `mapper/sqlite/InspectionMapper.xml` | SQLite 방언 (F0 design §3.3) |
| `mapper/oracle/InspectionMapper.xml` | Oracle 방언 (F0 design §3.3) |
| **`SpecJudge`** (순수) | 엔드포인트 없음 - §9.3이 호출. **F4 §5가 재사용** |
| **`JudgeResult`** (enum) | `NONE`/`PASS`/`FAIL` - data-model §4.2 소유. F3·F4가 소비 |
| **`LotStatus`** (상수) | `WAIT`/`INSP`/`OK`/`LOCKED` - data-model §4.3 소유. **F3 §2가 소비** |

**Frontend**

| 파일 | 소유 | 소비자 |
|------|------|-------|
| `src/pages/InspectionPopPage.vue` | F2 | - |
| `src/utils/specFormat.js` (`formatSpecRange`) | **F2 소유** | F3 §3.1 · F4 §4 |
| `src/utils/specJudgeClient.js` (프론트 즉시판정) | **F2 소유** | F4 §5 2순위 |
| `src/api/quality.js` (§9.1·9.2·9.3 호출 함수 추가) | F1 소유 · **F2 가 함수 추가** | — |

**소비 API (교차 feature — D26)**

| 화면 요소 (§3) | 호출 API | 소유 | 용도 |
|---------------|---------|------|------|
| `검사자 ▼` (`CodeSelect`) | `POST /api/common/user-list` | **F0** design §9.3 | §9.3 `inspUserId` 후보 목록 (`userId`·`userNm`) |
| `Lot ▼` | `POST /api/quality/lot-list` | F2 §9.1 | 본 feature 소유 |

> F2가 소비하는 **교차 feature API는 `user-list` 하나**다. 품목·공정 필터는 F2 화면에 없다 — 품목·상태는 선택된 Lot의 읽기 전용 표시이고(§3 D36, §9.1 D35), 공정 `MultiTreeCombo` 의 소비자는 F4다(F0 plan §6.2).

**DDL**: `TRN_LOT`, `TRN_INSP_RESULT` (data-model §3.6·3.7)

---

## 11. Plan 요구사항 → 설계 매핑

| FR | 반영 |
|----|------|
| FR-01 검사항목 자동 로딩 | §9.2 `inspList` |
| FR-02 즉시 판정 표시 | §2 프론트 계산, §3 화면 |
| FR-03 판정방식 3종 | §1.2 |
| FR-04 하나라도 FAIL → 종합 FAIL | §1.3 `total()` |
| FR-05 FAIL 시각 구분 | §3 Red 배경, §3.1 아이콘+텍스트 |
| FR-06 FAIL 시 Lot 잠김 | §1.4 상태 전이 |
| FR-07 서버 재계산 | §2, §9.3 응답 |
| FR-08 미입력 시 종합판정 보류 | §1.3 NONE 우선 |
| FR-08b 종합판정 Lot 영속화 | §1.4 `TRN_LOT.TOTAL_JUDGE`, §7 트랜잭션 |
| FR-09 검사자·일시 저장 | §9.3 `inspUserId` |
| FR-10 재검사 누적 | §4 `LATEST_YN` |
| FR-11 현장 UI 크기 | §3.1 (수치 확정) |

---

## 12. 테스트 계획 — **경계값이 핵심**

| 레벨 | 대상 | 케이스 |
|------|------|-------|
| **L1** | `SpecJudge.judge()` | `v == usl` → **PASS** / `v == lsl` → **PASS** / `v = usl + 0.000001` → FAIL / `v = null` → NONE / `MAX` 에 `lsl=null` / `MIN` 에 `usl=null` / 소수 `0.1+0.2` 비교 |
| **L1** | `SpecJudge.total()` | 전부 PASS → PASS / 1건 FAIL → FAIL / 1건 NONE + 나머지 PASS → **NONE** / NONE+FAIL 혼재 → NONE |
| L2 | `/api/quality/inspect-save` | 정상 / 재검사(LATEST_YN 전환) / Spec 미등록 / 없는 항목코드 |
| L2 | 트랜잭션 | Lot 갱신 실패 시 실적도 롤백 |
| L3 | 화면 | 이탈값 입력 → 즉시 Red → 저장 → 잠김 |

> L1 첫 줄이 **이 스프린트에서 가장 중요한 테스트**다. `<` 와 `<=` 를 한 글자 잘못 쓰면 규격 딱 맞는 제품이 전부 불합격 처리된다.

> ✅ **2026-09-05 구현 완료**: `src/utils/specJudgeClient.test.js` (경계값·null/0 구분·종합판정 NONE 우선·상태 전이·Mock 시나리오) + `src/utils/specFormat.test.js` (표기 규칙). **50건 전건 통과**(`pnpm test`). 자바 `SpecJudge` 가 붙으면 같은 케이스를 JUnit 으로 옮겨 두 구현의 판정이 일치하는지 대조한다 — F4 design §12 L3 "판정 일치"의 근거가 된다.

---

## 13. 미결정 사항

없음. Plan §2.3의 2건(판정 시점 / 잠김 해제)을 §2·§5에서 확정했다.

---

## 14. 설계 자가진단 체크리스트

- [x] Plan의 모든 FR이 설계 요소로 매핑되었다 (§11 — FR-01~FR-11 + FR-08b 전건)
- [x] API 계약이 Request/Response 키·타입·Null 여부까지 명시되었다 (§9.1~9.3)
- [x] 판정 로직이 순수 함수로 분리되어 단위 테스트 가능하다 (§1.1 `SpecJudge`)
- [x] 경계값 처리(`<=` vs `<`)가 명시되었다 (§1.2 — 경계 포함)
- [x] 부동소수 오차 대응이 명시되었다 (§1.1 `BigDecimal`)
- [x] `NONE`(미검사)이 `0` 및 `FAIL` 과 구분된다 (§1.2·§1.3, §9.2)
- [x] 서버가 최종 판정 주체임이 구조로 보장된다 (§2, §9.3 응답이 서버값)
- [x] 트랜잭션 경계가 정의되고 실패 시 영향이 기술되었다 (§7)
- [x] Lot 상태 전이가 F3 발행 조건과 1:1 연결된다 (§1.4)
- [x] 재검사 이력이 보존되는 구조다 (§4 — UPDATE 아닌 INSERT)
- [x] 정성 요구(FR-11 "장갑")가 측정 가능한 수치로 확정되었다 (§3.1)
- [x] 접근성이 색 이외 수단으로 보장된다 (§3.1 아이콘+텍스트)
- [x] F3와 공유하는 표기 로직이 단일화되었다 (§3.2 `formatSpecRange`)
- [x] 테스트 케이스에 경계값이 포함되었다 (§12 L1)
- [x] 미결정 사항이 명시적으로 처리되었다 (§13 — Plan §2.3 2건 확정)

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성. Plan §2.3 미결정 2건 확정. FR-11 수치화 |
| 0.2 | 2026-09-04 | M4 지적 반영 — D5 응답 키 표 3종, D7 에러 계약, D16 `remark`, D17 요청 표, D18 단위 미포함 근거, D1 `NONE` 합성 명시 |
| 0.3 | 2026-09-04 | M4 재측정 반영 — N7 `remark` 조회 응답 추가(write-only 해소), N8 프론트 API 모듈 선언 |
| 0.4 | 2026-09-04 | M4 4차 반영 — **N12 §9.3 행 단위 에러 계약 신설**(`errors[].rowIndex`, F1 §9.3과 통일), N17 Mapper XML 방언 분리 |
| 0.5 | 2026-09-04 | M4 5차 반영 — `INSP_USER_REQUIRED` 신설, R7 보조 키 확장 근거 명시 |
| 0.6 | 2026-09-04 | M4 6차 반영 — `LOT_NOT_FOUND` 에 `lotNo` 누락 흡수 명시 |
| 0.7 | 2026-09-05 | M4 12차 반영 — D21 `resultList` 빈 배열 거부 + `RESULT_LIST_REQUIRED` 신설, D23 `LOT_NOT_INSPECTABLE` 삭제(4개 상태 전부 허용), D22 응답 `resultList[]` 에 `inspDt`·`inspUserId` 추가(§9.2 대칭), D26 §10 소비 API 선언 |
| 0.8 | 2026-09-05 | M4 13차 반영 — D27 §9.2 `USE_YN` 참여 규칙 확정 (`Y` 전건 + 실적 있는 `N`, `useYn` 키 신설, 판정 제외). CoA 발행 영구 차단 경로 제거 |
| 0.9 | 2026-09-05 | M4 14차 반영 — `specUseYn` → **`useYn`** 원복(한 컬럼 두 이름 해소, data-model §3.4 와 동기), D33 `INVALID_INSP_ITEM` 정의를 비활성 항목까지 확장해 §9.2 읽기전용 규칙을 저장 계약에서 강제 |
| 1.0 | 2026-09-05 | M4 15차 반영 — **D35 §9.1 요청 파라미터 전부 제거**(§3 에 필터 UI 없음, 서버가 `WAIT`·`INSP` 고정), **D36 §3 에 `검사자 ▼` 신설 + 화면 입력→API 매핑표**(§9.3 `inspUserId` 생산자 확보), §10 소비 API 를 `user-list`·`lot-list` 로 교체, D27 을 F1 D37 soft delete 경로 반영해 정정 |
| 1.1 | 2026-09-05 | do 단계 구현 반영 — **D41 §9.1 을 4개 상태 전건 반환으로 정정**. D35 의 `WAIT`·`INSP` 고정 필터가 §5(LOCKED 재검사 복귀)와 D23(OK 오입력 정정)의 진입 경로를 통째로 막고 있었다. 화면은 Lot 콤보 라벨에 상태를 병기한다 |
