// drops 목록 → 최종 격자. 되돌리기와 공유 링크 재생이 같이 쓴다.
import { type Rng, mulberry32 } from './rng.ts'
import { type Grid, type Shape, createGrid, dropOne, dropLevel } from './ice.ts'

// drops: [x, size, x, size, ...]
// rng: 이어서 떨어뜨릴 수 있게 마지막 상태, points: 물방울별 고정 위치 [x, y, ...] (반짝임용)
export function replay(seed: number, shape: Shape, drops: number[]) {
  const grid: Grid = createGrid(shape)
  const rng: Rng = mulberry32(seed)
  const points: number[] = []
  for (let k = 0; k < drops.length; k += 2) {
    const r = dropOne(grid, drops[k], drops[k + 1], dropLevel(k / 2), rng)
    points.push(r.x, r.y)
  }
  return { grid, rng, points }
}
