<script setup>
/**
 * F2 검사실적 입력 — 현장 POP (F2 design §3)
 *
 * 판정은 **이중**이다 (§2):
 *   [화면] 입력 즉시 JS 계산 → 색·문구 즉시 표시   ← 사용자 편의. 신뢰하지 않는다
 *   [서버] 저장 시 재계산 → DB 기록                ← 최종 진실
 * 저장 응답이 오면 **서버 판정으로 화면을 덮어쓴다.** 둘이 다르면 눈에 보인다.
 *
 * §3.1 현장 UI 치수: 입력칸 56×56px / 저장 버튼 높이 64px·폭 40% / 측정값 20px /
 * 요소 간격 12px. 장갑 낀 손으로 조작하는 화면이다.
 */
import { computed, onMounted, ref } from 'vue'
import CodeSelect from '@/components/CodeSelect.vue'
import { fetchUserList } from '@/api/common'
import {
  fetchInspectList,
  fetchLotList,
  saveInspectResult
} from '@/api/quality'
import { formatMeasured, formatSpecRange } from '@/utils/specFormat'
import {
  JUDGE_RESULT,
  LOT_STATUS_LABEL,
  judge,
  total
} from '@/utils/specJudgeClient'

const lots = ref([])
const users = ref([])
const lotNo = ref(null)
const inspUserId = ref(null)

const header = ref(null) // §9.2 응답의 헤더부
const rows = ref([]) // inspList + 화면 입력값
const loading = ref(false)
const saving = ref(false)
const topError = ref(null)
const rowErrors = ref([])
const savedMsg = ref(null)

/** Lot 콤보에 상태를 함께 보여준다 — 4개 상태가 다 오므로(D41) 구분이 필요하다. */
const lotOptions = computed(() =>
  lots.value.map((l) => ({
    lotNo: l.lotNo,
    label: `${l.lotNo} · ${l.itemNm} · ${LOT_STATUS_LABEL[l.lotStatus] ?? l.lotStatus}`
  }))
)

const selectedLot = computed(() => lots.value.find((l) => l.lotNo === lotNo.value) ?? null)

const errorsByRow = computed(() => {
  const map = new Map()
  for (const e of rowErrors.value) {
    if (!map.has(e.rowIndex)) map.set(e.rowIndex, [])
    map.get(e.rowIndex).push(e)
  }
  return map
})

/**
 * 화면 즉시 판정 (§2 1순위는 아니다 — 서버가 최종).
 * 입력값이 비면 NONE. **0 과 구분한다** (Plan FR-08).
 */
function clientJudge(row) {
  return judge(row._input, row.judgeType, row.lsl, row.usl)
}

/** 화면 기준 종합판정. 저장 전 미리보기용이다. */
const clientTotal = computed(() => total(rows.value.map((r) => clientJudge(r))))

const JUDGE_VIEW = {
  PASS: { icon: 'check_circle', text: 'PASS', cls: 'j-pass' },
  FAIL: { icon: 'cancel', text: 'FAIL', cls: 'j-fail' },
  NONE: { icon: 'remove', text: '미검사', cls: 'j-none' }
}

function clearMessages() {
  topError.value = null
  rowErrors.value = []
  savedMsg.value = null
}

