---
template: design
version: 1.0
feature: F0-common-core
sprint: mes-coa-s1
date: 2026-09-04
author: 주영준(준)
status: Draft
plan: docs/01-plan/features/F0-common-core.plan.md
---

# F0 공통 뼈대 — Design

> **Plan**: `docs/01-plan/features/F0-common-core.plan.md`
> **데이터 모델**: `docs/02-design/mes-coa-s1.data-model.md` (여기서 중복 정의하지 않음)

---

## Context Anchor (Plan에서 전파)

| Key | Value |
|-----|-------|
| **WHY** | F1~F4의 공통 선행조건. 개별 구현 시 4중 중복 + 불일치 |
| **WHO** | 개발자(준) — 기반 계층 |
| **RISK** | 여기 규약이 틀리면 F1~F4 전부 재작업 |
| **SUCCESS** | Mock에서 `/api/common/dept-list` → `CodeSelect` 에 `[0000] 개발부` 2열 렌더 |

---

## 1. Overview

서버 → 화면 데이터 통로를 만들고, 그 통로를 쓰는 공통 콤보 3종을 제공한다.

---

## 2. 기술 스택 (참조 프로젝트 검증분 채택)

`cdp2/crudGrid` 에서 이미 동작하는 조합을 그대로 쓴다. 새 버전을 고르지 않는다.

| 구분 | 선택 | 버전 |
|------|------|------|
| Frontend | Vue 3 `script setup` | 3.5.41 |
| UI | Quasar | 2.25.0 |
| 그리드 | RealGrid2 | 2.10.0 (F4에서 사용) |
| 빌드 | Vite + `@quasar/vite-plugin` | 8.2.1 / 2.0.0 |
| 테스트 | Vitest | 4.x |
| Backend | Spring Boot + MyBatis | — |

> **근거**: 버전 조합 검증에 드는 시간이 0이다. Quasar CLI 대신 Vite 플러그인 방식도 그대로 따른다.

---

## 3. 백엔드 레이어 구조

```
Controller          CamelMap 그대로 반환. ResponseEntity 없음
    │
    ▼
Service (interface) ← DB·SQL 을 전혀 모른다. 여기가 격리막
    │
    ├── MockServiceImpl      @Profile("mock")     ← Sprint-1
    └── MyBatisServiceImpl   @Profile("mybatis")  ← SQLite/Oracle
              │
              ▼
          Mapper (interface) + Mapper XML (DB별)
```

**격리막이 Service 인터페이스인 이유**: Controller가 Mapper를 직접 부르면 Mock 구현체를 끼울 자리가 없다. 인터페이스 하나를 두면 구현체 교체만으로 3단계 전환이 끝난다 (Plan FR-03·FR-10).

### 3.1 `CamelMap`

```java
// 스네이크 컬럼(DEPT_CD)을 카멜 키(deptCd)로 자동 변환하는 Map.
// 이게 없으면 화면에서 응답 키를 다시 매핑해야 하고, DTO를 만들게 된다.
public class CamelMap extends ListOrderedMap<String, Object> {
    @Override
    public Object put(String key, Object value) {
        return super.put(toCamel(key), value);   // 넣을 때 변환 — 꺼낼 때가 아님
    }
    private static String toCamel(String key) { /* DEPT_CD -> deptCd */ }
}
```

**넣을 때 변환하는 이유**: 꺼낼 때 변환하면 `map.get("deptCd")` 와 `map.get("DEPT_CD")` 가 둘 다 통해서, 어느 쪽이 정답인지 모호해진다. 저장 시점에 한 번만 정규화한다.

### 3.2 MyBatis 설정

| 설정 | 값 | 이유 |
|------|-----|------|
| `mapUnderscoreToCamelCase` | `true` | 1차 방어 |
| `defaultMapType` | `CamelMap` | 모든 조회 결과가 `CamelMap` 으로 나온다 |
| TypeAlias | `camelMap` | Mapper XML `resultType="camelMap"` |
| `callSettersOnNulls` | `true` | **NULL 컬럼이 키 자체를 생략하지 않게** 한다 |

> `callSettersOnNulls` 를 켜지 않으면 값이 NULL인 컬럼은 응답 JSON에서 **키가 통째로 사라진다.** 화면에서 `undefined` 참조 오류가 난다.

### 3.3 Profile 스위칭

```yaml
# application.yml
spring:
  profiles:
    active: mock        # mock | mybatis-sqlite | mybatis-oracle
```

| Profile | Service 구현체 | Mapper XML |
|---------|--------------|-----------|
| `mock` | `*MockServiceImpl` | 없음 |
| `mybatis-sqlite` | `*ServiceImpl` | `mapper/sqlite/*.xml` |
| `mybatis-oracle` | `*ServiceImpl` | `mapper/oracle/*.xml` |

