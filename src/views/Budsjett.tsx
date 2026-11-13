import { useState } from 'react'
import { Minus, Plus, Check, Settings, XCircle } from 'lucide-react'
import { useBudsjettdata, useData } from '../data'
import { forbrukKategori, sum, totalForbruk, totalInntekt } from '../regnskap'
import { fraInputDato, inputDato, kr, lesTall, maanedAar, stor } from '../format'
import { Ark, Skjema, Tekstfelt, bekreft } from '../ui'
import type { Kategori } from '../types'

export function BudsjettVisning({ onInnstillinger }: { onInnstillinger: () => void }) {
  const data = useData()
  const b = useBudsjettdata()
  const [redigerer, setRedigerer] = useState(false)
  const [valgt, setValgt] = useState<Kategori | null>(null)
  const [nyKategori, setNyKategori] = useState(false)

  const kategorier = [...data.kategorier].sort((a, b) => a.rekkefolge - b.rekkefolge)
  const inntekt = totalInntekt(b), forbruk = totalForbruk(b)
  const overskudd = Math.trunc(inntekt - forbruk)
  const budsjettert = sum(kategorier, k => k.budsjett)
  const igjen = inntekt - budsjettert

  const lagStandard = async () => {
    const standard = [['Bolig', 10000, '#00FFFF'], ['Mat', 3000, '#FFA500'], ['Bil', 2000, '#0000FF'], ['Forbruk', 2000, '#800080']] as const
    for (const [i, [navn, budsjett, farge]] of standard.entries()) await data.leggTil('kategorier', { navn, budsjett, farge, rekkefolge: i })
  }

  return (
    <>
      <header className="topp">
        <span />
        <div><div className="over">{stor(maanedAar(new Date()))}</div><h1>Dashboard</h1></div>
        <button className="ikonknapp" onClick={onInnstillinger} aria-label="Innstillinger"><Settings size={20} /></button>
      </header>

      <main className="innhold">
        <div className="helt">
          <div className="rad mellom">
            <div className="kolonne">
              <span className="middels">Inntekt</span>
              <span className="fet gronn tall" style={{ fontSize: 18 }}>{kr(inntekt)}</span>
            </div>
            <div className="kolonne" style={{ alignItems: 'center' }}>
              <span className="gra" style={{ fontSize: 14, fontWeight: 500 }}>Overskudd</span>
              <span className={'tall ' + (overskudd >= 0 ? '' : 'rod')} style={{ fontSize: 36, fontWeight: 800, whiteSpace: 'nowrap' }}>{kr(overskudd)} kr</span>
            </div>
            <div className="kolonne hoyre">
              <span className="middels">Utgift</span>
              <span className="fet rod tall" style={{ fontSize: 18 }}>{kr(forbruk)}</span>
            </div>
          </div>
          <div className="skille" />
          <div className="rad mellom" style={{ fontSize: 12 }}>
            <span className="gra" style={{ fontWeight: 500 }}>Totalt budsjettert: {kr(budsjettert)} kr</span>
            <span className="fet" style={{ color: igjen >= 0 ? 'rgba(52,199,89,.85)' : 'rgba(255,69,58,.85)' }}>Estimert igjen: {kr(igjen)} kr</span>
          </div>
        </div>

        {kategorier.map(k => {
          const brukt = forbrukKategori(b, k.navn)
          const fyll = Math.min(1, brukt / (k.budsjett || 1))
          return (
            <div className="linje" key={k.id}>
              <div className="rad mellom">
                <span className="fet">{k.navn}</span>
                <span className="gra tall" style={{ fontSize: 14, fontWeight: 600 }}>{kr(brukt)} / {kr(k.budsjett)}</span>
              </div>
              <div className="bar"><div style={{ width: `${fyll * 100}%`, background: `linear-gradient(90deg, ${k.farge}b3, ${k.farge})`, boxShadow: `0 0 8px ${k.farge}99` }} /></div>
            </div>
          )
        })}

        <div className="rad mellom" style={{ marginTop: 6 }}>
          <h2 style={{ fontSize: 20 }}>Kategorier</h2>
          <div className="rad">
            <button onClick={() => setRedigerer(r => !r)} aria-label="Rediger" style={{ color: redigerer ? 'var(--gronn)' : 'rgba(141,153,174,.5)' }}>
              {redigerer ? <Check size={28} /> : <Minus size={28} />}
            </button>
            <button onClick={() => setNyKategori(true)} aria-label="Ny kategori" className="bla"><Plus size={28} /></button>
          </div>
        </div>

        {kategorier.length === 0 ? (
          <div className="kort kolonne" style={{ gap: 12 }}>
            <span className="gra">Du har ingen kategorier ennå.</span>
            <button className="knapp" onClick={lagStandard}>Lag standardkategorier</button>
          </div>
        ) : (
          <div className="rutenett">
            {kategorier.map(k => (
              <button key={k.id} className="katknapp" style={{ border: `2px solid ${k.farge}99`, boxShadow: `0 5px 14px ${k.farge}26` }}
                onClick={() => {
                  if (!redigerer) return setValgt(k)
                  if (bekreft(`Slette kategorien «${k.navn}»? Utgiftene i den blir liggende i historikken.`)) data.slett('kategorier', k.id)
                }}>
                <span className="ellipse" style={{ maxWidth: '100%' }}>{k.navn}</span>
                {redigerer && <XCircle className="x" size={26} />}
              </button>
            ))}
          </div>
        )}
      </main>

      {valgt && <LeggTilUtgift kategori={valgt.navn} onLukk={() => setValgt(null)} />}
      {nyKategori && <NyKategori antall={kategorier.length} onLukk={() => setNyKategori(false)} />}
    </>
  )
}

