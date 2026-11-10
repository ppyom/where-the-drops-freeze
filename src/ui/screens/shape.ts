// 모양 고르기(/shape): 세모, 플랫. 고르면 바로 플레이로.
import { type Shape, W, H } from '../../core/ice.ts'
import { screenShell } from './gallery.ts'
import { drawDemo } from './home.ts'

const SHAPES: [Shape, string, string][] = [
  ['triangle', '세모', '가운데에서 위로 자라요'],
  ['flat', '플랫', '바닥 전체에서 자라요'],
]

export function renderShape(app: HTMLElement) {
  const body = screenShell(app, '모양 고르기')
  body.innerHTML = `<div class="cards">${SHAPES.map(([s, name, desc]) => `
    <a class="card glass" href="/play?shape=${s}">
      <canvas width="${W * 4}" height="${H * 4}" data-shape="${s}" aria-hidden="true"></canvas>
      <div class="card-info"><strong>${name}</strong><span>${desc}</span></div>
    </a>`).join('')}
  </div>`
  // 예시: 이 모양에서 자란 모습
  body.querySelectorAll('canvas').forEach((c, i) => drawDemo(c, 10 + i, c.dataset.shape as Shape))
}
