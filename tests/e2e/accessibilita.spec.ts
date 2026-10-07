// tests/e2e/accessibilita.spec.ts
//
// L'accessibilità automatica (spec 3a §7, §8.3) con axe, su ogni schermata del
// 3a: accesso, agenda a colonne e a lista, settimana, scheda aperta. Le regole
// sono quelle di WCAG 2.1 A e AA.
import AxeBuilder from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'
import { CLIENT_LUCIA, SERVICE_REFILL, STATO_DI, ANNALISA, VERA, apriAgenda, blocco, creaVisita, giornoDiProva, pulisci, scheda, uuid } from './aiuti'

test.beforeEach(pulisci)

/** Le violazioni, ridotte a regola e selettori: si leggono nel resoconto. */
async function violazioni(pagina: Page) {
  // A animazione in corso (l'entrata dell'accesso sale da opacità 0) axe misura
  // colori a metà dissolvenza: misurato, sei falsi reperti di contrasto a 0 ms e
  // nessuno a 2 s. Si aspetta che le animazioni finiscano.
  await pagina.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'))
  const r = await new AxeBuilder({ page: pagina }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return r.violations.map((v) => ({ regola: v.id, impatto: v.impact, dove: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) }))
}

test('axe: la schermata d’accesso', async ({ page }) => {
  await page.goto('/accesso')
  await page.getByRole('button', { name: 'Entra' }).waitFor()
  expect(await violazioni(page)).toEqual([])
})

test('la gemella: axe vede un difetto messo apposta, quindi le liste vuote qui sotto possono fallire', async ({ page }) => {
  await page.goto('/accesso')
  await page.getByRole('button', { name: 'Entra' }).waitFor()
  await page.evaluate(() => {
    const campo = document.createElement('input')
    campo.type = 'text'
    document.querySelector('main')!.append(campo)
  })
  expect((await violazioni(page)).map((v) => v.regola)).toContain('label')
})

test.describe('con l’accesso di Vera', () => {
  test.use({ storageState: STATO_DI.vera })

  /** Un giorno con due visite: blocchi di due colori, la colonna «tu», righe e pallini nella lista. */
  async function giornoPieno(): Promise<{ g: string; v: string }> {
    const g = giornoDiProva()
    const v = uuid('5a100000')
    await creaVisita(v, g, [{ id: uuid('6a300000'), operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 }])
    await creaVisita(uuid('5a200000'), g, [{ id: uuid('6a400000'), operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 168, durata: 18 }], CLIENT_LUCIA)
    return { g, v }
  }

  test('axe: l’agenda a colonne', async ({ page }) => {
    const { g } = await giornoPieno()
    await apriAgenda(page, g)
    expect(await violazioni(page)).toEqual([])
  })

  test('axe: l’agenda a lista', async ({ page }) => {
    const { g } = await giornoPieno()
    await apriAgenda(page, g)
    await page.getByRole('group', { name: 'Vista' }).getByRole('button', { name: 'Lista' }).click()
    await expect(page.getByRole('group', { name: 'Vista' }).getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(await violazioni(page)).toEqual([])
  })

  test('axe: la settimana di un’operatrice', async ({ page }) => {
    const { g } = await giornoPieno()
    await apriAgenda(page, g)
    await page.getByLabel('Settimana di').selectOption({ label: 'Vera' })
    await page.getByText('Settimana di Vera').waitFor()
    expect(await violazioni(page)).toEqual([])
  })

  test('axe: la scheda aperta', async ({ page }) => {
    const { g, v } = await giornoPieno()
    await apriAgenda(page, g)
    await blocco(page, v).click()
    await expect(scheda(page).getByRole('listitem')).toHaveCount(1)
    expect(await violazioni(page)).toEqual([])
  })
})
