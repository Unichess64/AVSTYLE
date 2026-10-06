// tests/dominio/annulla.test.ts
//
// «Annulla» dopo uno spostamento (spec 3a §5.1, la tabella di «Annulla»; §8.1:
// «ogni voce della tabella di Annulla»). I messaggi parlano
// dell'ANNULLAMENTO e dicono dove sta la visita secondo l'ultima LETTURA.
//
// La visita era alle 15:00 (la posizione di prima), lo spostamento l'ha messa
// alle 16:15, e «Annulla» la riporta alle 15:00. Le letture la trovano alle
// 17:00: tre orari distinti, così la memoria del telefono si vede.
import { describe, expect, it } from 'vitest'
import { gestoDiAnnulla, messaggioDiAnnulla } from '../../src/dominio/annulla'
import type { RispostaDellaRotta } from '../../src/dominio/controlla'
import { messaggioPerAnnullato } from '../../src/dominio/errori'
import { messaggioPerEsito } from '../../src/dominio/esiti'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import { type AppuntamentoDelGesto, type Gesto, gestoDalBlocco } from '../../src/dominio/trascinamento'
import type { Risposta } from '../../src/server/scrittura-visita'

const VISITA = '50000000-0000-4000-8000-000000000b01'
const MARIA = '40000000-0000-4000-8000-000000000b01'
const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const A1 = '60000000-0000-4000-8000-000000000b01'
const A2 = '60000000-0000-4000-8000-000000000b02'
const DATA = '2026-10-08'

const DI_PRIMA = 180   // 15:00
const SPOSTATA = 195   // 16:15
const LETTA = 204      // 17:00

/** Una visita INTERA: Refill con Vera, poi Massaggio con Vera dopo la pausa di 3 celle. */
function delGiorno(inizio: number): AppuntamentoDelGesto[] {
  return [
    { id: A1, visitaId: VISITA, clienteId: MARIA, operatriceId: VERA, servizioId: REFILL, inizio, durata: 18, pausa: 3 },
    { id: A2, visitaId: VISITA, clienteId: MARIA, operatriceId: VERA, servizioId: MASSAGGIO, inizio: inizio + 21, durata: 10, pausa: 3 },
  ]
}

const dopoLoSpostamento = delGiorno(SPOSTATA)
const SPOSTAMENTO: Gesto = gestoDalBlocco(
  { visitaId: VISITA, operatriceId: VERA, appuntamenti: delGiorno(DI_PRIMA), inizio: DI_PRIMA, fine: DI_PRIMA + 31, intera: true, segnoDiVisita: false },
  delGiorno(DI_PRIMA),
  DATA,
  SPOSTATA - DI_PRIMA,
)
/** «Annulla» riporta la visita dove l'agenda la mostrava prima dello spostamento. */
const ANNULLA = gestoDiAnnulla(SPOSTAMENTO)

function stato(inizio: number, altro: Partial<StatoVisita> = {}): StatoVisita {
  return {
    visita: 'vv-letta',
    data: DATA,
    cliente: MARIA,
    appuntamenti: [
      { id: A1, versione: 'v1-letta', operatrice: VERA, servizio: REFILL, inizio, durata: 18 },
      { id: A2, versione: 'v2-letta', operatrice: VERA, servizio: MASSAGGIO, inizio: inizio + 21, durata: 10 },
    ],
    ...altro,
  }
}

const esito = (e: Parameters<typeof messaggioPerEsito>[0], altro: Partial<Extract<Risposta, { tipo: 'esito' }>> = {}): Risposta => ({
  tipo: 'esito', esito: e, messaggio: messaggioPerEsito(e, false), ...altro,
})
const fallita = (sqlstate: string, s?: StatoVisita | null): Risposta => {
  const m = messaggioPerAnnullato(sqlstate)
  return { tipo: 'fallita', sqlstate, testo: m.testo, messaggio: m, ...(s === undefined ? {} : { stato: s }) }
}
const riga = (r: 1 | 2 | 4 | 5 | 6 | 7, esito_invio: Extract<RispostaDellaRotta, { tipo: 'riga' }>['esito_invio'], s: StatoVisita | null): RispostaDellaRotta => ({
  tipo: 'riga', riga: r, esito_invio, stato: s,
})

