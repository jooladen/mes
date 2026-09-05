/**
 * 가짜 서버 — 나중에 붙일 axios 와 **같은 모양**으로 응답한다.
 *
 * F0 design §4.1 — 응답을 래핑하지 않는다.
 *   `{ success, data, message }` 로 감싸면 화면마다 `res.data.data` 를 벗겨야 하고,
 *   백엔드에도 래퍼 객체가 생겨 No-DTO 원칙이 깨진다.
 *   성공/실패는 HTTP 상태코드로 표현하고, 본문은 CamelMap 그대로 돌려준다.
 *
 * 그래서 이 파일의 `post()` 는 **본문만** 반환한다. 실패는 throw 로 알린다.
 *
 * ── 자바를 붙일 때 ──────────────────────────────────────────────
 *   이 파일 내부만 아래로 바꾸면 된다. `common.js` 와 화면 코드는 손대지 않는다.
 *
 *     const http = axios.create({ baseURL: '', timeout: 10000 })
 *     export const post = async (url, params = {}) => (await http.post(url, params)).data
 *
 *   §4.1 스니펫은 `baseURL: '/api'` 지만, 여기서는 경로 상수를 §9 계약과
 *   **글자 그대로 같게**(`/api/common/dept-list`) 두는 쪽을 택했다.
 *   문서에서 grep 한 경로가 코드에서 그대로 찾아져야 추적이 끊기지 않는다.
 *   대신 baseURL 은 빈 문자열이 된다.
 */
import deptList from '@/mock/dept.json'
import processTree from '@/mock/process.json'
import userList from '@/mock/user.json'
import itemList from '@/mock/item.json'
import specSeed from '@/mock/spec.json'
import lotSeed from '@/mock/lot.json'
import inspResultSeed from '@/mock/inspResult.json'
import { validateSpecList } from './specValidator'
// F2 design §2 — 서버 재판정. 실제 시스템에서는 Java `SpecJudge` 다.
// Mock 단계에서는 화면과 같은 파일을 공유한다 (specJudgeClient.js 머리말 참조).
import { judge, total, nextLotStatus, JUDGE_RESULT } from '@/utils/specJudgeClient'

// 사람이 "로딩이 있었다"고 느낄 만큼만. 없으면 비동기 분기를 눈으로 못 본다.
const MOCK_DELAY_MS = 140

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// mock 원본을 화면이 직접 들고 가면 편집이 원본을 오염시킨다. 항상 복제해서 내보낸다.
const clone = (value) => structuredClone(value)

/**
 * F0 design §8.2 에러 응답 스키마를 담은 예외.
 * 실제 서버 전환 시 axios interceptor 가 이 모양으로 다시 던지면 화면은 그대로다.
 */
export class ApiError extends Error {
  constructor(errorCode, errorMessage, errors = null) {
    super(errorMessage)
    this.name = 'ApiError'
    this.errorCode = errorCode
    this.errorMessage = errorMessage
    // §8.2 — `errors` 는 선택 키다. 행 단위 오류가 있을 때만 실린다.
    if (errors) this.errors = errors
  }
}

/**
 * `useYn === 'Y'` 필터. 세 공통 API가 같은 규약을 쓴다 (§9.1·9.2·9.3).
 * 파라미터를 생략하면 전체를 준다.
 */
function filterByUseYn(rows, params) {
  const useYn = params && params.useYn
  if (!useYn) return rows
  return rows.filter((row) => row.useYn === useYn)
}

/**
 * 서버가 들고 있는 Spec 테이블. Mock 은 메모리다 (F1 design §5 `MockServiceImpl` — 메모리 List).
 * seed 를 복제해 두고, §9.3 저장이 이걸 바꾼다. 새로고침하면 seed 로 돌아간다.
 */
const specTable = structuredClone(specSeed)

/** 서버가 들고 있는 Lot / 검사실적 테이블. Mock 은 메모리다 (F2 design §6). */
const lotTable = structuredClone(lotSeed)
const inspTable = structuredClone(inspResultSeed)

/** 채번. 실제로는 시퀀스다 (data-model §3.7 `INSP_SEQ` 자동 채번). */
let inspSeqNext = Math.max(...inspTable.map((r) => r.inspSeq)) + 1

