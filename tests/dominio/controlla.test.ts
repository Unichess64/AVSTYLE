// tests/dominio/controlla.test.ts
//
// «Controlla» (spec 3a §4.4, piano 3a-2 Task 9): la decisione sulla coppia
// (riga, esito_invio) — C1 —, il numero di generazione che scarta le risposte
// tardive, e un «Controlla» che fallisce. Logica pura: gira anche in test:fuso.
import { describe, expect, it } from 'vitest'
import { decidiControlla, leggiRispostaControlla, schedaPerCreaDiNuovo } from '../../src/dominio/controlla'
import { type GuastoGrezzo, classifica } from '../../src/dominio/errori'
import type { Scheda } from '../../src/dominio/scheda'
import { nuovoStatoScheda } from '../../src/dominio/scheda-viva'
import type { StatoVisita } from '../../src/dominio/stato-visita'

const VISITA = '50000000-0000-4000-8000-000000000901'
const MARIA = '40000000-0000-4000-8000-000000000901'
const VERA = '10000000-0000-4000-8000-000000000001'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const A1 = '60000000-0000-4000-8000-000000000901'
const A2 = '60000000-0000-4000-8000-000000000902'
const DATA = '2026-10-08'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// Due aiuti locali di questo file, definiti QUI: costruiscono una `Scheda` e
// uno `StatoVisita` completi partendo dai soli campi che la prova vuole
// variare. Due appuntamenti, due operatrici, due servizi: `inizio` sposta il
// primo, il secondo resta alle 11:40.
function schedaDiProva(p: Partial<Scheda> & { inizio?: number } = {}): Scheda {
  const { inizio = 120, ...altro } = p
  return {
    visitaId: VISITA,
    modo: 'modifica',
    cliente: { tipo: 'esistente', id: MARIA },
    clienteEsisteAncora: true,
    data: DATA,
    servizi: [
      { id: A1, nuovo: false, operatriceId: VERA, servizioId: REFILL, inizio, durata: 15, durataAMano: false, segueIlPrecedente: false },
      { id: A2, nuovo: false, operatriceId: ALESSANDRA, servizioId: MASSAGGIO, inizio: 140, durata: 12, durataAMano: false, segueIlPrecedente: false },
    ],
    versioneVisita: 'V-VECCHIA',
    attesi: [{ id: A1, versione: 'a1-vecchia' }, { id: A2, versione: 'a2-vecchia' }],
    avvisiConfermati: new Set(),
    partenza: { operatriceId: VERA, inizio },
    ...altro,
  }
}

function statoDiProva(p: Partial<StatoVisita> & { inizio?: number } = {}): StatoVisita {
  const { inizio = 120, ...altro } = p
  return {
    visita: 'V-NUOVA',
    data: DATA,
    cliente: MARIA,
    appuntamenti: [
      { id: A1, versione: 'a1-nuova', operatrice: VERA, servizio: REFILL, inizio, durata: 15 },
      { id: A2, versione: 'a2-nuova', operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 140, durata: 12 },
    ],
    ...altro,
  }
}

// La scheda di partenza e lo stato letto sono COSTRUITI DIVERSI apposta: se
// fossero uguali, «adotta lo stato letto» e «tieni le versioni di partenza»
// darebbero lo stesso risultato e nessuna prova distinguerebbe i due rami.
// ⚠︎ `visita` è la VERSIONE (0016:47), non l'id: vedi `stato-visita.ts`.
const SCHEDA = schedaDiProva({ inizio: 120, versioneVisita: 'V-VECCHIA' })
const LETTO = statoDiProva({ inizio: 132, visita: 'V-NUOVA' })

