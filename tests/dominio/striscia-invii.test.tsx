// @vitest-environment jsdom
//
// tests/dominio/striscia-invii.test.tsx
//
// La striscia degli invii pendenti in testa all'agenda (D2-4) e «Esci» che
// controlla prima di chiudere la sessione (spec 3a §4.4 punti 2-4). Niente
// Supabase: «Controlla» è finto, e la prova gira anche in test:fuso.
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PulsanteEsci, StrisciaInvii } from '../../src/cliente/striscia-invii'
import { CHIAVE, type InvioPendente, registraInvio } from '../../src/dominio/invii-pendenti'

const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const ORE = 60 * 60 * 1000

let n = 0
function invio(altro: Partial<InvioPendente> = {}): InvioPendente {
  n += 1
  return {
    codice: `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    visitaId: `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    clienteId: null,
    operatriceId: VERA,
    invio: 'salva',
    toccatoIl: Date.now() - ORE,
    ...altro,
  }
}
const metti = (...xs: InvioPendente[]) => window.localStorage.setItem(CHIAVE, JSON.stringify(xs))
const rimasti = () => (JSON.parse(window.localStorage.getItem(CHIAVE) ?? '[]') as InvioPendente[]).map((x) => x.codice)
const mai = () => new Promise<never>(() => {})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('D2-4: la striscia alla riapertura', () => {
  it('controlla i soli codici dell operatrice entrata, e dice quanti sono da controllare', async () => {
    const mio1 = invio()
    const mio2 = invio()
    const suo = invio({ operatriceId: ALESSANDRA })
    const vecchio = invio({ toccatoIl: Date.now() - 25 * ORE })
    metti(mio1, mio2, suo, vecchio)
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: null }))
    render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => null} />)
    expect(await screen.findByRole('button', { name: '2 salvataggi da controllare' })).toBeTruthy()
    await waitFor(() => expect(controlla).toHaveBeenCalledTimes(2))
    expect(controlla.mock.calls.map((c) => c[0]).sort()).toEqual([mio1.codice, mio2.codice].sort())
    // il vecchio è buttato senza controllarlo, quello di Alessandra resta per
    // lei, e i due controllati restano finché l'esito non si vede (B1)
    await waitFor(() => expect(rimasti().sort()).toEqual([mio1.codice, mio2.codice, suo.codice].sort()))
  })

  it('un esito mai mostrato non si perde: senza aprire la striscia il codice resta, e alla riapertura si rivede (B1)', async () => {
    const a = invio()
    metti(a)
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: null }))
    const primo = render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => null} />)
    await waitFor(() => expect(controlla).toHaveBeenCalledTimes(1))
    expect(rimasti()).toEqual([a.codice])
    primo.unmount()
    render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => null} />)
    await userEvent.click(await screen.findByRole('button', { name: '1 salvataggio da controllare' }))
    expect(await screen.findByText(/non risulta salvato/)).toBeTruthy()
    // ora l'esito si è visto: il codice si toglie
    await waitFor(() => expect(rimasti()).toEqual([]))
  })

  it('un invio ancora in volo in un altra scheda del browser non si brucia: si aspetta, e se finisce lì non si controlla', async () => {
    const recente = invio({ toccatoIl: Date.now() - 100 })
    const finito = invio({ toccatoIl: Date.now() - 100 })
    metti(recente, finito)
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 2 as const, esito_invio: 'salvata' as const, stato: null }))
    render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => null} vitaInvioMs={500} />)
    await new Promise((r) => setTimeout(r, 50))
    expect(controlla).not.toHaveBeenCalled()
    // l'altra scheda riceve la risposta definitiva e toglie il suo codice
    metti(recente)
    await waitFor(() => expect(controlla).toHaveBeenCalledTimes(1), { timeout: 1_000 })
    expect(controlla.mock.calls[0][0]).toBe(recente.codice)
  })

  it('si apre a richiesta e mostra l esito di ciascuno, con il nome solo se letto', async () => {
    // Due ore fa e un'ora fa: nel passato, e dentro le 24 ore.
    const a = invio({ toccatoIl: Date.now() - 2 * ORE })
    const b = invio({ toccatoIl: Date.now() - ORE })
    const ora = (t: number) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t)
    metti(a, b)
    const stato = { visita: 'v', data: '2026-10-08', cliente: 'c', appuntamenti: [] }
    const controlla = vi.fn(async (codice: string) =>
      codice === a.codice
        ? { tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: null }
        : { tipo: 'riga' as const, riga: 2 as const, esito_invio: 'salvata' as const, stato },
    )
    render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => 'Lucia Bianchi'} />)
    expect(screen.queryByText(/non risulta salvato/)).toBeNull()
    await userEvent.click(await screen.findByRole('button', { name: '2 salvataggi da controllare' }))
    expect(await screen.findByText(`Il salvataggio delle ${ora(a.toccatoIl)} non risulta salvato`)).toBeTruthy()
    expect(await screen.findByText(`✓ Il salvataggio delle ${ora(b.toccatoIl)} per Lucia Bianchi risulta salvato`)).toBeTruthy()
  })

  it('un «Controlla» che fallisce lascia il codice in memoria, e si può ritentare', async () => {
    const a = invio()
    metti(a)
    const controlla = vi
      .fn()
      .mockResolvedValueOnce({ tipo: 'non_so' })
      .mockResolvedValueOnce({ tipo: 'riga', riga: 1, esito_invio: 'annullato', stato: null })
    render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => null} />)
    await userEvent.click(await screen.findByRole('button', { name: '1 salvataggio da controllare' }))
    expect(await screen.findByText(/Non so se è stato salvato/)).toBeTruthy()
    expect(rimasti()).toEqual([a.codice])
    await userEvent.click(screen.getByRole('button', { name: 'Controlla di nuovo' }))
    await waitFor(() => expect(rimasti()).toEqual([]))
  })

  it('senza invii pendenti non c è nessuna striscia', () => {
    metti(invio({ operatriceId: ALESSANDRA }))
    const controlla = vi.fn()
    const { container } = render(<StrisciaInvii io={VERA} controlla={controlla} nomeDi={async () => null} />)
    expect(container.textContent).toBe('')
    expect(controlla).not.toHaveBeenCalled()
  })
})

