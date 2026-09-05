/**
 * 판정 로직 단위 테스트 — F2 design §12
 *
 * 설계서가 이렇게 못박았다:
 *   "이 스프린트에서 **유일하게 반드시 단위 테스트가 있어야 하는 코드**다" (§1)
 *   "L1 첫 줄이 이 스프린트에서 가장 중요한 테스트다. `<` 와 `<=` 를 한 글자
 *    잘못 쓰면 규격 딱 맞는 제품이 전부 불합격 처리된다" (§12)
 *
 * 그래서 **경계값이 핵심**이다. 아래 케이스는 F2 design §12 표를 그대로 옮긴 것이다.
 */
import { describe, expect, it } from 'vitest'
import {
  JUDGE_RESULT,
  LOT_STATUS,
  judge,
  nextLotStatus,
  total
} from './specJudgeClient'

const { NONE, PASS, FAIL } = JUDGE_RESULT

describe('judge() — 항목 판정 (F2 §1.2)', () => {
  describe('경계값은 합격이다 — 가장 중요한 케이스', () => {
    it('v === usl 이면 PASS (RANGE)', () => {
      // `<` 를 쓰면 여기서 FAIL 이 나온다. 규격 상한에 딱 맞는 제품이 불합격된다.
      expect(judge(500, 'RANGE', 400, 500)).toBe(PASS)
    })

    it('v === lsl 이면 PASS (RANGE)', () => {
      expect(judge(400, 'RANGE', 400, 500)).toBe(PASS)
    })

    it('v === usl 이면 PASS (MAX)', () => {
      expect(judge(0.5, 'MAX', null, 0.5)).toBe(PASS)
    })

    it('v === lsl 이면 PASS (MIN)', () => {
      expect(judge(99.5, 'MIN', 99.5, null)).toBe(PASS)
    })

    it('lsl === usl 인 규격도 그 값이면 PASS', () => {
      expect(judge(100, 'RANGE', 100, 100)).toBe(PASS)
    })
  })

  describe('경계 밖은 불합격', () => {
    it('상한을 아주 조금 넘으면 FAIL', () => {
      expect(judge(500.000001, 'RANGE', 400, 500)).toBe(FAIL)
    })

    it('하한에 아주 조금 못 미치면 FAIL', () => {
      expect(judge(399.999999, 'RANGE', 400, 500)).toBe(FAIL)
    })

    it('MAX 상한 초과는 FAIL', () => {
      expect(judge(0.51, 'MAX', null, 0.5)).toBe(FAIL)
    })

    it('MIN 하한 미만은 FAIL', () => {
      expect(judge(99.4, 'MIN', 99.5, null)).toBe(FAIL)
    })
  })

  describe('null 과 0 을 구분한다 (Plan FR-08)', () => {
    // 측정 안 한 것과 0을 측정한 것은 다르다.
    it('measured 가 null 이면 NONE', () => {
      expect(judge(null, 'RANGE', 400, 500)).toBe(NONE)
    })

    it('measured 가 undefined 면 NONE', () => {
      expect(judge(undefined, 'RANGE', 400, 500)).toBe(NONE)
    })

    it('measured 가 빈 문자열이면 NONE — 화면 입력칸을 비웠을 때', () => {
      expect(judge('', 'RANGE', 400, 500)).toBe(NONE)
    })

    it('measured 가 0 이면 NONE 이 아니라 실제로 판정한다', () => {
      // 0 은 "측정하지 않음"이 아니다. 0 을 측정한 것이다.
      expect(judge(0, 'MAX', null, 0.5)).toBe(PASS)
      expect(judge(0, 'MIN', 99.5, null)).toBe(FAIL)
    })

    it('숫자가 아닌 문자열은 NONE', () => {
      expect(judge('abc', 'RANGE', 400, 500)).toBe(NONE)
    })
  })

  describe('판정방식별 규격 형태 (F1 §2.1)', () => {
    it('MAX 는 lsl 이 null 이어도 동작한다', () => {
      expect(judge(0.42, 'MAX', null, 0.5)).toBe(PASS)
    })

    it('MIN 은 usl 이 null 이어도 동작한다', () => {
      expect(judge(99.72, 'MIN', 99.5, null)).toBe(PASS)
    })

    it('알 수 없는 judgeType 은 NONE — 조용히 PASS 를 주지 않는다', () => {
      // 판정 불가를 합격으로 처리하면 검사 안 한 제품이 통과한다.
      expect(judge(450, 'UNKNOWN', 400, 500)).toBe(NONE)
    })
  })

  describe('화면이 넘기는 문자열 입력', () => {
    // q-input 은 type="number" 여도 문자열을 준다.
    it('문자열 숫자도 정상 판정한다', () => {
      expect(judge('452', 'RANGE', 400, 500)).toBe(PASS)
      expect(judge('380', 'RANGE', 400, 500)).toBe(FAIL)
    })

    it('규격도 문자열이면 정상 판정한다', () => {
      expect(judge(452, 'RANGE', '400', '500')).toBe(PASS)
    })
  })

  describe('부동소수 함정', () => {
    it('0.1 + 0.2 결과가 상한이어도 판정이 흔들리지 않는지', () => {
      // JS 에서 0.1 + 0.2 === 0.30000000000000004 다.
      // 실제 서버(Java)는 BigDecimal.compareTo 를 쓰므로 이 문제가 없다.
      // 여기서는 **현재 동작을 기록**해 둔다 — 자바 붙일 때 대조 기준이 된다.
      expect(judge(0.1 + 0.2, 'MAX', null, 0.3)).toBe(FAIL)
      expect(judge(0.3, 'MAX', null, 0.3)).toBe(PASS)
    })
  })
})

