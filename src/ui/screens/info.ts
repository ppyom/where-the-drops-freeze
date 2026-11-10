// 소개(/about), 개인정보처리방침(/privacy): 글만 있는 화면.
import { screenShell } from './gallery.ts'

const EMAIL = 'ppyom2@gmail.com'
const mail = `<a href="mailto:${EMAIL}">${EMAIL}</a>`
const ext = (href: string, label: string) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`

export function renderAbout(app: HTMLElement) {
  const body = screenShell(app, '소개')
  body.innerHTML = `
    <article class="doc">
      <p>Where the Drops Freeze는 물방울을 떨어뜨려 유리 같은 얼음 결정을 키우는 작은 게임이에요.
        완성한 얼음은 하나의 작품이 되고, 링크로 나누면 받은 사람 화면에서 처음부터 다시 자라요.</p>

      <h2>하는 법</h2>
      <ul>
        <li>화면을 누르고 있으면 물방울이 커져요. 손을 떼면 그 자리에서 떨어져요.</li>
        <li>물방울은 얼음에 닿으면 근처에 얼어붙고, 위로 가는 줄기를 뻗어요.</li>
        <li>얼음에 닿지 못하고 바닥까지 떨어진 물방울은 사라져요.</li>
        <li>물방울을 5개 이상 붙이면 완성할 수 있어요. 마지막 물방울은 몇 번이든 되돌릴 수 있어요.</li>
      </ul>

      <h2>작품 보관</h2>
      <p>저장한 작품은 30일 동안 보관된 뒤 자동으로 지워져요.
        갤러리에서 다른 사람의 작품에 좋아요를 누르거나, 불편한 작품을 신고할 수 있어요.</p>

      <h2>문의</h2>
      <p>${mail}</p>
      <p><a href="/privacy">개인정보처리방침</a></p>
    </article>
  `
}

export function renderPrivacy(app: HTMLElement) {
  const body = screenShell(app, '개인정보처리방침')
  body.innerHTML = `
    <article class="doc">
      <p>Where the Drops Freeze(이하 "서비스")는 이름, 이메일, 전화번호처럼 나를 알아볼 수 있는 정보를 받지 않아요.
        서비스를 이용하면서 만들어지는 정보와 그 쓰임은 아래와 같아요.</p>

      <h2>1. 처리하는 정보</h2>
      <ul>
        <li>익명 사용자 ID: 처음 작품을 저장하거나 좋아요를 누를 때 자동으로 만들어져 브라우저에 저장돼요.</li>
        <li>작품 정보: 시드, 시작 모양, 물방울 목록, 만든 시각</li>
        <li>좋아요·신고 기록: 어떤 작품에 남겼는지, 신고 사유, 남긴 시각</li>
        <li>자동으로 수집되는 정보: 접속 IP, 브라우저·기기 종류, 방문 기록, 쿠키</li>
      </ul>

      <h2>2. 쓰는 목적</h2>
      <ul>
        <li>작품 저장과 공유 링크 제공, 내 작품 목록 보여주기</li>
        <li>좋아요·신고 중복 방지, 신고가 쌓인 작품 숨기기</li>
        <li>자동 프로그램 확인과 하루 저장 개수 제한 같은 남용 방지</li>
        <li>방문 통계 분석과 광고 게재</li>
      </ul>

      <h2>3. 보관 기간</h2>
      <p>작품은 만든 지 30일이 지나면 자동으로 지워지고, 그 작품의 좋아요·신고 기록도 함께 지워져요.
        익명 사용자 ID는 브라우저 저장소를 지우면 더 이상 연결되지 않아요.</p>

      <h2>4. 함께 쓰는 외부 서비스</h2>
      <p>서비스 운영을 위해 아래 업체에 정보 처리를 맡기고 있어요. 각 업체의 서버는 해외에 있을 수 있어요.</p>
      <ul>
        <li>Supabase: 익명 로그인, 작품·좋아요·신고 저장</li>
        <li>Vercel: 웹사이트 호스팅, 공유 미리보기 이미지 생성</li>
        <li>Cloudflare Turnstile: 자동 프로그램 확인</li>
        <li>Google Analytics: 방문 통계</li>
        <li>Google AdSense: 광고 게재</li>
      </ul>

      <h2>5. 쿠키와 광고</h2>
      <p>Google을 비롯한 제3자 광고 업체는 쿠키를 사용해 이 사이트나 다른 사이트를 방문한 기록을 바탕으로 광고를 보여줄 수 있어요.
        Google이 광고 쿠키를 쓰는 방식은 ${ext('https://policies.google.com/technologies/ads', 'Google 광고 정책')}에서 볼 수 있어요.</p>
      <ul>
        <li>맞춤 광고 끄기: ${ext('https://myadcenter.google.com', 'Google 내 광고 센터')}</li>
        <li>Google Analytics 수집 거부: ${ext('https://tools.google.com/dlpage/gaoptout', 'Google Analytics 차단 부가기능')}</li>
        <li>브라우저 설정에서 쿠키 저장을 거부하거나 지울 수 있어요. 이 경우 내 작품 목록과 좋아요 기록이 보이지 않을 수 있어요.</li>
      </ul>

      <h2>6. 내 정보 관리</h2>
      <p>내 작품을 지우고 싶다면 작품 링크와 함께 아래 이메일로 알려주세요. 확인 후 지워 드려요.</p>

      <h2>7. 개인정보 보호책임자</h2>
      <p>ppyom · ${mail}</p>

      <p class="doc-date">시행일: 2026년 11월 10일</p>
    </article>
  `
}
