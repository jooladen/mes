<script setup>
/**
 * F1 품질규격 등록 — F1 design §2
 *
 * 그리드는 **Quasar `q-table` 편집 모드**다. RealGrid2 는 F4 전용 —
 * 기준정보 CRUD 에 상용 그리드를 쓸 이유가 없다 (§2).
 *
 * 저장은 **전체 목록 일괄**이다 (§3). 행 단위 저장을 쓰지 않는 이유는
 * "저장 실패 시 부분 저장이 남지 않는다"(Plan NFR)를 만족하기 위해서다.
 *
 * 검증은 **하지 않는다.** §4 가 "서버가 1차 방어선"이라고 못박았으므로
 * 화면은 §9.3 이 돌려준 `errors[]` 를 그리기만 한다. 같은 규칙을 두 벌 두면
 * 어긋나는 순간 어느 쪽이 진실인지 알 수 없다.
 */
import { computed, onMounted, ref } from 'vue'
import CodeSelect from '@/components/CodeSelect.vue'
import {
  JUDGE_TYPE_OPTIONS,
  applyJudgeTypeRule,
  fetchItemList,
  fetchSpecList,
  isLslEnabled,
  isUslEnabled,
  saveSpecList
} from '@/api/quality'

const items = ref([])
const itemCd = ref(null)

const rows = ref([])
const selected = ref([])
const loading = ref(false)
const saving = ref(false)

// §9.3 이 돌려준 행 단위 오류. rowIndex 로 행과 이어진다 (F0 design §8.2 N6).
const rowErrors = ref([])
const topError = ref(null)
const savedMsg = ref(null)

// 새 행을 화면에서 구분하기 위한 클라이언트 전용 키.
// 요청에는 실리지 않는다 — 서버 계약(§9.3)에 없는 키다.
let seq = 0
const newKey = () => `r${++seq}`

const errorsByRow = computed(() => {
  const map = new Map()
  for (const e of rowErrors.value) {
    if (!map.has(e.rowIndex)) map.set(e.rowIndex, [])
    map.get(e.rowIndex).push(e)
  }
  return map
})

/**
 * 품목을 고르지 않은 상태 = "전체" (D40).
 * 조회는 되지만 **편집은 막는다** — §9.3 저장이 `ITEM_CD` 단위 delete-insert 라,
 * 여러 품목이 섞인 목록을 통째로 보내면 어느 품목을 교체할지 정할 수 없다.
 */
const isAllItems = computed(() => !itemCd.value)

// 조회 결과가 실제로 전 품목인지. 조회 후 콤보만 바꿔도 그리드는 그대로여야 하므로
// 버튼 잠금은 "무엇을 조회했는가"가 아니라 "지금 무엇을 저장할 수 있는가"로 판단한다.
const editable = computed(() => !isAllItems.value)

const itemNmByCd = computed(() => {
  const map = new Map()
  for (const it of items.value) map.set(it.itemCd, it.itemNm)
  return map
})

const ITEM_COLUMN = {
  name: 'itemCd', label: '품목', field: 'itemCd', align: 'left', style: 'width:150px'
}

const baseColumns = [
  { name: 'sortNo', label: '순번', field: 'sortNo', align: 'right', style: 'width:74px' },
  { name: 'inspItemCd', label: '항목코드', field: 'inspItemCd', align: 'left', style: 'width:120px' },
  { name: 'inspItemNm', label: '항목명', field: 'inspItemNm', align: 'left', style: 'width:160px' },
  { name: 'unitCd', label: '단위', field: 'unitCd', align: 'left', style: 'width:96px' },
  { name: 'judgeType', label: '판정', field: 'judgeType', align: 'left', style: 'width:130px' },
  { name: 'lsl', label: '하한', field: 'lsl', align: 'right', style: 'width:110px' },
  { name: 'usl', label: '상한', field: 'usl', align: 'right', style: 'width:110px' },
  { name: 'decimalLen', label: '소수', field: 'decimalLen', align: 'right', style: 'width:80px' }
]

// 전 품목을 볼 때만 품목 열을 붙인다. 품목 하나를 조회한 화면에서는
// 같은 값이 모든 행에 반복돼 자리만 먹는다.
const columns = computed(() =>
  isAllItems.value ? [ITEM_COLUMN, ...baseColumns] : baseColumns
)

function clearMessages() {
  rowErrors.value = []
  topError.value = null
  savedMsg.value = null
}

async function load() {
  clearMessages()
  loading.value = true
  try {
    const list = await fetchSpecList(itemCd.value)
    rows.value = list.map((r) => ({ ...r, _key: newKey() }))
    selected.value = []
  } catch (e) {
    topError.value = e.errorMessage ?? e.message
  } finally {
    loading.value = false
  }
}

