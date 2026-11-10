// 플레이 화면: 길게 누르기 입력, 낙하 연출, 얼음 그리기, 반짝임.
// 얼음 계산은 core에서 즉시 끝내고, 화면은 낙하 연출이 끝난 물방울만 보여준다.
import * as Phaser from 'phaser'
import { type Rng, mulberry32, newSeed } from '../core/rng.ts'
import {
  type Grid, type Shape, W, H, MAX_DROPS, MAX_SIZE_SUM,
  createGrid, dropOne, dropLevel, sizeFromMs,
} from '../core/ice.ts'
import { replay } from '../core/replay.ts'
import { drawIce } from './draw.ts'

export const S = Math.round(720 / W) // 셀 1칸 크기(px). 캔버스 폭 약 720px
const TOP = 28 // 물방울 미리보기 높이(px)
const RADIUS = [0, 5, 8, 11, 14] // 크기별 미리보기 반지름
const PLAY_STEP = 60 // 재생: 물방울 1개당 ms

export class IceScene extends Phaser.Scene {
  seed = newSeed()
  shape: Shape = 'triangle'
  rng: Rng = mulberry32(this.seed)
  grid: Grid = createGrid(this.shape)
  drops: number[] = [] // [x, size, x, size, ...]
  sizeSum = 0
  shown = new Uint8Array(MAX_DROPS + 2) // level별로 화면에 보이는지

  tex!: Phaser.Textures.CanvasTexture
  preview!: Phaser.GameObjects.Graphics
  pressAt = -1
  pressX = 0
  hover = false // 가이드 표시 여부 (마우스 올림 또는 누르는 중)
  playing = false // 재생 중엔 입력 막음
  viewOnly = false // 공유 링크 보기: 입력 없음
  falling: Phaser.GameObjects.Arc[] = [] // 낙하 연출 중인 물방울

  constructor() {
    super('ice')
  }

