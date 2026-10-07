// @vitest-environment jsdom
//
// tests/dominio/trascina.test.tsx
//
// Il trascinamento come componente, sopra le colonne VERE del giorno (spec 3a
// §5.1, D3-15; piano 3a-2 Task 10): la pressione lunga, solo in verticale, lo
// scorrimento sospeso, il `click` che dopo un gesto non apre la scheda, il
// codice d'invio al tocco, «Salvo…», il ✓ con «Annulla» e le versioni
// adottate, «Controlla» automatico con al massimo tre ritentativi, la
// generazione per blocco e la fila con i 10 s contati dal tocco.
//
// Niente Supabase né Next: Server Actions, «Controlla» e router sono finti, e
// l'orologio è quello finto di Vitest. Gli eventi sono `PointerEvent` veri di
// jsdom. La posizione del blocco si legge dove il componente la scrive: il
// CSSOM (`style.gridRowStart`), riga = cella − 96 + 1.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
import { AgendaColonne } from '../../src/cliente/agenda-colonne'
import { ApriScheda } from '../../src/cliente/apri-scheda'
import type { RichiesteScheda } from '../../src/cliente/richieste-scheda'
import { type AzioniTrascina, Trascina } from '../../src/cliente/trascina'
import type { RispostaDellaRotta } from '../../src/dominio/controlla'
import { messaggioPerEsito } from '../../src/dominio/esiti'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import type { AppuntamentoDelGesto } from '../../src/dominio/trascinamento'
import type { Giorno } from '../../src/server/lettura-giorno'
import type { RichiestaSpostamento, Risposta } from '../../src/server/scrittura-visita'

const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const MARIA = '40000000-0000-4000-8000-000000000d01'
const LUCIA = '40000000-0000-4000-8000-000000000d02'
const V = '50000000-0000-4000-8000-000000000d01'
const W = '50000000-0000-4000-8000-000000000d02'
const A1 = '60000000-0000-4000-8000-000000000d01'
const A2 = '60000000-0000-4000-8000-000000000d02'
const B1 = '60000000-0000-4000-8000-000000000d11'
const DATA = '2026-10-08'
const DA = 96

/** V: due servizi di Vera, contigui con la pausa (un blocco intero, 10:00–11:25). W: un massaggio di Alessandra alle 12:30. */
function giorno(inizioV = 120, inizioW = 150): Giorno {
  return {
    data: DATA,
    operatrici: [
      { id: VERA, nome: 'Vera', colore: '#C2185B', attiva: true, sonoIo: true },
      { id: ALESSANDRA, nome: 'Alessandra', colore: '#9B1B1B', attiva: true, sonoIo: false },
    ],
    finestra: { da: DA, a: 240 },
    appuntamenti: [
      { id: A1, visitaId: V, operatriceId: VERA, servizioId: REFILL, servizioNome: 'Refill gel', clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: inizioV, durata: 18, pausa: 3 },
      { id: A2, visitaId: V, operatriceId: VERA, servizioId: REFILL, servizioNome: 'Refill gel', clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: inizioV + 21, durata: 10, pausa: 0 },
      { id: B1, visitaId: W, operatriceId: ALESSANDRA, servizioId: MASSAGGIO, servizioNome: 'Massaggio', clienteId: LUCIA, clienteNome: 'Lucia Ciccarè', inizio: inizioW, durata: 12, pausa: 3 },
    ],
    risolti: new Map(),
    chiusure: [],
  }
}

const delGesto = (g: Giorno): AppuntamentoDelGesto[] =>
  g.appuntamenti.map(({ id, visitaId, clienteId, operatriceId, servizioId, inizio, durata, pausa }) => ({ id, visitaId, clienteId, operatriceId, servizioId, inizio, durata, pausa }))

const mai = () => new Promise<never>(() => {})

function differita<T>() {
  let risolvi!: (x: T) => void
  const promessa = new Promise<T>((r) => {
    risolvi = r
  })
  return { promessa, risolvi }
}

const salvata = (visita: string, ids: string[]): Risposta => ({
  tipo: 'esito', esito: 'salvata', messaggio: messaggioPerEsito('salvata', false), visita, appuntamenti: ids.map((id) => ({ id, versione: `${visita}-${id}` })),
})

