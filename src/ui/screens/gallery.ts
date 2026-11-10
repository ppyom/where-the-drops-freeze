// 갤러리(/gallery): 좋아요 순. 썸네일은 drops로 다시 계산해서 그린다.
import { W, H } from '../../core/ice.ts'
import { replay } from '../../core/replay.ts'
import { drawIce } from '../../game/draw.ts'
import { type ArtworkRow, popularArtworks } from '../../api/store.ts'
import { icons } from '../icons.ts'

const PAGE = 20
const THUMB_S = 3 // 썸네일 셀 크기(px) → 270×390

// 공통 화면 틀: 뒤로가기 + 제목 + 본문
export function screenShell(app: HTMLElement, title: string) {
  app.innerHTML = `
    <div class="screen">
      <header class="screen-head">
        <a class="icon-btn" href="/" aria-label="만들기로 돌아가기">${icons.back}</a>
        <h1 class="screen-title">${title}</h1>
      </header>
      <div class="screen-body"></div>
    </div>
  `
  return app.querySelector<HTMLElement>('.screen-body')!
}

// 화면에 보일 때 썸네일 그리기
const observer = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue
    const c = e.target as HTMLCanvasElement & { art?: ArtworkRow }
    observer.unobserve(c)
    const { grid } = replay(c.art!.seed, c.art!.shape, c.art!.drops)
    drawIce(c.getContext('2d')!, grid, v => v > 0, THUMB_S)
  }
})

// 작품 카드. meta = 아래쪽 정보 HTML. link=false면 누를 수 없음(숨겨진 작품).
export function artCard(art: ArtworkRow, meta: string, link = true) {
  const el = document.createElement(link ? 'a' : 'div')
  el.className = 'card glass'
  if (link) (el as HTMLAnchorElement).href = `/a/${art.id}`
  const canvas = Object.assign(document.createElement('canvas'), { width: W * THUMB_S, height: H * THUMB_S, art })
  el.append(canvas)
  el.insertAdjacentHTML('beforeend', `<div class="card-meta">${meta}</div>`)
  observer.observe(canvas)
  return el
}

export const likesMeta = (n: number) => `<span class="card-likes">${icons.heart}<span class="num">${n}</span></span>`

export function renderGallery(app: HTMLElement) {
  const body = screenShell(app, '갤러리')
  body.innerHTML = `<div class="cards"></div><p class="screen-note" hidden></p><button class="btn-text more" hidden>더 보기</button>`
  const cards = body.querySelector('.cards')!
  const note = body.querySelector<HTMLElement>('.screen-note')!
  const more = body.querySelector<HTMLButtonElement>('.more')!
  let offset = 0

  async function loadPage() {
    more.disabled = true
    note.hidden = true
    try {
      const rows = await popularArtworks(offset, PAGE)
      offset += rows.length
      for (const r of rows) cards.append(artCard(r, likesMeta(r.like_count)))
      more.hidden = rows.length < PAGE
      if (offset === 0) {
        note.textContent = '아직 작품이 없어요. 첫 작품을 만들어 보세요.'
        note.hidden = false
      }
    } catch (e) {
      console.error(e)
      note.textContent = '불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      note.hidden = false
      more.hidden = false
      more.textContent = '다시 시도'
    }
    more.disabled = false
  }
  more.addEventListener('click', () => {
    more.textContent = '더 보기'
    loadPage()
  })
  loadPage()
}
