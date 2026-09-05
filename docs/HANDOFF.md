# HANDOFF — MES 출하성적서 Sprint-1 인수인계

> **이 문서 하나로 이어받을 수 있게** 쓴다.
> 대상: ① 다음 세션의 나 ② 자바 백엔드를 붙일 개발자 ③ 이 프로젝트를 인수하는 사람
>
> 작성: 2026-09-05 · Sprint-1 `do` 완료 시점

---

## 0. 30초 요약

| | |
|---|---|
| **무엇** | 공장에서 만든 물건의 **출하성적서(CoA)** 를 뽑는 웹 화면 5개 |
| **어디까지** | **프론트엔드 목업 완성.** Mock 데이터만으로 Lot 선택 → 검사 → 성적서 발행 → 인쇄까지 **관통** |
| **안 된 것** | **자바 백엔드 없음**(의도적). 로그인 없음. 진짜 DB 없음 |
| **다음 할 일** | 성적서 2쪽 인쇄 눈으로 확인 → 자바 백엔드 붙이기 |
| **바로 실행** | `pnpm install && pnpm dev` → `http://localhost:5283/` |

> **Sprint-1 SUCCESS 기준** — *"Mock 프로파일만으로 브라우저에서 Lot 선택 → CoA 미리보기 → PDF 출력까지 중단 없이 관통된다"* → **달성**

---

## 1. 지금 당장 실행하기

```bash
cd mes
pnpm install                 # 처음 한 번
cp .env.example .env.local   # ⚠️ 필수 — 아래 참조
pnpm dev                     # → http://localhost:5283/
```

### ⚠️ `.env.local` 이 없으면 F4 화면이 죽는다

`VITE_REALGRID_LICENSE` 가 비어 있으면 RealGrid2 가 **`LicenseError` 를 던져** F4 품질피벗 화면이 통째로 안 뜬다.
`.env.example` 을 `.env.local` 로 복사하고 **RealGrid2 테스트 라이선스 키**를 넣어야 한다.

> 키는 `.gitignore` 에 있어 저장소에 없다. `cdp2/crudGrid/.env.local` 에 같은 키가 있다.
> **F1·F2·F3 는 키 없이도 정상 동작한다** — RealGrid2 를 F4 만 쓰기 때문.

### ⚠️ 포트 5283 이 안 열릴 수 있다

Windows 가 TCP **5113~5212** 를 예약해버려 5180~5183 대는 `EACCES` 로 막힌다.
Vite 가 자동으로 다음 포트(5284, 5285…)를 찾으니 **터미널에 찍힌 주소를 본다.**

```bash
netsh interface ipv4 show excludedportrange protocol=tcp   # 예약 대역 확인
```

### 검증 명령

```bash
pnpm test     # 단위 테스트 66건
pnpm build    # 프로덕션 빌드 (에러 확인용으로도 유용)
```

---

## 2. 완성 범위

### 화면 5개 — 전부 동작

| | 화면 | 파일 | 핵심 기능 | 상태 |
|---|---|---|---|:---:|
| **F0** | 공통 컴포넌트 검증 | `DevSandboxPage.vue` | 콤보 3종 + 공통 API 3종 | ✅ |
| **F1** | 품질규격 등록 | `QualitySpecPage.vue` | `q-table` 편집, V1~V9 검증, 전체목록 일괄저장 | ✅ |
| **F2** | 검사실적 입력 | `InspectionPopPage.vue` | 현장 POP, 즉시판정 + 서버 재판정, 재검사 이력 | ✅ |
| **F3** | 성적서 발행 | `CoaPrintPage.vue` | 채번·스냅샷·브라우저 인쇄 | ✅ |
| **F4** | 품질피벗 | `QualityPivotPage.vue` | RealGrid2 동적 컬럼, 이탈 셀 강조, Excel | ✅ |

### API 14개 — 전부 구현 (가짜 서버)

```
F0  /api/common/dept-list      /api/common/process-tree    /api/common/user-list
F1  /api/quality/item-list     /api/quality/spec-list      /api/quality/spec-save
F2  /api/quality/lot-list      /api/quality/inspect-list   /api/quality/inspect-save
F3  /api/quality/coa-target-list  /api/quality/coa-print-data
    /api/quality/coa-issue     /api/quality/coa-view
F4  /api/quality/inspect-history
```

### 품질 게이트

