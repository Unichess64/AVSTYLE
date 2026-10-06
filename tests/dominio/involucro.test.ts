// tests/dominio/involucro.test.ts
//
// L'involucro unico di §4.2 e il riconoscimento di uno SQLSTATE (§4.3 passo 8).
// Niente database: gira anche in test:fuso.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { avvolgi, sqlstateDi } from '../../src/server/involucro'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sqlstateDi', () => {
  it('PGRST116 non è uno sqlstate', () => {
    expect(sqlstateDi({ code: 'PGRST116' })).toBeNull()
  })

  it('la gemella: 23505 lo è', () => {
    expect(sqlstateDi({ code: '23505' })).toBe('23505')
    expect(sqlstateDi({ code: '40P01' })).toBe('40P01')
  })

  it('un guasto senza codice, o con un codice vuoto, non ne ha uno', () => {
    expect(sqlstateDi(new Error('fetch failed'))).toBeNull()
    expect(sqlstateDi({ code: '' })).toBeNull()
    expect(sqlstateDi(null)).toBeNull()
  })
})

describe('avvolgi', () => {
  it('lascia passare il valore del corpo', async () => {
    expect(await avvolgi('invio', 'id-1', async () => 42)).toBe(42)
  })

  it('un errore con SQLSTATE di un invio prova l annullamento; senza, è «Non so»', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await avvolgi('invio', 'id-1', async () => { throw { code: '22023' } })).toEqual({ tipo: 'annullato', sqlstate: '22023', proprio: false })
    expect(await avvolgi('invio', 'id-1', async () => { throw new Error('rete') })).toEqual({ tipo: 'non_so' })
  })

  it('nel log solo il codice e l id, mai details, hint né il messaggio (§4.9)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await avvolgi('invio', 'id-7', async () => {
      throw { code: '23514', message: 'Maria Rossi', details: 'Failing row contains (Maria Rossi, 31, 4)', hint: 'x' }
    })
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]).toEqual(['invio: guasto', { code: '23514', id: 'id-7' }])
    expect(JSON.stringify(log.mock.calls)).not.toContain('Maria')
  })
})
