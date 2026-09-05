<script setup>
/**
 * 코드 + 명칭 2열 단일선택 — F0 design §5
 *
 * 이 컴포넌트는 **어떤 서버 API도 모른다.** 목록은 부모가 넣어준다.
 * `codeKey`/`nameKey` 를 prop 으로 받는 이유(§5.1, Plan FR-06c):
 *   값을 컴포넌트 안에 고정하면 부서 전용이 된다.
 *   공정(procCd/procNm)·품목(itemCd/itemNm)·사용자(userId/userNm)에 재사용할 수 없다.
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, required: true },
  codeKey: { type: String, required: true },
  nameKey: { type: String, required: true },
  // 'all' 이면 맨 앞에 "전체"(코드 null) 항목을 붙인다.
  firstOption: { type: String, default: null },
  label: { type: String, default: '' },
  dense: { type: Boolean, default: false },
  disable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select'])

const ALL_LABEL = '전체'

const mergedOptions = computed(() => {
  if (props.firstOption !== 'all') return props.options
  return [{ [props.codeKey]: null, [props.nameKey]: ALL_LABEL }, ...props.options]
})

/**
 * §5.2 — `select` 는 선택된 **객체 전체**를 준다.
 * `v-model` 은 코드만 주므로, 명칭도 함께 저장해야 하는 화면(F3 발행 이력)이
 * 목록을 다시 뒤지지 않아도 되게 한다.
 */
function onUpdate(code) {
  emit('update:modelValue', code)
  emit(
    'select',
    mergedOptions.value.find((opt) => opt[props.codeKey] === code) ?? null
  )
}
</script>

<template>
  <!--
    emit-value + map-options 조합이 핵심이다 (§5.3).
    이게 없으면 v-model 에 객체 전체가 들어가고, 화면 상태가 서버 응답 객체와 얽힌다.
  -->
  <q-select
    outlined
    :model-value="modelValue"
    :options="mergedOptions"
    :option-value="codeKey"
    :option-label="nameKey"
    :label="label"
    :dense="dense"
    :disable="disable"
    emit-value
    map-options
    @update:model-value="onUpdate"
  >
    <!-- 드롭다운 각 행: 코드 배지 + 명칭 (Plan FR-06) -->
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section v-if="scope.opt[codeKey] !== null" side>
          <q-badge outline color="grey-7">{{ scope.opt[codeKey] }}</q-badge>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ scope.opt[nameKey] }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <!-- 선택 바: 명칭(굵게) | 코드(배지) (Plan FR-06b) -->
    <template #selected-item="scope">
      <span class="text-weight-medium">{{ scope.opt[nameKey] }}</span>
      <q-badge
        v-if="scope.opt[codeKey] !== null"
        outline
        color="grey-7"
        class="q-ml-sm"
      >
        {{ scope.opt[codeKey] }}
      </q-badge>
    </template>
  </q-select>
</template>
