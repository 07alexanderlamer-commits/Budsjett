export type Kategori = { id: string; navn: string; budsjett: number; farge: string; rekkefolge: number }
export type Utgift = { id: string; tittel: string; belop: number; kategori: string; dato: string }
export type FastUtgift = { id: string; tittel: string; belop: number; kategori: string; er_bedrift: boolean }
export type Inntekt = { id: string; tittel: string; belop: number; er_fast: boolean; dato: string }
export type SalgsStatus = 'Må sendes' | 'Sendt' | 'Utbetalt'
export type Mobil = {
  id: string; flipp_id: number; navn: string; kjopspris: number; salgspris: number | null
  kjops_dato: string; salgs_dato: string | null; profitt: number | null; imei: string | null
  kjoper_navn: string | null; selger_navn: string | null; salgs_status: SalgsStatus | null; bilde: string | null
  kjops_status: 'Sendes til deg' | null
  teleoutlet_ordre: string | null
  sendt_dato: string | null
}
export type BedriftUtgift = { id: string; navn: string; pris: number; dato: string; bilde: string | null; med_mva: boolean }
export type Kjoretur = { id: string; dato: string; start_sted: string; stopp_sted: string; formal: string; km: number; imei_ref: string | null }
export type Innstillinger = {
  user_id?: string; bedrift_kapital: number; firmanavn: string; slagord: string; org_nr: string
  adresse: string; postnr_sted: string; telefon: string; epost: string | null
}

export type Tabeller = {
  kategorier: Kategori; utgifter: Utgift; faste_utgifter: FastUtgift; inntekter: Inntekt
  mobiler: Mobil; bedrift_utgifter: BedriftUtgift; kjoreturer: Kjoretur
}
export type TabellNavn = keyof Tabeller

export const STANDARD_INNSTILLINGER: Innstillinger = {
  bedrift_kapital: 30000, firmanavn: 'Lamer Mobil', slagord: 'Kjøp og salg av brukte iPhones',
  org_nr: '', adresse: '', postnr_sted: '', telefon: '', epost: null,
}
