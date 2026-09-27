// tests/schema/controlla-invio.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOperatorCommit,
  asOwner,
  connect,
  pgCode,
  resetData,
} from '../helpers/db'
import {
  CLIENT_MARIA,
  DAY_ONE,
  SERVICE_MASSAGE,
  SERVICE_REFILL,
  seedFixture,
} from '../helpers/fixtures'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000e1'
const A1 = '60000000-0000-4000-8000-0000000000e1'
const A2 = '60000000-0000-4000-8000-0000000000e2'
let seq = 0
const codice = () => `70000000-0000-4000-8000-2${String(++seq).padStart(11, '0')}`

type Esito = { riga: number; esito_invio: string; stato: unknown | null }

const controlla = (cod: string, visita = V1) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: Esito }>('select controlla_invio($1, $2) as r', [cod, visita])
    return r.rows[0].r
  })

const salvaCon = (cod: string) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r', [
      cod,
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
    ])
    return r.rows[0].r
  })

// ────────────────────────────────────────────────────────────────────────────
// Quello che segue NON è nel Passo 1 del piano: serve alle tre prove aggiunte
// dagli avvertimenti in testa al Task 7 (le righe 6 e 7, nate col Task 6, e la
// regola su `non_trovata` di §4.4 revisione 19).
//
// `salvaCon` qui sopra resta esattamente come il piano lo scrive — un solo
// appuntamento e la risposta non tipizzata —: le prove nuove hanno bisogno
// delle versioni per poter cancellare, e di DUE appuntamenti perché la manovra
// della regola `non_trovata` vuole una collega che ne tocchi uno mentre la
// funzione è ferma sull'altro.
// ────────────────────────────────────────────────────────────────────────────

type Versione = { id: string; versione: string }
type Risposta = { esito: string; visita?: string; appuntamenti?: Versione[]; stato?: unknown }

/** Due appuntamenti, due operatrici, due servizi, durate diverse: dati non degeneri. */
const creaDue = () =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: Risposta }>('select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r', [
      codice(),
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([
        { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
        { id: A2, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 140, durata: 10 },
      ]),
    ])
    return r.rows[0].r
  })

const cancellaCon = (cod: string, creata: Risposta) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
      cod,
      V1,
      creata.visita,
      JSON.stringify(creata.appuntamenti),
    ])
    return r.rows[0].r
  })

/**
 * Gli esiti registrati in `invio` per un codice: l'ARRAY, non il primo valore,
 * così un registro vuoto non passa per un esito sbagliato. Copiato da
 * `sposta-e-cancella.test.ts`, dove è nato per presidiare proprio l'ingresso su
 * cui questo file decide.
 */
const esitiDi = (cod: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
    return r.rows.map((x) => x.e)
  })

const inizi = () =>
  asOwner(async (c) => {
    const r = await c.query<{ id: string; s: number }>(
      'select id, start_cell as s from appointment order by id',
    )
    return r.rows
  })

/**
 * Aspetta che la connessione data sia ferma su un blocco. Si aspetta la
 * CONDIZIONE e non un tempo: un `setTimeout` fisso rende rosse le prove di
 * concorrenza su macchina lenta, senza che ci sia un difetto sotto. Copiata da
 * `sposta-e-cancella.test.ts`; il margine misurato sulla strada lunga (guardia,
 * apri_invio, due `for update`) è 8-39 ms contro 5000, cioè ≥ 128×.
 */
