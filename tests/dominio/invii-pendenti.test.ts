// tests/dominio/invii-pendenti.test.ts
//
// Gli invii pendenti in `localStorage` (spec 3a §4.4 punto 3, §4.9; piano 3a-2
// Task 9). Il meccanismo che regge anche su iPhone: il telefono tiene il
// codice dal tocco alla risposta definitiva, e alla riapertura lo passa da
// «Controlla». Solo identificativi casuali e l'istante del tocco.
import { describe, expect, it, vi } from 'vitest'
import {
  CHIAVE,
  type InvioPendente,
  alPagehide,
  daControllare,
  fraseDelPendente,
  leggiInvii,
  registraInvio,
  togliInvio,
} from '../../src/dominio/invii-pendenti'

const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const ORA = Date.UTC(2026, 9, 8, 8, 4) // 10:04 a Perugia (ora legale)
const ORE = 60 * 60 * 1000

/** Un `localStorage` finto: lo stesso contratto, e un elenco di chiavi da guardare. */
function deposito(): Storage & { righe: Map<string, string> } {
  const righe = new Map<string, string>()
  return {
    righe,
    get length() {
      return righe.size
    },
    clear: () => righe.clear(),
    getItem: (k) => righe.get(k) ?? null,
    setItem: (k, v) => void righe.set(k, String(v)),
    removeItem: (k) => void righe.delete(k),
    key: (i) => [...righe.keys()][i] ?? null,
  }
}

let n = 0
function invio(altro: Partial<InvioPendente> = {}): InvioPendente {
  n += 1
  return {
    codice: `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    visitaId: `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    clienteId: '40000000-0000-4000-8000-000000000001',
    operatriceId: VERA,
    toccatoIl: ORA,
    ...altro,
  }
}

describe('scrivere e cancellare (§4.4 punto 3)', () => {
  it('un invio registrato si ritrova subito, sotto avstyle.invii', () => {
    const d = deposito()
    const i = invio()
    registraInvio(d, i)
    expect([...d.righe.keys()]).toEqual([CHIAVE])
    expect(CHIAVE).toBe('avstyle.invii')
    expect(leggiInvii(d)).toEqual([i])
  })

  it('il codice si cancella alla risposta DEFINITIVA, e gli altri restano', () => {
    const d = deposito()
    const a = invio()
    const b = invio()
    registraInvio(d, a)
    registraInvio(d, b)
    togliInvio(d, a.codice)
    expect(leggiInvii(d)).toEqual([b])
  })
})

describe('chi si controlla alla riapertura', () => {
  it('un codice più vecchio di 24 ore si butta SENZA controllarlo', () => {
    // §4.4 punto 3: «Controlla» su un codice già ripulito direbbe «non risulta
    // salvato» di un invio che era stato salvato.
    const d = deposito()
    const vecchio = invio({ toccatoIl: ORA - 24 * ORE - 1 })
    registraInvio(d, vecchio)
    expect(daControllare(d, VERA, ORA)).toEqual([])
    expect(leggiInvii(d)).toEqual([]) // buttato, non lasciato lì
  })

  it('la gemella: un codice di 23 ore e 59 minuti si controlla', () => {
    const d = deposito()
    const quasi = invio({ toccatoIl: ORA - 24 * ORE + 60_000 })
    registraInvio(d, quasi)
    expect(daControllare(d, VERA, ORA)).toEqual([quasi])
  })

  it('si controllano solo i codici DELLA STESSA operatrice che ha fatto l accesso', () => {
    const d = deposito()
    const mio = invio()
    const suo = invio({ operatriceId: ALESSANDRA })
    registraInvio(d, mio)
    registraInvio(d, suo)
    expect(daControllare(d, VERA, ORA)).toEqual([mio])
  })

  it('la gemella: i codici di un altra operatrice restano lì, anche vecchi, per quando rientra lei', () => {
    const d = deposito()
    const suo = invio({ operatriceId: ALESSANDRA })
    registraInvio(d, suo)
    daControllare(d, VERA, ORA)
    expect(leggiInvii(d)).toEqual([suo])
    expect(daControllare(d, ALESSANDRA, ORA)).toEqual([suo])
  })
})

