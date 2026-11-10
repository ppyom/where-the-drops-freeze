// /a/{id} 요청: index.html에 그 작품의 공유 미리보기 태그(og:*)를 끼워서 돌려준다.
// 메신저 미리보기는 JS를 실행하지 않아서 서버에서 넣어야 한다. 화면은 평소처럼 SPA가 그린다.
import { fetchArtwork } from './_supabase.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const [html, art] = await Promise.all([
    fetch(`${url.origin}/index.html`).then(r => r.text()),
    fetchArtwork(id).catch(() => null),
  ])

  const title = art ? `물방울 ${art.drop_count}개로 자란 얼음` : 'Where the Drops Freeze'
  const desc = art ? '링크를 열면 처음부터 다시 자라요.' : '물방울을 떨어뜨려 얼음을 키워요.'
  const tags = `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Where the Drops Freeze" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${url.origin}/a/${esc(id)}" />
    <meta property="og:image" content="${url.origin}/api/og${art ? `?id=${id}` : ''}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="description" content="${esc(desc)}" />`

  // index.html의 <!--og--> ~ <!--/og--> 를 교체
  const out = html.replace(/<!--og-->[\s\S]*?<!--\/og-->/, `<!--og-->${tags}\n    <!--/og-->`)
  return new Response(out, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600', // 배포하면 index.html이 바뀌니 CDN만 1시간
    },
  })
}
