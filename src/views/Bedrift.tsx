import { useEffect, useMemo, useRef, useState } from 'react'
import { Car, CheckCircle2, DollarSign, FileText, Package, Send, Share, ShoppingCart, Smartphone, Wrench, ScanLine } from 'lucide-react'
import { useData } from '../data'
import {
  bedriftResultat, d, erUnderveis, forsteBedriftDato, gjeldendeTermin, kapital, kmDenneMaaned, KM_GRENSE_MND, KM_SATS,
  nesteStatus, sum, terminPeriode, TERMINER, type TerminId,
} from '../regnskap'
import { bruktprotokoll } from '../eksport'
import { datoKort, fraInputDato, inputDato, kr, lesTall } from '../format'
import { Ark, BildeVelger, Skjema, SveipRad, Seksjon, Tekstfelt, Velger, bekreft, delFil } from '../ui'
import { Skanner } from '../skanner'
import type { Mobil, SalgsStatus } from '../types'

const STATUS: Record<SalgsStatus, { farge: string; Ikon: typeof Package }> = {
  'Må sendes': { farge: '#FF9F0A', Ikon: Package },
  'Sendt': { farge: '#0A84FF', Ikon: Send },
  'Utbetalt': { farge: '#34C759', Ikon: CheckCircle2 },
}

