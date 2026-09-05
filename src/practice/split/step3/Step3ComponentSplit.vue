<script setup>
/**
 * Step 3 — 화면 조각 분리.
 *
 * 명세서 표를 OrderSheet.vue 로 떼어내고, 이 화면에서 **두 번** 쓴다.
 * 안 떼어냈으면 표 HTML 60줄을 그대로 복사해야 했다.
 * 그리고 칸 하나 바꿀 때마다 두 곳을 고쳐야 했을 것이다.
 */
import { ref, onMounted } from 'vue'
import { fetchOrderList, fetchOrder } from './ordersApi'
import OrderSheet from './OrderSheet.vue'

const options = ref([])
const leftNo = ref(null)
const rightNo = ref(null)
const left = ref(null)
const right = ref(null)

function loadLeft() {
  left.value = leftNo.value ? fetchOrder(leftNo.value) : null
}
function loadRight() {
  right.value = rightNo.value ? fetchOrder(rightNo.value) : null
}

onMounted(() => {
  options.value = fetchOrderList()
  leftNo.value = options.value[0]?.orderNo ?? null
  rightNo.value = options.value[1]?.orderNo ?? null
  loadLeft()
  loadRight()
})
</script>

<template>
  <div class="q-pa-md">
    <div class="banner q-mb-md">
      <b>Step 3 — 화면 조각 분리</b> · 파일 4개 ·
      같은 <code>OrderSheet.vue</code> 를 <b>두 번</b> 쓴다. 안 떼어냈으면 표 HTML 을 복사해야 했다
    </div>

    <div class="row q-col-gutter-md q-mb-md">
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
    </div>

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