describe('l abbandono della pagina (§4.4 punti 1 e 2)', () => {
  it('`pagehide` con la pagina scartata manda «Controlla» in keepalive per gli invii DI QUESTA PAGINA; con `persisted` no', () => {
    const altrui = invio()
    metti(altrui)
    const a = invio()
    registraInvio(window.localStorage, a)
    const keepalive = vi.fn()
    render(<StrisciaInvii io={VERA} controlla={vi.fn(mai)} controllaAllAbbandono={keepalive} nomeDi={async () => null} />)
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    })
    expect(keepalive).not.toHaveBeenCalled()
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
    })
    expect(keepalive.mock.calls).toEqual([[a.codice, a.visitaId]])
  })

  it('lasciare la pagina con un invio pendente DI QUESTA PAGINA chiede conferma; con un codice vecchio di un altra no', () => {
    render(<StrisciaInvii io={VERA} controlla={vi.fn(mai)} nomeDi={async () => null} />)
    metti(invio())
    const senza = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(senza)
    expect(senza.defaultPrevented).toBe(false)
    registraInvio(window.localStorage, invio())
    const con = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(con)
    expect(con.defaultPrevented).toBe(true)
  })
})

describe('«Esci» (§4.4 punto 4)', () => {
  it('«Esci» controlla prima di chiudere la sessione', async () => {
    const a = invio()
    metti(a)
    const ordine: string[] = []
    const controlla = vi.fn(async () => {
      ordine.push('controlla')
      return { tipo: 'riga' as const, riga: 2 as const, esito_invio: 'salvata' as const, stato: null }
    })
    const esci = vi.fn(async () => void ordine.push('esci'))
    render(<PulsanteEsci io={VERA} esci={esci} controlla={controlla} />)
    await userEvent.click(screen.getByRole('button', { name: 'Esci' }))
    await waitFor(() => expect(esci).toHaveBeenCalled())
    expect(ordine).toEqual(['controlla', 'esci'])
    expect(rimasti()).toEqual([])
  })

  it('un esito da guardare si mostra prima di uscire', async () => {
    const t = Date.now() - ORE
    metti(invio({ toccatoIl: t }))
    const esci = vi.fn(async () => {})
    const controlla = vi.fn(async () => ({ tipo: 'riga' as const, riga: 1 as const, esito_invio: 'annullato' as const, stato: null }))
    render(<PulsanteEsci io={VERA} esci={esci} controlla={controlla} />)
    await userEvent.click(screen.getByRole('button', { name: 'Esci' }))
    const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t)
    expect(await screen.findByText(`Il salvataggio delle ${ora} non risulta salvato`)).toBeTruthy()
    expect(esci).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Esci ora' }))
    expect(esci).toHaveBeenCalled()
  })

  it('oltre il limite «Esci comunque»: i codici restano e si controllano alla riapertura', async () => {
    const a = invio()
    metti(a)
    const esci = vi.fn(async () => {})
    render(<PulsanteEsci io={VERA} esci={esci} controlla={vi.fn(mai)} limiteMs={30} />)
    await userEvent.click(screen.getByRole('button', { name: 'Esci' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Esci comunque' }))
    expect(esci).toHaveBeenCalled()
    expect(rimasti()).toEqual([a.codice])
  })

  it('un «Controlla» che risponde DOPO il limite non toglie il codice: l esito non l ha visto nessuno', async () => {
    // Misurato in `next start`: dopo «Esci comunque» il «Controlla» in volo
    // rispondeva e cancellava il codice, e alla riapertura non restava niente.
    const a = invio()
    metti(a)
    let risolvi!: (r: { tipo: 'riga'; riga: 1; esito_invio: 'annullato'; stato: null }) => void
    const tardivo = new Promise<{ tipo: 'riga'; riga: 1; esito_invio: 'annullato'; stato: null }>((r) => (risolvi = r))
    render(<PulsanteEsci io={VERA} esci={vi.fn(async () => {})} controlla={vi.fn(() => tardivo)} limiteMs={30} />)
    await userEvent.click(screen.getByRole('button', { name: 'Esci' }))
    expect(await screen.findByRole('button', { name: 'Esci comunque' })).toBeTruthy()
    await act(async () => {
      risolvi({ tipo: 'riga', riga: 1, esito_invio: 'annullato', stato: null })
      await tardivo
    })
    expect(rimasti()).toEqual([a.codice])
  })

  it('senza invii pendenti «Esci» esce subito', async () => {
    const esci = vi.fn(async () => {})
    const controlla = vi.fn()
    render(<PulsanteEsci io={VERA} esci={esci} controlla={controlla} />)
    await userEvent.click(screen.getByRole('button', { name: 'Esci' }))
    expect(esci).toHaveBeenCalled()
    expect(controlla).not.toHaveBeenCalled()
  })
})