async function attendiBlocco(c: import('pg').Client, ms = 5000) {
  const pid = (c as unknown as { processID: number }).processID
  const fine = Date.now() + ms
  while (Date.now() < fine) {
    const fermo = await asOwner(
      async (o) =>
        (
          await o.query<{ n: number }>(
            "select count(*)::int as n from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'",
            [pid],
          )
        ).rows[0].n,
    )
    if (fermo > 0) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('attendiBlocco: la connessione non si è mai fermata su un blocco')
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('le sette righe', () => {
  it('riga 1: brucia un codice mai arrivato, e l invio tardivo non scrive', async () => {
    const cod = codice()
    const r = await controlla(cod)
    expect(r.riga).toBe(1)
    const tardivo = await salvaCon(cod)
    expect((tardivo as { esito: string }).esito).toBe('annullato')
    const quante = await asOwner(async (c) => Number((await c.query('select count(*) as n from visit')).rows[0].n))
    expect(quante).toBe(0)
  })

  it('riga 2 o 3: trova l esito salvata e restituisce lo stato corrente', async () => {
    const cod = codice()
    await salvaCon(cod)
    const r = await controlla(cod)
    expect(r.esito_invio).toBe('salvata')
    expect(r.riga).toBe(2)
    expect(r.stato).not.toBeNull()
  })

  it('riga 4: la visita è stata cancellata dopo il salvataggio', async () => {
    const cod = codice()
    await salvaCon(cod)
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    const r = await controlla(cod)
    expect(r.riga).toBe(4)
  })

  it('riga 6: restituisce l esito registrato che non ha scritto', async () => {
    const cod = codice()
    await salvaCon(codice())
    const r2 = await salvaCon(cod)
    expect((r2 as { esito: string }).esito).toBe('esiste_gia')
    const r = await controlla(cod)
    expect(r.riga).toBe(6)
    expect(r.esito_invio).toBe('esiste_gia')
  })

  it('ripetere «Controlla» non cambia niente', async () => {
    const cod = codice()
    const primo = await controlla(cod)
    const secondo = await controlla(cod)
    expect(secondo.riga).toBe(primo.riga)
    expect(secondo.esito_invio).toBe('annullato')
  })

  it('non risponde a un account la cui sessione è chiusa', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner((c) => c.query('delete from auth.sessions where id = $1', [sessione.sessionId]))
    const esito = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select controlla_invio($1, $2)', [cod, V1])
        return 'nessun errore'
      } catch (e) {
        return (e as { code?: string }).code
      }
    })
    expect(esito).toBe('42501')
    const quanti = await asOwner(async (c) => Number((await c.query('select count(*) as n from invio')).rows[0].n))
    expect(quanti).toBe(0)
    // Senza questo, le quattro prove di concorrenza che seguono userebbero la
    // sessione appena cancellata e sarebbero tutte rosse.
    dimenticaSessioni()
  })

  // ⚠︎ AGGIUNTA, non nel Passo 1 del piano. §4.4 revisione 18 (27/09/2026) dà
  // a `cancellata` la riga 7, «✓ Risulta cancellata»: l'invio HA scritto, e il
  // risultato voluto c'è. È l'analoga della riga 2 per «Elimina visita».
  //
  // Il piano mappava `cancellata` e `gia_cancellata` sulla riga 2, che è
  // «✓ Risulta salvata»: una cancellazione riuscita avrebbe detto
  // all'operatrice che la visita è SALVATA. Questa prova e la sua vicina sono
  // il solo presidio del ramo corretto in sede — le dieci del Passo 1 sono
  // state scritte quando `cancella_visita` non esisteva e nessuna la chiama.
  it('riga 7: una cancellazione riuscita risulta cancellata, non salvata', async () => {
    const creata = await creaDue()
    const cod = codice()
    const cancellata = await cancellaCon(cod, creata)
    expect(cancellata.esito).toBe('cancellata')
    const r = await controlla(cod)
    expect(r.esito_invio).toBe('cancellata')
    expect(r.riga).toBe(7)
    // La visita non c'è più, quindi lo stato è vuoto: la riga 7 non ha bisogno
    // di leggerla, perché l'esito afferma già l'assenza (§4.4).
    expect(r.stato).toBeNull()
  })

  // ⚠︎ AGGIUNTA, come la precedente. `gia_cancellata` entra nell'elenco della
  // riga 6 (§4.4 revisione 18): è letteralmente il suo caso, «un esito che non
  // ha scritto», e mostra «Era già stata cancellata», lo stesso messaggio della
  // risposta diretta. NON la riga 7: quel secondo invio non ha cancellato
  // niente, l'aveva già fatto il primo.
  it('riga 6: un gia_cancellata non ha scritto, e non risulta cancellata da questo invio', async () => {
    const creata = await creaDue()
    const primo = await cancellaCon(codice(), creata)
    expect(primo.esito).toBe('cancellata')
    const cod = codice()
    const secondo = await cancellaCon(cod, creata)
    expect(secondo.esito).toBe('gia_cancellata')
    const r = await controlla(cod)
    expect(r.esito_invio).toBe('gia_cancellata')
    expect(r.riga).toBe(6)
  })

  // ⚠︎ AGGIUNTA, e presidia la regola di §4.4 revisione 19 (27/09/2026), che
  // il Passo 3 implementa e il Passo 1 non provava:
  //
  //   «`non_trovata` non autorizza a dire "non esiste più", se la lettura
  //    trova la visita.»
  //
  // Misurato sul Task 6: tutte e tre le funzioni di scrittura registrano
  // `non_trovata` anche quando la visita C'È e ciò che è caduto è il solo
  // PERMESSO di leggerla. Percorso raggiungibile fino a qui: l'operatrice
  // disattivata mentre l'invio è in coda perde le sessioni (0015) e la
  // sicurezza per riga le nasconde tutto; riattivata, rientra entro le 24 ore
  // che §4.4 concede al codice, «Controlla» passa il codice rimasto nel
  // telefono, il ricontrollo dell'account RIESCE — e la riga 6 affermerebbe
  // l'assenza di una visita presente.
  //
  // Vince la prima regola comune di §4.4: «Dove sta la visita lo dice la
  // lettura, mai la memoria del telefono». Qui la lettura ce l'abbiamo in mano,
  // e dice che la visita c'è: riga 1, «Non risulta salvata», che è vero perché
  // `non_trovata` non scrive niente.
  //
  // La forma della manovra è quella misurata dalla revisione mirata del ramo
  // dello stato vuoto, con una coda in più: la RIATTIVAZIONE prima di
  // «Controlla», senza la quale il primo ricontrollo dell'account risponderebbe
  // 42501 e la prova non arriverebbe mai al ramo che deve presidiare.
  it('riga 1: un non_trovata la cui visita la lettura TROVA non afferma che non esiste più', async () => {
    const creata = await creaDue()
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    const cod = codice()
    let risposta: Risposta = { esito: 'nessuna risposta' }
    try {
      await guardiano.query('begin')
      await guardiano.query('update appointment set start_cell = 160 where id = $1', [A2])

      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = scrittore
        .query('select cancella_visita($1,$2,$3,$4) as r', [
          cod,
          V1,
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        .then((r) => (r.rows[0] as { r: Risposta }).r)
        .catch((e) => ({ esito: 'ERRORE ' + pgCode(e) }) as Risposta)

      await attendiBlocco(scrittore)
      await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))
      await guardiano.query('commit')
      risposta = await inCoda
      await scrittore.query('commit')
    } finally {
      await guardiano.end()
      await scrittore.end()
      // La riattivazione è la coda che questa prova aggiunge alla manovra: è un
      // `false → true` vero, quindi 0015 richiude le sessioni e la cache non
      // vale più.
      await asOwner((c) => c.query('update operator set is_active = true where id = $1', [VERA]))
      dimenticaSessioni()
    }
    // La premessa, asserita e non assunta: l'invio ha registrato `non_trovata`.
    expect(risposta.esito).toBe('non_trovata')
    expect(await esitiDi(cod)).toEqual(['non_trovata'])
    // E l'altra metà della premessa: la visita che quell'esito dichiara
    // introvabile è ANCORA LÌ, con gli appuntamenti intatti — 160 è la modifica
    // della collega, committata.
    expect((await inizi()).map((x) => [x.id, x.s])).toEqual([
      [A1, 120],
      [A2, 160],
    ])
    // Il bersaglio: «Controlla» legge, trova, e non afferma l'assenza.
    const r = await controlla(cod)
    expect(r.esito_invio).toBe('non_trovata')
    expect(r.stato).not.toBeNull()
    expect(r.riga).toBe(1)
  })
})

