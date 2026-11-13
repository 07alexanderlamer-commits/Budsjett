import { useMemo, useState } from 'react'
import { useBudsjettdata, useData } from '../data'
import { arkiv, d, dagerIMaaned, sammeMaaned, sum } from '../regnskap'
import { datoDagMnd, fraInputDato, inputDato, kr, lesTall, maaned, maanedAar, stor } from '../format'
import { Ark, Segment, Skjema, SveipRad, Tekstfelt, Velger, bekreft } from '../ui'
import type { Utgift } from '../types'

export function HistorikkVisning() {
  const [visning, setVisning] = useState<0 | 1>(0)
  return (
    <>
      <header className="topp"><span /><h1>Historikk</h1><span /></header>
      <main className="innhold">
        <Segment valg={[{ verdi: 0, navn: 'Denne måneden' }, { verdi: 1, navn: 'Tidligere måneder' }]} verdi={visning} onEndre={setVisning} />
        {visning === 0 ? <DenneMaaneden /> : <TidligereMaaneder />}
      </main>
    </>
  )
}

function farge(kategorier: { navn: string; farge: string }[], navn: string) { return kategorier.find(k => k.navn === navn)?.farge ?? '#8D99AE' }

function DenneMaaneden() {
  const data = useData()
  const [redigerer, setRedigerer] = useState<Utgift | null>(null)
  const naa = new Date()
  const utgifter = data.utgifter.filter(u => sammeMaaned(d(u.dato), naa)).sort((a, b) => b.dato.localeCompare(a.dato))
  const grupper = useMemo(() => {
    const m = new Map<string, Utgift[]>()
    utgifter.forEach(u => m.set(u.kategori, [...(m.get(u.kategori) ?? []), u]))
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'nb'))
  }, [utgifter])

  if (utgifter.length === 0) return <div className="tom">Ingen utgifter denne måneden ennå.</div>

  return (
    <>
      <div className="kort"><DagligForbruk utgifter={utgifter} maaned={naa} /></div>
      <div className="kort"><Smultring grupper={grupper.map(([navn, l]) => ({ navn, sum: sum(l, u => u.belop), farge: farge(data.kategorier, navn) }))} /></div>
      {grupper.map(([navn, liste]) => (
        <section className="seksjon" key={navn}>
          <div className="tittel">
            <span style={{ color: farge(data.kategorier, navn) }}>{navn}</span>
            <span className="tall" style={{ fontSize: 16 }}>{kr(sum(liste, u => u.belop))} kr</span>
          </div>
          <div className="liste">
            {liste.map(u => (
              <SveipRad key={u.id} onSlett={() => data.slett('utgifter', u.id)}>
                <button className="listerad" onClick={() => setRedigerer(u)}>
                  <span className="vokse ellipse" style={{ fontWeight: 500 }}>{u.tittel || '—'}</span>
                  <span className="kolonne hoyre" style={{ gap: 0 }}>
                    <span className="fet tall">{kr(u.belop)} kr</span>
                    <span className="liten">{datoDagMnd(d(u.dato))}</span>
                  </span>
                </button>
              </SveipRad>
            ))}
          </div>
        </section>
      ))}
      <div className="fotnote" style={{ textAlign: 'center' }}>Sveip til venstre for å slette, trykk for å endre.</div>
      {redigerer && <RedigerUtgift utgift={redigerer} onLukk={() => setRedigerer(null)} />}
    </>
  )
}

