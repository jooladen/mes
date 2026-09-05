---
template: design
version: 1.0
feature: mes-coa-s1-data-model
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
scope: 공용 — F0~F4 전체가 참조
---

# Sprint-1 공용 데이터 모델 — Design

> 마스터플랜 §3 **G1(데이터 모델 미정의)** 해소 문서.
> F0~F4 Design 문서는 본 문서의 테이블 정의를 참조하며, 여기서 중복 정의하지 않는다.

---

## 1. 설계 원칙

| # | 원칙 | 근거 |
|---|------|------|
| 1 | **코드와 명칭은 항상 별도 컬럼** | `||` 결합 금지 (F0 **plan** §1.2). 조립은 화면이 한다 |
| 2 | **DB 방언 의존 컬럼 타입 금지** | Mock → SQLite3 → Oracle 3단계 전환 (F0 **plan** §2.3) |
| 3 | **Sprint-2 컬럼 선반영** | `TRN_WORK_ORDER` / `TRN_LOT.PARENT_LOT_NO` 를 지금 뚫어 스키마 재작업 방지 |
| 4 | **측정값은 수치형** | 문자열 저장 시 비교·집계 불가 (F2 판정 정확성) |
| 5 | **코드값은 상수로 관리** | 매직 문자열 금지. §4 코드 정의 참조 |

### 1.1 타입 표기 규약

3단계 전환을 위해 **논리 타입**으로 적고, 물리 타입은 §5 방언 대응표로 매핑한다.

| 논리 타입 | 의미 |
|----------|------|
| `CODE(n)` | 코드성 문자열, 고정 길이 |
| `NAME(n)` | 명칭성 문자열, 가변 |
| `NUM(p,s)` | 수치. `p`=전체자리, `s`=소수자리 |
| `QTY` | 수량. `NUM(18,6)` |
| `TS` | 일시 |
| `FLAG` | `'Y'` / `'N'` |

---

## 2. 테이블 전체 구조

```
[기준정보]                        [트랜잭션]

MST_DEPT (부서)                   TRN_WORK_ORDER (작업지시)  ★Sprint-2 선반영
MST_PROCESS (공정, 트리)                │
MST_ITEM (품목) ──────────┐             │
    │                     │             ▼
    ▼                     └────────► TRN_LOT (Lot)  ──┐  PARENT_LOT_NO 자기참조 ★
MST_INSP_SPEC (검사규격)                  │            │
    │                                     ▼            │
    └──────────────────────► TRN_INSP_RESULT (검사실적) │
                                          │            │
                                          ▼            ▼
                                     TRN_COA (성적서 헤더)
                                          │
                                          ▼
                                  TRN_COA_DETAIL (성적서 본문 스냅샷)
```

★ 표시 = Sprint-1에서는 화면이 없고 **모델만** 존재. Sprint-2가 사용.

> **마스터플랜 대비 변경**: 테이블이 **8개 → 9개**로 늘었다. `TRN_COA_DETAIL` 추가. 사유는 §3.9 참조.

---

## 3. 테이블 정의

### 3.1 `MST_DEPT` — 부서

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `DEPT_CD` | `CODE(10)` | ● | N | 부서코드 |
| `DEPT_NM` | `NAME(100)` | | N | 부서명 |
| `PARENT_DEPT_CD` | `CODE(10)` | | Y | 상위 부서 (트리) |
| `SORT_NO` | `NUM(5,0)` | | N | 정렬순서 |
| `USE_YN` | `FLAG` | | N | 사용여부 |

- **용도**: F0 `CodeSelect` 검증용 샘플 데이터
- **응답 키**: `deptCd`, `deptNm`, `parentDeptCd`, `sortNo`, `useYn`

