// tests/dominio/ricariche.test.ts
//
// Il modello puro dell'aggiornamento in diretta (spec 3a §4.6, §5.1, §7;
// piano 3a-2 Task 11): quando un annuncio riguarda ciò che il telefono mostra,
// quando una ricarica si mette da parte e quando si applica, e che cosa
// diventa «oggi» dopo la mezzanotte di Perugia o al ritorno in primo piano.
//
// Gli istanti sono scritti in UTC: `npm run test:fuso` esegue questo file con
// TZ=America/New_York, e una sola riga che leggesse l'orologio locale — o che
// confrontasse i giorni passando da un `Date` — qui diventerebbe rossa.
import { describe, expect, it } from 'vitest'
import {
  RICARICHE_INIZIALI,
  type StatoRicariche,
  annuncioRiguarda,
  arrivata,
  cambioDiGiorno,
  chiedi,
  liberato,
  msAllaMezzanotte,
  spunta,
} from '../../src/dominio/ricariche'

const OGGI = '2026-10-08'
const DOMANI = '2026-10-09'

describe('annunci e giorni mostrati (D3-12)', () => {
  it('un annuncio che nomina il giorno mostrato provoca una ricarica', () => {
    expect(annuncioRiguarda([OGGI], [OGGI])).toBe(true)
    expect(chiedi(RICARICHE_INIZIALI, false).rileggi).toBe(true)
  })

  it('un annuncio che nomina solo altri giorni non provoca niente', () => {
    expect(annuncioRiguarda(['2026-10-07', DOMANI], [OGGI])).toBe(false)
    // compagna positiva nello stesso elenco: il giorno c'è, in mezzo agli altri
    expect(annuncioRiguarda(['2026-10-07', OGGI, DOMANI], [OGGI])).toBe(true)
  })

  it('un annuncio che nomina il giorno VECCHIO e quello NUOVO di uno spostamento tocca tutti e due', () => {
    const spostamento = [OGGI, DOMANI]
    expect(annuncioRiguarda(spostamento, [OGGI])).toBe(true)
    expect(annuncioRiguarda(spostamento, [DOMANI])).toBe(true)
    expect(annuncioRiguarda(spostamento, ['2026-10-10'])).toBe(false)
  })

  it('la settimana: un annuncio che nomina uno dei sette giorni la riguarda', () => {
    const settimana = ['2026-10-05', '2026-10-06', '2026-10-07', OGGI, DOMANI, '2026-10-10', '2026-10-11']
    expect(annuncioRiguarda(['2026-10-11'], settimana)).toBe(true)
    expect(annuncioRiguarda(['2026-10-12'], settimana)).toBe(false)
  })

  it('il confronto è fra STRINGHE: a New York «2026-10-25» resta il 25, non il 24', () => {
    // Il giorno del cambio d'ora: un confronto passato da `new Date('2026-10-25')`
    // e riletto nell'ora locale darebbe il 24 a ovest di UTC.
    expect(annuncioRiguarda(['2026-10-25'], ['2026-10-25'])).toBe(true)
    expect(annuncioRiguarda(['2026-10-25'], ['2026-10-24'])).toBe(false)
    expect(annuncioRiguarda(['2027-03-28'], ['2027-03-28'])).toBe(true)
    expect(annuncioRiguarda(['2027-03-28'], ['2027-03-27'])).toBe(false)
  })

  it('un messaggio di forma storta non riguarda niente', () => {
    // Il messaggio arriva dalla rete: senza `giorni`, o con altro dentro, non
    // si rilegge e non si lancia. I ripieghi coprono il caso.
    expect(annuncioRiguarda(undefined, [OGGI])).toBe(false)
    expect(annuncioRiguarda(OGGI, [OGGI])).toBe(false)
    expect(annuncioRiguarda([20261008, null], [OGGI])).toBe(false)
    expect(annuncioRiguarda([`${OGGI}T00:00:00`], [OGGI])).toBe(false)
  })
})

