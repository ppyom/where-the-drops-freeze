// 데모용 물방울 목록 (홈 애니메이션, 모양 고르기 예시, 기본 공유 이미지). 작은 물방울이 많게.
import { mulberry32 } from './rng.ts'
import { type Shape, W } from './ice.ts'

export function demoDrops(seed: number, shape: Shape, n = 45) {
  const pick = mulberry32(seed)
  const spread = shape === 'flat' ? W * 0.8 : W * 0.4
  const drops: number[] = []
  for (let i = 0; i < n; i++) {
    drops.push(Math.round(W / 2 + (pick() - 0.5) * spread), 1 + Math.floor(pick() * pick() * 4))
  }
  return drops
}
