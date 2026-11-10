import './ui/styles.css'
import type { Shape } from './core/ice.ts'
import { loadArtwork } from './api/store.ts'
import { renderHome } from './ui/screens/home.ts'
import { renderShape } from './ui/screens/shape.ts'
import { startPlay } from './ui/screens/play.ts'
import { renderGallery } from './ui/screens/gallery.ts'
import { renderMine } from './ui/screens/mine.ts'
import { renderMessage, renderLoading } from './ui/screens/message.ts'

// 주소로 화면 고르기. 화면 이동은 일반 링크(새로 불러오기)로 단순하게.
const app = document.querySelector<HTMLDivElement>('#app')!
const path = location.pathname.replace(/\/$/, '') || '/'
const sharedId = path.match(/^\/a\/([a-z0-9]{7})$/)?.[1]

if (path === '/') renderHome(app)
else if (path === '/shape') renderShape(app)
else if (path === '/play') {
  const shape = new URLSearchParams(location.search).get('shape')
  startPlay(app, { shape: shape === 'flat' ? 'flat' : ('triangle' as Shape) })
} else if (path === '/gallery') renderGallery(app)
else if (path === '/me') renderMine(app)
else if (sharedId) openShared(sharedId)
else renderMessage(app, '페이지를 찾을 수 없어요', '주소가 바뀌었거나 없는 페이지예요.', { label: '홈으로', href: '/' })

// 공유 링크: 먼저 불러오고, 있으면 재생
async function openShared(id: string) {
  renderLoading(app)
  try {
    const art = await loadArtwork(id)
    if (art) return startPlay(app, { view: art })
    renderMessage(app, '작품을 찾을 수 없어요',
      '30일이 지나 사라졌거나, 신고로 숨겨진 작품일 수 있어요.',
      { label: '나도 만들기', href: '/shape' })
  } catch (e) {
    console.error(e)
    renderMessage(app, '불러오지 못했어요', '인터넷 연결을 확인하고 다시 시도해 주세요.',
      { label: '다시 시도', href: location.pathname })
  }
}

// 길게 누를 때 뜨는 메뉴 막기
document.addEventListener('contextmenu', e => e.preventDefault())
