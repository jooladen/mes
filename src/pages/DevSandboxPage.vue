<script setup>
/**
 * 콤보 3종 검증 화면 — F0 design §10 `DevSandboxPage.vue`
 *
 * F0 는 화면이 없는 feature다. 그래서 "제대로 만들어졌는지"를 눈으로 볼 자리가 필요하다.
 * F1~F4 가 이 컴포넌트들을 가져다 쓰기 전에, 여기서 먼저 깨지는지 확인한다.
 *
 * F0 design §12 L3 — "드롭다운 2열 렌더, procCd/procNm 재사용" 을 이 화면이 만족시킨다.
 */
import { onMounted, ref } from 'vue'
import CodeSelect from '@/components/CodeSelect.vue'
import MultiCheckCombo from '@/components/MultiCheckCombo.vue'
import MultiTreeCombo from '@/components/MultiTreeCombo.vue'
import { fetchDeptList, fetchProcessTree, fetchUserList, toTree } from '@/api/common'

const loading = ref(true)
const loadError = ref(null)

const deptRows = ref([])
const procRows = ref([])
const userRows = ref([])
const procNodes = ref([])

const selectedDept = ref(null)
const selectedDeptRow = ref(null)
const selectedUser = ref(null)
const selectedProcs = ref([])
const selectedProcTree = ref([])

// 세 API 를 병렬로 부른다. 서로 의존이 없다.
onMounted(async () => {
  try {
    const [depts, procs, users] = await Promise.all([
      fetchDeptList('Y'),
      fetchProcessTree('Y'),
      fetchUserList('Y')
    ])
    deptRows.value = depts
    procRows.value = procs
    userRows.value = users
    // §9.2 는 평면으로 준다. 트리 조립은 화면 책임 — 그 경계를 여기서 넘는다.
    procNodes.value = toTree(procs, 'procCd', 'procNm', 'parentProcCd')
  } catch (e) {
    loadError.value = e.errorMessage ?? e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="q-pa-md sandbox">
    <div class="text-h6 q-mb-xs">F0 공통 컴포넌트 검증</div>
    <div class="text-caption text-grey q-mb-md">
      Mock 프로파일 · <code>src/mock/*.json</code> → <code>api/http.js</code> → 화면.
      응답은 래핑하지 않는다 (F0 design §4.1).
    </div>

    <q-banner v-if="loadError" class="bg-negative text-white q-mb-md">
      {{ loadError }}
    </q-banner>

    <div v-if="loading" class="text-grey">불러오는 중…</div>

    <div v-else class="col-grid">
      <!-- ① CodeSelect — 부서 -->
      <q-card flat bordered class="q-pa-md">
        <div class="text-subtitle2 q-mb-sm">① CodeSelect — 부서 (§9.1)</div>
        <CodeSelect
          v-model="selectedDept"
          :options="deptRows"
          code-key="deptCd"
          name-key="deptNm"
          first-option="all"
          label="부서"
          dense
          @select="selectedDeptRow = $event"
        />
        <div class="q-mt-sm text-caption">
          v-model: <b class="num">{{ selectedDept ?? 'null' }}</b><br />
          select 이벤트(객체 전체): <span class="num">{{ selectedDeptRow?.deptNm ?? '—' }}</span>
        </div>
      </q-card>

      <!-- ② CodeSelect 재사용 — 사용자 (같은 컴포넌트, 다른 키) -->
      <q-card flat bordered class="q-pa-md">
        <div class="text-subtitle2 q-mb-sm">② CodeSelect 재사용 — 검사자 (§9.3 D34)</div>
        <CodeSelect
          v-model="selectedUser"
          :options="userRows"
          code-key="userId"
          name-key="userNm"
          label="검사자"
          dense
        />
        <div class="q-mt-sm text-caption">
          v-model: <b class="num">{{ selectedUser ?? 'null' }}</b><br />
          <span class="text-grey">
            부서와 <b>같은 컴포넌트</b>다. codeKey/nameKey 만 바꿨다 (FR-06c).
          </span>
        </div>
      </q-card>

      <!-- ③ MultiCheckCombo — 공정 평면 -->
      <q-card flat bordered class="q-pa-md">
        <div class="text-subtitle2 q-mb-sm">③ MultiCheckCombo — 공정 (평면)</div>
        <MultiCheckCombo
          v-model="selectedProcs"
          :options="procRows"
          code-key="procCd"
          name-key="procNm"
          label="공정 다중선택"
          dense
        />
        <div class="q-mt-sm text-caption">
          v-model: <b class="num">{{ selectedProcs.length ? selectedProcs.join(', ') : '[]' }}</b>
        </div>
      </q-card>

      <!-- ④ MultiTreeCombo — 공정 트리 -->
      <q-card flat bordered class="q-pa-md">
        <div class="text-subtitle2 q-mb-sm">④ MultiTreeCombo — 공정 트리 (F4 소비)</div>
        <MultiTreeCombo
          v-model="selectedProcTree"
          :nodes="procNodes"
          label="공정 트리선택"
          dense
        />
        <div class="q-mt-sm text-caption">
          v-model: <b class="num">{{ selectedProcTree.length ? selectedProcTree.join(', ') : '[]' }}</b><br />
          <span class="text-grey">잎(leaf)만 선택된다. 트리 조립은 <code>toTree()</code>.</span>
        </div>
      </q-card>
    </div>

    <q-card flat bordered class="q-mt-md q-pa-md">
      <div class="text-subtitle2 q-mb-sm">Mock 응답 원본 (래핑 없음 확인)</div>
      <pre class="raw num">{{ JSON.stringify(deptRows.slice(0, 3), null, 2) }}</pre>
    </q-card>
  </div>
</template>

<style scoped>
.sandbox {
  max-width: 1100px;
  margin: 0 auto;
}
.col-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}
.raw {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-2);
  white-space: pre-wrap;
}
</style>
