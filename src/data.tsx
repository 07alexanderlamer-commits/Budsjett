// Henter alle dataene ved innlogging og gir resten av appen funksjoner for å endre dem.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { STANDARD_INNSTILLINGER, type Innstillinger, type TabellNavn, type Tabeller } from './types'

type Lister = { [K in TabellNavn]: Tabeller[K][] }

const TOMME: Lister = { kategorier: [], utgifter: [], faste_utgifter: [], inntekter: [], mobiler: [], bedrift_utgifter: [], kjoreturer: [] }

// Tall-kolonner som skal være number (Postgres numeric kan komme som tekst)
const TALL: Partial<Record<TabellNavn, string[]>> = {
  kategorier: ['budsjett', 'rekkefolge'], utgifter: ['belop'], faste_utgifter: ['belop'], inntekter: ['belop'],
  mobiler: ['flipp_id', 'kjopspris', 'salgspris', 'profitt'], bedrift_utgifter: ['pris'], kjoreturer: ['km'],
}
function rens<T>(tabell: TabellNavn, rad: any): T {
  for (const k of TALL[tabell] ?? []) if (rad[k] != null) rad[k] = Number(rad[k])
  return rad as T
}

type Data = Lister & {
  innstillinger: Innstillinger
  laster: boolean
  feil: string | null
  leggTil: <K extends TabellNavn>(t: K, rad: Partial<Tabeller[K]>) => Promise<Tabeller[K] | null>
  oppdater: <K extends TabellNavn>(t: K, id: string, endring: Partial<Tabeller[K]>) => Promise<void>
  slett: (t: TabellNavn, id: string) => Promise<void>
  lagreInnstillinger: (endring: Partial<Innstillinger>) => Promise<void>
  lastPaaNytt: () => Promise<void>
  visFeil: (melding: string) => void
}

const DataKontekst = createContext<Data | null>(null)
export const useData = () => { const d = useContext(DataKontekst); if (!d) throw new Error('useData utenfor DataProvider'); return d }

export function DataProvider({ children }: { children: ReactNode }) {
  const [lister, setLister] = useState<Lister>(TOMME)
  const [innstillinger, setInnstillinger] = useState<Innstillinger>(STANDARD_INNSTILLINGER)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)

  const visFeil = useCallback((m: string) => { setFeil(m); setTimeout(() => setFeil(null), 4000) }, [])

  const lastPaaNytt = useCallback(async () => {
    const tabeller = Object.keys(TOMME) as TabellNavn[]
    const svar = await Promise.all(tabeller.map(t => supabase.from(t).select('*')))
    const ny = { ...TOMME } as any
    svar.forEach((s, i) => {
      if (s.error) { visFeil('Kunne ikke hente data: ' + s.error.message); return }
      ny[tabeller[i]] = (s.data ?? []).map(r => rens(tabeller[i], r))
    })
    setLister(ny)
    const inn = await supabase.from('innstillinger').select('*').maybeSingle()
    if (inn.data) setInnstillinger({ ...STANDARD_INNSTILLINGER, ...inn.data, bedrift_kapital: Number(inn.data.bedrift_kapital) })
    setLaster(false)
  }, [visFeil])

  useEffect(() => { lastPaaNytt() }, [lastPaaNytt])

  const leggTil = useCallback(async <K extends TabellNavn>(t: K, rad: Partial<Tabeller[K]>) => {
    const { data, error } = await supabase.from(t).insert(rad as any).select().single()
    if (error || !data) { visFeil('Lagring feilet: ' + (error?.message ?? 'ukjent feil')); return null }
    const ny = rens<Tabeller[K]>(t, data)
    setLister(l => ({ ...l, [t]: [...l[t], ny] }))
    return ny
  }, [visFeil])

  const oppdater = useCallback(async <K extends TabellNavn>(t: K, id: string, endring: Partial<Tabeller[K]>) => {
    // Oppdater skjermen med en gang, og lagre i bakgrunnen
    setLister(l => ({ ...l, [t]: (l[t] as any[]).map(r => (r.id === id ? { ...r, ...endring } : r)) }))
    const { error } = await supabase.from(t).update(endring as any).eq('id', id)
    if (error) { visFeil('Lagring feilet: ' + error.message); lastPaaNytt() }
  }, [visFeil, lastPaaNytt])

  const slett = useCallback(async (t: TabellNavn, id: string) => {
    setLister(l => ({ ...l, [t]: (l[t] as any[]).filter(r => r.id !== id) }))
    const { error } = await supabase.from(t).delete().eq('id', id)
    if (error) { visFeil('Sletting feilet: ' + error.message); lastPaaNytt() }
  }, [visFeil, lastPaaNytt])

  const lagreInnstillinger = useCallback(async (endring: Partial<Innstillinger>) => {
    const ny = { ...innstillinger, ...endring }
    setInnstillinger(ny)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('innstillinger').upsert({ ...ny, user_id: session.user.id } as any, { onConflict: 'user_id' })
    if (error) visFeil('Lagring feilet: ' + error.message)
  }, [innstillinger, visFeil])

  const verdi = useMemo<Data>(() => ({
    ...lister, innstillinger, laster, feil, leggTil, oppdater, slett, lagreInnstillinger, lastPaaNytt, visFeil,
  }), [lister, innstillinger, laster, feil, leggTil, oppdater, slett, lagreInnstillinger, lastPaaNytt, visFeil])

  return <DataKontekst.Provider value={verdi}>{children}</DataKontekst.Provider>
}

/** Samler det budsjett-utregningene trenger */
export function useBudsjettdata() {
  const d = useData()
  return useMemo(() => ({
    utgifter: d.utgifter, faste: d.faste_utgifter, inntekter: d.inntekter, kategorier: d.kategorier,
    mobiler: d.mobiler, utstyr: d.bedrift_utgifter,
  }), [d.utgifter, d.faste_utgifter, d.inntekter, d.kategorier, d.mobiler, d.bedrift_utgifter])
}
