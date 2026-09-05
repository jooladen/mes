---
template: design
version: 1.0
feature: F3-coa-print
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
plan: docs/01-plan/features/F3-coa-print.plan.md
---

# F3 출하성적서(CoA) 자동 생성 + 인쇄 — Design

> **Plan**: `docs/01-plan/features/F3-coa-print.plan.md`
> **선행**: F0, F1, F2 · **데이터**: data-model §3.8·3.9
> 🎯 **이 스프린트의 최종 산출물.** 여기서 나온 PDF 1장이 Sprint-1의 결과다.

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 준의 실무 배정 항목이자 MES 품질 체인의 출구 |
| **WHO** | 품질 담당자(발행) · 고객사(수령) · 공장 관리자(제안 수신) |
| **RISK** | 내용이 실제 검사 결과와 다르면 대외 신뢰 사고 |
| **SUCCESS** | Lot 선택 → 미리보기 → PDF 출력 무중단, 값이 F2 저장값과 100% 일치 |

---

## 1. 발행 흐름

```
[1] 발행 가능 Lot 목록          LOT_STATUS = 'OK' 인 것만 (§2)
        ↓ 선택
[2] 미리보기 데이터 조회         F1 규격 + F2 실적 조인 (§9.2)
        ↓ 고객사·수량 입력
[3] 발행                        채번 → TRN_COA + TRN_COA_DETAIL 스냅샷 저장 (§4)
        ↓
[4] 인쇄 / PDF                  브라우저 인쇄 (§5)
```

**[2]와 [3]이 분리된 이유**: 미리보기는 아직 발행이 아니다. 화면에서 확인만 하고 닫으면 성적서 번호가 낭비되고 이력에 유령 행이 남는다. **발행 버튼을 눌러야 번호가 나간다.**

---

## 2. 발행 대상 필터 (Plan FR-01·FR-02)

```sql
WHERE LOT_STATUS = 'OK'
```

**한 조건이다.** F2가 종합판정을 `TRN_LOT` 에 저장해 뒀기 때문이다 (F2 §1.4). 검사실적을 집계하지 않는다.

| Lot 상태 | 목록 노출 |
|---------|:--------:|
| `WAIT` 검사 대기 | ✗ |
| `INSP` 일부만 입력 | ✗ |
| `OK` 전항목 합격 | **✓** |
| `LOCKED` 불합격 | ✗ |

> **버튼 비활성화가 아니라 목록에서 제외한다.** 화면에 보이면 언젠가 눌린다. 애초에 고를 수 없어야 한다.

### 2.1 조회 조건 화면 (§9.1 요청의 생산자 — D31)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 판정일 [2026-09-01] ~ [2026-09-04]   품목 [CodeSelect ▼]     [조회]   │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────┬──────────┬────────┬──────┬─────────────┬──────┐          │
│ │ Lot No │ 품목      │ 양품수량│ 단위 │ 판정일시     │ 발행 │          │
│ ├────────┼──────────┼────────┼──────┼─────────────┼──────┤          │
│ │ L-001  │스틸브라켓 │   100  │ EA   │09-04 10:30  │  0   │ ← 선택   │
│ │ L-002  │스틸브라켓 │    80  │ EA   │09-04 11:20  │  1   │ ← 재발행 │
│ └────────┴──────────┴────────┴──────┴─────────────┴──────┘          │
│                                          [미리보기]  [발행]           │
└──────────────────────────────────────────────────────────────────────┘
```

| 화면 요소 | §9.1 요청 키 | 필수 | 값의 출처 |
|----------|-------------|:---:|----------|
| 판정일 시작 `DatePicker` | `fromDt` | ● | 사용자 직접 입력 |
| 판정일 종료 `DatePicker` | `toDt` | ● | 사용자 직접 입력 |
| 품목 `CodeSelect` | `itemCd` | | **F1 design §9.1** `item-list` (§10 소비 API) |
| [조회] 버튼 | — | | §9.1 `coa-target-list` 호출 |

**그리드 열은 §9.1 응답 키와 1:1이다** — `lotNo` / `itemNm` / `goodQty` / `itemUnitCd` / `judgeDt` / `issuedCount`. `issuedCount > 0` 인 행은 **재발행**임을 표시한다(§4.1 채번은 그래도 새 번호를 딴다). 목록에는 §2의 `LOT_STATUS='OK'` 만 올라오므로 `lotStatus` 열은 두지 않는다(§9.1 D18 역방향).

[미리보기]는 §9.2, [발행]은 §9.3을 호출한다. 두 버튼이 분리된 이유는 §1(번호 낭비 방지)에 있다.

> **이 절이 왜 필요한가 (D31)**: §9.1은 `fromDt`·`toDt` 를 **필수(●)** 로 요구하는데(D1) 그 값을 만드는 화면 요소가 설계 어디에도 없었다. §2는 서버 고정 필터(`LOT_STATUS='OK'`)이고 §3은 **인쇄 양식**이라 조회 컨트롤이 아니다. 계약이 요구하는 입력의 생산자가 없으면 구현자가 화면을 임의로 만들게 되고, 그 순간 같은 92일 정책을 쓰는 F4 design §3과 조작감이 갈린다. 기간 상한을 사용자에게 알려주는 자리도 여기다.

---

## 3. 성적서 양식

```
┌────────────────────────────────────────────────────────────────┐
│                    출 하 성 적 서  (CoA)                        │
├──────────────────┬──────────────────┬──────────────────────────┤
│ 성적서번호        │ 발행일자          │ 고객사                    │
│ CoA-20260904-001 │ 2026-09-04       │ (주)대한기계               │
├──────────────────┼──────────────────┼──────────────────────────┤
│ 품목             │ Lot No.          │ 출하수량                  │
│ ITEM-001         │ LOT-20260904-001 │ 100 EA                   │
│ 스틸 브라켓       │                  │                          │
├──────┬───────────┬──────┬───────────┬──────────┬──────────────┤
│ No   │ 검사항목   │ 단위 │ 규격       │ 측정값    │ 판정          │
├──────┼───────────┼──────┼───────────┼──────────┼──────────────┤
│  1   │ 인장강도   │ MPa  │ 400 ~ 500 │  452.0   │ PASS         │
│  2   │ 경도      │ HRC  │  55 ~ 62  │   58     │ PASS         │
│  3   │ 불순물    │  %   │  ≤ 0.5    │   0.420  │ PASS         │
├──────┴───────────┴──────┴───────────┴──────────┴──────────────┤
│  종합판정 :  PASS                                              │
│                                                                │
│  발행자 : 홍길동                              (인)              │
└────────────────────────────────────────────────────────────────┘
```

| 영역 | 원천 (발행 후) |
|------|--------------|
| 헤더 | `TRN_COA` **전부** — 발행시점 스냅샷 |
| 본문 | `TRN_COA_DETAIL` **전부** — 발행시점 스냅샷 |
| 종합판정 | `TRN_COA.TOTAL_JUDGE` — F2 저장값 복사 |

**발행 후에는 `MST_INSP_SPEC` 도 `TRN_INSP_RESULT` 도 보지 않는다.** 조인하면 소급 변경된다.

### 3.0 `printSeq` 정의 (D3)

`printSeq` 는 `MST_INSP_SPEC.SORT_NO` 와 **같은 값이 아니다.**

```
해당 Lot의 성적서 대상 항목을 SORT_NO 오름차순 정렬
  → 1부터 조밀(dense)하게 재부여한 값이 printSeq

