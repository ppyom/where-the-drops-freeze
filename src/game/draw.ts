// 얼음 5겹 그리기. 플레이 화면(Phaser 텍스처)과 썸네일(일반 캔버스)이 같이 쓴다.
import { type Grid, W, H } from '../core/ice.ts'

const GLOW_DIV = 2 // 글로우용 축소 비율 (축소 후 확대 = 흐림)

// 5겹 색 (RGBA)
const GLOW = [0x7c, 0xc8, 0xf0, 0.35]
const EDGE = [0xff, 0xff, 0xff, 0.45]
const CORE = [0x0b, 0x1a, 0x33, 0.62]
const TINT = [0xbf, 0xe9, 0xfb, 0.24]
const HIGHLIGHT = 'rgba(255,255,255,0.75)'

// 마스크 캔버스 (격자 크기). 색별로 하나씩, 모든 호출이 재사용.
const masks = [0, 1, 2, 3].map(() => Object.assign(document.createElement('canvas'), { width: W, height: H }))
const glowSmall = Object.assign(document.createElement('canvas'), {
  width: Math.ceil(W / GLOW_DIV),
  height: Math.ceil(H / GLOW_DIV),
})

// visible(셀 값) = 이 셀을 그릴지. s = 셀 1칸 크기(px). ctx는 W*s × H*s.
export function drawIce(ctx: CanvasRenderingContext2D, g: Grid, visible: (v: number) => boolean, s: number) {
  const on = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H && visible(g[y * W + x])

  const imgs = masks.map(c => c.getContext('2d')!.createImageData(W, H))
  const [glow, edge, core, tint] = imgs.map(im => im.data)
  const tops: number[] = [] // 위가 비어 있는 셀 → 하이라이트

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue
      const i = (y * W + x) * 4
      paint(glow, i, GLOW)
      paint(edge, i, EDGE)
      paint(tint, i, TINT)
      if (on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) paint(core, i, CORE)
      if (!on(x, y - 1)) tops.push(x, y)
    }
  }
  masks.forEach((c, k) => c.getContext('2d')!.putImageData(imgs[k], 0, 0))

  const [glowC, edgeC, coreC, tintC] = masks
  ctx.clearRect(0, 0, W * s, H * s)
  ctx.imageSmoothingEnabled = true

  // 1. 글로우: 축소했다 크게 늘려서 흐리게
  const sctx = glowSmall.getContext('2d')!
  sctx.clearRect(0, 0, glowSmall.width, glowSmall.height)
  sctx.drawImage(glowC, 0, 0, glowSmall.width, glowSmall.height)
  ctx.globalAlpha = GLOW[3]
  ctx.drawImage(glowSmall, 0, 0, W * s, H * s)

  // 2~4. 테두리 → 속 → 틴트
  for (const [c, col] of [[edgeC, EDGE], [coreC, CORE], [tintC, TINT]] as const) {
    ctx.globalAlpha = col[3]
    ctx.drawImage(c, 0, 0, W * s, H * s)
  }

  // 5. 하이라이트: 윗면에 얇은 선
  ctx.globalAlpha = 1
  ctx.fillStyle = HIGHLIGHT
  const t = Math.max(1, Math.round(s * 0.18 * 1.5))
  for (let k = 0; k < tops.length; k += 2) ctx.fillRect(tops[k] * s, tops[k + 1] * s, s, t)
}

// 알파는 레이어 단위로 주므로 마스크는 불투명하게
function paint(d: Uint8ClampedArray, i: number, c: readonly number[]) {
  d[i] = c[0]
  d[i + 1] = c[1]
  d[i + 2] = c[2]
  d[i + 3] = 255
}
