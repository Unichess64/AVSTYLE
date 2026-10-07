// tests/e2e/trascinamento.spec.ts
//
// Il trascinamento (spec 3a §5.1, Task 10) con eventi di puntatore veri:
// pressione di 0,4 s, movimento verticale, rilascio. Una cella sono 7 px.
import { expect, test } from '@playwright/test'
import {
  ANNALISA,
  CLIENT_LUCIA,
  SERVICE_REFILL,
  STATO_DI,
  VERA,
  apriAgenda,
  blocco,
  creaVisita,
  eAzione,
  giornoDiProva,
  leggiVisita,
  pulisci,
  scheda,
  trascina,
  trattieniLaProssimaAzione,
  uuid,
} from './aiuti'

test.use({ storageState: STATO_DI.vera })
test.beforeEach(pulisci)

const inizio = async (v: string) => (await leggiVisita(v))!.appuntamenti[0].inizio

test('trascinamento: «✓ Spostata · Annulla», e «Annulla» la riporta dov’era', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('5a000000')
  await creaVisita(v, g, [{ id: uuid('6c000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 108, durata: 18 }])
  await apriAgenda(page, g)
  await trascina(page, blocco(page, v), 6)
  const esito = page.getByRole('status').filter({ hasText: '✓ Spostata alle 09:30' })
  await expect(esito).toBeVisible()
  await expect.poll(() => inizio(v)).toBe(114)
  await esito.getByRole('button', { name: 'Annulla' }).click()
  await expect(page.getByText('✓ Riportata alle 09:00')).toBeVisible()
  await expect.poll(() => inizio(v)).toBe(108)
  await expect(blocco(page, v)).toHaveAccessibleName(/^09:00–10:30/)
})

test('trascinamento: un rilascio sopra un altro appuntamento apre la scheda con la frase del conflitto', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('5b000000')
  await creaVisita(v, g, [{ id: uuid('6d000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 108, durata: 18 }])
  await creaVisita(uuid('5c000000'), g, [{ id: uuid('6e000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 132, durata: 18 }], CLIENT_LUCIA)
  await apriAgenda(page, g)
  await trascina(page, blocco(page, v), 12) // 10:00-11:30, sopra Lucia alle 11:00
  const s = scheda(page)
  await expect(s).toBeVisible()
  await expect(s.getByRole('alert')).toContainText('Vera ha un appuntamento alle 11:00 con Lucia Ciccarè')
  // Niente è stato scritto: la scheda è sulla posizione del gesto, da decidere.
  expect(await inizio(v)).toBe(108)
  await expect(s.getByRole('listitem', { name: 'Refill gel alle 10:00' })).toBeVisible()
})

test('trascinamento: un rilascio senza risposta → «?» a 10 s, «Controlla» da solo e il messaggio definitivo; il tardivo non scrive', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('5d000000')
  await creaVisita(v, g, [{ id: uuid('6f000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 108, durata: 18 }])
  await apriAgenda(page, g)
  // Le etichette che il blocco porta: il «?» dura quanto la risposta di «Controlla», pochi millisecondi.
  await page.evaluate(() => {
    const viste: string[] = []
    ;(window as unknown as { etichette: string[] }).etichette = viste
    new MutationObserver((m) => {
      for (const x of m) {
        const v = (x.target as HTMLElement).dataset.etichetta
        if (v !== undefined && viste.at(-1) !== v) viste.push(v)
      }
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-etichetta'] })
  })
  const trattenuta = await trattieniLaProssimaAzione(page)
  const controlla = page.waitForResponse((r) => r.url().endsWith('/api/controlla'), { timeout: 25_000 })
  await trascina(page, blocco(page, v), 6)
  const rilascio = Date.now()
  await trattenuta.trattenuta
  await expect(blocco(page, v)).toHaveAttribute('data-etichetta', 'Salvo…')
  // A 10 s dal rilascio il «?», e subito «Controlla» da solo, fuori dalla fila.
  await controlla
  expect(Date.now() - rilascio).toBeGreaterThan(9_500)
  expect(trattenuta.partita()).toBe(false)
  expect(await page.evaluate(() => (window as unknown as { etichette: string[] }).etichette)).toEqual(['Salvo…', '?'])
  await expect(page.getByText('Lo spostamento non è stato salvato')).toBeVisible()
  // Il blocco va alla posizione LETTA: le 9:00.
  await expect(blocco(page, v)).not.toHaveAttribute('data-etichetta')
  await expect(blocco(page, v)).toHaveAccessibleName(/^09:00–10:30/)

  const tardiva = page.waitForResponse((r) => eAzione(r.request()))
  trattenuta.rilascia()
  await tardiva
  expect(await inizio(v)).toBe(108)
})

test('la fila: con il primo invio trattenuto, il secondo mostra «In attesa del salvataggio precedente», e poi passano tutti e due', async ({ page }) => {
  const g = giornoDiProva()
  const uno = uuid('5e000000')
  const due = uuid('5f000000')
  await creaVisita(uno, g, [{ id: uuid('6a100000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 108, durata: 18 }])
  await creaVisita(due, g, [{ id: uuid('6a200000'), operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 108, durata: 18 }], CLIENT_LUCIA)
  await apriAgenda(page, g)
  const trattenuta = await trattieniLaProssimaAzione(page)
  await trascina(page, blocco(page, uno), 6)
  await trattenuta.trattenuta
  await trascina(page, blocco(page, due), 6)
  await expect(blocco(page, due)).toHaveAttribute('data-etichetta', 'In attesa…')
  await expect(page.getByRole('status').filter({ hasText: 'In attesa del salvataggio precedente' })).toBeVisible()
  // Il secondo non è partito: la fila di React lo tiene dietro il primo.
  expect(await inizio(due)).toBe(108)

  trattenuta.rilascia()
  await expect.poll(() => inizio(uno)).toBe(114)
  await expect.poll(() => inizio(due)).toBe(114)
  await expect(blocco(page, due)).not.toHaveAttribute('data-etichetta')
})