describe('total() — 종합판정 (F2 §1.3)', () => {
  it('전부 PASS 면 PASS', () => {
    expect(total([PASS, PASS, PASS])).toBe(PASS)
  })

  it('하나라도 FAIL 이면 FAIL', () => {
    expect(total([PASS, FAIL, PASS])).toBe(FAIL)
  })

  it('NONE 하나 + 나머지 PASS 면 NONE — PASS 가 아니다', () => {
    // 미입력 항목이 있는데 PASS 를 주면
    // **검사하지 않은 항목을 통과시킨 성적서**가 나간다.
    expect(total([PASS, PASS, NONE])).toBe(NONE)
  })

  it('NONE 과 FAIL 이 섞이면 NONE — NONE 이 먼저다', () => {
    // 검사가 안 끝났으므로 "불합격"이라고 단정할 수도 없다.
    expect(total([NONE, FAIL])).toBe(NONE)
  })

  it('빈 목록은 NONE — 검사할 항목이 없다는 게 합격의 근거는 아니다', () => {
    expect(total([])).toBe(NONE)
  })

  it('null/undefined 도 NONE', () => {
    expect(total(null)).toBe(NONE)
    expect(total(undefined)).toBe(NONE)
  })
})

describe('nextLotStatus() — Lot 상태 전이 (F2 §1.4)', () => {
  it('PASS → OK (성적서 발행 가능)', () => {
    expect(nextLotStatus(PASS)).toBe(LOT_STATUS.OK)
  })

  it('FAIL → LOCKED (발행 차단)', () => {
    expect(nextLotStatus(FAIL)).toBe(LOT_STATUS.LOCKED)
  })

  it('NONE → INSP (검사중, 발행 불가)', () => {
    expect(nextLotStatus(NONE)).toBe(LOT_STATUS.INSP)
  })
})

describe('실제 Mock 데이터 시나리오', () => {
  // ITEM-001 스틸 브라켓의 5개 규격 (mock/spec.json)
  const ITEM_001 = [
    { cd: 'TS', type: 'RANGE', lsl: 400, usl: 500 },
    { cd: 'HRD', type: 'RANGE', lsl: 55, usl: 62 },
    { cd: 'IMP', type: 'MAX', lsl: null, usl: 0.5 },
    { cd: 'PUR', type: 'MIN', lsl: 99.5, usl: null },
    { cd: 'LEN', type: 'RANGE', lsl: 99.8, usl: 100.2 }
  ]
  const judgeAll = (values) =>
    ITEM_001.map((s, i) => judge(values[i], s.type, s.lsl, s.usl))

  it('LOT-003 실측값 전건 PASS → OK (발행 대상)', () => {
    const results = judgeAll([470.0, 60, 0.42, 99.72, 100.05])
    expect(results).toEqual([PASS, PASS, PASS, PASS, PASS])
    expect(nextLotStatus(total(results))).toBe(LOT_STATUS.OK)
  })

  it('LOT-002 처럼 2건만 입력하면 NONE → INSP (발행 불가)', () => {
    const results = judgeAll([452.0, 58, null, null, null])
    expect(total(results)).toBe(NONE)
    expect(nextLotStatus(total(results))).toBe(LOT_STATUS.INSP)
  })

  it('불순물이 규격을 넘으면 FAIL → LOCKED', () => {
    const results = judgeAll([470.0, 60, 0.61, 99.72, 100.05])
    expect(total(results)).toBe(FAIL)
    expect(nextLotStatus(total(results))).toBe(LOT_STATUS.LOCKED)
  })

  it('재검사로 불순물이 규격 안에 들어오면 다시 OK (§5 잠김 해제)', () => {
    const results = judgeAll([470.0, 60, 0.42, 99.72, 100.05])
    expect(nextLotStatus(total(results))).toBe(LOT_STATUS.OK)
  })
})
