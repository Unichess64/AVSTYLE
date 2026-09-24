// tests/helpers/sessioni.ts
//
// Accesso vero al GoTrue locale. Serve alla chiusura immediata (design 3a
// §4.7): da lì in poi `app.is_active_operator()` chiede che la sessione del
// token esista ancora, quindi una prova che scrive i claim a mano passerebbe
// per la ragione sbagliata — o fallirebbe senza dire perché.
//
// I token si riusano: il GoTrue locale limita gli accessi (`sign_in_sign_ups`
// in supabase/config.toml: 30 per intervallo di default, alzato a 300 per
// questa suite), e 81 prove che accedono una per una supererebbero il default.
import { asOwner, esigiDatabaseLocale } from './db'

const AUTH_URL = process.env.SUPABASE_AUTH_URL ?? 'http://127.0.0.1:54321/auth/v1'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export const EMAIL_DI: Record<string, string> = {
  '00000000-0000-4000-8000-000000000001': 'vera@example.test',
  '00000000-0000-4000-8000-000000000002': 'annalisa@example.test',
  '00000000-0000-4000-8000-000000000003': 'alessandra@example.test',
  '00000000-0000-4000-8000-000000000009': 'outsider@example.test',
}

let preparati = false

/** Password locale delle prove. Non esiste da nessun'altra parte. */
export const PASSWORD_PROVA = 'prova-3a-1'

export async function preparaAccountLocali(): Promise<void> {
  // prima di `preparati`: una guardia che si salta al secondo giro non è una
  // guardia, ed è anche l'unico modo di renderne verificabile il collegamento.
  esigiDatabaseLocale()
  if (preparati) return
  await asOwner(async (c) => {
    await c.query(
      `update auth.users
          set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf', 8)),
              email_confirmed_at = coalesce(email_confirmed_at, now()),
              aud = 'authenticated',
              role = 'authenticated',
              raw_app_meta_data  = coalesce(raw_app_meta_data,  '{"provider":"email","providers":["email"]}'::jsonb),
              raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb),
              confirmation_token = coalesce(confirmation_token, ''),
              recovery_token     = coalesce(recovery_token, ''),
              email_change       = coalesce(email_change, ''),
              email_change_token_new     = coalesce(email_change_token_new, ''),
              email_change_token_current = coalesce(email_change_token_current, ''),
              phone_change       = coalesce(phone_change, ''),
              phone_change_token = coalesce(phone_change_token, ''),
              reauthentication_token = coalesce(reauthentication_token, '')
        where email like '%@example.test'`,
      [PASSWORD_PROVA],
    )
    // Su GoTrue v2.196.0 questa riga NON serve: misurato il 24/09/2026
    // togliendo l'insert e azzerando auth.identities con un db reset, la suite
    // resta verde (277) con 24 accessi riusciti e zero identità, e rispondono
    // 200 anche `grant_type=refresh_token` e `GET /user`. Resta perché il piano
    // la prescrive e perché una versione futura di GoTrue potrebbe tornare a
    // pretenderla: l'insert è idempotente e costa una volta per passata. Ciò
    // che invece SERVE sono i coalesce qui sopra: togliendoli, 96 prove su 15
    // file falliscono con 500 «Database error querying schema».
    await c.query(
      `insert into auth.identities
         (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       select gen_random_uuid(), u.id, u.id::text,
              jsonb_build_object('sub', u.id::text, 'email', u.email,
                                 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now()
         from auth.users u
        where u.email like '%@example.test'
          and not exists (select 1 from auth.identities i where i.user_id = u.id)`,
    )
  })
  preparati = true
}

export type Sessione = { accessToken: string; refreshToken: string; sessionId: string; userId: string }

// La cache tiene la PROMESSA, non il risultato: vedi `sessioneDi`.
const cache = new Map<string, Promise<Sessione>>()

function pezziDelToken(accessToken: string): { session_id: string; sub: string } {
  const corpo = accessToken.split('.')[1]
  return JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
}

export async function accedi(email: string, password = PASSWORD_PROVA): Promise<Sessione> {
  await preparaAccountLocali()
  const risposta = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!risposta.ok) {
    throw new Error(`accesso fallito per ${email}: ${risposta.status} ${await risposta.text()}`)
  }
  const dati = (await risposta.json()) as { access_token: string; refresh_token: string }
  const claim = pezziDelToken(dati.access_token)
  return {
    accessToken: dati.access_token,
    refreshToken: dati.refresh_token,
    sessionId: claim.session_id,
    userId: claim.sub,
  }
}

/**
 * La sessione dell'account, creata una volta sola e riusata.
 *
 * In cache va la **promessa**, non il risultato, e ci va **prima** di ogni
 * `await`: mettendoci il risultato, due chiamate concorrenti per lo stesso
 * account trovavano entrambe la cache vuota e aprivano DUE sessioni — misurato
 * dalla revisione del Task 2, due `sessionId` diversi da
 * `Promise.all([sessioneDi(X), sessioneDi(X)])`. Il Task 4 asserisce che le
 * sessioni vive di un account siano **una**.
 */
export function sessioneDi(authUid: string): Promise<Sessione> {
  const gia = cache.get(authUid)
  if (gia) return gia
  const in_volo = (async () => {
    const email = EMAIL_DI[authUid]
    if (!email) throw new Error(`nessuna email nota per ${authUid}`)
    const nuova = await accedi(email)
    // La sessione deve essere DI questo account. Senza questo controllo una voce
    // sbagliata in EMAIL_DI è muta per sempre: mutando l'estranea in
    // vera@example.test, le cinque prove che si aspettano zero righe restano
    // verdi girando con la sessione di Vera — misurato dalla revisione del
    // Task 2, zero rosse anche con la chiusura immediata accesa.
    if (nuova.userId !== authUid) {
      throw new Error(`EMAIL_DI sbaglia: ${email} è l'account ${nuova.userId}, non ${authUid}`)
    }
    return nuova
  })()
  cache.set(authUid, in_volo)
  // Una promessa RIFIUTATA non resta in cache: un guasto passeggero (un 429, la
  // rete) renderebbe altrimenti rosse per sempre tutte le prove successive
  // dello stesso file, con un errore che non nomina la causa vera.
  in_volo.catch(() => {
    if (cache.get(authUid) === in_volo) cache.delete(authUid)
  })
  return in_volo
}

/** Da chiamare quando una prova chiude le sessioni: la cache non vale più. */
export function dimenticaSessioni(): void {
  cache.clear()
}

/** Prova a rinnovare: è la misura di «la sessione è ancora viva?». */
export async function rinnovoRiesce(sessione: Sessione): Promise<boolean> {
  const risposta = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ refresh_token: sessione.refreshToken }),
  })
  return risposta.ok
}
