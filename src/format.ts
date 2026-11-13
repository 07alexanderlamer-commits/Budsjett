// Formatering av tall og datoer på norsk

/** 12 776 (heltall med mellomrom som tusenskille, som i iPhone-appen) */
export function kr(v: number): string {
  const n = Math.trunc(v)
  const tegn = n < 0 ? '-' : ''
  return tegn + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const maanedNavn = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']
const ukedagNavn = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']

export const stor = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const maaned = (d: Date) => maanedNavn[d.getMonth()]
export const maanedAar = (d: Date) => `${maaned(d)} ${d.getFullYear()}`
export const ukedag = (d: Date) => ukedagNavn[d.getDay()]
const to = (n: number) => String(n).padStart(2, '0')
/** 25.10.2026 */
export const datoKort = (d: Date) => `${to(d.getDate())}.${to(d.getMonth() + 1)}.${d.getFullYear()}`
/** 25. okt */
export const datoDagMnd = (d: Date) => `${d.getDate()}. ${maaned(d).slice(0, 3)}`
/** 25. oktober 2026 */
export const datoLang = (d: Date) => `${d.getDate()}. ${maaned(d)} ${d.getFullYear()}`
/** 2026-10 */
export const aarMnd = (d: Date) => `${d.getFullYear()}-${to(d.getMonth() + 1)}`
/** yyyy-mm-dd for <input type="date"> */
export const inputDato = (d: Date) => `${d.getFullYear()}-${to(d.getMonth() + 1)}-${to(d.getDate())}`
/** Les dato fra <input type="date"> som lokal tid kl. 12 (unngår tidssone-hopp) */
export const fraInputDato = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12) }

/** Tolker beløp skrevet med komma eller punktum. Returnerer null hvis ugyldig. */
export function lesTall(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(',', '.')
  if (t === '' || isNaN(Number(t))) return null
  return Number(t)
}