| 게이트 | 값 | 기준 | |
|---|---|---|:---:|
| **M4** 계약↔구현 일치율 | **100** | 95 | ✅ |
| **M8** 설계 완성도 | 86 | 85 | ✅ |
| **M3** 치명 이슈 수 | 0 | 0 | ✅ |

> M4 는 `design` 단계에서 **9번 재서 한 번도 통과 못 했다.** 코드가 없으니 "계약↔구현 대조"가 성립하지 않았기 때문. `do` 단계에서 처음 재자 실제 버그 3건을 짚었고, 고친 뒤 **14/14 = 100%** 가 됐다.
> **교훈: M4 는 코드가 있어야 의미가 있다.** design 단계 게이트로 쓰지 말 것.

---

## 3. 전체 구조

### 데이터 흐름

```
 [사람]            [화면]                   [데이터]
 품질담당자  ──▶  F1 품질규격 등록  ──▶  MST_INSP_SPEC (합격 기준)
                                              │ 채점 기준
                                              ▼
 검사원      ──▶  F2 검사실적 입력  ──▶  TRN_INSP_RESULT (측정값+판정)
                       │ 서버 재판정         TRN_LOT (Lot 상태)
                       ▼                        │ 합격(OK)만
                 종합판정 → 상태전이            ▼
 발행담당자  ──▶  F3 성적서 발행    ──▶  TRN_COA / TRN_COA_DETAIL (스냅샷)
                       ▼
                 브라우저 인쇄 → PDF
 관리자      ──▶  F4 품질피벗       ◀── (읽기 전용)
```

### Lot 상태 전이 — 이 그림이 시스템의 심장

```
  WAIT ──검사 시작──▶ INSP ──전 항목 PASS──▶  OK   ──▶ 성적서 발행 가능 ✅
                        │
                        └──1건이라도 FAIL──▶ LOCKED ──▶ 발행 불가 ❌
                                                │
                                                └─ 재검사로 PASS 되면 자동 OK 복귀
```

### 레이어 (의존 방향은 항상 아래로)

```
pages/*.vue          화면 — 서버 경로를 모른다
    ↓
api/quality.js       창구 — 함수만 노출. 경로 상수를 소유
api/common.js
    ↓
api/http.js          ★ 가짜 서버. 자바가 붙으면 이 파일 내부만 바뀐다
    ↓
mock/*.json          가짜 데이터

utils/               순수 계산 — 위 어느 레이어도 모른다 (판정·표기)
composables/         순수 변환 — 피벗
components/          부품 — 서버 API를 모른다. 부모가 데이터를 넣어준다
```

---

## 4. 파일별 소유·역할

### 반드시 알아야 할 4개

| 파일 | 줄 | 역할 | 주의 |
|---|---:|---|---|
| **`api/http.js`** | 683 | **가짜 서버.** API 14개 전부 여기 | 자바 붙일 때 **이 파일만** 바뀐다 |
| **`utils/specJudgeClient.js`** | 112 | **합격/불합격 판정** | 🔴 한 글자 틀리면 합격품이 전부 불합격. 고치기 전 `pnpm test` |
| **`components/CoaSheet.vue`** | 199 | **성적서 종이 그 자체** | 양식 변경은 여기만 |
| **`api/quality.js`** | 153 | 화면 ↔ 서버 창구 | 새 API는 여기에도 함수 추가 |

### 전체 목록

| 파일 | 줄 | 역할 |
|---|---:|---|
| `main.js` | 43 | 진입점. **RealGrid2 라이선스 주입 지점** |
| `App.vue` / `layouts/MainLayout.vue` | 43/39 | 탭 전환 (vue-router 미도입) |
| `pages/QualitySpecPage.vue` | 362 | F1 |
| `pages/InspectionPopPage.vue` | 366 | F2 |
| `pages/CoaPrintPage.vue` | 310 | F3 |
| `pages/QualityPivotPage.vue` | 288 | F4 |
| `pages/DevSandboxPage.vue` | 160 | F0 검증 |
| `components/CodeSelect.vue` | 90 | 코드+명칭 2열 단일선택 — **F1·F2·F3·F4 전부 사용** |
| `components/MultiCheckCombo.vue` | 55 | 체크 다중선택 |
| `components/MultiTreeCombo.vue` | 125 | 트리 다중선택 (F4 공정) |
| `components/ThemeToggle.vue` | 20 | 다크/라이트 |
| `api/common.js` | 78 | F0 API + `toTree()` |
| `api/specValidator.js` | 114 | F1 V1~V9 검증 — **백엔드 `SpecValidator` 대역** |
| `utils/specFormat.js` | 51 | 규격·측정값 표기 — **F2·F3·F4 공유** |
| `composables/usePivotGrid.js` | 84 | F4 동적 컬럼 + 피벗 (순수 함수) |
| `css/tokens.css` | — | 색 토큰 (여기만 고치면 전체 색이 바뀜) |
| `css/coa-print.css` | — | **인쇄 전용 CSS** |
| `mock/*.json` | — | 부서8 / 공정10 / 사용자6 / 품목5 / 규격42 / Lot7 / 실적45 |

