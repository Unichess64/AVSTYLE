// tests/dominio/scheda.test.ts
//
// Il modello della scheda visita (piano 3a-2, Task 7). Le tre cose che non
// può sbagliare: gli id all'apertura con `crypto.randomUUID()`, `adottaStato`
// che passa da `proiettaAttesi` (C3), e `ugualeAllaScheda`, che è la
// definizione di §4.4 e distingue la riga 2 dalla riga 3 di «Controlla».
import { describe, expect, it } from 'vitest'
import {
  type Scheda,
  adottaStato,
  apriSchedaSuVisita,
  apriSchedaVuota,
  appuntamentiDaInviare,
  bloccoDelSalva,
  compleannoPossibile,
  nuovaCliente,
  operatriceScelta,
  serializza,
  telefonoDalModulo,
  togli,
  ugualeAllaScheda,
} from '../../src/dominio/scheda'
import type { StatoVisita } from '../../src/dominio/stato-visita'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const VISITA = '50000000-0000-4000-8000-000000000001'
const MARIA = '40000000-0000-4000-8000-000000000001'
const LUCIA = '40000000-0000-4000-8000-000000000002'
const VERA = '10000000-0000-4000-8000-000000000001'
const ANNALISA = '10000000-0000-4000-8000-000000000002'
const ALESSANDRA = '10000000-0000-4000-8000-000000000003'
const REFILL = '30000000-0000-4000-8000-000000000001'
const MASSAGGIO = '30000000-0000-4000-8000-000000000002'
const A_ALTO = 'ffffffff-0000-4000-8000-000000000002'
const A_BASSO = '00000000-0000-4000-8000-000000000001'

// ⚠︎ Le forme VERE: `visita` è la versione (non l'id), `cliente` un uuid nudo,
// `inizio` e `durata` numeri. Gli appuntamenti sono in ordine DECRESCENTE
// apposta: il caso che il piano 3a-1 ha misurato come letale (C3).
const STATO: StatoVisita = Object.freeze({
  visita: '2026-10-03T09:00:00.123456Z',
  data: '2026-10-08',
  cliente: MARIA,
  appuntamenti: Object.freeze([
    { id: A_ALTO, versione: '2026-10-03T09:00:00.222222Z', operatrice: ALESSANDRA, servizio: MASSAGGIO, inizio: 138, durata: 10 },
    { id: A_BASSO, versione: '2026-10-03T09:00:00.111111Z', operatrice: VERA, servizio: REFILL, inizio: 120, durata: 18 },
  ]),
}) as StatoVisita

function conAppuntamento(i: number, campi: Partial<StatoVisita['appuntamenti'][number]>): StatoVisita {
  return { ...STATO, appuntamenti: STATO.appuntamenti.map((a, j) => (j === i ? { ...a, ...campi } : a)) }
}

describe('apertura', () => {
  it('una scheda aperta vuota ha modo creazione e versioneVisita null', () => {
    const s = apriSchedaVuota('2026-10-08', VERA, 150)
    expect(s).toMatchObject({
      modo: 'creazione',
      versioneVisita: null,
      data: '2026-10-08',
      cliente: null,
      clienteEsisteAncora: true,
      servizi: [],
      attesi: [],
      partenza: { operatriceId: VERA, inizio: 150 },
    })
    expect(s.avvisiConfermati.size).toBe(0)
  })

  it('gli id della scheda sono uuid distinti a ogni apertura', () => {
    const una = apriSchedaVuota('2026-10-08', VERA, 150)
    const altra = apriSchedaVuota('2026-10-08', VERA, 150)
    expect(una.visitaId).toMatch(UUID)
    expect(altra.visitaId).toMatch(UUID)
    expect(una.visitaId).not.toBe(altra.visitaId)
    const c1 = nuovaCliente()
    const c2 = nuovaCliente()
    expect(c1.id).toMatch(UUID)
    expect(c1.id).not.toBe(c2.id)
    expect(c1).toEqual({ tipo: 'nuova', id: c1.id, nome: '', telefono: null, meseDiNascita: null, giornoDiNascita: null })
  })

  it('apriSchedaSuVisita prende versioneVisita da stato.visita, che è una VERSIONE', () => {
    const s = apriSchedaSuVisita(STATO, VISITA)
    expect(s.versioneVisita).toBe('2026-10-03T09:00:00.123456Z')
    expect(s.visitaId).toBe(VISITA)
    expect(s.modo).toBe('modifica')
    expect(s.cliente).toEqual({ tipo: 'esistente', id: MARIA })
    expect(s.data).toBe('2026-10-08')
  })

  it('una scheda aperta su una visita porta gli attesi PROIETTATI e ORDINATI', () => {
    const s = apriSchedaSuVisita(STATO, VISITA)
    expect(s.attesi).toEqual([
      { id: A_BASSO, versione: '2026-10-03T09:00:00.111111Z' },
      { id: A_ALTO, versione: '2026-10-03T09:00:00.222222Z' },
    ])
  })

  it('i servizi della scheda sono in ordine d ora e nessuno è nuovo né a mano', () => {
    const s = apriSchedaSuVisita(STATO, VISITA)
    expect(s.servizi).toEqual([
      { id: A_BASSO, nuovo: false, operatriceId: VERA, servizioId: REFILL, inizio: 120, durata: 18, durataAMano: false, segueIlPrecedente: false },
      { id: A_ALTO, nuovo: false, operatriceId: ALESSANDRA, servizioId: MASSAGGIO, inizio: 138, durata: 10, durataAMano: false, segueIlPrecedente: false },
    ])
    expect(s.partenza).toEqual({ operatriceId: VERA, inizio: 120 })
  })
})

