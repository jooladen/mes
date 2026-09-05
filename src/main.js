/**
 * 앱 진입점.
 *
 * F0 design §7 — RealGrid2 라이선스 주입 지점은 F4가 아니라 여기다.
 * 순서가 중요하다: 라이선스 등록이 createApp *전* 이어야 한다.
 *   1) 전역 CSS (Quasar / RealGrid2 / 우리 토큰)
 *   2) RealGrid2 라이선스 등록
 *   3) Quasar 플러그인 (Dark = 다크모드)
 *   4) 마운트
 */
import { createApp } from 'vue'
import { Quasar, Dark } from 'quasar'
import RealGrid from 'realgrid'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
// ↓ 빠지면 그리드가 스타일 없이 깨진 채 렌더된다. 잊기 쉬운 함정.
import 'realgrid/dist/realgrid-style.css'
import './css/tokens.css'
// F3 design §5.1 — 성적서 인쇄 CSS. 전역이어야 @page 와 .no-print 가 먹는다
import './css/coa-print.css'

import App from './App.vue'

// F0 design §7 — 키는 환경변수로만. 소스·문서·로그 어디에도 남기지 않는다.
const LICENSE = import.meta.env.VITE_REALGRID_LICENSE

if (LICENSE) {
  RealGrid.setLicenseKey(LICENSE)
} else {
  console.warn(
    '[mes] VITE_REALGRID_LICENSE 없음 — 그리드가 평가판으로 동작합니다.\n' +
      '  .env.example 을 .env.local 로 복사하고 키를 넣은 뒤 dev 서버를 다시 시작하세요.'
  )
}

const app = createApp(App)
app.use(Quasar, { plugins: { Dark } })

// 다크모드 기본. 헤더 토글로 바꾼다.
Dark.set(true)

app.mount('#app')
