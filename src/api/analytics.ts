// Google Analytics 4. 측정 ID가 있고 프로덕션 빌드일 때만 불러온다 (개발 중 방문은 안 쌓이게).
// 화면 이동이 페이지 새로 불러오기라서 페이지뷰는 GA 기본 수집으로 충분하다.
const GA_ID = import.meta.env.VITE_GA_ID
const enabled = import.meta.env.PROD && !!GA_ID

declare global {
  interface Window {
    dataLayer: unknown[]
  }
}

// gtag.js는 배열이 아니라 arguments 객체를 받아야 동작한다
function gtag(..._args: unknown[]) {
  window.dataLayer.push(arguments)
}

/** GA 스크립트를 불러오고 페이지뷰를 보낸다. 앱 시작 때 한 번만 부른다. */
export function initAnalytics() {
  if (!enabled) return
  window.dataLayer = window.dataLayer || []
  gtag('js', new Date())
  gtag('config', GA_ID)
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.append(s)
}

/**
 * GA 이벤트를 보낸다. GA가 꺼져 있으면 아무것도 안 한다.
 * @param name 이벤트 이름 (예: `artwork_save`, `share`, `like`)
 * @param params 함께 보낼 값 (예: `{ item_id: 'abc1234' }`)
 */
export function track(name: string, params?: Record<string, string | number>) {
  if (enabled) gtag('event', name, params)
}
