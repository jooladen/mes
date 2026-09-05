<script setup>
/**
 * Step 0 — 종합 선물세트. 화면·계산·데이터가 전부 이 파일 안에 있다.
 *
 * 나쁜 코드가 아니다. 화면 하나, 혼자 만들고, 안 바뀔 거면 이게 정답이다.
 */
import { ref, computed, onMounted } from 'vue'

/* ─────────── 데이터 ─────────── */

const orderTable = [
  { orderNo: 'ORD-20260905-001', orderDt: '2026-09-05', custCd: 'C001', empCd: 'E007' },
  { orderNo: 'ORD-20260905-002', orderDt: '2026-09-05', custCd: 'C002', empCd: 'E003' },
  { orderNo: 'ORD-20260904-011', orderDt: '2026-09-04', custCd: 'C001', empCd: 'E003' }
]

const orderDetailTable = [
  { orderNo: 'ORD-20260905-001', seq: 1, itemCd: 'P001', qty: 10, unitPrice: 3000 },
  { orderNo: 'ORD-20260905-001', seq: 2, itemCd: 'P002', qty: 50, unitPrice: 500 },
  { orderNo: 'ORD-20260905-002', seq: 1, itemCd: 'P003', qty: 3, unitPrice: 12000 },
  { orderNo: 'ORD-20260905-002', seq: 2, itemCd: 'P001', qty: 20, unitPrice: 3200 },
  { orderNo: 'ORD-20260905-002', seq: 3, itemCd: 'P004', qty: 100, unitPrice: 250 },
  { orderNo: 'ORD-20260904-011', seq: 1, itemCd: 'P002', qty: 200, unitPrice: 480 }
]

const custTable = [
  { custCd: 'C001', custNm: '(주)한빛상사', bizNo: '123-45-67890' },
  { custCd: 'C002', custNm: '대성문구', bizNo: '234-56-78901' }
]

const itemTable = [
  { itemCd: 'P001', itemNm: 'A4용지', unitCd: 'BOX', unitPrice: 3200 },
  { itemCd: 'P002', itemNm: '볼펜', unitCd: 'EA', unitPrice: 500 },
  { itemCd: 'P003', itemNm: '파일철', unitCd: 'EA', unitPrice: 12000 },
  { itemCd: 'P004', itemNm: '포스트잇', unitCd: 'EA', unitPrice: 250 }
]

const empTable = [
  { empCd: 'E003', empNm: '박대리', deptNm: '영업1팀' },
  { empCd: 'E007', empNm: '김영업', deptNm: '영업2팀' }
]

/* ─────────── 화면 상태 ─────────── */

const options = ref([])
const selected = ref(null)
const sheet = ref(null)

/* ─────────── 조회 · 계산 ─────────── */

function load() {
  const order = orderTable.find((o) => o.orderNo === selected.value)
  if (!order) {
    sheet.value = null
    return
  }

  const cust = custTable.find((c) => c.custCd === order.custCd)
  const emp = empTable.find((e) => e.empCd === order.empCd)

  let printNo = 0
  const detailList = orderDetailTable
    .filter((d) => d.orderNo === order.orderNo)
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

  sheet.value = {
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

onMounted(() => {
  options.value = orderTable.map((o) => ({
    orderNo: o.orderNo,
    label: `${o.orderNo}  (${custTable.find((c) => c.custCd === o.custCd)?.custNm ?? ''})`
  }))
  selected.value = options.value[0]?.orderNo ?? null
  load()
})

const won = (n) => (n ?? 0).toLocaleString('ko-KR')
const fileCount = computed(() => 1)
</script>

<template>
  <div class="q-pa-md">
    <div class="banner q-mb-md">
      <b>Step 0 — 종합 선물세트</b> · 파일 {{ fileCount }}개 ·
      화면 + 계산 + 데이터가 전부 이 파일 안에 있다
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