### 3.2 `MST_PROCESS` — 공정 (계층)

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `PROC_CD` | `CODE(10)` | ● | N | 공정코드 |
| `PROC_NM` | `NAME(100)` | | N | 공정명 |
| `PARENT_PROC_CD` | `CODE(10)` | | Y | 상위 공정 |
| `SORT_NO` | `NUM(5,0)` | | N | 정렬순서 |
| `USE_YN` | `FLAG` | | N | 사용여부 |

- **용도**: F0 `MultiTreeCombo` 트리 데이터 / **F4 공정 다중선택 필터**(F4 design §3) / F2 §9.1·F4 §9.1 공정명 조인 표시
- **응답 키**: `procCd`, `procNm`, `parentProcCd`, `sortNo`, `useYn`

### 3.3 `MST_ITEM` — 품목

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `ITEM_CD` | `CODE(30)` | ● | N | 품목코드 |
| `ITEM_NM` | `NAME(200)` | | N | 품목명 |
| `ITEM_SPEC` | `NAME(200)` | | Y | 규격/사양 (표시용 텍스트) |
| `UNIT_CD` | `CODE(10)` | | N | 재고 단위 |
| `USE_YN` | `FLAG` | | N | 사용여부 |

- **용도**: F1 품목 선택 · Spec 등록 대상 / **F2 검사 화면 품목 필터** / F3 성적서 헤더 품명 · **§2.1 발행 대상 필터** / **F4 피벗 품목 필터** — `item-list`(F1 design §9.1)를 F2·F3·F4가 공유 소비한다 (D26)
- **응답 키**: `itemCd`, `itemNm`, `itemSpec`, **`itemUnitCd`**, `useYn`
- ⚠️ **`UNIT_CD` 컬럼의 응답 키는 `itemUnitCd` 다.** 측정 단위(`MST_INSP_SPEC.UNIT_CD` → `unitCd`, §3.4)와 같은 응답 객체에 함께 나올 수 있으므로 키를 분리한다 — F1 design §8 전역 명명 규칙

### 3.4 `MST_INSP_SPEC` — 품목별 검사규격 ★F1 핵심

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `ITEM_CD` | `CODE(30)` | ● | N | 품목코드 (FK → `MST_ITEM`) |
| `INSP_ITEM_CD` | `CODE(20)` | ● | N | 검사항목코드 |
| `INSP_ITEM_NM` | `NAME(100)` | | N | 검사항목명 (예: 인장강도) |
| `UNIT_CD` | `CODE(10)` | | Y | 측정 단위 (예: MPa) |
| `JUDGE_TYPE` | `CODE(10)` | | N | 판정방식 — `RANGE`/`MAX`/`MIN` |
| `LSL` | `NUM(18,6)` | | Y | 하한 (Lower Spec Limit) |
| `USL` | `NUM(18,6)` | | Y | 상한 (Upper Spec Limit) |
| `TARGET_VAL` | `NUM(18,6)` | | Y | 목표치 |
| `DECIMAL_LEN` | `NUM(2,0)` | | N | 표시 소수자리 (기본 2) |
| `SORT_NO` | `NUM(5,0)` | | N | **CoA 인쇄 순서** (F1 FR-08) |
| `USE_YN` | `FLAG` | | N | 사용여부 |

**제약 (F1 FR-05·FR-07 구현)**

| 조건 | 규칙 |
|------|------|
| `JUDGE_TYPE = 'RANGE'` | `LSL`, `USL` 모두 필수. `LSL <= USL` |
| `JUDGE_TYPE = 'MAX'` | `USL` 필수, `LSL` **NULL 이어야 함** |
| `JUDGE_TYPE = 'MIN'` | `LSL` 필수, `USL` **NULL 이어야 함** |

> DB CHECK 제약으로도 걸지만, **서버 검증이 1차 방어선**이다. SQLite/Oracle CHECK 문법 차이가 있으므로 DB 제약에만 의존하지 않는다.

