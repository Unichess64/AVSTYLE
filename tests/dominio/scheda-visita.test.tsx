// @vitest-environment jsdom
//
// tests/dominio/scheda-visita.test.tsx
//
// La scheda visita come componente: l'elenco delle operatrici senza le
// disattivate (D2-2, sonda 11), la ricerca che non tocca l'indirizzo (§4.8),
// «Nuova cliente» con l'informativa e i doppioni, «+ Aggiungi servizio», la
// riga ambra e «Salva comunque», e l'apertura dall'agenda con «indietro».
// Niente Supabase: le richieste sono finte, e la prova gira anche in test:fuso.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Fuori da Next non c'è il router dell'App Router: «vai lì» su un altro giorno
// è l'unico che lo usa.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
import { AgendaColonne } from '../../src/cliente/agenda-colonne'
import { AgendaLista } from '../../src/cliente/agenda-lista'
import { ApriScheda, SchedaDellAgenda } from '../../src/cliente/apri-scheda'
import { useContext } from 'react'
import type { Apertura } from '../../src/dominio/apertura'
import { type RichiesteScheda, UscitaForzata } from '../../src/cliente/richieste-scheda'
import { type AzioniScheda, SchedaCompilata } from '../../src/cliente/scheda-visita'
import type { Atteso } from '../../src/dominio/attesi'
import { type SchedaSerializzata, apriSchedaSuVisita, apriSchedaVuota } from '../../src/dominio/scheda'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import type { Giorno } from '../../src/server/lettura-giorno'
import type { RispostaApri } from '../../src/server/lettura-scheda'
import type { Risposta } from '../../src/server/scrittura-visita'

const VERA = '10000000-0000-4000-8000-000000000001'
const ANNALISA = '10000000-0000-4000-8000-000000000002'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const MARIA = '40000000-0000-4000-8000-000000000001'
const VISITA = '50000000-0000-4000-8000-000000000001'
const A1 = '60000000-0000-4000-8000-000000000001'
const A2 = '60000000-0000-4000-8000-000000000002'
const DATA = '2026-10-08'

// Annalisa è disattivata ma ha un appuntamento nel giorno: è nelle colonne, non
// nell'elenco della scheda (D2-2).
function dati(altro: Partial<RispostaApri> = {}): RispostaApri {
  return {
    stato: null,
    attive: [
      { id: VERA, nome: 'Vera', colore: '#C2185B' },
      { id: ALESSANDRA, nome: 'Alessandra', colore: '#9B1B1B' },
    ],
    catalogo: {
      servizi: [
        { id: REFILL, nome: 'Refill gel', categoria: 'Unghie', durata: 18, pausa: 2, attivo: true },
        { id: MASSAGGIO, nome: 'Massaggio', categoria: 'Corpo', durata: 10, pausa: 3, attivo: true },
      ],
      durateOperatrice: [
        { operatriceId: VERA, servizioId: REFILL, durata: 15 },
        { operatriceId: ANNALISA, servizioId: REFILL, durata: null },
        { operatriceId: ALESSANDRA, servizioId: MASSAGGIO, durata: 12 },
      ],
    },
    giorno: {
      data: DATA,
      operatrici: [
        { id: VERA, nome: 'Vera', attiva: true },
        { id: ANNALISA, nome: 'Annalisa', attiva: false },
        { id: ALESSANDRA, nome: 'Alessandra', attiva: true },
      ],
      risolti: {
        [VERA]: { dayStatus: 'open', ranges: [{ startBoundary: 108, endBoundary: 228 }] },
        [ANNALISA]: { dayStatus: 'operator_off', ranges: [] },
        [ALESSANDRA]: { dayStatus: 'open', ranges: [{ startBoundary: 108, endBoundary: 228 }] },
      },
      appuntamenti: [],
    },
    clienteNome: 'Maria Rossi',
    ...altro,
  }
}

const STATO: StatoVisita = {
  visita: '2026-10-03T09:00:00.123456Z',
  data: DATA,
  cliente: MARIA,
  appuntamenti: [
    { id: A1, versione: 'v1', operatrice: ANNALISA, servizio: REFILL, inizio: 120, durata: 18 },
    { id: A2, versione: 'v2', operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 140, durata: 12 },
  ],
}

function richieste(altro: Partial<RichiesteScheda> = {}): RichiesteScheda {
  return {
    apri: vi.fn(async () => dati({ stato: STATO })),
    giorno: vi.fn(async () => dati().giorno),
    cerca: vi.fn(async () => [{ id: MARIA, nome: 'Maria Rossi', telefono: '+393331234567' }]),
    doppioni: vi.fn(async () => [{ id: MARIA, nome: 'Maria Rossi', telefono: '+393331234567', motivo: 'nome' as const }]),
    ...altro,
  }
}

/** Una Server Action che non risponde mai: la scheda resta in attesa, e la prova guarda il prima. */
const mai = () => new Promise<never>(() => {})

/** Le Server Actions finte: di norma non rispondono; la prova sostituisce quelle che le servono. */
function azioniFinte(altro: Partial<AzioniScheda> = {}): AzioniScheda {
  return { salva: vi.fn(mai), togli: vi.fn(mai), elimina: vi.fn(mai), ...altro }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  router.push.mockReset()
  router.replace.mockReset()
  router.refresh.mockReset()
})