describe('concorrenza, con due connessioni', () => {
  it('(a) «Controlla» prima dell invio: l invio riceve annullato e il database resta invariato', async () => {
    const cod = codice()
    await controlla(cod)
    const r = await salvaCon(cod)
    expect((r as { esito: string }).esito).toBe('annullato')
  })

  it('(b) invio in volo: «Controlla» aspetta e vede salvata', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    const scrittore = await connect()
    try {
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      await scrittore.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod,
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ])
      // «Controlla» parte SENZA aspettarlo: deve mettersi in coda sulla chiave.
      const inCorso = controlla(cod)
      await new Promise((r) => setTimeout(r, 500))
      await scrittore.query('commit')
      const r = await inCorso
      expect(r.esito_invio).toBe('salvata')
      expect(r.riga).toBe(2)
    } finally {
      await scrittore.query('rollback').catch(() => {})
      await scrittore.end()
    }
  })

  it('(b bis) invio in volo che poi fallisce: «Controlla» lo brucia', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    const scrittore = await connect()
    try {
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      await scrittore.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod,
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ])
      const inCorso = controlla(cod)
      await new Promise((r) => setTimeout(r, 500))
      await scrittore.query('rollback')
      const r = await inCorso
      expect(r.riga).toBe(1)
      expect(r.esito_invio).toBe('annullato')
    } finally {
      await scrittore.end()
    }
  })

  it('(c) «Controlla» che scade mentre l invio è in volo non brucia niente, e l invio salva', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    const scrittore = await connect()
    const lettore = await connect()
    try {
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      await scrittore.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod,
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ])
      await lettore.query('begin')
      await lettore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await lettore.query('set local role authenticated')
      await lettore.query("set local lock_timeout = '300ms'")
      let codiceErrore = 'nessun errore'
      try {
        await lettore.query('select controlla_invio($1, $2)', [cod, V1])
      } catch (e) {
        codiceErrore = (e as { code?: string }).code ?? 'ignoto'
      }
      await lettore.query('rollback')
      expect(['55P03', '57014']).toContain(codiceErrore)

      await scrittore.query('commit')
      const esito = await asOwner(async (c) => {
        const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
        return r.rows[0].e
      })
      expect(esito).toBe('salvata')
    } finally {
      await scrittore.query('rollback').catch(() => {})
      await scrittore.end()
      await lettore.end()
    }
  })
})