describe('C1: la riga 1 è sovraccarica, e il contratto è la coppia', () => {
  it('riga 1 con `annullato`: «Salva» riparte con le versioni DI PARTENZA, mai rilette', () => {
    const d = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'salva')
    expect(d.testo).toBe('Non risulta salvata: l’invio non ha scritto nulla')
    expect(d.versioni).toBe('partenza')
    expect(d.schedaAdottaStato).toBe(false)
    expect(d.riaccende).toBe('salva')
  })

  it('riga 1 con `non_trovata`: la scheda ADOTTA lo stato letto e le sue versioni', () => {
    const d = decidiControlla({ riga: 1, esito_invio: 'non_trovata', stato: LETTO }, SCHEDA, 'salva')
    expect(d.testo).toBe('Non risulta salvata: l’invio non ha scritto nulla')
    expect(d.versioni).toBe('lette')
    expect(d.schedaAdottaStato).toBe(true) // «La scheda aggiornata» vale anche qui
  })

  it('la SOLA differenza fra i due casi è l esito: la riga è la stessa', () => {
    // La prova che nomina il contratto. Un app che decidesse sul solo `riga`
    // la fallirebbe, e nel verso `annullato` toglierebbe in silenzio il lavoro
    // della collega (famiglia B5, R6-1).
    const a = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'salva')
    const b = decidiControlla({ riga: 1, esito_invio: 'non_trovata', stato: LETTO }, SCHEDA, 'salva')
    expect(a.testo).toBe(b.testo)
    expect(a.versioni).not.toBe(b.versioni)
  })
})

