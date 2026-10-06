// tests/dominio/lista.test.tsx
//
// L'agenda a lista (spec 3a §5.2, spec §9.2): l'ordine, e il pallino che
// porta SEMPRE il bordo in inchiostro.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AgendaLista } from '../../src/cliente/agenda-lista'
import { INCHIOSTRO, coloriDelBlocco, coloriDelPallino } from '../../src/cliente/vista'
import type { AppuntamentoLetto } from '../../src/dominio/blocchi'
import { righeDellaLista } from '../../src/dominio/blocchi'

const D3_6 = { vera: '#C2185B', annalisa: '#FFFFFF', alessandra: '#9B1B1B' }

function app(id: string, operatriceId: string, inizio: number, altro: Partial<AppuntamentoLetto> = {}): AppuntamentoLetto {
  return {
    id,
    visitaId: `v-${id}`,
    operatriceId,
    servizioId: 's',
    servizioNome: 'Refill',
    clienteId: `c-${id}`,
    clienteNome: `Cliente ${id}`,
    inizio,
    durata: 6,
    pausa: 0,
    ...altro,
  }
}

describe('righeDellaLista: tutti gli appuntamenti in ordine d ora', () => {
  it('ordina per ora, poi per l ordine delle colonne, poi per id', () => {
    const ordine = ['vera', 'annalisa', 'alessandra']
    const righe = righeDellaLista(
      [
        app('z', 'vera', 150),
        app('b', 'alessandra', 120),
        app('a', 'annalisa', 120),
        app('y', 'vera', 120),
        app('x', 'vera', 120),
        app('presto', 'alessandra', 96),
      ],
      ordine,
    )
    expect(righe.map((r) => r.id)).toEqual(['presto', 'x', 'y', 'a', 'b', 'z'])
  })

  it('una visita in due servizi dà due righe: la lista è di appuntamenti (§9.2)', () => {
    const righe = righeDellaLista(
      [app('a2', 'vera', 138, { visitaId: 'V' }), app('a1', 'vera', 120, { visitaId: 'V', durata: 18 })],
      ['vera'],
    )
    expect(righe.map((r) => r.id)).toEqual(['a1', 'a2'])
  })
})

describe('il pallino: bordo in inchiostro SEMPRE (§5.2), non solo sotto 3:1', () => {
  it('su ogni colore di D3-6 il bordo è l inchiostro', () => {
    for (const colore of Object.values(D3_6)) expect(coloriDelPallino(colore).bordo).toBe(INCHIOSTRO)
  })

  it('la gemella: il blocco delle colonne NON lo mette su Vera, il pallino sì', () => {
    expect(coloriDelBlocco(D3_6.vera).bordo).toBe(D3_6.vera)
    expect(coloriDelPallino(D3_6.vera)).toEqual({ riempimento: D3_6.vera, bordo: INCHIOSTRO })
  })

  it('un colore che non è #RRGGBB ripiega sul bianco', () => {
    expect(coloriDelPallino('red; x')).toEqual({ riempimento: '#FFFFFF', bordo: INCHIOSTRO })
  })
})

describe('AgendaLista, disegnata sul server', () => {
  const operatrici = [
    { id: 'vera', nome: 'Vera', colore: D3_6.vera, attiva: true, sonoIo: true },
    { id: 'annalisa', nome: 'Annalisa', colore: D3_6.annalisa, attiva: true, sonoIo: false },
  ]
  const appuntamenti = [
    app('b', 'annalisa', 150, { clienteNome: 'Lucia Ciccarè', servizioNome: 'Massaggio' }),
    app('a', 'vera', 120, { clienteNome: 'Maria Rossi' }),
  ]
  const html = renderToStaticMarkup(<AgendaLista appuntamenti={appuntamenti} operatrici={operatrici} />)

  it('le righe in ordine d ora, con ora, nome, servizio e operatrice', () => {
    expect(html.indexOf('Maria Rossi')).toBeGreaterThan(-1)
    expect(html.indexOf('Maria Rossi')).toBeLessThan(html.indexOf('Lucia Ciccarè'))
    expect(html).toContain('10:00')
    expect(html).toContain('12:30')
    expect(html).toContain('Massaggio')
    expect(html).toContain('Annalisa')
  })

  it('ogni pallino ha il bordo in inchiostro, e il colore nel fill: niente style', () => {
    const cerchi = html.match(/<circle[^>]*>/g) ?? []
    expect(cerchi).toHaveLength(2)
    for (const c of cerchi) expect(c).toContain(`stroke="${INCHIOSTRO}"`)
    expect(cerchi.some((c) => c.includes(`fill="${D3_6.vera}"`))).toBe(true)
    expect(html).not.toContain('style=')
  })

  it('l etichetta della riga nomina l operatrice: il colore non basta (§6.2)', () => {
    expect(html).toMatch(/aria-label="10:00, Maria Rossi, Refill, con Vera"/)
  })
})
