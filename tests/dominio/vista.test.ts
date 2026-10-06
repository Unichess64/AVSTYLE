import { describe, expect, it } from 'vitest'
import { INCHIOSTRO, SFONDO, contrasto, coloriDelBlocco } from '../../src/cliente/vista'

// I tre colori di D3-6, passati come ARGOMENTO: l'agenda legge
// `operator.color` e non inchioda niente (spec 3a §6.2).
const D3_6 = { vera: '#C2185B', annalisa: '#FFFFFF', alessandra: '#9B1B1B' }

const due = (x: number) => Math.round(x * 100) / 100

describe('vista: testo e bordo dal contrasto, non dal nome (§6.2)', () => {
  it('i rapporti misurati di D3-6 sullo sfondo', () => {
    expect(due(contrasto(D3_6.vera, SFONDO))).toBe(5.19)
    expect(due(contrasto(D3_6.annalisa, SFONDO))).toBe(1.13)
    expect(due(contrasto(D3_6.alessandra, SFONDO))).toBe(7.23)
  })

  it('il testo sopra: bianco su Vera e Alessandra, inchiostro su Annalisa', () => {
    expect(coloriDelBlocco(D3_6.vera).testo).toBe('chiaro')
    expect(coloriDelBlocco(D3_6.alessandra).testo).toBe('chiaro')
    expect(coloriDelBlocco(D3_6.annalisa).testo).toBe('scuro')
    expect(due(contrasto('#FFFFFF', D3_6.vera))).toBe(5.87)
    expect(due(contrasto(INCHIOSTRO, D3_6.annalisa))).toBe(19.08)
    expect(due(contrasto('#FFFFFF', D3_6.alessandra))).toBe(8.18)
  })

  it('il bordo in inchiostro solo dove il colore non regge 3:1 sullo sfondo', () => {
    expect(coloriDelBlocco(D3_6.annalisa).bordo).toBe(INCHIOSTRO)
    expect(coloriDelBlocco(D3_6.vera).bordo).toBe(D3_6.vera)
    expect(coloriDelBlocco(D3_6.alessandra).bordo).toBe(D3_6.alessandra)
  })

  it('decide dal colore, non dal nome: un colore nuovo chiaro prende inchiostro e bordo', () => {
    expect(coloriDelBlocco('#F3A4BA')).toEqual({ riempimento: '#F3A4BA', testo: 'scuro', bordo: INCHIOSTRO })
    expect(coloriDelBlocco('#140D18')).toEqual({ riempimento: '#140D18', testo: 'chiaro', bordo: '#140D18' })
  })

  it('un colore che non è #RRGGBB non entra in un attributo: ripiega su bianco con bordo', () => {
    expect(coloriDelBlocco('red; x')).toEqual({ riempimento: '#FFFFFF', testo: 'scuro', bordo: INCHIOSTRO })
    expect(coloriDelBlocco('#fff')).toEqual({ riempimento: '#FFFFFF', testo: 'scuro', bordo: INCHIOSTRO })
  })
})
