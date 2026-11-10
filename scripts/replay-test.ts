// 재현성 테스트: 같은 입력이면 격자가 완전히 같아야 한다. 실행: npm test
import { mulberry32 } from '../src/core/rng.ts'
import { W, MAX_DROPS, type Shape, createGrid, dropOne, dropLevel } from '../src/core/ice.ts'
import { replay } from '../src/core/replay.ts'

const same = (a: Uint16Array, b: Uint16Array) => a.length === b.length && a.every((v, i) => v === b[i])
let fail = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fail++
    console.log('FAIL', msg)
  }
}

for (let t = 0; t < 50; t++) {
  const seed = t * 7919 + 1
  const shape: Shape = t % 2 ? 'flat' : 'triangle'
  const pick = mulberry32(seed ^ 0xabcdef) // 입력 흉내용

  // 게임처럼 한 개씩 떨어뜨리고, 착지한 것만 기록
  const grid = createGrid(shape)
  const rng = mulberry32(seed)
  const drops: number[] = []
  let beforeLast = grid.slice()
  for (let k = 0; k < MAX_DROPS; k++) {
    const x = Math.floor(pick() * W), size = 1 + Math.floor(pick() * 4)
    const prev = grid.slice()
    if (dropOne(grid, x, size, dropLevel(drops.length / 2), rng).landed) {
      drops.push(x, size)
      beforeLast = prev
    }
  }

  const a = replay(seed, shape, drops).grid
  const b = replay(seed, shape, drops).grid
  check(same(a, b), `#${t} 두 번 계산 결과가 다름`)
  check(same(a, grid), `#${t} 재생 결과가 플레이와 다름`)
  check(same(replay(seed, shape, drops.slice(0, -2)).grid, beforeLast), `#${t} 되돌리기 결과가 다름`)
}

console.log(fail ? `${fail}개 실패` : '통과: 50개 작품, 재생·되돌리기 모두 같음')
process.exit(fail ? 1 : 0)
