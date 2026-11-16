// «+»-knappen: legg inn en utgift raskt fra hvor som helst, med favoritter du ofte bruker
import { useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../data'
import { d } from '../regnskap'
import { fraInputDato, inputDato, kr, lesTall } from '../format'
import { Ark, Skjema, Tekstfelt, Velger } from '../ui'

export function HurtigKnapp() {
  const [aapen, setAapen] = useState(false)
  return (
    <>
      <button className="hurtig" onClick={() => setAapen(true)} aria-label="Ny utgift"><Plus size={28} strokeWidth={2.6} /></button>
      {aapen && <HurtigUtgift onLukk={() => setAapen(false)} />}
    </>
  )
}

function HurtigUtgift({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const kategorier = [...data.kategorier].sort((a, b) => a.rekkefolge - b.rekkefolge)
  const [tittel, setTittel] = useState('')
  const [kategori, setKategori] = useState(kategorier[0]?.navn ?? '')
  const [belop, setBelop] = useState('')
  const [dato, setDato] = useState(inputDato(new Date()))
  const belopRef = useRef<HTMLDivElement>(null)
  const tall = lesTall(belop)

  // Favoritter: det du har kjøpt oftest de siste 90 dagene (samme navn + kategori)
  const favoritter = useMemo(() => {
    const grense = Date.now() - 90 * 864e5
    const teller = new Map<string, { tittel: string; kategori: string; antall: number; sist: number }>()
    for (const u of data.utgifter) {
      const t = u.tittel.trim(); if (!t || d(u.dato).getTime() < grense) continue
      const nokkel = t.toLowerCase() + '|' + u.kategori
      const f = teller.get(nokkel) ?? { tittel: t, kategori: u.kategori, antall: 0, sist: 0 }
      f.antall++; f.sist = Math.max(f.sist, d(u.dato).getTime()); teller.set(nokkel, f)
    }
    return [...teller.values()].filter(f => f.antall >= 2).sort((a, b) => b.antall - a.antall || b.sist - a.sist).slice(0, 8)
  }, [data.utgifter])

  const katValg = [...new Set([kategori, ...kategorier.map(k => k.navn)].filter(Boolean))].map(n => ({ verdi: n, navn: n }))
  const farge = (navn: string) => data.kategorier.find(k => k.navn === navn)?.farge ?? '#8D99AE'

  return (
    <Ark tittel="Ny utgift" onLukk={onLukk} kanLagre={tall != null && !!kategori}
      onLagre={async () => {
        const nyDato = dato === inputDato(new Date()) ? new Date() : fraInputDato(dato)
        if (await data.leggTil('utgifter', { tittel, belop: tall!, kategori, dato: nyDato.toISOString() })) onLukk()
      }}>
      {favoritter.length > 0 && (
        <div>
          <div className="skjema-tittel">Favoritter</div>
          <div className="favoritter">
            {favoritter.map(f => (
              <button key={f.tittel + f.kategori} className={'favoritt' + (tittel === f.tittel && kategori === f.kategori ? ' valgt' : '')}
                style={{ borderColor: farge(f.kategori) + '80' }}
                onClick={() => { setTittel(f.tittel); setKategori(f.kategori); belopRef.current?.querySelector('input')?.focus() }}>
                <span className="fet">{f.tittel}</span><span className="liten">{f.kategori}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={belopRef}>
        <Skjema tittel="Hvor mye?"><Tekstfelt verdi={belop} onEndre={setBelop} plassholder="0" tall autoFokus={favoritter.length === 0} /></Skjema>
      </div>
      <Skjema fotnote={tall != null && kategori ? `${kr(tall)} kr i ${kategori}` : undefined}>
        <Tekstfelt etikett="Hva" verdi={tittel} onEndre={setTittel} plassholder="F.eks. Rema 1000" />
        {katValg.length > 0 ? <Velger etikett="Kategori" verdi={kategori} valg={katValg} onEndre={setKategori} /> : <div className="felt rod">Lag en kategori på forsiden først</div>}
        <Tekstfelt etikett="Dato" type="date" verdi={dato} onEndre={setDato} />
      </Skjema>
    </Ark>
  )
}
