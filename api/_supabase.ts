// 서버 함수용 작품 읽기 (REST). 숨김 작품은 RLS가 걸러서 null.
import type { Shape } from '../src/core/ice.ts'

declare const process: { env: Record<string, string | undefined> }

export type ArtworkData = { seed: number; shape: Shape; drops: number[]; drop_count: number }

export async function fetchArtwork(id: string): Promise<ArtworkData | null> {
  if (!/^[a-z0-9]{7}$/.test(id)) return null
  const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  const res = await fetch(`${url}/rest/v1/artworks?id=eq.${id}&select=seed,shape,drops,drop_count`, {
    headers: { apikey: key },
  })
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  const rows = (await res.json()) as ArtworkData[]
  return rows[0] ?? null
}
