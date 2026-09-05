import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

// F0 design §2 — Quasar CLI 대신 Vite + @quasar/vite-plugin.
//   cdp2/crudGrid 에서 이미 동작하는 조합을 그대로 쓴다. 새 버전을 고르지 않는다.
export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar({
      sassVariables: fileURLToPath(new URL('./src/css/quasar-variables.sass', import.meta.url))
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // 518x 대(reverseThinking 5180 / game2048 5181 / crudGrid 5182)를 쓰지 않는다.
    // Windows 가 TCP 5113~5212 를 예약해 버려(`netsh interface ipv4 show
    // excludedportrange protocol=tcp`) 그 대역 전체가 EACCES 로 막힌다.
    // Hyper-V/WSL 이 뜨면 생기는 동적 예약이라 재부팅마다 범위가 바뀔 수 있다.
    port: 5283,
    open: false
  }
})