/**
 * F1 design §3.1 (D37) — 이 검사항목에 실적이 하나라도 있으면 Spec 을 **지우지 않고**
 * `USE_YN='N'` 으로 비활성화한다. 무조건 delete 하면 `TRN_INSP_RESULT` 가 고아가 되고
 * `TRN_LOT.TOTAL_JUDGE` 는 근거 없이 남는다.
 */
function hasInspResult(itemCd, inspItemCd) {
  const lotNos = lotTable.filter((l) => l.itemCd === itemCd).map((l) => l.lotNo)
  return inspTable.some(
    (r) => r.inspItemCd === inspItemCd && lotNos.includes(r.lotNo)
  )
}

/** 그 Lot 의 최신 실적만 (`LATEST_YN='Y'`) — F2 design §4 */
const latestResults = (lotNo) =>
  inspTable.filter((r) => r.lotNo === lotNo && r.latestYn === 'Y')

/**
 * 그 품목의 **활성** Spec 을 `sortNo` 순으로 (F1 §9.2 D39 와 같은 규칙).
 * 판정·성적서는 이 집합만 본다 — 비활성 항목은 `totalJudge` 계산에서 제외된다(D27).
 */
const activeSpecs = (itemCd) =>
  specTable
    .filter((s) => s.itemCd === itemCd && s.useYn === 'Y')
    .sort((a, b) => a.sortNo - b.sortNo)

/**
 * F2 §9.2 `inspList` 의 대상 Spec — **활성 전건 + 실적이 있는 비활성 항목** (D27).
 *
 * 활성만 담으면 F1 §3.1(D37)이 soft delete 한 항목의 **측정값이 화면에서 통째로
 * 사라진다.** 과거에 실제로 잰 값을 감추면 F3 발행 스냅샷과 화면이 어긋난다.
 * 비활성 항목은 `useYn='N'` 으로 내려가 화면이 읽기 전용으로 렌더하고,
 * `totalJudge` 계산에서는 제외된다(그래서 판정은 `activeSpecs` 를 쓴다).
 */
function inspectableSpecs(itemCd, lotNo) {
  const measured = new Set(latestResults(lotNo).map((r) => r.inspItemCd))
  return specTable
    .filter((s) => s.itemCd === itemCd)
    .filter((s) => s.useYn === 'Y' || measured.has(s.inspItemCd))
    .sort((a, b) => a.sortNo - b.sortNo)
}

/**
 * 발행 이력 — **seed 가 없다.** 발행해야 생긴다.
 * `TRN_COA` / `TRN_COA_DETAIL` 은 INSERT 전용이고(F3 design §4), Sprint-1 에는
 * 취소 API 자체가 없다(§4.0). 그래서 미리 채워둘 "과거 발행분"이 없는 게 정상이다.
 */
const coaTable = []
const coaDetailTable = []

/**
 * F3 §4.1 채번 — `CoA-YYYYMMDD-NNN`. 당일 최대 일련번호 + 1, 3자리 zero-fill.
 * 실제 서버는 `TRN_COA.COA_NO` UNIQUE 제약 + 재시도로 동시 발행 충돌을 처리한다.
 */
