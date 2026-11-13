// Ser etter ny versjon av appen og laster den inn automatisk.
// Hjemskjerm-apper på iPhone laster seg ikke på nytt av seg selv når du åpner dem,
// så vi sjekker hver gang appen kommer i forgrunnen (og hvert 5. minutt).

const naavaerende = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')?.getAttribute('src') ?? null

async function sjekk() {
  const min = naavaerende()
  if (!min) return // utviklingsmodus
  try {
    const svar = await fetch(`./index.html?sjekk=${Date.now()}`, { cache: 'no-store' })
    if (!svar.ok) return
    const ny = (await svar.text()).match(/src="([^"]*assets\/index-[^"]+\.js)"/)?.[1]
    if (ny && ny !== min) {
      // Ny versjon finnes – last inn på nytt uten å bruke den lagrede kopien
      // (maks én gang i minuttet, så den aldri kan havne i en løkke)
      const sist = Number(sessionStorage.getItem('sistOppdatert') ?? 0)
      if (Date.now() - sist < 60_000) return
      sessionStorage.setItem('sistOppdatert', String(Date.now()))
      location.replace(`./?v=${Date.now()}`)
    }
  } catch { /* offline – prøv igjen senere */ }
}

export function startOppdateringssjekk() {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sjekk() })
  window.addEventListener('focus', sjekk)
  setInterval(sjekk, 5 * 60 * 1000)
  sjekk()
}
