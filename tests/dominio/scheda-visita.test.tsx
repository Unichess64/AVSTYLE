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
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
import { AgendaColonne } from '../../src/cliente/agenda-colonne'
import { AgendaLista } from '../../src/cliente/agenda-lista'
import { SchedaDellAgenda } from '../../src/cliente/apri-scheda'
import type { RichiesteScheda } from '../../src/cliente/richieste-scheda'
import { SchedaCompilata } from '../../src/cliente/scheda-visita'
import { apriSchedaSuVisita, apriSchedaVuota } from '../../src/dominio/scheda'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import type { Giorno } from '../../src/server/lettura-giorno'
import type { RispostaApri } from '../../src/server/lettura-scheda'

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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  router.push.mockReset()
  router.replace.mockReset()
})

describe('D2-2: l elenco delle operatrici della scheda', () => {
  it('non contiene MAI una disattivata, e il suo servizio dice «non più attiva» con «Salva» spento', () => {
    render(
      <SchedaCompilata iniziale={apriSchedaSuVisita(STATO, VISITA)} dati={dati({ stato: STATO })} richieste={richieste()} azioni={{}} onVaiA={() => {}} />,
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
      <SchedaCompilata iniziale={apriSchedaSuVisita(STATO, VISITA)} dati={dati({ stato: STATO })} richieste={richieste()} azioni={{}} onVaiA={() => {}} />,
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
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={r} azioni={{}} onVaiA={() => {}} />)
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
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={r} azioni={{}} onVaiA={() => {}} />)
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
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste()} azioni={{}} onVaiA={() => {}} />)
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
    const salva = vi.fn()
    const s = apriSchedaVuota(DATA, VERA, 228)   // 19:00: Vera chiude alle 19:00
    render(<SchedaCompilata iniziale={{ ...s, cliente: { tipo: 'esistente', id: MARIA } }} dati={dati()} richieste={richieste()} azioni={{ salva }} onVaiA={() => {}} />)
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
      <SchedaDellAgenda data={DATA} occupati={[{ operatriceId: VERA, inizio: 120, durata: 19 }]} richieste={r}>
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
      <SchedaDellAgenda data={DATA} occupati={giorno.appuntamenti} richieste={r}>
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
      <SchedaDellAgenda data={DATA} occupati={giorno.appuntamenti} richieste={r}>
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
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste()} azioni={{}} onVaiA={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    expect(salvaSpento()).toBe(true)
    expect(screen.getByText('Scegli la cliente.')).toBeTruthy()
    await userEvent.type(screen.getByLabelText('Cerca la cliente per nome o telefono'), 'maria')
    await userEvent.click(await screen.findByRole('button', { name: 'Maria Rossi · +393331234567' }))
    expect(salvaSpento()).toBe(false)
  })

  it('un telefono non riconosciuto spegne «Salva» invece di sparire in silenzio (B1)', async () => {
    const salva = vi.fn()
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste({ doppioni: vi.fn(async () => []) })} azioni={{ salva }} onVaiA={() => {}} />)
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
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={conMaria} richieste={richieste()} azioni={{}} onVaiA={onVaiA} />)
    await userEvent.selectOptions(screen.getByLabelText('Aggiungi servizio'), REFILL)
    expect(screen.getByRole('alert').textContent).toContain('Vera ha un appuntamento alle 10:30 con Maria Rossi')
    await userEvent.click(screen.getByRole('button', { name: 'Vai lì' }))
    expect(onVaiA).toHaveBeenCalledWith(A2, DATA)
  })

  it('un conflitto fra due servizi della scheda non offre «Vai lì», che chiuderebbe la scheda (C2)', async () => {
    render(<SchedaCompilata iniziale={apriSchedaVuota(DATA, VERA, 120)} dati={dati()} richieste={richieste()} azioni={{}} onVaiA={() => {}} />)
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
      <SchedaDellAgenda data={DATA} occupati={[]} richieste={r}>
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
