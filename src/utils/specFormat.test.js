/**
 * 규격·측정값 표기 테스트 — F2 design §3.2 / F3 design §3.1·3.2
 *
 * 이 함수들의 출력은 **성적서 종이에 그대로 찍힌다.** 대외 문서라 틀리면
 * 화면과 성적서가 달라지거나, 없던 정밀도가 생긴 것처럼 보인다.
 */
import { describe, expect, it } from 'vitest'
import { formatMeasured, formatSpecRange } from './specFormat'

describe('formatSpecRange() — 규격 표기', () => {
  // F2 design §3.2 / F3 design §3.1 의 표를 그대로 옮긴 것
  it('RANGE 는 "400 ~ 500"', () => {
    expect(formatSpecRange({ judgeType: 'RANGE', lsl: 400, usl: 500 })).toBe('400 ~ 500')
  })

  it('MAX 는 "≤ 0.5"', () => {
    expect(formatSpecRange({ judgeType: 'MAX', lsl: null, usl: 0.5 })).toBe('≤ 0.5')
  })

  it('MIN 은 "≥ 99.5"', () => {
    expect(formatSpecRange({ judgeType: 'MIN', lsl: 99.5, usl: null })).toBe('≥ 99.5')
  })

  it('규격에는 자릿수를 채우지 않는다', () => {
    // 규격은 사람이 정한 기준값이다. 0.5 를 0.500 으로 늘리면
    // 없던 정밀도가 생긴 것처럼 보인다. 자릿수는 **측정값에만** 의미가 있다.
    expect(formatSpecRange({ judgeType: 'MAX', lsl: null, usl: 0.5, decimalLen: 3 }))
      .toBe('≤ 0.5')
  })

  it('알 수 없는 judgeType 은 빈 문자열 — 성적서에 깨진 글자를 찍지 않는다', () => {
    expect(formatSpecRange({ judgeType: 'X', lsl: 1, usl: 2 })).toBe('')
  })

  it('null/undefined 는 빈 문자열', () => {
    expect(formatSpecRange(null)).toBe('')
    expect(formatSpecRange(undefined)).toBe('')
  })
})

describe('formatMeasured() — 측정값 표기 (F3 §3.2)', () => {
  it('decimalLen 만큼 0을 채운다 — 0.42 → 0.420', () => {
    // 설계서 §3.2 의 예시 그대로.
    // 성적서에서 자릿수는 **측정 정밀도의 표현**이라 0.42 와 0.420 은 다른 정보다.
    expect(formatMeasured(0.42, 3)).toBe('0.420')
  })

  it('decimalLen 0 이면 정수로', () => {
    expect(formatMeasured(58, 0)).toBe('58')
  })

  it('decimalLen 이 실제 자릿수보다 작으면 반올림한다', () => {
    expect(formatMeasured(100.056, 2)).toBe('100.06')
  })

  it('4자리도 정상', () => {
    expect(formatMeasured(0.0121, 4)).toBe('0.0121')
  })

  describe('null 과 0 을 구분한다 (Plan FR-08)', () => {
    it('null 은 빈 문자열 — 측정 안 한 것', () => {
      expect(formatMeasured(null, 2)).toBe('')
    })

    it('undefined 는 빈 문자열', () => {
      expect(formatMeasured(undefined, 2)).toBe('')
    })

    it('빈 문자열은 빈 문자열', () => {
      expect(formatMeasured('', 2)).toBe('')
    })

    it('0 은 빈칸이 아니라 0.00 으로 찍힌다', () => {
      // 0 을 빈칸으로 만들면 "측정 안 함"과 구분이 사라진다.
      expect(formatMeasured(0, 2)).toBe('0.00')
    })
  })

  it('문자열 숫자도 처리한다 — 화면 입력칸이 문자열을 준다', () => {
    expect(formatMeasured('452', 1)).toBe('452.0')
  })

  it('숫자가 아니면 빈 문자열', () => {
    expect(formatMeasured('abc', 2)).toBe('')
  })

  it('decimalLen 이 없으면 정수로 취급', () => {
    expect(formatMeasured(58.7, undefined)).toBe('59')
  })
})
