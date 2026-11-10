// Supabase 저장/불러오기/좋아요/신고. 로그인은 화면에 안 보이게 익명으로.
// 실패하면 서버 에러 코드(daily_limit 등)를 Error.message로 던진다.
import { createClient } from '@supabase/supabase-js'
import type { Shape } from '../core/ice.ts'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

export type Artwork = { seed: number; shape: Shape; drops: number[] }
export type ArtworkRow = Artwork & {
  id: string
  drop_count: number
  like_count: number
  created_at: string
  hidden?: boolean // 내 작품에서만
}
export type ReportReason = 'ugly' | 'spam' | 'etc'

const COLUMNS = 'id, seed, shape, drops, drop_count, like_count, created_at'

// 세션이 없으면 익명 로그인 (Turnstile 토큰 필요). 세션은 브라우저에 남아서 다음엔 같은 사용자.
async function ensureUser() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const captchaToken = await turnstileToken()
  const { data: d, error } = await supabase.auth.signInAnonymously({ options: { captchaToken } })
  if (error) throw error
  return d.user!.id
}

// ── Cloudflare Turnstile: 처음 익명 로그인할 때만. 확인이 필요할 때만 위젯이 보인다. ──
declare global {
  interface Window {
    turnstile: {
      render(el: HTMLElement, opts: Record<string, unknown>): string
      remove(id: string): void
    }
  }
}

let turnstileScript: Promise<void> | undefined
const loadTurnstile = () =>
  (turnstileScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.onload = () => resolve()
    s.onerror = () => {
      turnstileScript = undefined // 다음에 다시 시도
      reject(new Error('captcha_failed'))
    }
    document.head.append(s)
  }))

async function turnstileToken(): Promise<string> {
  await loadTurnstile()
  return new Promise((resolve, reject) => {
    const box = document.createElement('div')
    box.className = 'captcha'
    document.body.append(box)
    const finish = (fn: () => void) => {
      window.turnstile.remove(id)
      box.remove()
      fn()
    }
    const id = window.turnstile.render(box, {
      sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      appearance: 'interaction-only',
      theme: 'dark',
      callback: (token: string) => finish(() => resolve(token)),
      // 에러 코드는 'captcha_failed:110200'처럼 붙여서 원인을 알 수 있게
      'error-callback': (code: string) => {
        console.error('Turnstile error', code)
        finish(() => reject(new Error(`captcha_failed:${code}`)))
        return true
      },
      'timeout-callback': () => finish(() => reject(new Error('captcha_failed:timeout'))),
    })
  })
}

async function rpc<T>(fn: string, args?: object): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

// 저장하고 작품 id를 돌려준다.
export async function saveArtwork(a: Artwork): Promise<string> {
  await ensureUser()
  return rpc<string>('save_artwork', { p_seed: a.seed, p_shape: a.shape, p_drops: a.drops })
}

// 공유 링크로 열 때. 없거나 숨김이면 null.
export async function loadArtwork(id: string): Promise<ArtworkRow | null> {
  const { data, error } = await supabase.from('artworks').select(COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as ArtworkRow | null
}

// 갤러리: 좋아요 순
export const popularArtworks = (offset = 0, limit = 20) =>
  rpc<ArtworkRow[]>('popular_artworks', { p_limit: limit, p_offset: offset })

// 내 작품 (숨겨진 것 포함)
export async function myArtworks() {
  await ensureUser()
  return rpc<ArtworkRow[]>('my_artworks')
}

// 좋아요. 현재 좋아요 수를 돌려준다. 두 번 눌러도 1번만.
export async function likeArtwork(id: string) {
  await ensureUser()
  return rpc<number>('like_artwork', { p_id: id })
}

// 내가 이미 좋아요 했는지. 로그인 전이면 false.
export async function hasLiked(id: string) {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return false
  const { data: row } = await supabase
    .from('likes')
    .select('artwork_id')
    .eq('artwork_id', id)
    .eq('user_id', data.session.user.id)
    .maybeSingle()
  return !!row
}

export async function reportArtwork(id: string, reason: ReportReason) {
  await ensureUser()
  await rpc('report_artwork', { p_id: id, p_reason: reason })
}

export const shareUrl = (id: string) => `${location.origin}/a/${id}`

// 30일 보관. 남은 날 (올림)
export const daysLeft = (createdAt: string) =>
  Math.max(0, Math.ceil(30 - (Date.now() - new Date(createdAt).getTime()) / 86_400_000))