- **응답 키**: `itemCd`, `inspItemCd`, `inspItemNm`, `unitCd`, `judgeType`, `lsl`, `usl`, `targetVal`, `decimalLen`, `sortNo`, `useYn`
- **Sprint-1 값 규칙 (D28·D37)**: `TARGET_VAL` 은 **항상 null** — F1 design §9.3 요청이 받지 않는다(§2 그리드에 컬럼이 없다). `USE_YN` 은 신규·유지 행이 `'Y'` 이고, **실적이 있는 검사항목을 Spec 목록에서 빼면 서버가 `'N'` 으로 soft delete** 한다(F1 design §3.1 D37). 즉 **`'N'` 은 Sprint-1에서 실제로 발생한다.** 두 컬럼은 **조회 응답에는 그대로 실어** Sprint-2 확장 시 조회 계약이 바뀌지 않게 한다.
- **`USE_YN='N'` 의 스프린트 전역 의미 (D27)**: "검사 대상에서 제외"다. F2 design §9.2 `inspList` 는 `Y` 전건 **+ 실적이 있는 `N` 항목**을 담고, `N` 항목은 `totalJudge` 계산에서 제외한다. `⋈ MST_INSP_SPEC` 조인의 필터 여부는 **화면의 목적에 따라 갈린다.** **F3 design §9.2 는 필터한다**(`USE_YN='Y'`) — 성적서는 종합판정의 증명서라 판정 근거가 된 항목만 실어야 하고, 그러지 않으면 `PASS` 헤더 아래 `FAIL` 줄이 인쇄된다(F3 D32). **F4 design §9.1 은 필터하지 않는다** — 피벗은 이력 조회 화면이라 이미 측정된 값의 규격 표기를 잃지 않는 쪽이 맞다.

### 3.5 `TRN_WORK_ORDER` — 작업지시 ★Sprint-2 선반영

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `WO_NO` | `CODE(30)` | ● | N | 작업지시번호 |
| `ITEM_CD` | `CODE(30)` | | N | 생산 품목 |
| `PLAN_QTY` | `QTY` | | N | 지시수량 |
| `WO_STATUS` | `CODE(10)` | | N | `WAIT`/`RUN`/`DONE`/`STOP` |
| `PLAN_DT` | `TS` | | Y | 계획일 |
| `REG_DT` | `TS` | | N | 등록일시 |

- **Sprint-1 사용 범위**: Mock 데이터 3~5건만 제공. **화면 없음, API 없음.**
- **설계 소유 feature**: **F0** (F0 **plan** §2.1 In Scope에 편입). DDL과 Mock 데이터만 산출한다
- **존재 이유**: `TRN_LOT.WO_NO` 가 참조한다. 나중에 추가하면 Lot 테이블을 고쳐야 한다

### 3.6 `TRN_LOT` — Lot ★F2·F3 핵심 / Sprint-2 확장

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `LOT_NO` | `CODE(30)` | ● | N | Lot 번호 |
| `PARENT_LOT_NO` | `CODE(30)` | | Y | **상위 Lot (자기참조)** ★Sprint-2 F7 |
| `ITEM_CD` | `CODE(30)` | | N | 품목 |
| `WO_NO` | `CODE(30)` | | Y | 작업지시 ★Sprint-2 |
| `PROC_CD` | `CODE(10)` | | Y | 공정 |
| `GOOD_QTY` | `QTY` | | N | 양품수량 |
| `SCRAP_QTY` | `QTY` | | N | 불량수량 |
| `LOT_STATUS` | `CODE(10)` | | N | `WAIT`/`INSP`/`OK`/`LOCKED` |
| `TOTAL_JUDGE` | `CODE(10)` | | N | **종합판정** — `NONE`/`PASS`/`FAIL` |
| `JUDGE_DT` | `TS` | | Y | 종합판정 일시 |
| `REG_DT` | `TS` | | N | 등록일시 |

**`TOTAL_JUDGE` 가 여기 있는 이유** — F3가 "발행 가능 Lot"을 필터할 때 검사실적 테이블을 집계하지 않고 **한 컬럼만 보면 되도록** 한다. F2 저장 시 서버가 계산해 기록하고, F3는 읽기만 한다. (F3 FR-06 "재계산 금지"의 물리적 근거)

