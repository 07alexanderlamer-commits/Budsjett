// Regneark-eksport (CSV som åpnes riktig i norsk Excel og Numbers)
import { antallMaaneder, bedriftResultat, d, forsteBedriftDato, KM_SATS, maanedSlutt, maanedStart, maanedsResultat } from './regnskap'
import { aarMnd, datoKort, ukedag } from './format'
import type { BedriftUtgift, FastUtgift, Inntekt, Kategori, Kjoretur, Mobil, Utgift } from './types'

const felt = (s: string | number) => {
  const t = String(s)
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}
const belop = (v: number) => v.toFixed(2).replace('.', ',')
const csv = (rader: (string | number)[][]) => new Blob(['﻿' + rader.map(r => r.map(felt).join(';')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })

/** Alt i budsjettet – til analyse («hva bør jeg kutte?») */
export function budsjettEksport(a: { utgifter: Utgift[]; faste: FastUtgift[]; inntekter: Inntekt[]; kategorier: Kategori[]; mobiler: Mobil[]; utstyr: BedriftUtgift[]; firmanavn: string }) {
  const rader: (string | number)[][] = [['Type', 'Dato', 'Måned', 'Ukedag', 'Tittel', 'Kategori', 'Beløp (kr)', 'Merknad']]
  for (const u of [...a.utgifter].sort((x, y) => y.dato.localeCompare(x.dato))) {
    const t = d(u.dato); rader.push(['Utgift', datoKort(t), aarMnd(t), ukedag(t), u.tittel, u.kategori, belop(u.belop), ''])
  }
  for (const f of [...a.faste].sort((x, y) => Number(x.er_bedrift) - Number(y.er_bedrift) || x.kategori.localeCompare(y.kategori))) {
    rader.push([f.er_bedrift ? 'Fast bedriftsutgift' : 'Fast utgift', '', '', '', f.tittel, f.kategori, belop(f.belop), f.er_bedrift ? 'Hver måned – trekkes fra bedriften, ikke fra budsjettet' : 'Hver måned'])
  }
  for (const i of [...a.inntekter].sort((x, y) => y.dato.localeCompare(x.dato))) {
    const t = d(i.dato)
    rader.push(i.er_fast ? ['Fast inntekt', '', '', '', i.tittel, '', belop(i.belop), 'Hver måned'] : ['Engangsinntekt', datoKort(t), aarMnd(t), ukedag(t), i.tittel, '', belop(i.belop), ''])
  }
  if (a.mobiler.length || a.utstyr.length) {
    const bedrift: (string | number)[][] = []
    for (let m = maanedStart(forsteBedriftDato(a.mobiler, a.utstyr)); m <= new Date(); m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const res = maanedsResultat(m, a.mobiler, a.utstyr, a.faste)
      bedrift.push(['Bedrift (resultat for måneden)', '', aarMnd(m), '', a.firmanavn, '', belop(res), `Teller som ${belop(Math.max(0, res))} kr inntekt i budsjettet`])
    }
    rader.push(...bedrift.reverse())
  }
  for (const k of a.kategorier) rader.push(['Budsjett-tak', '', '', '', k.navn, k.navn, belop(k.budsjett), 'Månedlig budsjett for kategorien'])
  return csv(rader)
}

/** Bruktprotokoll + fradrag for valgt periode (til MVA-melding / regnskapsfører) */
export function bruktprotokoll(a: { periode: { start: Date; slutt: Date } | null; mobiler: Mobil[]; utstyr: BedriftUtgift[]; turer: Kjoretur[]; faste: FastUtgift[] }) {
  const iPeriode = (s: string) => !a.periode || (d(s) >= a.periode.start && d(s) <= a.periode.slutt)
  const solgte = a.mobiler.filter(m => m.salgs_dato && iPeriode(m.salgs_dato)).sort((x, y) => x.salgs_dato!.localeCompare(y.salgs_dato!))
  const r: (string | number)[][] = [['BRUKTPROTOKOLL (Salg, Avanse & Utgående MVA)'], ['Dato', 'OrdreNr', 'IMEI', 'Modell', 'Innkjøpspris', 'Salgspris', 'Bruttoavanse', 'Utgående MVA (20%)']]
  let totAvanse = 0, totMva = 0
  for (const m of solgte) {
    const salg = m.salgspris ?? 0, margin = Math.max(0, salg - m.kjopspris), mva = margin * 0.2
    totAvanse += margin; totMva += mva
    r.push([datoKort(d(m.salgs_dato!)), `#${1000 + m.flipp_id}`, m.imei ?? '', m.navn, Math.round(m.kjopspris), Math.round(salg), Math.round(margin), Math.round(mva)])
  }
  r.push(['', '', '', '', 'SUM:', '', Math.round(totAvanse), Math.round(totMva)], [], [], ['SKATTEMESSIGE FRADRAG (Kostnader)'], ['Kategori', 'Beskrivelse', 'Antall', 'Pris/Sats', 'Sum (NOK)'])
  for (const t of a.turer.filter(t => iPeriode(t.dato))) {
    r.push(['Kjørebok', `${datoKort(d(t.dato))}: ${t.start_sted}-${t.stopp_sted} (${t.formal})`, t.km, '3,50', Math.round(t.km * KM_SATS)])
  }
  const antMnd = a.periode ? antallMaaneder(a.periode.start, a.periode.slutt) : 12
  for (const f of a.faste.filter(f => f.er_bedrift)) r.push(['Fast Utgift', `${f.tittel} (${antMnd} mnd)`, antMnd, Math.round(f.belop), Math.round(f.belop * antMnd)])
  for (const u of a.utstyr.filter(u => iPeriode(u.dato))) r.push(['Utstyr/Deler', `${u.navn} (${datoKort(d(u.dato))})`, 1, Math.round(u.pris), Math.round(u.pris)])
  const innMva = a.utstyr.filter(u => u.med_mva !== false && iPeriode(u.dato)).reduce((s, u) => s + u.pris * 0.2, 0)
  r.push([], ['MVA-OPPSUMMERING'], ['Utgående MVA (bruktsalg)', '', '', '', Math.round(totMva)], ['Inngående MVA (utstyr, 20 % av pris inkl. mva)', '', '', '', -Math.round(innMva)],
    [totMva - innMva >= 0 ? 'MVA å betale' : 'MVA til gode', '', '', '', Math.round(Math.abs(totMva - innMva))])
  return csv(r)
}

// Brukes ikke direkte, men nyttig for å sjekke tall
export { bedriftResultat, maanedSlutt }
