// AdSense 디스플레이 광고 칸. 메뉴 화면에만 쓴다 (플레이 화면은 길게 누르다 실수로 누르기 쉬워서 정책 위반 위험).
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT
const SLOT = import.meta.env.VITE_ADSENSE_SLOT

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

/**
 * 광고 칸을 만든다. 높이가 고정이라 광고가 늦게 떠도 화면이 밀리지 않는다.
 * 만든 뒤 바로 화면에 붙여야 한다 (붙은 다음 마이크로태스크에서 광고를 요청).
 * @returns 광고 칸. 클라이언트·슬롯 ID가 없으면 `null` (칸 자체를 안 보여줌)
 */
export function adSlot(): HTMLElement | null {
  if (!CLIENT || !SLOT) return null
  const el = document.createElement('aside')
  el.className = 'ad glass'
  el.setAttribute('aria-label', '광고')
  el.innerHTML = `
    <span class="ad-label">광고</span>
    <ins class="adsbygoogle" data-ad-client="${CLIENT}" data-ad-slot="${SLOT}"
      ${import.meta.env.DEV ? 'data-adtest="on"' : ''}></ins>
  `
  queueMicrotask(() => {
    if (el.isConnected) (window.adsbygoogle = window.adsbygoogle || []).push({})
  })
  return el
}
