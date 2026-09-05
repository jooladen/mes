import {
  orderTable,
  orderDetailTable,
  custTable,
  itemTable,
  empTable
} from './orderSeed'

/** 명세서 목록 — 콤보에 채운다 */
export function fetchOrderList() {
  return orderTable.map((o) => ({
    orderNo: o.orderNo,
    label: `${o.orderNo}  (${custTable.find((c) => c.custCd === o.custCd)?.custNm ?? ''})`
  }))
}

/** 명세서 한 건 — 화면이 그대로 그릴 수 있는 모양으로 조립한다 */
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