**상태 전이 (F2 FR-06)**

```
WAIT ──검사 시작──► INSP ──전항목 PASS──► OK      (발행 가능)
                      │
                      └──1건이라도 FAIL──► LOCKED (발행 차단)
```

- **응답 키**: `lotNo`, `itemCd`, `procCd`, `goodQty`, `scrapQty`, `lotStatus`, `totalJudge`, `judgeDt`
- **Sprint-1 미노출**: `parentLotNo`·`woNo` (Sprint-2 F5·F7이 사용), `regDt` (화면 요구 없음)

### 3.7 `TRN_INSP_RESULT` — 검사실적 ★F2 핵심

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `INSP_SEQ` | `NUM(18,0)` | ● | N | 실적 일련번호 (자동 채번) |
| `LOT_NO` | `CODE(30)` | | N | Lot 번호 |
| `INSP_ITEM_CD` | `CODE(20)` | | N | 검사항목코드 |
| `MEASURED_VAL` | `NUM(18,6)` | | N | **측정값** |
| `JUDGE_RESULT` | `CODE(10)` | | N | `PASS`/`FAIL` — **저장값은 이 둘뿐.** `NONE`은 저장되지 않는다 (§4.2) |
| `INSP_DT` | `TS` | | N | 검사일시 |
| `INSP_USER_ID` | `CODE(30)` | | N | 검사자 |
| `LATEST_YN` | `FLAG` | | N | **최신 실적 여부** |
| `REMARK` | `NAME(500)` | | Y | 비고 |

> **`NONE` 은 이 테이블에 저장되지 않는다.** 미검사 항목은 **행 자체가 없다.** F2 §9.2가 Spec 목록과 실적을 조인해 응답을 조립할 때, 행이 없는 항목에 `judgeResult: "NONE"` 을 **합성**한다. (D1 해소)

**`INSP_SEQ` 를 PK로 둔 이유 (재검사 지원 — F2 FR-10)**

`(LOT_NO, INSP_ITEM_CD)` 를 PK로 잡으면 **재검사 값을 저장할 수 없다.** 실무에서는 같은 항목을 다시 측정하는 일이 흔하고, 이력이 남아야 한다. 그래서 매 측정을 **행으로 누적**하고 `LATEST_YN='Y'` 인 행 하나만 판정·성적서에 사용한다.

```
LOT-001 / 인장강도 / 380 / FAIL / LATEST_YN='N'   ← 1차 (이력 보존)
LOT-001 / 인장강도 / 452 / PASS / LATEST_YN='Y'   ← 재검사 (판정에 사용)
```

- **인덱스**: `(LOT_NO, INSP_ITEM_CD, LATEST_YN)`
- **응답 키**: `inspSeq`, `inspItemCd`, `measuredVal`, `judgeResult`, `inspDt`, `inspUserId`, `remark`
- **Sprint-1 미노출**: `latestYn` — **필터 조건일 뿐** 응답에 싣지 않는다. 모든 조회가 `LATEST_YN='Y'` 로 고정이라 값이 항상 같아 정보량이 0이다
- `lotNo` 는 **헤더 레벨 키**다. F2 §9.2 `inspList[]` / §9.3 `resultList[]` 원소에는 반복하지 않는다 (F4 **design** §9.1 `detailList[]` 는 여러 Lot을 섞으므로 예외적으로 원소에 싣는다)