DB 방언 차이(`SYSDATE` vs `datetime('now')`)는 **Mapper XML 디렉터리 분리**로 흡수한다. Java 코드에는 방언이 없다.

---

## 4. 프론트 구조

```
src/
├─ api/
│  ├─ http.js              Axios 인스턴스 (baseURL, 에러 처리)
│  └─ common.js            fetchDeptList() 등 API 함수
├─ components/
│  ├─ CodeSelect.vue       코드+명칭 2열 단일선택
│  ├─ MultiCheckCombo.vue  체크박스 다중선택
│  └─ MultiTreeCombo.vue   트리 다중선택
├─ mock/                   Mock JSON (백엔드 Mock과 별개 — 프론트 단독 개발용)
└─ pages/
```

### 4.1 Axios 공통 클라이언트

```js
// 모든 조회가 POST 인 이유: 조회 조건이 배열/객체로 커질 때 URL 길이 제한에 걸리지 않는다.
export const http = axios.create({ baseURL: '/api', timeout: 10000 })

export const post = async (url, params = {}) => {
  const { data } = await http.post(url, params)
  return data          // CamelMap 그대로. 래핑하지 않는다
}
```

**응답을 래핑하지 않는 이유**: `{ success, data, message }` 로 감싸면 화면마다 `res.data.data` 를 벗겨야 하고, 백엔드에도 래퍼 객체가 생겨 No-DTO 원칙이 깨진다. HTTP 상태코드로 성공/실패를 표현한다.

---

## 5. `CodeSelect.vue` 계약

### 5.1 Props

| prop | 타입 | 필수 | 기본 | 설명 |
|------|------|:---:|------|------|
| `modelValue` | `String\|Number\|null` | ● | — | 선택된 **코드값** |
| `options` | `Array<Object>` | ● | `[]` | 서버 응답 배열 그대로 |
| `codeKey` | `String` | ● | — | 코드 키 이름 (`deptCd`) |
| `nameKey` | `String` | ● | — | 명칭 키 이름 (`deptNm`) |
| `firstOption` | `String\|null` | | `null` | `'all'` 이면 맨 앞에 "전체" 추가 |
| `dense` | `Boolean` | | `false` | Quasar 통과 |
| `disable` | `Boolean` | | `false` | Quasar 통과 |

**`codeKey`/`nameKey` 를 prop으로 받는 이유** (Plan FR-06c): 이 값을 컴포넌트 안에 고정하면 부서 전용이 된다. 공정(`procCd`/`procNm`)·품목(`itemCd`/`itemNm`)에 재사용할 수 없다.

### 5.2 Emits

| event | payload | 설명 |
|-------|---------|------|
| `update:modelValue` | 코드값 | `v-model` |
| `select` | 선택된 **객체 전체** | 명칭도 필요할 때 |

`select` 이벤트가 필요한 이유: `v-model` 은 코드만 준다. 화면에서 명칭을 함께 저장해야 할 때(예: F3 발행 이력) 목록을 다시 뒤지지 않아도 되게 한다.

### 5.3 렌더 구조

```vue
<q-select
  :model-value="modelValue" :options="mergedOptions"
  :option-value="codeKey" :option-label="nameKey"
  emit-value map-options
>
  <!-- 드롭다운 각 행: 코드 배지 + 명칭 (Plan FR-06) -->
  <template #option="scope">
    <q-item v-bind="scope.itemProps">
      <q-item-section side>
        <q-badge outline color="grey-7">{{ scope.opt[codeKey] }}</q-badge>
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ scope.opt[nameKey] }}</q-item-label>
      </q-item-section>
    </q-item>
  </template>

  <!-- 선택 바: 명칭(굵게) | 코드(배지) (Plan FR-06b) -->
  <template #selected-item="scope">
    <span class="text-weight-medium">{{ scope.opt[nameKey] }}</span>
    <q-badge outline color="grey-7" class="q-ml-sm">{{ scope.opt[codeKey] }}</q-badge>
  </template>
</q-select>
```

`emit-value` + `map-options` 조합이 핵심이다. 이게 없으면 `v-model` 에 객체 전체가 들어가고, 화면 상태가 서버 응답 객체와 얽힌다.

### 5.4 나머지 2종

| 컴포넌트 | 기반 | 차이 |
|---------|------|------|
| `MultiCheckCombo` | `q-select` `multiple` `use-chips` | `#option` 슬롯에 `q-checkbox`. `modelValue` 는 코드 **배열** |
| `MultiTreeCombo` | `q-field` `#control` 안에 `q-menu` + `q-tree` | `node-key`=코드, `tick-strategy="leaf"`. 결과는 칩 배열 |

