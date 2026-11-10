// 완성 화면: 아래에서 올라오는 시트. 저장 → 링크 공유.
import { type Artwork, saveArtwork, shareUrl } from '../../api/store.ts'
import { track } from '../../api/analytics.ts'

const ERRORS: Record<string, string> = {
  daily_limit: '오늘은 10개까지 저장할 수 있어요. 내일 다시 저장해 주세요.',
  invalid_drops: '저장할 수 없는 작품이에요. 물방울은 5개 이상이어야 해요.',
  captcha_failed: '사람인지 확인하지 못했어요. 다시 시도해 주세요.',
}

export function openComplete(art: Artwork, onNew: () => void, onSaved?: () => void) {
  const n = art.drops.length / 2
  const root = document.createElement('div')
  root.className = 'sheet-backdrop'
  root.innerHTML = `
    <div class="sheet glass" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <h2 class="sheet-title" id="sheet-title">얼음이 완성됐어요</h2>
      <p class="sheet-text">물방울 <span class="num">${n}</span>개로 자랐어요.
        저장하면 링크를 받은 사람 화면에서 처음부터 다시 자라요.</p>
      <p class="sheet-error" hidden></p>
      <button class="btn-primary" id="save">저장하고 링크 만들기</button>
      <button class="btn-text" id="close">더 키우기</button>
    </div>
  `
  document.body.append(root)

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!
  const close = () => root.remove()
  const errEl = $('.sheet-error')
  const saveBtn = $<HTMLButtonElement>('#save')

  $('#close').addEventListener('click', close)
  let saved = false
  root.addEventListener('click', e => e.target === root && !saved && close()) // 저장 전엔 바깥 누르면 닫기

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    saveBtn.textContent = '저장하는 중…'
    errEl.hidden = true
    try {
      const id = await saveArtwork(art)
      track('artwork_save', { shape: art.shape, drop_count: n })
      showLink(id)
      onSaved?.()
    } catch (e) {
      const [code, detail] = (e as Error).message.split(':')
      errEl.textContent = (ERRORS[code] ?? '저장하지 못했어요. 잠시 후 다시 시도해 주세요.') + (detail ? ` (코드 ${detail})` : '')
      errEl.hidden = false
      saveBtn.disabled = false
      saveBtn.textContent = '다시 저장하기'
      console.error(e)
    }
  })

  // 저장 후: 링크 + 공유. 저장한 작품은 더 못 키우므로 닫으면 새로 시작.
  function showLink(id: string) {
    const url = shareUrl(id)
    $('.sheet').innerHTML = `
      <h2 class="sheet-title" id="sheet-title">링크가 만들어졌어요</h2>
      <p class="sheet-text">30일 동안 보관돼요.</p>
      <div class="link-box glass">${url}</div>
      <button class="btn-primary" id="share">링크 공유하기</button>
      <button class="btn-text" id="new">새로 만들기</button>
    `
    saved = true
    const shareBtn = $<HTMLButtonElement>('#share')
    shareBtn.addEventListener('click', async () => {
      // 공유 창에서 취소하면 reject되므로 성공했을 때만 기록
      if (navigator.share) {
        await navigator.share({ title: 'Where the Drops Freeze', url })
          .then(() => track('share', { method: 'native', item_id: id }), () => {})
      } else {
        await navigator.clipboard.writeText(url)
        shareBtn.textContent = '링크를 복사했어요'
        track('share', { method: 'copy', item_id: id })
      }
    })
    $('#new').addEventListener('click', () => {
      close()
      onNew()
    })
  }
}