async function load() {
  if (!lotNo.value) return
  clearMessages()
  loading.value = true
  try {
    const res = await fetchInspectList(lotNo.value)
    header.value = res
    // `_input` 은 화면 전용이다. 저장된 측정값을 초기값으로 넣어 재검사 시 바로 고칠 수 있게 한다.
    rows.value = res.inspList.map((r) => ({ ...r, _input: r.measuredVal }))
  } catch (e) {
    header.value = null
    rows.value = []
    topError.value = e.errorMessage ?? e.message
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!lotNo.value) return
  clearMessages()
  saving.value = true
  try {
    // **입력한 항목만** 보낸다 (§9.3). 미입력 항목은 보내지 않는다.
    const resultList = rows.value
      .filter((r) => r._input !== null && r._input !== undefined && r._input !== '')
      .map((r) => ({
        inspItemCd: r.inspItemCd,
        measuredVal: Number(r._input),
        remark: r.remark ?? null
      }))

    const res = await saveInspectResult(lotNo.value, inspUserId.value, resultList)

    // 서버 판정으로 화면을 덮어쓴다 (§2). 프론트 계산과 다르면 여기서 값이 바뀐다.
    header.value = { ...header.value, lotStatus: res.lotStatus, totalJudge: res.totalJudge }
    const byCd = new Map(res.resultList.map((r) => [r.inspItemCd, r]))
    rows.value = rows.value.map((r) => {
      const s = byCd.get(r.inspItemCd)
      if (!s) return { ...r, judgeResult: JUDGE_RESULT.NONE }
      return {
        ...r,
        inspSeq: s.inspSeq,
        measuredVal: s.measuredVal,
        judgeResult: s.judgeResult,
        inspDt: s.inspDt,
        inspUserId: s.inspUserId,
        remark: s.remark,
        _input: s.measuredVal
      }
    })
    // Lot 목록의 상태도 갱신한다 — 콤보 라벨이 stale 이면 방금 바뀐 상태가 안 보인다
    const lot = lots.value.find((l) => l.lotNo === lotNo.value)
    if (lot) {
      lot.lotStatus = res.lotStatus
      lot.totalJudge = res.totalJudge
    }
    savedMsg.value = `저장했습니다. 종합판정 ${res.totalJudge} · 상태 ${LOT_STATUS_LABEL[res.lotStatus]}`
  } catch (e) {
    if (e.errors) {
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
    const [lotRes, userRes] = await Promise.all([fetchLotList(), fetchUserList('Y')])
    lots.value = lotRes
    users.value = userRes
  } catch (e) {
    topError.value = e.errorMessage ?? e.message
  }
})
</script>

