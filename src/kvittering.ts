// Kvittering som PDF – samme design som i iPhone-appen
import { jsPDF } from 'jspdf'
import { d } from './regnskap'
import { datoLang } from './format'
import type { Innstillinger, Mobil } from './types'

const AKSENT: [number, number, number] = [18, 31, 61]      // marineblå
const GRONN: [number, number, number] = [33, 140, 84]
const MORK: [number, number, number] = [31, 31, 31]
const BROD: [number, number, number] = [77, 77, 77]
const GRA: [number, number, number] = [128, 128, 128]
const LYS: [number, number, number] = [244, 244, 244]
const STREK: [number, number, number] = [219, 219, 219]

const krPdf = (v: number) => {
  const [hel, des] = Math.abs(v).toFixed(2).split('.')
  return (v < 0 ? '-' : '') + hel.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + des + ' kr'
}

export function lagKvittering(mobil: Mobil, firma: Innstillinger): Blob {
  const W = 595.28, H = 841.89, M = 50, C = W - 2 * M
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ordreNr = String(1000 + mobil.flipp_id)
  doc.setProperties({ title: `Kvittering ${ordreNr}`, author: firma.firmanavn, creator: firma.firmanavn })

  // y = toppen av teksten (som i iPhone-versjonen); jsPDF bruker grunnlinje
  const tekst = (s: string, x: number, y: number, str: number, farge: [number, number, number], fet = false, just: 'left' | 'right' | 'center' = 'left', bredde?: number) => {
    doc.setFont('helvetica', fet ? 'bold' : 'normal'); doc.setFontSize(str); doc.setTextColor(...farge)
    const linjer: string[] = bredde ? doc.splitTextToSize(s, bredde) : [s]
    const xx = just === 'right' ? x + (bredde ?? 0) : just === 'center' ? x + (bredde ?? 0) / 2 : x
    doc.text(linjer, xx, y + str * 0.8, { align: just, lineHeightFactor: 1.25 })
    return linjer.length * str * 1.25
  }

  // Toppbånd
  doc.setFillColor(...AKSENT); doc.rect(0, 0, W, 120, 'F')
  tekst(firma.firmanavn, M, 38, 26, [255, 255, 255], true)
  tekst(firma.slagord, M, 74, 11, [190, 196, 208])
  doc.setCharSpace(2); tekst('KVITTERING', M, 40, 20, [255, 255, 255], true, 'right', C); doc.setCharSpace(0)
  tekst(`Nr. ${ordreNr}`, M, 72, 12, [196, 200, 210], false, 'right', C)

  // Selger / kjøper / detaljer
  const kol = C / 3
  const blokk = (tittel: string, linjer: string[], x: number) => {
    doc.setCharSpace(1.2); let y = 155 + tekst(tittel, x, 155, 9, GRA, true) + 6; doc.setCharSpace(0)
    linjer.filter(Boolean).forEach((l, i) => { y += tekst(l, x, y, i === 0 ? 12 : 11, i === 0 ? MORK : BROD, i === 0, 'left', kol - 12) + 2 })
  }
  blokk('SELGER', [firma.firmanavn, firma.org_nr ? `Org.nr. ${firma.org_nr}` : '', firma.adresse, firma.postnr_sted], M)
  blokk('KJØPER', [mobil.kjoper_navn?.trim() || 'Privatkunde'], M + kol)
  blokk('DETALJER', [datoLang(mobil.salgs_dato ? d(mobil.salgs_dato) : new Date()), `Kvitteringsnr. ${ordreNr}`, 'Antall varer: 1'], M + 2 * kol)

  // Varetabell
  let y = 270
  const antallX = M + C - 190, belopB = 120, belopX = M + C - belopB - 14
  doc.setFillColor(...LYS); doc.roundedRect(M, y, C, 28, 6, 6, 'F')
  doc.setCharSpace(1)
  tekst('BESKRIVELSE', M + 14, y + 9, 9, GRA, true)
  tekst('ANTALL', antallX, y + 9, 9, GRA, true, 'center', 50)
  tekst('BELØP', belopX, y + 9, 9, GRA, true, 'right', belopB)
  doc.setCharSpace(0)
  y += 44
  const radTopp = y, beskrB = antallX - M - 28
  y += tekst(mobil.navn, M + 14, y, 13, MORK, true, 'left', beskrB) + 4
  y += tekst(['Brukt vare', mobil.imei ? `IMEI/SN: ${mobil.imei}` : ''].filter(Boolean).join('  ·  '), M + 14, y, 10, GRA, false, 'left', beskrB)
  tekst('1', antallX, radTopp, 12, MORK, false, 'center', 50)
  tekst(krPdf(mobil.salgspris ?? 0), belopX, radTopp, 12, MORK, false, 'right', belopB)
  y += 16
  doc.setDrawColor(...STREK); doc.setLineWidth(0.75); doc.line(M, y, M + C, y)
  y += 24

  // Totalt + BETALT
  const sumB = 240, sumX = M + C - sumB
  doc.setFillColor(...AKSENT); doc.roundedRect(sumX, y, sumB, 50, 10, 10, 'F')
  tekst('Totalt', sumX + 18, y + 17, 13, [205, 208, 216], true)
  tekst(krPdf(mobil.salgspris ?? 0), sumX, y + 13, 20, [255, 255, 255], true, 'right', sumB - 18)
  doc.setFillColor(232, 243, 237); doc.setDrawColor(...GRONN); doc.setLineWidth(1.2)
  doc.roundedRect(M, y + 11, 96, 28, 14, 14, 'FD')
  doc.setCharSpace(1); tekst('BETALT', M, y + 19, 10.5, GRONN, true, 'center', 96); doc.setCharSpace(0)
  y += 90

  // Merknad
  const p = 16, tb = C - 2 * p
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  const brod = 'Kjøper har reklamasjonsrett etter forbrukerkjøpsloven. Ta vare på kvitteringen som dokumentasjon på kjøpet.'
  const hoyde = 2 * p + 10 * 1.25 + 3 + doc.splitTextToSize(brod, tb).length * 12.5
  doc.setFillColor(...LYS); doc.roundedRect(M, y, C, hoyde, 10, 10, 'F')
  let my = y + p
  my += tekst('Reklamasjon', M + p, my, 10, MORK, true) + 3
  tekst(brod, M + p, my, 10, BROD, false, 'left', tb)

  // Bunntekst
  const by = H - 78
  doc.setDrawColor(...STREK); doc.setLineWidth(0.75); doc.line(M, by, M + C, by)
  tekst('Takk for handelen!', M, by + 16, 12, AKSENT, true, 'center', C)
  tekst([firma.firmanavn, firma.org_nr && `Org.nr. ${firma.org_nr}`, firma.telefon && `Tlf. ${firma.telefon}`, firma.epost].filter(Boolean).join('  ·  '), M, by + 36, 9, GRA, false, 'center', C)

  return doc.output('blob')
}