// ⚠︎ Questo describe nasce dalla SONDA 4 del Passo 5, che chiede esplicitamente
// di aggiungere la prova: «togli il secondo ricontrollo dell'account → sessione
// chiusa FRA la registrazione e la lettura».
//
// La sonda 3 non la copre: il primo ricontrollo è già passato quando la
// sessione muore, quindi una mutazione sul secondo è invisibile a tutte le
// tredici prove precedenti.
//
// §4.4, fra le regole comuni: «Riga del codice non visibile (per esempio un
// account chiuso fra il ricontrollo e la lettura) → "Non so", MAI la riga 1;
// "Controlla" ricontrolla l'account anche dopo la lettura.»
describe('il ricontrollo dell account dopo la lettura', () => {
  it('se la sessione muore fra la registrazione e la lettura non risponde «non risulta», ma 42501', async () => {
    // La visita esiste: senza il secondo ricontrollo la risposta sarebbe riga 1,
    // «Non risulta salvata», su una visita che è lì — la riga 1 che §4.4 vieta.
    await creaDue()
    const sessione = await sessioneDi(VERA_AUTH)
    const cod = codice()
    // Tiene occupato il codice senza committare, così «Controlla» si ferma sulla
    // chiave primaria e ci dà la finestra in cui chiudere la sessione.
    const occupante = await connect()
    const lettore = await connect()
    let codiceErrore = 'nessun errore'
    try {
      await occupante.query('begin')
      await occupante.query("insert into invio (codice, esito) values ($1, 'in_corso')", [cod])

      await lettore.query('begin')
      await lettore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await lettore.query('set local role authenticated')
      const inCoda = lettore
        .query('select controlla_invio($1, $2) as r', [cod, V1])
        .then((r) => JSON.stringify((r.rows[0] as { r: Esito }).r))
        .catch((e) => 'ERRORE ' + pgCode(e))

      // Il primo ricontrollo è già passato: «Controlla» è ferma sull'insert.
      await attendiBlocco(lettore)
      await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))
      // Il codice torna libero: l'insert di «Controlla» riesce, e la lettura che
      // segue avviene con l'account già chiuso.
      await occupante.query('rollback')
      codiceErrore = await inCoda
    } finally {
      await occupante.end()
      await lettore.query('rollback').catch(() => {})
      await lettore.end()
      await asOwner((c) => c.query('update operator set is_active = true where id = $1', [VERA]))
      dimenticaSessioni()
    }
    // Il valore misurato, non «qualcosa che non sia la riga 1»: una prova che
    // accettasse qualunque altra risposta resterebbe verde anche con il ramo
    // che risponde a caso.
    expect(codiceErrore).toBe('ERRORE 42501')
  })
})