describe('adottaStato (§4.4, «La scheda aggiornata»)', () => {
  it('adottaStato riproietta e riordina, anche partendo da uno stato in ordine decrescente', () => {
    const vecchia = apriSchedaSuVisita({ ...STATO, appuntamenti: [] }, VISITA)
    const s = adottaStato(vecchia, STATO)
    expect(s.attesi).toEqual([
      { id: A_BASSO, versione: '2026-10-03T09:00:00.111111Z' },
      { id: A_ALTO, versione: '2026-10-03T09:00:00.222222Z' },
    ])
    for (const a of s.attesi) expect(Object.keys(a).sort()).toEqual(['id', 'versione'])
  })

  it('adottaStato butta le modifiche non inviate', () => {
    const toccata: Scheda = {
      ...apriSchedaSuVisita(STATO, VISITA),
      data: '2026-10-09',
      cliente: { tipo: 'esistente', id: LUCIA },
      servizi: [],
      versioneVisita: 'vecchia',
      avvisiConfermati: new Set(['fuori-orario:x']),
      clienteEsisteAncora: false,
    }
    const s = adottaStato(toccata, STATO)
    expect(s.data).toBe('2026-10-08')
    expect(s.cliente).toEqual({ tipo: 'esistente', id: MARIA })
    expect(s.servizi.map((x) => x.id)).toEqual([A_BASSO, A_ALTO])
    expect(s.versioneVisita).toBe(STATO.visita)
    expect(s.avvisiConfermati.size).toBe(0)
    expect(s.visitaId).toBe(VISITA)
    expect(s.modo).toBe('modifica')
    expect(ugualeAllaScheda(s, STATO)).toBe(true)
  })
})

describe('ugualeAllaScheda (§4.4): una prova per campo', () => {
  const scheda = apriSchedaSuVisita(STATO, VISITA)

  it('la gemella positiva: la scheda appena aperta è uguale al suo stato', () => {
    expect(ugualeAllaScheda(scheda, STATO)).toBe(true)
  })

  it('guarda la data', () => {
    expect(ugualeAllaScheda(scheda, { ...STATO, data: '2026-10-09' })).toBe(false)
  })

  it('guarda la cliente', () => {
    expect(ugualeAllaScheda(scheda, { ...STATO, cliente: LUCIA })).toBe(false)
  })

  it('guarda l operatrice', () => {
    expect(ugualeAllaScheda(scheda, conAppuntamento(1, { operatrice: ANNALISA }))).toBe(false)
  })

  it('guarda il servizio', () => {
    expect(ugualeAllaScheda(scheda, conAppuntamento(1, { servizio: MASSAGGIO }))).toBe(false)
  })

  it('guarda l inizio', () => {
    expect(ugualeAllaScheda(scheda, conAppuntamento(1, { inizio: 121 }))).toBe(false)
  })

  it('guarda la durata', () => {
    expect(ugualeAllaScheda(scheda, conAppuntamento(1, { durata: 17 }))).toBe(false)
  })

  it('guarda l insieme: un appuntamento in più o in meno non è uguale', () => {
    expect(ugualeAllaScheda(scheda, { ...STATO, appuntamenti: STATO.appuntamenti.slice(0, 1) })).toBe(false)
    expect(ugualeAllaScheda(togli(scheda, A_ALTO), STATO)).toBe(false)
    expect(ugualeAllaScheda(scheda, conAppuntamento(0, { id: '11111111-0000-4000-8000-000000000009' }))).toBe(false)
  })

  it('ugualeAllaScheda con stato null è falso', () => {
    expect(ugualeAllaScheda(scheda, null)).toBe(false)
  })

  it('ugualeAllaScheda non guarda le versioni', () => {
    // Le versioni dicono QUANDO, non CHE COSA.
    const altreVersioni: StatoVisita = {
      ...STATO,
      visita: '2026-10-04T10:00:00.999999Z',
      appuntamenti: STATO.appuntamenti.map((a) => ({ ...a, versione: '2026-10-04T10:00:00.999999Z' })),
    }
    expect(ugualeAllaScheda(scheda, altreVersioni)).toBe(true)
  })

  it('ugualeAllaScheda non guarda clienteEsisteAncora', () => {
    expect(ugualeAllaScheda({ ...scheda, clienteEsisteAncora: false }, STATO)).toBe(true)
  })

  it('ugualeAllaScheda confronta la cliente fra un OGGETTO e un uuid nudo', () => {
    const nuova = { ...nuovaCliente(), id: MARIA, nome: 'Maria Rossi' }
    expect(ugualeAllaScheda({ ...scheda, cliente: { tipo: 'esistente', id: MARIA } }, STATO)).toBe(true)
    expect(ugualeAllaScheda({ ...scheda, cliente: nuova }, STATO)).toBe(true)
    expect(ugualeAllaScheda({ ...scheda, cliente: { tipo: 'esistente', id: LUCIA } }, STATO)).toBe(false)
    expect(ugualeAllaScheda({ ...scheda, cliente: null }, STATO)).toBe(false)
  })
})

