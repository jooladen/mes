/**
 * 규격·측정값 표기 — **F2 소유. F3 §3.1·3.2 와 F4 §4 가 소비한다.**
 *
 * 두 벌로 만들면 화면과 성적서 표기가 달라진다 (F2 design §3.2 / F3 design §3.1).
 * 그래서 이 파일 하나만 존재한다.
 */
import { JUDGE_TYPE } from '@/api/quality'

/**
 * 규격 표기 — F2 design §3.2 / F3 design §3.1
 *
 * | judgeType | 표기      |
 * |-----------|-----------|
 * | RANGE     | `400 ~ 500` |
 * | MAX       | `≤ 0.5`   |
 * | MIN       | `≥ 99.5`  |
 *
 * **자릿수를 채우지 않는다.** 규격은 사람이 정한 기준값이라 `0.5` 를 `0.500` 으로
 * 늘리면 없던 정밀도가 생긴 것처럼 보인다. 자릿수는 **측정값에만** 의미가 있다(§3.2).
 *
 * @param {{judgeType: string, lsl: number|null, usl: number|null}} spec
 * @returns {string}
 */
export function formatSpecRange(spec) {
  if (!spec) return ''
  const { judgeType, lsl, usl } = spec
  if (judgeType === JUDGE_TYPE.RANGE) return `${lsl} ~ ${usl}`
  if (judgeType === JUDGE_TYPE.MAX) return `≤ ${usl}`
  if (judgeType === JUDGE_TYPE.MIN) return `≥ ${lsl}`
  return ''
}

/**
 * 측정값 표기 — F3 design §3.2. `decimalLen` 만큼 **0을 채운다**.
 *
 * `0.42` 를 `decimalLen=3` 으로 보여주면 `0.420`. 성적서에서 자릿수는
 * **측정 정밀도의 표현**이라 `0.42` 와 `0.420` 은 다른 정보다.
 *
 * `null` 은 빈 문자열이다 — **`0` 과 구분한다** (F2 Plan FR-08).
 * 측정 안 한 것과 0을 측정한 것은 다르다.
 *
 * @param {number|null|undefined} value
 * @param {number} decimalLen
 * @returns {string}
 */
export function formatMeasured(value, decimalLen) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return n.toFixed(Number(decimalLen) || 0)
}