export function BedriftVisning() {
  const data = useData()
  const [termin, setTermin] = useState<TerminId>('alle')
  const [aar, setAar] = useState(new Date().getFullYear())
  const [egenStart, setEgenStart] = useState(inputDato(new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate())))
  const [egenSlutt, setEgenSlutt] = useState(inputDato(new Date()))
  const [sok, setSok] = useState('')
  const [ark, setArk] = useState<null | 'kjop' | 'salg' | 'utstyr' | 'kjorebok'>(null)
  const [redigerer, setRedigerer] = useState<Mobil | null>(null)

  const periode = terminPeriode(termin, aar, fraInputDato(egenStart), fraInputDato(egenSlutt))
  const iPeriode = (s: string | null) => !!s && (!periode || (d(s) >= periode.start && d(s) <= periode.slutt))

  const mobiler = useMemo(() => [...data.mobiler].sort((a, b) => b.flipp_id - a.flipp_id), [data.mobiler])
  const utstyr = useMemo(() => [...data.bedrift_utgifter].sort((a, b) => b.dato.localeCompare(a.dato)), [data.bedrift_utgifter])

  const s = sok.trim().toLowerCase()
  const treff = (...felt: (string | null)[]) => felt.some(f => f?.toLowerCase().includes(s))
  const filtrerte = mobiler.filter(m => (!periode || iPeriode(m.kjops_dato) || iPeriode(m.salgs_dato))
    && (!s || treff(m.navn, m.imei, m.kjoper_navn, m.selger_navn, String(1000 + m.flipp_id))))
  const filtrertUtstyr = utstyr.filter(u => (!periode || iPeriode(u.dato)) && (!s || treff(u.navn)))

  const lager = filtrerte.filter(m => m.salgspris == null)
  const solgteAlle = filtrerte.filter(m => m.salgspris != null)
  const underveis = solgteAlle.filter(erUnderveis)
  const solgte = solgteAlle.filter(m => !erUnderveis(m))

  const p = periode ?? { start: forsteBedriftDato(data.mobiler, data.bedrift_utgifter), slutt: new Date() }
  const resultat = bedriftResultat(p.start, p.slutt, data.mobiler, data.bedrift_utgifter, data.faste_utgifter)

  const eksporter = () => delFil(`MVA_Termin_Eksport_${inputDato(new Date())}.csv`,
    bruktprotokoll({ periode, mobiler: data.mobiler, utstyr: data.bedrift_utgifter, turer: data.kjoreturer, faste: data.faste_utgifter }))
  // PDF-biblioteket lastes i bakgrunnen, så kvitteringen kan deles med en gang du trykker
  const pdf = useRef<typeof import('../kvittering') | null>(null)
  useEffect(() => { import('../kvittering').then(m => { pdf.current = m }) }, [])
  const kvittering = async (m: Mobil) => {
    const modul = pdf.current ?? await import('../kvittering')
    delFil(`Kvittering_${1000 + m.flipp_id}.pdf`, modul.lagKvittering(m, data.innstillinger))
  }

  return (
    <>
      <header className="topp">
        <span />
        <h1>Bedrift</h1>
        <button className="ikonknapp" onClick={eksporter} aria-label="Eksporter bruktprotokoll" style={{ color: 'var(--gronn)' }}><Share size={20} /></button>
      </header>

      <main className="innhold">
        <input className="sok" type="search" placeholder="Søk på modell, kjøper, IMEI eller ordrenr." value={sok} onChange={e => setSok(e.target.value)} />

        {!s && (
          <>
            <div className="kort kolonne" style={{ gap: 14, padding: 20, borderRadius: 20 }}>
              <div className="rad" style={{ flexWrap: 'wrap' }}>
                <select className="velg" value={termin} onChange={e => setTermin(e.target.value as TerminId)} style={{ flex: 1, minWidth: 0 }}>
                  {TERMINER.map(t => <option key={t.id} value={t.id}>{t.navn}</option>)}
                </select>
                {termin !== 'alle' && termin !== 'egen' && (
                  <select className="velg" value={aar} onChange={e => setAar(Number(e.target.value))}>
                    {Array.from({ length: 8 }, (_, i) => 2023 + i).map(a => <option key={a}>{a}</option>)}
                  </select>
                )}
                {termin === 'alle' && <button className="liten bla" onClick={() => { setTermin(gjeldendeTermin()); setAar(new Date().getFullYear()) }}>Denne terminen</button>}
              </div>
              {termin === 'egen' && (
                <div className="rad">
                  <input className="velg" type="date" value={egenStart} onChange={e => setEgenStart(e.target.value)} style={{ flex: 1 }} />
                  <span className="gra">–</span>
                  <input className="velg" type="date" value={egenSlutt} onChange={e => setEgenSlutt(e.target.value)} style={{ flex: 1 }} />
                </div>
              )}
              <div className="rad mellom">
                <div className="kolonne"><span className="middels">Tilgjengelig kapital</span><span className="tall bla" style={{ fontSize: 20, fontWeight: 700 }}>{kr(kapital(data.innstillinger.bedrift_kapital, data.mobiler))} kr</span></div>
                <div className="kolonne hoyre"><span className="middels">Resultat (periode)</span><span className={'tall ' + (resultat >= 0 ? 'gronn' : 'rod')} style={{ fontSize: 20, fontWeight: 700 }}>{kr(resultat)} kr</span></div>
              </div>
            </div>

            <div className="handlinger">
              <Handling tittel="Kjøp" farge="#FF9F0A" Ikon={ShoppingCart} onTrykk={() => setArk('kjop')} />
              <Handling tittel="Salg" farge="#34C759" Ikon={DollarSign} onTrykk={() => setArk('salg')} />
              <Handling tittel="Utstyr" farge="#8E8E93" Ikon={Wrench} onTrykk={() => setArk('utstyr')} />
              <Handling tittel="Kjørebok" farge="#32D7FF" Ikon={Car} onTrykk={() => setArk('kjorebok')} />
            </div>
          </>
        )}

        {lager.length > 0 && (
          <Seksjon tittel={s ? 'Søkeresultat (lager)' : `Lager (${lager.length})`}>
            {lager.map(m => (
              <SveipRad key={m.id} onSlett={() => bekreft(`Slette #${1000 + m.flipp_id} ${m.navn}?`) && data.slett('mobiler', m.id)}>
                <button className="listerad" onClick={() => setRedigerer(m)}>
                  <Miniatyr bilde={m.bilde} />
                  <div className="vokse kolonne" style={{ gap: 2 }}>
                    <span className="rad" style={{ gap: 6 }}><span className="gra fet" style={{ fontSize: 14 }}>#{1000 + m.flipp_id}</span><span style={{ fontWeight: 500 }}>{m.navn}</span></span>
                    {m.imei && <span className="liten">IMEI: {m.imei}</span>}
                    {m.selger_navn && <span className="liten">Fra: {m.selger_navn}</span>}
                  </div>
                  <span className="fet rod tall" style={{ whiteSpace: 'nowrap' }}>-{kr(m.kjopspris)} kr</span>
                </button>
              </SveipRad>
            ))}
          </Seksjon>
        )}

        {[['Underveis', underveis], ['Solgt', solgte]].map(([navn, liste]) => (liste as Mobil[]).length > 0 && (
          <Seksjon key={navn as string} tittel={s ? `Søkeresultat (${(navn as string).toLowerCase()})` : `${navn} (${(liste as Mobil[]).length})`}>
            {(liste as Mobil[]).map(m => (
              <SveipRad key={m.id} onSlett={() => bekreft(`Slette #${1000 + m.flipp_id} ${m.navn}?`) && data.slett('mobiler', m.id)}>
                <SolgtRad mobil={m} onTrykk={() => setRedigerer(m)} onKvittering={() => kvittering(m)}
                  onStatus={() => data.oppdater('mobiler', m.id, { salgs_status: nesteStatus(m.salgs_status) })} />
              </SveipRad>
            ))}
          </Seksjon>
        ))}

        {filtrertUtstyr.length > 0 && (
          <Seksjon tittel={s ? 'Søkeresultat (utstyr)' : 'Utstyr og deler'}>
            {filtrertUtstyr.map(u => (
              <SveipRad key={u.id} onSlett={() => data.slett('bedrift_utgifter', u.id)}>
                <div className="listerad">
                  {u.bilde && <Miniatyr bilde={u.bilde} />}
                  <div className="vokse kolonne" style={{ gap: 2 }}><span>{u.navn}</span><span className="liten">{datoKort(d(u.dato))}</span></div>
                  <span className="fet rod tall">-{kr(u.pris)} kr</span>
                </div>
              </SveipRad>
            ))}
          </Seksjon>
        )}

        {!s && filtrerte.length === 0 && filtrertUtstyr.length === 0 && <div className="tom">Ingenting i denne perioden.</div>}
      </main>

      {ark === 'kjop' && <KjopMobil onLukk={() => setArk(null)} />}
      {ark === 'salg' && <SalgMobil onLukk={() => setArk(null)} />}
      {ark === 'utstyr' && <NyttUtstyr onLukk={() => setArk(null)} />}
      {ark === 'kjorebok' && <Kjorebok onLukk={() => setArk(null)} />}
      {redigerer && <RedigerMobil mobil={redigerer} onLukk={() => setRedigerer(null)} />}
    </>
  )
}

