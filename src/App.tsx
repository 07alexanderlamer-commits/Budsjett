import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Briefcase, Clock, PieChart } from 'lucide-react'
import { supabase, erKonfigurert } from './supabase'
import { DataProvider, useData } from './data'
import { BudsjettVisning } from './views/Budsjett'
import { HistorikkVisning } from './views/Historikk'
import { BedriftVisning } from './views/Bedrift'
import { Innstillinger } from './views/Innstillinger'
import { Segment } from './ui'
import { HurtigKnapp } from './views/Hurtig'

export function App() {
  const [okt, setOkt] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOkt(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setOkt(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!erKonfigurert) return <div className="laster">Supabase er ikke satt opp i src/config.ts ennå.</div>
  if (okt === undefined) return <div className="laster">Laster…</div>
  if (!okt) return <Innlogging />
  return <DataProvider key={okt.user.id}><Hoved epost={okt.user.email ?? ''} /></DataProvider>
}

type Fane = 'budsjett' | 'historikk' | 'bedrift'

function Hoved({ epost }: { epost: string }) {
  const data = useData()
  const [fane, setFane] = useState<Fane>(() => (localStorage.getItem('fane') as Fane) || 'budsjett')
  const [innstillinger, setInnstillinger] = useState(false)
  useEffect(() => { try { localStorage.setItem('fane', fane) } catch { /* privat modus */ } window.scrollTo(0, 0) }, [fane])

  if (data.laster) return <div className="laster">Henter dataene dine…</div>
  return (
    <div className="app">
      {data.feil && <div className="varsel">{data.feil}</div>}
      {fane === 'budsjett' && <BudsjettVisning onInnstillinger={() => setInnstillinger(true)} />}
      {fane === 'historikk' && <HistorikkVisning />}
      {fane === 'bedrift' && <BedriftVisning />}
      {fane !== 'bedrift' && <HurtigKnapp />}
      <nav className="faner">
        <button className={'fane' + (fane === 'budsjett' ? ' aktiv' : '')} onClick={() => setFane('budsjett')}><PieChart size={24} />Budsjett</button>
        <button className={'fane' + (fane === 'historikk' ? ' aktiv' : '')} onClick={() => setFane('historikk')}><Clock size={24} />Historikk</button>
        <button className={'fane' + (fane === 'bedrift' ? ' aktiv' : '')} onClick={() => setFane('bedrift')}><Briefcase size={24} />Bedrift</button>
      </nav>
      {innstillinger && <Innstillinger epost={epost} onLukk={() => setInnstillinger(false)} />}
    </div>
  )
}

function Innlogging() {
  const [modus, setModus] = useState<'inn' | 'ny'>('inn')
  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [melding, setMelding] = useState<{ tekst: string; feil: boolean } | null>(null)
  const [jobber, setJobber] = useState(false)

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setJobber(true); setMelding(null)
    const { data, error } = modus === 'inn'
      ? await supabase.auth.signInWithPassword({ email: epost.trim(), password: passord })
      : await supabase.auth.signUp({ email: epost.trim(), password: passord })
    setJobber(false)
    if (error) {
      const t = error.message.includes('Invalid login') ? 'Feil e-post eller passord.'
        : error.message.includes('not confirmed') ? 'Kontoen er ikke bekreftet ennå.'
        : error.message.includes('Signups not allowed') ? 'Nye kontoer er skrudd av.'
        : error.message
      setMelding({ tekst: t, feil: true })
    } else if (modus === 'ny' && !data.session) {
      setMelding({ tekst: 'Kontoen er laget! Si ifra til Claude, så blir den aktivert – eller trykk på lenken i e-posten fra Supabase.', feil: false })
    }
  }

  return (
    <div className="logginn">
      <form className="boks" onSubmit={send}>
        <img src="./ikon-192.png" className="logo" alt="" />
        <h1 style={{ textAlign: 'center', fontSize: 28 }}>Budsjett</h1>
        <Segment valg={[{ verdi: 'inn', navn: 'Logg inn' }, { verdi: 'ny', navn: 'Ny konto' }]} verdi={modus} onEndre={v => { setModus(v); setMelding(null) }} />
        <div className="skjema">
          <label className="felt"><input type="email" autoComplete="email" placeholder="E-post" value={epost} onChange={e => setEpost(e.target.value)} required /></label>
          <label className="felt"><input type="password" autoComplete={modus === 'inn' ? 'current-password' : 'new-password'} placeholder="Passord" minLength={6} value={passord} onChange={e => setPassord(e.target.value)} required /></label>
        </div>
        <button className="knapp" disabled={jobber}>{jobber ? '…' : modus === 'inn' ? 'Logg inn' : 'Lag konto'}</button>
        {melding && <div className="fotnote" style={{ textAlign: 'center', color: melding.feil ? 'var(--rod)' : 'var(--gronn)', fontSize: 14 }}>{melding.tekst}</div>}
        <div className="fotnote" style={{ textAlign: 'center' }}>Du forblir innlogget på denne enheten.</div>
      </form>
    </div>
  )
}
