import { describe, expect, it } from 'vitest'
import { proiettaAttesi } from '../../src/dominio/attesi'

// Gli id sono scritti in ordine DECRESCENTE apposta: è la forma che il piano
// 3a-1 ha misurato come letale il 25/09/2026 (togliere `order by a.id` dal lato
// database fa rimbalzare un salvataggio conforme).
// ⚠︎ Congelato: senza, una proiezione che ordinasse l'ingresso SUL POSTO lo
// lascerebbe crescente già dopo la prima prova, e «non modifica l elenco»
// fotograferebbe un elenco già ordinato — misurato, sonda 17: 0 rosse.
const STATO = Object.freeze([
  { id: 'ffffffff-0000-4000-8000-000000000002', versione: '2026-10-03 09:00:00.123456+00',
    operatrice: 'v', servizio: 's1', inizio: 120, durata: 6 },
  { id: '00000000-0000-4000-8000-000000000001', versione: '2026-10-03 09:00:00.654321+00',
    operatrice: 'a', servizio: 's2', inizio: 132, durata: 4 },
])

describe('il contratto di p_attesi (§4.1 regola 6, misurato)', () => {
  it('proietta su DUE chiavi sole: stato_visita ne restituisce sei', () => {
    for (const a of proiettaAttesi(STATO)) {
      expect(Object.keys(a).sort()).toEqual(['id', 'versione'])
    }
  })

  it('ordina per id, perché il confronto in PostgreSQL è posizionale', () => {
    expect(proiettaAttesi(STATO).map((a) => a.id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      'ffffffff-0000-4000-8000-000000000002',
    ])
  })

  it('non tocca la versione: viaggia come TESTO, com è arrivata (§10.2)', () => {
    const v = proiettaAttesi(STATO).map((a) => a.versione)
    expect(v).toContain('2026-10-03 09:00:00.123456+00')
    expect(v).toContain('2026-10-03 09:00:00.654321+00')
    for (const x of v) expect(typeof x).toBe('string')
  })

  it('l elenco vuoto resta vuoto, e non diventa null', () => {
    expect(proiettaAttesi([])).toEqual([])
  })

  it('non modifica l elenco che riceve', () => {
    // Un ingresso fresco, decrescente: è l'ordine che un sort sul posto cambia.
    const ingresso = STATO.map((a) => ({ ...a }))
    const copia = STATO.map((a) => ({ ...a }))
    proiettaAttesi(ingresso)
    expect(ingresso).toEqual(copia)
    expect(ingresso[0].id > ingresso[1].id).toBe(true)
  })

  it('l ordine delle stringhe uuid minuscole coincide con l ordine di PostgreSQL', () => {
    // PostgreSQL ordina `uuid` per BYTE. La forma testuale è 8-4-4-4-12 di hex
    // MINUSCOLO con i trattini in posizione fissa, quindi il confronto
    // lessicografico delle stringhe dà lo stesso ordine — e i trattini, essendo
    // nelle stesse posizioni in ogni uuid, non decidono mai.
    // ⚠︎ Regge finché gli id arrivano minuscoli: PostgreSQL li rende sempre
    // così. Un id costruito a mano in maiuscolo romperebbe l'accordo, ed è il
    // motivo di questa prova.
    const ids = ['0a000000-0000-4000-8000-000000000000', '9f000000-0000-4000-8000-000000000000',
                 'a0000000-0000-4000-8000-000000000000', 'f0000000-0000-4000-8000-000000000000']
    const mescolati = [ids[3], ids[0], ids[2], ids[1]].map((id) => ({ id, versione: 'x' }))
    expect(proiettaAttesi(mescolati).map((a) => a.id)).toEqual(ids)
  })
})