describe('D2-2: l elenco delle operatrici della scheda', () => {
  it('non contiene MAI una disattivata, e il suo servizio dice «non più attiva» con «Salva» spento', () => {
    render(
      <SchedaCompilata iniziale={apriSchedaSuVisita(STATO, VISITA)} dati={dati({ stato: STATO })} richieste={richieste()} azioni={azioniFinte()} onVaiA={() => {}} />,
    )
    const servizi = screen.getAllByRole('listitem').filter((li) => within(li).queryByText('Operatrice') !== null)
    expect(servizi).toHaveLength(2)
    for (const li of servizi) {
      const voci = within(within(li).getByLabelText('Operatrice') as HTMLElement).getAllByRole('option').map((o) => o.textContent)
      expect(voci).not.toContain('Annalisa')
      expect(voci).toEqual(expect.arrayContaining(['Vera', 'Alessandra']))
    }
    // il servizio di Annalisa: nessuna selezione, e la dicitura
    expect(within(servizi[0]).getByText('Annalisa — non più attiva')).toBeTruthy()
    expect((within(servizi[0]).getByLabelText('Operatrice') as HTMLSelectElement).value).toBe('')
    expect((within(servizi[1]).getByLabelText('Operatrice') as HTMLSelectElement).value).toBe(ALESSANDRA)
    expect(screen.getByText('Scegli un’operatrice attiva per questo servizio.')).toBeTruthy()
    expect((screen.getByRole('button', { name: /^Salva/ }) as HTMLButtonElement).disabled).toBe(true)
    // «Elimina visita» e «Togli» restano accesi
    expect((screen.getByRole('button', { name: 'Elimina visita' }) as HTMLButtonElement).disabled).toBe(false)
    expect((within(servizi[0]).getByRole('button', { name: 'Togli' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('la gemella: scelta un operatrice attiva, «Salva» si accende', async () => {
    render(
      <SchedaCompilata iniziale={apriSchedaSuVisita(STATO, VISITA)} dati={dati({ stato: STATO })} richieste={richieste()} azioni={azioniFinte()} onVaiA={() => {}} />,
    )
    const [primo] = screen.getAllByLabelText('Operatrice')
    await userEvent.selectOptions(primo, VERA)
    expect((screen.getByRole('button', { name: /^Salva/ }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('Annalisa — non più attiva')).toBeNull()
  })
})

describe('la cliente', () => {
  it('cerca per nome in POST e non tocca mai l indirizzo né la cronologia (§4.8)', async () => {
    const r = richieste()
    const push = vi.spyOn(window.history, 'pushState')
    const replace = vi.spyOn(window.history, 'replaceState')
    const prima = window.location.href
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={r} azioni={azioniFinte()} onVaiA={() => {}} />)
    await userEvent.type(screen.getByLabelText('Cerca la cliente per nome o telefono'), 'maria')
    await userEvent.click(await screen.findByRole('button', { name: 'Maria Rossi · +393331234567' }))
    expect(r.cerca).toHaveBeenLastCalledWith('maria')
    expect(screen.getByText('Maria Rossi')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(window.location.href).toBe(prima)
    expect(document.querySelector('form')).toBeNull()
  })

  it('«Nuova cliente» porta la riga sull informativa e propone i doppioni', async () => {
    const r = richieste()
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={r} azioni={azioniFinte()} onVaiA={() => {}} />)
    await userEvent.type(screen.getByLabelText('Cerca la cliente per nome o telefono'), 'maria rosi')
    await userEvent.click(screen.getByRole('button', { name: 'Nuova cliente' }))
    expect((screen.getByLabelText('Nome e cognome') as HTMLInputElement).value).toBe('maria rosi')
    expect(screen.getByText(/L’informativa completa è esposta in salone/)).toBeTruthy()
    expect(await screen.findByText('Forse è già in elenco:')).toBeTruthy()
    expect(r.doppioni).toHaveBeenLastCalledWith('maria rosi', null)
    await userEvent.type(screen.getByLabelText('Telefono'), '333 1234567')
    await waitFor(() => expect(r.doppioni).toHaveBeenLastCalledWith('maria rosi', '+393331234567'))
    await userEvent.click(screen.getByRole('button', { name: 'Usa questa' }))
    expect(screen.getByText('Maria Rossi')).toBeTruthy()
    expect(screen.queryByLabelText('Nome e cognome')).toBeNull()
  })
})

describe('i servizi', () => {
  it('«+ Aggiungi servizio» parte dal posto toccato e accoda il secondo con la pausa', async () => {
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste()} azioni={azioniFinte()} onVaiA={() => {}} />)
    const aggiungi = screen.getByLabelText('Aggiungi servizio')
    await userEvent.selectOptions(aggiungi, REFILL)
    // con «mostra tutti» il massaggio, che Vera non fa
    await userEvent.click(screen.getByLabelText('mostra tutti i servizi'))
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), MASSAGGIO)
    // Refill di Vera alle 10:00 per 15 celle, pausa 2: il massaggio alle 11:25
    expect(screen.getByRole('listitem', { name: 'Refill gel alle 10:00' })).toBeTruthy()
    expect(screen.getByRole('listitem', { name: 'Massaggio alle 11:25' })).toBeTruthy()
  })

  it('un servizio fuori orario dà la riga ambra e «Salva comunque», che conferma le chiavi mostrate', async () => {
    const salva = vi.fn(mai)
    const s = apriSchedaVuota(DATA, VERA, 228)   // 19:00: Vera chiude alle 19:00
    render(<SchedaCompilata iniziale={{ ...s, cliente: { tipo: 'esistente', id: MARIA } }} dati={dati()} richieste={richieste()} azioni={azioniFinte({ salva })} onVaiA={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    expect(screen.getByText('Refill gel alle 19:00 è fuori dall’orario di Vera')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva comunque' }))
    expect(salva).toHaveBeenCalledTimes(1)
    const inviata = salva.mock.calls[0][0]
    expect(inviata.avvisiConfermati).toEqual([`fuori-orario:${inviata.servizi[0].id}`])
    expect(screen.getByRole('button', { name: 'Salva' })).toBeTruthy()
  })
})

describe('SchedaDellAgenda: si apre dall agenda, e «indietro» la chiude', () => {
  function agenda(r: RichiesteScheda) {
    return render(
      <SchedaDellAgenda data={DATA} occupati={[{ operatriceId: VERA, inizio: 120, durata: 19 }]} richieste={r} azioni={azioniFinte()}>
        <article data-visita={VISITA} data-appuntamenti={A1} role="button" tabIndex={0} aria-label="blocco">
          <span>Maria Rossi</span>
        </article>
        <div data-colonna={VERA} data-da="96" data-a="240" aria-label="spazio di Vera" />
      </SchedaDellAgenda>,
    )
  }

  it('un blocco apre la sua visita, e «indietro» chiude la scheda', async () => {
    const r = richieste()
    const push = vi.spyOn(window.history, 'pushState')
    agenda(r)
    await userEvent.click(screen.getByText('Maria Rossi'))
    expect(r.apri).toHaveBeenCalledWith(DATA, VISITA)
    expect(push).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('dialog', { name: 'Visita' })).toBeTruthy()
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('uno spazio libero apre una scheda vuota all orario di §5.1', async () => {
    const r = richieste({ apri: vi.fn(async () => dati()) })
    agenda(r)
    const spazio = screen.getByLabelText('spazio di Vera')
    spazio.getBoundingClientRect = () => ({ top: 0, height: 1008, left: 0, width: 100, bottom: 1008, right: 100, x: 0, y: 0, toJSON: () => ({}) })
    // tocco alle 11:40: quarto 11:30, fine del Refill delle 10:00 alle 11:35
    fireEvent.click(spazio, { clientY: (140 - 96) * 7 + 2 })
    expect(r.apri).toHaveBeenCalledWith(DATA, null)
    expect(await screen.findByRole('dialog', { name: 'Nuova visita' })).toBeTruthy()
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    expect(screen.getByRole('listitem', { name: 'Refill gel alle 11:35' })).toBeTruthy()
  })

  it('«Chiudi» torna indietro nella cronologia invece di lasciare la voce orfana', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    agenda(richieste())
    await userEvent.click(screen.getByText('Maria Rossi'))
    await userEvent.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(back).toHaveBeenCalledTimes(1)
  })
})

describe('il collegamento con le viste vere del giorno', () => {
  // Le colonne e la lista sono disegnate sul server e portano solo attributi
  // `data-…`: senza questa prova, toglierli non arrossirebbe niente.
  const giorno: Giorno = {
    data: DATA,
    operatrici: [
      { id: VERA, nome: 'Vera', colore: '#C2185B', attiva: true, sonoIo: true },
      { id: ALESSANDRA, nome: 'Alessandra', colore: '#9B1B1B', attiva: true, sonoIo: false },
    ],
    finestra: { da: 96, a: 240 },
    appuntamenti: [
      {
        id: A1, visitaId: VISITA, operatriceId: VERA, servizioId: REFILL, servizioNome: 'Refill gel',
        clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: 120, durata: 18, pausa: 2,
      },
      {
        id: A2, visitaId: '50000000-0000-4000-8000-000000000002', operatriceId: ALESSANDRA, servizioId: MASSAGGIO,
        servizioNome: 'Massaggio', clienteId: 'cl-lucia', clienteNome: 'Lucia Ciccarè', inizio: 150, durata: 13, pausa: 3,
      },
    ],
    risolti: new Map(),
    chiusure: [],
  }

  it('un blocco delle colonne e una riga della lista aprono la loro visita', async () => {
    const r = richieste()
    render(
      <SchedaDellAgenda data={DATA} occupati={giorno.appuntamenti} richieste={r} azioni={azioniFinte()}>
        <AgendaColonne giorno={giorno} oggi={DATA} lineaDellOra={null} />
        <AgendaLista appuntamenti={giorno.appuntamenti} operatrici={giorno.operatrici} />
      </SchedaDellAgenda>,
    )
    const blocco = screen.getByRole('button', { name: /^10:00–11:30, Maria Rossi/ })
    expect(blocco.getAttribute('data-appuntamenti')).toBe(A1)
    await userEvent.click(blocco)
    expect(r.apri).toHaveBeenLastCalledWith(DATA, VISITA)
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await userEvent.click(screen.getByRole('listitem', { name: '12:30, Lucia Ciccarè, Massaggio, con Alessandra' }))
    expect(r.apri).toHaveBeenLastCalledWith(DATA, '50000000-0000-4000-8000-000000000002')
  })

  it('lo spazio di ogni colonna copre la finestra e apre una scheda vuota di quella operatrice', async () => {
    const r = richieste({ apri: vi.fn(async () => dati()) })
    const { container } = render(
      <SchedaDellAgenda data={DATA} occupati={giorno.appuntamenti} richieste={r} azioni={azioniFinte()}>
        <AgendaColonne giorno={giorno} oggi={DATA} lineaDellOra={null} />
      </SchedaDellAgenda>,
    )
    const spazi = [...container.querySelectorAll<HTMLElement>('[data-colonna]')]
    expect(spazi.map((x) => [x.dataset.colonna, x.dataset.da, x.dataset.a])).toEqual([
      [VERA, '96', '240'],
      [ALESSANDRA, '96', '240'],
    ])
    spazi[1].getBoundingClientRect = () => ({ top: 0, height: 1008, left: 0, width: 100, bottom: 1008, right: 100, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.click(spazi[1], { clientY: (164 - 96) * 7 })
    expect(r.apri).toHaveBeenCalledWith(DATA, null)
    await userEvent.selectOptions(await screen.findByLabelText('Aggiungi servizio'), MASSAGGIO)
    // tocco alle 13:40 nella colonna di Alessandra: quarto 13:30, il suo massaggio finisce alle 13:35
    expect(screen.getByRole('listitem', { name: 'Massaggio alle 13:35' })).toBeTruthy()
    expect(within(screen.getByRole('listitem', { name: 'Massaggio alle 13:35' })).getByLabelText('Operatrice')).toHaveProperty('value', ALESSANDRA)
  })
})

describe('la revisione del Task 7: il collegamento di «Salva» e della frase dei conflitti', () => {
  const salvaSpento = () => (screen.getByRole('button', { name: /^Salva/ }) as HTMLButtonElement).disabled

  it('«Salva» resta spento senza cliente, e si accende quando la cliente è scelta (C4)', async () => {
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste()} azioni={azioniFinte()} onVaiA={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    expect(salvaSpento()).toBe(true)
    expect(screen.getByText('Scegli la cliente.')).toBeTruthy()
    await userEvent.type(screen.getByLabelText('Cerca la cliente per nome o telefono'), 'maria')
    await userEvent.click(await screen.findByRole('button', { name: 'Maria Rossi · +393331234567' }))
    expect(salvaSpento()).toBe(false)
  })

  it('un telefono non riconosciuto spegne «Salva» invece di sparire in silenzio (B1)', async () => {
    const salva = vi.fn(mai)
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste({ doppioni: vi.fn(async () => []) })} azioni={azioniFinte({ salva })} onVaiA={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    await userEvent.click(screen.getByRole('button', { name: 'Nuova cliente' }))
    await userEvent.type(screen.getByLabelText('Nome e cognome'), 'Giulia Bianchi')
    await userEvent.type(screen.getByLabelText('Telefono'), '333 12')
    expect(screen.getByText('Il numero di telefono non è valido.')).toBeTruthy()
    expect(salvaSpento()).toBe(true)
    await userEvent.type(screen.getByLabelText('Telefono'), '34567')
    expect(salvaSpento()).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(salva.mock.calls[0][0].cliente).toMatchObject({ tipo: 'nuova', nome: 'Giulia Bianchi', telefono: '+393331234567' })
  })

  it('la frase del conflitto compare nella scheda, e «Vai lì» porta all appuntamento e al suo giorno (C4)', async () => {
    const onVaiA = vi.fn()
    const conMaria = dati({
      giorno: {
        ...dati().giorno,
        appuntamenti: [{
          id: A2, visitaId: 'vi-altra', operatriceId: VERA, servizioId: REFILL, servizioNome: 'Refill gel',
          clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: 126, durata: 6, pausa: 0,
        }],
      },
    })
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={conMaria} richieste={richieste()} azioni={azioniFinte()} onVaiA={onVaiA} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    expect(screen.getByRole('alert').textContent).toContain('Vera ha un appuntamento alle 10:30 con Maria Rossi')
    await userEvent.click(screen.getByRole('button', { name: 'Vai lì' }))
    expect(onVaiA).toHaveBeenCalledWith(A2, DATA)
  })

  it('un conflitto fra due servizi della scheda non offre «Vai lì», che chiuderebbe la scheda (C2)', async () => {
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste()} azioni={azioniFinte()} onVaiA={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    const [, secondo] = screen.getAllByLabelText('Minuti d’inizio')
    await userEvent.selectOptions(secondo, '5')
    expect(screen.getByRole('alert').textContent).toContain('Vera ha già un servizio alle 10:00 in questa visita')
    expect(screen.queryByRole('button', { name: 'Vai lì' })).toBeNull()
  })

  it('«Vai lì» verso un altro giorno lo apre davvero: replace, non back seguito da push (C3)', async () => {
    const altroGiorno = '2026-10-09'
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const r = richieste({
      giorno: vi.fn(async () => ({
        ...dati().giorno,
        data: altroGiorno,
        appuntamenti: [{
          id: 'ap-altro', visitaId: 'vi-altra', operatriceId: ALESSANDRA, servizioId: MASSAGGIO, servizioNome: 'Massaggio',
          clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: 140, durata: 12, pausa: 3,
        }],
      })),
    })
    render(
      <SchedaDellAgenda data={DATA} occupati={[]} richieste={r} azioni={azioniFinte()}>
        <article data-visita={VISITA} role="button" tabIndex={0} aria-label="blocco">Maria Rossi</article>
      </SchedaDellAgenda>,
    )
    await userEvent.click(screen.getByText('Maria Rossi'))
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: altroGiorno } })
    await userEvent.click(await screen.findByRole('button', { name: 'Vai lì' }))
    expect(router.replace).toHaveBeenCalledWith(`/agenda?giorno=${altroGiorno}`)
    expect(router.push).not.toHaveBeenCalled()
    expect(back).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Task 8: ogni pulsante chiama la sua Server Action, e la scheda legge la risposta', () => {
  // Solo operatrici attive: «Salva» acceso.
  const STATO_ATTIVO: StatoVisita = {
    visita: '2026-10-03T09:00:00.123456Z',
    data: DATA,
    cliente: MARIA,
    appuntamenti: [
      { id: A1, versione: 'v1', operatrice: VERA, servizio: REFILL, inizio: 120, durata: 15 },
      { id: A2, versione: 'v2', operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 140, durata: 12 },
    ],
  }
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  const nessuno = { spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false }
  const salvata: Risposta = { tipo: 'esito', esito: 'salvata', messaggio: { ...nessuno, testo: '✓ Salvata', spunta: true }, visita: 'v9', appuntamenti: [] }

  function monta(azioni: AzioniScheda, r: RichiesteScheda = richieste()) {
    const onFatto = vi.fn()
    const onVaiA = vi.fn()
    const onRicarica = vi.fn()
    render(
      <SchedaCompilata
        iniziale={apriSchedaSuVisita(STATO_ATTIVO, VISITA)}
        dati={dati({ stato: STATO_ATTIVO })}
        richieste={r}
        azioni={azioni}
        onVaiA={onVaiA}
        onFatto={onFatto}
        onRicarica={onRicarica}
      />,
    )
    return { onFatto, onVaiA, onRicarica }
  }
  const servizioAlle = (ora: string) => screen.getByRole('listitem', { name: new RegExp(`alle ${ora}$`) })
  const conferma = () => screen.getByRole('alertdialog', { name: 'Conferma' })

  it('«Salva» manda la scheda con un codice d invio nuovo, e il ✓ chiude la scheda col suo testo', async () => {
    const salva = vi.fn(async () => salvata)
    const { onFatto } = monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(salva).toHaveBeenCalledTimes(1)
    const [inviata, codice] = salva.mock.calls[0] as unknown as [SchedaSerializzata, string]
    expect(inviata).toMatchObject({ visitaId: VISITA, versioneVisita: STATO_ATTIVO.visita, attesi: [{ id: A1, versione: 'v1' }, { id: A2, versione: 'v2' }] })
    expect(codice).toMatch(UUID)
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('✓ Salvata'))
  })

  it('un codice per invio: due «Salva» mandano due codici diversi (§4.4)', async () => {
    const salva = vi.fn(async (): Promise<Risposta> => ({ tipo: 'non_valida', motivo: 'Scheda non valida.' }))
    monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Scheda non valida.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(salva).toHaveBeenCalledTimes(2))
    expect(salva.mock.calls[0][1]).not.toBe(salva.mock.calls[1][1])
  })

  it('«Togli» senza altre modifiche: la frase semplice, e parte la bozza senza quel servizio', async () => {
    const togli = vi.fn(async () => salvata)
    const { onFatto } = monta(azioniFinte({ togli }))
    await userEvent.click(within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }))
    expect(within(conferma()).getByText('Togliere questo servizio dalla visita?')).toBeTruthy()
    await userEvent.click(within(conferma()).getByRole('button', { name: 'Togli' }))
    expect(togli).toHaveBeenCalledTimes(1)
    const [bozza, codice] = togli.mock.calls[0] as unknown as [SchedaSerializzata, string]
    expect(bozza.servizi.map((s) => s.id)).toEqual([A1])
    expect(bozza.attesi.map((a) => a.id)).toEqual([A1, A2])   // il tolto resta fra gli attesi: è così che si toglie
    expect(codice).toMatch(UUID)
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('✓ Salvata'))
  })

  it('«Togli» con altre modifiche lo dice, e la bozza le porta (decisione del 06/10)', async () => {
    const togli = vi.fn(mai)
    monta(azioniFinte({ togli }))
    await userEvent.selectOptions(within(servizioAlle('10:00')).getByLabelText('Minuti d’inizio'), '10')
    await userEvent.click(within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }))
    expect(within(conferma()).getByText('Togliere questo servizio e salvare le altre modifiche?')).toBeTruthy()
    await userEvent.click(within(conferma()).getByRole('button', { name: 'Togli' }))
    const [bozza] = togli.mock.calls[0] as unknown as [SchedaSerializzata]
    expect(bozza.servizi.map((s) => [s.id, s.inizio])).toEqual([[A1, 122]])
  })

  it('la gemella: una modifica rifatta com era non conta come modifica', async () => {
    monta(azioniFinte())
    const minuti = () => within(servizioAlle(/10:\d0/.source)).getByLabelText('Minuti d’inizio')
    await userEvent.selectOptions(minuti(), '10')
    await userEvent.selectOptions(minuti(), '0')
    await userEvent.click(within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }))
    expect(within(conferma()).getByText('Togliere questo servizio dalla visita?')).toBeTruthy()
  })

  it('«Elimina visita» manda id, versione e attesi letti, con un codice', async () => {
    const elimina = vi.fn(async (): Promise<Risposta> => ({ tipo: 'esito', esito: 'cancellata', messaggio: { ...nessuno, testo: '✓ Cancellata', spunta: true } }))
    const { onFatto } = monta(azioniFinte({ elimina }))
    await userEvent.click(screen.getByRole('button', { name: 'Elimina visita' }))
    await userEvent.click(within(conferma()).getByRole('button', { name: 'Elimina' }))
    expect(elimina).toHaveBeenCalledTimes(1)
    const [id, versione, attesi, codice] = elimina.mock.calls[0] as unknown as [string, string, Atteso[], string]
    expect([id, versione, attesi]).toEqual([VISITA, STATO_ATTIVO.visita, [{ id: A1, versione: 'v1' }, { id: A2, versione: 'v2' }]])
    expect(codice).toMatch(UUID)
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('✓ Cancellata'))
  })

  it('dopo modificata_altrove la scheda adotta lo stato, lo dice, e il «Salva» dopo parte dalle versioni lette (C3)', async () => {
    const letto: StatoVisita = {
      ...STATO_ATTIVO,
      visita: '2026-10-03T09:05:00.654321Z',
      appuntamenti: [{ ...STATO_ATTIVO.appuntamenti[0], versione: 'v1b', inizio: 124 }, STATO_ATTIVO.appuntamenti[1]],
    }
    const salva = vi
      .fn<AzioniScheda['salva']>()
      .mockResolvedValueOnce({ tipo: 'esito', esito: 'modificata_altrove', messaggio: { ...nessuno, testo: '', schedaAdottaStato: true }, stato: letto })
      .mockImplementation(mai)
    monta(azioniFinte({ salva }))
    await userEvent.selectOptions(within(servizioAlle('10:00')).getByLabelText('Minuti d’inizio'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText(/^La scheda aggiornata/)).toBeTruthy()
    // la modifica non inviata è persa: il servizio è dove l'ha messo la collega
    expect(servizioAlle('10:20')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    const [seconda] = salva.mock.calls[1] as unknown as [SchedaSerializzata]
    expect(seconda.versioneVisita).toBe(letto.visita)
    expect(seconda.attesi).toEqual([{ id: A1, versione: 'v1b' }, { id: A2, versione: 'v2' }])
  })

  it('dopo «La scheda aggiornata» «Togli» confronta con la scheda ADOTTATA: riportare a mano il vecchio orario è una modifica (revisione, reperto 6)', async () => {
    const letto: StatoVisita = {
      ...STATO_ATTIVO,
      visita: '2026-10-03T09:05:00.654321Z',
      appuntamenti: [{ ...STATO_ATTIVO.appuntamenti[0], versione: 'v1b', inizio: 124 }, STATO_ATTIVO.appuntamenti[1]],
    }
    const salva = vi
      .fn<AzioniScheda['salva']>()
      .mockResolvedValueOnce({ tipo: 'esito', esito: 'modificata_altrove', messaggio: { ...nessuno, testo: '', schedaAdottaStato: true }, stato: letto })
    monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText(/^La scheda aggiornata/)).toBeTruthy()
    // La collega l'ha messo alle 10:20; l'operatrice lo riporta alle 10:00, com'era all'apertura.
    await userEvent.selectOptions(within(servizioAlle('10:20')).getByLabelText('Minuti d’inizio'), '0')
    await userEvent.click(within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }))
    expect(within(conferma()).getByText('Togliere questo servizio e salvare le altre modifiche?')).toBeTruthy()
  })

  it('un conflitto del server mostra la frase con «Vai lì» e rilegge il giorno', async () => {
    const r = richieste()
    const salva = vi.fn(async (): Promise<Risposta> => ({ tipo: 'conflitto', frase: 'Vera ha un appuntamento alle 10:00 con Lucia', vaiA: 'B1' }))
    const { onVaiA } = monta(azioniFinte({ salva }), r)
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(within(await screen.findByRole('alert')).getByText('Vera ha un appuntamento alle 10:00 con Lucia')).toBeTruthy()
    expect(r.giorno).toHaveBeenCalledWith(DATA)
    await userEvent.click(screen.getByRole('button', { name: 'Vai lì' }))
    expect(onVaiA).toHaveBeenCalledWith('B1', DATA)
  })

  it('da_confermare rilegge il giorno, mostra l avviso nuovo, e «Salva comunque» manda la sua chiave (D3-19)', async () => {
    const chiave = `gia-prenotata:${MARIA}:${DATA}`
    const altrove = {
      id: '60000000-0000-4000-8000-000000000077', visitaId: '50000000-0000-4000-8000-000000000077', operatriceId: VERA, servizioId: REFILL,
      servizioNome: 'Refill gel', clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: 180, durata: 15, pausa: 2,
    }
    const r = richieste({ giorno: vi.fn(async () => ({ ...dati().giorno, appuntamenti: [altrove] })) })
    const salva = vi.fn<AzioniScheda['salva']>().mockResolvedValueOnce({ tipo: 'da_confermare', chiavi: [chiave] }).mockImplementation(mai)
    monta(azioniFinte({ salva }), r)
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Maria Rossi è già prenotata alle 15:00 con Vera')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva comunque' }))
    const [seconda] = salva.mock.calls[1] as unknown as [SchedaSerializzata]
    expect(seconda.avvisiConfermati).toEqual([chiave])
  })

  it('una chiave che la scheda non sa spiegare si dice comunque, e «Salva comunque» la conferma', async () => {
    const salva = vi.fn<AzioniScheda['salva']>().mockResolvedValueOnce({ tipo: 'da_confermare', chiavi: ['ignota'] }).mockImplementation(mai)
    monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Al salvataggio è comparso un avviso nuovo: ricontrolla la scheda.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva comunque' }))
    expect((salva.mock.calls[1] as unknown as [SchedaSerializzata])[0].avvisiConfermati).toEqual(['ignota'])
  })

  it('una fallita mostra la sua frase; con ricaricaLaScheda ricarica, con ricaricaIlGiorno chiude', async () => {
    const m = (testo: string, altro = {}) => ({ ...nessuno, testo, ...altro })
    const salva = vi
      .fn<AzioniScheda['salva']>()
      .mockResolvedValueOnce({ tipo: 'fallita', sqlstate: '57014', testo: 'Non sono riuscita a salvare, riprova', messaggio: m('Non sono riuscita a salvare, riprova') })
      .mockResolvedValueOnce({ tipo: 'fallita', sqlstate: '23503', testo: 'Il servizio o l’operatrice non esiste più', messaggio: m('Il servizio o l’operatrice non esiste più', { ricaricaLaScheda: true }) })
      .mockResolvedValueOnce({ tipo: 'fallita', sqlstate: '42501', testo: 'Questa visita non è più accessibile. Ricarico il giorno.', messaggio: m('Questa visita non è più accessibile. Ricarico il giorno.', { ricaricaIlGiorno: true }) })
    const { onRicarica, onFatto } = monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Non sono riuscita a salvare, riprova')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(onRicarica).toHaveBeenCalledWith('Il servizio o l’operatrice non esiste più'))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('Questa visita non è più accessibile. Ricarico il giorno.'))
  })

  it('«Non so» spegne «Salva», «Togli» ed «Elimina visita» (§4.4: «Controlla» arriva col Task 9)', async () => {
    const salva = vi.fn(async (): Promise<Risposta> => ({ tipo: 'non_so' }))
    monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Non so se è stata salvata')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Salva' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Elimina visita' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('l uscita forzata va all accesso, e non resta nessuna frase sulla visita (§4.4)', async () => {
    // jsdom non naviga: `location.assign` lascia un «Not implemented: navigation» sulla console.
    const errori = vi.spyOn(console, 'error').mockImplementation(() => {})
    const salva = vi.fn(async (): Promise<Risposta> => ({ tipo: 'uscita_forzata' }))
    monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(JSON.stringify(errori.mock.calls.map((c) => String(c[0])))).toContain('navigation'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('una Server Action che solleva è «Non so», o «app aggiornata» se l azione non esiste più', async () => {
    const salva = vi
      .fn<AzioniScheda['salva']>()
      .mockRejectedValueOnce(new Error('Failed to find Server Action "abc". This request might be from an older or newer deployment.'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    monta(azioniFinte({ salva }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('L’app è stata aggiornata: ricarica la pagina.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Non so se è stata salvata')).toBeTruthy()
  })
})

describe('Task 8: SchedaDellAgenda chiude la scheda sull esito e rilegge il giorno', () => {
  it('il ✓ chiude la scheda, lascia il testo sull agenda e rilegge il giorno DOPO il popstate', async () => {
    const salva = vi.fn(async (): Promise<Risposta> => ({
      tipo: 'esito', esito: 'salvata', visita: 'v', appuntamenti: [],
      messaggio: { testo: '✓ Salvata', spunta: true, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false },
    }))
    const STATO_V: StatoVisita = { ...STATO, appuntamenti: [{ ...STATO.appuntamenti[1] }] }
    const r = richieste({ apri: vi.fn(async () => dati({ stato: STATO_V })) })
    const indietro = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    render(
      <SchedaDellAgenda data={DATA} occupati={[]} richieste={r} azioni={azioniFinte({ salva })}>
        <div data-visita={VISITA} data-appuntamenti={A2} tabIndex={0}>blocco</div>
      </SchedaDellAgenda>,
    )
    await userEvent.click(screen.getByText('blocco'))
    await userEvent.click(await screen.findByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(indietro).toHaveBeenCalled())
    // Prima del `popstate` nessuna rilettura: Next la coprirebbe col suo ripristino.
    expect(router.refresh).not.toHaveBeenCalled()
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('✓ Salvata')).toBeTruthy()
  })
})

describe('Task 9: «Controlla» nella scheda, la generazione e gli invii pendenti', () => {
  const STATO_ATTIVO: StatoVisita = {
    visita: '2026-10-03T09:00:00.123456Z',
    data: DATA,
    cliente: MARIA,
    appuntamenti: [
      { id: A1, versione: 'v1', operatrice: VERA, servizio: REFILL, inizio: 120, durata: 15 },
      { id: A2, versione: 'v2', operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 140, durata: 12 },
    ],
  }
  // Lo stato letto da «Controlla»: una collega ha spostato il Refill alle 10:20.
  const LETTO: StatoVisita = {
    ...STATO_ATTIVO,
    visita: '2026-10-03T09:05:00.654321Z',
    appuntamenti: [{ ...STATO_ATTIVO.appuntamenti[0], versione: 'v1b', inizio: 124 }, STATO_ATTIVO.appuntamenti[1]],
  }
  const nessuno = { spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false }
  const salvata: Risposta = { tipo: 'esito', esito: 'salvata', messaggio: { ...nessuno, testo: '✓ Salvata', spunta: true }, visita: 'v9', appuntamenti: [] }
  const invii = () => JSON.parse(window.localStorage.getItem('avstyle.invii') ?? '[]') as Record<string, unknown>[]

  /** Una promessa che la prova risolve quando vuole: la Server Action «tardiva». */
  function differita<T>() {
    let risolvi!: (v: T) => void
    const promessa = new Promise<T>((r) => (risolvi = r))
    return { promessa, risolvi }
  }

  function monta(
    azioni: AzioniScheda,
    controlla: RichiesteScheda['controlla'] = vi.fn(mai),
    iniziale = apriSchedaSuVisita(STATO_ATTIVO, VISITA),
    adesso?: () => number,
  ) {
    const onFatto = vi.fn()
    const r = richieste({ controlla })
    render(
      <SchedaCompilata
        iniziale={iniziale}
        dati={dati({ stato: STATO_ATTIVO })}
        richieste={r}
        azioni={azioni}
        io={VERA}
        attesaMs={40}
        adesso={adesso}
        onVaiA={() => {}}
        onFatto={onFatto}
        onRicarica={() => {}}
      />,
    )
    return { onFatto, controlla }
  }
  const servizioAlle = (ora: string) => screen.getByRole('listitem', { name: new RegExp(`alle ${ora}$`) })
  const pulsante = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement

  afterEach(() => {
    window.localStorage.clear()
  })

  it('il codice si scrive in localStorage al TOCCO, prima della risposta, senza nomi né telefoni', async () => {
    const salva = vi.fn(mai)
    monta(azioniFinte({ salva }))
    await userEvent.click(pulsante('Salva'))
    const codice = salva.mock.calls[0][1]
    expect(invii()).toEqual([{ codice, visitaId: VISITA, clienteId: MARIA, operatriceId: VERA, invio: 'salva', toccatoIl: expect.any(Number) }])
    expect(window.localStorage.getItem('avstyle.invii')).not.toContain('Maria')
  })

  it('il record porta il tipo d invio: «Togli» e «Elimina visita» non sono «Salva»', async () => {
    monta(azioniFinte())
    await userEvent.click(within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }))
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Conferma' })).getByRole('button', { name: 'Togli' }))
    expect(invii().map((x) => x.invio)).toEqual(['togli'])
    cleanup()
    window.localStorage.clear()
    monta(azioniFinte())
    await userEvent.click(pulsante('Elimina visita'))
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Conferma' })).getByRole('button', { name: 'Elimina' }))
    expect(invii().map((x) => x.invio)).toEqual(['elimina'])
  })

  it('e si cancella alla risposta definitiva', async () => {
    monta(azioniFinte({ salva: vi.fn(async () => salvata) }))
    await userEvent.click(pulsante('Salva'))
    await waitFor(() => expect(invii()).toEqual([]))
  })

  it('la gemella: un «Non so» del server NON lo cancella, perché l invio può ancora arrivare', async () => {
    monta(azioniFinte({ salva: vi.fn(async (): Promise<Risposta> => ({ tipo: 'non_so' })) }))
    await userEvent.click(pulsante('Salva'))
    expect(await screen.findByText('Non so se è stata salvata')).toBeTruthy()
    expect(invii()).toHaveLength(1)
  })

  it('senza risposta entro il limite di D3-9: «Non so», «Salva» spento e il solo «Controlla»', async () => {
    monta(azioniFinte({ salva: vi.fn(mai) }))
    expect(screen.queryByRole('button', { name: 'Controlla' })).toBeNull()
    await userEvent.click(pulsante('Salva'))
    expect(await screen.findByText('Non so se è stata salvata')).toBeTruthy()
    expect(pulsante('Salva').disabled).toBe(true)
    expect(pulsante('Elimina visita').disabled).toBe(true)
    expect(pulsante('Controlla').disabled).toBe(false)
  })

  it('«Controlla» manda lo STESSO codice dell invio, e dopo la riga 1 `annullato` «Salva» riparte con le versioni di partenza (C1)', async () => {
    const salva = vi.fn<AzioniScheda['salva']>().mockImplementation(mai)
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: LETTO }))
    monta(azioniFinte({ salva }), controlla)
    await userEvent.selectOptions(within(servizioAlle('10:00')).getByLabelText('Minuti d’inizio'), '10')
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    expect(controlla).toHaveBeenCalledWith(salva.mock.calls[0][1], VISITA)
    expect(await screen.findByText('Non risulta salvata: l’invio non ha scritto nulla')).toBeTruthy()
    expect(invii()).toEqual([])
    // la modifica dell'operatrice c'è ancora, e il servizio NON è dove l'ha messo la collega
    expect(servizioAlle('10:10')).toBeTruthy()
    await userEvent.click(pulsante('Salva'))
    const [seconda, codice] = salva.mock.calls[1] as unknown as [SchedaSerializzata, string]
    expect(seconda.versioneVisita).toBe(STATO_ATTIVO.visita)
    expect(seconda.attesi).toEqual([{ id: A1, versione: 'v1' }, { id: A2, versione: 'v2' }])
    expect(codice).not.toBe(salva.mock.calls[0][1])
  })

  it('la risposta tardiva dell invio abbandonato non tocca più la scheda (numero di generazione)', async () => {
    const tardiva = differita<Risposta>()
    const salva = vi.fn<AzioniScheda['salva']>().mockReturnValueOnce(tardiva.promessa)
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: LETTO }))
    const { onFatto } = monta(azioniFinte({ salva }), controlla)
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    expect(await screen.findByText('Non risulta salvata: l’invio non ha scritto nulla')).toBeTruthy()
    await act(async () => {
      tardiva.risolvi(salvata)
      await tardiva.promessa
    })
    expect(onFatto).not.toHaveBeenCalled()
    expect(screen.getByText('Non risulta salvata: l’invio non ha scritto nulla')).toBeTruthy()
    expect(pulsante('Salva').disabled).toBe(false)
  })

  it('la gemella: scaduto il limite ma senza «Controlla», la risposta che arriva si applica ancora', async () => {
    const tardiva = differita<Risposta>()
    const { onFatto } = monta(azioniFinte({ salva: vi.fn<AzioniScheda['salva']>().mockReturnValueOnce(tardiva.promessa) }))
    await userEvent.click(pulsante('Salva'))
    expect(await screen.findByText('Non so se è stata salvata')).toBeTruthy()
    await act(async () => {
      tardiva.risolvi(salvata)
      await tardiva.promessa
    })
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('✓ Salvata'))
    expect(invii()).toEqual([])
  })

  it('«Controlla» che trova la visita uguale: «✓ Risulta salvata», e la scheda si chiude', async () => {
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 2 as const, esito_invio: 'salvata' as const, stato: STATO_ATTIVO }))
    const { onFatto } = monta(azioniFinte({ salva: vi.fn(mai) }), controlla)
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('✓ Risulta salvata'))
  })

  it('riga 1 con `non_trovata`: la scheda adotta lo stato letto, e la modifica non inviata si perde', async () => {
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'non_trovata' as const, stato: LETTO }))
    const salva = vi.fn<AzioniScheda['salva']>().mockImplementation(mai)
    monta(azioniFinte({ salva }), controlla)
    await userEvent.selectOptions(within(servizioAlle('10:00')).getByLabelText('Minuti d’inizio'), '10')
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    expect(await screen.findByText('Non risulta salvata: l’invio non ha scritto nulla')).toBeTruthy()
    expect(servizioAlle('10:20')).toBeTruthy()
    await userEvent.click(pulsante('Salva'))
    expect((salva.mock.calls[1] as unknown as [SchedaSerializzata])[0].versioneVisita).toBe(LETTO.visita)
  })

  it('un «Controlla» che fallisce dà di nuovo «Non so», con «Controlla» ancora disponibile', async () => {
    const controlla = vi.fn(async () => ({ tipo: 'non_so' as const }))
    monta(azioniFinte({ salva: vi.fn(mai) }), controlla)
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    await waitFor(() => expect(controlla).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Non so se è stata salvata')).toBeTruthy()
    expect(pulsante('Controlla').disabled).toBe(false)
    expect(pulsante('Salva').disabled).toBe(true)
    expect(invii()).toHaveLength(1)
  })

  it('dopo la riga 1 di un «Togli» si riaccende «Togli», con la stessa conferma', async () => {
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: STATO_ATTIVO }))
    const togli = vi.fn<AzioniScheda['togli']>().mockImplementation(mai)
    monta(azioniFinte({ togli }), controlla)
    await userEvent.click(within(servizioAlle('11:40')).getByRole('button', { name: 'Togli' }))
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Conferma' })).getByRole('button', { name: 'Togli' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    const dialogo = await screen.findByRole('alertdialog', { name: 'Conferma' })
    expect(within(dialogo).getByText('Togliere questo servizio dalla visita?')).toBeTruthy()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Togli' }))
    expect((togli.mock.calls[1] as unknown as [SchedaSerializzata])[0].servizi.map((s) => s.id)).toEqual([A1])
  })

  it('riga 4: «Crea di nuovo» con id nuovi e un codice nuovo', async () => {
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 4 as const, esito_invio: 'salvata' as const, stato: null }))
    const salva = vi.fn<AzioniScheda['salva']>().mockImplementation(mai)
    monta(azioniFinte({ salva }), controlla)
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    expect(await screen.findByText('È stata cancellata dopo il salvataggio')).toBeTruthy()
    await userEvent.click(pulsante('Crea di nuovo'))
    const [nuova, codice] = salva.mock.calls[1] as unknown as [SchedaSerializzata, string]
    expect(nuova.visitaId).not.toBe(VISITA)
    expect(nuova.modo).toBe('creazione')
    expect(nuova.servizi.map((s) => s.id)).not.toContain(A1)
    expect(nuova.cliente).toEqual({ tipo: 'esistente', id: MARIA })
    expect(codice).not.toBe(salva.mock.calls[0][1])
  })

  it('dopo «La cliente è stata cancellata» (23503) la riga 4 NON offre «Crea di nuovo»', async () => {
    const m = { ...nessuno, testo: 'La cliente è stata cancellata' }
    const salva = vi
      .fn<AzioniScheda['salva']>()
      .mockResolvedValueOnce({ tipo: 'fallita', sqlstate: '23503', testo: m.testo, messaggio: m })
      .mockImplementation(mai)
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 4 as const, esito_invio: 'salvata' as const, stato: null }))
    const { onFatto } = monta(azioniFinte({ salva }), controlla)
    await userEvent.click(pulsante('Salva'))
    expect(await screen.findByText('La cliente è stata cancellata')).toBeTruthy()
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('È stata cancellata dopo il salvataggio'))
    expect(screen.queryByRole('button', { name: 'Crea di nuovo' })).toBeNull()
  })

  it('una risposta che arriva DOPO la chiusura della scheda si scarta, e il codice resta per la striscia', async () => {
    // «Chiudi» con l'invio in volo (§4.4, scheda abbandonata): senza scarto la
    // risposta chiamava `onFatto`, cioè `history.back()` su una scheda già chiusa.
    const tardiva = differita<Risposta>()
    const salva = vi.fn<AzioniScheda['salva']>().mockReturnValueOnce(tardiva.promessa)
    const { onFatto } = monta(azioniFinte({ salva }))
    await userEvent.click(pulsante('Salva'))
    cleanup()
    await act(async () => {
      tardiva.risolvi(salvata)
      await tardiva.promessa
    })
    expect(onFatto).not.toHaveBeenCalled()
    expect(invii()).toHaveLength(1)
  })

  it('durante «Non so» i campi sono spenti: una modifica non può sparire sotto un «✓ Risulta salvata» (B2)', async () => {
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: STATO_ATTIVO }))
    monta(azioniFinte({ salva: vi.fn(mai) }), controlla)
    await userEvent.click(pulsante('Salva'))
    expect(await screen.findByRole('button', { name: 'Controlla' })).toBeTruthy()
    const campi = () => [
      within(servizioAlle('10:00')).getByLabelText('Minuti d’inizio'),
      within(servizioAlle('10:00')).getByLabelText('Operatrice'),
      screen.getByLabelText('Aggiungi servizio'),
      screen.getByLabelText('Data'),
    ] as (HTMLSelectElement | HTMLInputElement)[]
    // `:disabled` e non `.disabled`: un campo dentro un fieldset spento è spento
    // per il browser anche se la sua proprietà resta falsa.
    expect(campi().map((c) => c.matches(':disabled'))).toEqual([true, true, true, true])
    // la gemella: dopo la riga 1 si torna a scrivere
    await userEvent.click(pulsante('Controlla'))
    expect(await screen.findByText('Non risulta salvata: l’invio non ha scritto nulla')).toBeTruthy()
    expect(campi().map((c) => c.matches(':disabled'))).toEqual([false, false, false, false])
  })

  it('un `annullato` come risposta diretta dice che non è stata salvata, invece di sbloccarsi in silenzio', async () => {
    // Un'altra scheda del browser, o «Esci», può aver bruciato il codice.
    const salva = vi.fn(async (): Promise<Risposta> => ({ tipo: 'esito', esito: 'annullato', messaggio: { ...nessuno, testo: '' } }))
    monta(azioniFinte({ salva }))
    await userEvent.click(pulsante('Salva'))
    expect(await screen.findByText('Non risulta salvata: l’invio non ha scritto nulla')).toBeTruthy()
    expect(pulsante('Salva').disabled).toBe(false)
  })

  it('una scheda incerta da più di 24 ore non chiama «Controlla»: si chiude e rilegge il giorno (§4.4, vita della scheda)', async () => {
    let ora = Date.UTC(2026, 9, 6, 8, 0)
    const controlla = vi.fn(mai)
    const { onFatto } = monta(azioniFinte({ salva: vi.fn(mai) }), controlla, undefined, () => ora)
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }).then((b) => {
      ora += 24 * 60 * 60 * 1000 + 60_000
      return b
    }))
    expect(controlla).not.toHaveBeenCalled()
    await waitFor(() => expect(onFatto).toHaveBeenCalledWith('Questa scheda è rimasta aperta più di 24 ore: ricarico il giorno'))
  })

  it('la gemella: a 23 ore e 59 minuti «Controlla» parte', async () => {
    let ora = Date.UTC(2026, 9, 6, 8, 0)
    const controlla = vi.fn(mai)
    monta(azioniFinte({ salva: vi.fn(mai) }), controlla, undefined, () => ora)
    await userEvent.click(pulsante('Salva'))
    const b = await screen.findByRole('button', { name: 'Controlla' })
    ora += 24 * 60 * 60 * 1000 - 60_000
    await userEvent.click(b)
    expect(controlla).toHaveBeenCalledTimes(1)
  })

  it('«Controlla» con l account chiuso è l uscita forzata', async () => {
    const errori = vi.spyOn(console, 'error').mockImplementation(() => {})
    const controlla = vi.fn(async () => {
      throw new UscitaForzata()
    })
    monta(azioniFinte({ salva: vi.fn(mai) }), controlla)
    await userEvent.click(pulsante('Salva'))
    await userEvent.click(await screen.findByRole('button', { name: 'Controlla' }))
    await waitFor(() => expect(JSON.stringify(errori.mock.calls.map((c) => String(c[0])))).toContain('navigation'))
  })
})