function LeggTilUtgift({ kategori, onLukk }: { kategori: string; onLukk: () => void }) {
  const data = useData()
  const [tittel, setTittel] = useState('')
  const [belop, setBelop] = useState('')
  const [dato, setDato] = useState(inputDato(new Date()))
  const tall = lesTall(belop)
  const lagre = async () => {
    if (tall == null) return
    const iDag = dato === inputDato(new Date())
    const r = await data.leggTil('utgifter', { tittel, belop: tall, kategori, dato: (iDag ? new Date() : fraInputDato(dato)).toISOString() })
    if (r) onLukk()
  }
  return (
    <Ark tittel={`Legg til i ${kategori}`} onLukk={onLukk} onLagre={lagre} kanLagre={tall != null}>
      <Skjema tittel="Hva kjøpte du?"><Tekstfelt verdi={tittel} onEndre={setTittel} plassholder="Skriv her…" autoFokus /></Skjema>
      <Skjema tittel="Hvor mye?"><Tekstfelt verdi={belop} onEndre={setBelop} plassholder="0" tall /></Skjema>
      <Skjema tittel="Når?"><Tekstfelt etikett="Dato" type="date" verdi={dato} onEndre={setDato} /></Skjema>
    </Ark>
  )
}

function NyKategori({ antall, onLukk }: { antall: number; onLukk: () => void }) {
  const data = useData()
  const [navn, setNavn] = useState('')
  const [budsjett, setBudsjett] = useState('')
  const [farge, setFarge] = useState('#0A84FF')
  const tall = lesTall(budsjett)
  return (
    <Ark tittel="Ny kategori" onLukk={onLukk} kanLagre={!!navn && tall != null}
      onLagre={async () => { if (await data.leggTil('kategorier', { navn, budsjett: tall!, farge, rekkefolge: antall })) onLukk() }}>
      <Skjema tittel="Opprett kategori">
        <Tekstfelt verdi={navn} onEndre={setNavn} plassholder="Navn (f.eks. Ferie)" autoFokus />
        <Tekstfelt verdi={budsjett} onEndre={setBudsjett} plassholder="Månedsbudsjett" tall />
        <label className="felt mellom" style={{ justifyContent: 'space-between' }}>
          <span>Velg farge</span>
          <input type="color" value={farge} onChange={e => setFarge(e.target.value)} style={{ flex: 'none', width: 44, height: 32, padding: 0 }} />
        </label>
      </Skjema>
    </Ark>
  )
}
