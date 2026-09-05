/**
 * ⭐ Step 1 에서는 쓸 수 없었던 테스트.
 *
 * 계산이 .vue 안에 있으면 화면을 띄워야 검사할 수 있다.
 * 분리했더니 화면 없이 계산만 검사된다 — 지표 ③ 이 ✗ 에서 ○ 로 바뀐 증거.
 */
import { describe, it, expect } from 'vitest'
import { fetchOrder, fetchOrderList } from './ordersApi'

describe('fetchOrder() — 명세서 조립', () => {
  it('금액 = 수량 × 단가', () => {
    const sheet = fetchOrder('ORD-20260905-001')
    expect(sheet.detailList[0].amount).toBe(10 * 3000)
    expect(sheet.detailList[1].amount).toBe(50 * 500)
  })

  it('합계금액 = 금액들의 합', () => {
    const sheet = fetchOrder('ORD-20260905-001')
    expect(sheet.totalAmount).toBe(30000 + 25000)
  })

  it('단가는 품목 마스터가 아니라 주문에 굳혀둔 값을 쓴다', () => {
    // 마스터의 A4용지 단가는 3200. 001 번 명세서는 3000 으로 팔았다.
    const sheet = fetchOrder('ORD-20260905-001')
    expect(sheet.detailList[0].itemNm).toBe('A4용지')
    expect(sheet.detailList[0].unitPrice).toBe(3000) // 3200 이 아니다
  })

  it('거래처명은 거래처 마스터에서 조인해온다', () => {
    const sheet = fetchOrder('ORD-20260905-001')
    expect(sheet.custNm).toBe('(주)한빛상사')
    expect(sheet.bizNo).toBe('123-45-67890')
  })

  it('No 는 1부터 조밀하게 재부여한다', () => {
    const sheet = fetchOrder('ORD-20260905-002')
    expect(sheet.detailList.map((d) => d.printNo)).toEqual([1, 2, 3])
  })

  it('없는 명세서는 null', () => {
    expect(fetchOrder('ORD-없는번호')).toBeNull()
    expect(fetchOrder(undefined)).toBeNull()
  })
})

describe('fetchOrderList() — 콤보 목록', () => {
  it('명세서 수만큼 나오고 거래처명이 붙는다', () => {
    const list = fetchOrderList()
    expect(list).toHaveLength(3)
    expect(list[0].label).toContain('(주)한빛상사')
  })
})
