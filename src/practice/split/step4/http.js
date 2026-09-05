/**
 * 가짜 서버. 나중에 진짜 자바 백엔드로 바뀌는 유일한 파일이다.
 *
 * ⭐ 여기가 "국경" 이다. 이 위(화면·주소록)는 서버가 어떻게 생겼는지 모른다.
 *    자바가 붙으면 이 파일 내부만 fetch/axios 로 바꾸면 되고,
 *    화면과 주소록은 한 줄도 안 건드린다.
 *
 * MES 의 src/api/http.js 와 같은 자리다.
 */
import {
  orderTable,
  orderDetailTable,
  custTable,
  itemTable,
  empTable
} from './orderSeed'

/** 서버가 돌려주는 에러. 화면이 코드로 분기할 수 있게 code 를 갖는다. */
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/* ─────────── 업무 로직 (서버 쪽) ─────────── */

function buildOrder(orderNo) {
  const order = orderTable.find((o) => o.orderNo === orderNo)
  if (!order) throw new ApiError('ORDER_NOT_FOUND', '존재하지 않는 명세서입니다.')

  const cust = custTable.find((c) => c.custCd === order.custCd)
  const emp = empTable.find((e) => e.empCd === order.empCd)

  let printNo = 0
  const detailList = orderDetailTable
    .filter((d) => d.orderNo === orderNo)
    .sort((a, b) => a.seq - b.seq)
    .map((d) => {
      const item = itemTable.find((i) => i.itemCd === d.itemCd)
      return {
        printNo: ++printNo,
        itemNm: item?.itemNm ?? '(삭제된 품목)',
        unitCd: item?.unitCd ?? '',
        qty: d.qty,
        // 단가는 마스터가 아니라 주문 시점에 굳혀둔 값 (박제)
        unitPrice: d.unitPrice,
        amount: d.qty * d.unitPrice
      }
    })

  return {
    orderNo: order.orderNo,
    orderDt: order.orderDt,
    custNm: cust?.custNm ?? '',
    bizNo: cust?.bizNo ?? '',
    empNm: emp?.empNm ?? '',
    deptNm: emp?.deptNm ?? '',
    totalAmount: detailList.reduce((sum, d) => sum + d.amount, 0),
    detailList
  }
}

/* ─────────── 라우트 표 — 주소 하나에 처리 하나 ─────────── */

const ROUTES = {
  '/api/orders': () =>
    orderTable.map((o) => ({
      orderNo: o.orderNo,
      label: `${o.orderNo}  (${custTable.find((c) => c.custCd === o.custCd)?.custNm ?? ''})`
    })),

  '/api/orders/detail': (params) => buildOrder(params?.orderNo)
}

/**
 * 유일한 통신 창구.
 * 진짜 서버로 바뀌면 이 함수 안이 fetch(...) 로 교체된다.
 */
export async function post(url, params) {
  await delay(200) // 네트워크가 있는 척 — 로딩 표시가 필요해지는 이유
  const handler = ROUTES[url]
  if (!handler) throw new ApiError('NOT_FOUND', `없는 주소입니다: ${url}`)
  return handler(params)
}
