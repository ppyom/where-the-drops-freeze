// 신고 시트: 사유 3개 중 하나. 서로 다른 3명이 신고하면 서버에서 숨김.
import { type ReportReason, reportArtwork } from '../../api/store.ts'

const REASONS: [ReportReason, string][] = [
  ['ugly', '불쾌한 모양이에요'],
  ['spam', '스팸이에요'],
  ['etc', '기타'],
]

export function openReport(id: string) {
  const root = document.createElement('div')
  root.className = 'sheet-backdrop'
  root.innerHTML = `
    <div class="sheet glass" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <h2 class="sheet-title" id="sheet-title">작품 신고</h2>
      <p class="sheet-text">신고 사유를 골라 주세요. 여러 명이 신고하면 작품이 숨겨져요.</p>
      ${REASONS.map(([r, label]) => `<button class="option-btn glass" data-reason="${r}">${label}</button>`).join('')}
      <p class="sheet-error" hidden></p>
      <button class="btn-text" id="close">취소</button>
    </div>
  `
  document.body.append(root)
  const sheet = root.querySelector<HTMLElement>('.sheet')!
  const close = () => root.remove()
  root.addEventListener('click', e => e.target === root && close())
  sheet.querySelector('#close')!.addEventListener('click', close)

  sheet.querySelectorAll<HTMLButtonElement>('.option-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      sheet.querySelectorAll<HTMLButtonElement>('.option-btn').forEach(b => (b.disabled = true))
      try {
        await reportArtwork(id, btn.dataset.reason as ReportReason)
        sheet.innerHTML = `
          <h2 class="sheet-title" id="sheet-title">신고했어요</h2>
          <p class="sheet-text">알려 주셔서 고마워요.</p>
          <button class="btn-text" id="close">닫기</button>
        `
        sheet.querySelector('#close')!.addEventListener('click', close)
      } catch (e) {
        console.error(e)
        const err = sheet.querySelector<HTMLElement>('.sheet-error')!
        err.textContent = '신고하지 못했어요. 잠시 후 다시 시도해 주세요.'
        err.hidden = false
        sheet.querySelectorAll<HTMLButtonElement>('.option-btn').forEach(b => (b.disabled = false))
      }
    }),
  )
}