### 테스트 3개 · 66건

| 파일 | 건수 | 무엇을 |
|---|---:|---|
| `utils/specJudgeClient.test.js` | 33 | **경계값**(`v===usl`→PASS), null vs 0, NONE 우선, 상태전이, Mock 시나리오 |
| `utils/specFormat.test.js` | 17 | 규격 표기 3종, `0.42`→`0.420`, `0`은 빈칸 아님 |
| `composables/usePivotGrid.test.js` | 16 | 동적 컬럼 정렬, 누락 셀 = null, 두 품목 혼합 |

---

## 5. 🔧 자바 백엔드 붙이는 법

**가장 중요한 절.** 프론트는 자바가 붙을 것을 전제로 설계돼 있다.

### 원칙 — 화면 코드는 한 줄도 안 바뀐다

```
현재:  화면 → api/quality.js → api/http.js (가짜 서버) → mock/*.json
이후:  화면 → api/quality.js → api/http.js (axios)     → 자바 서버
                  ↑ 안 바뀜        ↑ 이 파일 내부만
```

### 1단계 — `api/http.js` 를 axios 로 교체

`post()` 함수 하나만 바꾸면 된다. 나머지(핸들러 전체)는 삭제한다.

```js
import axios from 'axios'

// 경로 상수가 §9 계약과 글자 그대로 같아서 baseURL 은 빈 문자열이다
const http = axios.create({ baseURL: '', timeout: 10000 })

export class ApiError extends Error { /* 지금 것 그대로 유지 */ }

export async function post(url, params = {}) {
  try {
    const { data } = await http.post(url, params)
    return data                        // ★ 래핑하지 않는다 (F0 §4.1)
  } catch (e) {
    const d = e.response?.data ?? {}
    throw new ApiError(d.errorCode ?? 'INTERNAL_ERROR', d.errorMessage ?? e.message, d.errors)
  }
}
```

> **`ApiError` 모양을 반드시 유지할 것.** 화면 5개가 전부 `e.errorMessage` 와 `e.errors` 를 읽는다.

### 2단계 — 자바가 지켜야 할 계약

| 항목 | 규칙 | 근거 |
|---|---|---|
| **응답 래핑** | **하지 않는다.** 목록이면 배열 그대로, 객체면 객체 그대로 | F0 §4.1 |
| **키 이름** | 카멜케이스 (`INSP_ITEM_CD` → `inspItemCd`) | F0 §3.1 `CamelMap` |
| **에러** | HTTP 400 + `{ errorCode, errorMessage, errors? }` | F0 §8.2 |
| **에러코드** | **F0 §8.1.1 레지스트리 29종만** 쓴다. 신규는 표에 먼저 등록 | F0 §8.1.1 |
| **응답 키** | 설계서 §9 의 키 표와 **정확히 일치**. DB 행을 그대로 뱉지 말 것 | ⚠️ 아래 참조 |
| **조회도 POST** | 조회 조건이 배열/객체로 커질 때 URL 길이 제한을 안 탄다 | F0 §4.1 |

> ⚠️ **저장 형태 ≠ 응답 형태.** `TRN_COA` 에는 `CUST_CD` 가 있지만 응답에는 없어야 하고, `TRN_COA_DETAIL` 의 조인 키 `COA_NO` 는 원소마다 반복하면 안 된다.
> 이 프로젝트에서 실제로 이 실수를 했고 M4 가 잡았다. **`toCoaResponse()` 처럼 나갈 키를 명시적으로 고르는 함수**를 두는 것을 권한다.

### 3단계 — 자바로 옮겨야 할 순수 로직

`api/` 안의 두 파일은 **자바 클래스의 대역**이다. 자바가 붙으면 서버 쪽으로 옮기고 프론트에서는 지운다.

