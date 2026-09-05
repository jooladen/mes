<script setup>
/**
 * F3 출하성적서 발행 — F3 design §1 흐름
 *
 *   [1] 발행 가능 Lot 목록 (LOT_STATUS='OK' 만, §2)
 *        ↓ 선택
 *   [2] 미리보기 데이터 조회 (§9.2)      ← 아직 발행이 아니다. 번호가 없다
 *        ↓ 고객사·출하수량·발행자 입력 (§6)
 *   [3] 발행 (§9.3)                      ← 여기서 번호가 나간다
 *        ↓
 *   [4] 인쇄 / PDF — window.print() (§5)
 *
 * [2]와 [3]이 분리된 이유(§1): 미리보기만 하고 닫으면 성적서 번호가 낭비되고
 * 이력에 유령 행이 남는다. **발행 버튼을 눌러야 번호가 나간다.**
 */
import { computed, onMounted, ref } from 'vue'
import CodeSelect from '@/components/CodeSelect.vue'
import CoaSheet from '@/components/CoaSheet.vue'
import { fetchUserList } from '@/api/common'
import {
  fetchCoaPrintData,
  fetchCoaTargetList,
  fetchItemList,
  issueCoa
} from '@/api/quality'

const items = ref([])
const users = ref([])

// §2.1 조회 조건 (D31) — 기간은 양쪽 다 필수다 (D1)
const fromDt = ref('2026-09-01')
const toDt = ref('2026-09-30')
const itemCd = ref(null)

const targets = ref([])
const selectedLotNo = ref(null)

// §6 발행 직전 입력
const custNm = ref('')
const shipQty = ref(null)
const issueUserId = ref(null)

const preview = ref(null) // §9.2 응답
const issued = ref(null) // §9.3 응답 — 있으면 발행 완료 상태
const loading = ref(false)
const issuing = ref(false)
const topError = ref(null)

const selectedTarget = computed(
  () => targets.value.find((t) => t.lotNo === selectedLotNo.value) ?? null
)
const userNmOf = (id) => users.value.find((u) => u.userId === id)?.userNm ?? null

/** CoaSheet 가 받는 모양으로 정규화한다. 발행 전/후 둘 다 같은 컴포넌트가 그린다. */
const sheet = computed(() => {
  if (issued.value) {
    return { ...issued.value, issueUserNm: userNmOf(issued.value.issueUserId) }
  }
  if (!preview.value) return null
  return {
    ...preview.value,
    coaNo: null, // §1 — 발행 전에는 번호가 없다
    issueDt: null,
    custNm: custNm.value,
    shipQty: shipQty.value,
    issueUserNm: userNmOf(issueUserId.value)
  }
})

const columns = [
  { name: 'lotNo', label: 'Lot No.', field: 'lotNo', align: 'left' },
  { name: 'itemNm', label: '품목', field: 'itemNm', align: 'left' },
  { name: 'goodQty', label: '양품수량', field: 'goodQty', align: 'right' },
  { name: 'judgeDt', label: '판정일시', field: 'judgeDt', align: 'left' },
  { name: 'issuedCount', label: '발행', field: 'issuedCount', align: 'center' }
]

async function search() {
  topError.value = null
  preview.value = null
  issued.value = null
  selectedLotNo.value = null
  loading.value = true
  try {
    targets.value = await fetchCoaTargetList(fromDt.value, toDt.value, itemCd.value)
  } catch (e) {
    targets.value = []
    topError.value = e.errorMessage ?? e.message
  } finally {
    loading.value = false
  }
}

/** [2] 미리보기 — 아직 발행이 아니다. */
async function loadPreview(lotNo) {
  topError.value = null
  issued.value = null
  selectedLotNo.value = lotNo
  try {
    preview.value = await fetchCoaPrintData(lotNo)
    // 출하수량 기본값은 양품수량. 상한이기도 하다 (§6.1)
    shipQty.value = preview.value.goodQty
  } catch (e) {
    preview.value = null
    topError.value = e.errorMessage ?? e.message
  }
}

/** [3] 발행 — 여기서 번호가 나간다. */
async function issue() {
  topError.value = null
  issuing.value = true
  try {
    issued.value = await issueCoa(
      selectedLotNo.value,
      custNm.value,
      shipQty.value,
      issueUserId.value
    )
    // 목록의 기발행 건수를 갱신한다 — 재발행 여부가 바로 보여야 한다 (§4.2)
    const t = targets.value.find((x) => x.lotNo === selectedLotNo.value)
    if (t) t.issuedCount += 1
  } catch (e) {
    topError.value = e.errorMessage ?? e.message
  } finally {
    issuing.value = false
  }
}

/** [4] 인쇄 — 브라우저 인쇄. `.no-print` 가 화면 요소를 지운다 (§5.1) */
const print = () => window.print()

onMounted(async () => {
  try {
    const [itemRes, userRes] = await Promise.all([fetchItemList('Y'), fetchUserList('Y')])
    items.value = itemRes
    users.value = userRes
  } catch (e) {
    topError.value = e.errorMessage ?? e.message
  }
  await search()
})
</script>

