// tests/e2e/diretta.spec.ts
//
// Due telefoni (spec 3a §8.3): Annalisa scrive dal suo, Vera guarda dal suo.
// Due `BrowserContext`, ciascuno col suo accesso. E le prove che chiudono il
// collegamento della chiusura immediata (Task 3) e di D3-19.
//
// ⚠︎ «Entro 3 s» deve vedere la DIRETTA, non il ripiego dei 60 s: la prova
// controlla che la pagina di Vera non si sia ricaricata e che il blocco arrivi
// ben prima del primo battito del ripiego.
import { type Page, expect, test } from '@playwright/test'
import {
  ALESSANDRA,
  ANNALISA,
  CLIENT_MARIA,
  SERVICE_MASSAGE,
  SERVICE_REFILL,
  STATO_DI,
  VERA,
  apriAgenda,
  blocco,
  creaVisita,
  giornoDiProva,
  leggiVisita,
  pulisci,
  scheda,
  telefono,
  toccaSpazio,
  uuid,
  visiteDel,
} from './aiuti'
import { asOwner } from '../helpers/db'
import { PASSWORD_PROVA } from '../helpers/sessioni'
import { sommaGiorni } from '../../src/dominio/tempo'

test.beforeEach(pulisci)

/**
 * Si risolve quando il canale della diretta di questa pagina è iscritto agli
 * annunci: la risposta di Realtime alla `phx_join` con `postgres_changes`.
 * Va chiamata PRIMA di aprire la pagina.
 */
function iscritta(pagina: Page): Promise<void> {
  return new Promise((risolvi, rifiuta) => {
    setTimeout(() => rifiuta(new Error('la diretta non si è iscritta agli annunci entro 10 s')), 10_000)
    pagina.on('websocket', (ws) => {
      ws.on('framereceived', (f) => {
        const testo = typeof f.payload === 'string' ? f.payload : f.payload.toString()
        if (testo.includes('phx_reply') && testo.includes('"postgres_changes":[{') && testo.includes('"status":"ok"')) risolvi()
      })
    })
  })
}

/** Quante volte la pagina si è caricata da capo: la diretta rilegge senza ricaricare. */
function contaCaricamenti(pagina: Page): () => number {
  let n = 0
  pagina.on('load', () => (n += 1))
  return () => n
}

test('due telefoni: Annalisa prenota → il blocco compare da Vera entro 3 s, per la diretta', async ({ browser }) => {
  const uso = test.info().project.use
  const g = giornoDiProva()
  const vera = await telefono(browser, 'vera', uso)
  const annalisa = await telefono(browser, 'annalisa', uso)
  const pronta = iscritta(vera.pagina)
  const caricamenti = contaCaricamenti(vera.pagina)
  await apriAgenda(vera.pagina, g)
  const aperta = Date.now()
  await pronta
  await apriAgenda(annalisa.pagina, g)

  await toccaSpazio(annalisa.pagina, ANNALISA, 120)
  const s = scheda(annalisa.pagina)
  await s.getByLabel('Cerca la cliente per nome o telefono').fill('Maria')
  await s.getByRole('button', { name: /Maria Rossi/ }).click()
  await s.getByLabel('Aggiungi servizio').selectOption({ label: 'Refill gel' })
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(annalisa.pagina.getByText('✓ Salvata')).toBeVisible()

  await expect(
    vera.pagina.getByRole('group', { name: 'Appuntamenti del giorno' }).getByRole('button', { name: /^10:00–11:30, Maria Rossi/ }),
  ).toBeVisible({ timeout: 3000 })
  // La diretta, non il ripiego: nessun ricaricamento, e ben prima dei 60 s.
  expect(caricamenti()).toBe(1)
  expect(Date.now() - aperta).toBeLessThan(50_000)
  await vera.contesto.close()
  await annalisa.contesto.close()
})