| 지금 (JS) | 자바에서 | 설계서 |
|---|---|---|
| `api/specValidator.js` | `SpecValidator` (순수 클래스) | F1 §4·§5 |
| `utils/specJudgeClient.js` | `SpecJudge` (순수 클래스, `BigDecimal`) | F2 §1 |

> **`utils/specJudgeClient.js` 는 지우지 않는다.** F2 §2 가 판정을 **이중**으로 하기 때문이다 — 화면은 입력 즉시 판정(편의), 서버는 저장 시 재판정(최종 진실). 자바가 붙으면 **두 구현이 생기고**, 그때부터 F4 §12 L3 "판정 일치" 테스트가 드리프트를 잡는다.

> ⚠️ **`BigDecimal` 을 반드시 쓸 것.** `double` 로 `452.0 <= 452` 를 비교하면 표현 오차로 거짓이 될 수 있고, **그때 합격품이 불합격으로 나간다.** `compareTo(...) <= 0` 을 쓴다.

### 4단계 — 테스트 이식

`utils/specJudgeClient.test.js` 의 33개 케이스를 **JUnit 으로 그대로 옮긴다.**
특히 경계값 케이스(`v === usl` → PASS)는 필수다. 이게 두 구현이 같은 답을 내는지 확인하는 유일한 수단이다.

### 5단계 — DB

`mock/*.json` 을 **SQLite `INSERT` seed 로 재사용**한다 (F0 §6 / Plan §8). 키 집합이 이미 테이블 컬럼과 1:1이다.
Profile 전환: `mock` → `sqlite` → `oracle` (F0 §3.3). Mapper XML 은 방언별로 분리돼 있어야 한다.

---

## 6. 남은 작업 (우선순위)

### 🔴 P0 — 사람이 직접 해야 함

| 항목 | 왜 |
|---|---|
| **성적서 2쪽 인쇄 확인** | F3 §5.2 DoD. `LOT-20260904-007`(30항목, 1.32쪽)로 **[인쇄/PDF] 를 눌러** 2쪽 상단에 열 제목이 반복되는지 확인. `window.print()` 는 모달이라 자동화로 확인 불가 |

### 🟡 P1 — Sprint-2 착수 시

| 항목 | 참조 |
|---|---|
| 자바 백엔드 + MyBatis | §5 |
| SQLite → Oracle 전환 | F0 §3.3 |
| 로그인·권한 | 현재는 검사자/발행자를 목록에서 고름 (D34) |
| `MST_USER` 테이블 | 지금은 Mock 고정 목록 (D34) |
| 발행이력 조회 화면 | **지금은 발행 직후에만** 그 성적서를 볼 수 있다 (D30) |
| CoA 취소 (`CANCELED`) | 권한 체계 전제라 보류 (D10 / F3 §4.0) |
| F5~F8 (작업지시·Lot 추적) | master-plan Phase 2 |

### 🟢 P2 — 있으면 좋음

| 항목 | 메모 |
|---|---|
| `vue-router` 도입 | URL 공유·뒤로가기가 실제로 필요해지는 시점에 |
| F1 §4 V8 코드 분리 | `SORT_NO_DUPLICATED` 가 "누락"과 "중복"에 같이 쓰임 — D42 와 같은 문제. **설계서를 고쳐야 함** |
| E2E 테스트 | 지금은 단위 테스트만 |

### ⚪ 미해결 (원인 불명)

| 항목 | 상태 |
|---|---|
| F2 화면에서 Lot 이 저절로 바뀐 현상 (1회) | **재현 실패.** 브라우저 자동화 도구의 stale 참조로 추정하되 **확증 없음.** 애플리케이션 코드는 건드리지 않았다 |

---

## 7. 🕳️ 함정 목록 — 반드시 읽을 것

이 프로젝트에서 **실제로 겪은** 것들이다. 넷 다 *"에러도 안 나고 빌드도 통과하는데 화면만 틀린"* 종류다.

