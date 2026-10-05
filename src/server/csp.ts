// src/server/csp.ts
// La CSP di §4.9, in un modulo a sé perché le prove la VALUTANO invece di
// leggerne il testo: una prova sul testo restava verde anche con il
// middleware che non la mandava (revisione del Task 1, 05/10/2026).

/**
 * L'origine del progetto, non `*.supabase.co`: §4.9 scrive
 * `https://<progetto>.supabase.co`, e un jolly renderebbe ogni progetto
 * Supabase del mondo una destinazione ammessa — cioè toglierebbe alla CSP la
 * metà che conta contro la XSS che §4.9 dichiara possibile.
 *
 * ⚠︎ DIFENSIVA, e non è pignoleria. Scritta come
 * `const SUPABASE = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin` a
 * livello di modulo — la forma della prima stesura — una variabile mancante
 * fa lanciare `TypeError: Invalid URL` DURANTE LA VALUTAZIONE DEL MODULO, e un
 * middleware che fallisce a modulo risponde 500 su OGNI rotta del matcher,
 * `/accesso` compresa. ⚠︎ E `npm run build` COMPILA il middleware senza
 * eseguirlo, quindi esce 0: il gate non lo vedrebbe.
 *
 * ⚠︎ NON si legge a ogni richiesta: Next scrive `NEXT_PUBLIC_*` nel bundle AL
 * BUILD (misurato: il middleware compilato porta l'indirizzo come costante).
 * Un build fatto senza la variabile resta con `connect-src 'self'` finché non
 * lo si rifà, e il realtime dal browser è bloccato. Il build che va online si
 * fa CON la variabile.
 */
function origineSupabase(): { https: string; wss: string } | null {
  const grezza = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (grezza === undefined || grezza === '') return null
  try {
    const origine = new URL(grezza).origin
    return { https: origine, wss: origine.replace(/^http/, 'ws') }
  } catch {
    return null
  }
}

let avvisato = false

/**
 * `sviluppo` aggiunge le due sole deroghe di `next dev`: React Refresh valuta
 * stringhe (`'unsafe-eval'`) e l'overlay degli errori scrive `<style>` in
 * linea. Senza la prima la pagina non si idrata, senza la seconda l'overlay
 * esce senza stile (misurati il 05/10/2026). `next build` fissa sempre
 * NODE_ENV a `production`, quindi in produzione restano fuori: la prova del
 * contorno lo verifica valutando questa funzione.
 */
export function CSP(nonce: string, sviluppo = process.env.NODE_ENV === 'development'): string {
  const s = origineSupabase()
  if (s === null && !avvisato) {
    // Degrada invece di spegnere l'applicazione, e lo dice a chi sviluppa.
    avvisato = true
    console.warn('NEXT_PUBLIC_SUPABASE_URL assente o non valida: connect-src ristretto a self')
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${sviluppo ? " 'unsafe-eval'" : ''}`,
    sviluppo ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    s === null ? "connect-src 'self'" : `connect-src 'self' ${s.https} ${s.wss}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
  ].join('; ')
}
