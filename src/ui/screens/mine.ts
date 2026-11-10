// 내 작품(/me): 이 브라우저(익명 사용자)가 저장한 작품. 보관 남은 날 표시.
import { myArtworks, daysLeft } from '../../api/store.ts'
import { screenShell, artCard, likesMeta } from './gallery.ts'

const WARN_DAYS = 3 // 이 이하면 보관 임박 경고

export async function renderMine(app: HTMLElement) {
  const body = screenShell(app, '내 작품')
  body.innerHTML = `<p class="screen-note">불러오는 중…</p>`
  try {
    const rows = await myArtworks()
    if (rows.length === 0) {
      body.innerHTML = `
        <p class="screen-note">아직 저장한 작품이 없어요.<br />다른 브라우저에서 만든 작품은 여기 보이지 않아요.</p>
        <a class="btn-primary block" href="/shape">만들러 가기</a>
      `
      return
    }
    body.innerHTML = `<div class="cards"></div>`
    const cards = body.querySelector('.cards')!
    for (const r of rows) {
      const d = daysLeft(r.created_at)
      const keep = r.hidden
        ? `<span class="card-badge">숨겨짐</span>`
        : `<span class="card-days${d <= WARN_DAYS ? ' warn' : ''}">${d}일 남음</span>`
      cards.append(artCard(r, likesMeta(r.like_count) + keep, !r.hidden))
    }
  } catch (e) {
    console.error(e)
    body.innerHTML = `<p class="screen-note">불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>`
  }
}
