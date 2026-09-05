/**
 * 판정 로직 — F2 design §1
 *
 * **이 스프린트에서 반드시 단위 테스트가 있어야 하는 유일한 코드다** (§1).
 * `<` 와 `<=` 를 한 글자 잘못 쓰면 규격에 딱 맞는 제품이 전부 불합격 처리된다.
 *
 * ── 이 파일이 두 곳에서 쓰이는 이유 ──────────────────────────────
 * §2 는 판정을 **이중**으로 한다:
 *   [화면] 입력 즉시 계산 → 색·문구 표시    ← 사용자 편의. 신뢰하지 않는다
 *   [서버] 저장 시 재계산 → DB 기록         ← 최종 진실
 *
 * 실제 시스템에서 이 둘은 **다른 구현**이다 — 서버는 Java `SpecJudge`(순수 클래스),
 * 화면은 이 JS 파일. 지금은 서버가 `api/http.js` 라 **한 파일을 공유**한다.
 * 일부러 그렇게 뒀다: Mock 단계에서 두 벌로 나누면 둘이 어긋나도 아무도 모른다.
 * 자바가 붙는 순간 서버는 `SpecJudge` 를 쓰고 이 파일은 화면 전용이 되며,
 * 그때부터 F4 design §12 의 L3 "판정 일치" 테스트가 드리프트를 잡는다.
 */
import { JUDGE_TYPE } from '@/api/quality'

/** 판정 결과 — data-model §4.2 `JudgeResult` 소유. F3·F4 가 소비한다. */
export const JUDGE_RESULT = {
  NONE: 'NONE',
  PASS: 'PASS',
  FAIL: 'FAIL'
}

/**
 * 측정값 하나를 규격과 비교한다 — §1.2
 *
 * | judgeType | 합격 조건            | 경계 |
 * |-----------|---------------------|------|
 * | RANGE     | `lsl <= v && v <= usl` | 포함 |
 * | MAX       | `v <= usl`          | 포함 |
 * | MIN       | `lsl <= v`          | 포함 |
 *
 * **경계값은 합격이다.** `v === usl` 이면 PASS.
 * `measured` 가 null/빈값이면 `NONE` — **`0` 과 구분한다** (Plan FR-08).
 *
 * ⚠️ 자바 구현은 `BigDecimal.compareTo` 를 쓴다 (data-model §6). `double` 로
 *    `452.0 <= 452` 를 비교하면 표현 오차로 거짓이 될 수 있고, 그때 합격품이
 *    불합격으로 나간다. JS 는 IEEE754 하나뿐이라 여기서는 그대로 비교하지만,
 *    **서버가 최종 진실**이므로 DB 에 남는 값은 항상 BigDecimal 판정이다.
 */
export function judge(measured, judgeType, lsl, usl) {
  if (measured === null || measured === undefined || measured === '') {
    return JUDGE_RESULT.NONE
  }
  const v = Number(measured)
  if (Number.isNaN(v)) return JUDGE_RESULT.NONE

  if (judgeType === JUDGE_TYPE.RANGE) {
    return Number(lsl) <= v && v <= Number(usl) ? JUDGE_RESULT.PASS : JUDGE_RESULT.FAIL
  }
  if (judgeType === JUDGE_TYPE.MAX) {
    return v <= Number(usl) ? JUDGE_RESULT.PASS : JUDGE_RESULT.FAIL
  }
  if (judgeType === JUDGE_TYPE.MIN) {
    return Number(lsl) <= v ? JUDGE_RESULT.PASS : JUDGE_RESULT.FAIL
  }
  return JUDGE_RESULT.NONE
}

/**
 * Lot 종합판정 — §1.3
 *
 * ```
 * 하나라도 NONE  →  NONE   (검사 미완료. PASS 아님)
 * 하나라도 FAIL  →  FAIL
 * 전부 PASS      →  PASS
 * ```
 *
 * **NONE 을 FAIL 보다 먼저 보는 이유**: 미입력 항목이 있는데 나머지가 전부 PASS 라고
 * PASS 를 주면 **검사하지 않은 항목을 통과시킨 성적서**가 나간다.
 *
 * 빈 목록은 `NONE` 이다 — 검사할 항목이 없다는 것은 합격의 근거가 못 된다.
 */
export function total(results) {
  if (!results || results.length === 0) return JUDGE_RESULT.NONE
  if (results.some((r) => r === JUDGE_RESULT.NONE)) return JUDGE_RESULT.NONE
  if (results.some((r) => r === JUDGE_RESULT.FAIL)) return JUDGE_RESULT.FAIL
  return JUDGE_RESULT.PASS
}

/** Lot 상태 — data-model §4.3 `LotStatus` 소유. F3 §2 가 소비한다. */
export const LOT_STATUS = {
  WAIT: 'WAIT',
  INSP: 'INSP',
  OK: 'OK',
  LOCKED: 'LOCKED'
}

export const LOT_STATUS_LABEL = {
  WAIT: '검사대기',
  INSP: '검사중',
  OK: '합격',
  LOCKED: '불합격'
}

/**
 * 종합판정 → Lot 상태 전이 — §1.4 (Plan FR-06)
 *
 * | 종합판정 | LOT_STATUS | F3 발행 |
 * |---------|------------|--------|
 * | NONE    | INSP       | ✗ |
 * | PASS    | OK         | ✓ |
 * | FAIL    | LOCKED     | ✗ |
 */
export function nextLotStatus(totalJudge) {
  if (totalJudge === JUDGE_RESULT.PASS) return LOT_STATUS.OK
  if (totalJudge === JUDGE_RESULT.FAIL) return LOT_STATUS.LOCKED
  return LOT_STATUS.INSP
}
