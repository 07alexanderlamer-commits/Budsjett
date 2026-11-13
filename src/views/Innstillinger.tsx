import { useState } from 'react'
import { Briefcase, ChevronDown, ChevronUp, Plus, Download, LogOut } from 'lucide-react'
import { useBudsjettdata, useData } from '../data'
import { supabase } from '../supabase'
import { d, maanedsResultat, sammeMaaned } from '../regnskap'
import { budsjettEksport } from '../eksport'
import { fraInputDato, inputDato, kr, lesTall } from '../format'
import { Ark, Bryter, Segment, Skjema, SveipRad, Seksjon, Tekstfelt, Velger, bekreft, delFil } from '../ui'
import type { FastUtgift, Inntekt, Kategori } from '../types'

export function Innstillinger({ onLukk, epost }: { onLukk: () => void; epost: string }) {
  const data = useData()
  const b = useBudsjettdata()
  const [nyInntekt, setNyInntekt] = useState(false)
  const [fast, setFast] = useState<FastUtgift | 'ny' | null>(null)
  const [bedriftInfo, setBedriftInfo] = useState(false)
  const [bytt, setBytt] = useState(false)
  const bedriftRes = maanedsResultat(new Date(), data.mobiler, data.bedrift_utgifter, data.faste_utgifter)
  const inntekter = [...data.inntekter].sort((a, b) => Number(b.er_fast) - Number(a.er_fast) || b.dato.localeCompare(a.dato))
  const kategorier = [...data.kategorier].sort((a, b) => a.rekkefolge - b.rekkefolge)

  const flytt = async (k: Kategori, retning: -1 | 1) => {
    const i = kategorier.indexOf(k), j = i + retning
    if (j < 0 || j >= kategorier.length) return
    const ny = [...kategorier];[ny[i], ny[j]] = [ny[j], ny[i]]
    await Promise.all(ny.map((kat, idx) => kat.rekkefolge !== idx ? data.oppdater('kategorier', kat.id, { rekkefolge: idx }) : null))
  }

  return (
    <Ark tittel="Innstillinger" onLukk={onLukk}>
      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Inntekt denne måneden</span>}>
        <div className="listerad">
          <div className="vokse kolonne" style={{ gap: 2 }}>
            <span className="rad fet" style={{ gap: 6 }}>Bedrift <Briefcase size={16} className="bla" /></span>
            <span className="liten">{bedriftRes < 0 ? `Bedriften går ${kr(Math.abs(bedriftRes))} kr i minus – teller som 0` : 'Automatisk fra Bedrift-fanen'}</span>
          </div>
          <span className="fet tall">{kr(Math.max(0, bedriftRes))} kr</span>
        </div>
        {inntekter.map(i => (
          <SveipRad key={i.id} onSlett={() => data.slett('inntekter', i.id)}>
            <div className="listerad" style={{ opacity: !i.er_fast && !sammeMaaned(d(i.dato), new Date()) ? 0.5 : 1 }}>
              <div className="vokse kolonne" style={{ gap: 2 }}>
                <span className="fet">{i.tittel}</span>
                <span className="liten">{i.er_fast ? 'Fast hver måned' : `Engangsinntekt · ${d(i.dato).toLocaleDateString('nb-NO')}`}</span>
              </div>
              <span className="fet tall">{kr(i.belop)} kr</span>
            </div>
          </SveipRad>
        ))}
        <button className="listerad" onClick={() => setNyInntekt(true)}><Plus size={20} className="bla" /><span className="fet">Legg til inntekt</span></button>
      </Seksjon>

      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Faste utgifter hver måned</span>}>
        {data.faste_utgifter.map(f => (
          <SveipRad key={f.id} onSlett={() => data.slett('faste_utgifter', f.id)}>
            <button className="listerad" onClick={() => setFast(f)}>
              <div className="vokse kolonne" style={{ gap: 2 }}>
                <span className="rad fet" style={{ gap: 6 }}>{f.tittel}{f.er_bedrift && <Briefcase size={15} className="bla" />}</span>
                <span className="liten">{f.kategori}</span>
              </div>
              <span className="fet tall">{kr(f.belop)} kr</span>
            </button>
          </SveipRad>
        ))}
        <button className="listerad" onClick={() => setFast('ny')}><Plus size={20} className="bla" /><span className="fet">Legg til fast utgift</span></button>
      </Seksjon>

      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Kategorier og budsjett-tak</span>} fotnote="Endrer du navnet på en kategori, flyttes utgiftene i den med.">
        {kategorier.map((k, i) => <KategoriRad key={k.id} kategori={k} forste={i === 0} siste={i === kategorier.length - 1} onFlytt={r => flytt(k, r)} />)}
      </Seksjon>

      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Bedrift</span>}>
        <BelopRad etikett="Startkapital" verdi={data.innstillinger.bedrift_kapital} onLagre={v => data.lagreInnstillinger({ bedrift_kapital: v })} />
        <button className="listerad" onClick={() => setBedriftInfo(true)}><span className="vokse">Firmainfo på kvitteringer</span><span className="gra">{data.innstillinger.firmanavn}</span></button>
      </Seksjon>

      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Eksport</span>}
        fotnote="Lager et regneark med alle utgifter, inntekter, faste utgifter, budsjett-tak og bedriftens resultat per måned. Ingenting slettes fra appen.">
        <button className="listerad" onClick={() => delFil(`Budsjett_eksport_${inputDato(new Date())}.csv`, budsjettEksport({ ...b, faste: data.faste_utgifter, firmanavn: data.innstillinger.firmanavn }))}>
          <Download size={20} className="gronn" /><span className="fet">Eksporter alt til Excel</span>
        </button>
      </Seksjon>

      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Konto</span>}>
        <div className="listerad"><span className="vokse gra">Innlogget som</span><span className="ellipse">{epost}</span></div>
        <button className="listerad" onClick={() => setBytt(true)}><span className="vokse fet">Bytt passord</span></button>
        <button className="listerad" onClick={async () => { if (bekreft('Logge ut?')) await supabase.auth.signOut() }}><LogOut size={20} className="rod" /><span className="rod fet">Logg ut</span></button>
      </Seksjon>

      {nyInntekt && <NyInntekt onLukk={() => setNyInntekt(false)} />}
      {fast && <FastUtgiftArk utgift={fast === 'ny' ? null : fast} onLukk={() => setFast(null)} />}
      {bedriftInfo && <Firmainfo onLukk={() => setBedriftInfo(false)} />}
      {bytt && <ByttPassord onLukk={() => setBytt(false)} />}
    </Ark>
  )
}

