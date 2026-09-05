/**
 * Step 2 — 업무 로직만 모았다.
 *
 * 여기 있는 것: 조인 · 계산 · 정렬 · 번호 재부여
 *   → "화면 없이 배치로 돌려도 필요한 것"
 *
 * 여기 없는 것: 언제 부를지, 로딩 표시, 어느 명세서를 골랐는지
 *   → 그건 화면의 사정이다
 */
import {
  orderTable,
  orderDetailTable,
  custTable,
  itemTable,
  empTable
} from './orderSeed'

/** 명세서 목록 — 콤보에 채울 것 */
export function fetchOrderList() {
  return orderTable.map((o) => ({
    orderNo: o.orderNo,
    label: `${o.orderNo}  (${custTable.find((c) => c.custCd === o.custCd)?.custNm ?? ''})`
  }))
}

/** 명세서 본문 — 화면이 그대로 그릴 수 있는 모양으로 조립한다 */
export function fetchOrder(orderNo) {
  const order = orderTable.find((o) => o.orderNo === orderNo)
  if (!order) return null

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
        // 단가는 마스터가 아니라 주문 시점에 굳혀둔 값을 쓴다 (박제)
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