describe('D2-2: la selezione e il valore nel modello sono due cose diverse', () => {
  const ATTIVE = [VERA, ALESSANDRA]   // Annalisa è stata disattivata
  const stato: StatoVisita = conAppuntamento(1, { operatrice: ANNALISA })

  it('una scheda aperta su un appuntamento di un operatrice disattivata conserva il suo operatriceId', () => {
    const s = apriSchedaSuVisita(stato, VISITA)
    const suo = s.servizi.find((x) => x.id === A_BASSO)!
    expect(suo.operatriceId).toBe(ANNALISA)
    // l'elenco non la mostra: nessuna selezione, ma il modello non cambia
    expect(operatriceScelta(suo, ATTIVE)).toBeNull()
    expect(operatriceScelta(s.servizi.find((x) => x.id === A_ALTO)!, ATTIVE)).toBe(ALESSANDRA)
    expect(bloccoDelSalva(s, ATTIVE)).toBe('Scegli un’operatrice attiva per questo servizio.')
  })

  it('togli su una visita con un servizio di un operatrice disattivata produce un elenco completo con tutte le operatrici valorizzate', () => {
    const s = apriSchedaSuVisita(stato, VISITA)
    const elenco = appuntamentiDaInviare(togli(s, A_ALTO))
    expect(elenco).toEqual([{ id: A_BASSO, operatrice: ANNALISA, servizio: REFILL, inizio: 120, durata: 18 }])
    for (const a of elenco) expect(typeof a.operatrice === 'string' && a.operatrice.length > 0).toBe(true)
  })

  it('con tutte le operatrici attive «Salva» non è bloccato da D2-2', () => {
    expect(bloccoDelSalva(apriSchedaSuVisita(STATO, VISITA), ATTIVE)).toBeNull()
  })
})

describe('il confine verso la Server Action', () => {
  it('serializza trasforma gli avvisi confermati in un array e non perde nient altro', () => {
    const s: Scheda = { ...apriSchedaSuVisita(STATO, VISITA), avvisiConfermati: new Set(['b', 'a']) }
    const z = serializza(s)
    expect(z.avvisiConfermati).toEqual(['a', 'b'])
    expect(JSON.parse(JSON.stringify(z))).toEqual(z)
    const { avvisiConfermati: _a, ...resto } = s
    const { avvisiConfermati: _b, ...restoZ } = z
    expect(restoZ).toEqual(resto)
  })
})

describe('il modulo «Nuova cliente»', () => {
  it('il telefono si normalizza in E.164, vuoto è null, storto è errato', () => {
    expect(telefonoDalModulo('333 123 4567')).toEqual({ e164: '+393331234567', errato: false })
    expect(telefonoDalModulo('  ')).toEqual({ e164: null, errato: false })
    expect(telefonoDalModulo('333 12a')).toEqual({ e164: null, errato: true })
  })

  it('il compleanno senza anno: il 29 febbraio sì, il 31 aprile no, metà no', () => {
    expect(compleannoPossibile(2, 29)).toBe(true)
    expect(compleannoPossibile(12, 31)).toBe(true)
    expect(compleannoPossibile(null, null)).toBe(true)
    expect(compleannoPossibile(4, 31)).toBe(false)
    expect(compleannoPossibile(2, 30)).toBe(false)
    expect(compleannoPossibile(4, null)).toBe(false)
    expect(compleannoPossibile(13, 1)).toBe(false)
  })
})
