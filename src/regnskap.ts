// All regnelogikk – samme regler som i iPhone-appen
import type { BedriftUtgift, FastUtgift, Inntekt, Kategori, Kjoretur, Mobil, Utgift } from './types'

export const d = (s: string) => new Date(s)

export function sammeMaaned(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() }
export function maanedStart(dato: Date) { return new Date(dato.getFullYear(), dato.getMonth(), 1) }
export function maanedSlutt(dato: Date) { return new Date(dato.getFullYear(), dato.getMonth() + 1, 1, 0, 0, 0, -1) }
export function dagerIMaaned(dato: Date) { return new Date(dato.getFullYear(), dato.getMonth() + 1, 0).getDate() }

/** Hvor mange kalendermåneder perioden berører (minst 1). */
export function antallMaaneder(start: Date, slutt: Date) {
  if (slutt < start) return 0
  return Math.max(1, (slutt.getFullYear() - start.getFullYear()) * 12 + (slutt.getMonth() - start.getMonth()) + 1)
}

export const sum = <T,>(liste: T[], f: (x: T) => number) => liste.reduce((s, x) => s + f(x), 0)

// ---------- Bedrift ----------

export function profitt(m: Mobil) { return m.profitt ?? (m.salgspris != null ? m.salgspris - m.kjopspris : 0) }

/** Fortjeneste/tap på mobiler solgt i perioden − utstyr i perioden − faste bedriftsutgifter per måned. */
export function bedriftResultat(start: Date, slutt: Date, mobiler: Mobil[], utstyr: BedriftUtgift[], faste: FastUtgift[]) {
  const salg = sum(mobiler.filter(m => m.salgspris != null && m.salgs_dato && d(m.salgs_dato) >= start && d(m.salgs_dato) <= slutt), profitt)
  const deler = sum(utstyr.filter(u => d(u.dato) >= start && d(u.dato) <= slutt), u => u.pris)
  const fastePerMnd = sum(faste.filter(f => f.er_bedrift), f => f.belop)
  return salg - deler - fastePerMnd * antallMaaneder(start, slutt)
}

export function maanedsResultat(dato: Date, mobiler: Mobil[], utstyr: BedriftUtgift[], faste: FastUtgift[]) {
  return bedriftResultat(maanedStart(dato), maanedSlutt(dato), mobiler, utstyr, faste)
}

/** Inntekten «Bedrift» i budsjettet: overskuddet, eller 0 hvis bedriften går i minus. */
export function bedriftTilBudsjett(dato: Date, mobiler: Mobil[], utstyr: BedriftUtgift[], faste: FastUtgift[]) {
  return Math.max(0, maanedsResultat(dato, mobiler, utstyr, faste))
}

export function forsteBedriftDato(mobiler: Mobil[], utstyr: BedriftUtgift[]) {
  const datoer = [...mobiler.map(m => d(m.kjops_dato).getTime()), ...utstyr.map(u => d(u.dato).getTime())]
  return datoer.length ? new Date(Math.min(...datoer)) : new Date()
}

/** Pengene i en telefon er bundet til salget er utbetalt (eller er et gammelt salg uten status). */
export const erUtbetalt = (m: Mobil) => m.salgspris != null && (m.salgs_status == null || m.salgs_status === 'Utbetalt')

export function kapital(startKapital: number, mobiler: Mobil[]) {
  return startKapital - sum(mobiler.filter(m => !erUtbetalt(m)), m => m.kjopspris)
}

export const erUnderveis = (m: Mobil) => m.salgspris != null && (m.kjops_status != null || m.salgs_status === 'Må sendes' || m.salgs_status === 'Sendt')
export const nesteStatus = (s: Mobil['salgs_status']): NonNullable<Mobil['salgs_status']> =>
  s === 'Må sendes' ? 'Sendt' : s === 'Sendt' ? 'Utbetalt' : 'Må sendes'

// ---------- MVA-terminer ----------