function addRow() {
  clearMessages()
  const maxSort = rows.value.reduce((m, r) => Math.max(m, Number(r.sortNo) || 0), 0)
  rows.value.push({
    _key: newKey(),
    itemCd: itemCd.value,
    inspItemCd: '',
    inspItemNm: '',
    unitCd: '',
    judgeType: 'RANGE',
    lsl: null,
    usl: null,
    decimalLen: 2,
    sortNo: maxSort + 1
  })
}

function removeRows() {
  clearMessages()
  const dead = new Set(selected.value.map((r) => r._key))
  rows.value = rows.value.filter((r) => !dead.has(r._key))
  selected.value = []
}

function onJudgeTypeChange(row) {
  // §2.1 — 비활성 필드는 즉시 null 로 지운다
  applyJudgeTypeRule(row)
}

/** 숫자 입력칸은 문자열을 준다. 빈 문자열은 null 로 보낸다 — 0 과 구분해야 한다. */
const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

async function save() {
  if (!itemCd.value) return
  clearMessages()
  saving.value = true
  try {
    // 클라이언트 전용 키(_key)는 빼고 보낸다. 계약(§9.3)에 없는 키다.
    const specList = rows.value.map((r) => ({
      inspItemCd: r.inspItemCd,
      inspItemNm: r.inspItemNm,
      unitCd: r.unitCd === '' ? null : r.unitCd,
      judgeType: r.judgeType,
      lsl: toNum(r.lsl),
      usl: toNum(r.usl),
      decimalLen: toNum(r.decimalLen),
      sortNo: toNum(r.sortNo)
    }))
    const res = await saveSpecList(itemCd.value, specList)
    // 재조회가 먼저다. load() 가 맨 앞에서 메시지를 지우므로,
    // 성공 메시지를 그 전에 세팅하면 사용자가 볼 새도 없이 사라진다.
    await load()
    savedMsg.value = `저장했습니다. ${res.savedCount}건`
  } catch (e) {
    if (e.errors) {
      // 행 단위 오류 — 최상위는 항상 VALIDATION_FAILED (F0 design §8.2)
      rowErrors.value = e.errors
      topError.value = `${e.errorMessage} (${e.errors.length}건)`
    } else {
      topError.value = e.errorMessage ?? e.message
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    items.value = await fetchItemList('Y')
  } catch (e) {
    topError.value = e.errorMessage ?? e.message
  }
})
</script>