describe('§4.9: solo identificativi casuali e un orario', () => {
  it('il record non contiene nomi né numeri di telefono: le chiavi sono esattamente quelle dichiarate', () => {
    const d = deposito()
    // Chi chiama passasse anche un nome, non arriverebbe nel telefono.
    registraInvio(d, { ...invio(), nome: 'Maria Rossi', telefono: '+393331234567' } as InvioPendente)
    const salvato = JSON.parse(d.righe.get(CHIAVE)!) as Record<string, unknown>[]
    expect(Object.keys(salvato[0]).sort()).toEqual(['clienteId', 'codice', 'operatriceId', 'toccatoIl', 'visitaId'])
    expect(d.righe.get(CHIAVE)).not.toContain('Maria')
    expect(d.righe.get(CHIAVE)).not.toContain('333')
  })

  it('il nome della cliente compare solo se letto dal database', () => {
    const i = invio()
    const r = { riga: 1, esito_invio: 'annullato', stato: null } as const
    expect(fraseDelPendente(i, r, null)).toBe('Il salvataggio delle 10:04 non risulta salvato')
    expect(fraseDelPendente(i, r, 'Maria Rossi')).toBe('Il salvataggio delle 10:04 per Maria Rossi non risulta salvato')
  })

  it('le altre righe hanno la loro frase, e il ✓ solo dove §4.4 lo dà', () => {
    const i = invio()
    const stato = { visita: 'v', data: '2026-10-08', cliente: i.clienteId!, appuntamenti: [] }
    expect(fraseDelPendente(i, { riga: 2, esito_invio: 'salvata', stato }, null)).toBe('✓ Il salvataggio delle 10:04 risulta salvato')
    expect(fraseDelPendente(i, { riga: 7, esito_invio: 'cancellata', stato: null }, null)).toBe('✓ La cancellazione delle 10:04 risulta fatta')
    expect(fraseDelPendente(i, { riga: 4, esito_invio: 'salvata', stato: null }, null)).toBe(
      'Il salvataggio delle 10:04 risulta salvato, ma la visita è stata cancellata dopo',
    )
    expect(fraseDelPendente(i, { riga: 6, esito_invio: 'modificata_altrove', stato }, null)).toBe(
      'Il salvataggio delle 10:04 non risulta salvato: la visita era stata cambiata da un’altra parte',
    )
  })
})

describe('il contorno: un telefono in navigazione privata', () => {
  it('localStorage assente, che solleva o pieno non fa cadere l app', () => {
    const rotto = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    } as unknown as Storage
    for (const d of [null, rotto]) {
      expect(() => registraInvio(d, invio())).not.toThrow()
      expect(() => togliInvio(d, 'x')).not.toThrow()
      expect(leggiInvii(d)).toEqual([])
      expect(daControllare(d, VERA, ORA)).toEqual([])
    }
  })

  it('un valore storto si legge come vuoto, e le righe storte si scartano', () => {
    const d = deposito()
    d.setItem(CHIAVE, '{non json')
    expect(leggiInvii(d)).toEqual([])
    const buono = invio()
    d.setItem(CHIAVE, JSON.stringify([buono, { codice: 3 }, null]))
    expect(leggiInvii(d)).toEqual([buono])
  })
})

describe('l abbandono della pagina (§4.4 punto 2)', () => {
  it('`pagehide` con `persisted === true` non manda niente: su iPhone è il passaggio a un altra app', () => {
    const manda = vi.fn()
    alPagehide(true, [invio()], manda)
    expect(manda).not.toHaveBeenCalled()
  })

  it('la gemella: con la pagina davvero scartata parte un «Controlla» per ogni invio pendente', () => {
    const manda = vi.fn()
    const a = invio()
    const b = invio()
    alPagehide(false, [a, b], manda)
    expect(manda.mock.calls).toEqual([
      [a.codice, a.visitaId],
      [b.codice, b.visitaId],
    ])
  })
})