export const TERMINER = [
  { id: 'alle', navn: 'All tid' },
  { id: 't1', navn: '1. termin (jan–feb)', fra: 0 },
  { id: 't2', navn: '2. termin (mar–apr)', fra: 2 },
  { id: 't3', navn: '3. termin (mai–jun)', fra: 4 },
  { id: 't4', navn: '4. termin (jul–aug)', fra: 6 },
  { id: 't5', navn: '5. termin (sep–okt)', fra: 8 },
  { id: 't6', navn: '6. termin (nov–des)', fra: 10 },
  { id: 'egen', navn: 'Egendefinert dato' },
] as const
export type TerminId = typeof TERMINER[number]['id']

export function terminPeriode(id: TerminId, aar: number, egenStart: Date, egenSlutt: Date): { start: Date; slutt: Date } | null {
  if (id === 'alle') return null
  if (id === 'egen') return { start: new Date(egenStart.getFullYear(), egenStart.getMonth(), egenStart.getDate()), slutt: new Date(egenSlutt.getFullYear(), egenSlutt.getMonth(), egenSlutt.getDate(), 23, 59, 59) }
  const t = TERMINER.find(t => t.id === id) as { fra: number }
  return { start: new Date(aar, t.fra, 1), slutt: new Date(aar, t.fra + 2, 1, 0, 0, 0, -1) }
}

/** Termin som dagens dato ligger i */
export function gjeldendeTermin(): TerminId { return (['t1', 't2', 't3', 't4', 't5', 't6'] as const)[Math.floor(new Date().getMonth() / 2)] }

// ---------- Budsjett ----------

export type Budsjettdata = {
  utgifter: Utgift[]; faste: FastUtgift[]; inntekter: Inntekt[]; kategorier: Kategori[]
  mobiler: Mobil[]; utstyr: BedriftUtgift[]
}

export const privateFaste = (faste: FastUtgift[]) => faste.filter(f => !f.er_bedrift)

export function totalInntekt(b: Budsjettdata, naa = new Date()) {
  return sum(b.inntekter.filter(i => i.er_fast || sammeMaaned(d(i.dato), naa)), i => i.belop)
    + bedriftTilBudsjett(naa, b.mobiler, b.utstyr, b.faste)
}

export function totalForbruk(b: Budsjettdata, naa = new Date()) {
  return sum(b.utgifter.filter(u => sammeMaaned(d(u.dato), naa)), u => u.belop) + sum(privateFaste(b.faste), f => f.belop)
}

export function forbrukKategori(b: Budsjettdata, kategori: string, naa = new Date()) {
  return sum(b.utgifter.filter(u => u.kategori === kategori && sammeMaaned(d(u.dato), naa)), u => u.belop)
    + sum(privateFaste(b.faste).filter(f => f.kategori === kategori), f => f.belop)
}

export type ArkivMaaned = { start: Date; inntekt: number; forbruk: number; utgifter: Utgift[] }

/** Tidligere måneder med utgifter eller mobilsalg (ikke denne måneden), nyeste først */
export function arkiv(b: Budsjettdata, naa = new Date()): ArkivMaaned[] {
  const nokler = new Map<number, Date>()
  const leggTil = (dato: Date) => { if (!sammeMaaned(dato, naa)) { const s = maanedStart(dato); nokler.set(s.getTime(), s) } }
  b.utgifter.forEach(u => leggTil(d(u.dato)))
  b.mobiler.forEach(m => { if (m.salgs_dato) leggTil(d(m.salgs_dato)) })
  const fasteU = sum(privateFaste(b.faste), f => f.belop)
  const fasteI = sum(b.inntekter.filter(i => i.er_fast), i => i.belop)
  return [...nokler.values()].map(start => {
    const utg = b.utgifter.filter(u => sammeMaaned(d(u.dato), start))
    const engI = sum(b.inntekter.filter(i => !i.er_fast && sammeMaaned(d(i.dato), start)), i => i.belop)
    return {
      start, utgifter: utg,
      inntekt: fasteI + engI + bedriftTilBudsjett(start, b.mobiler, b.utstyr, b.faste),
      forbruk: sum(utg, u => u.belop) + fasteU,
    }
  }).sort((a, b) => b.start.getTime() - a.start.getTime())
}

// ---------- Kjørebok ----------

export const KM_SATS = 3.5
export const KM_GRENSE_MND = 500

export function kmDenneMaaned(turer: Kjoretur[], naa = new Date()) {
  return sum(turer.filter(t => sammeMaaned(d(t.dato), naa)), t => t.km)
}