function Handling({ tittel, farge, Ikon, onTrykk }: { tittel: string; farge: string; Ikon: typeof Car; onTrykk: () => void }) {
  return <button className="handling" style={{ border: `1px solid ${farge}4d` }} onClick={onTrykk}><Ikon size={26} color={farge} />{tittel}</button>
}

function Miniatyr({ bilde }: { bilde: string | null }) {
  return bilde ? <img className="miniatyr" src={bilde} alt="" /> : <div className="miniatyr"><Smartphone size={20} /></div>
}

export function StatusMerke({ status, onTrykk }: { status: SalgsStatus; onTrykk?: () => void }) {
  const { farge, Ikon } = STATUS[status]
  return (
    <span role={onTrykk ? 'button' : undefined} className="merke" style={{ color: farge, borderColor: farge + '80', background: farge + '26' }}
      onClick={onTrykk ? e => { e.stopPropagation(); onTrykk() } : undefined}>
      <Ikon size={11} strokeWidth={3} />{status}
    </span>
  )
}

function SolgtRad({ mobil: m, onTrykk, onKvittering, onStatus }: { mobil: Mobil; onTrykk: () => void; onKvittering: () => void; onStatus: () => void }) {
  const p = m.profitt ?? 0
  return (
    <div className="listerad trykk" onClick={onTrykk} role="button">
      <Miniatyr bilde={m.bilde} />
      <div className="vokse kolonne" style={{ gap: 5, minWidth: 0 }}>
        <div className="rad" style={{ gap: 6 }}>
          <span className="gra fet" style={{ fontSize: 14 }}>#{1000 + m.flipp_id}</span>
          <span className="vokse" style={{ fontWeight: 500, minWidth: 0 }}>{m.navn}</span>
          <span className={'fet tall ' + (p >= 0 ? 'gronn' : 'rod')} style={{ whiteSpace: 'nowrap' }}>{p >= 0 ? '+' : ''}{kr(p)} kr</span>
          <button onClick={e => { e.stopPropagation(); onKvittering() }} aria-label="Kvittering" className="bla" style={{ paddingLeft: 6 }}><FileText size={22} /></button>
        </div>
        <div className="rad liten" style={{ gap: 6 }}>
          <span>Kjøpt: {kr(m.kjopspris)}</span>
          {m.kjoper_navn && <><span>•</span><span className="ellipse vokse">Kjøper: {m.kjoper_navn}</span></>}
          <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>Solgt: {kr(m.salgspris ?? 0)}</span>
        </div>
        {m.salgs_status && <div><StatusMerke status={m.salgs_status} onTrykk={onStatus} /></div>}
      </div>
    </div>
  )
}

