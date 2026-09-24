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
import { asOwner } from './db'

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

const cache = new Map<string, Sessione>()

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

/** La sessione dell'account, creata una volta sola e riusata. */
export async function sessioneDi(authUid: string): Promise<Sessione> {
  const gia = cache.get(authUid)
  if (gia) return gia
  const email = EMAIL_DI[authUid]
  if (!email) throw new Error(`nessuna email nota per ${authUid}`)
  const nuova = await accedi(email)
  cache.set(authUid, nuova)
  return nuova
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
