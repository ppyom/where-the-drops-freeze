// 격자, 낙하, 부착. Phaser 없이 순수 계산만.
import { type Rng, randInt } from './rng.ts'

import { W, H, BLOB_R2, STALK, STALK_BEND, WALK_STEPS, TRI_HALF, TRI_HEIGHT } from './config.ts'

export { W, H, MAX_DROPS, MAX_SIZE_SUM } from './config.ts'

export type Shape = 'triangle' | 'flat'

// 셀 값: 0 = 빈칸, 1 = 시작 모양, n + 2 = n번째(0부터) 물방울
export type Grid = Uint16Array

export const dropLevel = (n: number) => n + 2

export function createGrid(shape: Shape): Grid {
  const g = new Uint16Array(W * H)
  if (shape === 'triangle') {
    const cx = W / 2, half = Math.round(W * TRI_HALF), h = Math.round(W * TRI_HEIGHT)
    for (let dy = 0; dy < h; dy++) {
      const w = Math.round(half * (1 - dy / h))
      for (let x = cx - w; x < cx + w; x++) g[(H - 1 - dy) * W + x] = 1
    }
  } else {
    for (let y = H - 3; y < H; y++) g.fill(1, y * W, (y + 1) * W)
  }
  return g
}

// 누른 시간(ms) → 크기 1~4
export const sizeFromMs = (ms: number) => (ms < 250 ? 1 : ms < 500 ? 2 : ms < 750 ? 3 : 4)

const DIRS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

const inside = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H

// 8방향 중 얼음이 하나라도 있으면 닿은 것
function touches(g: Grid, x: number, y: number) {
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy
    if (inside(nx, ny) && g[ny * W + nx]) return true
  }
  return false
}

// 크기별 원형 모양 (기본값 1 / 5 / 9~13 / 21칸)
function blob(size: number, rng: Rng) {
  const r2 = BLOB_R2[size]
  const cells: number[][] = []
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= r2) cells.push([dx, dy])
  if (size === 3) {
    for (const c of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (rng() < 0.5) cells.push(c)
  }
  return cells
}

export type DropResult = {
  landed: boolean // false면 바닥까지 떨어져 사라짐
  x: number // 고정된 위치 (격자)
  y: number
  cells: number[] // 새로 얼은 셀 인덱스
}

// 물방울 하나를 떨어뜨려 격자를 바꾼다. level = 이 물방울의 셀 값.
export function dropOne(g: Grid, x: number, size: number, level: number, rng: Rng): DropResult {
  let y = 0
  if (g[x]) return { landed: false, x, y, cells: [] } // 맨 위까지 얼음
  while (!touches(g, x, y)) {
    if (y === H - 1) return { landed: false, x, y, cells: [] }
    y++
  }

  // 근처에서 최대 8걸음 랜덤 이동. 얼음에 닿아 있는 빈칸으로만.
  for (let i = 0; i < WALK_STEPS; i++) {
    const [dx, dy] = DIRS[randInt(rng, 8)]
    const nx = x + dx, ny = y + dy
    if (inside(nx, ny) && !g[ny * W + nx] && touches(g, nx, ny)) {
      x = nx
      y = ny
    }
  }

  const cells: number[] = []
  const freeze = (cx: number, cy: number) => {
    const i = cy * W + cx
    if (inside(cx, cy) && !g[i]) {
      g[i] = level
      cells.push(i)
    }
  }
  for (const [dx, dy] of blob(size, rng)) freeze(x + dx, y + dy)

  // 줄기: 위로 한 칸씩, 가끔 좌우로 휘면서. 막히면 멈춤.
  let sx = x, sy = y
  for (let i = 0; i < STALK[size]; i++) {
    if (rng() < STALK_BEND) sx += rng() < 0.5 ? -1 : 1
    sy--
    if (!inside(sx, sy)) break
    const v = g[sy * W + sx]
    if (v && v !== level) break // 다른 얼음에 막힘 (자기 덩어리는 통과)
    freeze(sx, sy)
  }
  return { landed: true, x, y, cells }
}
