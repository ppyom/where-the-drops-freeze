// 인라인 SVG 아이콘 (24 그리드, 선 1.8, 둥근 끝). 스타일은 .icon-btn svg / .ico
const svg = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`

export const icons = {
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z"/>'),
  heart: svg('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>'),
  flag: svg('<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>'),
  grid: svg('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  stack: svg('<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>'),
  back: svg('<path d="m15 5-7 7 7 7"/>'),
}
