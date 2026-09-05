/**
 * 동적 컬럼 + 피벗 변환 테스트 — F4 design §12 L1
 *
 * 설계서 §12 가 요구한 케이스를 그대로 옮긴다:
 *   "항목 3개 품목 / 5개 품목 / 두 품목 혼합 / 결과 0건"
 *   "평면 → 매트릭스 매핑 정확성, 누락 셀 = null"
 */
import { describe, expect, it } from 'vitest'
import { buildDynamicColumns, buildPivotRows } from './usePivotGrid'

// ITEM-001 (5항목) 과 ITEM-003 (3항목) — mock/spec.json 기준
const d = (lotNo, cd, nm, sortNo, val, judge, decimalLen = 1) => ({
  lotNo, inspItemCd: cd, inspItemNm: nm, unitCd: 'x',
  judgeType: 'RANGE', lsl: 0, usl: 999, decimalLen, sortNo,
  measuredVal: val, judgeResult: judge
})

describe('buildDynamicColumns() — 동적 컬럼 구성 (§4)', () => {
  it('항목 3개 품목', () => {
    const detail = [
      d('L1', 'CU', '구리함량', 1, 59.2, 'PASS'),
      d('L1', 'ZN', '아연함량', 2, 38.6, 'PASS'),
      d('L1', 'HRD', '경도', 3, 78, 'PASS')
    ]
    expect(buildDynamicColumns(detail).map((c) => c.inspItemCd)).toEqual(['CU', 'ZN', 'HRD'])
  })

  it('여러 Lot 에 같은 항목이 나와도 컬럼은 하나다', () => {
    const detail = [
      d('L1', 'TS', '인장강도', 1, 452, 'PASS'),
      d('L2', 'TS', '인장강도', 1, 390, 'FAIL'),
      d('L3', 'TS', '인장강도', 1, 470, 'PASS')
    ]
    expect(buildDynamicColumns(detail)).toHaveLength(1)
  })

  it('sortNo 오름차순으로 정렬한다 — 입력 순서와 무관하게', () => {
    const detail = [
      d('L1', 'LEN', '길이', 5, 100.05, 'PASS'),
      d('L1', 'TS', '인장강도', 1, 452, 'PASS'),
      d('L1', 'IMP', '불순물', 3, 0.42, 'PASS')
    ]
    expect(buildDynamicColumns(detail).map((c) => c.sortNo)).toEqual([1, 3, 5])
  })

  it('sortNo 가 sparse(1,2,5,9)여도 그 순서를 유지한다 — printSeq 로 바꾸지 않는다 (D3)', () => {
    const detail = [
      d('L1', 'A', 'A', 9, 1, 'PASS'),
      d('L1', 'B', 'B', 1, 2, 'PASS'),
      d('L1', 'C', 'C', 5, 3, 'PASS'),
      d('L1', 'D', 'D', 2, 4, 'PASS')
    ]
    expect(buildDynamicColumns(detail).map((c) => c.sortNo)).toEqual([1, 2, 5, 9])
  })

  it('두 품목이 섞이면 항목이 합쳐진다', () => {
    const detail = [
      d('L1', 'TS', '인장강도', 1, 452, 'PASS'),
      d('L1', 'HRD', '경도', 2, 58, 'PASS'),
      d('L9', 'CU', '구리함량', 1, 59.2, 'PASS')
    ]
    // TS(1) 과 CU(1) 는 sortNo 가 같다 — 둘 다 남고 컬럼은 3개
    expect(buildDynamicColumns(detail)).toHaveLength(3)
  })

  it('결과 0건이면 빈 배열', () => {
    expect(buildDynamicColumns([])).toEqual([])
    expect(buildDynamicColumns(null)).toEqual([])
    expect(buildDynamicColumns(undefined)).toEqual([])
  })

  it('unitCd·decimalLen 을 함께 들고 온다 — 헤더와 자릿수에 쓰인다', () => {
    const detail = [{ ...d('L1', 'IMP', '불순물', 3, 0.42, 'PASS', 3), unitCd: '%' }]
    expect(buildDynamicColumns(detail)[0]).toMatchObject({
      inspItemCd: 'IMP', inspItemNm: '불순물', unitCd: '%', decimalLen: 3
    })
  })
})

