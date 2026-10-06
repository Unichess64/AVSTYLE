// tests/dominio/preferenze.test.ts
//
// D2-1: la vista colonne/lista e l'operatrice della settimana si ricordano in
// `localStorage`. Il server non lo vede: lo script in testa all'agenda sceglie
// la vista PRIMA della prima pittura. Si valuta lo script vero, con un
// documento, un `localStorage` e un `location` finti.
import { describe, expect, it, vi } from 'vitest'
import {
  CHIAVE_OPERATRICE,
  CHIAVE_VISTA,
  SCRIPT_PREFERENZE,
  leggiPreferenza,
  scriviPreferenza,
} from '../../src/cliente/preferenze'

const ID = '10000000-0000-4000-8000-000000000001'

function esegui(memoria: Record<string, string> | 'rotto', search: string) {
  const attributi: Record<string, string> = {}
  const documento = { documentElement: { setAttribute: (k: string, v: string) => (attributi[k] = v) } }
  const archivio =
    memoria === 'rotto'
      ? { getItem: () => { throw new Error('SecurityError') } }
      : { getItem: (k: string) => memoria[k] ?? null }
  const replace = vi.fn()
  const posizione = { pathname: '/agenda', search, replace }
  new Function('document', 'localStorage', 'location', SCRIPT_PREFERENZE)(documento, archivio, posizione)
  return { attributi, replace }
}

describe('lo script delle preferenze, prima della prima pittura', () => {
  it('la lista ricordata mette data-vista sull html; le colonne no', () => {
    expect(esegui({ [CHIAVE_VISTA]: 'lista' }, '').attributi).toEqual({ 'data-vista': 'lista' })
    expect(esegui({ [CHIAVE_VISTA]: 'colonne' }, '').attributi).toEqual({})
    expect(esegui({ [CHIAVE_VISTA]: 'qualunque' }, '').attributi).toEqual({})
    expect(esegui({}, '').attributi).toEqual({})
  })

  it('l operatrice ricordata riapre la sua settimana, tenendo il giorno', () => {
    const { replace } = esegui({ [CHIAVE_OPERATRICE]: ID }, '?giorno=2026-10-07')
    expect(replace).toHaveBeenCalledWith(`/agenda?giorno=2026-10-07&settimana=${ID}`)
    const senzaGiorno = esegui({ [CHIAVE_OPERATRICE]: ID }, '')
    expect(senzaGiorno.replace).toHaveBeenCalledWith(`/agenda?settimana=${ID}`)
  })

  it('niente ricarica se la settimana è già nell indirizzo, o se il valore non è un id', () => {
    expect(esegui({ [CHIAVE_OPERATRICE]: ID }, `?settimana=${ID}`).replace).not.toHaveBeenCalled()
    expect(esegui({ [CHIAVE_OPERATRICE]: 'x&y=1' }, '').replace).not.toHaveBeenCalled()
    expect(esegui({}, '?giorno=2026-10-07').replace).not.toHaveBeenCalled()
    // un giorno storto non si ricopia nell'indirizzo
    expect(esegui({ [CHIAVE_OPERATRICE]: ID }, '?giorno=x%26y').replace).toHaveBeenCalledWith(`/agenda?settimana=${ID}`)
  })

  it('con localStorage che solleva (navigazione privata) lo script non rompe la pagina', () => {
    expect(() => esegui('rotto', '')).not.toThrow()
    expect(esegui('rotto', '').attributi).toEqual({})
  })
})

describe('leggiPreferenza e scriviPreferenza: mai un errore verso la pagina', () => {
  it('leggono e scrivono quando localStorage c è', () => {
    const memoria = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => memoria.set(k, v),
      removeItem: (k: string) => memoria.delete(k),
    })
    try {
      scriviPreferenza(CHIAVE_VISTA, 'lista')
      expect(leggiPreferenza(CHIAVE_VISTA)).toBe('lista')
      scriviPreferenza(CHIAVE_VISTA, null)
      expect(leggiPreferenza(CHIAVE_VISTA)).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('con localStorage che solleva, o assente, leggono null e scrivono niente', () => {
    const rotto = () => {
      throw new Error('QuotaExceededError')
    }
    vi.stubGlobal('localStorage', { getItem: rotto, setItem: rotto, removeItem: rotto })
    try {
      expect(leggiPreferenza(CHIAVE_VISTA)).toBeNull()
      expect(() => scriviPreferenza(CHIAVE_VISTA, 'lista')).not.toThrow()
      expect(() => scriviPreferenza(CHIAVE_VISTA, null)).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
    vi.stubGlobal('localStorage', undefined)
    try {
      expect(leggiPreferenza(CHIAVE_OPERATRICE)).toBeNull()
      expect(() => scriviPreferenza(CHIAVE_OPERATRICE, ID)).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
