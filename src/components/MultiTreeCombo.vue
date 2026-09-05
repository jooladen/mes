<script setup>
/**
 * 트리 다중선택 — F0 design §5.4
 *
 * `node-key`=코드, `tick-strategy="leaf"` — 잎만 선택된다. 결과는 코드 배열.
 *
 * ── 왜 q-select 가 아닌가 (2026-09-05 구현 중 발견) ─────────────────
 *   설계서 초안은 "q-select 의 #popup-content 안에 q-tree" 였다.
 *   그런데 Quasar 2.25 QSelect 의 슬롯은 7개뿐이고 `popup-content` 는 **없다**
 *   (`popupContentClass`/`popupContentStyle` 는 prop 이라 이름만 비슷하다).
 *   존재하지 않는 슬롯은 Vue 가 조용히 무시하므로 에러 없이 드롭다운만 안 열렸다.
 *   그래서 q-field 의 #control 안에 q-menu 를 직접 앉힌다. QMenu 는 부모 엘리먼트를
 *   앵커로 잡고 클릭에 반응하므로, 별도 open 상태 관리가 필요 없다.
 *   설계서 §5.4 도 이 방식으로 정정했다 (F0 design v1.1).
 *
 * `CodeSelect`·`MultiCheckCombo` 와 달리 codeKey/nameKey 를 받지 않는다.
 * 트리 노드는 이미 `{ label, code, children }` 로 조립돼 들어오기 때문이다
 * (`api/common.js` 의 `toTree`). 조립 시점에 키 이름이 흡수된다.
 */
import { computed } from 'vue'

const props = defineProps({
  // 선택된 코드 배열
  modelValue: { type: Array, default: () => [] },
  // toTree() 결과: [{ label, code, sortNo, children }]
  nodes: { type: Array, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '선택 안 함' },
  dense: { type: Boolean, default: false },
  disable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

// 선택 바에 칩으로 보여줄 라벨. 코드만으로는 사람이 못 읽는다.
const labelByCode = computed(() => {
  const map = new Map()
  const walk = (nodes) => {
    for (const n of nodes) {
      map.set(n.code, n.label)
      if (n.children && n.children.length) walk(n.children)
    }
  }
  walk(props.nodes)
  return map
})

const removeCode = (code) =>
  emit('update:modelValue', props.modelValue.filter((c) => c !== code))
</script>

<template>
  <q-field
    outlined
    stack-label
    :label="label"
    :dense="dense"
    :disable="disable"
    class="tree-combo"
  >
    <template #control>
      <div class="tree-combo__control row items-center">
        <q-chip
          v-for="code in modelValue"
          :key="code"
          dense
          removable
          color="primary"
          text-color="white"
          @remove="removeCode(code)"
        >
          {{ labelByCode.get(code) ?? code }}
        </q-chip>

        <span v-if="!modelValue.length" class="tree-combo__placeholder">
          {{ placeholder }}
        </span>

        <!--
          QMenu 는 부모(#control 의 div)를 앵커로 잡는다.
          fit = 앵커와 같은 너비. 칩을 지우는 클릭까지 메뉴를 열지 않도록
          q-chip 의 remove 는 자체적으로 이벤트를 멈춘다.
        -->
        <q-menu v-if="!disable" fit anchor="bottom start" self="top start">
          <div class="q-pa-sm" style="min-width: 240px">
            <q-tree
              :nodes="nodes"
              node-key="code"
              tick-strategy="leaf"
              :ticked="modelValue"
              default-expand-all
              @update:ticked="emit('update:modelValue', $event)"
            />
          </div>
        </q-menu>
      </div>
    </template>

    <template #append>
      <q-icon
        v-if="modelValue.length"
        name="close"
        class="cursor-pointer"
        @click.stop="emit('update:modelValue', [])"
      />
      <q-icon name="arrow_drop_down" />
    </template>
  </q-field>
</template>

<style scoped>
.tree-combo__control {
  width: 100%;
  gap: 4px;
  min-height: 24px;
  cursor: pointer;
  /* 칩이 늘어나면 줄을 바꾼다. 없으면 4개째부터 오른쪽으로 잘려 나가
     사용자가 무엇을 선택했는지 못 본다 (F4 는 공정을 여러 개 고른다). */
  flex-wrap: wrap;
  padding: 4px 0;
}
.tree-combo__placeholder {
  color: var(--ink-2);
}
</style>
