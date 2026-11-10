// 예외 화면: 없는 주소, 작품 없음, 불러오기 실패, 불러오는 중.
export function renderMessage(app: HTMLElement, title: string, text: string, action?: { label: string; href: string }) {
  app.innerHTML = `
    <div class="message">
      <h1 class="message-title">${title}</h1>
      <p class="message-text">${text}</p>
      ${action ? `<a class="btn-primary block" href="${action.href}">${action.label}</a>` : ''}
      ${action?.href !== '/' ? `<a class="btn-text" href="/">홈으로</a>` : ''}
    </div>
  `
}

export function renderLoading(app: HTMLElement) {
  app.innerHTML = `<div class="message"><p class="message-text">불러오는 중…</p></div>`
}
