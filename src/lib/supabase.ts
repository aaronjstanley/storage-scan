import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function keepalivePatch(
  table: string,
  id: string,
  body: Record<string, unknown>,
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch {
    // iOS home-screen web apps can cancel in-flight work while navigating.
  }
}

export type DbLocation = {
  id: string
  name: string
  sort_order: number
  container_count: number
  created_at: string
  updated_at: string
}

export type DbRow = {
  id: string
  location_id: string
  number: number
  created_at: string
  updated_at: string
}

export type DbContainer = {
  id: string
  location_id: string
  row_id: string | null
  number: number
  label: string
  contents: string
  photos: unknown
  created_at: string
  updated_at: string
}
