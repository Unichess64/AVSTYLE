// tests/dominio/controllo-preventivo.test.ts
//
// I passi 2 e 3 di §4.3 come logica pura: la validazione di dominio che il
// server rifà da sé (non si fida del telefono, e una Server Action si raggiunge
// con un POST diretto, §4.2), e il controllo dei conflitti e degli avvisi.
import { describe, expect, it } from 'vitest'
import type { SchedaSerializzata, ServizioInScheda } from '../../src/dominio/scheda'
import { controlloPreventivo, validaEliminazione, validaScheda } from '../../src/server/controllo-preventivo'
import type { DatiGiorno } from '../../src/server/lettura-scheda'

const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const MARIA = '40000000-0000-4000-8000-000000000001'
const VISITA = '50000000-0000-4000-8000-000000000001'
const A1 = '60000000-0000-4000-8000-000000000001'
const A2 = '60000000-0000-4000-8000-000000000002'
const ALTRO = '60000000-0000-4000-8000-000000000009'
const CODICE = '70000000-0000-4000-8000-000000000001'

const servizio = (id: string, operatriceId: string, servizioId: string, inizio: number, durata: number): ServizioInScheda => ({
  id, nuovo: true, operatriceId, servizioId, inizio, durata, durataAMano: false, segueIlPrecedente: false,
})

function scheda(altro: Partial<SchedaSerializzata> = {}): SchedaSerializzata {
  return {
    visitaId: VISITA,
    modo: 'creazione',
    cliente: { tipo: 'esistente', id: MARIA },
    clienteEsisteAncora: true,
    data: '2026-10-08',
    servizi: [servizio(A1, VERA, REFILL, 120, 15), servizio(A2, ALESSANDRA, MASSAGGIO, 138, 10)],
    versioneVisita: null,
    attesi: [],
    avvisiConfermati: [],
    partenza: { operatriceId: VERA, inizio: 120 },
    ...altro,
  }
}

const giorno = (appuntamenti: DatiGiorno['appuntamenti'] = []): DatiGiorno => ({
  data: '2026-10-08',
  operatrici: [
    { id: VERA, nome: 'Vera', attiva: true },
    { id: ALESSANDRA, nome: 'Alessandra', attiva: true },
  ],
  risolti: {
    [VERA]: { dayStatus: 'open', ranges: [{ startBoundary: 108, endBoundary: 228 }] },
    [ALESSANDRA]: { dayStatus: 'open', ranges: [{ startBoundary: 108, endBoundary: 228 }] },
  },
  appuntamenti,
})

describe('validaScheda (§4.3 passo 2)', () => {
  it('una scheda corretta passa, in creazione e con la cliente nuova', () => {
    expect(validaScheda(scheda(), CODICE)).toBeNull()
    expect(
      validaScheda(scheda({ cliente: { tipo: 'nuova', id: MARIA, nome: 'Giulia', telefono: '+393471234567', meseDiNascita: 2, giornoDiNascita: 29 } }), CODICE),
    ).toBeNull()
  })

  it.each([
    ['un elenco vuoto', scheda({ servizi: [] })],
    ['una data che non esiste', scheda({ data: '2026-02-30' })],
    ['una cella fuori da 0-287', scheda({ servizi: [servizio(A1, VERA, REFILL, 288, 1)] })],
    ['un servizio oltre la mezzanotte', scheda({ servizi: [servizio(A1, VERA, REFILL, 280, 15)] })],
    ['una durata zero', scheda({ servizi: [servizio(A1, VERA, REFILL, 120, 0)] })],
    ['una durata non intera', scheda({ servizi: [servizio(A1, VERA, REFILL, 120, 1.5)] })],
    ['un id ripetuto', scheda({ servizi: [servizio(A1, VERA, REFILL, 120, 15), servizio(A1, ALESSANDRA, MASSAGGIO, 140, 10)] })],
    ['un id che non è un uuid', scheda({ servizi: [servizio('x', VERA, REFILL, 120, 15)] })],
    ['nessuna cliente', scheda({ cliente: null })],
    ['un nome vuoto', scheda({ cliente: { tipo: 'nuova', id: MARIA, nome: '  ', telefono: null, meseDiNascita: null, giornoDiNascita: null } })],
    ['un telefono non E.164', scheda({ cliente: { tipo: 'nuova', id: MARIA, nome: 'Giulia', telefono: '347 12', meseDiNascita: null, giornoDiNascita: null } })],
    ['un compleanno impossibile', scheda({ cliente: { tipo: 'nuova', id: MARIA, nome: 'Giulia', telefono: null, meseDiNascita: 4, giornoDiNascita: 31 } })],
    ['una modifica senza versione', scheda({ modo: 'modifica' })],
    ['una creazione con versione', scheda({ versioneVisita: 'v' })],
    ['un atteso storto', scheda({ modo: 'modifica', versioneVisita: 'v', attesi: [{ id: 'x', versione: 'v' }] })],
  ])('rifiuta %s', (_, s) => {
    expect(validaScheda(s, CODICE)).not.toBeNull()
  })

  it('rifiuta un codice d invio che non è un uuid, e un corpo che non è una scheda', () => {
    expect(validaScheda(scheda(), 'codice')).not.toBeNull()
    expect(validaScheda(null as unknown as SchedaSerializzata, CODICE)).not.toBeNull()
    expect(validaScheda({ ...scheda(), servizi: 'tutti' } as unknown as SchedaSerializzata, CODICE)).not.toBeNull()
  })
})