  create() {
    this.makeStar()
    this.tex = this.textures.createCanvas('ice', W * S, H * S)!
    this.add.image(0, 0, 'ice').setOrigin(0)
    this.preview = this.add.graphics()
    this.shape = this.registry.get('shape') ?? 'triangle' // 모양 고르기에서 넘어온 값
    this.recompute()
    this.shown[1] = 1
    this.redraw()

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.playing || this.viewOnly) return
      this.pressAt = this.time.now
      this.pressX = this.toGridX(p.x)
      this.hover = true
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pressX = this.toGridX(p.x)
      this.hover = true
    })
    const up = (p: Phaser.Input.Pointer) => {
      this.release()
      if (p.wasTouch) this.hover = false // 터치는 떼면 가이드도 숨김
    }
    this.input.on('pointerup', up)
    this.input.on('pointerupoutside', up)
    this.input.on('gameout', () => {
      if (this.pressAt < 0) this.hover = false
    })
    this.emitCount()
    this.game.events.emit('ready-scene')
  }

  // 공유 링크: 받은 작품을 처음부터 재생
  view(art: { seed: number; shape: Shape; drops: number[] }) {
    this.viewOnly = true
    this.seed = art.seed
    this.shape = art.shape
    this.drops = art.drops
    this.playback()
  }

  update(time: number) {
    const g = this.preview
    g.clear()
    if (!this.hover || this.playing || this.viewOnly) return
    const pressing = this.pressAt >= 0
    const size = pressing ? sizeFromMs(time - this.pressAt) : 1
    const px = this.pressX * S + S / 2

    // 낙하 가이드 점선: 얼음에 처음 닿는 곳까지
    const endY = this.contactY(this.pressX) * S
    g.lineStyle(2, 0xbfe9fb, pressing ? 0.45 : 0.25)
    for (let y = TOP + RADIUS[size] + 6; y < endY; y += 14) {
      g.lineBetween(px, y, px, Math.min(y + 7, endY))
    }

    // 물방울 미리보기 (안 누를 땐 흐리게)
    const a = pressing ? 1 : 0.45
    g.fillStyle(0x7cc8f0, 0.25 * a).fillCircle(px, TOP, RADIUS[size] + 4)
    g.fillStyle(0xbfe9fb, 0.9 * a).fillCircle(px, TOP, RADIUS[size])
  }

  // 이 열에서 화면에 보이는 얼음에 처음 닿는 y (격자). 없으면 H. 읽기만 함.
  contactY(x: number) {
    const g = this.grid, shown = this.shown
    for (let y = 0; y < H; y++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < W && ny >= 0 && ny < H && shown[g[ny * W + nx]] === 1) return y
        }
      }
    }
    return H
  }

  toGridX(px: number) {
    return Phaser.Math.Clamp(Math.floor(px / S), 0, W - 1)
  }

  release() {
    if (this.pressAt < 0) return
    const size = sizeFromMs(this.time.now - this.pressAt)
    const x = this.pressX
    this.pressAt = -1
    const n = this.drops.length / 2
    if (n >= MAX_DROPS || this.sizeSum + size > MAX_SIZE_SUM) {
      this.game.events.emit('limit', n >= MAX_DROPS ? 'count' : 'size')
      return
    }

    // 계산은 지금 바로 (순서 보장), 화면 반영은 착지 후
    const level = dropLevel(n)
    const r = dropOne(this.grid, x, size, level, this.rng)
    // 바닥까지 떨어진 물방울은 기록·개수에서 뺀다 (이때는 rng도 안 씀)
    if (r.landed) {
      this.drops.push(x, size)
      this.sizeSum += size
      this.emitCount()
    }
    this.fall(r.landed, x, r.x, r.y, size, level)
  }

  fall(landed: boolean, x: number, lx: number, ly: number, size: number, level: number) {
    const endY = landed ? ly * S : H * S + 20
    const drop = this.add.circle(x * S + S / 2, TOP, RADIUS[size], 0xbfe9fb, 0.9)
    this.falling.push(drop)
    this.tweens.add({
      targets: drop,
      y: endY,
      x: landed ? lx * S + S / 2 : drop.x,
      duration: Math.max(120, (endY - TOP) / 1.6),
      ease: 'Quad.easeIn',
      onComplete: () => {
        drop.destroy()
        this.falling = this.falling.filter(d => d !== drop)
        if (!landed) return
        this.shown[level] = 1
        this.redraw()
        this.sparkle(lx * S + S / 2, ly * S + S / 2, size)
      },
    })
  }

  // 되돌리기: 마지막 물방울을 빼고 처음부터 다시 계산
  undo() {
    if (this.playing || this.drops.length === 0) return
    this.drops.splice(-2)
    this.recompute()
    this.showUpTo(this.drops.length / 2)
    this.redraw()
    this.emitCount()
  }

  // 재생: 계산은 한 번에, 화면엔 물방울을 하나씩
  playback() {
    if (this.playing) return
    const { points } = this.recompute()
    const n = this.drops.length / 2
    this.showUpTo(0)
    this.redraw()
    this.game.events.emit('count', 0)
    if (n === 0) return
    this.playing = true
    this.hover = false
    this.pressAt = -1
    let i = 0
    this.time.addEvent({
      delay: PLAY_STEP,
      repeat: n - 1,
      callback: () => {
        this.shown[dropLevel(i)] = 1
        this.redraw()
        this.sparkle(points[i * 2] * S + S / 2, points[i * 2 + 1] * S + S / 2, this.drops[i * 2 + 1])
        this.game.events.emit('count', ++i)
        if (i === n) this.playing = false
      },
    })
  }

  // drops로 격자·rng·크기 합을 다시 만든다. 낙하 중인 물방울은 치움.
  recompute() {
    for (const d of this.falling) {
      this.tweens.killTweensOf(d)
      d.destroy()
    }
    this.falling = []
    const r = replay(this.seed, this.shape, this.drops)
    this.grid = r.grid
    this.rng = r.rng
    this.sizeSum = this.drops.reduce((sum, v, k) => (k % 2 ? sum + v : sum), 0)
    return r
  }

  // 새 작품: 새 시드, 빈 drops
  reset() {
    this.seed = newSeed()
    this.drops = []
    this.recompute()
    this.showUpTo(0)
    this.redraw()
    this.emitCount()
  }

  // 시작 모양 + 앞에서 count개 물방울만 보이게
  showUpTo(count: number) {
    this.shown.fill(0)
    this.shown[1] = 1
    for (let i = 0; i < count; i++) this.shown[dropLevel(i)] = 1
  }

  // 4각 별 반짝임 약 0.3초
  sparkle(x: number, y: number, size: number) {
    const star = this.add.image(x, y, 'star')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.1)
      .setAngle(this.drops.length * 17)
    this.tweens.add({
      targets: star,
      scale: 0.6 + size * 0.2,
      angle: star.angle + 30,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => star.destroy(),
    })
  }

  makeStar() {
    const g = this.add.graphics()
    const pts: Phaser.Math.Vector2[] = []
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 4 : 30
      const a = (i * Math.PI) / 4
      pts.push(new Phaser.Math.Vector2(32 + Math.cos(a) * r, 32 + Math.sin(a) * r))
    }
    g.fillStyle(0xbfe9fb, 0.25).fillCircle(32, 32, 12)
    g.fillStyle(0xffffff, 1).fillPoints(pts, true)
    g.generateTexture('star', 64, 64)
    g.destroy()
  }

  // 보이는 셀로 5겹 얼음을 다시 그린다. 착지할 때만 호출.
  redraw() {
    drawIce(this.tex.context, this.grid, v => this.shown[v] === 1, S)
    this.tex.refresh()
  }

  emitCount() {
    this.game.events.emit('count', this.drops.length / 2, this.sizeSum)
  }
}
