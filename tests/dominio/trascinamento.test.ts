// tests/dominio/trascinamento.test.ts
//
// Il trascinamento dei blocchi nell'agenda (spec 3a §5.1, D3-15; piano 3a-2
// Task 10): `destinazioni` che conserva gli scarti, gli otto esiti dello
// spostamento, le righe di «Controlla» viste dal gesto, la generazione PER
// BLOCCO, i ritentativi automatici di «Controlla» e i 10 s contati dal tocco.
// Logica pura: gira anche in test:fuso.
//
// ⚠︎ Tre posizioni DISTINTE in ogni prova sulla posizione letta: la partenza
// (15:00), la destinazione (16:15) e la lettura (17:00). Con due valori una
// risposta che usasse la memoria del telefono non si vedrebbe.
import { describe, expect, it } from 'vitest'
import type { BloccoAgenda } from '../../src/dominio/blocchi'
import type { RispostaDellaRotta } from '../../src/dominio/controlla'
import { messaggioPerAnnullato } from '../../src/dominio/errori'
import { messaggioPerEsito } from '../../src/dominio/esiti'
import type { StatoVisita } from '../../src/dominio/stato-visita'
import {
  ATTESA_MS,
  ATTESE_CONTROLLA_MS,
  type AppuntamentoDelGesto,
  type Gesto,
  destinazioni,
  gestoDalBlocco,
  limitiDelloScarto,
  messaggioDiSpostamento,
  msAllaScadenza,
  nuoveGenerazioni,
  prossimoControlla,
  scartoDalTrascinamento,
  schedaDalGesto,
} from '../../src/dominio/trascinamento'
import { apriSchedaSuVisita } from '../../src/dominio/scheda'
import type { Risposta } from '../../src/server/scrittura-visita'

const VISITA = '50000000-0000-4000-8000-000000000a01'
const ALTRA = '50000000-0000-4000-8000-000000000a02'
const MARIA = '40000000-0000-4000-8000-000000000a01'
const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const A1 = '60000000-0000-4000-8000-000000000a01'
const A2 = '60000000-0000-4000-8000-000000000a02'
const A3 = '60000000-0000-4000-8000-000000000a03'
const DATA = '2026-10-08'

// Partenza 15:00, destinazione 16:15, lettura 17:00.
const PARTENZA = 180
const DESTINAZIONE = 195
const LETTO = 204

/**
 * La visita nell'agenda: due servizi di Vera con una pausa di 3 celle fra loro
 * (un blocco), e un massaggio di Alessandra alle 08:20 (un altro blocco): la
 * visita è spezzata, quindi il blocco di Vera NON è intero.
 */
function delGiorno(inizio = PARTENZA): AppuntamentoDelGesto[] {
  return [
    { id: A1, visitaId: VISITA, clienteId: MARIA, operatriceId: VERA, servizioId: REFILL, inizio, durata: 18, pausa: 3 },
    { id: A2, visitaId: VISITA, clienteId: MARIA, operatriceId: VERA, servizioId: REFILL, inizio: inizio + 21, durata: 10, pausa: 0 },
    { id: A3, visitaId: VISITA, clienteId: MARIA, operatriceId: ALESSANDRA, servizioId: MASSAGGIO, inizio: 100, durata: 12, pausa: 3 },
  ]
}

function blocco(inizio = PARTENZA): BloccoAgenda<AppuntamentoDelGesto> {
  const [a, b] = delGiorno(inizio)
  return { visitaId: VISITA, operatriceId: VERA, appuntamenti: [a, b], inizio, fine: b.inizio + b.durata, intera: false, segnoDiVisita: true }
}

const GESTO: Gesto = gestoDalBlocco(blocco(), delGiorno(), DATA, DESTINAZIONE - PARTENZA)