예)  SORT_NO = 1, 2, 5, 9   (중간이 비어 있음)
     printSeq = 1, 2, 3, 4  (성적서 No. 열)
```

**재부여하는 이유**: 성적서 `No.` 열은 사람이 읽는 일련번호다. `1, 2, 5, 9` 로 찍히면 "3번과 4번은 어디 갔나"라는 질문을 받는다. `SORT_NO` 는 sparse 할 수 있으므로(항목 삭제·중간 삽입) 인쇄 시점에 조밀화한다.

`printSeq` 는 `TRN_COA_DETAIL.PRINT_SEQ` 로 **발행 시 확정 저장**된다. 발행 전(§9.2)에는 서버가 계산해 내려준다.

### 3.1 규격 열 표기 (Plan FR-05)

F2와 **같은 함수**(`formatSpecRange`)를 쓴다. 두 벌로 만들면 화면과 성적서가 달라진다.

| `judgeType` | 표기 |
|------------|------|
| `RANGE` | `400 ~ 500` |
| `MAX` | `≤ 0.5` |
| `MIN` | `≥ 99.5` |

### 3.2 측정값 자릿수

`decimalLen` 만큼 **0을 채워** 표시한다. `0.42` → `decimalLen=3` → `0.420`.

성적서에서 자릿수는 **측정 정밀도의 표현**이다. `0.42` 와 `0.420` 은 다른 정보다.

---

## 4. 발행 = 스냅샷 저장 (Plan §2.3 확정 / data-model §3.9)

```
발행 요청
   │
   ├─ 1. LOT_STATUS = 'OK' 재확인          ← 미리보기 이후 상태가 바뀌었을 수 있다
   ├─ 2. COA_NO 채번                       (§4.1)
   ├─ 3. TRN_COA        INSERT             헤더 스냅샷
   └─ 4. TRN_COA_DETAIL INSERT (N행)       본문 스냅샷 — 규격+측정값+판정 복사
                                            ↑ 한 트랜잭션