function ImeiFelt({ verdi, onEndre }: { verdi: string; onEndre: (v: string) => void }) {
  const [skanner, setSkanner] = useState(false)
  return (
    <>
      <div className="felt">
        <input value={verdi} onChange={e => onEndre(e.target.value)} placeholder="IMEI / serienummer" />
        <button type="button" onClick={() => setSkanner(true)} className="merke" style={{ color: 'var(--bla)', borderColor: 'transparent', background: 'rgba(10,132,255,.2)', padding: '6px 10px', fontSize: 12 }}>
          <ScanLine size={14} /> Skann
        </button>
      </div>
      {skanner && <Skanner onFunnet={onEndre} onLukk={() => setSkanner(false)} />}
    </>
  )
}

function KjopMobil({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const nesteId = Math.max(0, ...data.mobiler.map(m => m.flipp_id)) + 1
  const [bilde, setBilde] = useState<string | null>(null)
  const [navn, setNavn] = useState('')
  const [selger, setSelger] = useState('')
  const [imei, setImei] = useState('')
  const [pris, setPris] = useState('')
  const [dato, setDato] = useState(inputDato(new Date()))
  const tall = lesTall(pris)
  return (
    <Ark tittel="Kjøp" onLukk={onLukk} kanLagre={!!navn && tall != null}
      onLagre={async () => {
        const kjopsDato = dato === inputDato(new Date()) ? new Date() : fraInputDato(dato)
        const r = await data.leggTil('mobiler', { flipp_id: nesteId, navn, kjopspris: tall!, imei: imei || null, selger_navn: selger || null, bilde, kjops_dato: kjopsDato.toISOString() })
        if (r) onLukk()
      }}>
      <Skjema tittel="Bilde (valgfritt)"><BildeVelger bilde={bilde} onEndre={setBilde} tekst="Velg bilde fra kamerarull" /></Skjema>
      <Skjema tittel={`Nytt varelager (ordre #${1000 + nesteId})`}>
        <Tekstfelt verdi={navn} onEndre={setNavn} plassholder="Modell" />
        <Tekstfelt verdi={selger} onEndre={setSelger} plassholder="Kjøpt av (navn/telefon)" />
        <ImeiFelt verdi={imei} onEndre={setImei} />
        <Tekstfelt verdi={pris} onEndre={setPris} plassholder="Hva betalte du?" tall />
        <Tekstfelt etikett="Kjøpt" type="date" verdi={dato} onEndre={setDato} />
      </Skjema>
    </Ark>
  )
}

const statusValg = (['Må sendes', 'Sendt', 'Utbetalt'] as SalgsStatus[]).map(s => ({ verdi: s, navn: s }))

function SalgMobil({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const usolgte = [...data.mobiler].filter(m => m.salgspris == null).sort((a, b) => b.flipp_id - a.flipp_id)
  const [id, setId] = useState(usolgte[0]?.id ?? '')
  const [kjoper, setKjoper] = useState('')
  const [pris, setPris] = useState('')
  const [status, setStatus] = useState<SalgsStatus>('Må sendes')
  const tall = lesTall(pris)
  const mobil = usolgte.find(m => m.id === id)
  return (
    <Ark tittel="Salg" lagreTekst="Selg" onLukk={onLukk} kanLagre={!!mobil && tall != null}
      onLagre={async () => {
        await data.oppdater('mobiler', mobil!.id, { salgspris: tall!, salgs_dato: new Date().toISOString(), kjoper_navn: kjoper || null, profitt: tall! - mobil!.kjopspris, salgs_status: status })
        onLukk()
      }}>
      {usolgte.length === 0 ? <div className="tom">Ingen usolgte mobiler!</div> : (
        <Skjema tittel="Salg" fotnote={mobil && tall != null ? `Fortjeneste: ${kr(tall - mobil.kjopspris)} kr` : undefined}>
          <Velger etikett="Mobil" verdi={id} valg={usolgte.map(m => ({ verdi: m.id, navn: `#${1000 + m.flipp_id} – ${m.navn}` }))} onEndre={setId} />
          <Tekstfelt verdi={kjoper} onEndre={setKjoper} plassholder="Navn på kjøper" />
          <Tekstfelt verdi={pris} onEndre={setPris} plassholder="Salgspris" tall />
          <Velger etikett="Status" verdi={status} valg={statusValg} onEndre={setStatus} />
        </Skjema>
      )}
    </Ark>
  )
}

function RedigerMobil({ mobil, onLukk }: { mobil: Mobil; onLukk: () => void }) {
  const data = useData()
  const [bilde, setBilde] = useState(mobil.bilde)
  const [navn, setNavn] = useState(mobil.navn)
  const [selger, setSelger] = useState(mobil.selger_navn ?? '')
  const [imei, setImei] = useState(mobil.imei ?? '')
  const [kjopspris, setKjopspris] = useState(String(mobil.kjopspris))
  const [kjopsDato, setKjopsDato] = useState(inputDato(d(mobil.kjops_dato)))
  const [kjoper, setKjoper] = useState(mobil.kjoper_navn ?? '')
  const [salgspris, setSalgspris] = useState(mobil.salgspris != null ? String(mobil.salgspris) : '')
  const [salgsDato, setSalgsDato] = useState(inputDato(mobil.salgs_dato ? d(mobil.salgs_dato) : new Date()))
  const [status, setStatus] = useState<SalgsStatus | ''>(mobil.salgs_status ?? '')
  const kjop = lesTall(kjopspris), salg = lesTall(salgspris)

  const lagre = async () => {
    const endring: Partial<Mobil> = {
      bilde, navn, selger_navn: selger || null, imei: imei || null, kjopspris: kjop!,
      kjops_dato: kjopsDato === inputDato(d(mobil.kjops_dato)) ? mobil.kjops_dato : fraInputDato(kjopsDato).toISOString(),
    }
    if (salg != null) {
      Object.assign(endring, {
        salgspris: salg, profitt: salg - kjop!, kjoper_navn: kjoper || null, salgs_status: status || null,
        salgs_dato: mobil.salgs_dato && salgsDato === inputDato(d(mobil.salgs_dato)) ? mobil.salgs_dato
          : salgsDato === inputDato(new Date()) ? new Date().toISOString() : fraInputDato(salgsDato).toISOString(),
      })
    } else Object.assign(endring, { salgspris: null, salgs_dato: null, profitt: null, kjoper_navn: null, salgs_status: null })
    await data.oppdater('mobiler', mobil.id, endring)
    onLukk()
  }

  return (
    <Ark tittel={`Ordre #${1000 + mobil.flipp_id}`} onLukk={onLukk} onLagre={lagre} kanLagre={!!navn && kjop != null}>
      <Skjema tittel="Bilde (valgfritt)"><BildeVelger bilde={bilde} onEndre={setBilde} tekst="Velg bilde fra kamerarull" /></Skjema>
      <Skjema tittel="Kjøp / vare">
        <Tekstfelt etikett="Modell" verdi={navn} onEndre={setNavn} />
        <Tekstfelt etikett="Kjøpt av" verdi={selger} onEndre={setSelger} plassholder="Navn/telefon" />
        <ImeiFelt verdi={imei} onEndre={setImei} />
        <Tekstfelt etikett="Kjøpspris" verdi={kjopspris} onEndre={setKjopspris} tall />
        <Tekstfelt etikett="Kjøpt" type="date" verdi={kjopsDato} onEndre={setKjopsDato} />
      </Skjema>
      <Skjema tittel="Salg" fotnote="La salgspris stå tom hvis telefonen ikke er solgt.">
        <Tekstfelt etikett="Kjøper" verdi={kjoper} onEndre={setKjoper} />
        <Tekstfelt etikett="Salgspris" verdi={salgspris} onEndre={setSalgspris} plassholder="Usolgt" tall />
        {salgspris && <>
          <Tekstfelt etikett="Solgt" type="date" verdi={salgsDato} onEndre={setSalgsDato} />
          <Velger etikett="Status" verdi={status} valg={[{ verdi: '' as const, navn: 'Ingen' }, ...statusValg]} onEndre={v => setStatus(v as SalgsStatus | '')} />
        </>}
      </Skjema>
      <button className="knapp fare" onClick={async () => { if (bekreft(`Slette #${1000 + mobil.flipp_id} ${mobil.navn}?`)) { await data.slett('mobiler', mobil.id); onLukk() } }}>Slett mobil</button>
    </Ark>
  )
}

function NyttUtstyr({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const [bilde, setBilde] = useState<string | null>(null)
  const [navn, setNavn] = useState('')
  const [pris, setPris] = useState('')
  const [dato, setDato] = useState(inputDato(new Date()))
  const tall = lesTall(pris)
  return (
    <Ark tittel="Utstyr" onLukk={onLukk} kanLagre={!!navn && tall != null}
      onLagre={async () => {
        const r = await data.leggTil('bedrift_utgifter', { navn, pris: tall!, bilde, dato: (dato === inputDato(new Date()) ? new Date() : fraInputDato(dato)).toISOString() })
        if (r) onLukk()
      }}>
      <Skjema tittel="Bilde av kvittering (valgfritt)"><BildeVelger bilde={bilde} onEndre={setBilde} tekst="Legg ved kvittering" /></Skjema>
      <Skjema tittel="Utstyr" fotnote="Utstyr føres kun i bedriften, ikke som utgift i budsjettet.">
        <Tekstfelt verdi={navn} onEndre={setNavn} plassholder="Hva kjøpte du?" />
        <Tekstfelt verdi={pris} onEndre={setPris} plassholder="Pris" tall />
        <Tekstfelt etikett="Dato" type="date" verdi={dato} onEndre={setDato} />
      </Skjema>
    </Ark>
  )
}

function Kjorebok({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const [ny, setNy] = useState(false)
  const turer = [...data.kjoreturer].sort((a, b) => b.dato.localeCompare(a.dato))
  const totalKm = sum(turer, t => t.km)
  const mndKm = kmDenneMaaned(turer)
  return (
    <Ark tittel="Kjørebok" onLukk={onLukk}>
      <Seksjon tittel={<span className="middels" style={{ fontSize: 14 }}>Kjøregodtgjørelse (3,50 kr/km)</span>}>
        <div className="listerad"><span className="vokse">Totalt fradrag</span><span className="fet gronn tall">{kr(Math.round(totalKm * KM_SATS))} kr</span></div>
        <div className="listerad"><span className="vokse">Denne måneden</span>
          {mndKm >= KM_GRENSE_MND ? <span className="fet rod">{kr(mndKm)} km (grense nådd)</span> : <span className="fet tall">{kr(mndKm)} / {KM_GRENSE_MND} km</span>}
        </div>
        <button className="listerad" onClick={() => setNy(true)}><span className="bla fet">+ Ny tur</span></button>
      </Seksjon>
      {turer.length > 0 && (
        <Seksjon>
          {turer.map(t => (
            <SveipRad key={t.id} onSlett={() => data.slett('kjoreturer', t.id)}>
              <div className="listerad kolonne" style={{ alignItems: 'stretch', gap: 4 }}>
                <div className="rad mellom"><span className="fet">{datoKort(d(t.dato))}</span><span className="fet bla tall">{kr(t.km)} km</span></div>
                <span className="gra" style={{ fontSize: 14 }}>{t.start_sted} → {t.stopp_sted}</span>
                <span className="liten">Formål: {t.formal}{t.imei_ref ? ` (ref: ${t.imei_ref})` : ''}</span>
              </div>
            </SveipRad>
          ))}
        </Seksjon>
      )}
      {ny && <NyTur onLukk={() => setNy(false)} />}
    </Ark>
  )
}

function NyTur({ onLukk }: { onLukk: () => void }) {
  const data = useData()
  const [fra, setFra] = useState(''), [til, setTil] = useState(''), [km, setKm] = useState(''), [formal, setFormal] = useState(''), [ref, setRef] = useState('')
  const [dato, setDato] = useState(inputDato(new Date()))
  const tall = lesTall(km)
  const turDato = dato === inputDato(new Date()) ? new Date() : fraInputDato(dato)
  const ledig = Math.max(0, KM_GRENSE_MND - kmDenneMaaned(data.kjoreturer, turDato))
  const lagres = tall != null ? Math.min(tall, ledig) : 0
  return (
    <Ark tittel="Ny tur" onLukk={onLukk} kanLagre={tall != null && lagres > 0}
      onLagre={async () => {
        if (await data.leggTil('kjoreturer', { start_sted: fra, stopp_sted: til, formal, km: lagres, imei_ref: ref || null, dato: turDato.toISOString() })) onLukk()
      }}>
      <Skjema tittel="Rute">
        <Tekstfelt verdi={fra} onEndre={setFra} plassholder="Fra (f.eks. Hjem)" />
        <Tekstfelt verdi={til} onEndre={setTil} plassholder="Til (f.eks. Posten)" />
      </Skjema>
      <Skjema tittel="Detaljer" fotnote={tall != null && tall > ledig ? (ledig > 0 ? `Bare ${kr(ledig)} km kan føres denne måneden (maks ${KM_GRENSE_MND} km).` : `Grensen på ${KM_GRENSE_MND} km er nådd denne måneden.`) : undefined}>
        <Tekstfelt verdi={km} onEndre={setKm} plassholder="Antall km (tur/retur)" tall />
        <Tekstfelt verdi={formal} onEndre={setFormal} plassholder="Formål (f.eks. Hente pakke)" />
        <Tekstfelt verdi={ref} onEndre={setRef} plassholder="Evt. IMEI-/ordrereferanse" />
        <Tekstfelt etikett="Dato" type="date" verdi={dato} onEndre={setDato} />
      </Skjema>
    </Ark>
  )
}
