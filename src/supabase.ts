import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

export const erKonfigurert = !SUPABASE_URL.startsWith('FYLL') && !SUPABASE_ANON_KEY.startsWith('FYLL')

export const supabase = createClient(
  erKonfigurert ? SUPABASE_URL : 'https://example.supabase.co',
  erKonfigurert ? SUPABASE_ANON_KEY : 'x',
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'budsjett-innlogging' } },
)
