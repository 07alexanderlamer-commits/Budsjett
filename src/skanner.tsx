// Strekkodeskanner for IMEI/serienummer (bruker kameraet i nettleseren)
import { useEffect, useRef, useState } from 'react'
import { Ark } from './ui'

export function Skanner({ onFunnet, onLukk }: { onFunnet: (kode: string) => void; onLukk: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const cb = useRef({ onFunnet, onLukk }); cb.current = { onFunnet, onLukk }

  useEffect(() => {
    let stopp: (() => void) | null = null
    let avbrutt = false
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const leser = new BrowserMultiFormatReader()
        const kontroll = await leser.decodeFromConstraints(
          { video: { facingMode: 'environment' } }, video.current!,
          resultat => { if (resultat && !avbrutt) { avbrutt = true; kontroll.stop(); cb.current.onFunnet(resultat.getText()); cb.current.onLukk() } },
        )
        stopp = () => kontroll.stop()
        if (avbrutt) kontroll.stop()
      } catch (e) {
        setFeil('Fikk ikke tilgang til kameraet. Sjekk at Safari har lov til å bruke kamera (Innstillinger → Safari → Kamera).')
      }
    })()
    return () => { avbrutt = true; stopp?.() }
  }, [])

  return (
    <Ark tittel="Skann strekkode" onLukk={onLukk}>
      {feil ? <div className="kort rod">{feil}</div> : <video ref={video} className="skanner" playsInline muted />}
      <div className="fotnote">Hold strekkoden med IMEI- eller serienummeret (på esken eller i Innstillinger → Generelt → Om) foran kameraet.</div>
    </Ark>
  )
}
