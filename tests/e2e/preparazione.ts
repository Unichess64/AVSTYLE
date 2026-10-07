// tests/e2e/preparazione.ts
//
// Una volta prima di tutte le prove: lo stato pulito, il riscaldamento di
// Realtime e gli accessi. Il server (`next start`) è già acceso: Playwright
// avvia `webServer` prima della preparazione globale.
import { mkdirSync } from 'node:fs'
import { REALTIME_SUBSCRIBE_STATES, createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { VERA_AUTH } from '../helpers/db'
import { PASSWORD_PROVA, sessioneDi } from '../helpers/sessioni'
import { STATO_DI, pulisci } from './aiuti'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/**
 * Il primo canale su `annuncio` dopo un `db reset` non consegna, anche dopo
 * `SUBSCRIBED` (misurato il 28/09). Si apre e si chiude un canale, come il
 * `beforeAll` di `tests/schema/annunci.test.ts`. Dentro un `try`: è un
 * TENTATIVO, non una precondizione, e una preparazione che lancia salterebbe
 * ogni prova invece di farne arrossire qualcuna.
 */
async function riscaldaRealtime(): Promise<void> {
  try {
    const sessione = await sessioneDi(VERA_AUTH)
    const client = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${sessione.accessToken}` } } })
    await client.realtime.setAuth(sessione.accessToken)
    const canale = client.channel('riscaldamento').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annuncio' }, () => {})
    await new Promise<void>((risolvi) => {
      const via = setTimeout(risolvi, 5000)
      canale.subscribe((s) => {
        if (s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          clearTimeout(via)
          risolvi()
        }
      })
    })
    await client.removeAllChannels()
  } catch (e) {
    console.warn('riscaldamento di Realtime non riuscito:', e)
  }
}

/** L'accesso dalla schermata vera, una volta per account: il GoTrue locale limita gli accessi. */
async function accedi(email: string, file: string): Promise<void> {
  const browser = await chromium.launch()
  try {
    const pagina = await browser.newPage({ baseURL: 'http://localhost:3000' })
    await pagina.goto('/accesso')
    await pagina.getByLabel('Email').fill(email)
    await pagina.getByLabel('Password').fill(PASSWORD_PROVA)
    await pagina.getByRole('button', { name: 'Entra' }).click()
    await pagina.waitForURL('**/agenda')
    await pagina.context().storageState({ path: file })
  } finally {
    await browser.close()
  }
}

export default async function preparazione(): Promise<void> {
  mkdirSync('tests/e2e/.auth', { recursive: true })
  await pulisci()
  await riscaldaRealtime()
  await accedi('vera@example.test', STATO_DI.vera)
  await accedi('annalisa@example.test', STATO_DI.annalisa)
}
