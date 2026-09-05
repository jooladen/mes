<script setup>
/**
 * 거래명세서 종이 부분만. 화면 조각(컴포넌트)으로 떼어냈다.
 *
 * ⭐ 이 파일은 "어느 명세서를 보여줄지" 모른다. 받은 것만 그린다.
 *    누가 넘겨주는지도 모른다 — 그건 부모의 사정이다.
 *
 * 그래서 두 곳(또는 열 곳)에서 같이 쓸 수 있다. 안 나눴으면 HTML 을 복사해야 했다.
 */
defineProps({
  /**
   * { orderNo, orderDt, custNm, bizNo, empNm, deptNm, totalAmount, detailList[] }
   * ordersApi.fetchOrder() 가 돌려주는 모양 그대로.
   */
  sheet: { type: Object, required: true }
})

const won = (n) => (n ?? 0).toLocaleString('ko-KR')
</script>

<template>
  <div class="sheet">
    <h2 class="title">거 래 명 세 서</h2>

    <table class="head">
      <tbody>
        <tr>
          <th>명세서번호</th>
          <td>{{ sheet.orderNo }}</td>
          <th>거래일자</th>
          <td>{{ sheet.orderDt }}</td>
        </tr>
        <tr>
          <th>거래처</th>
          <td>{{ sheet.custNm }}</td>
          <th>사업자번호</th>
          <td>{{ sheet.bizNo }}</td>
        </tr>
      </tbody>
    </table>

    <table class="body">
      <thead>
        <tr>
          <th style="width: 40px">No</th>
          <th>품목</th>
          <th style="width: 58px">단위</th>
          <th style="width: 62px">수량</th>
          <th style="width: 80px">단가</th>
          <th style="width: 96px">금액</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in sheet.detailList" :key="d.printNo">
          <td class="center">{{ d.printNo }}</td>
          <td>{{ d.itemNm }}</td>
          <td class="center">{{ d.unitCd }}</td>
          <td class="num">{{ won(d.qty) }}</td>
          <td class="num">{{ won(d.unitPrice) }}</td>
          <td class="num">{{ won(d.amount) }}</td>
        </tr>
      </tbody>
    </table>

    <table class="foot">
      <tbody>
        <tr>
          <th>합계금액</th>
          <td class="num total">{{ won(sheet.totalAmount) }}</td>
        </tr>
        <tr>
          <th>담당자</th>
          <td>{{ sheet.empNm }} ({{ sheet.deptNm }})</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sheet {
  background: #fff;
  color: #000;
  border: 1px solid #999;
  padding: 16px;
  flex: 1 1 420px;
  min-width: 420px;
}
.title {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  margin: 0 0 14px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  font-size: 12px;
}
th,
td {
  border: 1px solid #999;
  padding: 5px 7px;
}
th {
  background: #f2f2f2;
  font-weight: 600;
  white-space: nowrap;
}
.body thead th {
  text-align: center;
}
.head th,
.foot th {
  width: 92px;
  text-align: left;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.center {
  text-align: center;
}
.total {
  font-weight: 700;
  font-size: 14px;
}
</style>