### 3.8 `TRN_COA` — 출하성적서 헤더 ★F3

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `COA_NO` | `CODE(30)` | ● | N | 성적서번호 (**§4.6** 채번 규칙) |
| `LOT_NO` | `CODE(30)` | | N | 대상 Lot |
| `ITEM_CD` | `CODE(30)` | | N | 품목 (발행시점 복사) |
| `ITEM_NM` | `NAME(200)` | | N | 품목명 (발행시점 복사) |
| `CUST_CD` | `CODE(30)` | | Y | 고객사 코드 — **Sprint-1 미사용(NULL)**. Sprint-2 마스터 연계용 예약 |
| `CUST_NM` | `NAME(200)` | | N | 고객사명 — **발행 화면에서 직접 입력** (F3 FR-12) |
| `SHIP_QTY` | `QTY` | | N | 출하수량 |
| `TOTAL_JUDGE` | `CODE(10)` | | N | 종합판정 (발행시점 복사) |
| `ISSUE_DT` | `TS` | | N | 발행일시 |
| `ISSUE_USER_ID` | `CODE(30)` | | N | 발행자 |
| `COA_STATUS` | `CODE(10)` | | N | `ISSUED`/`CANCELED` (§4.5) |

- **응답 키**: `coaNo`, `lotNo`, `itemCd`, `itemNm`, `custNm`, `shipQty`, `totalJudge`, `issueDt`, `issueUserId`, `coaStatus`
- `custCd` 는 **Sprint-1 미노출** (§3.8 컬럼 설명 — 마스터 연계용 예약)
- F3 §9.3 헤더의 `itemUnitCd` 는 이 테이블 컬럼이 아니라 **`MST_ITEM.UNIT_CD` 조인 파생**이다

### 3.9 `TRN_COA_DETAIL` — 성적서 본문 스냅샷 ★신규 추가

| 컬럼 | 타입 | PK | Null | 설명 |
|------|------|:--:|:----:|------|
| `COA_NO` | `CODE(30)` | ● | N | 성적서번호 |
| `PRINT_SEQ` | `NUM(5,0)` | ● | N | 인쇄 순번 |
| `INSP_ITEM_CD` | `CODE(20)` | | N | 검사항목코드 |
| `INSP_ITEM_NM` | `NAME(100)` | | N | 검사항목명 **(스냅샷)** |
| `UNIT_CD` | `CODE(10)` | | Y | 단위 **(스냅샷)** |
| `JUDGE_TYPE` | `CODE(10)` | | N | 판정방식 **(스냅샷)** |
| `LSL` | `NUM(18,6)` | | Y | 하한 **(스냅샷)** |
| `USL` | `NUM(18,6)` | | Y | 상한 **(스냅샷)** |
| `DECIMAL_LEN` | `NUM(2,0)` | | N | 표시 소수자리 **(스냅샷)** |
| `MEASURED_VAL` | `NUM(18,6)` | | N | 측정값 **(스냅샷)** |
| `JUDGE_RESULT` | `CODE(10)` | | N | 판정 **(스냅샷)** |

#### 왜 스냅샷인가 — F3 §2.3 미결정 사항 **확정**

| 방식 | 결과 |
|------|------|
| ⓑ 발행할 때마다 `MST_INSP_SPEC` 을 조인 | F1은 Spec 이력을 관리하지 않는다(F1 **plan** §2.2 Out of Scope). **규격을 수정하면 작년에 발행한 성적서 내용이 오늘 바뀐다.** 고객사가 가진 종이와 시스템 화면이 달라진다 |
| **ⓐ 발행 시점 값을 복사 저장** ✅ | 발행된 성적서는 **불변**. 규격이 바뀌어도 과거 문서는 그대로 |

**결정: ⓐ 스냅샷.** 이유는 하나다 — **성적서는 회사 밖으로 나가는 문서**이고, 나간 뒤에 내용이 바뀌면 안 된다.

대가로 `MST_INSP_SPEC` 과 데이터가 중복된다. 이건 정규화 위반이 아니라 **의도된 시점 고정**이다. 회계의 전표, 주문의 주문시점 단가와 같은 성격이다.

- **응답 키**: `printSeq`, `inspItemCd`, `inspItemNm`, `unitCd`, `judgeType`, `lsl`, `usl`, `decimalLen`, `measuredVal`, `judgeResult` (10종)
- `coaNo` 는 **헤더 레벨 키**다. `detailList[]` 원소에 반복하지 않는다 (F3 design §9.3·§9.4 "detail 10키")

