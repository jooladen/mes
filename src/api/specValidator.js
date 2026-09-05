/**
 * Spec 검증 V1~V9 — F1 design §4
 *
 * ⚠️ 이 파일은 **가짜 서버의 일부**다. 화면(pages/)에서 import 하지 않는다.
 *    F1 design §4 는 "서버가 1차 방어선"이라고 못박았다. 화면이 같은 검증을 복제하면
 *    두 벌이 어긋나는 순간 어느 쪽이 진실인지 알 수 없게 된다.
 *    화면은 §9.3 이 돌려주는 `errors[]` 를 그리기만 한다.
 *
 * 자바가 붙으면 이 파일은 지우고 `SpecValidator`(순수 클래스, F1 design §5)만 남는다.
 * 지금은 그 클래스의 자리를 대신 지키는 중이다.
 *
 * 검증은 **전 행을 다 검사한 뒤** 오류를 모아 반환한다 (§4).
 * 첫 오류에서 중단하면 사용자가 저장을 5번 반복하게 된다.
 */

const JUDGE_TYPES = ['RANGE', 'MAX', 'MIN']
const DECIMAL_MIN = 0
const DECIMAL_MAX = 6

const isBlank = (v) => v === null || v === undefined || String(v).trim() === ''
const isNum = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))

/**
 * @param {Array} specList §9.3 요청의 specList
 * @returns {Array<{rowIndex, sortNo, field, code, message}>} 행 단위 오류. 없으면 []
 */
export function validateSpecList(specList) {
  const errors = []
  const seenInspItem = new Map() // inspItemCd -> 처음 나온 rowIndex
  const seenSortNo = new Map()

  const push = (rowIndex, field, code, message) =>
    errors.push({
      rowIndex,
      sortNo: specList[rowIndex]?.sortNo ?? null,
      field,
      code,
      message
    })

  specList.forEach((row, i) => {
    // V2 — inspItemCd 필수 + 같은 품목 내 중복 불가
    //   "누락"과 "중복"은 **다른 오류**라 코드를 나눈다 (D42).
    //   항목명(V3)이 `INSP_NAME_REQUIRED` 전용 코드를 쓰는 것과 대칭이다.
    if (isBlank(row.inspItemCd)) {
      push(i, 'inspItemCd', 'INSP_ITEM_REQUIRED', '항목코드는 필수입니다.')
    } else if (seenInspItem.has(row.inspItemCd)) {
      push(
        i,
        'inspItemCd',
        'INSP_ITEM_DUPLICATED',
        `항목코드가 중복입니다 (${seenInspItem.get(row.inspItemCd) + 1}행과 동일).`
      )
    } else {
      seenInspItem.set(row.inspItemCd, i)
    }

    // V3 — inspItemNm 필수
    if (isBlank(row.inspItemNm)) {
      push(i, 'inspItemNm', 'INSP_NAME_REQUIRED', '항목명은 필수입니다.')
    }

    // V4 — judgeType 은 3종 안
    if (!JUDGE_TYPES.includes(row.judgeType)) {
      push(i, 'judgeType', 'INVALID_JUDGE_TYPE', '판정방식이 올바르지 않습니다.')
    } else {
      // V5~V7 — 판정방식별 lsl/usl 규칙
      if (row.judgeType === 'RANGE') {
        if (!isNum(row.lsl) || !isNum(row.usl)) {
          push(i, 'usl', 'SPEC_RANGE_INVALID', '범위형은 하한·상한이 모두 필요합니다.')
        } else if (Number(row.lsl) > Number(row.usl)) {
          // §4 — 실제 서버는 BigDecimal.compareTo 로 비교한다 (double 비교는 400.1 <= 400.1 이
          // 거짓이 될 수 있다). JS 는 IEEE754 하나뿐이라 여기서는 그대로 비교한다.
          push(i, 'usl', 'SPEC_RANGE_INVALID', '상한은 하한보다 크거나 같아야 합니다.')
        }
      } else if (row.judgeType === 'MAX') {
        if (!isNum(row.usl)) {
          push(i, 'usl', 'SPEC_MAX_INVALID', '상한형은 상한이 필요합니다.')
        } else if (isNum(row.lsl)) {
          push(i, 'lsl', 'SPEC_MAX_INVALID', '상한형은 하한이 비어 있어야 합니다.')
        }
      } else if (row.judgeType === 'MIN') {
        if (!isNum(row.lsl)) {
          push(i, 'lsl', 'SPEC_MIN_INVALID', '하한형은 하한이 필요합니다.')
        } else if (isNum(row.usl)) {
          push(i, 'usl', 'SPEC_MIN_INVALID', '하한형은 상한이 비어 있어야 합니다.')
        }
      }
    }

    // V8 — sortNo 필수 + 같은 품목 내 중복 불가
    if (!isNum(row.sortNo)) {
      push(i, 'sortNo', 'SORT_NO_DUPLICATED', '순번은 필수입니다.')
    } else if (seenSortNo.has(row.sortNo)) {
      push(
        i,
        'sortNo',
        'SORT_NO_DUPLICATED',
        `순번이 중복입니다 (${seenSortNo.get(row.sortNo) + 1}행과 동일).`
      )
    } else {
      seenSortNo.set(row.sortNo, i)
    }

    // V9 — decimalLen 0~6
    const dl = Number(row.decimalLen)
    if (!isNum(row.decimalLen) || !Number.isInteger(dl) || dl < DECIMAL_MIN || dl > DECIMAL_MAX) {
      push(i, 'decimalLen', 'INVALID_DECIMAL_LEN', '소수자리는 0~6 사이 정수여야 합니다.')
    }
  })

  // rowIndex 순으로 정렬해 화면이 위에서 아래로 훑을 수 있게 한다.
  return errors.sort((a, b) => a.rowIndex - b.rowIndex)
}