`CodeSelect` 와 `MultiCheckCombo` 는 `codeKey`/`nameKey` prop 규약을 공유한다. **`MultiTreeCombo` 만 예외다** — 트리 노드는 `api/common.js` 의 `toTree()` 가 `{ label, code, children }` 로 조립해 넣어주므로 키 이름이 그 시점에 흡수된다.

> **`q-select` 를 쓰지 않는 이유 (2026-09-05 do 단계 구현 중 발견)**: 초안은 `q-select` 의 `#popup-content` 슬롯에 `q-tree` 를 넣는 방식이었다. 그런데 **Quasar 2.25 `QSelect` 에 `popup-content` 슬롯은 존재하지 않는다** — 공식 슬롯은 `selected`·`loading`·`before-options`·`after-options`·`no-option`·`selected-item`·`option` 7개뿐이고, `popupContentClass`/`popupContentStyle` 는 **prop** 이라 이름만 비슷하다. **없는 슬롯에 넘긴 템플릿은 Vue 가 조용히 무시한다** — 콘솔 에러도, 빌드 실패도 없이 드롭다운만 열리지 않았다. `q-field` 의 `#control` 안에 `q-menu` 를 앉히면 QMenu 가 부모 엘리먼트를 앵커로 잡아 클릭에 반응하므로, 별도 open 상태 관리도 필요 없다.
>
> 이 부류는 **M4(계약 정합성) 게이트로는 잡히지 않는다.** API 계약이 아니라 UI 라이브러리의 실제 표면에 관한 사실이라, 만들어서 눌러봐야 드러난다.

---

## 6. Mock 데이터 전략

백엔드 Mock(`@Profile("mock")`)이 **단일 진실**이다. 프론트 `src/mock/` JSON은 백엔드 없이 화면만 볼 때 쓰는 보조 수단이며, **키 집합이 백엔드 Mock과 같아야 한다.**

Mock 데이터는 SQLite 전환 시 `INSERT` seed 로 재사용한다 (Plan §8).

---

## 7. 보안 — 라이선스 키 취급

RealGrid2는 F4에서 쓰지만, 주입 지점은 F0의 `main.js` 다.

```js
const LICENSE = import.meta.env.VITE_REALGRID_LICENSE
if (LICENSE) RealGrid.setLicenseKey(LICENSE)
else console.warn('[mes] VITE_REALGRID_LICENSE 없음 — F4 그리드가 뜨지 않는다')
```

> ⚠️ **키가 없으면 "평가판"으로도 안 돈다 (D43, 2026-09-05 F4 구현 중 발견)**: 초안은 "그리드가 평가판으로 동작"이라고 적었으나 **사실이 아니다.** RealGrid2 2.10 은 `new GridView(...)` 시점에 `LicenseError: No license or invalid license` 를 **던진다.** F4 화면의 `onMounted` 가 통째로 중단되고, 잡지 않으면 **에러 배너조차 없이 "총 0건"만 보여** 데이터가 없는 것처럼 읽힌다. 그래서 F4 는 `buildGrid()` 를 try/catch 로 감싸 실패를 화면에 노출한다.
>
> **설치 시 필수 절차**: `.env.example` 을 `.env.local` 로 복사하고 키를 넣는다. `.env.local` 은 `.gitignore` 에 있으므로 저장소에 올라가지 않는다.

| 파일 | 내용 | git |
|------|------|-----|
| `.env.local` | 실제 키 | **`.gitignore`** |
| `.env.example` | `VITE_REALGRID_LICENSE=` (빈 값) | 커밋 |

키 값은 소스·문서·로그 어디에도 남기지 않는다.

---

## 8. 에러 처리

| 계층 | 방식 |
|------|------|
| Controller | 예외를 잡지 않는다. `@RestControllerAdvice` 가 일괄 처리 |
| 프론트 | Axios 인터셉터가 `errorMessage` 를 Quasar Notify로 표시 |

### 8.1 HTTP 상태 매핑 (D8)

| 상황 | 상태 | 예 |
|------|:----:|-----|
| 파라미터/값 검증 실패 | **400** | `VALIDATION_FAILED`, `PERIOD_TOO_LONG` |
| 대상 리소스 없음 | **400** | `LOT_NOT_FOUND`, `COA_NOT_FOUND` |
| 업무 규칙 위반 | **400** | `LOT_NOT_ISSUABLE` |
| 서버 오류 | **500** | `INTERNAL_ERROR` |

