/**
 * 품질 도메인 API 함수 — F1 design §9.1·9.2·9.3
 *
 * F1 이 이 파일을 만들고, F2·F3·F4 가 각자 함수를 **추가**한다
 * (F2 design §10 / F3 design §10 — "F1 소유 · Fn 이 함수 추가").
 * 경로 상수는 §9 계약과 글자 그대로 같다.
 */
import { post } from './http'

export const QUALITY_API = {
  // F1
  ITEM_LIST: '/api/quality/item-list',
  SPEC_LIST: '/api/quality/spec-list',
  SPEC_SAVE: '/api/quality/spec-save',
  // F2
  LOT_LIST: '/api/quality/lot-list',
  INSPECT_LIST: '/api/quality/inspect-list',
  INSPECT_SAVE: '/api/quality/inspect-save',
  // F3
  COA_TARGET_LIST: '/api/quality/coa-target-list',
  COA_PRINT_DATA: '/api/quality/coa-print-data',
  COA_ISSUE: '/api/quality/coa-issue',
  COA_VIEW: '/api/quality/coa-view',
  // F4
  INSPECT_HISTORY: '/api/quality/inspect-history'
}

/** 판정방식 — data-model §4.1 `JudgeType` 소유. F2·F3·F4 가 소비한다. */
export const JUDGE_TYPE = {
  RANGE: 'RANGE',
  MAX: 'MAX',
  MIN: 'MIN'
}

export const JUDGE_TYPE_OPTIONS = [
  { value: JUDGE_TYPE.RANGE, label: '범위형' },
  { value: JUDGE_TYPE.MAX, label: '상한형' },
  { value: JUDGE_TYPE.MIN, label: '하한형' }
]

/**
 * F1 §9.1 품목 목록. F2·F3·F4 가 공유 소비한다 (D26).
 * @param {'Y'|'N'} [useYn] 생략 시 전체
 */
export const fetchItemList = (useYn) => post(QUALITY_API.ITEM_LIST, { useYn })

/**
 * F1 §9.2 Spec 조회 — `useYn='Y'` 만(D39), `sortNo` 오름차순.
 * @param {string|null} [itemCd] 생략·null 이면 **전 품목** (D40 — 조회 전용).
 *   저장(§9.3)은 `ITEM_CD` 단위 delete-insert 라 전 품목 편집이 성립하지 않는다.
 */
export const fetchSpecList = (itemCd) => post(QUALITY_API.SPEC_LIST, { itemCd })

/**
 * F1 §9.3 Spec 일괄 저장 — **전체 목록**을 보낸다. 행 단위 저장이 아니다 (§3).
 * 빈 배열은 전건 삭제로 정상 처리된다.
 * @param {string} itemCd
 * @param {Array} specList 화면 그리드 전체
 * @returns {Promise<{itemCd: string, savedCount: number}>}
 */
export const saveSpecList = (itemCd, specList) =>
  post(QUALITY_API.SPEC_SAVE, { itemCd, specList })

/**
 * 판정방식이 바뀌면 비활성 필드를 즉시 null 로 지운다 — F1 design §2.1.
 * 남겨두면 F2 가 "상한형인데 LSL 이 있네?"라는 모순 데이터를 만난다.
 *
 * @param {object} row 그리드 행 (제자리에서 수정한다)
 */
export function applyJudgeTypeRule(row) {
  if (row.judgeType === JUDGE_TYPE.MAX) row.lsl = null
  else if (row.judgeType === JUDGE_TYPE.MIN) row.usl = null
}

/** §2.1 — 이 판정방식에서 하한이 활성인가 */
export const isLslEnabled = (judgeType) => judgeType !== JUDGE_TYPE.MAX
/** §2.1 — 이 판정방식에서 상한이 활성인가 */
export const isUslEnabled = (judgeType) => judgeType !== JUDGE_TYPE.MIN

// ── F2 검사실적 (F2 design §9) ──────────────────────────────────────

/**
 * F2 §9.1 검사 대상 Lot 목록 — **요청 파라미터가 없다** (D35).
 * 4개 상태를 전부 반환한다 (D41) — `LOCKED` 재검사(§5)와 `OK` 오입력 정정(D23)이
 * 목록에서 Lot 을 고를 수 있어야 성립한다.
 */
