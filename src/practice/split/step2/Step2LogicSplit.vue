<script setup>
/**
 * Step 2 — 화면과 화면 로직만 남았다.
 *
 * 이 파일에서 사라진 것: find · filter · sort · reduce · 곱하기
 * 이 파일에 남은 것  : 무엇을 골랐나 / 언제 부를까 / 받은 걸 어디에 담을까
 */
import { ref, onMounted } from 'vue'
import { fetchOrderList, fetchOrder } from './ordersApi'

const options = ref([])
const selected = ref(null)
const sheet = ref(null)

/* 주방에 주문서를 넣고 받아온다 — 계산은 여기서 하지 않는다 */
function load() {
  sheet.value = selected.value ? fetchOrder(selected.value) : null
}

onMounted(() => {
  options.value = fetchOrderList()
  selected.value = options.value[0]?.orderNo ?? null
  load()
})

const won = (n) => (n ?? 0).toLocaleString('ko-KR')
</script>

<template>
  <div class="q-pa-md">
    <div class="banner q-mb-md">
      <b>Step 2 — 계산 분리</b> · 파일 3개 ·
      이 파일에 <code>find</code> <code>reduce</code> <code>*</code> 가 하나도 없다
    </div>

    <div class="row items-center q-gutter-sm q-mb-md">
      <q-select
        v-model="selected"
        :options="options"
        option-value="orderNo"
        option-label="label"
        emit-value
        map-options
        dense
        outlined
        label="명세서 선택"
        style="min-width: 340px"
        @update:model-value="load"
      />
      <q-btn dense unelevated color="primary" label="조회" @click="load" />
    </div>

    <div v-if="sheet" class="sheet">
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
            <th style="width: 48px">No</th>
            <th>품목</th>
            <th style="width: 70px">단위</th>
            <th style="width: 80px">수량</th>
            <th style="width: 100px">단가</th>
            <th style="width: 120px">금액</th>
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
  </div>
</template>

<style scoped>
.banner {
  background: #2d3a4a;
  color: #cfe3ff;
  border-left: 4px solid #4a9eff;
  padding: 8px 12px;
  font-size: 13px;
  max-width: 760px;
}
.banner code {
  background: #1c2735;
  padding: 1px 5px;
  border-radius: 3px;
}
.sheet {
  background: #fff;
  color: #000;
  border: 1px solid #999;
  padding: 20px;
  max-width: 760px;
}
.title {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 4px;
  margin: 0 0 16px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  font-size: 13px;
}
th,
td {
  border: 1px solid #999;
  padding: 6px 8px;
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
  width: 110px;
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
  font-size: 15px;
}
</style>