// ⚠︎ `catalogue-audit.test.ts` enumera `pg_class.relacl` e filtra le funzioni
// su `prosecdef`: `public.controlla_invio` è `invoker`, quindi NESSUN audit
// permanente la guarda. `app.apri_invio_come_annullato` è `definer`, e va
// guardata come le sue sorelle di `0013`. Lo stringimento dell'audit è del
// Task 9; fino ad allora i permessi si presidiano a mano, per nome di ruolo,
// con la gemella positiva accanto. Stessa forma delle quattro prove di
// `sposta-e-cancella.test.ts` e di `salva-visita.test.ts`.
describe('permessi delle due funzioni nuove', () => {
  const FIRMA_CONTROLLA = 'public.controlla_invio(uuid, uuid)'
  const FIRMA_APRI = 'app.apri_invio_come_annullato(uuid)'

  // ⚠ E il `grant execute … to authenticated` della migrazione è RIDONDANTE
  // (misurato ai Task 4, 5 e 6): in `public` c'è un `alter default privileges`
  // di Supabase, da due concedenti, che concede EXECUTE ad anon, authenticated
  // e service_role su ogni funzione nuova. La riga che porta davvero è il
  // `revoke … from public, anon`, ed è quella che le due righe negative qui
  // sotto presidiano.
  it('nega EXECUTE ad anon e a public su tutte e due, e lo concede ad authenticated', async () => {
    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ f: string; ruolo: string; puo: boolean }>(
        `select f, ruolo, has_function_privilege(ruolo, f, 'EXECUTE') as puo
           from unnest(array[$1::text, $2::text]) as f,
                unnest(array['anon', 'public', 'authenticated']) as ruolo
          order by f, ruolo`,
        [FIRMA_CONTROLLA, FIRMA_APRI],
      )
      return r.rows
    })
    // Sei righe, non «nessuna riga»: un elenco vuoto passerebbe qualunque
    // asserzione sul contenuto. Un nome di ruolo inesistente solleva 42704 e
    // una firma sbagliata 42883, quindi la riga non è inerte.
    expect(privilegi).toHaveLength(6)
    expect(privilegi.filter((x) => !x.puo).map((x) => `${x.f}/${x.ruolo}`).sort()).toEqual(
      [
        `${FIRMA_CONTROLLA}/anon`,
        `${FIRMA_CONTROLLA}/public`,
        `${FIRMA_APRI}/anon`,
        `${FIRMA_APRI}/public`,
      ].sort(),
    )
    expect(privilegi.filter((x) => x.puo).map((x) => x.f).sort()).toEqual(
      [FIRMA_CONTROLLA, FIRMA_APRI].sort(),
    )
  })

  // ⚠ IL DISCRIMINANTE È DIVERSO FRA LE DUE, e va detto perché non è ovvio:
  //
  // • su `public.controlla_invio` la chiamata da `anon` NON distingue «EXECUTE
  //   revocato» da «EXECUTE concesso e la guardia in testa risponde»: in tutti
  //   e due i casi arriva 42501. Per quella funzione il discriminante è
  //   `has_function_privilege` della prova qui sopra, che vede anche una
  //   concessione a PUBLIC.
  // • su `app.apri_invio_come_annullato` invece questa prova È il presidio
  //   vero del `revoke`: la funzione non ha guardia e è `security definer`,
  //   quindi senza il revoke `anon` — che i permessi predefiniti di Supabase
  //   servono — la eseguirebbe davvero e **scriverebbe in `invio`**, cioè
  //   brucerebbe il codice d'invio di un'operatrice scavalcando la sicurezza
  //   per riga. È il caso che il commento di testa di `0013` chiama «una
  //   sessione che arrivasse allo schema `app` per altra via».
  it('e ad anon la chiamata diretta risponde 42501, non un esito', async () => {
    const prova = (sql: string, args: unknown[]) =>
      asAnon(async (c) => {
        try {
          const r = await c.query(sql, args)
          return `nessun errore: ${JSON.stringify(r.rows[0])}`
        } catch (e) {
          return pgCode(e)
        }
      })
    // Due `asAnon` separate e non due query nella stessa: la prima che
    // fallisce aborta la transazione, e la seconda tornerebbe `25P02` — cioè
    // una prova che non guarda più la funzione che dice di guardare.
    const controllaDaAnon = await prova('select controlla_invio($1, $2)', [codice(), V1])
    const apriDaAnon = await prova('select app.apri_invio_come_annullato($1)', [codice()])
    expect(controllaDaAnon).toBe('42501')
    expect(apriDaAnon).toBe('42501')
    // E il registro è rimasto vuoto: nessuna delle due ha scritto.
    const quanti = await asOwner(async (c) =>
      Number((await c.query('select count(*) as n from invio')).rows[0].n),
    )
    expect(quanti).toBe(0)
  })

  // La gemella POSITIVA delle due prove qui sopra: senza, revocare EXECUTE
  // anche ad `authenticated` lascerebbe verdi le righe negative.
  it('ma un operatrice attiva le esegue davvero tutte e due', async () => {
    const cod = codice()
    const r = await controlla(cod)
    expect(r.riga).toBe(1)
    // E `app.apri_invio_come_annullato` chiamata per nome, non solo attraverso
    // «Controlla»: su un codice già registrato restituisce l'esito che c'è.
    const riletto = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ e: string }>('select app.apri_invio_come_annullato($1) as e', [cod])
      return x.rows[0].e
    })
    expect(riletto).toBe('annullato')
  })

  // Senza questa riga, togliere `set search_path = ''` non renderebbe rossa
  // nessuna prova: l'audit di catalogo non guarda le funzioni invoker.
  it('controlla_invio è invoker e volatile, apri_invio_come_annullato è definer, e tutte e due con search_path vuoto', async () => {
    const righe = await asOwner(async (c) => {
      const r = await c.query<{
        schema: string
        nome: string
        sicurezza: boolean
        volatilita: string
        config: string[] | null
      }>(
        `select n.nspname as schema, p.proname as nome, p.prosecdef as sicurezza,
                p.provolatile as volatilita, p.proconfig as config
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where (n.nspname = 'public' and p.proname = 'controlla_invio')
             or (n.nspname = 'app' and p.proname = 'apri_invio_come_annullato')
          order by p.proname`,
      )
      return r.rows
    })
    expect(righe.map((x) => `${x.schema}.${x.nome}`)).toEqual([
      'app.apri_invio_come_annullato',
      'public.controlla_invio',
    ])
    // `controlla_invio` NON è definer: lo è solo la sua gemella di servizio.
    expect(righe.map((x) => x.sicurezza)).toEqual([true, false])
    expect(righe.map((x) => x.config)).toEqual([['search_path=""'], ['search_path=""']])
    // ⚠︎ `volatile` e non `stable`: una `stable` leggerebbe con la fotografia
    // presa prima dell'attesa sul codice d'invio (§4.4, misurato).
    expect(righe.find((x) => x.nome === 'controlla_invio')?.volatilita).toBe('v')
  })
})