describe('validaEliminazione', () => {
  it('passa con id, versione, attesi e codice corretti, e rifiuta il resto', () => {
    expect(validaEliminazione(VISITA, 'v', [{ id: A1, versione: 'v1' }], CODICE)).toBeNull()
    expect(validaEliminazione('x', 'v', [], CODICE)).not.toBeNull()
    expect(validaEliminazione(VISITA, '', [], CODICE)).not.toBeNull()
    expect(validaEliminazione(VISITA, 'v', [{ id: A1 }] as never, CODICE)).not.toBeNull()
    expect(validaEliminazione(VISITA, 'v', [], 'codice')).not.toBeNull()
  })
})

describe('controlloPreventivo (§4.3 passo 3)', () => {
  const lucia = (id: string, operatriceId: string, inizio: number, durata: number) => ({
    id, visitaId: '50000000-0000-4000-8000-000000000009', operatriceId, servizioId: REFILL, servizioNome: 'Refill', clienteId: 'c', clienteNome: 'Lucia',
    inizio, durata, pausa: 0,
  })

  it('niente da dire su un giorno libero', () => {
    expect(controlloPreventivo(scheda(), giorno())).toBeNull()
  })

  it('i conflitti vengono PRIMA degli avvisi, e sono tutti nella frase', () => {
    const s = scheda({ servizi: [servizio(A1, VERA, REFILL, 230, 15), servizio(A2, ALESSANDRA, MASSAGGIO, 138, 10)] })
    const r = controlloPreventivo(s, giorno([lucia(ALTRO, ALESSANDRA, 140, 10), lucia('60000000-0000-4000-8000-00000000000a', VERA, 230, 5)]))
    expect(r).toEqual({
      tipo: 'conflitto',
      frase: 'Alessandra ha un appuntamento alle 11:40 con Lucia; Vera ha un appuntamento alle 19:10 con Lucia',
      vaiA: ALTRO,
    })
  })

  it('esclude TUTTI gli id in scrittura, compresi i tolti', () => {
    // A2 era della visita, e la scheda l'ha tolto: la sua cella non è un conflitto.
    const s = scheda({ modo: 'modifica', versioneVisita: 'v', attesi: [{ id: A1, versione: '1' }, { id: A2, versione: '2' }], servizi: [servizio(A1, VERA, REFILL, 120, 15)] })
    const resto = { ...lucia(A2, VERA, 120, 10), visitaId: VISITA }
    expect(controlloPreventivo(s, giorno([resto]))).toBeNull()
  })

  it('un avviso non confermato ferma, confermato no (D3-19)', () => {
    const s = scheda({ servizi: [servizio(A1, VERA, REFILL, 230, 15)] })
    expect(controlloPreventivo(s, giorno())).toEqual({ tipo: 'da_confermare', chiavi: [`fuori-orario:${A1}`] })
    expect(controlloPreventivo({ ...s, avvisiConfermati: [`fuori-orario:${A1}`] }, giorno())).toBeNull()
  })
})
