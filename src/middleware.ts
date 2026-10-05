// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { CSP } from './server/csp'

// Qui, per ora, SOLO la CSP con il nonce di §4.9. L'identità (chiIsiede, i tre
// esiti, il redirect) la aggiunge il Task 3.

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
