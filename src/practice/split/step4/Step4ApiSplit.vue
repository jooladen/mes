<script setup>
/**
 * Step 4 — 통신 층 분리. MES 와 같은 4층 구조가 됐다.
 *
 * 화면 → 주소록(ordersApi) → 서버(http) → 데이터(seed)
 *
 * 달라진 것: 서버를 부르니 기다려야 한다 → await, 로딩 표시, 에러 처리가 생겼다.
 * 이 셋은 전부 "화면의 사정"이다. 업무 규칙이 아니다.
 */
import { ref, onMounted } from 'vue'
import { fetchOrderList, fetchOrder } from './ordersApi'
import OrderSheet from './OrderSheet.vue'

const options = ref([])
const leftNo = ref(null)
const rightNo = ref(null)
const left = ref(null)
const right = ref(null)
const loading = ref(false)
const errorMsg = ref('')

async function loadLeft() {
  if (!leftNo.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    left.value = await fetchOrder(leftNo.value)
  } catch (e) {
    errorMsg.value = `${e.code}: ${e.message}`
    left.value = null
  } finally {
    loading.value = false
  }
}

async function loadRight() {
  if (!rightNo.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    right.value = await fetchOrder(rightNo.value)
  } catch (e) {
    errorMsg.value = `${e.code}: ${e.message}`
    right.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  options.value = await fetchOrderList()
  leftNo.value = options.value[0]?.orderNo ?? null
  rightNo.value = options.value[1]?.orderNo ?? null
  await loadLeft()
  await loadRight()
})
</script>

<template>
  <div class="q-pa-md">
    <div class="banner q-mb-md">
      <b>Step 4 — 통신 층 분리</b> · 파일 5개 · MES 와 같은 4층 ·
      <code>await</code> 가 생겼다 = 여기부터 서버
    </div>

    <div class="row q-col-gutter-md q-mb-md items-center">
      <q-select
        v-model="leftNo"
        :options="options"
        option-value="orderNo"
        option-label="label"
        emit-value
        map-options
        dense
        outlined
        label="왼쪽 명세서"
        style="min-width: 300px"
        @update:model-value="loadLeft"
      />
      <q-select
        v-model="rightNo"
        :options="options"
        option-value="orderNo"
        option-label="label"
        emit-value
        map-options
        dense
        outlined
        label="오른쪽 명세서"
        style="min-width: 300px"
        @update:model-value="loadRight"
      />
      <q-spinner v-if="loading" size="24px" color="primary" />
      <span v-if="loading" class="text-caption text-grey">서버 응답 대기…</span>
    </div>

    <q-banner v-if="errorMsg" dense class="bg-red-9 text-white q-mb-md">
      {{ errorMsg }}
    </q-banner>

    <div class="row q-col-gutter-md">
      <OrderSheet v-if="left" :sheet="left" />
      <OrderSheet v-if="right" :sheet="right" />
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
}
.banner code {
  background: #1c2735;
  padding: 1px 5px;
  border-radius: 3px;
}
</style>
