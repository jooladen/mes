<script setup>
/**
 * 다크/라이트 토글.
 *
 * Design Ref: §3.2 — 아는 것은 Quasar Dark 뿐. 나머지는 전부 모른다.
 * 색 자체는 tokens.css 가 갖고 있다. 여기는 스위치만 젖힌다.
 */
import { Dark } from 'quasar'
</script>

<template>
  <q-btn
    flat
    dense
    no-caps
    :icon="Dark.isActive ? 'light_mode' : 'dark_mode'"
    :label="Dark.isActive ? '라이트' : '다크'"
    @click="Dark.toggle()"
  />
</template>
