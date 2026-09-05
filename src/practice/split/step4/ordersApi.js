/**
 * 📒 전화번호부. 계산이 하나도 없다 — 어느 주소로 부를지만 안다.
 *
 * Step 3 까지는 이 파일이 계산을 했다. 이제 계산은 서버(http.js) 로 갔고
 * 여기 남은 건 "주소 + 파라미터 이름" 뿐이다.
 *
 * ⭐ 역추적할 때 여기서 멈추면 안 된다. 번호부를 보고 "찾았다" 하는 것과 같다.
 *    주소를 들고 http.js 로 한 번 더 가야 한다.
 */
import { post } from './http'

export const ORDER_API = {
  LIST: '/api/orders',
  DETAIL: '/api/orders/detail'
}

export const fetchOrderList = () => post(ORDER_API.LIST)

export const fetchOrder = (orderNo) => post(ORDER_API.DETAIL, { orderNo })
