// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

// Qui, per ora, SOLO la CSP con il nonce di §4.9. L'identità (chiIsiede, i tre
// esiti, il redirect) la aggiunge il Task 3.

/**
 * L'origine del progetto, non `*.supabase.co`: §4.9 scrive
 * `https://<progetto>.supabase.co`, e un jolly renderebbe ogni progetto
 * Supabase del mondo una destinazione ammessa — cioè toglierebbe alla CSP la
 * metà che conta contro la XSS che §4.9 dichiara possibile.
 *
 * ⚠︎ PIGRA E DIFENSIVA, e non è pignoleria. Scritta come
 * `const SUPABASE = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin` a
 * livello di modulo — la forma della prima stesura — una variabile mancante
 * fa lanciare `TypeError: Invalid URL` DURANTE LA VALUTAZIONE DEL MODULO, e un
 * middleware che fallisce a modulo risponde 500 su OGNI rotta del matcher,
 * `/accesso` compresa. ⚠︎ E `npm run build` COMPILA il middleware senza
 * eseguirlo, quindi esce 0: il gate non lo vedrebbe. Reperto bloccante del
 * secondo giro di revisione.
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

function CSP(nonce: string): string {
  const s = origineSupabase()
  if (s === null) {
    // Degrada invece di spegnere l'applicazione, e lo dice a chi sviluppa.
    console.warn('NEXT_PUBLIC_SUPABASE_URL assente o non valida: connect-src ristretto a self')
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    s === null ? "connect-src 'self'" : `connect-src 'self' ${s.https} ${s.wss}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
  ].join('; ')
}

export function middleware(richiesta: NextRequest) {
  // Il runtime del middleware non ha `Buffer`: `btoa` sì.
  const nonce = btoa(crypto.randomUUID())
  const csp = CSP(nonce)

  // La CSP va anche sulla RICHIESTA: è da lì che Next legge il nonce e lo
  // applica ai propri script durante il rendering.
  const intestazioni = new Headers(richiesta.headers)
  intestazioni.set('x-nonce', nonce)
  intestazioni.set('Content-Security-Policy', csp)

  const risposta = NextResponse.next({ request: { headers: intestazioni } })
  risposta.headers.set('Content-Security-Policy', csp)
  return risposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|webp)$).*)'],
}