describe('le altre righe di §4.4', () => {
  it('riga 2 con lo stato UGUALE alla scheda: «✓ Risulta salvata»', () => {
    const uguale = statoDiProva({ inizio: 120, visita: 'V-NUOVA' })
    const d = decidiControlla({ riga: 2, esito_invio: 'salvata', stato: uguale }, SCHEDA, 'salva')
    expect(d.testo).toBe('✓ Risulta salvata')
    expect(d.spunta).toBe(true)
  })

  it('riga 2 con lo stato DIVERSO dalla scheda diventa la riga 3: la distingue l app', () => {
    // ⚠︎ `controlla_invio` non restituisce MAI riga 3: l'immagine è {1,2,4,5,6,7}.
    const d = decidiControlla({ riga: 2, esito_invio: 'salvata', stato: LETTO }, SCHEDA, 'salva')
    expect(d.testo).toBe('È diversa da come l’avevi lasciata: ecco com’è ora')
    expect(d.schedaAdottaStato).toBe(true)
    expect(d.versioni).toBe('lette')
    expect(d.spunta).toBe(false)
  })

  it('riga 4: cancellata dopo il salvataggio; «Crea di nuovo» SOLO se la cliente esiste ancora', () => {
    const conCliente = decidiControlla({ riga: 4, esito_invio: 'salvata', stato: null }, schedaDiProva({ clienteEsisteAncora: true }), 'salva')
    expect(conCliente.testo).toBe('È stata cancellata dopo il salvataggio')
    expect(conCliente.offreCreaDiNuovo).toBe(true)
    const senza = decidiControlla({ riga: 4, esito_invio: 'salvata', stato: null }, schedaDiProva({ clienteEsisteAncora: false }), 'salva')
    expect(senza.offreCreaDiNuovo).toBe(false)
    // senza offerta la scheda non ha più niente da fare: si chiude e il giorno si rilegge
    expect(senza.ricaricaIlGiorno).toBe(true)
  })

  it('riga 4 con `non_trovata`: NON dice «dopo il salvataggio», perché non c è stato nessun salvataggio', () => {
    // ⚠︎ C1 fino in fondo: la coppia, non la riga. `controlla_invio` manda su
    // riga 4 anche `non_trovata` con la visita assente e fra le cancellate
    // (0018:96-102), ed è il caso misurato che ha prodotto la revisione 19.
    // Dire «È stata cancellata dopo il salvataggio» e offrire «Crea di nuovo»
    // AFFERMA un salvataggio che non è mai avvenuto.
    const d = decidiControlla({ riga: 4, esito_invio: 'non_trovata', stato: null }, schedaDiProva({ clienteEsisteAncora: true }), 'salva')
    expect(d.testo).toBe('La visita è stata cancellata')
    expect(d.spunta).toBe(false)
    expect(d.offreCreaDiNuovo).toBe(false)
  })

  it('riga 5 con `non_trovata` è il caso ordinario, non un errore', () => {
    const d = decidiControlla({ riga: 5, esito_invio: 'non_trovata', stato: null }, SCHEDA, 'salva')
    expect(d.testo).toBe('Questa visita non esiste più')
    expect(d.errore).toBe(false)
    expect(d.ricaricaIlGiorno).toBe(true)
  })

  it('riga 6 con `esiste_gia`: la visita si rilegge e si mostra come riga 2 o 3', () => {
    // ⚠︎ Nella prima stesura del piano `esiste_gia` cadeva nel ramo generico,
    // che dà la STRINGA VUOTA di `messaggioPerEsito('esiste_gia')`: l'operatrice
    // non vedeva niente, e la scheda teneva gli id già consumati.
    const uguale = statoDiProva({ inizio: 120, visita: 'V-NUOVA' })
    expect(decidiControlla({ riga: 6, esito_invio: 'esiste_gia', stato: uguale }, SCHEDA, 'salva').testo).toBe('✓ Risulta salvata')
    expect(decidiControlla({ riga: 6, esito_invio: 'esiste_gia', stato: LETTO }, SCHEDA, 'salva').testo).toBe(
      'È diversa da come l’avevi lasciata: ecco com’è ora',
    )
  })

  it('riga 6 con `esiste_gia` e la visita SPARITA prima della rilettura vale come riga 4 o 5', () => {
    const d = decidiControlla({ riga: 6, esito_invio: 'esiste_gia', stato: null }, SCHEDA, 'salva')
    expect(d.testo).not.toBe('')
    expect(d.ricaricaIlGiorno).toBe(true)
  })

  it('riga 5 è un errore, e l agenda si ricarica', () => {
    const d = decidiControlla({ riga: 5, esito_invio: 'salvata', stato: null }, SCHEDA, 'salva')
    expect(d.errore).toBe(true)
    expect(d.ricaricaIlGiorno).toBe(true)
    expect(d.spunta).toBe(false)
  })

  it('riga 6 porta il messaggio dell esito, e per `gia_cancellata` è QUELLO della risposta diretta', () => {
    expect(decidiControlla({ riga: 6, esito_invio: 'gia_cancellata', stato: null }, SCHEDA, 'elimina').testo).toBe('Era già stata cancellata')
    expect(decidiControlla({ riga: 6, esito_invio: 'modificata_altrove', stato: LETTO }, SCHEDA, 'salva').testo).toBe(
      'È diversa da come l’avevi lasciata: ecco com’è ora',
    )
    expect(decidiControlla({ riga: 6, esito_invio: 'cancellata_altrove', stato: null }, SCHEDA, 'salva').testo).toBe(
      'È stata cancellata da un’altra parte',
    )
  })

  it('riga 6 con `modificata_altrove` e con `cancellata_altrove` NON portano il ✓', () => {
    for (const e of ['modificata_altrove', 'cancellata_altrove'] as const) {
      expect(decidiControlla({ riga: 6, esito_invio: e, stato: null }, SCHEDA, 'salva').spunta).toBe(false)
    }
  })

  it('riga 6 con `modificata_altrove` fa adottare lo stato: altrimenti il «Salva» dopo toglie il servizio della collega', () => {
    const d = decidiControlla({ riga: 6, esito_invio: 'modificata_altrove', stato: LETTO }, SCHEDA, 'salva')
    expect(d.schedaAdottaStato).toBe(true)
    expect(d.versioni).toBe('lette')
  })

  it('riga 7: «✓ Risulta cancellata», con il ✓, e NON «✓ Risulta salvata»', () => {
    const d = decidiControlla({ riga: 7, esito_invio: 'cancellata', stato: null }, SCHEDA, 'elimina')
    expect(d.testo).toBe('✓ Risulta cancellata')
    expect(d.spunta).toBe(true)
  })

  it('dopo la riga 1 di un «Togli» si riaccende «Togli», non «Elimina»', () => {
    expect(decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'togli').riaccende).toBe('togli')
    const uguale = statoDiProva({ inizio: 120 })
    expect(decidiControlla({ riga: 1, esito_invio: 'annullato', stato: uguale }, SCHEDA, 'elimina').riaccende).toBe('elimina')
  })

  it('«Elimina» incerta con il codice annullato e la visita PRESENTE e UGUALE: «Elimina» con le versioni di partenza', () => {
    // §4.4, «Elimina visita» incerta: «se è uguale a quella di partenza,
    // “Elimina” si riaccende con le versioni di partenza». Per «Elimina» la
    // scheda passata è quella LETTA, cioè ciò che l'invio ha mandato.
    const d = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: statoDiProva({ inizio: 120 }) }, SCHEDA, 'elimina')
    expect(d.testo).toContain('non ha scritto nulla')
    expect(d.versioni).toBe('partenza')
    expect(d.schedaAdottaStato).toBe(false)
  })

  it('la gemella: visita PRESENTE e DIVERSA, vale la scheda aggiornata («dove sta la visita lo dice la lettura»)', () => {
    // Divergenza dal piano, che qui asseriva `partenza` con LETTO diverso e
    // lasciava la scelta «al chiamante»: §4.4 la scrive — «se è diversa, vale
    // la regola della scheda aggiornata».
    const d = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'elimina')
    expect(d.testo).toContain('non ha scritto nulla')
    expect(d.schedaAdottaStato).toBe(true)
    expect(d.versioni).toBe('lette')
  })

  it('«Elimina» incerta con il codice annullato e la visita ASSENTE: «È stata cancellata nel frattempo»', () => {
    const d = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: null }, SCHEDA, 'elimina')
    expect(d.testo).toBe('È stata cancellata nel frattempo')
    expect(d.spunta).toBe(false)
    expect(d.ricaricaIlGiorno).toBe(true)
  })

  it('«Crea di nuovo» usa id NUOVI: riusare quello della visita darebbe `cancellata_altrove` per sempre', () => {
    const d = decidiControlla({ riga: 4, esito_invio: 'salvata', stato: null }, { ...SCHEDA, clienteEsisteAncora: true }, 'salva')
    expect(d.offreCreaDiNuovo).toBe(true)
    const nuova = schedaPerCreaDiNuovo({ ...SCHEDA, cliente: { tipo: 'nuova', id: MARIA, nome: 'Maria', telefono: null, meseDiNascita: null, giornoDiNascita: null } })
    expect(nuova.visitaId).toMatch(UUID)
    expect(nuova.visitaId).not.toBe(VISITA)
    expect(nuova.servizi.map((s) => s.id).every((id) => UUID.test(id) && id !== A1 && id !== A2)).toBe(true)
    expect(nuova.servizi.every((s) => s.nuovo)).toBe(true)
    expect(nuova).toMatchObject({ modo: 'creazione', versioneVisita: null, attesi: [], cliente: { tipo: 'esistente', id: MARIA } })
    // ciò che l'operatrice aveva scritto resta: stessi servizi, orari e operatrici
    expect(nuova.servizi.map((s) => [s.operatriceId, s.servizioId, s.inizio, s.durata])).toEqual(
      SCHEDA.servizi.map((s) => [s.operatriceId, s.servizioId, s.inizio, s.durata]),
    )
  })
})