/** La visita letta, con il blocco alla posizione `inizio` e un terzo servizio di Alessandra fermo. */
function stato(inizio = LETTO, altro: Partial<StatoVisita> = {}): StatoVisita {
  return {
    visita: 'versione-visita-letta',
    data: DATA,
    cliente: MARIA,
    appuntamenti: [
      { id: A1, versione: 'v1-letta', operatrice: VERA, servizio: REFILL, inizio, durata: 18 },
      { id: A2, versione: 'v2-letta', operatrice: VERA, servizio: REFILL, inizio: inizio + 21, durata: 10 },
      { id: A3, versione: 'v3-letta', operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 100, durata: 12 },
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

describe('destinazioni: conserva gli scarti (§4.1)', () => {
  it('due servizi con una pausa mantengono la pausa dopo lo spostamento', () => {
    expect(destinazioni(blocco(), 15)).toEqual([
      { id: A1, inizio: 195 },
      { id: A2, inizio: 216 },
    ])
  })

  it('l insieme degli id di destinazione è lo stesso dell insieme atteso', () => {
    const b = blocco()
    expect(destinazioni(b, -12).map((d) => d.id).sort()).toEqual(b.appuntamenti.map((a) => a.id).sort())
  })

  it('uno scarto che porterebbe un appuntamento sotto la cella 0 si rifiuta prima di chiamare', () => {
    expect(() => destinazioni(blocco(), -PARTENZA - 1)).toThrow(RangeError)
    // la gemella: esattamente alla cella 0 si può
    expect(destinazioni(blocco(), -PARTENZA)[0].inizio).toBe(0)
  })

  it('uno scarto che porterebbe un appuntamento oltre la 288 si rifiuta prima di chiamare', () => {
    // il secondo finisce a 180 + 21 + 10 = 211: con +77 finisce a 288, con +78 a 289
    expect(destinazioni(blocco(), 77)[1]).toEqual({ id: A2, inizio: 278 })
    expect(() => destinazioni(blocco(), 78)).toThrow(RangeError)
  })

  it('il gesto ricorda dove l agenda mostrava ciascun appuntamento, dove va, e la visita intera come deve risultare', () => {
    expect(GESTO).toEqual({
      visitaId: VISITA,
      data: DATA,
      cliente: MARIA,
      mossi: [
        { id: A1, da: 180, a: 195 },
        { id: A2, da: 201, a: 216 },
      ],
      // TUTTA la visita, anche il massaggio che non si muove: è con lei che «Controlla» confronta (§4.4)
      dopo: [
        { id: A1, operatrice: VERA, servizio: REFILL, inizio: 195, durata: 18 },
        { id: A2, operatrice: VERA, servizio: REFILL, inizio: 216, durata: 10 },
        { id: A3, operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 100, durata: 12 },
      ],
    })
  })
})

describe('il gesto: solo in verticale, a passi di 5 minuti, dentro la finestra', () => {
  it('lo scarto è in celle intere: 7 punti per cella, arrotondato', () => {
    const limiti = { min: -100, max: 100 }
    expect(scartoDalTrascinamento(0, 7, limiti)).toBe(0)
    expect(scartoDalTrascinamento(3, 7, limiti)).toBe(0)
    expect(scartoDalTrascinamento(4, 7, limiti)).toBe(1)
    expect(scartoDalTrascinamento(-25, 7, limiti)).toBe(-4)
    expect(scartoDalTrascinamento(105, 7, limiti)).toBe(15)
  })

  it('lo scarto si ferma ai bordi della finestra disegnata', () => {
    // finestra 08:00–20:00 (96–240): il blocco 180–211 può salire di 84 e scendere di 29
    const limiti = limitiDelloScarto(blocco(), { da: 96, a: 240 })
    expect(limiti).toEqual({ min: -84, max: 29 })
    expect(scartoDalTrascinamento(-10_000, 7, limiti)).toBe(-84)
    expect(scartoDalTrascinamento(10_000, 7, limiti)).toBe(29)
  })
})

describe('gli otto esiti dello spostamento (§5.1)', () => {
  it('salvata: ✓ «Spostata alle 16:15», Annulla offerto, e le versioni restituite da adottare', () => {
    const r = esito('salvata', { visita: 'vv-nuova', appuntamenti: [{ id: A1, versione: 'n1' }, { id: A2, versione: 'n2' }, { id: A3, versione: 'n3' }] })
    expect(messaggioDiSpostamento(r, GESTO)).toEqual({
      testo: '✓ Spostata alle 16:15',
      spunta: true,
      posizione: 'nuova',
      inizio: DESTINAZIONE,
      offreAnnulla: true,
      apreLaScheda: false,
      ricaricaIlGiorno: true,
      esciDallApp: false,
      ricaricaLaPagina: false,
      controlla: false,
      adotta: { visita: 'vv-nuova', attesi: [{ id: A1, versione: 'n1' }, { id: A2, versione: 'n2' }, { id: A3, versione: 'n3' }] },
    })
  })

  it('da_confermare apre la scheda', () => {
    const m = messaggioDiSpostamento({ tipo: 'da_confermare', chiavi: ['fuori-orario:x'] }, GESTO)
    expect(m).toMatchObject({ apreLaScheda: true, spunta: false, offreAnnulla: false, adotta: null })
  })

  it('un conflitto apre la scheda', () => {
    const m = messaggioDiSpostamento({ tipo: 'conflitto', frase: 'Alle 16:15 Vera ha già Lucia', vaiA: A3 }, GESTO)
    expect(m).toMatchObject({ apreLaScheda: true, spunta: false, offreAnnulla: false })
  })

  it('modificata_altrove: «È diversa…», il blocco va alla posizione LETTA e il giorno si ricarica', () => {
    const m = messaggioDiSpostamento(esito('modificata_altrove', { stato: stato() }), GESTO)
    expect(m).toMatchObject({
      testo: 'È diversa da come l’avevi lasciata',
      posizione: 'letta',
      inizio: LETTO,
      ricaricaIlGiorno: true,
      offreAnnulla: false,
      adotta: null,
    })
  })

  it('cancellata_altrove: «La visita è stata cancellata», il blocco sparisce, nessuna offerta', () => {
    const m = messaggioDiSpostamento(esito('cancellata_altrove'), GESTO)
    expect(m).toMatchObject({ testo: 'La visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true, offreAnnulla: false, apreLaScheda: false })
  })

  it('non_trovata: lo stesso messaggio, senza offerta', () => {
    const m = messaggioDiSpostamento(esito('non_trovata'), GESTO)
    expect(m).toMatchObject({ testo: 'La visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true, offreAnnulla: false })
  })

  it('57014: «Non sono riuscita a spostarla», e il blocco va alla posizione LETTA, non a quella ricordata', () => {
    const m = messaggioDiSpostamento(fallita('57014', stato()), GESTO)
    expect(m).toMatchObject({ testo: 'Non sono riuscita a spostarla', posizione: 'letta', inizio: LETTO, ricaricaIlGiorno: true })
    expect(m.inizio).not.toBe(PARTENZA)
    expect(m.inizio).not.toBe(DESTINAZIONE)
  })

  it('40P01 esauriti: la stessa frase e la posizione letta', () => {
    expect(messaggioDiSpostamento(fallita('40P01', stato()), GESTO)).toMatchObject({
      testo: 'Non sono riuscita a spostarla', posizione: 'letta', inizio: LETTO,
    })
  })

  it('57014 con la rilettura fallita: posizione letta ma sconosciuta, decide il giorno riletto', () => {
    expect(messaggioDiSpostamento(fallita('57014'), GESTO)).toMatchObject({ posizione: 'letta', inizio: null, ricaricaIlGiorno: true })
  })

  it('57014 con la visita sparita alla rilettura: il blocco sparisce', () => {
    expect(messaggioDiSpostamento(fallita('57014', null), GESTO)).toMatchObject({ posizione: 'sparisce', inizio: null })
  })

  it('nessuna risposta, o «Non so»: «?» e «Controlla» automatico, il blocco resta dov è stato messo', () => {
    expect(messaggioDiSpostamento({ tipo: 'non_so' }, GESTO)).toMatchObject({
      testo: '?', controlla: true, posizione: 'nuova', inizio: DESTINAZIONE, ricaricaIlGiorno: false, spunta: false,
    })
  })
})

describe('la riga che mancava alle due tabelle (piano, Task 10)', () => {
  it('uscita_forzata: si esce, senza affermazioni sulla visita e senza muovere il blocco', () => {
    expect(messaggioDiSpostamento({ tipo: 'uscita_forzata' }, GESTO)).toMatchObject({ esciDallApp: true, testo: '', ricaricaIlGiorno: false, spunta: false })
  })

  it('app_aggiornata: «L’app è stata aggiornata, ricarica»', () => {
    expect(messaggioDiSpostamento({ tipo: 'app_aggiornata' }, GESTO)).toMatchObject({
      ricaricaLaPagina: true, testo: 'L’app è stata aggiornata: ricarica la pagina.',
    })
  })

  it.each(['23514', '23502', '22023', '22P02', '22003'])('ogni altro SQLSTATE (%s): «Non sono riuscita a spostarla», posizione letta', (s) => {
    expect(messaggioDiSpostamento(fallita(s, stato()), GESTO)).toMatchObject({
      testo: 'Non sono riuscita a spostarla', posizione: 'letta', inizio: LETTO, ricaricaIlGiorno: true, spunta: false,
    })
  })

  it('42501 con l account ancora attivo: la frase del 42501 e il giorno riletto', () => {
    // Il server ha già ricontrollato l'account: con l'account chiuso avrebbe risposto `uscita_forzata`.
    expect(messaggioDiSpostamento(fallita('42501', stato()), GESTO)).toMatchObject({
      testo: 'Questa visita non è più accessibile. Ricarico il giorno.', ricaricaIlGiorno: true, esciDallApp: false,
    })
  })

  it('un messaggio con l account chiuso nel messaggio stesso è l uscita forzata', () => {
    const r: Risposta = { tipo: 'esito', esito: 'salvata', messaggio: messaggioPerEsito('salvata', true) }
    expect(messaggioDiSpostamento(r, GESTO)).toMatchObject({ esciDallApp: true, spunta: false, offreAnnulla: false })
  })

  it('non_valida: nulla è partito, il blocco torna alla lettura del giorno', () => {
    expect(messaggioDiSpostamento({ tipo: 'non_valida', motivo: 'Scheda non valida.' }, GESTO)).toMatchObject({
      testo: 'Non sono riuscita a spostarla', posizione: 'letta', inizio: null, ricaricaIlGiorno: true,
    })
  })

  it('annullato come risposta diretta: «Lo spostamento non è stato salvato»', () => {
    expect(messaggioDiSpostamento(esito('annullato'), GESTO)).toMatchObject({
      testo: 'Lo spostamento non è stato salvato', posizione: 'letta', inizio: null, ricaricaIlGiorno: true, spunta: false,
    })
  })
})

describe('dopo «Controlla»: le righe di §4.4 viste dal gesto (C1 sulla coppia)', () => {
  it('riga 1 con la visita presente (annullato): «Lo spostamento non è stato salvato», posizione LETTA', () => {
    const m = messaggioDiSpostamento(riga(1, 'annullato', stato()), GESTO)
    expect(m).toMatchObject({ testo: 'Lo spostamento non è stato salvato', posizione: 'letta', inizio: LETTO, ricaricaIlGiorno: true, spunta: false })
  })

  it('riga 1 con non_trovata e la visita trovata: la stessa posizione letta', () => {
    expect(messaggioDiSpostamento(riga(1, 'non_trovata', stato()), GESTO)).toMatchObject({
      testo: 'Lo spostamento non è stato salvato', posizione: 'letta', inizio: LETTO,
    })
  })

  it('riga 1 con la visita assente: «… la visita è stata cancellata», il blocco sparisce', () => {
    expect(messaggioDiSpostamento(riga(1, 'annullato', null), GESTO)).toMatchObject({
      testo: 'Lo spostamento non è stato salvato: la visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true,
    })
  })

  it('riga 2 con la visita dove l ho messa: «✓ Spostata alle 16:15», Annulla, e le versioni RILETTE da adottare', () => {
    const m = messaggioDiSpostamento(riga(2, 'salvata', stato(DESTINAZIONE)), GESTO)
    expect(m).toMatchObject({ testo: '✓ Spostata alle 16:15', spunta: true, offreAnnulla: true, posizione: 'nuova', inizio: DESTINAZIONE })
    // C3: le versioni lette, proiettate e ordinate
    expect(m.adotta).toEqual({
      visita: 'versione-visita-letta',
      attesi: [{ id: A1, versione: 'v1-letta' }, { id: A2, versione: 'v2-letta' }, { id: A3, versione: 'v3-letta' }],
    })
  })

  it('riga 2 con la visita altrove (la «riga 3»): «È diversa…», posizione letta, niente Annulla', () => {
    const m = messaggioDiSpostamento(riga(2, 'salvata', stato()), GESTO)
    expect(m).toMatchObject({ testo: 'È diversa da come l’avevi lasciata', posizione: 'letta', inizio: LETTO, spunta: false, offreAnnulla: false, adotta: null })
  })

  it('la «riga 3» guarda TUTTI i mossi: il secondo fuori posto basta', () => {
    const s = stato(DESTINAZIONE)
    const storto = { ...s, appuntamenti: s.appuntamenti.map((a) => (a.id === A2 ? { ...a, inizio: a.inizio + 1 } : a)) }
    expect(messaggioDiSpostamento(riga(2, 'salvata', storto), GESTO)).toMatchObject({ spunta: false, testo: 'È diversa da come l’avevi lasciata' })
  })

  it('riga 2 con un servizio cambiato SENZA toccare l ora: «È diversa…», niente ✓', () => {
    const s = stato(DESTINAZIONE)
    const cambiato = { ...s, appuntamenti: s.appuntamenti.map((a) => (a.id === A3 ? { ...a, servizio: REFILL } : a)) }
    expect(messaggioDiSpostamento(riga(2, 'salvata', cambiato), GESTO)).toMatchObject({ spunta: false, offreAnnulla: false, posizione: 'letta' })
  })

  it('riga 2 con un servizio AGGIUNTO dalla collega: «È diversa…»', () => {
    const s = stato(DESTINAZIONE)
    const aggiunto = { ...s, appuntamenti: [...s.appuntamenti, { id: '60000000-0000-4000-8000-000000000a09', versione: 'x', operatrice: VERA, servizio: REFILL, inizio: 240, durata: 6 }] }
    expect(messaggioDiSpostamento(riga(2, 'salvata', aggiunto), GESTO)).toMatchObject({ spunta: false })
  })

  it('riga 4: «La visita è stata cancellata», SENZA offerta di ricrearla (L12)', () => {
    const m = messaggioDiSpostamento(riga(4, 'salvata', null), GESTO)
    expect(m).toMatchObject({ testo: 'La visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true, apreLaScheda: false, offreAnnulla: false })
  })

  it('riga 5: non ritrovo la visita, il giorno si ricarica', () => {
    expect(messaggioDiSpostamento(riga(5, 'non_trovata', null), GESTO)).toMatchObject({ posizione: 'sparisce', ricaricaIlGiorno: true, spunta: false })
  })

  it('riga 6 con modificata_altrove: il messaggio di quell esito, alla posizione letta', () => {
    expect(messaggioDiSpostamento(riga(6, 'modificata_altrove', stato()), GESTO)).toMatchObject({
      testo: 'È diversa da come l’avevi lasciata', posizione: 'letta', inizio: LETTO, ricaricaIlGiorno: true,
    })
  })

  it('riga 6 con cancellata_altrove: «La visita è stata cancellata», il blocco sparisce', () => {
    expect(messaggioDiSpostamento(riga(6, 'cancellata_altrove', null), GESTO)).toMatchObject({
      testo: 'La visita è stata cancellata', posizione: 'sparisce', ricaricaIlGiorno: true,
    })
  })

  it('«Controlla» che risponde «Non so»: di nuovo «?» e «Controlla»', () => {
    expect(messaggioDiSpostamento({ tipo: 'non_so' }, GESTO)).toMatchObject({ testo: '?', controlla: true })
  })

  it('la posizione letta su un altro giorno: il blocco sparisce da questo', () => {
    expect(messaggioDiSpostamento(riga(1, 'annullato', stato(LETTO, { data: '2026-10-09' })), GESTO)).toMatchObject({ posizione: 'sparisce' })
  })
})

describe('la generazione è PER BLOCCO (§5.1: solo quel blocco resta in attesa)', () => {
  it('un nuovo invio e «Controlla» la fanno avanzare: la risposta di prima si scarta', () => {
    const g = nuoveGenerazioni()
    const prima = g.invia(VISITA)
    expect(g.corrente(VISITA, prima)).toBe(true)
    const controllo = g.controlla(VISITA)
    expect(g.corrente(VISITA, prima)).toBe(false)
    expect(g.corrente(VISITA, controllo)).toBe(true)
    const dopo = g.invia(VISITA)
    expect(g.corrente(VISITA, controllo)).toBe(false)
    expect(g.corrente(VISITA, dopo)).toBe(true)
  })

  it('lo scadere dei 10 s NON la fa avanzare: l invio ancora in volo vale', () => {
    const g = nuoveGenerazioni()
    const gen = g.invia(VISITA)
    g.scaduto(VISITA)
    expect(g.corrente(VISITA, gen)).toBe(true)
  })

  it('un altro blocco che avanza non scarta le risposte di questo', () => {
    const g = nuoveGenerazioni()
    const mio = g.invia(VISITA)
    g.invia(ALTRA)
    g.controlla(ALTRA)
    expect(g.corrente(VISITA, mio)).toBe(true)
  })
})

describe('«Controlla» automatico e la fila (§5.1)', () => {
  it('l app ritenta da sola al massimo tre volte, a distanza crescente', () => {
    expect(ATTESE_CONTROLLA_MS).toHaveLength(3)
    expect([...ATTESE_CONTROLLA_MS]).toEqual([...ATTESE_CONTROLLA_MS].sort((x, y) => x - y))
    expect(new Set(ATTESE_CONTROLLA_MS).size).toBe(3)
    expect(prossimoControlla(0)).toBe(ATTESE_CONTROLLA_MS[0])
    expect(prossimoControlla(2)).toBe(ATTESE_CONTROLLA_MS[2])
    // dopo il terzo ritentativo il «?» resta toccabile, e basta
    expect(prossimoControlla(3)).toBeNull()
  })

  it('il conto alla rovescia parte dal tocco, anche se l invio parte tre secondi dopo', () => {
    const tocco = 1_000_000
    // tre secondi in fila dietro l'invio precedente: restano sette secondi, non dieci
    expect(msAllaScadenza(tocco, tocco + 3_000)).toBe(ATTESA_MS - 3_000)
    expect(ATTESA_MS).toBe(10_000)
    expect(msAllaScadenza(tocco, tocco + 12_000)).toBe(0)
  })
})

describe('la scheda aperta da un gesto fermato (da_confermare o conflitto)', () => {
  const giorno = {
    // Vera lavora 09:00–19:00, Alessandra non lavora: il massaggio era già fuori orario.
    risolti: {
      [VERA]: { dayStatus: 'open' as const, ranges: [{ startBoundary: 108, endBoundary: 228 }] },
      [ALESSANDRA]: { dayStatus: 'operator_off' as const, ranges: [] },
    },
    appuntamenti: [],
  }
  const letta = apriSchedaSuVisita(stato(PARTENZA), VISITA)

  it('porta gli appuntamenti nella posizione del gesto, e gli altri dove sono', () => {
    const s = schedaDalGesto(letta, GESTO.mossi.map((m) => ({ id: m.id, inizio: m.a })), giorno)
    expect(s.servizi.map((x) => [x.id, x.inizio])).toEqual([[A3, 100], [A1, DESTINAZIONE], [A2, 216]])
    expect(s.versioneVisita).toBe(letta.versioneVisita)
    expect(s.attesi).toEqual(letta.attesi)
  })

  it('gli avvisi che la posizione letta aveva già passano come confermati, e solo loro', () => {
    const s = schedaDalGesto(letta, [{ id: A2, inizio: 230 }], giorno)
    expect([...s.avvisiConfermati]).toEqual([`fuori-orario:${A3}`])
  })
})