<template>
  <div class="q-pa-md pop-page">
    <div class="text-h6 q-mb-xs">검사실적 입력 <span class="text-caption text-grey">F2 · 현장 POP</span></div>
    <div class="text-caption text-grey q-mb-md">
      입력 즉시 화면이 판정하고, 저장하면 <b>서버가 다시 판정</b>한다. DB에 남는 값은 서버 판정이다 (§2).
    </div>

    <!-- 헤더: Lot ▼ / 검사자 ▼ — §3, D36 -->
    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <CodeSelect
            v-model="lotNo"
            :options="lotOptions"
            code-key="lotNo"
            name-key="label"
            label="Lot"
            @update:model-value="load"
          />
        </div>
        <div class="col-12 col-md-3">
          <!-- D36 — §9.3 inspUserId 의 생산자. F0 §9.3 user-list 를 CodeSelect 로 렌더 -->
          <CodeSelect
            v-model="inspUserId"
            :options="users"
            code-key="userId"
            name-key="userNm"
            label="검사자"
          />
        </div>
        <div v-if="header" class="col-12 col-md-3 text-caption">
          품목 <b>{{ header.itemNm }}</b><br />
          상태 <b>{{ LOT_STATUS_LABEL[header.lotStatus] }}</b>
          <span v-if="selectedLot" class="text-grey">
            · 양품 {{ selectedLot.goodQty }} / 불량 {{ selectedLot.scrapQty }}
          </span>
        </div>
      </div>
    </q-card>

    <q-banner v-if="topError" class="bg-negative text-white q-mb-sm">{{ topError }}</q-banner>
    <q-banner v-if="savedMsg" class="bg-positive text-white q-mb-sm">{{ savedMsg }}</q-banner>

    <div v-if="loading" class="text-grey q-pa-md">불러오는 중…</div>

    <div v-else-if="!header" class="text-grey q-pa-md">
      Lot 을 선택하세요. 검사대기·검사중·합격·불합격 Lot 을 모두 고를 수 있습니다 —
      불합격 Lot 은 재검사로 합격 복귀가 가능하고(§5), 합격 Lot 도 오입력 정정이 가능합니다(D23).
    </div>

    <template v-else>
      <q-markup-table flat bordered dense class="insp-grid">
        <thead>
          <tr>
            <th class="text-left">검사항목</th>
            <th class="text-left">규격</th>
            <th class="text-right">측정값</th>
            <th class="text-center">판정</th>
            <th class="text-left">비고</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(row, i) in rows" :key="row.inspItemCd">
            <tr :class="clientJudge(row) === 'FAIL' ? 'row-fail' : ''">
              <td class="text-left">
                <div class="item-nm">{{ row.inspItemNm }}</div>
                <div class="text-caption text-grey num">
                  {{ row.inspItemCd }}<span v-if="row.unitCd"> · {{ row.unitCd }}</span>
                </div>
              </td>
              <!-- §3.2 — 규격은 화면에서 조립한다. DB에서 문자열로 만들지 않는다 -->
              <td class="text-left num">{{ formatSpecRange(row) }}</td>
              <td class="text-right">
                <q-input
                  v-model="row._input"
                  type="number"
                  outlined
                  dense
                  input-class="text-right measured-input"
                  class="measured-field"
                />
                <div v-if="row.measuredVal !== null" class="text-caption text-grey num">
                  저장값 {{ formatMeasured(row.measuredVal, row.decimalLen) }}
                </div>
              </td>
              <!-- §3.1 — 판정을 **색으로만** 표시하지 않는다. 아이콘 + 텍스트를 함께 둔다 -->
              <td class="text-center">
                <div :class="['judge-cell', JUDGE_VIEW[clientJudge(row)].cls]">
                  <q-icon :name="JUDGE_VIEW[clientJudge(row)].icon" size="22px" />
                  <span class="judge-text">{{ JUDGE_VIEW[clientJudge(row)].text }}</span>
                </div>
              </td>
              <td class="text-left">
                <q-input v-model="row.remark" outlined dense placeholder="선택" />
              </td>
            </tr>
            <tr v-if="errorsByRow.has(i)">
              <td colspan="5" class="err-cell">
                <div v-for="(e, k) in errorsByRow.get(i)" :key="k">
                  <q-icon name="error_outline" size="16px" class="q-mr-xs" />
                  <b>{{ row.inspItemNm }}</b> — {{ e.message }}
                  <span class="text-grey-6 q-ml-xs">[{{ e.code }}]</span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </q-markup-table>

      <!-- 종합판정 + 저장 -->
      <div class="row items-center q-mt-md q-col-gutter-md">
        <div class="col-auto">
          <div class="text-caption text-grey">종합판정 (화면 계산)</div>
          <div :class="['total-judge', JUDGE_VIEW[clientTotal].cls]">
            <q-icon :name="JUDGE_VIEW[clientTotal].icon" size="28px" />
            <span>{{ JUDGE_VIEW[clientTotal].text }}</span>
          </div>
        </div>
        <div class="col-auto text-caption text-grey" style="max-width: 380px">
          <b>NONE 이 FAIL 보다 먼저다</b> (§1.3) — 미입력 항목이 하나라도 있으면 전체가
          미검사다. 검사하지 않은 항목을 통과시킨 성적서가 나가면 안 된다.
        </div>
        <q-space />
        <div class="col-auto">
          <q-btn
            color="primary"
            icon="save"
            label="저장"
            no-caps
            class="save-btn"
            :loading="saving"
            :disable="!inspUserId"
            @click="save"
          />
          <div v-if="!inspUserId" class="text-caption text-negative q-mt-xs">
            검사자를 선택해야 저장할 수 있습니다 (§9.3 필수).
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pop-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* §3.1 현장 UI 치수 — 장갑 낀 손 기준 */
.insp-grid :deep(td),
.insp-grid :deep(th) {
  padding: 12px; /* 요소 간격 12px 이상 */
}
.measured-field {
  min-width: 130px;
}
.measured-field :deep(.q-field__control) {
  min-height: 56px; /* 터치 영역 56×56px 이상 */
}
.measured-field :deep(.measured-input) {
  font-size: 20px; /* 공장 조명 환경 */
  font-family: var(--font-num);
}
.save-btn {
  min-height: 64px;
  min-width: 200px;
  font-size: 18px;
}
.item-nm {
  font-size: 16px;
  font-weight: 500;
}

/* 판정 — 색 + 아이콘 + 텍스트 (§3.1 색맹·조명 대응) */
.judge-cell,
.total-judge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.total-judge {
  font-size: 22px;
}
.j-pass {
  color: var(--state-created);
}
.j-fail {
  color: var(--state-deleted);
}
.j-none {
  color: var(--state-none);
}
.insp-grid :deep(.row-fail) {
  background: var(--state-deleted-bg);
}
.err-cell {
  color: var(--state-deleted);
  font-size: 12px;
}
</style>