**정상 응답은 항상 `200`** 이며 본문은 §4.1대로 래핑하지 않는다. `201`·`204` 를 쓰지 않는다 — 모든 API가 POST이고 생성/조회를 상태코드로 구분하지 않기 때문이다.

> **`*_NOT_FOUND` 를 404가 아닌 400으로 고정한다.** 모든 조회가 POST 라 URL이 리소스를 지시하지 않는다. 404는 "엔드포인트가 없다"는 뜻으로만 남긴다. 프론트가 상태코드로 분기할 필요 없이 `errorCode` 만 보면 된다.

### 8.1.1 에러코드 레지스트리 (스프린트 전역 — N19b)

> 에러코드가 5개 문서에 흩어져 있어 중복·오타를 막을 수단이 없었다. **여기가 단일 목록이다.**

| 코드 | HTTP | 소유 | 단위 | 조건 |
|------|:----:|------|:----:|------|
| `VALIDATION_FAILED` | 400 | F0 | 요청 | 행 단위 오류가 1건 이상 (`errors[]` 동반) |
| `INTERNAL_ERROR` | 500 | F0 | 요청 | 서버 오류. **전 엔드포인트 공통 — 각 feature §9 에러 표에 개별 열거하지 않는다** (D29) |
| `ITEM_REQUIRED` | 400 | F1 | 요청 | `itemCd` 누락 |
| `INSP_ITEM_REQUIRED` | 400 | F1 | 행 | `inspItemCd` 누락 (V2 — D42) |
| `INSP_ITEM_DUPLICATED` | 400 | **F1·F2** | 행 | F1: 같은 품목 내 검사항목 중복 / F2: 한 요청 `resultList` 내 `inspItemCd` 중복 |
| `INSP_NAME_REQUIRED` | 400 | F1 | 행 | 검사항목명 누락 |
| `INVALID_JUDGE_TYPE` | 400 | F1 | 행 | `judgeType` 이 3종 밖 |
| `SPEC_RANGE_INVALID` | 400 | F1 | 행 | `RANGE` 인데 `lsl > usl` 또는 누락 |
| `SPEC_MAX_INVALID` | 400 | F1 | 행 | `MAX` 인데 `usl` 누락 또는 `lsl` 존재 |
| `SPEC_MIN_INVALID` | 400 | F1 | 행 | `MIN` 인데 `lsl` 누락 또는 `usl` 존재 |
| `SORT_NO_DUPLICATED` | 400 | F1 | 행 | 같은 품목 내 `sortNo` 중복 |
| `INVALID_DECIMAL_LEN` | 400 | F1 | 행 | `decimalLen` 이 0~6 밖 |
| `SPEC_LIST_REQUIRED` | 400 | F1 | 요청 | `specList` 자체가 누락 (빈 배열 `[]` 은 전건 삭제로 정상 처리) |
| `LOT_NOT_FOUND` | 400 | F2·F3 | 요청 | 존재하지 않는 Lot. **`lotNo` 누락도 이 코드로 흡수** |
| `SPEC_NOT_DEFINED` | 400 | F2 | 요청 | 해당 품목에 Spec 미등록 |
| `RESULT_LIST_REQUIRED` | 400 | F2 | 요청 | `resultList` 누락 **또는 빈 배열 `[]`**. F1 `SPEC_LIST_REQUIRED` 와 달리 빈 배열도 거부 — F2 design §9.3 D21 |
| `INVALID_INSP_ITEM` | 400 | F2 | 행 | 그 품목 Spec에 없는 검사항목 **또는 `USE_YN='N'` 인 비활성 항목** (F2 design §9.3 D33) |
| `MEASURED_VAL_REQUIRED` | 400 | F2 | 행 | `measuredVal` 이 null |
| `INSP_USER_REQUIRED` | 400 | F2 | 요청 | `inspUserId` 누락 |
| `LOT_NOT_ISSUABLE` | 400 | F3 | 요청 | `LOT_STATUS != 'OK'` |
| `SHIP_QTY_EXCEEDS_GOOD_QTY` | 400 | F3 | 요청 | 출하수량 > 양품수량 |
| `CUST_NM_REQUIRED` | 400 | F3 | 요청 | 고객사명 누락 |
| `SHIP_QTY_REQUIRED` | 400 | F3 | 요청 | `shipQty` 누락 |
| `ISSUE_USER_REQUIRED` | 400 | F3 | 요청 | `issueUserId` 누락 |
| `COA_NOT_FOUND` | 400 | F3 | 요청 | 존재하지 않는 성적서 번호. **`coaNo` 누락도 이 코드로 흡수** |
| `PERIOD_REQUIRED` | 400 | **F3·F4** | 요청 | `fromDt` 또는 `toDt` 누락 (양쪽 다 필수 ●) |
| `PERIOD_REVERSED` | 400 | F3·F4 | 요청 | `fromDt > toDt` |
| `PERIOD_TOO_LONG` | 400 | F3·F4 | 요청 | 92일 초과 |
| `TOO_MANY_ROWS` | 400 | F4 | 요청 | **`detailList`** 10,000행 초과 (피벗 셀 원천 기준 — F4 design §7 D24). `lotList` 기준 아님 |

