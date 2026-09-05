<script setup>
/**
 * 체크박스 다중선택 — F0 design §5.4
 *
 * `CodeSelect` 와 **같은 codeKey/nameKey 규약**을 공유한다 (§5.4 마지막 줄).
 * 차이는 두 가지뿐이다: multiple + use-chips, 그리고 modelValue 가 코드 **배열**.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, required: true },
  codeKey: { type: String, required: true },
  nameKey: { type: String, required: true },
  label: { type: String, default: '' },
  dense: { type: Boolean, default: false },
  disable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <q-select
    outlined
    multiple
    use-chips
    :model-value="modelValue"
    :options="options"
    :option-value="codeKey"
    :option-label="nameKey"
    :label="label"
    :dense="dense"
    :disable="disable"
    emit-value
    map-options
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- 체크박스를 직접 그린다. q-select 기본 옵션 행에는 체크 표시가 없다. -->
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section side>
          <q-checkbox
            :model-value="scope.selected"
            @update:model-value="scope.toggleOption(scope.opt)"
          />
        </q-item-section>
        <q-item-section side>
          <q-badge outline color="grey-7">{{ scope.opt[codeKey] }}</q-badge>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ scope.opt[nameKey] }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>
