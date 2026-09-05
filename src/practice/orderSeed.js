/**
 * 연습용 가짜 DB.
 *
 * 실제 프로젝트라면 Oracle/MySQL 에 들어 있을 테이블들이다.
 * 각 배열 위의 주석이 실제 테이블명이다.
 */

/** TRN_ORDER — 거래명세서 머리 */
export const orderTable = [
  { orderNo: 'ORD-20260905-001', orderDt: '2026-09-05', custCd: 'C001', empCd: 'E007' },
  { orderNo: 'ORD-20260905-002', orderDt: '2026-09-05', custCd: 'C002', empCd: 'E003' },
  { orderNo: 'ORD-20260904-011', orderDt: '2026-09-04', custCd: 'C001', empCd: 'E003' }
]

/** TRN_ORDER_DETAIL — 거래명세서 몸통 */
export const orderDetailTable = [
  { orderNo: 'ORD-20260905-001', seq: 1, itemCd: 'P001', qty: 10, unitPrice: 3000 },
  { orderNo: 'ORD-20260905-001', seq: 2, itemCd: 'P002', qty: 50, unitPrice: 500 },
  { orderNo: 'ORD-20260905-002', seq: 1, itemCd: 'P003', qty: 3, unitPrice: 12000 },
  { orderNo: 'ORD-20260905-002', seq: 2, itemCd: 'P001', qty: 20, unitPrice: 3200 },
  { orderNo: 'ORD-20260905-002', seq: 3, itemCd: 'P004', qty: 100, unitPrice: 250 },
  { orderNo: 'ORD-20260904-011', seq: 1, itemCd: 'P002', qty: 200, unitPrice: 480 }
]

/** MST_CUSTOMER — 거래처 마스터 */
export const custTable = [
  { custCd: 'C001', custNm: '(주)한빛상사', bizNo: '123-45-67890' },
  { custCd: 'C002', custNm: '대성문구', bizNo: '234-56-78901' }
]

/** MST_ITEM — 품목 마스터 */
export const itemTable = [
  { itemCd: 'P001', itemNm: 'A4용지', unitCd: 'BOX', unitPrice: 3200 },
  { itemCd: 'P002', itemNm: '볼펜', unitCd: 'EA', unitPrice: 500 },
  { itemCd: 'P003', itemNm: '파일철', unitCd: 'EA', unitPrice: 12000 },
  { itemCd: 'P004', itemNm: '포스트잇', unitCd: 'EA', unitPrice: 250 }
]

/** MST_EMP — 사원 마스터 */
export const empTable = [
  { empCd: 'E003', empNm: '박대리', deptNm: '영업1팀' },
  { empCd: 'E007', empNm: '김영업', deptNm: '영업2팀' }
]