**신규 코드는 반드시 이 표에 먼저 등록한다.** 소유 feature가 §9에서 중복 선언하는 것은 허용하되, 값이 어긋나면 이 표가 우선한다.

> **전역 암묵 코드 (D29)**: `INTERNAL_ERROR`(500)는 `GlobalExceptionHandler` 가 처리하는 **모든 엔드포인트 공통 코드**다. 각 feature §9의 에러 표는 **그 엔드포인트 고유의 400대 코드만** 나열하며 500은 열거하지 않는다. 따라서 이 코드가 §9 어디에도 등장하지 않는 것이 **정상**이며, "미사용 코드"가 아니다. "에러: 없음"으로 표기된 조회 API(§9.1·§9.2, F1 design §9.1·§9.2, F2 design §9.1)도 500은 낼 수 있다 — 그 표기는 **400대 검증 오류가 없다**는 뜻이다.

### 8.2 에러 응답 스키마 (D6)

| 키 | 타입 | 필수 | 설명 |
|----|------|:---:|------|
| `errorCode` | String | ● | 에러 식별자 |
| `errorMessage` | String | ● | 사용자 표시 메시지 |
| `errors` | Array | | **행 단위 검증 실패 시에만 존재.** 목록 저장 API(F1 §9.3 등) 전용 |
| `└ rowIndex` | Number | ● | **요청 배열의 0-base 인덱스.** 행 식별의 단일 기준 |
| `└ sortNo` | Number | | 보조 표시용. **식별자로 쓰지 않는다** |
| `└ field` | String | ● | 오류 필드명 |
| `└ code` | String | ● | 행 단위 에러코드 |
| `└ message` | String | ● | 행 단위 메시지 |

`errors` 는 **선택 키**다. 이 스키마의 소유자는 F0의 `GlobalExceptionHandler` 다.

> **보조 표시 키 확장 규칙 (R7)**: `rowIndex`·`field`·`code`·`message` 4종은 **필수**이며 이름·의미를 바꿀 수 없다. 그 외 `sortNo` 는 위 표의 **정식 선택 키**이므로 별도 선언 없이 쓸 수 있다. 그 밖의 보조 표시 키(`inspItemCd` 등)는 **해당 feature가 자신의 §9 계약에 명시적으로 선언한 것에 한해** 추가할 수 있다. 보조 키는 사용자 표시용이며, **행 식별에는 언제나 `rowIndex` 만 쓴다.**

> **행 식별을 `rowIndex` 로 하는 이유 (N6)**: `sortNo` 로 행을 가리키면 **`sortNo` 자체가 중복인 오류**(F1 §4 V8)에서 어느 행인지 특정할 수 없다. 요청 배열의 인덱스는 항상 유일하므로 식별자로 안전하다. `sortNo` 는 사용자에게 보여줄 보조 정보로만 싣는다.

에러 응답만 이 형태를 갖는다. **정상 응답은 래핑 없음** (§4.1).

---

## 9. API Contract

### 9.1 `POST /api/common/dept-list` — 부서 목록

**Request**
```json
{ "useYn": "Y" }
```

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `useYn` | String | | `'Y'` 이면 사용중만. 생략 시 전체 |