describe('le ricariche messe da parte (§4.6, §5.1)', () => {
  it('durante un gesto la ricarica si mette da parte', () => {
    const p = chiedi(RICARICHE_INIZIALI, true)
    expect(p.rileggi).toBe(false)
    expect(p.stato.messaDaParte).toBe(true)
  })

  it('finito il gesto la ricarica si applica', () => {
    const daParte = chiedi(RICARICHE_INIZIALI, true).stato
    // ancora occupato (un salvataggio dopo il gesto): resta da parte
    expect(liberato(daParte, true).rileggi).toBe(false)
    const p = liberato(daParte, false)
    expect(p.rileggi).toBe(true)
    expect(p.stato.messaDaParte).toBe(false)
    // e una sola volta
    expect(liberato(p.stato, false).rileggi).toBe(false)
  })

  it('la gemella: finito un gesto senza ricariche messe da parte, non si rilegge niente', () => {
    expect(liberato(RICARICHE_INIZIALI, false).rileggi).toBe(false)
  })

  it('una ricarica letta PRIMA del ✓ non si applica: si rilegge il giorno', () => {
    // Chiesta prima del ✓, arriva dopo: porta le posizioni di prima.
    let s: StatoRicariche = chiedi(RICARICHE_INIZIALI, false).stato
    s = spunta(s)
    const a = arrivata(s, false)
    expect(a.applica).toBe(false)
    expect(a.rileggi).toBe(true)
    // la rilettura chiesta dopo il ✓ si applica
    const b = arrivata(a.stato, false)
    expect(b.applica).toBe(true)
    expect(b.rileggi).toBe(false)
  })

  it('…e se una rilettura chiesta DOPO il ✓ è già in volo, non se ne chiede un altra: si aspetta quella', () => {
    let s: StatoRicariche = chiedi(RICARICHE_INIZIALI, false).stato
    s = spunta(s)
    s = chiedi(s, false).stato // la rilettura che segue il ✓
    const vecchia = arrivata(s, false)
    expect(vecchia.applica).toBe(false)
    expect(vecchia.rileggi).toBe(false)
    expect(arrivata(vecchia.stato, false).applica).toBe(true)
  })

  it('la gemella: senza un ✓ in mezzo, il giorno riletto si applica', () => {
    const s = chiedi(RICARICHE_INIZIALI, false).stato
    expect(arrivata(s, false)).toEqual({ stato: RICARICHE_INIZIALI, applica: true, rileggi: false })
  })

  it('un giorno arrivato senza averlo chiesto (si è cambiato giorno) si applica e non sporca il conto', () => {
    const a = arrivata(RICARICHE_INIZIALI, false)
    expect(a.applica).toBe(true)
    expect(a.stato).toEqual(RICARICHE_INIZIALI)
  })

  it('la rilettura che segue un giorno scartato durante un gesto si mette da parte anche lei', () => {
    let s: StatoRicariche = chiedi(RICARICHE_INIZIALI, false).stato
    s = spunta(s)
    const a = arrivata(s, true)
    expect(a.applica).toBe(false)
    expect(a.rileggi).toBe(false)
    expect(liberato(a.stato, false).rileggi).toBe(true)
  })
})

