// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { CSP } from './server/csp'
import { confermataDaGoTrue } from './server/gotrue'

export async function middleware(richiesta: NextRequest) {
  // Il runtime del middleware non ha `Buffer`: `btoa` sì.
  const nonce = btoa(crypto.randomUUID())
  const csp = CSP(nonce)

  // ⚠︎ La CSP e il nonce vanno anche sulla RICHIESTA: è da lì che Next legge
  // il nonce e lo applica ai propri script. Un `NextResponse.next({ request:
  // richiesta })` li perde, e con 'strict-dynamic' il browser blocca ogni
  // script. Le intestazioni si ricostruiscono a ogni `next()`, quindi anche
  // DOPO che `setAll` ha aggiornato i cookie della richiesta.
  const avanti = () => {
    const intestazioni = new Headers(richiesta.headers)
    intestazioni.set('x-nonce', nonce)
    intestazioni.set('Content-Security-Policy', csp)
    return NextResponse.next({ request: { headers: intestazioni } })
  }

  let risposta = avanti()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => richiesta.cookies.getAll(),
        setAll: (nuovi) => {
          for (const { name, value } of nuovi) richiesta.cookies.set(name, value)
          risposta = avanti()
          for (const { name, value, options } of nuovi) risposta.cookies.set(name, value, options)
        },
      },
    },
  )

  // Uguaglianza sul segmento, non prefisso: `/accessorio` non è pubblica.
  const percorso = richiesta.nextUrl.pathname
  const pubblica = percorso === '/accesso' || percorso.startsWith('/accesso/')

  if (!pubblica) {
    const esito = await chiIsiede(client)
    // §4.7 distingue TRE casi. «Zero righe CONFERMATE → esce da questo
    // telefono»; «ERRORE (rete, disservizio) → rifiuta la richiesta SENZA
    // chiudere sessioni». Il terzo — nessuna sessione del tutto — è il
    // visitatore che deve accedere.
    // ⚠︎ Il 503 e il redirect sono risposte NUOVE: senza `conCookie` perdono i
    // cookie che `setAll` ha scritto su `risposta` — i token appena rinnovati
    // da `getUser()` e la cancellazione della sessione (revisione del Task 3).
    if (esito === 'guasto') {
      return senzaCache(conCookie(new NextResponse('servizio non raggiungibile', { status: 503 }), risposta), csp)
    }
    if (esito !== 'operatrice') {
      // Sessione assente, scaduta, revocata, oppure account che non è
      // un'operatrice attiva: si va all'accesso, che è l'uscita forzata di
      // §4.4 quando la sessione c'era. «Zero righe confermate → esce da QUESTO
      // telefono» (§4.7): `local` chiude solo questa sessione, e i cookie
      // cancellati viaggiano sul redirect.
      await client.auth.signOut({ scope: 'local' })
      // Le rotte `/api/` le chiama `fetch`, che SEGUE il rinvio e riceve la
      // pagina d'accesso in HTML: il telefono la leggeva come «Non so», e
      // l'uscita forzata di «Controlla» non arrivava mai (revisione del Task 9).
      // Lì l'uscita è un 401 in JSON, che il telefono riconosce.
      const uscita = percorso.startsWith('/api/')
        ? NextResponse.json({ tipo: 'uscita_forzata' }, { status: 401 })
        : NextResponse.redirect(new URL('/accesso', richiesta.url))
      return senzaCache(conCookie(uscita, risposta), csp)
    }
  }

  return senzaCache(risposta, csp)
}

/**
 * Le tre risposte che §4.7 pretende, e il modo di distinguerle.
 *
 * ⚠︎ `getUser()` restituisce un `error` in TRE situazioni diverse: nessun
 * cookie (`AuthSessionMissingError`, 400), token scaduto o sessione REVOCATA
 * (4xx da GoTrue), e servizio irraggiungibile (stato 0 o 5xx). Trattarle tutte
 * come guasto dava 503 alla prima visita di chiunque e mai l'uscita forzata
 * all'operatrice disattivata, che è il caso per cui D3-17 esiste.
 *
 * ⚠︎ §4.7 vuole «zero righe CONFERMATE», che è una lettura di `operator`: senza
 * quella lettura un account che non è operatrice attiva passerebbe.
 */
async function chiIsiede(client: SupabaseClient): Promise<'operatrice' | 'fuori' | 'guasto'> {
  let utente
  try {
    const { data, error } = await client.auth.getUser()
    if (error !== null) {
      return confermataDaGoTrue(error) ? 'fuori' : 'guasto'
    }
    utente = data.user
  } catch {
    return 'guasto'                       // fetch caduta: mai «fuori»
  }
  if (utente === null) return 'fuori'

  try {
    const { data: riga, error } = await client
      .from('operator').select('id').eq('auth_user_id', utente.id).maybeSingle()
    if (error !== null) return 'guasto'   // PostgREST irraggiungibile ≠ zero righe
    return riga === null ? 'fuori' : 'operatrice'
  } catch {
    return 'guasto'
  }
}

function conCookie(r: NextResponse, da: NextResponse): NextResponse {
  for (const c of da.cookies.getAll()) r.cookies.set(c)
  return r
}

function senzaCache(r: NextResponse, csp: string): NextResponse {
  // La CSP si scrive QUI, calcolata da `CSP()` con il nonce di questa
  // richiesta. ⚠︎ Nessuna intestazione della RICHIESTA decide che cosa
  // scrivere: altrimenti bastava mandarne una per azzerare la CSP di risposta.
  r.headers.set('Content-Security-Policy', csp)
  // §4.9: la bozza della scheda non deve restare in nessuna cache — e nemmeno
  // un 503, che un intermediario terrebbe buono dopo la fine del disservizio.
  r.headers.set('Cache-Control', 'no-store')
  return r
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|webp)$).*)'],
}
