// tests/e2e/controlla.spec.ts
//
// «Controlla» (spec 3a §4.4) con la rete vera del browser, costruita col
// routing di Playwright. Le Server Actions sono POST con l'intestazione
// `next-action`; «Controlla» è `POST /api/controlla`, fuori dalla fila.
//
// - riga 2: salvataggio ARRIVATO, risposta PERSA (`route.fetch()` e poi `abort`);
// - riga 4: lo stesso, e la visita cancellata da Annalisa prima di «Controlla»;
// - riga 1 con `annullato` (C1, dal lato che conta): invio TRATTENUTO nel browser
//   prima che parta, rilasciato dopo «Controlla». E la fila: «Controlla» risponde
//   mentre l'invio è ancora appeso.
import { expect, test } from '@playwright/test'
import {
  ALESSANDRA,
  SERVICE_MASSAGE,
  SERVICE_REFILL,
  STATO_DI,
  VERA,
  apriAgenda,
  blocco,
  cancellaVisita,
  creaVisita,
  eAzione,
  giornoDiProva,
  laVisitaDel,
  leggiVisita,
  perdiLaRispostaDellaProssimaAzione,
  pulisci,
  riscriviVisita,
  scheda,
  toccaSpazio,
  trattieniLaProssimaAzione,
  uuid,
  visiteDel,
} from './aiuti'

test.use({ storageState: STATO_DI.vera })
test.beforeEach(pulisci)

const NON_SO = 'Non so se è stata salvata'

/** Una visita nuova per Maria alle 10:00, compilata e pronta da salvare. */
async function compilaNuova(page: import('@playwright/test').Page, g: string) {
  await apriAgenda(page, g)
  await toccaSpazio(page, VERA, 120)
  const s = scheda(page)
  await s.getByLabel('Cerca la cliente per nome o telefono').fill('Maria')
  await s.getByRole('button', { name: /Maria Rossi/ }).click()
  await s.getByLabel('Aggiungi servizio').selectOption({ label: 'Refill gel' })
  return s
}

test('rete caduta a metà salvataggio, salvataggio ARRIVATO → «Non so», poi «Controlla» → «✓ Risulta salvata», e una sola visita', async ({ page }) => {
  const g = giornoDiProva()
  const s = await compilaNuova(page, g)
  const { arrivata } = await perdiLaRispostaDellaProssimaAzione(page)
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await arrivata
  await expect(s.getByRole('status').filter({ hasText: NON_SO })).toBeVisible()
  // Un solo pulsante acceso: «Salva» è spento.
  await expect(s.getByRole('button', { name: 'Salva', exact: true })).toBeDisabled()
  await page.unroute('**/*')

  await s.getByRole('button', { name: 'Controlla' }).click()
  await expect(page.getByText('✓ Risulta salvata')).toBeVisible()
  await expect(s).toHaveCount(0)
  expect(await visiteDel(g)).toBe(1)
  await expect(page.getByRole('group', { name: 'Appuntamenti del giorno' }).getByRole('button', { name: /^10:00–11:30, Maria Rossi/ })).toBeVisible()
})

test('salvataggio arrivato e poi cancellato da Annalisa → «Controlla» → «È stata cancellata dopo il salvataggio», e «Crea di nuovo»', async ({ page }) => {
  const g = giornoDiProva()
  const s = await compilaNuova(page, g)
  const { arrivata } = await perdiLaRispostaDellaProssimaAzione(page)
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await arrivata
  await expect(s.getByRole('status').filter({ hasText: NON_SO })).toBeVisible()
  await page.unroute('**/*')

  const v = await laVisitaDel(g)
  expect(await cancellaVisita(v)).toBe('cancellata')
  await s.getByRole('button', { name: 'Controlla' }).click()
  await expect(s.getByRole('status').filter({ hasText: 'È stata cancellata dopo il salvataggio' })).toBeVisible()
  // La cliente esiste ancora: «Crea di nuovo», con id nuovi.
  await s.getByRole('button', { name: 'Crea di nuovo' }).click()
  await expect(page.getByText('✓ Salvata')).toBeVisible()
  const nuova = await laVisitaDel(g)
  expect(nuova).not.toBe(v)
})

test('C1: salvataggio TRATTENUTO nel browser e rilasciato dopo «Controlla» → «Non risulta salvata», il tardivo non scrive, e il «Salva» dopo riceve «modificata altrove»', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('59000000')
  const av = uuid('6a000000')
  await creaVisita(v, g, [{ id: av, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
  await apriAgenda(page, g)
  await blocco(page, v).click()
  const s = scheda(page)
  // La bozza di Vera: 10:00 → 10:30.
  await s.getByLabel('Minuti d’inizio').selectOption('30')

  const trattenuta = await trattieniLaProssimaAzione(page)
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await trattenuta.trattenuta
  // D3-9: «Non so» a 10 s dal tocco.
  await expect(s.getByRole('status').filter({ hasText: NON_SO })).toBeVisible({ timeout: 15_000 })

  // La fila: «Controlla» passa da una rotta e risponde con l'invio ancora appeso.
  const risposta = page.waitForResponse((r) => r.url().endsWith('/api/controlla'))
  await s.getByRole('button', { name: 'Controlla' }).click()
  await risposta
  expect(trattenuta.partita()).toBe(false)
  await expect(s.getByRole('status').filter({ hasText: 'Non risulta salvata: l’invio non ha scritto nulla' })).toBeVisible()
  // La scheda tiene la bozza e le versioni DI PARTENZA (C1): niente stato riletto.
  await expect(s.getByRole('listitem')).toHaveCount(1)
  await expect(s.getByRole('listitem', { name: 'Refill gel alle 10:30' })).toBeVisible()

  // Il salvataggio tardivo parte ora, con versioni ANCORA GIUSTE: lo ferma solo il
  // codice bruciato da «Controlla». (Con la collega che scrive prima, lo fermerebbe
  // il controllo delle versioni, e la prova non vedrebbe un «Controlla» che brucia
  // il codice sbagliato: misurato dalla revisione, verde con `randomUUID()`.)
  const tardiva = page.waitForResponse((r) => eAzione(r.request()))
  trattenuta.rilascia()
  await tardiva
  let letta = (await leggiVisita(v))!
  expect(letta.appuntamenti).toHaveLength(1)
  expect(letta.appuntamenti[0].inizio).toBe(120)
  await page.unroute('**/*')

  // Poi la collega aggiunge un massaggio di Alessandra alla stessa visita.
  expect(
    await riscriviVisita(v, [
      { id: av, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 },
      { id: uuid('6b000000'), operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 168, durata: 10 },
    ]),
  ).toBe('salvata')

  // «Salva» riparte con le versioni di partenza: la collega ha cambiato la visita,
  // e il server lo dice invece di togliere in silenzio il suo massaggio.
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(s.getByRole('status').filter({ hasText: 'La scheda aggiornata' })).toBeVisible()
  await expect(s.getByRole('listitem')).toHaveCount(2)
  letta = (await leggiVisita(v))!
  expect(letta.appuntamenti).toHaveLength(2)
  expect(letta.appuntamenti.find((a) => a.id === av)!.inizio).toBe(120)

  // E in agenda il tardivo non compare: Vera resta alle 10:00.
  await apriAgenda(page, g)
  await expect(page.getByRole('group', { name: 'Appuntamenti del giorno' }).getByRole('button', { name: /^10:00–11:30, Maria Rossi/ })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Appuntamenti del giorno' }).getByRole('button', { name: /^10:30/ })).toHaveCount(0)
})