test('due telefoni: Annalisa sposta la visita a domani → sparisce da oggi sul telefono di Vera', async ({ browser }) => {
  const uso = test.info().project.use
  const g = giornoDiProva()
  const domani = sommaGiorni(g, 1)
  const v = uuid('56000000')
  await creaVisita(v, g, [{ id: uuid('67000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
  const vera = await telefono(browser, 'vera', uso)
  const annalisa = await telefono(browser, 'annalisa', uso)
  const pronta = iscritta(vera.pagina)
  await apriAgenda(vera.pagina, g)
  await pronta
  await expect(blocco(vera.pagina, v)).toBeVisible()

  await apriAgenda(annalisa.pagina, g)
  await blocco(annalisa.pagina, v).click()
  const s = scheda(annalisa.pagina)
  await s.getByLabel('Data').fill(domani)
  await expect(s.getByRole('listitem', { name: 'Refill gel alle 10:00' })).toBeVisible()
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(annalisa.pagina.getByText('✓ Salvata')).toBeVisible()

  await expect(blocco(vera.pagina, v)).toHaveCount(0, { timeout: 3000 })
  expect((await leggiVisita(v))!.data).toBe(domani)
  await vera.contesto.close()
  await annalisa.contesto.close()
})

test('due telefoni: Annalisa aggiunge un servizio mentre Vera ha la scheda aperta → «modificata altrove», e la scheda si aggiorna', async ({ browser }) => {
  const uso = test.info().project.use
  const g = giornoDiProva()
  const v = uuid('57000000')
  await creaVisita(v, g, [{ id: uuid('68000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
  const vera = await telefono(browser, 'vera', uso)
  const annalisa = await telefono(browser, 'annalisa', uso)
  await apriAgenda(vera.pagina, g)
  await blocco(vera.pagina, v).click()
  const sv = scheda(vera.pagina)
  await expect(sv.getByRole('listitem')).toHaveCount(1)

  await apriAgenda(annalisa.pagina, g)
  await blocco(annalisa.pagina, v).click()
  const sa = scheda(annalisa.pagina)
  await sa.getByLabel('Aggiungi servizio').selectOption({ label: 'Refill gel' })
  await sa.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(annalisa.pagina.getByText('✓ Salvata')).toBeVisible()

  // Vera cambia l'orario sulla scheda vecchia e salva. Alle 9:00, dove non tocca il
  // servizio aggiunto (11:30): altrimenti il controllo preventivo risponde «conflitto»
  // prima ancora che la funzione guardi le versioni.
  await sv.getByLabel('Ora d’inizio').selectOption('9')
  await sv.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(sv.getByRole('status').filter({ hasText: 'La scheda aggiornata' })).toBeVisible()
  // La scheda ora è la visita com'è: due servizi, alle 10:00. La modifica di Vera non è passata.
  await expect(sv.getByRole('listitem')).toHaveCount(2)
  await expect(sv.getByRole('listitem', { name: 'Refill gel alle 10:00' })).toBeVisible()
  const letta = (await leggiVisita(v))!
  expect(letta.appuntamenti).toHaveLength(2)
  expect(letta.appuntamenti.map((a) => a.inizio).sort((x, y) => x - y)).toEqual([120, 138])
  await vera.contesto.close()
  await annalisa.contesto.close()
})

test('operatrice disattivata scrivendo sul database da proprietario → uscita forzata al primo tocco', async ({ page }) => {
  const g = giornoDiProva()
  await page.goto('/accesso')
  await page.getByLabel('Email').fill('alessandra@example.test')
  await page.getByLabel('Password').fill(PASSWORD_PROVA)
  await page.getByRole('button', { name: 'Entra' }).click()
  await page.waitForURL('**/agenda')
  await apriAgenda(page, g)
  // Compagna positiva: attiva, il tocco apre la scheda.
  await toccaSpazio(page, ALESSANDRA, 120)
  await expect(scheda(page).getByRole('heading', { name: 'Nuova visita' })).toBeVisible()
  // La chiusura rilegge il giorno (Task 11, m1): a disattivazione già scritta,
  // sarebbe QUELLA rilettura a far uscire, non il tocco. Si aspetta che arrivi.
  const riletto = page.waitForResponse((r) => r.url().includes('_rsc='))
  await scheda(page).getByRole('button', { name: 'Chiudi' }).click()
  await expect(scheda(page)).toHaveCount(0)
  // Le intestazioni non bastano: la pagina arriva in streaming e il controllo
  // dell'identità può girare dopo (misurato: rinvio all'accesso a corpo aperto),
  // e `finished()` su una risposta RSC non si risolve. Un secondo di margine.
  await riletto
  await page.waitForTimeout(1000)
  await page.waitForLoadState('networkidle')

  await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA]))
  // Nessuna navigazione dalla prova: è l'app che esce, alla risposta 401 di `/api/scheda`.
  const scheda401 = page.waitForResponse((r) => r.url().endsWith('/api/scheda') && r.status() === 401)
  await toccaSpazio(page, ALESSANDRA, 132)
  await scheda401
  await page.waitForURL('**/accesso')
  // E rientrare non si può, con la frase decisa il 05/10.
  await page.getByLabel('Email').fill('alessandra@example.test')
  await page.getByLabel('Password').fill(PASSWORD_PROVA)
  await page.getByRole('button', { name: 'Entra' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Questo' })).toHaveText('Questo account non è attivo. Chiedi a chi gestisce il salone.')
})

test.describe('con la scheda di Vera', () => {
  test.use({ storageState: STATO_DI.vera })

  test('D3-19: un avviso nato al salvataggio ferma la scheda, e «Salva comunque» lo conferma', async ({ page }) => {
    const g = giornoDiProva()
    await apriAgenda(page, g)
    await toccaSpazio(page, VERA, 168)
    const s = scheda(page)
    await s.getByLabel('Cerca la cliente per nome o telefono').fill('Maria')
    await s.getByRole('button', { name: /Maria Rossi/ }).click()
    await s.getByLabel('Aggiungi servizio').selectOption({ label: 'Refill gel' })
    // Nessun avviso mentre si compila: Maria quel giorno non ha altro.
    await expect(s.getByRole('button', { name: 'Salva', exact: true })).toBeVisible()

    // La collega prenota Maria lo stesso giorno, dopo che la scheda ha letto il giorno.
    await creaVisita(uuid('58000000'), g, [{ id: uuid('69000000'), operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 120, durata: 10 }])
    await s.getByRole('button', { name: 'Salva', exact: true }).click()
    await expect(s.getByRole('status').filter({ hasText: 'Maria Rossi è già prenotata alle 10:00 con Alessandra' })).toBeVisible()
    await expect(s.getByRole('button', { name: 'Salva comunque' })).toBeVisible()
    expect(await visiteDel(g)).toBe(1)

    await s.getByRole('button', { name: 'Salva comunque' }).click()
    await expect(page.getByText('✓ Salvata')).toBeVisible()
    expect(await visiteDel(g)).toBe(2)
    void CLIENT_MARIA
  })
})
