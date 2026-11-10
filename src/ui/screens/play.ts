// 플레이 화면(/play)과 공유 링크 보기 화면(/a/{id}). 캔버스는 Phaser, 나머지는 HTML.
import * as Phaser from 'phaser'
import { IceScene, S } from '../../game/IceScene.ts'
import { type Shape, W, H, MAX_DROPS } from '../../core/ice.ts'
import { MIN_DROPS } from '../../core/config.ts'
import { openComplete } from './complete.ts'
import { openReport } from './report.ts'
import { type ArtworkRow, likeArtwork, hasLiked } from '../../api/store.ts'
import { icons } from '../icons.ts'

// shape: 새로 만들기, view: 받은 작품 보기
type Mode = { shape: Shape } | { view: ArtworkRow }

export function startPlay(app: HTMLElement, mode: Mode) {
  const view = 'view' in mode ? mode.view : null
  app.innerHTML = `
    <div class="play">
      <a class="top-btn left glass-bar" href="/" aria-label="홈으로">${icons.back}</a>
      <div class="hud glass-bar">
        <span class="hud-label">물방울</span>
        <span class="num" id="count">0 / ${MAX_DROPS}</span>
      </div>
      <div id="game" class="play-canvas"></div>
      <div class="controls">
        <div class="tools glass-bar">
          ${view ? `
            <button class="icon-btn" id="replay" aria-label="처음부터 재생" disabled>${icons.play}</button>
            <button class="icon-btn wide" id="like" aria-label="좋아요" aria-pressed="false" disabled>
              ${icons.heart}<span class="num" id="likes">${view.like_count}</span>
            </button>
            <button class="icon-btn" id="report" aria-label="신고">${icons.flag}</button>
          ` : `
            <button class="icon-btn" id="undo" aria-label="되돌리기" disabled>${icons.undo}</button>
            <button class="icon-btn" id="replay" aria-label="처음부터 재생" disabled>${icons.play}</button>
          `}
        </div>
        ${view
          ? `<a class="btn-primary" href="/shape">나도 만들기</a>`
          : `<button class="btn-primary" id="done" disabled>완성</button>`}
      </div>
    </div>
  `

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W * S,
    height: H * S,
    transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 1 },
    scene: IceScene,
    callbacks: { preBoot: g => g.registry.set('shape', view ? view.shape : (mode as { shape: Shape }).shape) },
  })
  const scene = () => game.scene.getScene('ice') as IceScene
  const $ = <T extends HTMLElement>(s: string) => app.querySelector<T>(s)!

  const countEl = $('#count')
  const replayBtn = $<HTMLButtonElement>('#replay')
  replayBtn.addEventListener('click', () => scene().playback())

  if (view) return startView(view)

  // ── 만들기 ──
  const undoBtn = $<HTMLButtonElement>('#undo')
  const doneBtn = $<HTMLButtonElement>('#done')
  let saved = false // 저장한 뒤엔 나가도 경고 안 함
  game.events.on('count', (n: number) => {
    countEl.textContent = `${n} / ${MAX_DROPS}`
    undoBtn.disabled = replayBtn.disabled = n === 0
    doneBtn.disabled = n < MIN_DROPS
  })
  game.events.on('limit', (kind: 'count' | 'size') =>
    toast(kind === 'count' ? '물방울을 모두 썼어요. 완성해 보세요.' : '남은 물방울이 적어요. 더 짧게 눌러 보세요.'),
  )
  undoBtn.addEventListener('click', () => scene().undo())
  doneBtn.addEventListener('click', () => {
    const s = scene()
    openComplete(
      { seed: s.seed, shape: s.shape, drops: [...s.drops] },
      () => {
        saved = false
        s.reset()
      },
      () => (saved = true),
    )
  })

  // 만들던 작품이 있으면 나갈 때 브라우저 경고
  addEventListener('beforeunload', e => {
    if (!saved && scene()?.drops.length) e.preventDefault()
  })

  // ── 공유 링크 보기 ──
  function startView(art: ArtworkRow) {
    game.events.on('count', (n: number) => (countEl.textContent = `${n} / ${MAX_DROPS}`))
    const likeBtn = $<HTMLButtonElement>('#like')
    const likesEl = $('#likes')

    const setLiked = (liked: boolean, count: number) => {
      likeBtn.classList.toggle('liked', liked)
      likeBtn.setAttribute('aria-pressed', String(liked))
      likeBtn.disabled = liked // 좋아요 취소는 없음
      likesEl.textContent = String(count)
    }

    game.events.once('ready-scene', async () => {
      replayBtn.disabled = false
      scene().view(art)
      setLiked(await hasLiked(art.id).catch(() => false), art.like_count)
    })

    likeBtn.addEventListener('click', async () => {
      const before = Number(likesEl.textContent)
      setLiked(true, before + 1) // 먼저 반영하고 서버 값으로 맞춤
      try {
        setLiked(true, await likeArtwork(art.id))
      } catch (e) {
        console.error(e)
        setLiked(false, before)
        toast('좋아요를 누르지 못했어요. 잠시 후 다시 시도해 주세요.')
      }
    })
    $('#report').addEventListener('click', () => openReport(art.id))
  }
}

// 위쪽에 잠깐 뜨는 안내
function toast(text: string) {
  document.querySelector('.toast')?.remove()
  const el = document.createElement('div')
  el.className = 'toast glass-bar'
  el.setAttribute('role', 'status')
  el.textContent = text
  document.body.append(el)
  setTimeout(() => el.remove(), 2400)
}
