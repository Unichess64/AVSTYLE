// tests/e2e/agenda.spec.ts
//
// Le prove 1, 3, 4, 5 e 7 di spec §13.4, con un telefono solo (Vera).
import { expect, test } from '@playwright/test'
import {
  CLIENT_MARIA,
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
  toccaSpazio,
  trascina,
  uuid,
  visiteDel,
} from './aiuti'

test.use({ storageState: STATO_DI.vera })
test.beforeEach(pulisci)

/** Nella scheda aperta: la cliente dalla ricerca e un servizio. */
async function clienteEServizio(s: ReturnType<typeof scheda>, cliente = 'Maria Rossi', servizio = 'Refill gel') {
  await s.getByLabel('Cerca la cliente per nome o telefono').fill(cliente.split(' ')[0])
  await s.getByRole('button', { name: new RegExp(cliente) }).click()
  await s.getByLabel('Aggiungi servizio').selectOption({ label: servizio })
}

test('§13.4 prova 1: si prenota dal calendario, e il blocco compare all’orario toccato', async ({ page }) => {
  const g = giornoDiProva()
  await apriAgenda(page, g)
  await toccaSpazio(page, VERA, 121) // 10:05 → il quarto d'ora inferiore, 10:00
  const s = scheda(page)
  await expect(s.getByRole('heading', { name: 'Nuova visita' })).toBeVisible()
  await clienteEServizio(s)
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(page.getByText('✓ Salvata')).toBeVisible()
  await expect(s).toBeHidden()
  await expect(
    page.getByRole('group', { name: 'Appuntamenti del giorno' }).getByRole('button', { name: /^10:00–11:30, Maria Rossi, Refill gel/ }),
  ).toBeVisible()
  expect(await visiteDel(g)).toBe(1)
})

test('§13.4 prova 3: si sposta un appuntamento trascinandolo, e una visita di due servizi tutta insieme', async ({ page }) => {
  const g = giornoDiProva()
  const uno = uuid('51000000')
  const due = uuid('52000000')
  const a1 = uuid('61000000')
  const a2 = uuid('62000000')
  const a3 = uuid('63000000')
  await creaVisita(uno, g, [{ id: a1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 108, durata: 18 }])
  // Due servizi contigui della stessa operatrice: un blocco solo, e il trascinamento muove la visita intera.
  await creaVisita(due, g, [
    { id: a2, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 168, durata: 12 },
    { id: a3, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 180, durata: 12 },
  ])
  await apriAgenda(page, g)

  await trascina(page, blocco(page, uno), 6) // +30 minuti
  await expect(page.getByText('✓ Spostata alle 09:30')).toBeVisible()
  await expect.poll(async () => (await leggiVisita(uno))!.appuntamenti[0].inizio).toBe(114)

  await trascina(page, blocco(page, due), 12) // +1 ora
  await expect(page.getByText('✓ Spostata alle 15:00')).toBeVisible()
  await expect
    .poll(async () => (await leggiVisita(due))!.appuntamenti.map((a) => a.inizio).sort((x, y) => x - y))
    .toEqual([180, 192])
})

test('§13.4 prova 4: si cancella un appuntamento, con la conferma', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('53000000')
  await creaVisita(v, g, [{ id: uuid('64000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
  await apriAgenda(page, g)
  await blocco(page, v).click()
  const s = scheda(page)
  await s.getByRole('button', { name: 'Elimina visita' }).click()
  const conferma = s.getByRole('alertdialog', { name: 'Conferma' })
  await expect(conferma).toContainText('Eliminare la visita? Non si può annullare.')
  // «Annulla» nella conferma non tocca niente.
  await conferma.getByRole('button', { name: 'Annulla' }).click()
  await expect(conferma).toBeHidden()
  expect(await leggiVisita(v)).not.toBeNull()
  await s.getByRole('button', { name: 'Elimina visita' }).click()
  await s.getByRole('alertdialog', { name: 'Conferma' }).getByRole('button', { name: 'Elimina', exact: true }).click()
  await expect(page.getByText('✓ Cancellata')).toBeVisible()
  await expect(blocco(page, v)).toHaveCount(0)
  expect(await leggiVisita(v)).toBeNull()
})

test('§13.4 prova 5: la doppia prenotazione si rifiuta con la frase giusta', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('54000000')
  await creaVisita(v, g, [{ id: uuid('65000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
  await apriAgenda(page, g)
  await toccaSpazio(page, VERA, 168) // 14:00, libero
  const s = scheda(page)
  // Un'altra cliente: con Maria comparirebbe anche «già prenotata», e «Salva comunque».
  await clienteEServizio(s, 'Lucia Ciccarè')
  await s.getByLabel('Ora d’inizio').selectOption('10')
  await s.getByLabel('Minuti d’inizio').selectOption('30')
  const frase = s.getByRole('alert')
  await expect(frase).toContainText('Vera ha un appuntamento alle 10:00 con Maria Rossi')
  await expect(frase.getByRole('button', { name: 'Vai lì' })).toBeVisible()
  // Il rifiuto vale anche dal server: «Salva» resta acceso, e non scrive una seconda visita.
  const risposta = page.waitForResponse((r) => r.request().headers()['next-action'] !== undefined)
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await risposta
  await expect(frase).toContainText('Vera ha un appuntamento alle 10:00 con Maria Rossi')
  await expect(s).toBeVisible()
  expect(await visiteDel(g)).toBe(1)
})

test('§13.4 prova 5: spostare un appuntamento dentro la propria durata NON è un conflitto con sé stesso', async ({ page }) => {
  const g = giornoDiProva()
  const v = uuid('55000000')
  await creaVisita(v, g, [{ id: uuid('66000000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
  await apriAgenda(page, g)

  // Dalla scheda: 10:00 → 10:15, dentro le 10:00-11:30 che occupa già.
  await blocco(page, v).click()
  const s = scheda(page)
  await s.getByLabel('Minuti d’inizio').selectOption('15')
  await expect(s.getByRole('alert')).toHaveCount(0)
  await s.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(page.getByText('✓ Salvata')).toBeVisible()
  await expect.poll(async () => (await leggiVisita(v))!.appuntamenti[0].inizio).toBe(123)
  await expect(blocco(page, v)).toHaveAccessibleName(/^10:15–11:45/)
  await page.waitForLoadState('networkidle')

  // E trascinando: 10:15 → 10:30, ancora dentro la propria durata.
  await trascina(page, blocco(page, v), 3)
  await expect(page.getByText('✓ Spostata alle 10:30')).toBeVisible()
  await expect.poll(async () => (await leggiVisita(v))!.appuntamenti[0].inizio).toBe(126)
})

test('§13.4 prova 7: si prenota fuori disponibilità toccando una cella attenuata, e si vede l’avviso col motivo', async ({ page }) => {
  const g = giornoDiProva()
  await apriAgenda(page, g)
  await toccaSpazio(page, VERA, 162) // 13:30, nella pausa fra i due turni
  const s = scheda(page)
  await clienteEServizio(s)
  await expect(s.getByRole('status').filter({ hasText: 'Refill gel alle 13:30 è fuori dall’orario di Vera' })).toBeVisible()
  await s.getByRole('button', { name: 'Salva comunque' }).click()
  await expect(page.getByText('✓ Salvata')).toBeVisible()
  expect(await visiteDel(g)).toBe(1)
  // E il blocco porta il segno «fuori orario».
  await expect(page.getByRole('button', { name: /^13:30–15:00, Maria Rossi, Refill gel, fuori orario/ })).toBeVisible()
  void CLIENT_MARIA
})
