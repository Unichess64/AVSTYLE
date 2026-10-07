// tests/e2e/tempo.spec.ts
//
// Il tempo e il fuso (spec 3a §7, §4.6), con il browser a New York.
//
// ⚠︎ La linea dell'ora e «oggi» li calcola il SERVER (`page.tsx`, `new Date()`
// di Node): `timezoneId` e `page.clock` spostano solo il browser, e una prova
// «orologio al 25 ottobre alle 10:00» fatta così controllerebbe il browser, non
// la linea. Quella resta alle prove pure di `tests/dominio/perugia.test.ts`, che
// coprono i due giorni del cambio d'ora. Qui si prova ciò che il browser decide
// davvero: le date che la scheda scrive, e il giorno nuovo della diretta
// (`cambioDiGiorno`), che legge l'orologio del telefono.
//
// Nessun orologio finto raggiungibile in produzione: niente parametri
// nell'indirizzo, niente variabili lette dal server.
import { type Page, expect, test } from '@playwright/test'
import { msAllaMezzanotte } from '../../src/dominio/ricariche'
import { sommaGiorni } from '../../src/dominio/tempo'
import { STATO_DI, VERA, agenda, apriAgenda, giornoDiProva, leggiVisita, laVisitaDel, oggi, pulisci, scheda, toccaSpazio } from './aiuti'

test.use({ storageState: STATO_DI.vera, timezoneId: 'America/New_York' })
test.beforeEach(pulisci)

/**
 * Porta l'orologio del BROWSER a `quando`, senza fermare i timer: la diretta
 * deve continuare a battere (misurato qui sotto, a ogni prova).
 */
async function orologioDelTelefono(pagina: Page, quando: number): Promise<void> {
  await pagina.clock.setSystemTime(quando)
  // I timer girano ancora: un `setTimeout` di 200 ms scatta in tempo vero.
  const scattato = await pagina.evaluate(
    () => new Promise<boolean>((r) => {
      setTimeout(() => r(true), 200)
      setTimeout(() => r(false), 3000)
    }),
  )
  expect(scattato).toBe(true)
  expect(await pagina.evaluate(() => Date.now())).toBeGreaterThanOrEqual(quando)
}

/** Il ritorno in primo piano: `visibilitychange` con la pagina visibile. */
async function tornaInPrimoPiano(pagina: Page): Promise<void> {
  await pagina.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

test('app ripresa il giorno dopo → «oggi» nuovo: a Perugia è già domani, a New York ancora oggi', async ({ page }) => {
  const o = oggi()
  const domani = sommaGiorni(o, 1)
  await apriAgenda(page, o)
  // Le 00:30 di domani a Perugia: a New York sono le 18:30 di oggi.
  const adesso = Date.now()
  await orologioDelTelefono(page, adesso + msAllaMezzanotte(new Date(adesso)) + 30 * 60_000)
  expect(await page.evaluate(() => new Date().getDate())).toBe(Number(o.slice(8)))
  await tornaInPrimoPiano(page)
  await page.waitForURL(`**${agenda(domani)}`)
  await expect(page.getByRole('link', { name: 'Oggi' })).toHaveAttribute('href', agenda(o))
})

test('la gemella: alle 23:30 di Perugia è ancora oggi, e il ritorno in primo piano rilegge senza cambiare giorno', async ({ page }) => {
  const o = oggi()
  await apriAgenda(page, o)
  const adesso = Date.now()
  await orologioDelTelefono(page, adesso + msAllaMezzanotte(new Date(adesso)) - 30 * 60_000)
  const riletto = page.waitForResponse((r) => r.url().includes('_rsc='))
  await tornaInPrimoPiano(page)
  await riletto
  await page.waitForLoadState('networkidle')
  expect(new URL(page.url()).search).toBe(`?giorno=${o}`)
})

test('a New York la scheda scrive la data e l’ora di Perugia che si vedono, senza scivolare di un giorno', async ({ page }) => {
  const g = giornoDiProva()
  await apriAgenda(page, g)
  // Dalla striscia: il giorno dopo, toccato a New York, è quello dell'indirizzo.
  await page.getByRole('navigation', { name: 'Giorni' }).locator(`a[href="${agenda(sommaGiorni(g, 1))}"]`).click()
  await page.waitForURL(`**${agenda(sommaGiorni(g, 1))}`)
  await apriAgenda(page, g)
  await toccaSpazio(page, VERA, 120)
  const s = scheda(page)
  await expect(s.getByLabel('Data')).toHaveValue(g)
  await s.getByLabel('Cerca la cliente per nome o telefono').fill('Maria')
  await s.getByRole('button', { name: /Maria Rossi/ }).click()
  await s.getByLabel('Aggiungi servizio').selectOption({ label: 'Refill gel' })
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(page.getByText('✓ Salvata')).toBeVisible()
  const letta = (await leggiVisita(await laVisitaDel(g)))!
  expect(letta.data).toBe(g)
  expect(letta.appuntamenti[0].inizio).toBe(120)
  await expect(page.getByRole('group', { name: 'Appuntamenti del giorno' }).getByRole('button', { name: /^10:00–11:30, Maria Rossi/ })).toBeVisible()
})