---

## 4. 코드값 정의

매직 문자열 금지. 아래 값만 사용한다.

### 4.1 `JUDGE_TYPE` — 판정방식

| 값 | 의미 | 합격 조건 | 성적서 규격 표기 (F3 FR-05) |
|----|------|----------|------------------------|
| `RANGE` | 범위형 | `LSL <= v <= USL` | `400 ~ 500` |
| `MAX` | 상한형 | `v <= USL` | `≤ 0.5` |
| `MIN` | 하한형 | `LSL <= v` | `≥ 99.5` |

상수 소유: **`JudgeType`** (F1 design §10)

### 4.2 `JUDGE_RESULT` / `TOTAL_JUDGE` — 판정 결과

| 값 | 의미 |
|----|------|
| `NONE` | 미검사 / 미완료 (**0이나 공백이 아님** — F2 FR-08) |
| `PASS` | 합격 |
| `FAIL` | 불합격 |

상수 소유: **`JudgeResult`** (enum, F2 design §10)

**저장 vs 합성 (D1)**

| 컬럼 | 저장 가능한 값 | `NONE` 취급 |
|------|--------------|------------|
| `TRN_INSP_RESULT.JUDGE_RESULT` | `PASS` / `FAIL` | **저장 안 함.** 미검사는 행 부재 → API가 합성 |
| `TRN_LOT.TOTAL_JUDGE` | `NONE` / `PASS` / `FAIL` | **저장함.** 검사 미완료 Lot의 실제 상태값 |
| `TRN_COA_DETAIL.JUDGE_RESULT` | `PASS` / `FAIL` | 발행은 전항목 PASS일 때만 → `NONE` 불가 |

### 4.3 `LOT_STATUS` — Lot 상태

| 값 | 의미 | F3 발행 대상 |
|----|------|:----------:|
| `WAIT` | 검사 대기 | ✗ |
| `INSP` | 검사 진행중 (일부 항목만 입력) | ✗ |
| `OK` | 전항목 합격 | **✓** |
| `LOCKED` | 불합격으로 잠김 | ✗ |

상수 소유: **`LotStatus`** (F2 design §10)

> F3 FR-01/02는 `LOT_STATUS = 'OK'` **한 조건**으로 구현된다. 발행 버튼 비활성화가 아니라 **목록 쿼리에서 원천 제외**.

### 4.4 `WO_STATUS` · `FLAG` (N9)

| 코드군 | 값 | 비고 |
|--------|----|------|
| `WO_STATUS` | `WAIT`/`RUN`/`DONE`/`STOP` | **Sprint-1 API 미소비** — Sprint-2 F5가 사용 |
| `FLAG` | `Y`/`N` | `USE_YN`, `LATEST_YN` 공통 |

상수 소유: **`WoStatus`** · **`YnFlag`** (F0 design §10) — Sprint-1에서는 어느 API도 소비하지 않지만, 매직 문자열 금지 원칙(§1 원칙5)에 따라 상수로 선언해 둔다.

### 4.5 `COA_STATUS` — 성적서 상태 (D9)

| 값 | 의미 | Sprint-1 |
|----|------|---------|
| `ISSUED` | 발행됨 | 발행 시 항상 이 값 |
| `CANCELED` | 취소됨 | **Sprint-1 미사용 — 스키마 예약** (F3 **design** §4.0 참조) |

상수 소유: **`CoaStatus`** (F3 design §10)

### 4.6 `COA_NO` 채번 규칙 (F3 FR-08 확정)

```
CoA-YYYYMMDD-NNN
      │        └─ 당일 일련번호 3자리 (001부터)
      └─────────── 발행일자
예) CoA-20260904-001
```

재발행 시 새 번호가 부여되고 이력이 누적된다 (F3 FR-10).

---

