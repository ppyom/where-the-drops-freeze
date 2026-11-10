// 시드 PRNG (mulberry32). 같은 시드면 어느 기기에서든 같은 수열.
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 0 이상 n 미만 정수
export const randInt = (rng: Rng, n: number) => Math.floor(rng() * n)

// 새 작품 시드. 시드 자체는 아무 값이나 되므로 crypto 사용.
export const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]