```

**1번을 다시 확인하는 이유**: 미리보기를 띄워놓고 다른 사람이 재검사를 넣어 `LOCKED` 로 바뀔 수 있다. 발행 직전에 다시 본다.

> ⚠️ **`TRN_COA` · `TRN_COA_DETAIL` 은 INSERT 전용이다.** UPDATE·DELETE API를 만들지 않는다. 발행된 성적서 내용이 바뀌면 대외 문서와 시스템이 어긋난다. **Sprint-1에는 취소 기능 자체가 없다** - §4.0 참조.

### 4.0 `CANCELED` 상태 — Sprint-1 Out of Scope (D10)

`COA_STATUS` 는 `ISSUED` / `CANCELED` 두 값을 갖지만(data-model §4.5), **Sprint-1에는 취소 API가 없다.** 발행된 성적서는 항상 `ISSUED` 다.

| | Sprint-1 |
|---|---|
| 취소 엔드포인트 | **없음** |
| `CANCELED` 발생 | **불가능** — 스키마 예약값 |
| 잘못 발행했을 때 | 재발행(§4.2)으로 새 번호를 내고, 이전 번호는 그대로 둔다 |

> 취소는 "누가 취소할 수 있는가"라는 권한 문제를 동반한다. 인증·권한이 Sprint-1 Out of Scope이므로 권한 없는 취소 API는 **아무나 대외 문서를 무효화하는 뒷문**이 된다. `POST /api/quality/coa-cancel` 은 carry item.

### 4.1 채번 (`CoA-YYYYMMDD-NNN`)

```
당일 최대 일련번호 + 1 → 3자리 zero-fill
```

동시 발행 충돌은 `TRN_COA.COA_NO` **UNIQUE 제약 + 재시도**로 처리한다. Sprint-1은 단일 사용자 환경이라 실제 충돌 가능성은 낮지만, 제약은 걸어 둔다.

### 4.2 재발행 (Plan FR-10)

같은 Lot을 다시 발행하면 **새 `COA_NO` 로 새 행**이 생긴다. 기존 행은 그대로 둔다.
→ 어떤 번호의 성적서가 언제 나갔는지 전부 남는다.

---

## 5. 인쇄 방식 — 브라우저 인쇄 (Plan §2.3 확정)

**결정: `window.print()` + `@media print` CSS**

| | 브라우저 인쇄 ✅ | 서버 PDF 생성 |
|---|---|---|
| 의존성 | **0** | PDF 라이브러리 + 한글 폰트 |
| 한글 | 브라우저가 처리 | **폰트 임베딩 필요** |
| 구현량 | CSS 한 벌 | 렌더링 엔진 + 템플릿 |
| 결과물 | 브라우저 "PDF로 저장" | 서버 PDF 파일 |

서버 PDF는 한글 폰트 임베딩에서 시간이 크게 든다. Sprint-1의 목표는 "1장이 제대로 나오는 것"이다.

### 5.1 인쇄 CSS 요건 (Plan FR-07·FR-11)

```css
@media print {
  @page { size: A4 portrait; margin: 15mm; }

  /* 화면 전용 요소 제거 — 이게 없으면 버튼·메뉴가 종이에 찍힌다 */
  .no-print { display: none !important; }

  /* 표 헤더를 매 페이지 반복 (FR-11) */
  thead { display: table-header-group; }

  /* 행이 페이지 경계에서 잘리지 않게 */
  tr { break-inside: avoid; }

  /* 배경색 인쇄 — 기본값은 배경을 안 찍는다 */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

`thead { display: table-header-group }` 가 FR-11의 실제 구현이다. 이 한 줄이 없으면 2페이지째에 열 제목이 사라진다.

### 5.2 검증 기준

검사항목 **15건**으로 인쇄 미리보기를 확인한다 (Plan DoD). 1페이지를 넘겨 헤더 반복과 행 잘림을 실제로 본다.

> ✅ **2026-09-05 2차 — 부분 해소**: `ITEM-004` 를 **30항목**으로 확장해 성적서가 **1.32쪽**(1329px / A4 가용 1009px)이 되도록 만들었다. 인쇄 규칙을 화면에 재현해 **페이지 경계가 24번과 25번 행 *사이*에 떨어지는 것**을 확인했다 — `tr { break-inside: avoid }` 가 의도대로 동작한다.
>
> ⚠️ **여전히 미확인**: **2페이지째 `thead` 반복**은 눈으로 보지 못했다. `display: table-header-group` 은 **실제 인쇄 엔진**에서만 반복 렌더되고, 화면 에뮬레이션에는 페이지 개념이 없다. `window.print()` 는 브라우저 모달을 띄워 자동화 세션이 멈추므로 호출하지 않았다. **사람이 [인쇄/PDF] 를 한 번 눌러 2쪽 상단에 열 제목이 나오는지 확인해야 이 DoD 가 완전히 닫힌다.**
>
> ~~**2026-09-05 1차 미달 (carry item)**~~: 15건짜리 품목(`ITEM-004` 정밀 샤프트)을 Mock 에 넣어 실측했으나, 성적서 전체 높이가 **842px / A4 1페이지 가용 1009px = 0.83쪽**이라 **페이지가 넘어가지 않았다.** 즉 `thead { display: table-header-group }` 가 CSSOM 에 적용된 것은 확인했지만(§5.1), **헤더 반복과 행 잘림을 눈으로 본 것은 아니다.** A4 한 장에는 대략 **28~30행**이 들어간다. 이 DoD 를 실제로 닫으려면 검사항목 30건 이상인 Lot 이 필요하다 — Sprint-2 로 이월한다.

---

## 6. 고객사·출하수량 입력 (Plan FR-12)

`MST_CUST` 를 만들지 않는다. 발행 화면에서 **직접 입력**한다.

| 필드 | 타입 | 필수 | 저장 위치 | 값의 출처 |
|------|------|:---:|----------|----------|
| 고객사명 | 텍스트 | ● | `TRN_COA.CUST_NM` | 사용자 직접 입력 |
| 출하수량 | 숫자 | ● | `TRN_COA.SHIP_QTY` | 사용자 직접 입력 |
| **발행자** | `CodeSelect` | ● | `TRN_COA.ISSUE_USER_ID` | **F0 design §9.3 `user-list`** (D38) |

`TRN_COA.CUST_CD` 는 **Sprint-1에서 NULL**. Sprint-2 마스터 연계용 예약 컬럼이다.

> **발행자를 여기 두는 이유 (D38)**: §9.3 `issueUserId` 는 필수(●)인데 초안에는 **값을 만드는 화면 요소가 없었다.** 인증·세션이 Sprint-1 Out of Scope(F0 plan §2.2)라 로그인 사용자에서 가져올 수도 없다. 고객사·출하수량과 같은 **발행 직전 입력**이므로 같은 자리에 둔다. 목록은 F0 design §9.3 `user-list` 를 §5 `CodeSelect` 로 렌더한다(`codeKey="userId"` `nameKey="userNm"`). §2.1 조회 조건 화면과는 다른 자리다 — 조회는 대상을 고르는 단계이고 발행자는 확정 단계의 입력이다.

> 고객사 마스터를 만들면 CRUD 화면 + Lot-고객사 귀속 규칙이 따라온다. Sprint-1 목표는 "CoA 1장 관통"이다.

### 6.1 출하수량 검증

`shipQty <= TRN_LOT.GOOD_QTY` — 양품수량보다 많이 출하할 수 없다. 위반 시 `SHIP_QTY_EXCEEDS_GOOD_QTY`.

---

## 7. 레이어 배치

```
CoaController
    └── CoaService (interface)
            ├── CoaMockServiceImpl   @Profile("mock")
            └── CoaServiceImpl       @Profile("mybatis*")
                    └── CoaMapper + XML

CoaNumberGenerator (채번, §4.1)
```

판정 로직은 여기 없다. **F3는 계산하지 않고 읽어서 배치만 한다.**

---

## 8. 성능

Plan NFR "선택 → 미리보기 1초". §9.2가 헤더+본문을 **단일 호출**로 반환하므로 왕복이 1회다. 검사항목 수십 건 규모라 추가 최적화가 불필요하다.

---

## 9. API Contract

### 9.1 `POST /api/quality/coa-target-list` — 발행 가능 Lot 목록

**Request**
```json
{ "itemCd": null, "fromDt": "2026-09-01", "toDt": "2026-09-04" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `itemCd` | String | | 품목 필터 |
| `fromDt` | String | ● | 판정일 시작 (`YYYY-MM-DD`) |
| `toDt` | String | ● | 판정일 종료. `fromDt` 이상, **최대 92일** — 상한 수치만 F4 design §7과 동일. **기간의 기준 컬럼은 다르다**: F3 = 판정일(`TRN_LOT.JUDGE_DT`) / F4 = 검사일(`TRN_INSP_RESULT.INSP_DT`) |

**Response** — `List<CamelMap>` · **`LOT_STATUS='OK'` 만**
```json
[{ "lotNo":"LOT-20260904-001", "itemCd":"ITEM-001", "itemNm":"스틸 브라켓",
   "goodQty":100, "itemUnitCd":"EA", "totalJudge":"PASS", "judgeDt":"2026-09-04T10:30:00",
   "issuedCount":0 }]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `lotNo` | String | N | `TRN_LOT.LOT_NO` | |
| `itemCd` | String | N | `TRN_LOT.ITEM_CD` | |
| `itemNm` | String | N | `MST_ITEM.ITEM_NM` (조인) | |
| `goodQty` | Number | N | `TRN_LOT.GOOD_QTY` | 출하수량 입력 상한 (§6.1) |
| `itemUnitCd` | String | N | `MST_ITEM.UNIT_CD` (조인) | **재고 단위** (`EA`). 측정 단위와 구분 — D2 |
| `totalJudge` | String | N | `TRN_LOT.TOTAL_JUDGE` | 이 목록에서는 항상 `PASS` |
| `judgeDt` | String | N | `TRN_LOT.JUDGE_DT` | `OK` Lot이므로 non-null |
| `issuedCount` | Number | N | **파생(계산)** — `TRN_COA` count | 기발행 건수. **0보다 크면 재발행** |

> **F2 §9.1 대비 축소 키 (D18 역방향)**: `lotStatus`(이 목록은 정의상 항상 `OK`), `procCd`/`procNm`(성적서는 공정을 표기하지 않음 — §3 양식), `scrapQty`(출하 대상이 아님)를 싣지 않는다. 반대로 `itemUnitCd`·`issuedCount` 는 F3에만 있다.

**에러 (400)**

| `errorCode` | 조건 |
|-------------|------|
| `PERIOD_REQUIRED` | `fromDt` 또는 `toDt` 누락 |
| `PERIOD_REVERSED` | `fromDt > toDt` |
| `PERIOD_TOO_LONG` | 92일 초과 (F4 design §7과 동일 상한) |

결과 0건은 빈 배열 `[]`.

> **기간을 필수로 두는 이유 (D1)**: 초안은 두 값이 선택이라 **둘 다 생략하면 `PERIOD_TOO_LONG` 이 영영 발동하지 않았다.** 92일 상한을 선언해 놓고 우회로를 열어둔 셈이고, "F4 design §7과 동일 정책"이라는 자기 선언과도 어긋났다 (F4 §9.1은 양쪽 모두 ●). 전체 기간 조회는 `TRN_LOT` 전건 스캔이라 성능 상한의 의미 자체가 사라지므로, F4와 같은 계약으로 통일한다. 누락은 `PERIOD_REQUIRED` (F0 design §8.1.1, 소유 F3·F4).

### 9.2 `POST /api/quality/coa-print-data` — 미리보기 데이터 (발행 전)

**Request**
```json
{ "lotNo": "LOT-20260904-001" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `lotNo` | String | ● | `LOT_STATUS='OK'` 이어야 함 |

**Response** — `CamelMap` (헤더 + 본문 단일 호출)
```json
{
  "lotNo": "LOT-20260904-001",
  "itemCd": "ITEM-001",
  "itemNm": "스틸 브라켓",
  "goodQty": 100,
  "itemUnitCd": "EA",
  "totalJudge": "PASS",
  "detailList": [
    { "printSeq":1, "sortNo":1, "inspItemCd":"TS", "inspItemNm":"인장강도", "unitCd":"MPa",
      "judgeType":"RANGE", "lsl":400, "usl":500, "decimalLen":1,
      "measuredVal":452.0, "judgeResult":"PASS" }
  ]
}
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `lotNo` | String | N | `TRN_LOT.LOT_NO` | |
| `itemCd` | String | N | `TRN_LOT.ITEM_CD` | |
| `itemNm` | String | N | `MST_ITEM.ITEM_NM` (조인) | |
| `goodQty` | Number | N | `TRN_LOT.GOOD_QTY` | |
| `itemUnitCd` | String | N | `MST_ITEM.UNIT_CD` (조인) | **재고 단위** — 배열 내 `unitCd`(측정 단위)와 다름 (D2) |
| `totalJudge` | String | N | `TRN_LOT.TOTAL_JUDGE` | 항상 `PASS` |
| `detailList` | Array | N | `TRN_INSP_RESULT` ⋈ `MST_INSP_SPEC` | `LATEST_YN='Y'` **AND `MST_INSP_SPEC.USE_YN='Y'`** 만, `sortNo` 순 (D32) |
| `└ printSeq` | Number | N | **파생(계산)** | 1부터 조밀 재부여 (§3.0 — D3) |
| `└ sortNo` | Number | N | `MST_INSP_SPEC.SORT_NO` | 정렬 원본. `printSeq` 추적용 (D3) |
| `└ inspItemCd` | String | N | `MST_INSP_SPEC.INSP_ITEM_CD` | |
| `└ inspItemNm` | String | N | `MST_INSP_SPEC.INSP_ITEM_NM` | |
| `└ unitCd` | String | **Y** | `MST_INSP_SPEC.UNIT_CD` | **측정 단위** (`MPa`) |
| `└ judgeType` | String | N | `MST_INSP_SPEC.JUDGE_TYPE` | `RANGE`/`MAX`/`MIN` |
| `└ lsl` | Number | **Y** | `MST_INSP_SPEC.LSL` | `MAX` 일 때 null |
| `└ usl` | Number | **Y** | `MST_INSP_SPEC.USL` | `MIN` 일 때 null |
| `└ decimalLen` | Number | N | `MST_INSP_SPEC.DECIMAL_LEN` | 표시 자릿수 (§3.2) |
| `└ measuredVal` | Number | N | `TRN_INSP_RESULT.MEASURED_VAL` | 저장된 행이므로 **null 불가** |
| `└ judgeResult` | String | N | `TRN_INSP_RESULT.JUDGE_RESULT` | **`PASS` 만** — `OK` Lot이므로 (D1) |

> **`coaNo` 가 없다.** 아직 발행 전이라 번호가 존재하지 않는다 (§1).

> **CoA 본문은 `USE_YN='Y'` 만 담는다 (D32)**: F2 design §9.2는 이력 보존을 위해 실적이 있는 비활성 항목까지 담지만(D27), **성적서는 다르다.** 비활성 항목의 실적은 `totalJudge` 계산에서 **제외된** 값이므로, 그대로 본문에 실으면 `totalJudge='PASS'` 헤더 아래 **`FAIL` 줄이 인쇄된다.** 위 `judgeResult` "`PASS` 만" 선언과 data-model §3.9("발행은 전항목 PASS일 때만")가 동시에 깨진다. 따라서 이 조인에는 `MST_INSP_SPEC.USE_YN='Y'` 를 건다 — **판정 근거가 된 항목만** 증명서에 싣는다. §4 발행 스냅샷은 이 응답을 그대로 저장하므로 자동으로 같은 집합이 된다. 반면 F4 design §9.1은 **이력 조회 화면**이라 미필터를 유지한다.

**에러 (400)**

| `errorCode` | 조건 |
|-------------|------|
| `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |
| `LOT_NOT_ISSUABLE` | `LOT_STATUS != 'OK'` |

### 9.3 `POST /api/quality/coa-issue` — 발행

**Request**
```json
{
  "lotNo": "LOT-20260904-001",
  "custNm": "(주)대한기계",
  "shipQty": 100,
  "issueUserId": "user01"
}
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `lotNo` | String | ● | |
| `custNm` | String | ● | 직접 입력 (FR-12) |
| `shipQty` | Number | ● | `<= goodQty` (§6.1) |
| `issueUserId` | String | ● | 발행자 (FR-09). **§6 `발행자` 가 생산** — F0 design §9.3 `user-list` 의 `userId` (D38) |

**Response** — 발행된 스냅샷 전체 (그대로 인쇄에 사용)
```json
{
  "coaNo": "CoA-20260904-001",
  "lotNo": "LOT-20260904-001",
  "itemCd": "ITEM-001",
  "itemNm": "스틸 브라켓",
  "itemUnitCd": "EA",
  "custNm": "(주)대한기계",
  "shipQty": 100,
  "totalJudge": "PASS",
  "issueDt": "2026-09-04T11:00:00",
  "issueUserId": "user01",
  "coaStatus": "ISSUED",
  "detailList": [
    { "printSeq":1, "inspItemCd":"TS", "inspItemNm":"인장강도", "unitCd":"MPa",
      "judgeType":"RANGE", "lsl":400, "usl":500, "decimalLen":1,
      "measuredVal":452.0, "judgeResult":"PASS" }
  ]
}
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `coaNo` | String | N | `TRN_COA.COA_NO` | 채번 결과 (§4.1) |
| `lotNo` | String | N | `TRN_COA.LOT_NO` | |
| `itemCd` | String | N | `TRN_COA.ITEM_CD` | 발행시점 스냅샷 |
| `itemNm` | String | N | `TRN_COA.ITEM_NM` | 발행시점 스냅샷 |
| `itemUnitCd` | String | N | `MST_ITEM.UNIT_CD` (조인) | **재고 단위** (D2) |
| `custNm` | String | N | `TRN_COA.CUST_NM` | 입력값 (FR-12) |
| `shipQty` | Number | N | `TRN_COA.SHIP_QTY` | 입력값 |
| `totalJudge` | String | N | `TRN_COA.TOTAL_JUDGE` | 발행시점 복사. 항상 `PASS` |
| `issueDt` | String | N | `TRN_COA.ISSUE_DT` | |
| `issueUserId` | String | N | `TRN_COA.ISSUE_USER_ID` | (FR-09) |
| `coaStatus` | String | N | `TRN_COA.COA_STATUS` | **항상 `ISSUED`** — Sprint-1은 `CANCELED` 미발생 (§4.0) |
| `detailList` | Array | N | `TRN_COA_DETAIL` | 발행시점 스냅샷, `printSeq` 순 |
| `└ printSeq` | Number | N | `TRN_COA_DETAIL.PRINT_SEQ` | 발행 시 확정 저장 (§3.0) |
| `└ inspItemCd` | String | N | `TRN_COA_DETAIL.INSP_ITEM_CD` | |
| `└ inspItemNm` | String | N | `TRN_COA_DETAIL.INSP_ITEM_NM` | 스냅샷 |
| `└ unitCd` | String | **Y** | `TRN_COA_DETAIL.UNIT_CD` | **측정 단위** 스냅샷 |
| `└ judgeType` | String | N | `TRN_COA_DETAIL.JUDGE_TYPE` | 스냅샷 |
| `└ lsl` | Number | **Y** | `TRN_COA_DETAIL.LSL` | `MAX` 일 때 null |
| `└ usl` | Number | **Y** | `TRN_COA_DETAIL.USL` | `MIN` 일 때 null |
| `└ decimalLen` | Number | N | `TRN_COA_DETAIL.DECIMAL_LEN` | 스냅샷 |
| `└ measuredVal` | Number | N | `TRN_COA_DETAIL.MEASURED_VAL` | 스냅샷 |
| `└ judgeResult` | String | N | `TRN_COA_DETAIL.JUDGE_RESULT` | **`PASS` 만** |

**에러 (400)**

| `errorCode` | 조건 |
|-------------|------|
| `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |
| `LOT_NOT_ISSUABLE` | `LOT_STATUS != 'OK'` (§4 단계 1) |
| `SHIP_QTY_EXCEEDS_GOOD_QTY` | 출하수량 > 양품수량 |
| `CUST_NM_REQUIRED` | 고객사명 누락 |
| `SHIP_QTY_REQUIRED` | `shipQty` 누락 |
| `ISSUE_USER_REQUIRED` | `issueUserId` 누락 |

### 9.4 `POST /api/quality/coa-view` — 발행분 재조회

**Request**
```json
{ "coaNo": "CoA-20260904-001" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `coaNo` | String | ● | 발행된 성적서 번호. **Sprint-1 유일 출처는 §9.3 발행 응답** (아래 도달 경로) |

> **Sprint-1 도달 경로 (D30)**: `coaNo` 를 만들어 내는 계약은 **§9.3 발행 응답 하나뿐**이다. §9.1은 `issuedCount`(건수)만 주고 번호는 주지 않으며, 발행 이력 목록 화면은 **Sprint-1 범위 밖**이다(F3 plan §6.2). 따라서 §9.4는 **발행 직후 같은 세션에서 미리보기·재출력**하는 용도로만 도달 가능하고, 세션을 닫은 뒤의 재출력은 Sprint-2 발행이력 화면과 함께 열린다. 스프린트 SUCCESS 기준(Lot 선택 → 미리보기 → PDF 관통)은 이 경로만으로 충족된다. **미도달 엔드포인트가 아니라 범위가 좁은 엔드포인트**임을 여기서 못박는다.

**Response**: §9.3 응답 키 표와 **완전히 동일한 키 집합·타입·Null 여부**.

| 구분 | §9.3 (발행) | §9.4 (재조회) |
|------|------------|--------------|
| 헤더 10키 | `TRN_COA` | `TRN_COA` (동일) |
| `itemUnitCd` | `MST_ITEM.UNIT_CD` 조인 | `MST_ITEM.UNIT_CD` 조인 (**유일한 차이 — 아래 주석**) |
| `detailList` 10키 | `TRN_COA_DETAIL` | `TRN_COA_DETAIL` (동일) |


차이는 원천 하나뿐이다 — **`TRN_COA` + `TRN_COA_DETAIL` 만 읽는다.** `MST_INSP_SPEC` 도 `TRN_INSP_RESULT` 도 조인하지 않으므로, 규격이 나중에 바뀌어도 몇 년 뒤 조회 결과가 발행 당시와 같다.

예외: `itemUnitCd` 는 §9.3에서 `MST_ITEM` 조인이었으나, **§9.4에서는 `TRN_COA.ITEM_CD` 기준 조인**이라 품목 단위가 변경되면 달라질 수 있다. 성적서 본문(검사 결과)이 아닌 부가 정보이므로 스냅샷 대상에서 제외한다.

**에러 (400)**

| `errorCode` | 조건 |
|-------------|------|
| `COA_NOT_FOUND` | 존재하지 않는 성적서 번호. **`coaNo` 누락도 이 코드로 흡수** |

---

## 10. 산출 파일

**Backend**

| 파일 | 담당 엔드포인트 (D20) |
|------|--------------------|
| `CoaController` | §9.1 · §9.2 · §9.3 · §9.4 |
| `CoaService` (interface) | 위 4종 |
| `CoaMockServiceImpl` | `@Profile("mock")` |
| `CoaServiceImpl` | `@Profile("mybatis*")` |
| `CoaMapper.java` | 인터페이스 (**UPDATE/DELETE 미정의** — §4) |
| `mapper/sqlite/CoaMapper.xml` | SQLite 방언 (F0 design §3.3) |
| `mapper/oracle/CoaMapper.xml` | Oracle 방언 (F0 design §3.3) |
| `CoaNumberGenerator` | §4.1 채번 |
| **`CoaStatus`** (상수) | `ISSUED`/`CANCELED` — data-model **§4.5** 소유 (D9) |

**Frontend**

| 파일 | 소유 | 역할 |
|------|------|------|
| `src/pages/CoaPrintPage.vue` | F3 | 발행 화면 |
| `src/components/CoaSheet.vue` | F3 | 성적서 양식 전용 (§3) |
| `src/css/coa-print.css` | F3 | 인쇄 전용 CSS (§5.1) |
| `src/api/quality.js` (§9.1~9.4 호출 함수 추가) | F1 소유 · **F3 가 함수 추가** (N8) | API 클라이언트 |
| `src/utils/specFormat.js` (`formatSpecRange`) | **F2 소유** | §3.1 규격 표기 · §3.2 자릿수 |

**소비 API (교차 feature — D26)**

| 화면 요소 (§2.1) | 호출 API | 소유 | 용도 |
|---------------|---------|------|------|
| 품목 `CodeSelect` | `POST /api/quality/item-list` | **F1** design §9.1 | §9.1 `itemCd` 필터 후보 목록 (`itemCd`·`itemNm`) |
| `발행자` (`CodeSelect`) — §6 | `POST /api/common/user-list` | **F0** design §9.3 | §9.3 `issueUserId` 후보 목록 (`userId`·`userNm`) |

> F3는 품목·사용자 목록 API를 **만들지 않는다.** F1의 기존 엔드포인트를 호출한다. 이 선언이 없으면 §9.1이 `itemCd` 를 받으면서도 그 후보를 채울 방법이 계약 어디에도 없는 상태가 된다.

**DDL**: `TRN_COA`, `TRN_COA_DETAIL` (data-model §3.8·3.9)

---

## 11. Plan 요구사항 → 설계 매핑

| FR | 반영 |
|----|------|
| FR-01 합격 Lot만 목록 | §2, §2.1, §9.1 |
| FR-02 FAIL·미완료 제외 | §2 (목록 제외) |
| FR-03 확정 양식 미리보기 | §3, §9.2 |
| FR-04 정렬번호 순 | §9.2 `printSeq` / `SORT_NO` |
| FR-05 판정방식별 규격 표기 | §3.1 `formatSpecRange` |
| FR-06 재계산 금지 | §3 스냅샷, §7 (계산 없음) |
| FR-07 인쇄 잘림 없음 | §5.1 `break-inside: avoid` |
| FR-08 자동 채번 | §4.1 |
| FR-09 발행 이력 | §9.3 `issueUserId`, §4 |
| FR-10 재발행 누적 | §4.2, §9.1 `issuedCount` |
| FR-11 페이지별 헤더 반복 | §5.1 `table-header-group` |
| FR-12 고객사·수량 입력 | §6, §9.3 |

---

## 12. 테스트 계획

| 레벨 | 대상 | 케이스 |
|------|------|-------|
| L1 | `CoaNumberGenerator` | 당일 첫건 `001` / 연번 / 날짜 변경 시 리셋 |
| L1 | `formatSpecRange` | 3종 판정방식 표기 |
| L2 | `/api/quality/coa-issue` | 정상 / `LOCKED` Lot 거부 / 수량 초과 / 재발행 시 새 번호 |
| L2 | **스냅샷 불변성** | 발행 → `MST_INSP_SPEC` 수정 → `coa-view` 재조회 → **내용 동일** |
| L3 | 인쇄 | 검사항목 15건 미리보기 — 헤더 반복, 행 잘림 없음 |
| L3 | **관통 시연** | Lot 선택 → 미리보기 → 발행 → PDF 저장 (Sprint Metric #5) |

> L2 "스냅샷 불변성"이 §4 설계가 실제로 동작하는지 검증하는 유일한 테스트다.

---

## 13. 미결정 사항

없음. Plan §2.3의 2건을 확정했다.

| 항목 | 결정 | 근거 |
|------|------|------|
| 출력 방식 | **브라우저 인쇄** | §5 — 의존성 0, 한글 폰트 문제 없음 |
| 규격 스냅샷 | **발행시점 복사** | §4 — 대외 문서 불변성 |

---

## 14. 설계 자가진단 체크리스트

- [x] Plan의 모든 FR이 설계 요소로 매핑되었다 (§11 — FR-01~FR-12 전건)
- [x] API 계약이 Request/Response 키·타입·Null 여부까지 명시되었다 (§9.1~9.4)
- [x] 발행 대상 제한이 목록 단계에서 원천 차단된다 (§2 — 버튼 비활성화 아님)
- [x] 재계산 금지가 구조로 보장된다 (§3 스냅샷 원천, §7 계산 로직 부재)
- [x] 스냅샷 불변성이 API 설계로 강제된다 (§4 — UPDATE/DELETE API 없음)
- [x] 미리보기와 발행이 분리되어 번호 낭비가 없다 (§1)
- [x] 발행 직전 상태 재확인이 있다 (§4 단계 1 — TOCTOU 방어)
- [x] 인쇄 요건이 구체적 CSS로 명시되었다 (§5.1)
- [x] 다중 페이지 헤더 반복 수단이 특정되었다 (§5.1 `table-header-group`)
- [x] F2와 공유하는 표기 로직이 단일화되었다 (§3.1 `formatSpecRange`)
- [x] 표시 자릿수 규칙이 정의되었다 (§3.2 `decimalLen` zero-fill)
- [x] 고객사 입력 경로가 확정되었다 (§6 — M8 Gap 2 해소)
- [x] 채번 충돌 대응이 있다 (§4.1 UNIQUE + 재시도)
- [x] 스냅샷 불변성을 검증할 테스트가 있다 (§12 L2)
- [x] §9 요청 파라미터마다 값을 만드는 화면 요소가 있다 (§9.1 ← §2.1 D31 / §9.3 `custNm`·`shipQty`·`issueUserId` ← §6 D38 / §9.2·§9.4 `lotNo`·`coaNo` ← §2.1 그리드 선택값과 §9.3 응답 D30)
- [x] 성적서 본문이 종합판정 근거와 일치한다 (§9.2 D32 — 비활성 항목 제외)
- [x] 미결정 사항이 명시적으로 처리되었다 (§13 — 2건 확정)

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성. Plan §2.3 미결정 2건 확정(브라우저 인쇄 / 스냅샷) |
| 0.2 | 2026-09-04 | M4 지적 반영 — D2 `unitCd`→`itemUnitCd` 개명, D3 `printSeq` 규칙(§3.0), D5 응답 키 표 4종, D7 `COA_NOT_FOUND`, D9 `CoaStatus` 상수, D10 `CANCELED` Out of Scope(§4.0), D17 요청 표, D20 엔드포인트 매핑 |
| 0.3 | 2026-09-04 | M4 재측정 반영 — N1 §9.3 JSON 예시 동기, D18 역방향 축소 키 근거, N8 프론트 API 모듈 선언 |
| 0.4 | 2026-09-04 | M4 4차 반영 — N19 §9.1 기간 상한 92일 정책 명시, N17 Mapper XML 방언 분리 |
| 0.5 | 2026-09-04 | M4 5차 반영 — `SHIP_QTY_REQUIRED`·`ISSUE_USER_REQUIRED` 신설, `coaNo` 누락 흡수 명시, N16 참조 수식 |
| 0.6 | 2026-09-04 | M4 6차 반영 — §9.4 헤더 키 수 11→10 정정(`itemUnitCd` 는 조인 파생), `lotNo` 누락 흡수 |
| 0.7 | 2026-09-05 | M4 12차 반영 — D1 §9.1 기간 `fromDt`/`toDt` 필수화 + `PERIOD_REQUIRED` 신설, D26 §10 소비 API(`item-list`) 선언 |
| 0.8 | 2026-09-05 | M4 13차 반영 — D27 §9.2 조인 `USE_YN` 미필터 명시, §9.1 기간 기준 컬럼이 F4와 다름을 명시, D30 §9.4 Sprint-1 도달 경로 선언 |
| 0.9 | 2026-09-05 | M4 14차 반영 — **D31 §2.1 조회 조건 화면 신설**(§9.1 필수 파라미터 3개의 생산자 확보), **D32 §9.2 조인에 `USE_YN='Y'` 복원**(13차의 미필터가 `PASS` 만 선언과 자기모순 — OK Lot 성적서에 FAIL 줄이 찍히는 경로였음), §10 표 헤더 §3→§2.1 정정, §11·§14 반영 |
| 1.0 | 2026-09-05 | M4 15차 반영 — **D38 §6 에 발행자 `CodeSelect` 신설**(§9.3 `issueUserId` 생산자 확보), §10 소비 API 에 `user-list` 추가, §14 의 D31 체크 문구를 §9 전체 기준으로 정정(overclaim 해소) |
| 1.1 | 2026-09-05 | do 단계 구현 반영 — §5.2 검증 기준의 **미달 사실 명시**(15건이 A4 1페이지에 들어가 페이지 넘김·헤더 반복을 실측하지 못함. 30행 이상 필요, Sprint-2 이월) |
| 1.2 | 2026-09-05 | §5.2 DoD **부분 해소** — `ITEM-004` 30항목 확장으로 성적서 1.32쪽 달성, 행 잘림 방지 확인. `thead` 반복은 실제 인쇄 필요(사람 확인분) |