function stato(inizio: number): StatoVisita {
  return {
    visita: 'vv-letta',
    data: DATA,
    cliente: MARIA,
    appuntamenti: [
      { id: A1, versione: 'l1', operatrice: VERA, servizio: REFILL, inizio, durata: 18 },
      { id: A2, versione: 'l2', operatrice: VERA, servizio: REFILL, inizio: inizio + 21, durata: 10 },
    ],
  }
}

interface Montata {
  apri: ReturnType<typeof vi.fn>
  sopra: { pointerUp: ReturnType<typeof vi.fn>; click: ReturnType<typeof vi.fn> }
  /** Il giorno riletto dal server arriva: nuovi dati, magari con le visite altrove. */
  rilettura: (inizioV?: number, inizioW?: number) => void
}

function monta(azioni: Partial<AzioniTrascina> = {}, controlla: RichiesteScheda['controlla'] = vi.fn(mai)): Montata & { azioni: AzioniTrascina } {
  const tutte: AzioniTrascina = { sposta: vi.fn(mai), annulla: vi.fn(mai), ...azioni }
  const apri = vi.fn()
  const sopra = { pointerUp: vi.fn(), click: vi.fn() }
  const albero = (g: Giorno) => (
    <ApriScheda.Provider value={apri}>
      <div onPointerUp={sopra.pointerUp} onClick={sopra.click}>
        <Trascina data={DATA} appuntamenti={delGesto(g)} finestra={g.finestra} azioni={tutte} io={VERA} richieste={{ controlla }} adesso={() => Date.now()}>
          <AgendaColonne giorno={g} oggi={DATA} lineaDellOra={null} />
        </Trascina>
      </div>
    </ApriScheda.Provider>
  )
  const { rerender } = render(albero(giorno()))
  return { apri, sopra, azioni: tutte, rilettura: (v = 120, w = 150) => rerender(albero(giorno(v, w))) }
}

const bloccoV = () => document.querySelector<HTMLElement>(`[data-appuntamenti="${A1} ${A2}"]`)!
const bloccoW = () => document.querySelector<HTMLElement>(`[data-appuntamenti="${B1}"]`)!
const riga = (el: HTMLElement) => el.style.gridRowStart
const rigaDi = (cella: number) => String(cella - DA + 1)

/** L'orologio finto avanza, e React vede ciò che ne segue. */
const avanza = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms)
})
const assesta = () => act(async () => {
  await vi.advanceTimersByTimeAsync(0)
})

let id = 1
const giu = (el: HTMLElement, y = 300, x = 50) => fireEvent.pointerDown(el, { pointerId: id, button: 0, clientX: x, clientY: y })
const muovi = (el: HTMLElement, y: number, x = 50) => fireEvent.pointerMove(el, { pointerId: id, clientX: x, clientY: y })
const su = (el: HTMLElement, y: number, x = 50) => fireEvent.pointerUp(el, { pointerId: id, clientX: x, clientY: y })

/** Un tocco breve vero: giù, su, click. */
function tocca(el: HTMLElement) {
  id += 1
  giu(el)
  su(el, 300)
  fireEvent.click(el)
}

/** Pressione lunga, trascinamento di `dy` punti, rilascio. */
async function trascina(el: HTMLElement, dy: number, dx = 0) {
  id += 1
  giu(el)
  await avanza(400)
  muovi(el, 300 + dy, 50 + dx)
  su(el, 300 + dy, 50 + dx)
  await assesta()
}

const invii = () => JSON.parse(window.localStorage.getItem('avstyle.invii') ?? '[]') as Record<string, unknown>[]

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  router.refresh.mockReset()
})