describe('il gesto di «Annulla»', () => {
  it('riporta ciascun appuntamento dove l agenda lo mostrava prima, e la visita come deve risultare', () => {
    expect(ANNULLA.mossi).toEqual([
      { id: A1, da: SPOSTATA, a: DI_PRIMA },
      { id: A2, da: SPOSTATA + 21, a: DI_PRIMA + 21 },
    ])
    expect(ANNULLA.dopo.map((x) => [x.id, x.inizio])).toEqual([[A1, DI_PRIMA], [A2, DI_PRIMA + 21]])
    expect(dopoLoSpostamento.map((x) => x.inizio)).toEqual(SPOSTAMENTO.dopo.map((x) => x.inizio))
  })
})

describe('la tabella di «Annulla» (§5.1), voce per voce', () => {
  it('salvata: «✓ Riportata alle 15:00», con le versioni restituite da adottare', () => {
    const m = messaggioDiAnnulla(esito('salvata', { visita: 'vv-2', appuntamenti: [{ id: A1, versione: 'a' }, { id: A2, versione: 'b' }] }), ANNULLA)
    expect(m).toMatchObject({ testo: '✓ Riportata alle 15:00', spunta: true, posizione: 'nuova', inizio: DI_PRIMA, ricaricaIlGiorno: true })
    expect(m.adotta).toEqual({ visita: 'vv-2', attesi: [{ id: A1, versione: 'a' }, { id: A2, versione: 'b' }] })
    // «Annulla» non offre un altro «Annulla»
    expect('offreAnnulla' in m).toBe(false)
  })

  it('riga 2: «✓ Riportata alle 15:00», con le versioni RILETTE', () => {
    const m = messaggioDiAnnulla(riga(2, 'salvata', stato(DI_PRIMA)), ANNULLA)
    expect(m).toMatchObject({ testo: '✓ Riportata alle 15:00', spunta: true, posizione: 'nuova', inizio: DI_PRIMA })
    expect(m.adotta).toEqual({ visita: 'vv-letta', attesi: [{ id: A1, versione: 'v1-letta' }, { id: A2, versione: 'v2-letta' }] })
  })

  it('riga 1 con la visita presente: «L’annullamento non è stato salvato: la visita ora è alle 17:00» — l orario LETTO', () => {
    const m = messaggioDiAnnulla(riga(1, 'annullato', stato(LETTA)), ANNULLA)
    expect(m).toMatchObject({
      testo: 'L’annullamento non è stato salvato: la visita ora è alle 17:00',
      posizione: 'letta',
      inizio: LETTA,
      spunta: false,
      ricaricaIlGiorno: true,
    })
    expect(m.testo).not.toContain('16:15')
    expect(m.testo).not.toContain('15:00')
  })

  it('riga 1 con la visita assente: «… la visita è stata cancellata», il blocco sparisce', () => {
    expect(messaggioDiAnnulla(riga(1, 'annullato', null), ANNULLA)).toMatchObject({
      testo: 'L’annullamento non è stato salvato: la visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true,
    })
  })

  it('riga 3, con l ora cambiata: «Riportata alle 15:00, ma poi la visita è stata cambiata: ora è alle 17:00»', () => {
    expect(messaggioDiAnnulla(riga(2, 'salvata', stato(LETTA)), ANNULLA)).toMatchObject({
      testo: 'Riportata alle 15:00, ma poi la visita è stata cambiata: ora è alle 17:00',
      posizione: 'letta',
      inizio: LETTA,
      spunta: false,
      adotta: null,
    })
  })

  it('riga 3, con l ora rimasta la stessa: l orario NON si nomina (la collega ha cambiato il servizio)', () => {
    const s = stato(DI_PRIMA)
    const cambiata = { ...s, appuntamenti: s.appuntamenti.map((a) => (a.id === A2 ? { ...a, servizio: REFILL } : a)) }
    const m = messaggioDiAnnulla(riga(2, 'salvata', cambiata), ANNULLA)
    expect(m).toMatchObject({ testo: 'Riportata alle 15:00, ma poi la visita è stata cambiata', posizione: 'letta', inizio: DI_PRIMA, spunta: false })
  })

  it('riga 4: «La visita è stata cancellata», il blocco sparisce, il giorno si ricarica, NESSUNA offerta', () => {
    const m = messaggioDiAnnulla(riga(4, 'salvata', null), ANNULLA)
    expect(m).toEqual({
      testo: 'La visita è stata cancellata',
      spunta: false,
      posizione: 'sparisce',
      inizio: null,
      apreLaScheda: false,
      ricaricaIlGiorno: true,
      esciDallApp: false,
      ricaricaLaPagina: false,
      controlla: false,
      adotta: null,
    })
  })

  it('modificata_altrove diretto: «Non ho annullato: la visita è stata cambiata: ora è alle 17:00»', () => {
    expect(messaggioDiAnnulla(esito('modificata_altrove', { stato: stato(LETTA) }), ANNULLA)).toMatchObject({
      testo: 'Non ho annullato: la visita è stata cambiata: ora è alle 17:00', posizione: 'letta', inizio: LETTA, ricaricaIlGiorno: true,
    })
  })

  it('modificata_altrove senza una rilettura che trovi un orario: l orario non si nomina', () => {
    expect(messaggioDiAnnulla(esito('modificata_altrove'), ANNULLA)).toMatchObject({
      testo: 'Non ho annullato: la visita è stata cambiata', posizione: 'letta', inizio: null,
    })
  })

  it('riga 6 con modificata_altrove: lo stesso messaggio, con l orario letto', () => {
    expect(messaggioDiAnnulla(riga(6, 'modificata_altrove', stato(LETTA)), ANNULLA)).toMatchObject({
      testo: 'Non ho annullato: la visita è stata cambiata: ora è alle 17:00', inizio: LETTA,
    })
  })

  it('cancellata_altrove diretto: «Non ho annullato: la visita è stata cancellata»', () => {
    expect(messaggioDiAnnulla(esito('cancellata_altrove'), ANNULLA)).toMatchObject({
      testo: 'Non ho annullato: la visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true,
    })
  })

  it('riga 6 con cancellata_altrove: lo stesso messaggio', () => {
    expect(messaggioDiAnnulla(riga(6, 'cancellata_altrove', null), ANNULLA)).toMatchObject({
      testo: 'Non ho annullato: la visita è stata cancellata', posizione: 'sparisce',
    })
  })

  it('non_trovata diretto: «Non ho annullato: non trovo più questa visita», MAI «è stata cancellata»', () => {
    const m = messaggioDiAnnulla(esito('non_trovata'), ANNULLA)
    expect(m).toMatchObject({ testo: 'Non ho annullato: non trovo più questa visita', ricaricaIlGiorno: true })
    expect(m.testo).not.toContain('cancellata')
  })

  it('riga 5: lo stesso messaggio di non_trovata', () => {
    expect(messaggioDiAnnulla(riga(5, 'non_trovata', null), ANNULLA)).toMatchObject({
      testo: 'Non ho annullato: non trovo più questa visita', ricaricaIlGiorno: true,
    })
  })

  it('57014: «Non sono riuscita ad annullare», la visita si rilegge, la posizione è quella LETTA', () => {
    const m = messaggioDiAnnulla(fallita('57014', stato(LETTA)), ANNULLA)
    expect(m).toMatchObject({ testo: 'Non sono riuscita ad annullare', posizione: 'letta', inizio: LETTA, ricaricaIlGiorno: true })
  })

  it('40P01 esauriti: la stessa voce', () => {
    expect(messaggioDiAnnulla(fallita('40P01', stato(LETTA)), ANNULLA)).toMatchObject({
      testo: 'Non sono riuscita ad annullare', inizio: LETTA,
    })
  })

  it('da_confermare: si apre la scheda', () => {
    expect(messaggioDiAnnulla({ tipo: 'da_confermare', chiavi: ['gia-prenotata:x'] }, ANNULLA)).toMatchObject({ apreLaScheda: true, spunta: false })
  })

  it('un conflitto: si apre la scheda', () => {
    expect(messaggioDiAnnulla({ tipo: 'conflitto', frase: 'Alle 15:00 Vera ha già Lucia', vaiA: null }, ANNULLA)).toMatchObject({ apreLaScheda: true })
  })

  it('nessuna risposta, o «Non so»: «?» e «Controlla» automatico, come per lo spostamento', () => {
    expect(messaggioDiAnnulla({ tipo: 'non_so' }, ANNULLA)).toMatchObject({ testo: '?', controlla: true, posizione: 'nuova', inizio: DI_PRIMA })
  })

  it('uscita_forzata e app_aggiornata come per lo spostamento', () => {
    expect(messaggioDiAnnulla({ tipo: 'uscita_forzata' }, ANNULLA)).toMatchObject({ esciDallApp: true })
    expect(messaggioDiAnnulla({ tipo: 'app_aggiornata' }, ANNULLA)).toMatchObject({ ricaricaLaPagina: true })
  })

  it('ogni altro SQLSTATE: «Non sono riuscita ad annullare», con la posizione letta', () => {
    expect(messaggioDiAnnulla(fallita('23514', stato(LETTA)), ANNULLA)).toMatchObject({
      testo: 'Non sono riuscita ad annullare', posizione: 'letta', inizio: LETTA,
    })
  })
})
