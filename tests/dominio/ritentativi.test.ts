import { describe, expect, it } from 'vitest'
import { POLITICA, conRitentativi } from '../../src/dominio/ritentativi'

const sqlstateDi = (e: unknown) => (e as { sqlstate?: string }).sqlstate ?? null
const guasto = (sqlstate: string) => Object.assign(new Error(sqlstate), { sqlstate })

describe('RETRY-40P01 (§4.3 passo 5, §3.2)', () => {
  it('due 40P01 poi successo: tre tentativi, e il valore è quello del terzo', async () => {
    const dormito: number[] = []
    let n = 0
    const esito = await conRitentativi(
      async () => { n += 1; if (n <= 2) throw guasto('40P01'); return 'salvata' },
      sqlstateDi,
      async (ms) => { dormito.push(ms) },
      () => 0.5,
    )
    expect(esito).toEqual({ valore: 'salvata', tentativi: 3 })
    // ⚠︎ Revisione del Task 4: `toHaveLength(2)` restava verde con un'attesa
    // fissa. I valori esatti provano che tentativo e caso arrivano a
    // POLITICA.attesaMs: 50·2^t·(1 + 2·caso), con caso 0,5.
    expect(dormito).toEqual([100, 200])
  })

  it('quattro 40P01: solleva, e i tentativi sono 4 — uno più i tre ritentativi', async () => {
    let n = 0
    const dormito: number[] = []
    await expect(
      conRitentativi(
        async () => { n += 1; throw guasto('40P01') },
        sqlstateDi,
        async (ms) => { dormito.push(ms) },
        () => 0.5,
      ),
    ).rejects.toThrow()
    expect(n).toBe(1 + POLITICA.massimo)
    // Tre attese, non quattro: dopo l'ultimo tentativo non si dorme (fino a
    // 0,6 s sprecati dentro i 10 s di D3-9).
    expect(dormito).toEqual([100, 200, 400])
    expect(POLITICA.massimo).toBe(3)
  })

  it('un codice diverso NON fa ritentare: si solleva al primo colpo', async () => {
    let n = 0
    await expect(
      conRitentativi(
        async () => { n += 1; throw guasto('23505') },
        sqlstateDi,
        async () => {},
        () => 0.5,
      ),
    ).rejects.toThrow()
    expect(n).toBe(1)
  })

  it('un guasto SENZA sqlstate non fa ritentare: potrebbe essere già arrivato', async () => {
    // §4.4: un invio senza risposta può ancora scrivere. Ritentarlo alla cieca
    // è esattamente ciò che D3-21 ha scartato.
    let n = 0
    await expect(
      conRitentativi(
        async () => { n += 1; throw new Error('rete') },
        sqlstateDi,
        async () => {},
        () => 0.5,
      ),
    ).rejects.toThrow()
    expect(n).toBe(1)
  })

  it('le attese crescono e sono casuali dentro la loro finestra', async () => {
    const conCaso = (caso: number) =>
      [0, 1, 2].map((t) => POLITICA.attesaMs(t, caso))
    const basse = conCaso(0)
    const alte = conCaso(0.999)
    expect(basse[0]).toBeLessThan(basse[1])
    expect(basse[1]).toBeLessThan(basse[2])
    for (let t = 0; t < 3; t += 1) expect(alte[t]).toBeGreaterThan(basse[t])
  })

  it('il bilancio di tempo delle attese sta largamente dentro i 10 s di D3-9', () => {
    // §4.3 passo 5: 1 s di deadlock_timeout per ogni 40P01. Le ATTESE nostre
    // sono l'unica parte che questo modulo controlla, e devono restare piccole
    // accanto a quei quattro secondi.
    const peggio = [0, 1, 2].reduce((s, t) => s + POLITICA.attesaMs(t, 0.999), 0)
    expect(peggio).toBeLessThan(1500)
  })

  it('il tentativo arriva alla chiamata, così l invio può portare lo stesso codice', async () => {
    const visti: number[] = []
    await conRitentativi(
      async (t) => { visti.push(t); if (t < 2) throw guasto('40P01'); return 'ok' },
      sqlstateDi,
      async () => {},
      () => 0.5,
    )
    expect(visti).toEqual([0, 1, 2])
  })

  it('con una scadenza già passata non ritenta, anche su 40P01', () => {
    // ⚠︎ Presidia il parametro PRIMA che la decisione lo usi: un parametro che
    // nessuna prova esercita è un parametro che si può cancellare per sbaglio.
    let n = 0
    return expect(
      conRitentativi(
        async () => { n += 1; throw guasto('40P01') },
        sqlstateDi, async () => {}, () => 0.5,
        0,                                    // scadenza a zero millisecondi
        () => 1000,                           // un orologio fermo, oltre la scadenza
      ),
    ).rejects.toThrow().then(() => expect(n).toBe(1))
  })

  it('il caso arriva a ogni attesa: due scrittori in conflitto non ritentano all unisono', async () => {
    const dormito: number[] = []
    const casi = [0, 0.999]
    let n = 0
    await conRitentativi(
      async () => { n += 1; if (n <= 2) throw guasto('40P01'); return 'ok' },
      sqlstateDi,
      async (ms) => { dormito.push(ms) },
      () => casi.shift()!,
    )
    expect(dormito).toEqual([POLITICA.attesaMs(0, 0), POLITICA.attesaMs(1, 0.999)])
    expect(dormito).toEqual([50, 300])
  })
})