<template>
  <div class="q-pa-md spec-page">
    <div class="text-h6 q-mb-xs">품질규격 등록 <span class="text-caption text-grey">F1</span></div>
    <div class="text-caption text-grey q-mb-md">
      품목별 검사항목과 합격 범위. F2 판정과 F3 성적서 규격 표기의 원천이다.
    </div>

    <!-- 검색 영역 (§2) -->
    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="row items-center q-gutter-sm">
        <!--
          first-option="all" — 품목을 고르지 않아도 조회할 수 있어야 한다.
          이게 없으면 화면을 열자마자 [조회]가 비활성이고, 왜 안 눌리는지
          화면이 말해주지 않아 고장으로 보인다.
        -->
        <CodeSelect
          v-model="itemCd"
          :options="items"
          code-key="itemCd"
          name-key="itemNm"
          first-option="all"
          label="품목"
          dense
          style="min-width: 280px"
        />
        <q-btn color="primary" label="조회" :loading="loading" no-caps @click="load" />
      </div>
    </q-card>

    <q-banner v-if="topError" class="bg-negative text-white q-mb-sm">
      {{ topError }}
    </q-banner>
    <q-banner v-if="savedMsg" class="bg-positive text-white q-mb-sm">
      {{ savedMsg }}
    </q-banner>

    <q-table
      :rows="rows"
      :columns="columns"
      row-key="_key"
      flat
      bordered
      dense
      hide-pagination
      :rows-per-page-options="[0]"
      selection="multiple"
      v-model:selected="selected"
      :loading="loading"
      class="spec-grid"
    >
      <template #top>
        <div class="text-subtitle2">검사항목 목록</div>
        <!-- 왜 버튼이 잠겼는지 **텍스트로** 알려준다. 회색 버튼만 두면 고장으로 보인다. -->
        <div v-if="!editable" class="text-caption text-grey q-ml-md">
          전체 조회는 <b>읽기 전용</b>입니다 — 편집하려면 품목을 하나 고르세요.
        </div>
        <q-space />
        <q-btn dense no-caps outline icon="add" label="행추가"
               :disable="!editable" @click="addRow" />
        <q-btn dense no-caps outline icon="remove" label="행삭제" class="q-ml-sm"
               :disable="!editable || !selected.length" @click="removeRows" />
        <q-btn dense no-caps color="primary" icon="save" label="저장" class="q-ml-sm"
               :disable="!editable" :loading="saving" @click="save" />
      </template>

      <template #body="props">
        <q-tr :props="props" :class="errorsByRow.has(props.rowIndex) ? 'row-error' : ''">
          <q-td>
            <q-checkbox v-model="props.selected" dense :disable="!editable" />
          </q-td>

          <!-- 전 품목 조회일 때만 나타난다 (D40). 어느 품목 규격인지 알아야 읽을 수 있다. -->
          <q-td v-if="isAllItems" key="itemCd" :props="props">
            <span class="num">{{ props.row.itemCd }}</span>
            <span class="text-grey q-ml-xs">{{ itemNmByCd.get(props.row.itemCd) ?? '' }}</span>
          </q-td>

          <q-td key="sortNo" :props="props">
            <q-input v-model="props.row.sortNo" type="number" dense borderless
                     :readonly="!editable" input-class="text-right num" />
          </q-td>
          <q-td key="inspItemCd" :props="props">
            <q-input v-model="props.row.inspItemCd" dense borderless
                     :readonly="!editable" input-class="num" />
          </q-td>
          <q-td key="inspItemNm" :props="props">
            <q-input v-model="props.row.inspItemNm" dense borderless :readonly="!editable" />
          </q-td>
          <q-td key="unitCd" :props="props">
            <!-- 측정 단위. 재고 단위(itemUnitCd)와 다른 개념이다 — §8 D2 -->
            <q-input v-model="props.row.unitCd" dense borderless :readonly="!editable" />
          </q-td>
          <q-td key="judgeType" :props="props">
            <q-select
              v-model="props.row.judgeType"
              :options="JUDGE_TYPE_OPTIONS"
              emit-value
              map-options
              dense
              borderless
              :readonly="!editable"
              @update:model-value="onJudgeTypeChange(props.row)"
            />
          </q-td>
          <q-td key="lsl" :props="props">
            <q-input
              v-if="isLslEnabled(props.row.judgeType)"
              v-model="props.row.lsl" type="number" dense borderless
              :readonly="!editable" input-class="text-right num"
            />
            <!-- §2.1 — 비활성은 입력칸 자체를 없앤다. 회색 처리만 하면 값이 남는다 -->
            <span v-else class="text-grey-6">—</span>
          </q-td>
          <q-td key="usl" :props="props">
            <q-input
              v-if="isUslEnabled(props.row.judgeType)"
              v-model="props.row.usl" type="number" dense borderless
              :readonly="!editable" input-class="text-right num"
            />
            <span v-else class="text-grey-6">—</span>
          </q-td>
          <q-td key="decimalLen" :props="props">
            <q-input v-model="props.row.decimalLen" type="number" dense borderless
                     :readonly="!editable" input-class="text-right num" />
          </q-td>
        </q-tr>

        <!--
          §8.1 접근성 — 검증 오류는 색상뿐 아니라 **텍스트로도** 표시한다 (색맹 대응).
          행 바로 아래에 붙여 어느 행인지 눈으로 잇는다.
        -->
        <q-tr v-if="errorsByRow.has(props.rowIndex)" :key="props.row._key + '-err'">
          <q-td :colspan="columns.length + 1" class="err-cell">

            <div v-for="(e, i) in errorsByRow.get(props.rowIndex)" :key="i">
              <q-icon name="error_outline" size="16px" class="q-mr-xs" />
              <b>{{ props.rowIndex + 1 }}행 · {{ e.field }}</b> — {{ e.message }}
              <span class="text-grey-6 q-ml-xs">[{{ e.code }}]</span>
            </div>
          </q-td>
        </q-tr>
      </template>

      <template #no-data>
        <div class="full-width text-center q-pa-md text-grey">
          {{ itemCd
            ? '등록된 검사항목이 없습니다. [행추가] 로 시작하세요.'
            : '[조회] 를 누르면 전 품목 규격을 볼 수 있습니다. 편집하려면 품목을 하나 고르세요.' }}
        </div>
      </template>
    </q-table>

    <div class="text-caption text-grey q-mt-sm">
      순번(<span class="num">sortNo</span>)이 <b>그대로 CoA 인쇄 순서</b>가 된다 (F3 FR-04).
      저장은 <b>목록 전체</b>를 보낸다 — 행 단위 저장이 아니다 (§3).
    </div>
  </div>
</template>

<style scoped>
.spec-page {
  max-width: 1100px;
  margin: 0 auto;
}
.spec-grid :deep(.q-field__control) {
  min-height: 30px;
}
.spec-grid :deep(.row-error > td) {
  background: var(--state-deleted-bg);
}
.err-cell {
  color: var(--state-deleted);
  font-size: 12px;
  white-space: normal;
}
</style>