| # | 함정 | 증상 | 교훈 |
|---|---|---|---|
| ① | **존재하지 않는 슬롯** — 설계서가 `QSelect` 의 `#popup-content` 를 지정했는데 그런 슬롯이 없음 | Vue 가 **조용히 무시**. 드롭다운만 안 열림 | 라이브러리 API 는 **문서 말고 소스에서** 확인 |
| ② | **RealGrid2 라이선스** — 키가 없으면 "평가판"이 아니라 **`LicenseError` 예외** | `onMounted` 중단 → **배너도 없이 "총 0건"** | 초기화는 **try/catch 로 감싸 실패를 화면에** |
| ③ | **`setFields()` 미선언 키** — RealGrid2 가 `setRows()` 때 **말없이 버림** | `styleCallback` 에서 판정값이 `undefined` → 색칠 안 됨 | 넘긴 데이터가 **정말 들어갔는지** 확인 |
| ④ | **저장 행을 그대로 응답** — `{...row}` 로 계약에 없는 키가 새어나감 | M4 게이트가 잡음 | **나갈 키를 명시적으로 고른다** |

### 환경 함정

| # | 함정 |
|---|---|
| ⑤ | Windows 가 TCP **5113~5212** 예약 → 5180~5183 대 `EACCES` |
| ⑥ | `.env.local` 없으면 F4 만 죽음 (F1~F3 는 정상이라 눈치채기 어려움) |
| ⑦ | Mock 은 **메모리**다. 새로고침하면 `mock/*.json` 으로 되돌아감 |

### 이 프로젝트의 규칙

```
빌드 통과   ≠  정상 동작
콘솔 깨끗   ≠  정상 동작
테스트 통과  ≠  화면 정상
```

**만들었으면 반드시 브라우저에서 눌러본다.** 위 4개 함정 모두 *"눌러보니 이상하다"* 로만 발견됐다.
그리고 **눌러본 결과를 문서에 반영한다** — 설계서가 틀렸던 경우가 이 프로젝트에서만 4번 있었다.

---

## 8. 설계 결정 이력 (D1~D44)

설계서 곳곳에 `(D27)` 같은 번호가 박혀 있다. **"왜 이렇게 했지?"** 싶을 때 그 번호로 `docs/02-design/` 를 검색하면 이유가 나온다. 코드 주석에도 같은 번호가 있다.

### 특히 중요한 것 12개

| # | 결정 | 어디 |
|---|---|---|
| **D1** | 판정 하나에 `NONE`/`PASS`/`FAIL`. 저장되는 건 `PASS`/`FAIL` 뿐, `NONE` 은 서버가 합성 | F2 §9.2 |
| **D3** | 성적서 `No.` 는 `sortNo` 가 아니라 **1부터 조밀 재부여**(`printSeq`) | F3 §3.0 |
| **D21** | F2 저장에서 **빈 배열 거부** — 검사실적은 지우면 복구 경로가 없다 | F2 §9.3 |
| **D23** | `LOT_NOT_INSPECTABLE` **삭제** — 4개 상태 전부 검사 허용. 오입력 정정 경로를 막지 않기 위해 | F2 §9.3 |
| **D27** | 비활성(`useYn='N'`) 검사항목: **화면엔 보이되 판정에선 제외** | F2 §9.2 |
| **D29** | `INTERNAL_ERROR` 는 **전역 암묵 코드** — 각 §9 에 열거하지 않는 게 정상 | F0 §8.1.1 |
| **D30** | F3 §9.4 재조회는 **발행 직후에만** 도달 가능 (발행이력 화면이 Sprint-2) | F3 §9.4 |
| **D32** | **CoA 본문은 `USE_YN='Y'` 만** — 안 그러면 `PASS` 헤더 아래 `FAIL` 줄이 인쇄됨 | F3 §9.2 |
| **D34** | 인증이 범위 밖인데 사용자 ID 가 필수 → **`user-list` API 만** 먼저 신설 | F0 §9.3 |
| **D37** | 실적이 있는 검사항목은 **삭제 대신 `USE_YN='N'`** (soft delete) | F1 §3.1 |
| **D41** | F2 Lot 목록은 **4개 상태 전부** — 안 그러면 재검사 진입 경로가 막힘 | F2 §9.1 |
| **D43** | RealGrid2 라이선스 없으면 **예외**. "평가판 동작" 아님 | F0 §7 |

> 총 38건(D1~D44 중 결번 제외). 전체는 `docs/02-design/*.md` 에서 `D숫자` 로 검색.

### 문서 읽는 요령

- 각 설계서의 **§9 API Contract** 만 봐도 그 화면이 서버와 뭘 주고받는지 다 나온다
- 인용부호(`>`)로 된 문단은 전부 **"왜 이렇게 했는가"** 다. **코드만 봐선 절대 알 수 없는 것들**이라 거기부터 읽는 게 빠르다
- 각 문서 맨 아래 **Version History** 에 무엇이 언제 왜 바뀌었는지 있다