<template>
  <div class="q-pa-md coa-page">
    <div class="no-print">
      <div class="text-h6 q-mb-xs">
        출하성적서 발행 <span class="text-caption text-grey">F3</span>
      </div>
      <div class="text-caption text-grey q-mb-md">
        미리보기는 아직 발행이 아니다 — <b>[발행]을 눌러야 번호가 나간다</b> (§1).
        발행 후에는 규격·실적을 다시 보지 않는다. 스냅샷이 진실이다 (§3).
      </div>

      <!-- §2.1 조회 조건 화면 (D31) -->
      <q-card flat bordered class="q-pa-md q-mb-md">
        <div class="row q-col-gutter-md items-center">
          <div class="col-6 col-md-2">
            <q-input v-model="fromDt" type="date" outlined dense label="판정일 시작" />
          </div>
          <div class="col-6 col-md-2">
            <q-input v-model="toDt" type="date" outlined dense label="판정일 종료" />
          </div>
          <div class="col-12 col-md-3">
            <CodeSelect
              v-model="itemCd"
              :options="items"
              code-key="itemCd"
              name-key="itemNm"
              first-option="all"
              label="품목"
              dense
            />
          </div>
          <div class="col-auto">
            <q-btn color="primary" label="조회" no-caps :loading="loading" @click="search" />
          </div>
          <div class="col-auto text-caption text-grey">
            합격(<code>LOT_STATUS='OK'</code>) Lot만 목록에 오른다 —
            버튼 비활성이 아니라 <b>애초에 고를 수 없다</b> (§2).
          </div>
        </div>
      </q-card>

      <q-banner v-if="topError" class="bg-negative text-white q-mb-sm">{{ topError }}</q-banner>

      <!-- 대상 Lot 그리드 (§2.1) -->
      <q-table
        :rows="targets"
        :columns="columns"
        row-key="lotNo"
        flat
        bordered
        dense
        hide-pagination
        :rows-per-page-options="[0]"
        :loading="loading"
        class="q-mb-md"
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            :class="props.row.lotNo === selectedLotNo ? 'row-picked' : ''"
            @click="loadPreview(props.row.lotNo)"
          >
            <q-td key="lotNo" :props="props" class="num">{{ props.row.lotNo }}</q-td>
            <q-td key="itemNm" :props="props">
              {{ props.row.itemNm }}
              <span class="text-grey num q-ml-xs">{{ props.row.itemCd }}</span>
            </q-td>
            <q-td key="goodQty" :props="props" class="num">
              {{ props.row.goodQty }} {{ props.row.itemUnitCd }}
            </q-td>
            <q-td key="judgeDt" :props="props" class="num">
              {{ String(props.row.judgeDt).replace('T', ' ') }}
            </q-td>
            <q-td key="issuedCount" :props="props">
              <q-badge v-if="props.row.issuedCount > 0" color="warning" text-color="black">
                재발행 {{ props.row.issuedCount }}
              </q-badge>
              <span v-else class="text-grey">—</span>
            </q-td>
          </q-tr>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-md text-grey">
            발행 가능한 Lot이 없습니다. 검사에서 <b>전 항목 합격</b>이 나야 목록에 오릅니다 (F2 §1.4).
          </div>
        </template>
      </q-table>

      <!-- §6 고객사·출하수량·발행자 -->
      <q-card v-if="preview && !issued" flat bordered class="q-pa-md q-mb-md">
        <div class="text-subtitle2 q-mb-sm">발행 정보 입력 (§6)</div>
        <div class="row q-col-gutter-md items-start">
          <div class="col-12 col-md-4">
            <q-input v-model="custNm" outlined dense label="고객사명 *" />
          </div>
          <div class="col-6 col-md-3">
            <q-input
              v-model.number="shipQty"
              type="number"
              outlined
              dense
              label="출하수량 *"
              :hint="`양품수량 ${preview.goodQty} 이하 (§6.1)`"
            />
          </div>
          <div class="col-12 col-md-3">
            <!-- D38 — §9.3 issueUserId 의 생산자 -->
            <CodeSelect
              v-model="issueUserId"
              :options="users"
              code-key="userId"
              name-key="userNm"
              label="발행자 *"
              dense
            />
          </div>
          <div class="col-auto">
            <q-btn
              color="primary"
              icon="post_add"
              label="발행"
              no-caps
              :loading="issuing"
              :disable="!custNm || shipQty === null || !issueUserId"
              @click="issue"
            />
          </div>
        </div>
      </q-card>

      <!-- 발행 완료 -->
      <q-banner v-if="issued" class="bg-positive text-white q-mb-md">
        <div class="row items-center">
          <div>
            발행했습니다 — <b class="num">{{ issued.coaNo }}</b>
            <span class="q-ml-sm">이 번호로만 재조회할 수 있습니다 (D30).</span>
          </div>
          <q-space />
          <q-btn flat no-caps icon="print" label="인쇄 / PDF" @click="print" />
        </div>
      </q-banner>

      <div v-if="preview && !issued" class="text-caption text-grey q-mb-sm">
        아래는 <b>미리보기</b>입니다. 성적서번호와 발행일자가 비어 있습니다 — 아직 번호가 없습니다.
      </div>
    </div>

    <!-- 인쇄 대상. 이 컴포넌트만 종이에 남는다 (§5.1) -->
    <CoaSheet v-if="sheet" :sheet="sheet" />
  </div>
</template>

<style scoped>
.coa-page {
  max-width: 1100px;
  margin: 0 auto;
}
.num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}
:deep(.row-picked) > td {
  background: rgba(74, 122, 181, 0.18);
}
</style>
