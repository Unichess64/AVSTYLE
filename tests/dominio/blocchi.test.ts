import { describe, expect, it } from 'vitest'
import { type AppuntamentoLetto, bloccoFuoriOrario, componiBlocchi, finestraVerticale, inizioDalTocco, spaziFuoriOrario } from '../../src/dominio/blocchi'

// Dati non degeneri: due operatrici, tre servizi, pause diverse da zero, due
// visite. Le celle sono da cinque minuti: 120 = 10:00.
const VERA = 'op-vera'
const ALESSANDRA = 'op-alessandra'

function app(
  id: string,
  visitaId: string,
  operatriceId: string,
  inizio: number,
  durata: number,
  pausa: number,
  servizio = 'Refill gel',
): AppuntamentoLetto {
  return {
    id,
    visitaId,
    operatriceId,
    servizioId: `srv-${servizio}`,
    servizioNome: servizio,
    clienteId: `cl-${visitaId}`,
    clienteNome: `Cliente ${visitaId}`,
    inizio,
    durata,
    pausa,
  }
}

const SALONE = { da: 96, a: 240 }   // 08:00–20:00, il seme di salon_settings

describe('componiBlocchi: la contiguità di §9.1', () => {
  it('una visita di due servizi contigui della stessa operatrice è UN blocco', () => {
    // pausa zero: il secondo comincia dove finisce il primo.
    const blocchi = componiBlocchi([
      app('a1', 'v1', VERA, 120, 18, 0, 'Refill gel'),
      app('a2', 'v1', VERA, 138, 6, 0, 'Smalto'),
      app('b1', 'v2', ALESSANDRA, 120, 10, 3, 'Massaggio'),
    ])
    const diV1 = blocchi.filter((b) => b.visitaId === 'v1')
    expect(diV1).toHaveLength(1)
    expect(diV1[0].appuntamenti.map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(diV1[0].inizio).toBe(120)
    expect(diV1[0].fine).toBe(144)
  })

  it('una visita con una pausa diversa da zero resta UN blocco', () => {
    // spec §8.1: «contiguo» è in sequenza con in mezzo SOLO la pausa del
    // servizio precedente. Massaggio 10 celle + pausa 3: il secondo a 133.
    const blocchi = componiBlocchi([
      app('a1', 'v1', ALESSANDRA, 120, 10, 3, 'Massaggio'),
      app('a2', 'v1', ALESSANDRA, 133, 12, 2, 'Pressoterapia'),
      app('b1', 'v2', VERA, 120, 18, 0),
    ])
    const diV1 = blocchi.filter((b) => b.visitaId === 'v1')
    expect(diV1).toHaveLength(1)
    expect(diV1[0].inizio).toBe(120)
    expect(diV1[0].fine).toBe(145)
    expect(diV1[0].segnoDiVisita).toBe(false)
  })

  it('una visita di due servizi con un buco più lungo della pausa è DUE blocchi, con il segno di visita', () => {
    const blocchi = componiBlocchi([
      app('a1', 'v1', ALESSANDRA, 120, 10, 3, 'Massaggio'),
      app('a2', 'v1', ALESSANDRA, 134, 12, 2, 'Pressoterapia'),   // un buco di 4, la pausa è 3
      app('b1', 'v2', VERA, 120, 18, 0),
    ])
    const diV1 = blocchi.filter((b) => b.visitaId === 'v1')
    expect(diV1).toHaveLength(2)
    expect(diV1.map((b) => b.segnoDiVisita)).toEqual([true, true])
    // la gemella: la visita intera dell'altra operatrice non porta il segno
    expect(blocchi.find((b) => b.visitaId === 'v2')!.segnoDiVisita).toBe(false)
  })

  it('una visita spartita fra due operatrici è DUE blocchi, con il segno di visita', () => {
    // Contigua nel tempo (pausa compresa), ma su due colonne: nessuna colonna
    // può disegnarla come un blocco solo.
    const blocchi = componiBlocchi([
      app('a1', 'v1', VERA, 120, 18, 0, 'Refill gel'),
      app('a2', 'v1', ALESSANDRA, 138, 10, 3, 'Massaggio'),
    ])
    expect(blocchi).toHaveLength(2)
    expect(blocchi.map((b) => b.operatriceId)).toEqual([VERA, ALESSANDRA])
    expect(blocchi.map((b) => b.segnoDiVisita)).toEqual([true, true])
  })

  it('un blocco unico porta intera: true; i blocchi spezzati portano intera: false', () => {
    const blocchi = componiBlocchi([
      app('a1', 'v1', VERA, 120, 18, 0),
      app('a2', 'v1', VERA, 138, 6, 0, 'Smalto'),
      app('b1', 'v2', VERA, 160, 18, 0),
      app('b2', 'v2', ALESSANDRA, 178, 10, 3, 'Massaggio'),
    ])
    const per = (v: string) => blocchi.filter((b) => b.visitaId === v).map((b) => b.intera)
    expect(per('v1')).toEqual([true])
    expect(per('v2')).toEqual([false, false])
  })

  it('i blocchi escono in ordine d inizio dentro la colonna', () => {
    const blocchi = componiBlocchi([
      app('c1', 'v3', VERA, 200, 6, 0, 'Smalto'),
      app('a1', 'v1', VERA, 120, 18, 0),
      app('b1', 'v2', ALESSANDRA, 150, 10, 3, 'Massaggio'),
      app('d1', 'v4', VERA, 160, 12, 2, 'Semipermanente'),
    ])
    const diVera = blocchi.filter((b) => b.operatriceId === VERA).map((b) => b.inizio)
    expect(diVera).toEqual([120, 160, 200])
    // e dentro un blocco gli appuntamenti sono in ordine d'inizio anche se
    // arrivano rovesciati
    const rovesciati = componiBlocchi([
      app('a2', 'v1', VERA, 138, 6, 0, 'Smalto'),
      app('a1', 'v1', VERA, 120, 18, 0),
    ])
    expect(rovesciati).toHaveLength(1)
    expect(rovesciati[0].appuntamenti.map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})

describe('finestraVerticale: §9.1 si espande su ciò che c è', () => {
  it('la finestra verticale contiene un appuntamento fuori dagli orari del salone', () => {
    // D18: un appuntamento alle 20:30, dopo la chiusura delle 20:00.
    const f = finestraVerticale([app('a1', 'v1', VERA, 246, 12, 0)], [], SALONE)
    expect(f.da).toBeLessThanOrEqual(96)
    expect(f.a).toBeGreaterThanOrEqual(258)
    // e uno alle 07:15, prima dell'apertura
    const g = finestraVerticale([app('a1', 'v1', VERA, 87, 6, 0)], [], SALONE)
    expect(g.da).toBeLessThanOrEqual(87)
  })

  it('la finestra verticale contiene anche una fascia di disponibilità fuori dai confini', () => {
    const f = finestraVerticale([], [{ startBoundary: 84, endBoundary: 252 }], SALONE)
    expect(f.da).toBeLessThanOrEqual(84)
    expect(f.a).toBeGreaterThanOrEqual(252)
  })

  it('senza niente nel giorno, la finestra è quella dei confini del salone', () => {
    expect(finestraVerticale([], [], SALONE)).toEqual(SALONE)
    // e dentro i confini non si allarga
    expect(
      finestraVerticale([app('a1', 'v1', VERA, 120, 18, 0)], [{ startBoundary: 108, endBoundary: 216 }], SALONE),
    ).toEqual(SALONE)
  })

  it('si allarga a mezz ore intere: la griglia ha una riga ogni 30 minuti', () => {
    const f = finestraVerticale([app('a1', 'v1', VERA, 241, 2, 0)], [{ startBoundary: 91, endBoundary: 200 }], SALONE)
    expect(f).toEqual({ da: 90, a: 246 })
  })
})

describe('inizioDalTocco: §5.1, il tocco su uno spazio libero', () => {
  const colonna = [
    app('a1', 'v1', VERA, 120, 18, 0),                 // 10:00–11:30
    app('a2', 'v2', VERA, 160, 7, 3, 'Smalto'),        // 13:20–13:55
  ]

  it('senza un appuntamento prima, si aggancia al quarto d ora inferiore', () => {
    expect(inizioDalTocco(110, colonna)).toBe(108)    // 09:10 → 09:00
    expect(inizioDalTocco(108, colonna)).toBe(108)
  })

  it('se l appuntamento precedente finisce dopo il quarto d ora, vince la sua fine', () => {
    expect(inizioDalTocco(170, colonna)).toBe(168)    // 14:10 → 14:00 (finisce alle 13:55)
    expect(inizioDalTocco(169, colonna)).toBe(168)
    expect(inizioDalTocco(168, colonna)).toBe(168)
    expect(inizioDalTocco(167, colonna)).toBe(167)    // 13:55: il quarto è 13:45, la fine 13:55
  })

  it('il precedente è quello già finito, non uno che comincia dopo il tocco', () => {
    expect(inizioDalTocco(140, colonna)).toBe(138)    // 11:40: quarto 11:30, fine di a1 11:30
    expect(inizioDalTocco(139, colonna)).toBe(138)
    expect(inizioDalTocco(150, colonna)).toBe(150)    // 12:30: a2 comincia dopo e non conta
  })
})

describe('fuori orario: §5.1', () => {
  const fasce = [
    { startBoundary: 108, endBoundary: 156 },   // 09:00–13:00
    { startBoundary: 168, endBoundary: 216 },   // 14:00–18:00
  ]

  it('gli spazi fuori orario sono il complemento delle fasce dentro la finestra', () => {
    expect(spaziFuoriOrario(fasce, SALONE)).toEqual([
      { da: 96, a: 108 },
      { da: 156, a: 168 },
      { da: 216, a: 240 },
    ])
    expect(spaziFuoriOrario([], SALONE)).toEqual([SALONE])
    expect(spaziFuoriOrario([{ startBoundary: 96, endBoundary: 240 }], SALONE)).toEqual([])
  })

  it('un blocco è fuori orario se un suo appuntamento non sta tutto in una fascia', () => {
    const dentro = componiBlocchi([app('a1', 'v1', VERA, 120, 18, 0), app('a2', 'v1', VERA, 138, 6, 0)])[0]
    expect(bloccoFuoriOrario(dentro, fasce)).toBe(false)
    // finisce alle 13:05, oltre la fascia delle 13:00
    const sborda = componiBlocchi([app('a1', 'v1', VERA, 120, 18, 0), app('a2', 'v1', VERA, 138, 19, 0)])[0]
    expect(bloccoFuoriOrario(sborda, fasce)).toBe(true)
    // a cavallo della pausa pranzo: ogni pezzo in una fascia diversa non basta
    const cavallo = componiBlocchi([app('a1', 'v1', VERA, 150, 24, 0)])[0]
    expect(bloccoFuoriOrario(cavallo, fasce)).toBe(true)
    expect(bloccoFuoriOrario(dentro, [])).toBe(true)
  })
})
