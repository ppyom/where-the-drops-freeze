// 홈(/): 얼음이 자라는 데모 + 만들기. 데모도 시드 PRNG로 만들어서 매번 같다.
import { type Shape, W, H } from '../../core/ice.ts'
import { demoDrops } from '../../core/demo.ts'
import { replay } from '../../core/replay.ts'
import { drawIce } from '../../game/draw.ts'
import { adSlot } from '../ad.ts'

const DEMO_S = 4 // 데모 셀 크기(px) → 360×520
const DEMO_STEP = 90 // 물방울 1개당 ms
const DEMO_HOLD = 2500 // 다 자란 뒤 머무는 시간

// 캔버스에 데모를 그린다. shownCount = 앞에서 몇 개까지 보일지 (기본: 다 자란 모습)
export function drawDemo(canvas: HTMLCanvasElement, seed: number, shape: Shape, shownCount = Infinity) {
  const { grid } = replay(seed, shape, demoDrops(seed, shape))
  drawIce(canvas.getContext('2d')!, grid, v => v === 1 || (v >= 2 && v - 2 < shownCount), DEMO_S)
}

export function renderHome(app: HTMLElement) {
  app.innerHTML = `
    <div class="home">
      <div class="home-demo"><canvas width="${W * DEMO_S}" height="${H * DEMO_S}" aria-hidden="true"></canvas></div>
      <h1 class="logo">Where the<br />Drops Freeze</h1>
      <p class="home-text">물방울을 떨어뜨려 얼음을 키워요.<br />완성한 얼음은 링크로 나눌 수 있어요.</p>
      <a class="btn-primary block" href="/shape">만들기</a>
      <nav class="home-links">
        <a class="btn-text" href="/gallery">갤러리</a>
        <a class="btn-text" href="/me">내 작품</a>
      </nav>
      <footer class="home-foot">
        <a href="/about">소개</a>
        <a href="/privacy">개인정보처리방침</a>
      </footer>
    </div>
  `
  const ad = adSlot()
  if (ad) app.querySelector('.home')!.append(ad)
  const canvas = app.querySelector('canvas')!
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return drawDemo(canvas, 1, 'triangle')

  // 세모 → 플랫 번갈아 자라고, 다 자라면 흐려졌다가 다음 데모
  let loop = 0
  const grow = () => {
    const seed = 1 + loop, shape: Shape = loop % 2 ? 'flat' : 'triangle'
    const n = demoDrops(seed, shape).length / 2
    canvas.style.opacity = '1'
    let i = 0
    const step = () => {
      if (!canvas.isConnected) return
      drawDemo(canvas, seed, shape, i)
      if (i++ < n) return void setTimeout(step, DEMO_STEP)
      setTimeout(() => {
        canvas.style.opacity = '0'
        loop++
        setTimeout(grow, 500)
      }, DEMO_HOLD)
    }
    step()
  }
  grow()
}