function KategoriRad({ kategori, forste, siste, onFlytt }: { kategori: Kategori; forste: boolean; siste: boolean; onFlytt: (r: -1 | 1) => void }) {
  const data = useData()
  const [navn, setNavn] = useState(kategori.navn)
  const [budsjett, setBudsjett] = useState(String(kategori.budsjett))
  const lagreNavn = async () => {
    const nytt = navn.trim()
    if (!nytt || nytt === kategori.navn) { setNavn(kategori.navn); return }
    await data.oppdater('kategorier', kategori.id, { navn: nytt })
    // Flytt utgiftene og de faste utgiftene over til det nye navnet
    await supabase.from('utgifter').update({ kategori: nytt }).eq('kategori', kategori.navn)
    await supabase.from('faste_utgifter').update({ kategori: nytt }).eq('kategori', kategori.navn)
    await data.lastPaaNytt()
  }
  return (
    <div className="listerad" style={{ gap: 8 }}>
      <input type="color" value={kategori.farge} onChange={e => data.oppdater('kategorier', kategori.id, { farge: e.target.value })}
        style={{ width: 30, height: 30, border: 0, padding: 0, background: 'none', flexShrink: 0 }} aria-label="Farge" />
      <input className="velg" value={navn} onChange={e => setNavn(e.target.value)} onBlur={lagreNavn} style={{ width: 0, flex: 1 }} aria-label="Navn" />
      <input className="velg tall" value={budsjett} inputMode="numeric" onChange={e => setBudsjett(e.target.value)} style={{ width: 82, textAlign: 'right' }} aria-label="Budsjett"
        onBlur={() => { const t = lesTall(budsjett) ?? 0; setBudsjett(String(t)); if (t !== kategori.budsjett) data.oppdater('kategorier', kategori.id, { budsjett: t }) }} />
      <div className="kolonne" style={{ gap: 0 }}>
        <button disabled={forste} onClick={() => onFlytt(-1)} style={{ opacity: forste ? 0.2 : 0.8 }} aria-label="Flytt opp"><ChevronUp size={18} /></button>
        <button disabled={siste} onClick={() => onFlytt(1)} style={{ opacity: siste ? 0.2 : 0.8 }} aria-label="Flytt ned"><ChevronDown size={18} /></button>
      </div>
    </div>
  )
}