describe('il gesto (D3-15)', () => {
  it('una pressione lunga di 0,4 s arma il gesto', async () => {
    monta()
    giu(bloccoV())
    await avanza(399)
    expect(bloccoV().dataset.trascinato).toBeUndefined()
    await avanza(1)
    expect(bloccoV().dataset.trascinato).toBe('')
  })

  it('un dito che si muove prima della pressione lunga sta scorrendo: il gesto non parte', async () => {
    const { azioni } = monta()
    giu(bloccoV())
    await avanza(100)
    muovi(bloccoV(), 320)
    await avanza(400)
    expect(bloccoV().dataset.trascinato).toBeUndefined()
    muovi(bloccoV(), 360)
    su(bloccoV(), 360)
    await assesta()
    expect(riga(bloccoV())).toBe('')
    expect(azioni.sposta).not.toHaveBeenCalled()
  })

  it('solo in verticale e a passi di 5 minuti: 15 punti in giù e 200 di lato sono due celle, nella stessa colonna', async () => {
    const { azioni } = monta()
    await trascina(bloccoV(), 15, 200)
    expect(riga(bloccoV())).toBe(rigaDi(122))
    expect(azioni.sposta).toHaveBeenCalledTimes(1)
    const [richiesta, codice] = (azioni.sposta as ReturnType<typeof vi.fn>).mock.calls[0] as [RichiestaSpostamento, string]
    expect(richiesta).toEqual({
      visitaId: V,
      data: DATA,
      mossi: [{ id: A1, da: 120, a: 122 }, { id: A2, da: 141, a: 143 }],
      // il primo gesto: le versioni le legge il server
      versioni: null,
    })
    expect(codice).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('un gesto che torna al punto di partenza non manda niente', async () => {
    const { azioni } = monta()
    await trascina(bloccoV(), 2)
    expect(azioni.sposta).not.toHaveBeenCalled()
    expect(riga(bloccoV())).toBe('')
  })

  it('lo scorrimento del giorno resta sospeso durante il gesto, e solo allora', async () => {
    monta()
    const scorri = () => {
      const e = new Event('touchmove', { bubbles: true, cancelable: true })
      bloccoV().dispatchEvent(e)
      return e.defaultPrevented
    }
    giu(bloccoV())
    expect(scorri()).toBe(false)
    await avanza(400)
    expect(scorri()).toBe(true)
  })

  it('il menu contestuale è spento sul blocco premuto', async () => {
    monta()
    giu(bloccoV())
    const e = new Event('contextmenu', { bubbles: true, cancelable: true })
    bloccoV().dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })

  it('il rilascio di un gesto non arriva allo scorrimento di lato, e il click che segue non apre la scheda', async () => {
    const { sopra } = monta()
    await trascina(bloccoV(), 30)
    fireEvent.click(bloccoV())
    expect(sopra.pointerUp).not.toHaveBeenCalled()
    expect(sopra.click).not.toHaveBeenCalled()
  })

  it('una pressione lunga lasciata dov era non manda niente, e il click che segue NON apre la scheda', async () => {
    const { azioni, sopra } = monta()
    id += 1
    giu(bloccoW())
    await avanza(400)
    su(bloccoW(), 300)
    fireEvent.click(bloccoW())
    expect(azioni.sposta).not.toHaveBeenCalled()
    expect(sopra.click).not.toHaveBeenCalled()
  })

  it('la gemella: un tocco breve arriva a tutti e due, e apre ancora la scheda', async () => {
    const { sopra } = monta()
    giu(bloccoW())
    await avanza(100)
    su(bloccoW(), 300)
    fireEvent.click(bloccoW())
    expect(sopra.pointerUp).toHaveBeenCalledTimes(1)
    expect(sopra.click).toHaveBeenCalledTimes(1)
  })

  it('un gesto finito senza click non mangia il tocco successivo', async () => {
    const { sopra } = monta()
    await trascina(bloccoV(), 30)
    // nessun click dopo il gesto: il dito si era mosso
    giu(bloccoW())
    su(bloccoW(), 300)
    fireEvent.click(bloccoW())
    expect(sopra.click).toHaveBeenCalledTimes(1)
  })
})

describe('l invio del gesto', () => {
  it('il codice d invio si scrive al TOCCO, prima della risposta, con soli identificativi; e il blocco dice «Salvo…»', async () => {
    const { azioni } = monta()
    await trascina(bloccoV(), 28)
    const codice = (azioni.sposta as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(invii()).toEqual([expect.objectContaining({ codice, visitaId: V, clienteId: MARIA, operatriceId: VERA, invio: 'sposta' })])
    expect(window.localStorage.getItem('avstyle.invii')).not.toContain('Maria')
    expect(bloccoV().dataset.etichetta).toBe('Salvo…')
    expect(riga(bloccoV())).toBe(rigaDi(124))
  })

  it('✓: «✓ Spostata alle 10:20 · Annulla», il codice si toglie, e il giorno si rilegge', async () => {
    monta({ sposta: vi.fn(async () => salvata('vv1', [A1, A2])) })
    await trascina(bloccoV(), 28)
    expect(screen.getByRole('status').textContent).toContain('✓ Spostata alle 10:20')
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeTruthy()
    expect(invii()).toEqual([])
    expect(bloccoV().dataset.etichetta).toBeUndefined()
    expect(router.refresh).toHaveBeenCalled()
  })

  it('dopo il ✓ si ADOTTANO le versioni restituite: il secondo gesto le rimanda, anche prima del giorno riletto', async () => {
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockResolvedValueOnce(salvata('vv1', [A1, A2])).mockImplementation(mai)
    monta({ sposta })
    await trascina(bloccoV(), 28)
    // il giorno riletto non è ancora arrivato: il blocco è disegnato dove l'ha messo il gesto
    expect(riga(bloccoV())).toBe(rigaDi(124))
    await trascina(bloccoV(), 14)
    expect(sposta).toHaveBeenCalledTimes(2)
    expect(sposta.mock.calls[1][0]).toEqual({
      visitaId: V,
      data: DATA,
      mossi: [{ id: A1, da: 124, a: 126 }, { id: A2, da: 145, a: 147 }],
      versioni: { visita: 'vv1', attesi: [{ id: A1, versione: `vv1-${A1}` }, { id: A2, versione: `vv1-${A2}` }] },
    })
  })

  it('e dopo il giorno riletto, con la visita dove le versioni la descrivono, le rimanda ancora', async () => {
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockResolvedValueOnce(salvata('vv1', [A1, A2])).mockImplementation(mai)
    const { rilettura } = monta({ sposta })
    await trascina(bloccoV(), 28)
    rilettura(124)
    await assesta()
    expect(riga(bloccoV())).toBe('')
    await trascina(bloccoV(), 14)
    expect(sposta.mock.calls[1][0].versioni).toMatchObject({ visita: 'vv1' })
  })

  it('una visita riletta altrove non usa più le versioni adottate: le legge il server', async () => {
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockResolvedValueOnce(salvata('vv1', [A1, A2])).mockImplementation(mai)
    const { rilettura } = monta({ sposta })
    await trascina(bloccoV(), 28)
    // una collega l'ha spostata alle 11:00
    rilettura(132)
    await assesta()
    await trascina(bloccoV(), 14)
    expect(sposta.mock.calls[1][0]).toMatchObject({ mossi: [{ id: A1, da: 132, a: 134 }, { id: A2, da: 153, a: 155 }], versioni: null })
  })

  it('modificata_altrove: il blocco va alla posizione LETTA — non alla partenza né alla destinazione — finché il giorno riletto non arriva', async () => {
    const sposta = vi.fn(async (): Promise<Risposta> => ({
      tipo: 'esito', esito: 'modificata_altrove', messaggio: messaggioPerEsito('modificata_altrove', false), stato: stato(132),
    }))
    const { rilettura } = monta({ sposta })
    await trascina(bloccoV(), 28)
    expect(screen.getByRole('status').textContent).toBe('È diversa da come l’avevi lasciata')
    expect(riga(bloccoV())).toBe(rigaDi(132))
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull()
    rilettura(132)
    await assesta()
    expect(riga(bloccoV())).toBe('')
  })

  it('cancellata_altrove: il blocco sparisce fino al giorno riletto', async () => {
    monta({ sposta: vi.fn(async (): Promise<Risposta> => ({ tipo: 'esito', esito: 'cancellata_altrove', messaggio: messaggioPerEsito('cancellata_altrove', false) })) })
    await trascina(bloccoV(), 28)
    expect(bloccoV().style.visibility).toBe('hidden')
    expect(screen.getByRole('status').textContent).toBe('La visita è stata cancellata')
  })

  it('da_confermare: si apre la scheda sulla posizione del gesto', async () => {
    const { apri } = monta({ sposta: vi.fn(async (): Promise<Risposta> => ({ tipo: 'da_confermare', chiavi: [`fuori-orario:${A2}`] })) })
    await trascina(bloccoV(), 28)
    expect(apri).toHaveBeenCalledWith({ tipo: 'visita', visitaId: V, data: DATA, sposta: [{ id: A1, inizio: 124 }, { id: A2, inizio: 145 }] })
  })

  it('l uscita forzata va all accesso, senza frasi sulla visita', async () => {
    const errori = vi.spyOn(console, 'error').mockImplementation(() => {})
    monta({ sposta: vi.fn(async (): Promise<Risposta> => ({ tipo: 'uscita_forzata' })) })
    await trascina(bloccoV(), 28)
    expect(JSON.stringify(errori.mock.calls.map((c) => String(c[0])))).toContain('navigation')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('un blocco con un invio in corso non si trascina', async () => {
    const { azioni } = monta()
    await trascina(bloccoV(), 28)
    await trascina(bloccoV(), 14)
    expect(azioni.sposta).toHaveBeenCalledTimes(1)
  })
})

describe('«Annulla»', () => {
  it('ha un codice d invio SUO, le versioni adottate, riporta alla posizione di prima, e si spegne al primo tocco', async () => {
    const annulla = vi.fn<AzioniTrascina['annulla']>(mai)
    const { azioni } = monta({ sposta: vi.fn(async () => salvata('vv1', [A1, A2])), annulla })
    await trascina(bloccoV(), 28)
    const codiceSposta = (azioni.sposta as ReturnType<typeof vi.fn>).mock.calls[0][1]
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    await assesta()
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull()
    expect(annulla).toHaveBeenCalledTimes(1)
    const [richiesta, codice] = annulla.mock.calls[0]
    expect(codice).not.toBe(codiceSposta)
    expect(richiesta).toEqual({
      visitaId: V,
      data: DATA,
      mossi: [{ id: A1, da: 124, a: 120 }, { id: A2, da: 145, a: 141 }],
      versioni: { visita: 'vv1', attesi: [{ id: A1, versione: `vv1-${A1}` }, { id: A2, versione: `vv1-${A2}` }] },
    })
    expect(invii()).toEqual([expect.objectContaining({ codice, invio: 'annulla' })])
    expect(riga(bloccoV())).toBe(rigaDi(120))
    expect(bloccoV().dataset.etichetta).toBe('Salvo…')
  })

  it('✓: «✓ Riportata alle 10:00», senza un altro «Annulla»', async () => {
    monta({ sposta: vi.fn(async () => salvata('vv1', [A1, A2])), annulla: vi.fn(async () => salvata('vv2', [A1, A2])) })
    await trascina(bloccoV(), 28)
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    await assesta()
    expect(screen.getByRole('status').textContent).toBe('✓ Riportata alle 10:00')
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull()
  })

  it('resta 6 s, poi se ne va', async () => {
    monta({ sposta: vi.fn(async () => salvata('vv1', [A1, A2])) })
    await trascina(bloccoV(), 28)
    await avanza(5_900)
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeTruthy()
    await avanza(200)
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull()
  })
})

describe('«Non so» e «Controlla» (§5.1, §4.4)', () => {
  const nonSo = async (): Promise<RispostaDellaRotta> => ({ tipo: 'non_so' })

  it('10 s dal tocco senza risposta: «?» e «Controlla» automatico sullo STESSO codice; poi al massimo tre ritentativi, e il «?» resta toccabile', async () => {
    const controlla = vi.fn(nonSo)
    const { azioni, sopra } = monta({}, controlla)
    await trascina(bloccoV(), 28)
    const codice = (azioni.sposta as ReturnType<typeof vi.fn>).mock.calls[0][1]
    await avanza(9_999)
    expect(controlla).not.toHaveBeenCalled()
    expect(bloccoV().dataset.etichetta).toBe('Salvo…')
    await avanza(1)
    expect(bloccoV().dataset.etichetta).toBe('?')
    expect(controlla).toHaveBeenCalledTimes(1)
    expect(controlla).toHaveBeenLastCalledWith(codice, V)
    await avanza(2_000)
    expect(controlla).toHaveBeenCalledTimes(2)
    await avanza(4_000)
    expect(controlla).toHaveBeenCalledTimes(3)
    await avanza(8_000)
    expect(controlla).toHaveBeenCalledTimes(4)
    await avanza(60_000)
    expect(controlla).toHaveBeenCalledTimes(4)
    // il «?» ripete «Controlla», e non apre la scheda
    tocca(bloccoV())
    await assesta()
    expect(controlla).toHaveBeenCalledTimes(5)
    expect(sopra.click).not.toHaveBeenCalled()
    // il codice resta: nessun esito si è visto
    expect(invii().map((x) => x.codice)).toEqual([codice])
  })

  it('una risposta «Non so» della Server Action fa partire «Controlla» subito', async () => {
    const controlla = vi.fn(nonSo)
    monta({ sposta: vi.fn(async (): Promise<Risposta> => ({ tipo: 'non_so' })) }, controlla)
    await trascina(bloccoV(), 28)
    expect(bloccoV().dataset.etichetta).toBe('?')
    expect(controlla).toHaveBeenCalledTimes(1)
  })

  it('«Controlla» decide sulla posizione LETTA, e la risposta tardiva dell invio si scarta', async () => {
    const invio = differita<Risposta>()
    const controlla = vi.fn(async (): Promise<RispostaDellaRotta> => ({ tipo: 'riga', riga: 1, esito_invio: 'annullato', stato: stato(132) }))
    monta({ sposta: vi.fn(() => invio.promessa) }, controlla)
    await trascina(bloccoV(), 28)
    await avanza(10_000)
    expect(screen.getByRole('status').textContent).toBe('Lo spostamento non è stato salvato')
    expect(riga(bloccoV())).toBe(rigaDi(132))
    expect(invii()).toEqual([])
    invio.risolvi(salvata('tardiva', [A1, A2]))
    await assesta()
    expect(screen.getByRole('status').textContent).toBe('Lo spostamento non è stato salvato')
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull()
  })

  it('«✓ Spostata» di «Controlla» offre «Annulla» con le versioni RILETTE', async () => {
    const controlla = vi.fn(async (): Promise<RispostaDellaRotta> => ({ tipo: 'riga', riga: 2, esito_invio: 'salvata', stato: stato(124) }))
    const annulla = vi.fn<AzioniTrascina['annulla']>(mai)
    monta({ annulla }, controlla)
    await trascina(bloccoV(), 28)
    await avanza(10_000)
    expect(screen.getByRole('status').textContent).toContain('✓ Spostata alle 10:20')
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    await assesta()
    expect(annulla.mock.calls[0][0].versioni).toEqual({ visita: 'vv-letta', attesi: [{ id: A1, versione: 'l1' }, { id: A2, versione: 'l2' }] })
  })

  it('la generazione è PER BLOCCO: un blocco in attesa non ferma gli altri', async () => {
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockImplementationOnce(mai).mockResolvedValueOnce(salvata('vw', [B1]))
    monta({ sposta }, vi.fn(nonSo))
    await trascina(bloccoV(), 28)
    await avanza(10_000)
    expect(bloccoV().dataset.etichetta).toBe('?')
    await trascina(bloccoW(), 14)
    // W ha la sua risposta, mentre V resta col «?»
    expect(screen.getByRole('status').textContent).toContain('✓ Spostata alle 12:40')
    expect(bloccoV().dataset.etichetta).toBe('?')
  })
})

describe('la fila delle Server Actions (§5.1)', () => {
  it('dietro un invio appeso si dice «In attesa del salvataggio precedente», e i 10 s contano dal TOCCO', async () => {
    const primo = differita<Risposta>()
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockImplementationOnce(() => primo.promessa).mockImplementation(mai)
    monta({ sposta }, vi.fn(async (): Promise<RispostaDellaRotta> => ({ tipo: 'non_so' })))
    await trascina(bloccoV(), 28)
    await trascina(bloccoW(), 14)
    expect(bloccoW().dataset.etichetta).toBe('In attesa…')
    expect(screen.getByRole('status').textContent).toBe('In attesa del salvataggio precedente')
    // il primo risponde tre secondi dopo: il secondo parte adesso
    await avanza(3_000)
    primo.risolvi(salvata('vv1', [A1, A2]))
    await assesta()
    expect(bloccoW().dataset.etichetta).toBe('Salvo…')
    // ma l'operatrice aspetta da quando ha lasciato il blocco: a 10 s dal tocco, non a 13
    await avanza(6_900)
    expect(bloccoW().dataset.etichetta).toBe('Salvo…')
    await avanza(100)
    expect(bloccoW().dataset.etichetta).toBe('?')
  })

  it('una rilettura chiesta durante un gesto aspetta che il gesto finisca', async () => {
    const primo = differita<Risposta>()
    monta({ sposta: vi.fn<AzioniTrascina['sposta']>().mockImplementationOnce(() => primo.promessa).mockImplementation(mai) })
    await trascina(bloccoV(), 28)
    id += 1
    giu(bloccoW())
    await avanza(400)
    primo.risolvi(salvata('vv1', [A1, A2]))
    await assesta()
    expect(router.refresh).not.toHaveBeenCalled()
    su(bloccoW(), 300)
    await assesta()
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })
})

describe('revisione del Task 10', () => {
  it('B2: «L’app è stata aggiornata» riporta il blocco alla posizione letta, e la pagina si ricarica da sola', async () => {
    // jsdom non naviga: `location.reload` lascia un «Not implemented: navigation» sulla console.
    const errori = vi.spyOn(console, 'error').mockImplementation(() => {})
    monta({ sposta: vi.fn(async () => Promise.reject(new Error('Server Action "7f00" was not found on the server.'))) })
    await trascina(bloccoV(), 28)
    expect(screen.getByRole('status').textContent).toBe('L’app è stata aggiornata: ricarica la pagina.')
    // niente scostamento: vale la posizione disegnata dal server, cioè l'ultima letta
    expect(riga(bloccoV())).toBe('')
    expect(bloccoV().dataset.etichetta).toBeUndefined()
    expect(JSON.stringify(errori.mock.calls.map((c) => String(c[0])))).not.toContain('navigation')
    await avanza(3_000)
    expect(JSON.stringify(errori.mock.calls.map((c) => String(c[0])))).toContain('navigation')
  })

  it('il pulsante «Annulla» sparisce appena parte un altro invio sulla stessa visita', async () => {
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockResolvedValueOnce(salvata('vv1', [A1, A2])).mockImplementation(mai)
    monta({ sposta })
    await trascina(bloccoV(), 28)
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeTruthy()
    await trascina(bloccoV(), 14)
    expect(sposta).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull()
  })

  it('la gemella: un invio su un ALTRA visita lascia «Annulla» dov è', async () => {
    const sposta = vi.fn<AzioniTrascina['sposta']>().mockResolvedValueOnce(salvata('vv1', [A1, A2])).mockImplementation(mai)
    monta({ sposta })
    await trascina(bloccoV(), 28)
    await trascina(bloccoW(), 14)
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeTruthy()
  })

  it('un giorno riletto arrivato mentre il blocco è in mano: al rilascio senza spostamento si rilegge, e decide la lettura', async () => {
    const { rilettura } = monta({ sposta: vi.fn(async () => salvata('vv1', [A1, A2])) })
    await trascina(bloccoV(), 28)
    // il ✓ ha chiesto la sua rilettura; adesso il blocco è disegnato a 124
    const prima = router.refresh.mock.calls.length
    id += 1
    giu(bloccoV())
    await avanza(400)
    // mentre lo tiene, arriva il giorno: una collega l'ha portato alle 11:00
    rilettura(132)
    await assesta()
    su(bloccoV(), 300)
    await assesta()
    expect(router.refresh.mock.calls.length).toBe(prima + 1)
    rilettura(132)
    await assesta()
    expect(riga(bloccoV())).toBe('')
  })
})
