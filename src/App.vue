<script setup>
/**
 * 화면 전환.
 *
 * `vue-router` 를 넣지 않는다 — F0 design §2 스택 표에 없고, 지금 필요한 것은
 * "화면을 오가는 것"뿐이라 좌측 메뉴 하나로 충분하다. URL 공유·뒤로가기가
 * 실제로 필요해지는 시점(발행 이력 딥링크 등)에 라우터를 넣는다.
 *
 * 화면이 늘어 상단 탭이 좁은 노트북에서 넘쳤다 → 좌측 서랍 + 카테고리 2개로.
 */
import { computed, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import DevSandboxPage from '@/pages/DevSandboxPage.vue'
import QualitySpecPage from '@/pages/QualitySpecPage.vue'
import InspectionPopPage from '@/pages/InspectionPopPage.vue'
import CoaPrintPage from '@/pages/CoaPrintPage.vue'
import QualityPivotPage from '@/pages/QualityPivotPage.vue'
import OrderPage from '@/practice/OrderPage.vue'
import Step0AllInOne from '@/practice/split/Step0AllInOne.vue'
import Step1DataSplit from '@/practice/split/step1/Step1DataSplit.vue'
import Step2LogicSplit from '@/practice/split/step2/Step2LogicSplit.vue'
import Step3ComponentSplit from '@/practice/split/step3/Step3ComponentSplit.vue'
import Step4ApiSplit from '@/practice/split/step4/Step4ApiSplit.vue'

const GROUPS = [
  {
    title: 'MES 출하성적서',
    items: [
      { name: 'spec', label: 'F1 품질규격', icon: 'rule', component: QualitySpecPage },
      { name: 'insp', label: 'F2 검사실적', icon: 'fact_check', component: InspectionPopPage },
      { name: 'coa', label: 'F3 성적서 발행', icon: 'description', component: CoaPrintPage },
      { name: 'pivot', label: 'F4 품질피벗', icon: 'grid_on', component: QualityPivotPage },
      { name: 'sandbox', label: 'F0 컴포넌트 검증', icon: 'science', component: DevSandboxPage }
    ]
  },
  {
    title: '연습 — 거래명세서',
    items: [
      { name: 'order', label: '거래명세서', icon: 'receipt_long', component: OrderPage },
      { name: 'split0', label: 'Step0 한덩어리', icon: 'inventory_2', component: Step0AllInOne },
      { name: 'split1', label: 'Step1 데이터분리', icon: 'inventory_2', component: Step1DataSplit },
      { name: 'split2', label: 'Step2 계산분리', icon: 'inventory_2', component: Step2LogicSplit },
      {
        name: 'split3',
        label: 'Step3 화면조각분리',
        icon: 'inventory_2',
        component: Step3ComponentSplit
      },
      { name: 'split4', label: 'Step4 통신층분리', icon: 'cloud', component: Step4ApiSplit }
    ]
  }
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

const current = ref('pivot')
const currentComponent = computed(
  () => ALL_ITEMS.find((p) => p.name === current.value).component
)
</script>

<template>
  <MainLayout>
    <template #nav>
      <q-list padding>
        <template v-for="g in GROUPS" :key="g.title">
          <q-item-label header class="text-weight-bold">{{ g.title }}</q-item-label>
          <q-item
            v-for="p in g.items"
            :key="p.name"
            v-ripple
            clickable
            dense
            :active="current === p.name"
            active-class="menu-active"
            @click="current = p.name"
          >
            <q-item-section avatar>
              <q-icon :name="p.icon" size="20px" />
            </q-item-section>
            <q-item-section>{{ p.label }}</q-item-section>
          </q-item>
        </template>
      </q-list>
    </template>

    <!-- keep-alive 를 쓰지 않는다: 화면을 옮기면 초기 상태로 돌아가는 게 맞다.
         편집 중이던 그리드가 살아 있으면 저장 안 한 값을 저장한 걸로 착각한다. -->
    <component :is="currentComponent" />
  </MainLayout>
</template>

<style scoped>
.menu-active {
  color: var(--q-primary);
  font-weight: 600;
  background: rgba(74, 158, 255, 0.12);
}
</style>
