// tests/schema/outsider-write.test.ts
//
// OUTSIDER-WRITE sulle quattro funzioni del 3a: un conto che non è operatrice,
// e un'operatrice disattivata, non devono poter scrivere. Ogni caso porta la
// sua GEMELLA POSITIVA, perché senza di lei le due prove negative resterebbero
// verdi anche con l'imbracatura rotta e nessuno più capace di scrivere.
//
// File proprio e non un innesto in access-control.test.ts: quel file non semina
// le fixture e non conosce le costanti che servono.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANNALISA,
  ANNALISA_AUTH,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asOperatorCommit,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000f9'
const A1 = '60000000-0000-4000-8000-0000000000f9'
let seq = 0
// Un contatore, non l'orologio: due chiamate nello stesso millisecondo
// darebbero lo stesso codice d'invio, e la seconda riceverebbe l'esito della
// prima dal registro.
const COD = () => `70000000-0000-4000-8000-4${String(++seq).padStart(11, '0')}`
const APP = [{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]

let versioni: { visita: string; appuntamenti: unknown[] }

// Nessun beforeAll(preparaAccountLocali): `sessioneDi` → `accedi` →
// `preparaAccountLocali()` (sessioni.ts:88), quindi l'imbracatura si prepara da
// sé al primo accesso. Un beforeAll in più che potesse fallire darebbe SEDICI
// PROVE SALTATE E ZERO ROSSE, che è la trappola chiusa al Task 8.
beforeEach(async () => {
  await resetData()
  await seedFixture()
  versioni = await asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [COD(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify(APP)],
    )
    return r.rows[0].r
  })
})

const statoDb = () =>
  asOwner(async (c) => {
    const r = await c.query<{ id: string; s: number }>('select id, start_cell as s from appointment order by id')
    return r.rows
  })

async function prova(authUid: string, sql: string, params: unknown[]) {
  const prima = await statoDb()
  const esito = await asOperatorCommit(authUid, async (c) => {
    try {
      // ⚠︎ controlla_invio NON restituisce `esito`: il suo unico return di
      // oggetto (0018:145) è jsonb_build_object('riga', …, 'esito_invio', …,
      // 'stato', …). Leggendo il solo `r.esito` si otterrebbe SEMPRE
      // 'valore senza esito', e tre delle quattro prove del suo caso
      // nascerebbero mute: `expect(['salvata','cancellata']).not.toContain(…)`
      // sarebbe vero per costruzione, e la gemella positiva resterebbe verde
      // anche se controlla_invio rispondesse 42501 a un'operatrice attiva —
      // cioè proprio il guasto per cui la gemella esiste.
      const r = await c.query<{ r: { esito?: string; riga?: number } | null }>(sql, params)
      const v = r.rows[0]?.r
      return v?.esito ?? (v?.riga !== undefined ? `riga ${v.riga}` : 'valore senza esito')
    } catch (e) {
      return pgCode(e) ?? 'ignoto'
    }
  }).catch((e) => pgCode(e) ?? 'ignoto')
  return { esito, prima, dopo: await statoDb() }
}

const CASI: [string, string, (v: typeof versioni) => unknown[]][] = [
  [
    'salva_visita',
    'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
    (v) => [COD(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([{ ...APP[0], inizio: 200 }]), v.visita, JSON.stringify(v.appuntamenti)],
  ],
  [
    'sposta_visita_a',
    'select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r',
    (v) => [COD(), V1, DAY_ONE, JSON.stringify([{ id: A1, inizio: 200 }]), v.visita, JSON.stringify(v.appuntamenti)],
  ],
  [
    'cancella_visita',
    'select cancella_visita($1,$2,$3,$4) as r',
    (v) => [COD(), V1, v.visita, JSON.stringify(v.appuntamenti)],
  ],
  ['controlla_invio', 'select controlla_invio($1,$2) as r', () => [COD(), V1]],
]

describe.each(CASI)('%s', (nome, sql, params) => {
  // ⚠︎ Ciò che MORDE qui è `expect(dopo).toEqual(prima)`. La lista
  // ['salvata','cancellata'] è satura per controlla_invio (che non scrive mai
  // in appointment) e ridondante per le altre tre: resta, ma non si conti come
  // presidio.
  it('non scrive niente per un account che non è operatrice', async () => {
    const { esito, prima, dopo } = await prova(OUTSIDER_AUTH, sql, params(versioni))
    expect(['salvata', 'cancellata']).not.toContain(esito)
    expect(dopo).toEqual(prima)
  })

  it('non scrive niente per un operatrice disattivata', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const { esito, prima, dopo } = await prova(ANNALISA_AUTH, sql, params(versioni))
    expect(['salvata', 'cancellata']).not.toContain(esito)
    expect(dopo).toEqual(prima)
    // ⚠︎ Senza questa riga il ramo dell'operatrice DISATTIVATA non è pinnato da
    // nessuna parte: le due asserzioni sopra sono soddisfatte anche da 42883
    // (firma sbagliata), 22023 e qualunque altro errore, cioè sarebbero verdi
    // per il motivo sbagliato. La decisione dell'utente del 23/09 vuole 42501
    // per TUTTI E DUE i casi, e la quarta `it` qui sotto copre solo l'estranea.
    // Il danno non è teorico: una disattivata che riceve `non_trovata` invece
    // di 42501 legge un falso «non risulta» su una visita che esiste, e il
    // token in suo possesso rende quel percorso percorribile.
    expect(esito).toBe('42501')
    // resetData() rimette is_active = true (db.ts:241) e chiude con
    // dimenticaSessioni() (db.ts:260), quindi queste due righe sono ridondanti:
    // restano perché rendono la prova leggibile da sola.
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })

  // La gemella positiva: senza, le due prove sopra resterebbero verdi anche se
  // l'imbracatura fosse rotta e nessuno riuscisse più a scrivere.
  //
  // ⚠︎ NON c'è `expect(esito).not.toBe('ignoto')`: inghiottirebbe qualunque
  // codice d'errore, che è esattamente il difetto. Per le tre di scrittura a
  // mordere è `expect(dopo).not.toEqual(prima)`; controlla_invio non scrive mai
  // in appointment, quindi la sua asserzione capace di fallire è la FORMA della
  // risposta — una riga di §4.4 — e senza di essa il suo caso sarebbe muto.
  it('ma un operatrice attiva sì, con la stessa imbracatura', async () => {
    const { esito, prima, dopo } = await prova(VERA_AUTH, sql, params(versioni))
    if (nome === 'controlla_invio') {
      expect(esito).toMatch(/^riga \d+$/)
      expect(dopo).toEqual(prima)
    } else {
      expect(dopo).not.toEqual(prima)
    }
  })

  // Deciso dall'utente il 23/09: tutte e quattro le funzioni cominciano con la
  // guardia esplicita `if not (select app.is_active_operator()) then raise …
  // errcode = '42501'` (0016:102, 0017:32, 0017:197, 0018:77), quindi l'esito
  // per un estraneo è SEMPRE 42501, mai un esito di dominio.
  //
  // ⚠︎ È anche la sola prova che smaschera una firma sbagliata: con una firma
  // errata Postgres darebbe 42883, e le due prove negative resterebbero VERDI
  // (42883 non è né 'salvata' né 'cancellata', e niente è stato scritto).
  it('risponde sempre 42501, mai un esito di dominio', async () => {
    const { esito } = await prova(OUTSIDER_AUTH, sql, params(versioni))
    expect(esito).toBe('42501')
  })
})