function BelopRad({ etikett, verdi, onLagre }: { etikett: string; verdi: number; onLagre: (v: number) => void }) {
  const [tekst, setTekst] = useState(String(verdi))
  return (
    <label className="listerad">
      <span className="vokse">{etikett}</span>
      <input className="velg tall" value={tekst} inputMode="numeric" style={{ width: 110, textAlign: 'right' }}
        onChange={e => setTekst(e.target.value)} onBlur={() => { const t = lesTall(tekst); if (t != null && t !== verdi) onLagre(t); else setTekst(String(verdi)) }} />
    </label>
  )
}

function NyInntekt({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const [erFast, setErFast] = useState(true)
  const [tittel, setTittel] = useState('')
  const [belop, setBelop] = useState('')
  const [dato, setDato] = useState(inputDato(new Date()))
  const tall = lesTall(belop)
  return (
    <Ark tittel="Ny inntekt" onLukk={onLukk} kanLagre={!!tittel && tall != null}
      onLagre={async () => {
        const nyDato = erFast || dato === inputDato(new Date()) ? new Date() : fraInputDato(dato)
        if (await data.leggTil('inntekter', { tittel, belop: tall!, er_fast: erFast, dato: nyDato.toISOString() } as Partial<Inntekt>)) onLukk()
      }}>
      <Segment valg={[{ verdi: 'fast', navn: 'Fast hver måned' }, { verdi: 'engang', navn: 'Engangsinntekt' }]} verdi={erFast ? 'fast' : 'engang'} onEndre={v => setErFast(v === 'fast')} />
      <Skjema>
        <Tekstfelt verdi={tittel} onEndre={setTittel} plassholder="Hva er det? (f.eks. Lønn, Vipps)" autoFokus />
        <Tekstfelt verdi={belop} onEndre={setBelop} plassholder="Beløp" tall />
        {!erFast && <Tekstfelt etikett="Dato" type="date" verdi={dato} onEndre={setDato} />}
      </Skjema>
    </Ark>
  )
}

function FastUtgiftArk({ utgift, onLukk }: { utgift: FastUtgift | null; onLukk: () => void }) {
  const data = useData()
  const kategorier = [...data.kategorier].sort((a, b) => a.rekkefolge - b.rekkefolge)
  const [tittel, setTittel] = useState(utgift?.tittel ?? '')
  const [belop, setBelop] = useState(utgift ? String(utgift.belop) : '')
  const [kategori, setKategori] = useState(utgift?.kategori ?? kategorier[0]?.navn ?? '')
  const [erBedrift, setErBedrift] = useState(utgift?.er_bedrift ?? false)
  const tall = lesTall(belop)
  const katValg = [...new Set([kategori, ...kategorier.map(k => k.navn)].filter(Boolean))].map(n => ({ verdi: n, navn: n }))
  return (
    <Ark tittel={utgift ? 'Endre fast utgift' : 'Ny fast utgift'} onLukk={onLukk} kanLagre={!!tittel && tall != null && !!kategori}
      onLagre={async () => {
        const rad = { tittel, belop: tall!, kategori, er_bedrift: erBedrift }
        if (utgift) { await data.oppdater('faste_utgifter', utgift.id, rad); onLukk() }
        else if (await data.leggTil('faste_utgifter', rad)) onLukk()
      }}>
      <Skjema tittel="Fast utgift" fotnote={erBedrift ? 'Utgiften trekkes fra bedriftens resultat hver måned i stedet for fra budsjettet, og tas med som fradrag i eksporten.' : undefined}>
        <Tekstfelt verdi={tittel} onEndre={setTittel} plassholder="Hva gjelder det? (f.eks. Husleie)" />
        <Tekstfelt verdi={belop} onEndre={setBelop} plassholder="Beløp per måned" tall />
        {katValg.length === 0 ? <div className="felt rod">Lag en kategori på forsiden først</div>
          : <Velger etikett="Kategori" verdi={kategori} valg={katValg} onEndre={setKategori} />}
        <Bryter etikett="Dette er en bedriftskostnad" paa={erBedrift} onEndre={setErBedrift} />
      </Skjema>
      {utgift && <button className="knapp fare" onClick={async () => { if (bekreft('Slette denne faste utgiften?')) { await data.slett('faste_utgifter', utgift.id); onLukk() } }}>Slett fast utgift</button>}
    </Ark>
  )
}

function Firmainfo({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const [f, setF] = useState(data.innstillinger)
  const sett = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  return (
    <Ark tittel="Firmainfo" onLukk={onLukk} onLagre={async () => { await data.lagreInnstillinger(f); onLukk() }}>
      <Skjema tittel="Vises på kvitteringene" fotnote="Skriv «MVA» etter org.nr. når foretaket er mva-registrert.">
        <Tekstfelt etikett="Navn" verdi={f.firmanavn} onEndre={sett('firmanavn')} />
        <Tekstfelt etikett="Slagord" verdi={f.slagord} onEndre={sett('slagord')} />
        <Tekstfelt etikett="Org.nr." verdi={f.org_nr} onEndre={sett('org_nr')} />
        <Tekstfelt etikett="Adresse" verdi={f.adresse} onEndre={sett('adresse')} />
        <Tekstfelt etikett="Postnr./sted" verdi={f.postnr_sted} onEndre={sett('postnr_sted')} />
        <Tekstfelt etikett="Telefon" verdi={f.telefon} onEndre={sett('telefon')} />
        <Tekstfelt etikett="E-post" verdi={f.epost ?? ''} onEndre={v => setF({ ...f, epost: v || null })} />
      </Skjema>
    </Ark>
  )
}

function ByttPassord({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const [nytt, setNytt] = useState('')
  const [igjen, setIgjen] = useState('')
  const ok = nytt.length >= 6 && nytt === igjen
  return (
    <Ark tittel="Bytt passord" onLukk={onLukk} kanLagre={ok}
      onLagre={async () => {
        const { error } = await supabase.auth.updateUser({ password: nytt })
        if (error) data.visFeil('Kunne ikke bytte passord: ' + error.message)
        else { window.alert('Passordet er byttet.'); onLukk() }
      }}>
      <Skjema fotnote={igjen && nytt !== igjen ? 'Passordene er ikke like.' : 'Minst 6 tegn.'}>
        <label className="felt"><input type="password" autoComplete="new-password" placeholder="Nytt passord" value={nytt} onChange={e => setNytt(e.target.value)} /></label>
        <label className="felt"><input type="password" autoComplete="new-password" placeholder="Gjenta passordet" value={igjen} onChange={e => setIgjen(e.target.value)} /></label>
      </Skjema>
    </Ark>
  )
}