export const fetchLotList = () => post(QUALITY_API.LOT_LIST, {})

/**
 * F2 §9.2 Lot 검사항목 + 기존 실적 — Spec 전건과 실적을 **한 번에** 받는다.
 * @param {string} lotNo
 */
export const fetchInspectList = (lotNo) => post(QUALITY_API.INSPECT_LIST, { lotNo })

/**
 * F2 §9.3 검사 실적 저장 + 서버 재판정.
 * @param {string} lotNo
 * @param {string} inspUserId 검사자 (Plan FR-09). §3 `검사자 ▼` 가 생산 (D36)
 * @param {Array<{inspItemCd, measuredVal, remark}>} resultList **입력한 항목만.**
 *   미입력 항목은 보내지 않는다. 빈 배열도 거부된다 (D21)
 */
export const saveInspectResult = (lotNo, inspUserId, resultList) =>
  post(QUALITY_API.INSPECT_SAVE, { lotNo, inspUserId, resultList })

// ── F3 CoA 발행 (F3 design §9) ──────────────────────────────────────

/**
 * F3 §9.1 발행 가능 Lot 목록 — `LOT_STATUS='OK'` 만 (§2).
 * @param {string} fromDt **필수** 판정일 시작 `YYYY-MM-DD` (D1)
 * @param {string} toDt   **필수** 판정일 종료. 최대 92일
 * @param {string|null} [itemCd] 품목 필터. 후보는 F1 §9.1 `item-list` (D26)
 */
export const fetchCoaTargetList = (fromDt, toDt, itemCd) =>
  post(QUALITY_API.COA_TARGET_LIST, { fromDt, toDt, itemCd })

/**
 * F3 §9.2 미리보기 데이터 — **아직 발행이 아니다.** `coaNo` 가 없다 (§1).
 * 미리보기만 하고 닫으면 번호가 낭비되고 이력에 유령 행이 남기 때문에 분리했다.
 */
export const fetchCoaPrintData = (lotNo) => post(QUALITY_API.COA_PRINT_DATA, { lotNo })

/**
 * F3 §9.3 발행 — 채번 + `TRN_COA`/`TRN_COA_DETAIL` 스냅샷 저장 (§4).
 * 응답이 곧 인쇄 대상이다. 발행 후에는 Spec·실적을 다시 보지 않는다 (§3).
 */
export const issueCoa = (lotNo, custNm, shipQty, issueUserId) =>
  post(QUALITY_API.COA_ISSUE, { lotNo, custNm, shipQty, issueUserId })

/**
 * F3 §9.4 발행분 재조회 — §9.3 과 완전히 같은 키 집합.
 * **Sprint-1 도달 경로는 §9.3 발행 응답의 `coaNo` 하나뿐이다** (D30).
 * 발행이력 목록 화면은 Sprint-2 다.
 */
export const fetchCoaView = (coaNo) => post(QUALITY_API.COA_VIEW, { coaNo })

// ── F4 품질피벗 (F4 design §9) ──────────────────────────────────────

/**
 * F4 §9.1 기간별 검사 실적 — **평면(flat)** 으로 받는다. 피벗은 화면이 만든다 (§2).
 *
 * 서버가 피벗을 만들면 응답 키가 데이터에 따라 달라지고(`인장강도: 452`),
 * 다른 화면에서 목록으로 쓰려면 다시 평탄화해야 한다.
 *
 * @param {string} fromDt **필수** `YYYY-MM-DD`. **검사일** 기준 (F3 는 판정일 — 기준이 다르다)
 * @param {string} toDt   **필수** 최대 92일
 * @param {string|null} [itemCd] 품목 필터
 * @param {string[]} [procCdList] 공정 다중선택
 * @returns {Promise<{totalCount:number, lotList:Array, detailList:Array}>}
 *   봉투 구조인 이유(D19): 리스트를 2개 반환해야 한다(행 원천 + 셀 원천).
 *   하나로 합치면 Lot 정보가 검사항목 수만큼 중복된다.
 */
export const fetchInspectHistory = (fromDt, toDt, itemCd, procCdList) =>
  post(QUALITY_API.INSPECT_HISTORY, { fromDt, toDt, itemCd, procCdList })