describe('«oggi» dopo la mezzanotte e al ritorno in primo piano (§4.6, §7)', () => {
  it('alla mezzanotte di Perugia il giorno mostrato cambia se era «oggi»', () => {
    // 24 ottobre, CEST: mezzanotte a Perugia = 22:00Z.
    const dopo = new Date('2026-10-24T22:00:01Z')
    // con `?giorno=` uguale a oggi: si va al giorno nuovo
    expect(cambioDiGiorno({ giorno: '2026-10-24', oggi: '2026-10-24', esplicito: true }, dopo)).toEqual({ tipo: 'vai', giorno: '2026-10-25' })
    // senza `?giorno=`: basta rileggere, «oggi» lo ricalcola il server
    expect(cambioDiGiorno({ giorno: '2026-10-24', oggi: '2026-10-24', esplicito: false }, dopo)).toEqual({ tipo: 'rileggi' })
    // un altro giorno scelto resta quello
    expect(cambioDiGiorno({ giorno: '2026-10-20', oggi: '2026-10-24', esplicito: true }, dopo)).toEqual({ tipo: 'rileggi' })
    // la settimana resta la settimana
    expect(cambioDiGiorno({ giorno: null, oggi: '2026-10-24', esplicito: true }, dopo)).toEqual({ tipo: 'rileggi' })
  })

  it('un secondo prima della mezzanotte il giorno non cambia', () => {
    const prima = new Date('2026-10-24T21:59:59Z')
    expect(cambioDiGiorno({ giorno: '2026-10-24', oggi: '2026-10-24', esplicito: true }, prima)).toEqual({ tipo: 'rileggi' })
  })

  it('al ritorno in primo piano «oggi» si ricalcola: il 25 ottobre 2026 dura 25 ore', () => {
    const vista = { giorno: '2026-10-25', oggi: '2026-10-25', esplicito: true }
    // 23:30 del 25 a Perugia (CET, +1) = 22:30Z: ventiquattro ore e mezza dopo
    // la mezzanotte, ed è ancora il 25. Chi aggiungesse 24 ore alla mezzanotte
    // qui direbbe «domani».
    expect(cambioDiGiorno(vista, new Date('2026-10-25T22:30:00Z'))).toEqual({ tipo: 'rileggi' })
    // 00:30 del 26 = 23:30Z
    expect(cambioDiGiorno(vista, new Date('2026-10-25T23:30:00Z'))).toEqual({ tipo: 'vai', giorno: '2026-10-26' })
  })

  it('al ritorno in primo piano «oggi» si ricalcola: il 28 marzo 2027 dura 23 ore', () => {
    const vista = { giorno: '2027-03-28', oggi: '2027-03-28', esplicito: true }
    // 00:30 del 29 a Perugia (CEST, +2) = 22:30Z del 28: ventidue ore e mezza
    // dopo la mezzanotte del 28, ed è già il 29. Chi aspettasse 24 ore direbbe
    // ancora «oggi».
    expect(cambioDiGiorno(vista, new Date('2027-03-28T22:30:00Z'))).toEqual({ tipo: 'vai', giorno: '2027-03-29' })
    expect(cambioDiGiorno(vista, new Date('2027-03-28T21:30:00Z'))).toEqual({ tipo: 'rileggi' })
  })

  it('un telefono rimasto chiuso per giorni torna al giorno di adesso, non a quello dopo', () => {
    const vista = { giorno: '2026-10-08', oggi: '2026-10-08', esplicito: true }
    expect(cambioDiGiorno(vista, new Date('2026-10-11T08:00:00Z'))).toEqual({ tipo: 'vai', giorno: '2026-10-11' })
  })

  it('quanto manca alla mezzanotte di Perugia: un giorno qualunque, e i due del cambio d ora', () => {
    const ora = 60 * 60 * 1000
    // 8 ottobre, 23:00 a Perugia (CEST) = 21:00Z: manca un'ora.
    expect(msAllaMezzanotte(new Date('2026-10-08T21:00:00Z'))).toBe(ora)
    // 25 ottobre, 00:30 (CEST, prima del cambio) = 2026-10-24T22:30Z: mancano 24 ore e mezza.
    expect(msAllaMezzanotte(new Date('2026-10-24T22:30:00Z'))).toBe(24.5 * ora)
    // 28 marzo 2027, 00:30 (CET) = 2027-03-27T23:30Z: mancano 22 ore e mezza.
    expect(msAllaMezzanotte(new Date('2027-03-27T23:30:00Z'))).toBe(22.5 * ora)
    // a mezzanotte in punto il giorno è già quello nuovo: manca un giorno intero
    expect(msAllaMezzanotte(new Date('2026-10-08T22:00:00Z'))).toBe(24 * ora)
  })
})