**Response** — `List<CamelMap>`
```json
[
  { "deptCd": "0000", "deptNm": "개발부",     "parentDeptCd": null, "sortNo": 1, "useYn": "Y" },
  { "deptCd": "0100", "deptNm": "개발1팀",   "parentDeptCd": "0000", "sortNo": 2, "useYn": "Y" }
]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `deptCd` | String | N | `MST_DEPT.DEPT_CD` | 부서코드 |
| `deptNm` | String | N | `MST_DEPT.DEPT_NM` | 부서명 |
| `parentDeptCd` | String | **Y** | `MST_DEPT.PARENT_DEPT_CD` | 최상위는 null |
| `sortNo` | Number | N | `MST_DEPT.SORT_NO` | 정렬순서 |
| `useYn` | String | N | `MST_DEPT.USE_YN` | `Y`/`N` |

**에러**: 없음. 결과 0건은 빈 배열 `[]`.

### 9.2 `POST /api/common/process-tree` — 공정 트리

**Request**
```json
{ "useYn": "Y" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `useYn` | String | | `'Y'` 이면 사용중만. 생략 시 전체 |

**Response** — `List<CamelMap>` **평면 배열**. 트리 조립은 화면이 한다.
```json
[
  { "procCd": "P100", "procNm": "가공", "parentProcCd": null,   "sortNo": 1, "useYn": "Y" },
  { "procCd": "P110", "procNm": "절삭", "parentProcCd": "P100", "sortNo": 2, "useYn": "Y" }
]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `procCd` | String | N | `MST_PROCESS.PROC_CD` | 공정코드 |
| `procNm` | String | N | `MST_PROCESS.PROC_NM` | 공정명 |
| `parentProcCd` | String | **Y** | `MST_PROCESS.PARENT_PROC_CD` | 최상위는 null |
| `sortNo` | Number | N | `MST_PROCESS.SORT_NO` | 정렬순서 |
| `useYn` | String | N | `MST_PROCESS.USE_YN` | `Y`/`N` |

**에러**: 없음. 결과 0건은 빈 배열 `[]`.

> 서버가 중첩 구조를 만들지 않는 이유: 트리는 **화면의 표현 방식**이다. 서버가 중첩을 만들면 목록으로 쓰려는 다른 화면이 다시 평탄화해야 한다.

### 9.3 `POST /api/common/user-list` — 사용자 목록 (D34)

**Request**
```json
{ "useYn": "Y" }
```
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|:---:|------|
| `useYn` | String | | `'Y'` 이면 사용중만. 생략 시 전체 |

**Response** — `List<CamelMap>`
```json
[
  { "userId": "user01", "userNm": "홍길동", "deptCd": "0100", "deptNm": "개발1팀", "useYn": "Y" },
  { "userId": "user02", "userNm": "김철수", "deptCd": "0100", "deptNm": "개발1팀", "useYn": "Y" }
]
```

| 키 | 타입 | Null | 원천 | 설명 |
|----|------|:----:|------|------|
| `userId` | String | N | **Mock 고정 목록** (Sprint-1) | `TRN_INSP_RESULT.INSP_USER_ID` · `TRN_COA.ISSUE_USER_ID` 에 저장되는 값 |
| `userNm` | String | N | **Mock 고정 목록** | 사용자명. 화면 표시용 |
| `deptCd` | String | **Y** | **Mock 고정 목록** | 부서코드. §9.1 `dept-list` 와 같은 도메인 |
| `deptNm` | String | **Y** | **Mock 고정 목록** | 부서명 |
| `useYn` | String | N | **Mock 고정 목록** | `Y`/`N` |

**에러**: 없음. 결과 0건은 빈 배열 `[]`.

> **`MST_USER` 테이블을 만들지 않는 이유 (D34)**: 인증·세션은 Sprint-1 Out of Scope다(F0 plan §2.2). 그런데 F2 design §9.3 `inspUserId`(검사자, F2 Plan FR-09)와 F3 design §9.3 `issueUserId`(발행자, F3 Plan FR-09)는 **필수(●)** 라, 값을 만들 수단이 없으면 두 저장 API가 **구현 불가 상태**가 된다. 그래서 **읽기 전용 목록 API만** 먼저 연다. Sprint-1은 `MockCommonServiceImpl` 의 고정 목록을 반환하고, 영속 테이블 `MST_USER` 와 로그인은 **Sprint-2**에서 붙인다. 그때 이 계약의 응답 키는 그대로 두고 **원천만 Mock → 테이블**로 바뀐다 — §3.3 Profile 스위칭이 그걸 위해 있다.

> **전용 컴포넌트를 만들지 않는다**: 화면은 §5 `CodeSelect` 에 `codeKey="userId"` `nameKey="userNm"` 을 넘겨 그대로 쓴다. §5.1이 코드/명칭 키를 prop으로 받는 이유가 정확히 이 재사용을 위해서다(FR-06c). `UserSelect.vue` 를 따로 만들면 같은 규약의 **네 번째 사본**이 생긴다.

### 9.4 공통 에러 응답 (스키마 §8.2)

요청 단위 오류 — HTTP 400. **`errors[]` 없음** (§8.1.1 요청 단위 코드)
```json
{ "errorCode": "ITEM_REQUIRED", "errorMessage": "품목코드는 필수입니다." }
```
> F0 자신의 §9.1·§9.2는 에러가 없다(결과 0건 = 빈 배열). 위는 F1 §9.2의 요청 단위 오류를 예시로 든 것이다.

행 단위 오류 — HTTP 400, `errors` 포함 (F1 §9.3 등 목록 저장 API)
```json
{
  "errorCode": "VALIDATION_FAILED",
  "errorMessage": "검증에 실패했습니다.",
  "errors": [ { "rowIndex": 1, "sortNo": 2, "field": "usl", "code": "SPEC_RANGE_INVALID", "message": "상한은 하한보다 크거나 같아야 합니다." } ]
}
```

---

## 10. 산출 파일 목록

**Backend**

| 파일 | 역할 |
|------|------|
| `common/CamelMap.java` | §3.1 |
| `config/MyBatisConfig.java` | §3.2 |
| `common/controller/CommonController.java` | §9.1·9.2 |
| `common/service/CommonService.java` | 인터페이스 |
| `common/service/CommonMockServiceImpl.java` | `@Profile("mock")` |
| `common/service/CommonServiceImpl.java` | `@Profile("mybatis*")` |
| `common/mapper/CommonMapper.java` | 인터페이스 |
| `mapper/sqlite/CommonMapper.xml` | SQLite 방언 (§3.3) |
| `mapper/oracle/CommonMapper.xml` | Oracle 방언 (§3.3) |
| `common/code/WoStatus.java` | `WAIT`/`RUN`/`DONE`/`STOP` — data-model §4.4. Sprint-1 미소비 |
| `common/code/YnFlag.java` | `Y`/`N` — data-model §4.4 |
| `common/GlobalExceptionHandler.java` | §8 · §8.2 에러 스키마 소유 |

**Frontend**

| 파일 | 역할 |
|------|------|
| `src/main.js` | Quasar + RealGrid 라이선스 §7 |
| `src/api/http.js` | §4.1 |
| `src/api/common.js` | API 함수 |
| `src/components/CodeSelect.vue` | §5 |
| `src/components/MultiCheckCombo.vue` | §5.4 |
| `src/components/MultiTreeCombo.vue` | §5.4 |
| `src/pages/DevSandboxPage.vue` | 콤보 3종 검증 화면 |

**DDL** — `MST_DEPT` / `MST_PROCESS` / `TRN_WORK_ORDER` (data-model §3.1·3.2·3.5)

---

## 11. Plan 요구사항 → 설계 매핑

| FR | 반영 위치 |
|----|----------|
| FR-01 스네이크→카멜 | §3.1 `CamelMap`, §3.2 설정 |
| FR-02 `ResponseEntity` 없음 | §9 응답 형태 |
| FR-03 Profile 스위칭 | §3.3 |
| FR-04 Mock 무DB 응답 | §3.3, §6 |
| FR-05 변환 없이 바인딩 | §5.1 `options` prop |
| FR-06 드롭다운 2열 | §5.3 `#option` 슬롯 |
| FR-06b 선택 바 2열 | §5.3 `#selected-item` 슬롯 |
| FR-06c 키 이름 prop | §5.1 `codeKey`/`nameKey` |
| FR-07 멀티체크 | §5.4 |
| FR-08 멀티트리 | §5.4 |
| FR-09 조회도 POST | §4.1, §9 |
| FR-10 인터페이스 불변 | §3 레이어 구조 |

> **§9.3 `user-list` 는 Plan FR에 없는 Design 단계 추가분이다 (D34)**. F2 Plan FR-09(검사자 기록)와 F3 Plan FR-09(발행자)를 만족시키려면 값의 출처가 필요한데, 그 출처가 **F0 공통 영역**에 있어야 두 feature가 각자 만들지 않는다. Plan 갱신 없이 Design에서 신설한 유일한 엔드포인트다.

---

## 12. 테스트 계획

| 레벨 | 대상 | 방법 |
|------|------|------|
| L1 단위 | `CamelMap.toCamel()` | `DEPT_CD`→`deptCd`, `A_B_C`→`aBC`, 이미 카멜인 키 |
| L2 통합 | `/api/common/dept-list` (mock) | 응답 키 집합 + 결합 문자열 부재 |
| L2 통합 | `/api/common/user-list` (mock) | 고정 목록 반환, `userId`·`userNm` 키 존재 |
| L3 화면 | `CodeSelect` | 드롭다운 2열 렌더, `procCd`/`procNm` 재사용 |

---

## 13. 미결정 사항

없음. F0의 모든 결정이 확정되었다.

---

## 14. 설계 자가진단 체크리스트

- [x] Plan의 모든 FR이 설계 요소로 매핑되었다 (§11 — FR-01~FR-10 전건)
- [x] API 계약이 Request/Response 키·타입·Null 여부까지 명시되었다 (§9)
- [x] 데이터 모델을 중복 정의하지 않고 참조했다 (data-model §3)
- [x] 레이어 경계가 명시되고 의존 방향이 단방향이다 (§3 — Controller→Service→Mapper)
- [x] 3단계 DB 전환 시 변경되지 않는 지점이 특정되었다 (§3 Service 인터페이스, §3.3 Mapper XML 분리)
- [x] 컴포넌트 props/emits 계약이 타입·필수 여부와 함께 확정되었다 (§5.1·5.2)
- [x] 재사용성 요구(FR-06c)가 구조로 보장된다 (§5.1 `codeKey`/`nameKey`)
- [x] 에러 처리 방식이 계층별로 정의되었다 (§8)
- [x] 보안 요구(라이선스 키)가 설계에 반영되었다 (§7)
- [x] 산출 파일 목록이 열거되었다 (§10)
- [x] 테스트 가능 지점이 식별되었다 (§12)
- [x] Sprint-1 범위에서 값을 만들 수 없는 필수 파라미터가 남지 않았다 (§9.3 `user-list` — F2·F3 §9.3 사용자 ID의 생산자)
- [x] 미결정 사항이 명시적으로 처리되었다 (§13 — 없음)
- [x] 설계 결정마다 근거가 기록되었다 (§3.1 넣을 때 변환 / §4.1 래핑 안 함 / §9.2 평면 반환)

---

## Version History

| 버전 | 일자 | 변경 |
|------|------|------|
| 0.1 | 2026-09-04 | 최초 작성. 스택을 crudGrid 검증분으로 확정 |
| 0.2 | 2026-09-04 | M4 지적 반영 — D5 §9.2 응답 키 표, D6 `errors[]` 스키마 소유 선언, D8 HTTP 상태 매핑, D17 요청 파라미터 표 |
| 0.3 | 2026-09-04 | M4 재측정 반영 — N6 `errors[].rowIndex` 를 행 식별 단일 기준으로 확정 (`sortNo` 중복 시 식별 불가 해소) |
| 0.4 | 2026-09-04 | M4 4차 반영 — 에러코드 레지스트리 신설(§8.1.1). 5개 문서 분산 해소 |
| 0.5 | 2026-09-04 | M4 5차 반영 — R6 `INSP_ITEM_DUPLICATED` 소유 F1·F2 병기, R7 `errors[]` 보조 키 확장 규칙, R8 §9.3 예시 요청 단위로 정정, R10 제목/도입문 정정, 필수 파라미터 코드 5종 신설, 성공 상태코드 200 명시 |
| 0.6 | 2026-09-04 | M4 6차 반영 — `LOT_NOT_FOUND` 에 `lotNo` 누락 흡수, `SPEC_LIST_REQUIRED` 신설(29종), R7 규칙문의 `sortNo` 이중 지위 해소 |
| 0.7 | 2026-09-05 | M4 12차 반영 — `PERIOD_REQUIRED` 소유 F3 합류(D1), `RESULT_LIST_REQUIRED` 신설(D2), `LOT_NOT_INSPECTABLE` 삭제(D3), `TOO_MANY_ROWS` 기준을 `detailList` 로 확정(D4) |
| 0.8 | 2026-09-05 | M4 13차 반영 — D29 `INTERNAL_ERROR` 를 전역 암묵 코드로 선언(§9 미열거가 정상임을 명시), F1 D28에 따라 `INVALID_YN_FLAG` 삭제 → 레지스트리 28종 |
| 0.9 | 2026-09-05 | M4 14차 반영 — `INVALID_INSP_ITEM` 조건을 F2 D33 과 동기(비활성 항목 포함). 레지스트리 28종 유지 |
| 1.0 | 2026-09-05 | M4 15차 반영 — **D34 §9.3 `user-list` 신설**(F2·F3 §9.3 사용자 ID의 생산자 확보. `MST_USER` 는 Sprint-2, 컴포넌트는 §5 `CodeSelect` 재사용). 기존 공통 에러 응답 §9.3 → §9.4. §11·§12·§14 반영 |
| 1.1 | 2026-09-05 | do 단계 구현 반영 — §5.4 `MultiTreeCombo` 구현 수단을 `q-select #popup-content`(존재하지 않는 슬롯) → **`q-field #control` + `q-menu`** 로 정정. `codeKey`/`nameKey` 규약 공유 범위도 2종으로 정정 |
| 1.2 | 2026-09-05 | do 단계 구현 반영 — **D42 `INSP_ITEM_REQUIRED` 신설**(누락과 중복을 다른 코드로 분리, V3 와 대칭 → 레지스트리 29종), **D43 §7 라이선스 문구 정정**(키 없으면 평가판이 아니라 `LicenseError` 예외 — F4 화면이 조용히 죽는다) |
