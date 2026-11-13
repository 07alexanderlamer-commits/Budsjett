// Felles byggeklosser i iOS-stil
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Skjema som glir opp fra bunnen, med Avbryt / tittel / Lagre */
export function Ark({ tittel, onLukk, onLagre, lagreTekst = 'Lagre', kanLagre = true, children }: {
  tittel: string; onLukk: () => void; onLagre?: () => void | Promise<void>; lagreTekst?: string; kanLagre?: boolean; children: ReactNode
}) {
  const [lagrer, setLagrer] = useState(false)
  useEffect(() => {
    const forrige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = forrige }
  }, [])
  const lagre = async () => {
    if (!onLagre || lagrer) return
    setLagrer(true)
    try { await onLagre() } finally { setLagrer(false) }
  }
  return (
    <div className="bakgrunn" onClick={onLukk}>
      <div className="ark" onClick={e => e.stopPropagation()} role="dialog" aria-label={tittel}>
        <div className="ark-topp">
          <button className="venstre" onClick={onLukk}>{onLagre ? 'Avbryt' : 'Lukk'}</button>
          <h2>{tittel}</h2>
          {onLagre ? <button className="hogre" onClick={lagre} disabled={!kanLagre || lagrer}>{lagrer ? '…' : lagreTekst}</button> : <span />}
        </div>
        <div className="ark-innhold">{children}</div>
      </div>
    </div>
  )
}

export function Skjema({ tittel, fotnote, children }: { tittel?: string; fotnote?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {tittel && <div className="skjema-tittel">{tittel}</div>}
      <div className="skjema">{children}</div>
      {fotnote && <div className="fotnote" style={{ marginTop: 6 }}>{fotnote}</div>}
    </div>
  )
}

export function Tekstfelt({ etikett, verdi, onEndre, plassholder, type = 'text', tall, autoFokus }: {
  etikett?: string; verdi: string; onEndre: (v: string) => void; plassholder?: string; type?: string; tall?: boolean; autoFokus?: boolean
}) {
  return (
    <label className="felt">
      {etikett && <span>{etikett}</span>}
      <input
        type={type} value={verdi} placeholder={plassholder} autoFocus={autoFokus}
        inputMode={tall ? 'decimal' : undefined} onChange={e => onEndre(e.target.value)}
        style={etikett ? { textAlign: 'right' } : undefined}
      />
    </label>
  )
}

export function Velger<T extends string>({ etikett, verdi, valg, onEndre }: {
  etikett: string; verdi: T; valg: { verdi: T; navn: string }[]; onEndre: (v: T) => void
}) {
  return (
    <label className="felt">
      <span>{etikett}</span>
      <select value={verdi} onChange={e => onEndre(e.target.value as T)}>
        {valg.map(v => <option key={v.verdi} value={v.verdi}>{v.navn}</option>)}
      </select>
    </label>
  )
}

export function Bryter({ etikett, paa, onEndre }: { etikett: string; paa: boolean; onEndre: (v: boolean) => void }) {
  return (
    <button type="button" className="felt bryter" onClick={() => onEndre(!paa)} style={{ width: '100%' }}>
      <span>{etikett}</span>
      <div className={'bryter-ui' + (paa ? ' paa' : '')} />
    </button>
  )
}

export function Segment<T extends string | number>({ valg, verdi, onEndre }: { valg: { verdi: T; navn: string }[]; verdi: T; onEndre: (v: T) => void }) {
  return (
    <div className="segment">
      {valg.map(v => <button key={String(v.verdi)} className={v.verdi === verdi ? 'aktiv' : ''} onClick={() => onEndre(v.verdi)}>{v.navn}</button>)}
    </div>
  )
}

/** Rad som kan sveipes til venstre for å vise «Slett» */
export function SveipRad({ onSlett, children, slettTekst = 'Slett' }: { onSlett: () => void; children: ReactNode; slettTekst?: string }) {
  const [x, setX] = useState(0)
  const start = useRef<{ x: number; y: number; base: number; retning?: 'h' | 'v' } | null>(null)
  const BREDDE = 90
  return (
    <div className="sveip">
      <button className="slett-bak" onClick={() => { setX(0); onSlett() }} aria-label={slettTekst}>{slettTekst}</button>
      <div
        className="forside"
        style={{ transform: `translateX(${x}px)`, transition: start.current ? 'none' : undefined }}
        onTouchStart={e => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, base: x } }}
        onTouchMove={e => {
          const s = start.current; if (!s) return
          const dx = e.touches[0].clientX - s.x, dy = e.touches[0].clientY - s.y
          if (!s.retning && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.retning = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
          if (s.retning === 'h') setX(Math.min(0, Math.max(-BREDDE - 30, s.base + dx)))
        }}
        onTouchEnd={() => { start.current = null; setX(v => (v < -BREDDE / 2 ? -BREDDE : 0)) }}
        onClickCapture={e => { if (x !== 0) { e.stopPropagation(); e.preventDefault(); setX(0) } }}
      >
        {children}
      </div>
    </div>
  )
}

export function Seksjon({ tittel, hoyre, children, fotnote }: { tittel?: ReactNode; hoyre?: ReactNode; children: ReactNode; fotnote?: ReactNode }) {
  return (
    <section className="seksjon">
      {tittel && <div className="tittel"><span>{tittel}</span>{hoyre}</div>}
      <div className="liste">{children}</div>
      {fotnote && <div className="fotnote">{fotnote}</div>}
    </section>
  )
}

/** Bekreftelse før noe slettes for godt */
export function bekreft(melding: string) { return window.confirm(melding) }

/** Velg bilde fra kamerarull/kamera og krymp det til 200 px bredde (som i iPhone-appen) */
export function BildeVelger({ bilde, onEndre, tekst = 'Velg bilde' }: { bilde: string | null; onEndre: (b: string | null) => void; tekst?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className="felt" onClick={() => ref.current?.click()} style={{ width: '100%' }}>
        {bilde ? <img src={bilde} className="miniatyr" alt="" style={{ width: 50, height: 50 }} /> : null}
        <span className="bla" style={{ color: 'var(--bla)' }}>{bilde ? 'Endre bilde' : tekst}</span>
      </button>
      {bilde && <button type="button" className="felt" onClick={() => onEndre(null)} style={{ width: '100%' }}><span className="rod" style={{ color: 'var(--rod)' }}>Fjern bilde</span></button>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={async e => {
        const fil = e.target.files?.[0]; e.target.value = ''
        if (fil) onEndre(await krympBilde(fil))
      }} />
    </>
  )
}

export async function krympBilde(fil: File, bredde = 200): Promise<string> {
  const url = URL.createObjectURL(fil)
  try {
    const img = await new Promise<HTMLImageElement>((ok, feil) => { const i = new Image(); i.onload = () => ok(i); i.onerror = feil; i.src = url })
    const skala = bredde / img.width
    const c = document.createElement('canvas'); c.width = bredde; c.height = Math.round(img.height * skala)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.5)
  } finally { URL.revokeObjectURL(url) }
}

/** Del en fil med delingsarket på iPhone (AirDrop, Filer, Mail …), eller last ned på PC */
export async function delFil(navn: string, innhold: Blob) {
  const fil = new File([innhold], navn, { type: innhold.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [fil] })) {
    try { await nav.share({ files: [fil], title: navn }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(innhold); a.download = navn
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