## 5. DB 방언 대응표 (Mock → SQLite3 → Oracle)

| 논리 타입 | SQLite3 | Oracle |
|----------|---------|--------|
| `CODE(n)` | `TEXT` | `VARCHAR2(n)` |
| `NAME(n)` | `TEXT` | `VARCHAR2(n)` |
| `NUM(p,s)` | `REAL` / `INTEGER` | `NUMBER(p,s)` |
| `QTY` | `REAL` | `NUMBER(18,6)` |
| `TS` | `TEXT` (ISO8601) | `DATE` / `TIMESTAMP` |
| `FLAG` | `TEXT` | `CHAR(1)` |

### 5.1 주의 지점

| 항목 | SQLite3 | Oracle | 대응 |
|------|---------|--------|------|
| 현재일시 | `datetime('now')` | `SYSDATE` | Mapper XML을 DB별로 분리. Service는 모른다 |
| 문자열 결합 | `||` | `||` / `CONCAT` | **애초에 쓰지 않는다** (원칙 1) |
| 시퀀스 | `AUTOINCREMENT` | `SEQUENCE` | `INSP_SEQ` 채번을 Mapper에 격리 |
| 빈 문자열 | `''` ≠ `NULL` | `''` **= `NULL`** | ⚠️ Oracle에서 빈 문자열이 NULL이 된다. 코드값에 빈 문자열 저장 금지 |
| 소수 비교 | `REAL` 부동소수 | `NUMBER` 정밀 | ⚠️ **판정 정확도 문제.** §6 참조 (F2 **plan** §5 위험) |

---

## 6. 부동소수점 판정 문제 (F2 **plan** §5 Risks 대응)

측정값 비교는 **판정 정확도에 직결**된다. `452.0 <= 452` 가 거짓이 되면 합격품이 불합격이 된다.

**결정**

| 계층 | 방식 |
|------|------|
| **판정 로직 (서버)** | `BigDecimal` 로 비교한다. `double` 금지 |
| **저장** | `NUM(18,6)` — 소수 6자리까지 |
| **화면 즉시 판정** | JS `Number` 비교 — **참고용 표시일 뿐** |
| **최종 판정** | 항상 서버 `BigDecimal` 결과 (F2 FR-07) |

프론트와 서버 판정이 다를 수 있다는 점을 인정하고, **서버를 단일 진실로 못박는다.** 화면은 빠른 피드백용이다.

---

## 7. Mock 데이터 구성 계획

`@Profile("mock")` 구현체가 제공할 초기 데이터. **SQLite 전환 시 그대로 seed 로 재사용**한다 (F0 **plan** §8).

| 테이블 | 건수 | 비고 |
|--------|------|------|
| `MST_DEPT` | 5 | 2단계 트리 |
| `MST_PROCESS` | 6 | 2단계 트리 |
| `MST_ITEM` | 3 | 품목별 검사항목 수를 다르게 (F4 동적 컬럼 검증용) |
| `MST_INSP_SPEC` | 12 | 3종 판정방식 **전부 포함** |
| `TRN_WORK_ORDER` | 3 | Sprint-2 선반영 |
| `TRN_LOT` | 8 | `OK` 4 / `LOCKED` 2 / `INSP` 1 / `WAIT` 1 |
| `TRN_INSP_RESULT` | 30+ | 재검사 케이스 1건 포함 (`LATEST_YN` 검증) |
| `TRN_COA` / `_DETAIL` | 0 | F3에서 생성 |

**Mock 데이터가 만족해야 할 조건**

- [ ] `JUDGE_TYPE` 3종이 모두 등장한다 → F2 판정 분기 전수 검증
- [ ] 경계값 케이스가 있다 (측정값 == USL, == LSL) → F2 §5 위험
- [ ] 품목별 검사항목 수가 다르다 → F4 동적 컬럼 검증
- [ ] `LOCKED` Lot이 있다 → F3 발행 차단 검증
- [ ] 재검사 이력이 있다 → `LATEST_YN` 로직 검증