describe('buildPivotRows() — 평면 → 매트릭스 (§4)', () => {
  const lots = [
    { lotNo: 'L1', itemCd: 'I1', itemNm: '스틸', judgeDt: '2026-09-04T10:30:00', totalJudge: 'PASS' },
    { lotNo: 'L2', itemCd: 'I1', itemNm: '스틸', judgeDt: '2026-09-04T11:00:00', totalJudge: 'FAIL' }
  ]
  const detail = [
    d('L1', 'TS', '인장강도', 1, 452, 'PASS'),
    d('L1', 'HRD', '경도', 2, 58, 'PASS'),
    d('L2', 'TS', '인장강도', 1, 390, 'FAIL')
    // L2 의 HRD 는 **없다** — 누락 셀 케이스
  ]
  const cols = buildDynamicColumns(detail)

  it('Lot 하나가 행 하나가 된다', () => {
    expect(buildPivotRows(lots, detail, cols)).toHaveLength(2)
  })

  it('평면 값이 올바른 칸에 들어간다', () => {
    const rows = buildPivotRows(lots, detail, cols)
    expect(rows[0].TS).toBe(452)
    expect(rows[0].HRD).toBe(58)
    expect(rows[1].TS).toBe(390)
  })

  it('누락 셀은 null 이다 — 0 이 아니다 (D11, FR-07)', () => {
    // 측정 안 한 것과 0 을 측정한 것은 다르다.
    const rows = buildPivotRows(lots, detail, cols)
    expect(rows[1].HRD).toBeNull()
    expect(rows[1].HRD).not.toBe(0)
  })

  it('측정값 0 은 0 그대로 남는다 — null 로 바뀌지 않는다', () => {
    const zeroDetail = [d('L1', 'TS', '인장강도', 1, 0, 'FAIL')]
    const zeroCols = buildDynamicColumns(zeroDetail)
    const rows = buildPivotRows([lots[0]], zeroDetail, zeroCols)
    expect(rows[0].TS).toBe(0)
    expect(rows[0].TS).not.toBeNull()
  })

  it('셀 판정을 __judge 에 따로 담는다 — 그리드 필드에는 숫자만 들어가야 한다', () => {
    const rows = buildPivotRows(lots, detail, cols)
    expect(rows[0].__judge.TS).toBe('PASS')
    expect(rows[1].__judge.TS).toBe('FAIL')
    expect(rows[1].__judge.HRD).toBeNull()
  })

  it('행에 totalJudge 를 실어 FAIL 행 강조에 쓴다 (FR-06)', () => {
    const rows = buildPivotRows(lots, detail, cols)
    expect(rows[1].totalJudge).toBe('FAIL')
  })

  it('judgeDt 는 날짜만 남긴다', () => {
    expect(buildPivotRows(lots, detail, cols)[0].judgeDt).toBe('2026-09-04')
  })

  it('결과 0건이면 빈 배열', () => {
    expect(buildPivotRows([], [], [])).toEqual([])
    expect(buildPivotRows(null, null, [])).toEqual([])
  })

  it('항목 수가 다른 두 품목을 함께 조회하면 없는 칸이 null 로 채워진다', () => {
    // §12 "항목 3개 품목 / 5개 품목 / 두 품목 혼합"
    const mixLots = [
      { lotNo: 'L1', itemNm: '스틸', judgeDt: '2026-09-04T10:00:00', totalJudge: 'PASS' },
      { lotNo: 'L9', itemNm: '구리', judgeDt: '2026-09-04T14:00:00', totalJudge: 'PASS' }
    ]
    const mixDetail = [
      d('L1', 'TS', '인장강도', 1, 452, 'PASS'),
      d('L1', 'HRD', '경도', 2, 58, 'PASS'),
      d('L9', 'CU', '구리함량', 1, 59.2, 'PASS')
    ]
    const mixCols = buildDynamicColumns(mixDetail)
    const rows = buildPivotRows(mixLots, mixDetail, mixCols)

    expect(rows[0].CU).toBeNull() // 스틸에는 구리함량이 없다
    expect(rows[1].TS).toBeNull() // 구리에는 인장강도가 없다
    expect(rows[1].CU).toBe(59.2)
  })
})