describe('la risposta della rotta si controlla prima di decidere', () => {
  it('accetta le righe di `controlla_invio` e rifiuta la 3, che la funzione non dà mai', () => {
    const stato = { visita: 'v', data: DATA, cliente: MARIA, appuntamenti: [] }
    expect(leggiRispostaControlla({ riga: 2, esito_invio: 'salvata', stato })).toEqual({ riga: 2, esito_invio: 'salvata', stato })
    expect(() => leggiRispostaControlla({ riga: 3, esito_invio: 'salvata', stato })).toThrow()
    expect(() => leggiRispostaControlla({ riga: 1, esito_invio: 'in_corso', stato: null })).toThrow()
    expect(() => leggiRispostaControlla(null)).toThrow()
  })
})

describe('le risposte tardive si scartano per numero di generazione (§4.4, §8.1)', () => {
  // Il percorso: 10 s scaduti → «Non so» → «Controlla», che brucia il codice
  // e risponde riga 1/`annullato` riaccendendo «Salva» con le versioni DI
  // PARTENZA (C1) → POI la promessa della Server Action abbandonata si risolve.
  // Senza generazione quel secondo handler riscriverebbe pulsanti, versioni e
  // messaggio sopra la decisione di «Controlla».

  it('una risposta con la generazione corrente si applica', () => {
    const s = nuovoStatoScheda(SCHEDA)
    const gen = s.generazione // la scheda parte da 0
    s.applica(gen, { tipo: 'esito', esito: 'salvata' })
    expect(s.generazione).toBe(gen)
    expect(s.messaggio).toBe('✓ Salvata')
  })

  it('«Controlla» incrementa la generazione, e l invio abbandonato che arriva dopo si scarta', () => {
    const s = nuovoStatoScheda(SCHEDA)
    const genInvio = s.salva()
    s.scaduto() // 10 s di D3-9
    expect(s.pulsanti).toEqual({ salva: false, controlla: true })
    s.controlla() // incrementa
    s.applica(s.generazione, { tipo: 'riga', riga: 1, esito_invio: 'annullato', stato: LETTO })
    expect(s.versioni).toBe('partenza')
    expect(s.pulsanti).toEqual({ salva: true, controlla: false })
    // …e ORA arriva la risposta dell'invio abbandonato, con la generazione vecchia
    s.applica(genInvio, { tipo: 'esito', esito: 'salvata', visita: 'V-TARDIVA' })
    expect(s.versioni).toBe('partenza') // invariato
    expect(s.messaggio).not.toBe('✓ Salvata')
  })

  it('anche un nuovo «Salva» incrementa la generazione', () => {
    const s = nuovoStatoScheda(SCHEDA)
    const primo = s.generazione
    s.salva()
    expect(s.generazione).not.toBe(primo)
  })

  it('la decisione confronta con la scheda INVIATA, non con quella d apertura', () => {
    // Revisione del Task 9: la scheda usa la decisione del modello, quindi il
    // modello deve conoscere ciò che l'invio ha mandato.
    const s = nuovoStatoScheda(SCHEDA)
    s.salva('salva', schedaDiProva({ inizio: 132 }))
    s.scaduto()
    s.controlla()
    s.applica(s.generazione, { tipo: 'riga', riga: 2, esito_invio: 'salvata', stato: LETTO })
    expect(s.decisione?.testo).toBe('✓ Risulta salvata')
  })

  it('e una riga arrivata con una generazione vecchia non lascia nessuna decisione', () => {
    const s = nuovoStatoScheda(SCHEDA)
    s.salva('salva', SCHEDA)
    const vecchia = s.controlla()
    s.controlla()
    s.applica(vecchia, { tipo: 'riga', riga: 1, esito_invio: 'annullato', stato: LETTO })
    expect(s.decisione).toBeNull()
  })

  it('lo scadere dei 10 s NON incrementa la generazione: l invio può ancora arrivare', () => {
    const s = nuovoStatoScheda(SCHEDA)
    const gen = s.salva()
    s.scaduto()
    expect(s.generazione).toBe(gen)
    s.applica(gen, { tipo: 'esito', esito: 'salvata' })
    expect(s.messaggio).toBe('✓ Salvata')
  })
})

describe('un «Controlla» che fallisce dà di nuovo «Non so» (§4.4)', () => {
  // Non chiamano la rotta: passano da `classifica`, che è logica pura (Task 4).
  // La rotta stessa ha la sua prova in tests/app/controlla-fuori-fila.test.ts.
  const esitoDelPercorsoControlla = (g: GuastoGrezzo) => classifica('controlla', g).tipo

  it('per 57014, 55P03, 40001, 40P01 e per la rete', () => {
    for (const c of ['57014', '55P03', '40001', '40P01', null]) {
      expect(esitoDelPercorsoControlla({ sqlstate: c })).toBe('non_so')
    }
  })
  it('e 42501 è uscita forzata, senza affermazioni sulla visita', () => {
    expect(esitoDelPercorsoControlla({ sqlstate: '42501' })).toBe('uscita_forzata')
  })
})
