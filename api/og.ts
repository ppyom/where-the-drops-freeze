// 공유 미리보기 이미지 (1200×630 PNG). /api/og?id=작품id, id 없으면 데모 얼음.
// 이미지는 저장하지 않는다: 요청마다 drops로 다시 계산해서 그리고, CDN 캐시만 쓴다.
// DOM·캔버스가 없는 서버라서 픽셀을 직접 칠하고 PNG도 직접 만든다.
import { type Grid, type Shape, W, H } from '../src/core/ice.ts'
import { replay } from '../src/core/replay.ts'
import { demoDrops } from '../src/core/demo.ts'
import { fetchArtwork } from './_supabase.ts'

const OW = 1200, OH = 630
const PAD = 40 // 이미지 가장자리 여백(px)
const MARGIN = 4 // 얼음 둘레 여백(셀)
const MAX_SCALE = 8 // 셀 1칸 최대 크기(px). 크면 픽셀이 투박해짐

type RGB = [number, number, number]
const hex = (h: number): RGB => [(h >> 16) & 255, (h >> 8) & 255, h & 255]

// 디자인 토큰과 같은 색
const BG_TOP = hex(0x070d18), BG_BOTTOM = hex(0x0b182b)
const GLOWS: [number, number, number, RGB, number][] = [
  // x, y, 반지름, 색, 세기 (styles.css 배경과 같은 배치)
  [0.15 * OW, 0.2 * OH, 520, hex(0x2e6fb0), 0.35],
  [0.9 * OW, 0.45 * OH, 480, hex(0x5b4bb8), 0.3],
  [0.3 * OW, 0.9 * OH, 480, hex(0x1f8fa8), 0.3],
]
const GLOW = hex(0x7cc8f0), WHITE: RGB = [255, 255, 255], CORE = hex(0x0b1a33), TINT = hex(0xbfe9fb)

export function renderPixels(g: Grid): Uint8Array {
  const px = new Float32Array(OW * OH * 3)
  const blend = (i: number, c: RGB, a: number) => {
    i *= 3
    px[i] += (c[0] - px[i]) * a
    px[i + 1] += (c[1] - px[i + 1]) * a
    px[i + 2] += (c[2] - px[i + 2]) * a
  }

  // 배경: 세로 그라디언트 + 흐린 원형 빛 3개
  for (let y = 0; y < OH; y++) {
    const t = y / (OH - 1)
    for (let x = 0; x < OW; x++) {
      const i = (y * OW + x) * 3
      for (let k = 0; k < 3; k++) px[i + k] = BG_TOP[k] + (BG_BOTTOM[k] - BG_TOP[k]) * t
      for (const [gx, gy, r, c, s] of GLOWS) {
        const f = Math.max(0, 1 - Math.hypot(x - gx, y - gy) / r)
        if (f > 0) blend(y * OW + x, c, f * f * s)
      }
    }
  }

  const on = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H && g[y * W + x] > 0

  // 1. 글로우: 셀 단위 마스크를 흐리게 해서 부드럽게 확대
  const R = 2
  let m = new Float32Array(W * H).map((_, i) => (g[i] > 0 ? 1 : 0))
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const out = new Float32Array(W * H)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let sum = 0
        for (let k = -R; k <= R; k++) {
          const nx = x + dx * k, ny = y + dy * k
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) sum += m[ny * W + nx]
        }
        out[y * W + x] = sum / (2 * R + 1)
      }
    m = out
  }
  const sample = (fx: number, fy: number) => {
    const x0 = Math.max(0, Math.min(W - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(H - 2, Math.floor(fy)))
    const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0))
    const a = m[y0 * W + x0] + (m[y0 * W + x0 + 1] - m[y0 * W + x0]) * tx
    const b = m[(y0 + 1) * W + x0] + (m[(y0 + 1) * W + x0 + 1] - m[(y0 + 1) * W + x0]) * tx
    return a + (b - a) * ty
  }

  // 얼음이 있는 영역만 잘라서 이미지에 꽉 차게 확대
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (on(x, y)) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x)
        y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      }
  // 격자 밖은 자르지 않음 (바닥 아래로 글로우가 번지지 않게)
  x0 = Math.max(0, x0 - MARGIN); y0 = Math.max(0, y0 - MARGIN)
  x1 = Math.min(W, x1 + MARGIN + 1); y1 = Math.min(H, y1 + MARGIN + 1)
  const sc = Math.min((OW - PAD * 2) / (x1 - x0), (OH - PAD * 2) / (y1 - y0), MAX_SCALE)
  const ox = Math.round((OW - (x1 - x0) * sc) / 2), oy = Math.round((OH - (y1 - y0) * sc) / 2)
  const HL = 0.18 * 1.5 // 하이라이트 굵기 (셀 대비)

  for (let y = oy; y < OH - oy; y++)
    for (let x = ox; x < OW - ox; x++) {
      const fx = x0 + (x - ox + 0.5) / sc, fy = y0 + (y - oy + 0.5) / sc
      const i = y * OW + x
      const v = sample(fx - 0.5, fy - 0.5)
      if (v > 0) blend(i, GLOW, Math.min(1, v * 1.6) * 0.35) // 1. 글로우

      const cx = Math.floor(fx), cy = Math.floor(fy)
      if (!on(cx, cy)) continue
      blend(i, WHITE, 0.45) // 2. 테두리
      if (on(cx - 1, cy) && on(cx + 1, cy) && on(cx, cy - 1) && on(cx, cy + 1)) blend(i, CORE, 0.62) // 3. 속
      blend(i, TINT, 0.24) // 4. 틴트
      if (!on(cx, cy - 1) && fy - cy < HL) blend(i, WHITE, 0.75) // 5. 윗면 하이라이트
    }

  return Uint8Array.from(px, v => Math.round(v))
}

// ── PNG (RGB 8비트, 필터 없음, zlib 압축) ──
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
const crc32 = (d: Uint8Array) => {
  let c = 0xffffffff
  for (const b of d) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length)
  const v = new DataView(out.buffer)
  v.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

export async function encodePng(rgb: Uint8Array, w: number, h: number) {
  const raw = new Uint8Array((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1)
  const zipped = new Uint8Array(
    await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer(),
  )
  const ihdr = new Uint8Array(13)
  const v = new DataView(ihdr.buffer)
  v.setUint32(0, w)
  v.setUint32(4, h)
  ihdr.set([8, 2, 0, 0, 0], 8) // 8비트, RGB
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zipped), chunk('IEND', new Uint8Array())]
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  parts.reduce((o, p) => (png.set(p, o), o + p.length), 0)
  return png
}

export async function renderOg(seed: number, shape: Shape, drops: number[]) {
  return encodePng(renderPixels(replay(seed, shape, drops).grid), OW, OH)
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  const art = id ? await fetchArtwork(id).catch(() => null) : null
  const png = art
    ? await renderOg(art.seed, art.shape, art.drops)
    : await renderOg(1, 'triangle', demoDrops(1, 'triangle'))
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      // 작품은 바뀌지 않으니 길게. 없는 작품은 짧게.
      'Cache-Control': art || !id ? 'public, max-age=86400, s-maxage=31536000' : 'public, max-age=300',
    },
  })
}