function nextCoaNo(now) {
  const ymd = now.slice(0, 10).replace(/-/g, '')
  const prefix = `CoA-${ymd}-`
  const maxSeq = coaTable
    .filter((c) => c.coaNo.startsWith(prefix))
    .reduce((m, c) => Math.max(m, Number(c.coaNo.slice(prefix.length))), 0)
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

/**
 * 성적서 본문 조립 — F3 design §9.2 `detailList`
 *
 * 두 가지가 여기서 결정된다:
 *  1. **D32 필터** — `LATEST_YN='Y'` AND `MST_INSP_SPEC.USE_YN='Y'`.
 *     비활성 항목의 실적은 `totalJudge` 계산에서 제외된 값이라, 본문에 실으면
 *     `PASS` 헤더 아래 `FAIL` 줄이 인쇄된다.
 *  2. **D3 `printSeq`** — `sortNo` 오름차순으로 정렬한 뒤 **1부터 조밀하게 재부여**.
 *     `sortNo` 는 항목 삭제·중간 삽입으로 sparse 해질 수 있다(1,2,5,9).
 *     성적서 `No.` 열에 `1,2,5,9` 가 찍히면 "3번과 4번은 어디 갔나"라는 질문을 받는다.
 */
function buildCoaDetail(lot) {
  const specs = activeSpecs(lot.itemCd) // useYn='Y' 만, sortNo 순
  const results = latestResults(lot.lotNo) // latestYn='Y' 만
  let printSeq = 0
  return specs
    .map((s) => {
      const r = results.find((x) => x.inspItemCd === s.inspItemCd)
      if (!r) return null // 실적이 없는 항목은 성적서에 실리지 않는다
      return {
        printSeq: ++printSeq, // ← 조밀 재부여 (D3)
        sortNo: s.sortNo, // 정렬 원본. printSeq 추적용
        inspItemCd: s.inspItemCd,
        inspItemNm: s.inspItemNm,
        unitCd: s.unitCd,
        judgeType: s.judgeType,
        lsl: s.lsl,
        usl: s.usl,
        decimalLen: s.decimalLen,
        measuredVal: r.measuredVal,
        judgeResult: r.judgeResult
      }
    })
    .filter(Boolean)
}

/**
 * 발행분 응답 정형화 — F3 design §9.3 응답 키 표
 *
 * **저장 형태와 응답 형태는 다르다.** `TRN_COA` 는 `CUST_CD` 를 갖지만
 * Sprint-1 은 항상 null 이고 data-model §3.8 이 **"Sprint-1 미노출"** 로 못박았다.
 * `TRN_COA_DETAIL` 은 조인 키로 `COA_NO` 를 갖지만 그건 **헤더 레벨 키**라
 * 원소마다 반복하면 안 된다(data-model §3.9). `sortNo` 도 §9.2(발행 전) 전용이다.
 *
 * 저장 행을 그대로 돌려주면 계약에 없는 키가 새어나간다 — 실제로 그랬다(2026-09-05 M4).
 */
function toCoaResponse(header, details) {
  return {
    coaNo: header.coaNo,
    lotNo: header.lotNo,
    itemCd: header.itemCd,
    itemNm: header.itemNm,
    itemUnitCd: itemOf(header.itemCd)?.itemUnitCd ?? null, // 조인 (§9.3·§9.4 공통)
    custNm: header.custNm,
    shipQty: header.shipQty,
    totalJudge: header.totalJudge,
    issueDt: header.issueDt,
    issueUserId: header.issueUserId,
    coaStatus: header.coaStatus,
    detailList: details
      .slice()
      .sort((a, b) => a.printSeq - b.printSeq)
      .map((d) => ({
        printSeq: d.printSeq,
        inspItemCd: d.inspItemCd,
        inspItemNm: d.inspItemNm,
        unitCd: d.unitCd,
        judgeType: d.judgeType,
        lsl: d.lsl,
        usl: d.usl,
        decimalLen: d.decimalLen,
        measuredVal: d.measuredVal,
        judgeResult: d.judgeResult
      }))
  }
}

const findLot = (lotNo) => lotTable.find((l) => l.lotNo === lotNo)
const itemOf = (itemCd) => itemList.find((i) => i.itemCd === itemCd) ?? null
const itemNmOf = (itemCd) => itemOf(itemCd)?.itemNm ?? null
const procNmOf = (procCd) =>
  procCd ? (processTree.find((p) => p.procCd === procCd)?.procNm ?? null) : null

// 경로 문자열은 서버를 아는 이 계층이 소유한다. 화면은 `common.js`/`quality.js` 함수만 안다.
const HANDLERS = {
  // §9.1 — 부서 목록. 평면 배열
  '/api/common/dept-list': (params) => filterByUseYn(clone(deptList), params),

  // §9.2 — 공정 트리. **평면 배열로 준다.** 트리 조립은 화면 몫이다
  '/api/common/process-tree': (params) => filterByUseYn(clone(processTree), params),

  // §9.3 — 사용자 목록 (D34). Sprint-1 은 Mock 고정 목록, MST_USER 는 Sprint-2
  '/api/common/user-list': (params) => filterByUseYn(clone(userList), params),

  // ── F1 quality-spec ────────────────────────────────────────────────
  // F1 §9.1 — 품목 목록
  '/api/quality/item-list': (params) => filterByUseYn(clone(itemList), params),

  // F1 §9.2 — Spec 조회. `useYn='Y'` 만 (D39), `sortNo` 오름차순
  //   `itemCd` 생략 = 전 품목 (D40). 편집이 아니라 훑어보기용이다.
  '/api/quality/spec-list': (params) => {
    const itemCd = params && params.itemCd

    const rows = clone(specTable).filter(
      (row) => row.useYn === 'Y' && (!itemCd || row.itemCd === itemCd)
    )

    // 전 품목일 때는 품목끼리 섞이면 못 읽는다. 품목 → 순번 순으로 정렬한다.
    return rows.sort(
      (a, b) => (a.itemCd < b.itemCd ? -1 : a.itemCd > b.itemCd ? 1 : a.sortNo - b.sortNo)
    )
  },

  // F1 §9.3 — Spec 일괄 저장 (전체 목록 delete-insert + D37 soft delete)
  '/api/quality/spec-save': (params) => {
    const itemCd = params && params.itemCd
    const specList = params && params.specList

    if (!itemCd) throw new ApiError('ITEM_REQUIRED', '품목을 선택하세요.')
    // 빈 배열 `[]` 은 전건 삭제로 **정상 처리**한다. 누락만 오류다 (F0 design §8.1.1)
    if (!Array.isArray(specList)) {
      throw new ApiError('SPEC_LIST_REQUIRED', '검사항목 목록이 없습니다.')
    }

    const errors = validateSpecList(specList)
    if (errors.length) {
      throw new ApiError('VALIDATION_FAILED', '검증에 실패했습니다.', errors)
    }

    // ① 이 품목의 기존 행을 걷어낸다 — 단 D37 예외를 적용한다
    const kept = []
    for (const row of specTable) {
      if (row.itemCd !== itemCd) continue
      const stillListed = specList.some((s) => s.inspItemCd === row.inspItemCd)
      if (stillListed) continue // 새로 insert 되므로 버린다
      if (hasInspResult(itemCd, row.inspItemCd)) {
        kept.push({ ...row, useYn: 'N' }) // D37 — 실적이 있으면 지우지 않고 비활성화
      }
      // 실적이 없으면 그냥 사라진다 (delete)
    }

    // ② 이 품목의 행을 통째로 교체
    const others = specTable.filter((row) => row.itemCd !== itemCd)
    const inserted = specList.map((s) => ({
      itemCd,
      inspItemCd: s.inspItemCd,
      inspItemNm: s.inspItemNm,
      unitCd: s.unitCd ?? null,
      judgeType: s.judgeType,
      lsl: s.lsl === '' || s.lsl === undefined ? null : s.lsl,
      usl: s.usl === '' || s.usl === undefined ? null : s.usl,
      // D28 — 요청이 두 키를 받지 않는다. 서버가 고정값으로 넣는다
      targetVal: null,
      decimalLen: Number(s.decimalLen),
      sortNo: Number(s.sortNo),
      useYn: 'Y'
    }))

    specTable.length = 0
    specTable.push(...others, ...inserted, ...kept)

    return { itemCd, savedCount: inserted.length }
  },

  // ── F2 inspection-result ───────────────────────────────────────────
  // F2 §9.1 — 검사 대상 Lot 목록. **4개 상태 전부** 반환한다 (D41)
  '/api/quality/lot-list': () =>
    clone(lotTable).map((lot) => ({
      lotNo: lot.lotNo,
      itemCd: lot.itemCd,
      itemNm: itemNmOf(lot.itemCd),
      procCd: lot.procCd,
      procNm: procNmOf(lot.procCd),
      goodQty: lot.goodQty,
      scrapQty: lot.scrapQty,
      lotStatus: lot.lotStatus,
      totalJudge: lot.totalJudge,
      judgeDt: lot.judgeDt
    })),

  // F2 §9.2 — Lot 검사항목 + 기존 실적. Spec 과 실적을 **한 번에** 반환한다.
  //   두 번 호출하면 화면이 두 응답을 조립해야 하고, 그 사이 Spec 이 바뀌면 어긋난다.
  '/api/quality/inspect-list': (params) => {
    const lotNo = params && params.lotNo
    // `lotNo` 누락도 이 코드로 흡수한다 (F0 design §8.1.1)
    const lot = lotNo ? findLot(lotNo) : null
    if (!lot) throw new ApiError('LOT_NOT_FOUND', '존재하지 않는 Lot 입니다.')

    // D27 — 활성 전건 + **실적이 있는 비활성 항목**. 활성만 보면 soft delete 된
    //   항목의 측정값이 사라지고, 전부 비활성인 Lot 은 아예 열 수 없게 된다.
    const specs = inspectableSpecs(lot.itemCd, lotNo)
    if (specs.length === 0) {
      throw new ApiError('SPEC_NOT_DEFINED', '해당 품목에 검사규격이 등록되지 않았습니다.')
    }

    const results = latestResults(lotNo)

    return {
      lotNo: lot.lotNo,
      itemCd: lot.itemCd,
      itemNm: itemNmOf(lot.itemCd),
      lotStatus: lot.lotStatus,
      totalJudge: lot.totalJudge,
      // **Spec 전건** (실적 유무 무관), `sortNo` 순 — 실적 없는 항목은 서버가 NONE 을 합성한다 (D1)
      inspList: specs.map((s) => {
        const r = results.find((x) => x.inspItemCd === s.inspItemCd) ?? null
        return {
          inspItemCd: s.inspItemCd,
          inspItemNm: s.inspItemNm,
          unitCd: s.unitCd,
          judgeType: s.judgeType,
          lsl: s.lsl,
          usl: s.usl,
          decimalLen: s.decimalLen,
          sortNo: s.sortNo,
          useYn: s.useYn,
          inspSeq: r ? r.inspSeq : null,
          measuredVal: r ? r.measuredVal : null,
          judgeResult: r ? r.judgeResult : JUDGE_RESULT.NONE,
          inspDt: r ? r.inspDt : null,
          inspUserId: r ? r.inspUserId : null,
          remark: r ? r.remark : null
        }
      })
    }
  },

  // F2 §9.3 — 검사 실적 저장 + 서버 재판정. §7 트랜잭션 순서를 그대로 따른다.
  '/api/quality/inspect-save': (params) => {
    const lotNo = params && params.lotNo
    const inspUserId = params && params.inspUserId
    const resultList = params && params.resultList

    const lot = lotNo ? findLot(lotNo) : null
    if (!lot) throw new ApiError('LOT_NOT_FOUND', '존재하지 않는 Lot 입니다.')

    const specs = activeSpecs(lot.itemCd)
    if (specs.length === 0) {
      throw new ApiError('SPEC_NOT_DEFINED', '해당 품목에 검사규격이 등록되지 않았습니다.')
    }
    // D21 — 빈 배열 `[]` 도 거부한다. 검사실적은 지우면 복구 경로가 없다
    if (!Array.isArray(resultList) || resultList.length === 0) {
      throw new ApiError('RESULT_LIST_REQUIRED', '입력한 검사값이 없습니다.')
    }
    if (!inspUserId) throw new ApiError('INSP_USER_REQUIRED', '검사자를 선택하세요.')

    // 행 단위 검증 — 최상위는 항상 VALIDATION_FAILED (F0 design §8.2)
    const errors = []
    const seen = new Set()
    resultList.forEach((row, i) => {
      const spec = specs.find((s) => s.inspItemCd === row.inspItemCd)
      if (!spec) {
        // D33 — Spec 에 없거나 **비활성**인 항목
        errors.push({
          rowIndex: i, inspItemCd: row.inspItemCd, field: 'inspItemCd',
          code: 'INVALID_INSP_ITEM', message: '해당 품목의 검사항목이 아닙니다.'
        })
        return
      }
      if (row.measuredVal === null || row.measuredVal === undefined || row.measuredVal === '') {
        errors.push({
          rowIndex: i, inspItemCd: row.inspItemCd, field: 'measuredVal',
          code: 'MEASURED_VAL_REQUIRED', message: '측정값이 비어 있습니다.'
        })
      }
      if (seen.has(row.inspItemCd)) {
        errors.push({
          rowIndex: i, inspItemCd: row.inspItemCd, field: 'inspItemCd',
          code: 'INSP_ITEM_DUPLICATED', message: '같은 검사항목이 두 번 들어왔습니다.'
        })
      }
      seen.add(row.inspItemCd)
    })
    if (errors.length) {
      throw new ApiError('VALIDATION_FAILED', '검증에 실패했습니다.', errors)
    }

    const now = new Date().toISOString().slice(0, 19)

    // §7-1 — 대상 (lotNo, inspItemCd) 의 기존 행을 LATEST_YN='N' 으로 (§4)
    //   UPDATE 하지 않는 이유: 덮어쓰면 첫 측정값이 사라진다. 불합격→재측정→합격
    //   이력은 품질 추적의 핵심 정보다.
    for (const row of inspTable) {
      if (row.lotNo === lotNo && seen.has(row.inspItemCd)) row.latestYn = 'N'
    }

    // §7-2 — 신규 실적 INSERT. 판정은 **서버가 다시 계산한다** (§2)
    for (const row of resultList) {
      const spec = specs.find((s) => s.inspItemCd === row.inspItemCd)
      inspTable.push({
        inspSeq: inspSeqNext++,
        lotNo,
        inspItemCd: row.inspItemCd,
        measuredVal: Number(row.measuredVal),
        judgeResult: judge(row.measuredVal, spec.judgeType, spec.lsl, spec.usl),
        inspDt: now,
        inspUserId,
        latestYn: 'Y',
        remark: row.remark ?? null
      })
    }

    // §7-3 — 종합판정. **Spec 전건** 기준이다. 안 보낸 항목은 실적이 없으면 NONE 이다
    const latest = latestResults(lotNo)
    const perSpec = specs.map(
      (s) => latest.find((r) => r.inspItemCd === s.inspItemCd)?.judgeResult ?? JUDGE_RESULT.NONE
    )
    const totalJudge = total(perSpec)

    // §7-4 — TRN_LOT 갱신 (§1.4 상태 전이)
    lot.totalJudge = totalJudge
    lot.lotStatus = nextLotStatus(totalJudge)
    lot.judgeDt = totalJudge === JUDGE_RESULT.NONE ? null : now

    // 응답 resultList 는 **이번 저장분이 아니라 그 Lot 최신 실적 전체**다
    return {
      lotNo,
      lotStatus: lot.lotStatus,
      totalJudge: lot.totalJudge,
      judgeDt: lot.judgeDt,
      resultList: latestResults(lotNo).map((r) => ({
        inspItemCd: r.inspItemCd,
        inspSeq: r.inspSeq,
        measuredVal: r.measuredVal,
        judgeResult: r.judgeResult,
        // D22 — §9.2 `inspList[]` 와 대칭. 빼면 저장 직후 검사일시·검사자가 화면에서 사라진다
        inspDt: r.inspDt,
        inspUserId: r.inspUserId,
        remark: r.remark
      }))
    }
  },

  // ── F3 coa-print ───────────────────────────────────────────────────
  // F3 §9.1 — 발행 가능 Lot 목록. **`LOT_STATUS='OK'` 만** (§2 — 한 조건이다)
  '/api/quality/coa-target-list': (params) => {
    const { itemCd, fromDt, toDt } = params ?? {}
    // D1 — 기간은 양쪽 다 필수다. 생략을 허용하면 92일 상한이 영영 발동하지 않는다
    if (!fromDt || !toDt) throw new ApiError('PERIOD_REQUIRED', '조회 기간을 입력하세요.')
    if (fromDt > toDt) throw new ApiError('PERIOD_REVERSED', '시작일이 종료일보다 뒤입니다.')
    const days = (new Date(toDt) - new Date(fromDt)) / 86400000 + 1
    if (days > 92) throw new ApiError('PERIOD_TOO_LONG', '조회 기간은 최대 92일입니다.')

    return lotTable
      .filter((lot) => {
        if (lot.lotStatus !== 'OK') return false // §2 — 버튼 비활성이 아니라 목록에서 제외
        if (itemCd && lot.itemCd !== itemCd) return false
        // 기간 기준은 **판정일**이다 (F4 는 검사일 — 기준 컬럼이 다르다)
        const d = (lot.judgeDt ?? '').slice(0, 10)
        return d >= fromDt && d <= toDt
      })
      .map((lot) => ({
        lotNo: lot.lotNo,
        itemCd: lot.itemCd,
        itemNm: itemNmOf(lot.itemCd),
        goodQty: lot.goodQty,
        itemUnitCd: itemOf(lot.itemCd)?.itemUnitCd ?? null,
        totalJudge: lot.totalJudge,
        judgeDt: lot.judgeDt,
        // 기발행 건수. 0보다 크면 재발행이다 (§4.2)
        issuedCount: coaTable.filter((c) => c.lotNo === lot.lotNo).length
      }))
      .sort((a, b) => (a.judgeDt < b.judgeDt ? 1 : -1))
  },

  // F3 §9.2 — 미리보기 데이터 (발행 전). 아직 번호가 없다 (§1)
  '/api/quality/coa-print-data': (params) => {
    const lotNo = params && params.lotNo
    const lot = lotNo ? findLot(lotNo) : null
    if (!lot) throw new ApiError('LOT_NOT_FOUND', '존재하지 않는 Lot 입니다.')
    if (lot.lotStatus !== 'OK') {
      throw new ApiError('LOT_NOT_ISSUABLE', '합격 상태의 Lot 만 발행할 수 있습니다.')
    }

    const item = itemOf(lot.itemCd)
    return {
      lotNo: lot.lotNo,
      itemCd: lot.itemCd,
      itemNm: item?.itemNm ?? null,
      goodQty: lot.goodQty,
      itemUnitCd: item?.itemUnitCd ?? null,
      totalJudge: lot.totalJudge,
      detailList: buildCoaDetail(lot)
    }
  },

  // F3 §9.3 — 발행. §4 순서를 그대로 따른다
  '/api/quality/coa-issue': (params) => {
    const { lotNo, custNm, shipQty, issueUserId } = params ?? {}

    const lot = lotNo ? findLot(lotNo) : null
    if (!lot) throw new ApiError('LOT_NOT_FOUND', '존재하지 않는 Lot 입니다.')
    // §4-1 — 미리보기 이후 다른 사람이 재검사를 넣어 LOCKED 로 바뀌었을 수 있다
    if (lot.lotStatus !== 'OK') {
      throw new ApiError('LOT_NOT_ISSUABLE', '합격 상태의 Lot 만 발행할 수 있습니다.')
    }
    if (!custNm) throw new ApiError('CUST_NM_REQUIRED', '고객사명을 입력하세요.')
    if (shipQty === null || shipQty === undefined || shipQty === '') {
      throw new ApiError('SHIP_QTY_REQUIRED', '출하수량을 입력하세요.')
    }
    if (Number(shipQty) > lot.goodQty) {
      throw new ApiError('SHIP_QTY_EXCEEDS_GOOD_QTY', '출하수량이 양품수량보다 많습니다.')
    }
    if (!issueUserId) throw new ApiError('ISSUE_USER_REQUIRED', '발행자를 선택하세요.')

    const now = new Date().toISOString().slice(0, 19)
    const item = itemOf(lot.itemCd)

    // §4-2 채번 → §4-3 헤더 INSERT → §4-4 본문 INSERT (한 트랜잭션)
    const coaNo = nextCoaNo(now)
    const header = {
      coaNo,
      lotNo: lot.lotNo,
      itemCd: lot.itemCd,
      itemNm: item?.itemNm ?? null, // 발행시점 스냅샷 — 품목명이 나중에 바뀌어도 성적서는 그대로
      custCd: null, // Sprint-1 에서 NULL. Sprint-2 마스터 연계용 예약 컬럼 (§6)
      custNm,
      shipQty: Number(shipQty),
      totalJudge: lot.totalJudge,
      issueDt: now,
      issueUserId,
      coaStatus: 'ISSUED' // §4.0 — Sprint-1 은 CANCELED 가 발생하지 않는다
    }
    coaTable.push(header)

    // 저장 행에는 조인 키 `coaNo` 가 붙는다. **응답에는 안 붙는다** (§9.3 키 표)
    const details = buildCoaDetail(lot).map((d) => ({ coaNo, ...d }))
    coaDetailTable.push(...details)

    return toCoaResponse(header, details)
  },

  // ── F4 quality-pivot ───────────────────────────────────────────────
  // F4 §9.1 — 기간별 검사 실적 (**평면**). 피벗은 화면이 만든다 (§2)
  '/api/quality/inspect-history': (params) => {
    const { fromDt, toDt, itemCd, procCdList } = params ?? {}
    if (!fromDt || !toDt) throw new ApiError('PERIOD_REQUIRED', '조회 기간을 입력하세요.')
    if (fromDt > toDt) throw new ApiError('PERIOD_REVERSED', '시작일이 종료일보다 뒤입니다.')
    const days = (new Date(toDt) - new Date(fromDt)) / 86400000 + 1
    if (days > 92) throw new ApiError('PERIOD_TOO_LONG', '조회 기간은 최대 92일입니다.')

    // F3 는 판정일(TRN_LOT.JUDGE_DT) 기준, F4 는 **검사일**(TRN_INSP_RESULT.INSP_DT) 기준이다.
    // 상한 92일만 같고 기준 컬럼이 다르다.
    const inRange = (r) => {
      const d = (r.inspDt ?? '').slice(0, 10)
      return d >= fromDt && d <= toDt
    }

    const hits = inspTable.filter((r) => r.latestYn === 'Y' && inRange(r))
    const lotNos = [...new Set(hits.map((r) => r.lotNo))]

    const lots = lotTable
      .filter((l) => lotNos.includes(l.lotNo))
      .filter((l) => !itemCd || l.itemCd === itemCd)
      .filter((l) => !procCdList?.length || procCdList.includes(l.procCd))
      .sort((a, b) => (a.judgeDt ?? '') < (b.judgeDt ?? '') ? 1 : -1)

    const keptLotNos = new Set(lots.map((l) => l.lotNo))

    // D25 — goodQty·scrapQty·lotStatus 는 싣지 않는다. 피벗에 표시할 자리가 없다
    const lotList = lots.map((l) => ({
      lotNo: l.lotNo,
      itemCd: l.itemCd,
      itemNm: itemNmOf(l.itemCd),
      procCd: l.procCd,
      procNm: procNmOf(l.procCd),
      judgeDt: l.judgeDt,
      totalJudge: l.totalJudge
    }))

    // D27 — 이 조인은 **USE_YN 을 필터하지 않는다.** 실적 행이 주도하는 조인이라
    //   이미 측정된 값의 규격 표기를 잃지 않는 쪽이 맞다 (이력 조회 화면이므로).
    //   F3 §9.2 는 반대로 필터한다 — 증명서는 판정 근거만 실어야 하기 때문(D32).
    const detailList = hits
      .filter((r) => keptLotNos.has(r.lotNo))
      .map((r) => {
        const lot = findLot(r.lotNo)
        const spec = specTable.find(
          (s) => s.itemCd === lot.itemCd && s.inspItemCd === r.inspItemCd
        )
        if (!spec) return null
        return {
          lotNo: r.lotNo, // 여러 Lot 을 섞으므로 원소에 싣는다 (data-model §3.7 예외)
          inspItemCd: spec.inspItemCd,
          inspItemNm: spec.inspItemNm,
          unitCd: spec.unitCd,
          judgeType: spec.judgeType,
          lsl: spec.lsl,
          usl: spec.usl,
          decimalLen: spec.decimalLen,
          sortNo: spec.sortNo, // **동적 컬럼 순서** (§4 — printSeq 가 아니다, D3)
          measuredVal: r.measuredVal,
          judgeResult: r.judgeResult
        }
      })
      .filter(Boolean)

    // D24 — 상한은 `detailList` 기준이다. 브라우저가 감당하는 건 피벗 **셀 수**다
    if (detailList.length > 10000) {
      throw new ApiError('TOO_MANY_ROWS', '결과가 너무 많습니다. 조건을 좁혀 주세요.')
    }

    // totalCount 는 `lotList` 행 수 — 화면 "총 N건" 표시용. 상한과 기준이 다르다
    return { totalCount: lotList.length, lotList, detailList }
  },

  // F3 §9.4 — 발행분 재조회. §9.3 과 **완전히 같은 키 집합**
  '/api/quality/coa-view': (params) => {
    const coaNo = params && params.coaNo
    const header = coaNo ? coaTable.find((c) => c.coaNo === coaNo) : null
    // `coaNo` 누락도 이 코드로 흡수한다
    if (!header) throw new ApiError('COA_NOT_FOUND', '존재하지 않는 성적서 번호입니다.')

    // §9.3 과 **완전히 같은 키 집합**이어야 한다. 저장 행을 그대로 돌려주면
    //   `custCd`(미노출)와 원소별 `coaNo`·`sortNo` 가 새어나간다.
    return toCoaResponse(
      header,
      coaDetailTable.filter((d) => d.coaNo === coaNo)
    )
  }
}

/**
 * @param {string} url    §9 계약에 적힌 경로 그대로
 * @param {object} params 요청 본문
 * @returns {Promise<any>} 응답 본문 (래핑 없음)
 * @throws {ApiError} 400 계열
 */
export async function post(url, params = {}) {
  await sleep(MOCK_DELAY_MS)

  const handler = HANDLERS[url]
  if (!handler) {
    // 등록 안 된 경로를 조용히 빈 배열로 넘기면, 화면이 "데이터가 없네"로 오해한다.
    // 계약에 없는 호출은 시끄럽게 실패해야 한다.
    throw new ApiError('INTERNAL_ERROR', `Mock 에 등록되지 않은 API 입니다: ${url}`)
  }

  return handler(params)
}

export default { post }