/** Stolpediagram: hvor mye du har brukt hver dag i måneden */
export function DagligForbruk({ utgifter, maaned: mnd }: { utgifter: Utgift[]; maaned: Date }) {
  const [valgt, setValgt] = useState<number | null>(null)
  const antall = dagerIMaaned(mnd)
  const summer = Array.from({ length: antall + 1 }, () => 0)
  utgifter.forEach(u => { summer[d(u.dato).getDate()] += u.belop })
  const dager = summer.slice(1)
  const iDag = sammeMaaned(new Date(), mnd) ? new Date().getDate() : null
  const totalt = sum(dager, x => x)
  const snitt = totalt / (iDag ?? antall)
  const { topp: maks, steg } = penAkse(Math.max(...dager, snitt, 1))
  const yVerdier = Array.from({ length: Math.round(maks / steg) + 1 }, (_, i) => i * steg)
  const visAkse = new Set([1, 5, 10, 15, 20, 25, antall])
  const valgteKjop = valgt ? utgifter.filter(u => d(u.dato).getDate() === valgt) : []

  return (
    <div className="kolonne" style={{ gap: 14 }}>
      <div className="rad mellom" style={{ alignItems: 'flex-start' }}>
        <div className="kolonne" style={{ gap: 2 }}>
          <span className="middels">{valgt ? `${valgt}. ${maaned(mnd)}` : 'Brukt per dag'}</span>
          <span className="tall" style={{ fontSize: 24, fontWeight: 800 }}>{kr(valgt ? dager[valgt - 1] : totalt)} kr</span>
        </div>
        <div className="kolonne hoyre" style={{ gap: 2 }}>
          <span className="middels">Snitt per dag</span>
          <span className="fet tall">{kr(snitt)} kr</span>
        </div>
      </div>
      <div>
        <div className="rad" style={{ alignItems: 'stretch', gap: 6 }}>
        <div className="y-akse">{yVerdier.map(v => <span key={v} style={{ bottom: `${(v / maks) * 100}%` }}>{kortKr(v)}</span>)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
        <div className="stolper">
          {yVerdier.slice(1).map(v => <div key={v} className="gridlinje" style={{ bottom: `${(v / maks) * 100}%` }} />)}
          <div className="snittlinje" style={{ bottom: `${(snitt / maks) * 100}%` }} />
          {dager.map((v, i) => {
            const dag = i + 1
            const bg = valgt ? (dag === valgt ? 'var(--bla)' : 'rgba(10,132,255,.35)') : dag === iDag ? 'var(--cyan)' : 'var(--bla)'
            return (
              <button key={dag} onClick={() => setValgt(valgt === dag ? null : dag)} aria-label={`${dag}.`}>
                <div style={{ height: `${(v / maks) * 100}%`, background: bg }} />
              </button>
            )
          })}
        </div>
        <div className="akse" style={{ marginTop: 4 }}>{dager.map((_, i) => <span key={i}>{visAkse.has(i + 1) ? i + 1 : ''}</span>)}</div>
        </div>
        </div>
      </div>
      {valgt ? (
        valgteKjop.length === 0 ? <span className="liten">Ingen utgifter denne dagen</span> : (
          <div className="kolonne" style={{ gap: 6 }}>
            {valgteKjop.map(u => (
              <div className="rad" key={u.id} style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{u.tittel || '—'}</span>
                <span className="liten">{u.kategori}</span>
                <span style={{ marginLeft: 'auto' }} className="fet tall">{kr(u.belop)} kr</span>
              </div>
            ))}
          </div>
        )
      ) : <span className="liten">Trykk på en stolpe for å se dagen</span>}
    </div>
  )
}

function Smultring({ grupper }: { grupper: { navn: string; sum: number; farge: string }[] }) {
  const totalt = sum(grupper, g => g.sum)
  const r = 80, omkrets = 2 * Math.PI * r, mellomrom = grupper.length > 1 ? 4 : 0
  let start = 0
  return (
    <div className="kolonne" style={{ gap: 16 }}>
      <div className="smultring">
        <svg viewBox="0 0 200 200" width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
          {grupper.filter(g => g.sum > 0).map(g => {
            const lengde = (g.sum / totalt) * omkrets
            const el = <circle key={g.navn} cx="100" cy="100" r={r} fill="none" stroke={g.farge} strokeWidth="24" strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, lengde - mellomrom)} ${omkrets}`} strokeDashoffset={-start} />
            start += lengde
            return el
          })}
        </svg>
        <div className="midt"><div><div className="middels">Totalt brukt</div><div className="tall" style={{ fontSize: 20, fontWeight: 800 }}>{kr(totalt)} kr</div></div></div>
      </div>
      <div className="kolonne" style={{ gap: 10 }}>
        {grupper.map(g => (
          <div className="rad" key={g.navn}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: g.farge }} />
            <span className="fet" style={{ fontSize: 15 }}>{g.navn}</span>
            <span className="gra tall" style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 500 }}>{Math.trunc(totalt ? (g.sum / totalt) * 100 : 0)} %  •  {kr(g.sum)} kr</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TidligereMaaneder() {
  const data = useData()
  const b = useBudsjettdata()
  const [aapen, setAapen] = useState<number | null>(null)
  const mnd = arkiv(b)
  if (mnd.length === 0) return <div className="tom">Du har ikke historikk for tidligere måneder ennå.</div>
  return (
    <>
      {mnd.map(m => {
        const res = m.inntekt - m.forbruk
        const erAapen = aapen === m.start.getTime()
        const perKat = new Map<string, number>()
        m.utgifter.forEach(u => perKat.set(u.kategori, (perKat.get(u.kategori) ?? 0) + u.belop))
        return (
          <button key={m.start.getTime()} className="kort kolonne" style={{ gap: 12, textAlign: 'left' }} onClick={() => setAapen(erAapen ? null : m.start.getTime())}>
            <span className="fet" style={{ fontSize: 18 }}>{stor(maanedAar(m.start))}</span>
            <div className="rad mellom"><span className="gra">Inntekt</span><span className="fet gronn tall">{kr(m.inntekt)} kr</span></div>
            <div className="rad mellom"><span className="gra">Forbruk</span><span className="fet rod tall">{kr(m.forbruk)} kr</span></div>
            <div className="skille" style={{ margin: 0 }} />
            <div className="rad mellom fet"><span>Resultat</span><span className={'tall ' + (res >= 0 ? 'gronn' : 'rod')}>{kr(res)} kr</span></div>
            {erAapen && (
              <div className="kolonne" style={{ gap: 14, marginTop: 6 }}>
                <DagligForbruk utgifter={m.utgifter} maaned={m.start} />
                <div className="kolonne" style={{ gap: 6 }}>
                  {[...perKat.entries()].sort((a, b) => b[1] - a[1]).map(([navn, s]) => (
                    <div className="rad" key={navn} style={{ fontSize: 14 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: farge(data.kategorier, navn) }} />
                      <span>{navn}</span><span className="tall fet" style={{ marginLeft: 'auto' }}>{kr(s)} kr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!erAapen && m.utgifter.length > 0 && <span className="liten">Trykk for detaljer</span>}
          </button>
        )
      })}
    </>
  )
}

function RedigerUtgift({ utgift, onLukk }: { utgift: Utgift; onLukk: () => void }) {
  const data = useData()
  const [tittel, setTittel] = useState(utgift.tittel)
  const [belop, setBelop] = useState(String(utgift.belop).replace('.', ','))
  const [kategori, setKategori] = useState(utgift.kategori)
  const [dato, setDato] = useState(inputDato(d(utgift.dato)))
  const tall = lesTall(belop)
  const katValg = [...new Set([utgift.kategori, ...data.kategorier.map(k => k.navn)])].map(n => ({ verdi: n, navn: n }))
  return (
    <Ark tittel="Endre utgift" onLukk={onLukk} kanLagre={tall != null}
      onLagre={async () => {
        const nyDato = dato === inputDato(d(utgift.dato)) ? utgift.dato : fraInputDato(dato).toISOString()
        await data.oppdater('utgifter', utgift.id, { tittel, belop: tall!, kategori, dato: nyDato }); onLukk()
      }}>
      <Skjema>
        <Tekstfelt etikett="Hva" verdi={tittel} onEndre={setTittel} />
        <Tekstfelt etikett="Beløp" verdi={belop} onEndre={setBelop} tall />
        <Velger etikett="Kategori" verdi={kategori} valg={katValg} onEndre={setKategori} />
        <Tekstfelt etikett="Dato" type="date" verdi={dato} onEndre={setDato} />
      </Skjema>
      <button className="knapp fare" onClick={async () => { if (bekreft('Slette denne utgiften?')) { await data.slett('utgifter', utgift.id); onLukk() } }}>Slett utgift</button>
    </Ark>
  )
}

/** Runde verdier på y-aksen (f.eks. 0, 500, 1 000, 1 500) som skalerer etter største dag */
function penAkse(maks: number) {
  const raa = maks / 4
  const mag = Math.pow(10, Math.floor(Math.log10(raa)))
  const n = raa / mag
  const steg = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
  return { steg, topp: Math.ceil(maks / steg) * steg }
}
/** 1 500 → «1,5k», 800 → «800» */
function kortKr(v: number) {
  if (v < 1000) return String(Math.round(v))
  return (Math.round(v / 100) / 10).toString().replace('.', ',') + 'k'
}