---

## 9. 문서 지도

> **학습 문서는 전부 [`학습/`](학습/00-어디부터-볼까.md) 폴더로 옮겼다.**
> 목차와 상황별 안내는 **[`학습/00-어디부터-볼까.md`](학습/00-어디부터-볼까.md)** 를 본다.

### 프로젝트 문서 (여기)

| 문서 | 줄 | 언제 보나 |
|---|---:|---|
| **`HANDOFF.md`** | — | **이 문서.** 이어받을 때 |
| `01-plan/features/mes-coa.master-plan.md` | 237 | 전체 계획·범위·진행 로그 |
| `01-plan/features/F0~F4.plan.md` | 197~278 | 기능별 **무엇을** 만들지 |
| `02-design/F0~F4.design.md` | 391~631 | 기능별 **어떻게** — 코드의 근거 전부 |
| `02-design/mes-coa-s1.data-model.md` | 440 | 테이블 9개 구조 |

### 학습 문서 (`학습/`)

| 문서 | 언제 보나 |
|---|---|
| **`00-어디부터-볼까.md`** | ⭐ **목차.** 상황별로 어느 문서를 열지 |
| `10-결과물부터-거꾸로-일하는법.md` | **현업에 처음 투입됐을 때** — 출력물부터 거꾸로. Day 0~3 |
| `11-현업에게-물어볼-질문표.md` | 현업 미팅 직전 — **실제 양식** (16칸 + 빈 양식) |
| `12-화면값이-어느-테이블인지-찾기.md` | **물어볼 사람이 없을 때** — 화면 값 → 테이블 5단계 |
| `13-역추적-실습기록-8왕복에서-1왕복.md` | 연습할 때 — **판단 기준 7개 · 가공 7종 · VSCode 3종** |
| `20-왜-나누는가-안다는건-묶이는것.md` | *"왜 파일이 이렇게 많아?"* — 정보 은닉, 1972 Parnas |
| `21-같이-바뀌는것끼리-모은다.md` | **나눌지 말지 판단이 안 설 때** |
| `22-화면에-남는것-나가는것.md` | 화면에서 로직 뺄 때 — 업무 로직 vs 화면 로직 |
| `23-파일쪼개기-실습-5단계.md` | 나누기를 손으로 해볼 때 — `src/practice/split/` |
| `30-이-프로젝트가-뭐하는건가.md` | **"이거 고쳐주세요" 요청이 왔을 때** — 어느 파일을 여는지 |
| `31-용어사전-생활예제.md` | **용어가 낯설 때** — 생활 예제로 |
| `32-화면-눌러보기-대본.md` | **프로그램을 처음 써볼 때** — 현업 4명 역할 대본 |
| `33-압축된-상태문장-읽는법.md` | **상태 문장이 안 읽힐 때** — 압축된 한 줄 해부 |
| `40-새프로젝트-시작-프롬프트.md` | **새 프로젝트 시작할 때 통째로 붙여넣는 프롬프트** |
| `41-bkit-sprint-도구노트.md` | bkit 도구 사용 기록 |

---

## 10. 다음 세션 재개 체크리스트

```
□ pnpm install                       (의존성)
□ .env.local 존재 확인               (없으면 F4 죽음)
□ pnpm test                          (66건 통과해야 정상)
□ pnpm build                         (에러 0건)
□ pnpm dev → 브라우저에서 탭 5개 클릭  (실제로 뜨는지)
□ docs/HANDOFF.md §6 남은 작업 확인
```

### 스프린트 상태 (bkit)

```
sprint: mes-coa-s1  phase=do  status=active  trust=L2
gates : M4 100/95 ✅   M8 86/85 ✅   M3 0/0 ✅
        S2 featureCompletion 0/100 ❌  ← featureMap 을 갱신하지 않아 0으로 남아 있음
        S4 archiveReadiness  false     ← qa/report/archive 미진행
```

> **S2 가 0인 것은 기능이 안 됐다는 뜻이 아니다.** 기능은 5/5 완성이고, bkit 의 `featureMap` completion 값을 수동 갱신하지 않아 초기값이 남아 있는 것이다. `qa` → `report` → `archive` phase 를 밟으면 정리된다.

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-05 | 최초 작성 — Sprint-1 `do` 완료, M4 100% 통과 시점 |
