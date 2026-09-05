<script setup>
/**
 * 공통 레이아웃 — 헤더 + 좌측 메뉴 + 본문.
 *
 * 메뉴 항목 자체는 App.vue 가 소유한다. 레이아웃은 "메뉴가 놓일 자리"만 안다.
 * 화면 목록을 여기서 알면 레이아웃이 페이지에 의존하게 된다(의존 방향 역전).
 *
 * 좁은 화면(노트북)에서 상단 탭이 넘치는 문제로 좌측 서랍으로 옮겼다.
 * 접기 상태는 레이아웃의 사정이라 여기서 갖는다.
 */
import { ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const drawerOpen = ref(true)
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="no-print">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="메뉴 접기/펼치기"
          @click="drawerOpen = !drawerOpen"
        />
        <q-toolbar-title class="text-subtitle1 q-pl-sm">
          MES 품질/출하성적서
          <span class="text-caption q-ml-sm opacity-70">Sprint-1 목업</span>
        </q-toolbar-title>

        <q-space />
        <ThemeToggle />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      side="left"
      bordered
      :width="230"
      :breakpoint="0"
      class="no-print"
    >
      <q-scroll-area class="fit">
        <slot name="nav" />
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <q-page>
        <slot />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.opacity-70 {
  opacity: 0.7;
}
</style>