describe('la scheda aperta da un gesto fermato dal server (Task 10, §5.1)', () => {
  // Il trascinamento apre la scheda con `ApriScheda` quando il server risponde
  // `da_confermare` o con un conflitto: gli appuntamenti nella posizione del
  // gesto, e gli avvisi che la posizione letta aveva già passati come confermati.
  function Apri({ a }: { a: Apertura }) {
    const apri = useContext(ApriScheda)
    return (
      <button type="button" onClick={() => apri(a)}>
        apri dal gesto
      </button>
    )
  }
  const monta = async (inizioA2: number) => {
    const r = richieste()
    render(
      <SchedaDellAgenda data={DATA} occupati={[]} richieste={r} azioni={azioniFinte()} io={VERA}>
        <Apri a={{ tipo: 'visita', visitaId: VISITA, data: DATA, sposta: [{ id: A2, inizio: inizioA2 }] }} />
      </SchedaDellAgenda>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'apri dal gesto' }))
    return r
  }

  it('si apre con l appuntamento nella posizione del gesto, e l avviso NUOVO ferma «Salva»', async () => {
    // Alessandra lavora fino alle 19:00: alle 19:10 il massaggio è fuori orario.
    await monta(230)
    expect(await screen.findByRole('listitem', { name: /alle 19:10$/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Salva comunque/ })).toBeTruthy()
  })

  it('la gemella: l avviso che la posizione letta aveva già (Annalisa non lavora) passa come confermato', async () => {
    await monta(150)
    expect(await screen.findByRole('listitem', { name: /alle 12:30$/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Salva comunque/ })).toBeNull()
    expect(screen.getByRole('button', { name: /^Salva$/ })).toBeTruthy()
  })
})