---

## 8. Plan 미결정 사항 반영 현황

| 출처 | 미결정 항목 | 본 문서 결정 |
|------|-----------|-------------|
| F2 **plan** §2.3 | 판정 시점 | **프론트(즉시 표시) + 서버(최종)** 이중. §6 |
| F2 **plan** §5 | 부동소수 오차 | **서버 `BigDecimal`**. §6 |
| F3 **plan** §2.3 | 규격 스냅샷 | **발행시점 복사 저장** → `TRN_COA_DETAIL` 신설. §3.9 |
| F3 **plan** FR-08 | 성적서 채번 규칙 | `CoA-YYYYMMDD-NNN`. **§4.6** |
| F2 **plan** FR-10 | 재검사 저장 방식 | `INSP_SEQ` 행 누적 + `LATEST_YN`. §3.7 |
| F3 **plan** §2.3 | PDF 출력 방식 | **확정 — 브라우저 인쇄** (F3 design §5) |
| M8 Gap 2 | 고객사 입력 경로 | **발행 화면에서 직접 입력**. `MST_CUST` 는 Sprint-1 Out of Scope (§3.8) |
| M8 Gap 3 | `TRN_WORK_ORDER` 설계 소유자 | **F0** (§3.5) |
| F4 **plan** §2.3 | 그리드 라이브러리 | **확정 — RealGrid2 2.10.0** (F4 design §13 · master-plan §8 R3 해소) |

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성. 테이블 8→9개 (`TRN_COA_DETAIL` 추가). 미결정 5건 확정 |
| 0.2 | 2026-09-04 | M8 지적 반영 — 고객사 입력 경로 확정(Gap 2), `TRN_WORK_ORDER` 소유자 F0 지정(Gap 3) |
| 0.3 | 2026-09-04 | M4 지적 반영 — D1 `JUDGE_RESULT` 저장/합성 구분, D9 `COA_STATUS` 코드값 정의 신설, 채번규칙 이동 |
| 0.4 | 2026-09-04 | M4 재측정 반영 — N4 그리드 확정 상태 동기, N9 `WO_STATUS`·`FLAG` 코드값 절 추가(§4.4) |
| 0.5 | 2026-09-04 | M4 3차 반영 — R1 절번호 스테일 참조 정정(§3.8), D2 모델층 동기(§3.3 `itemUnitCd`), `WoStatus`/`YnFlag` 소유 상수 선언(§4.4) |
| 0.6 | 2026-09-04 | M4 4차 반영 — N10 §8 채번 참조 §4.4→§4.6, N11 `TRN_COA` 응답 키 선언, N18 §4.1~4.3 상수 소유 선언 |
| 0.7 | 2026-09-04 | M4 5차 반영 — §3.6·§3.7·§3.9 응답 키 노출 범위 명시(미노출 컬럼·헤더/원소 레벨 구분), N16 문서 수식 참조 |
| 0.8 | 2026-09-04 | M4 6차 반영 — N16 완결(plan 참조 12건 수식), §3.2 용도 정정, §8 PDF 출력 확정 상태 동기 |
| 0.9 | 2026-09-05 | M4 13차 반영 — §3.4 에 `TARGET_VAL`·`USE_YN` 의 Sprint-1 고정값(D28)과 `USE_YN='N'` 스프린트 전역 의미(D27) 선언. F2 는 판정 제외, F3·F4 조인은 미필터 |
| 1.0 | 2026-09-05 | M4 14차 반영 — §3.3 용도에 F2·F4 추가(D26 누락분), §3.4 D27 의 조인 필터 정책을 F3=필터 / F4=미필터 로 분리 명시(F3 D32) |
| 1.1 | 2026-09-05 | M4 15차 반영 — §3.4 `USE_YN` 규칙을 F1 D37 soft delete 반영해 정정(`'N'` 이 Sprint-1에서 실제 발생) |
