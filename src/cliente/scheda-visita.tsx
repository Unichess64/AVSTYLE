// src/cliente/scheda-visita.tsx
'use client'
//
// La scheda visita (spec 3a §5.4, spec §9.4): una pagina intera sopra
// l'agenda, in lettura e in compilazione. «Salva», «Togli» ed «Elimina visita»
// chiamano le `azioni`, cioè le Server Actions di `src/server/azioni-visita.ts`
// che la pagina passa (Task 8), e qui si legge la `Risposta`.
//
// Il codice d'invio nasce QUI, sul telefono, con `crypto.randomUUID()`: uno per
// invio, e il server lo tiene uguale per tutti i ritentativi su 40P01 (§4.4).
// Nasce FUORI dalla chiamata (Task 9), perché serve anche a «Controlla» e agli
// invii pendenti in `localStorage`, dove si scrive al tocco.
//
// «Controlla» (§4.4, Task 9): senza risposta entro i 10 s di D3-9 la scheda
// dice «Non so se è stata salvata» e mostra «Controlla», che passa da una
// rotta con `fetch`, fuori dalla fila delle Server Actions. La decisione è di
// `decidiControlla`, sulla coppia (riga, esito_invio) — C1 —, presa dentro
// `scheda-viva.ts` con `applica`; le risposte tardive dell'invio abbandonato si
// scartano con il numero di generazione dello stesso oggetto.
//
// Finché la scheda è ferma (invio in corso, «Non so», «Crea di nuovo») i campi
// sono spenti: una modifica fatta lì sparirebbe sotto un «✓ Risulta salvata»
// che parla di ciò che era stato inviato (revisione del Task 9, B2).
//
// La bozza vive SOLO in memoria (§4.9): stato di React, niente localStorage,
// niente indirizzo. Le regole stanno in `src/dominio/` (scheda, durate,
// avvisi, conflitti): qui si eseguono soltanto.
//
// ⚠︎ NIENTE attributi `style`: la CSP di produzione li blocca.
import { useContext, useEffect, useRef, useState } from 'react'
import type { Apertura } from '../dominio/apertura'
import type { Atteso } from '../dominio/attesi'
import { type Avviso, calcolaAvvisi, confermaAvvisi, fermaIlSalvataggio } from '../dominio/avvisi'
import { fraseDeiConflitti, idInScrittura, trovaConflitti } from '../dominio/conflitti'
import { type Decisione, type Invio, NON_RISULTA, NON_SO, schedaPerCreaDiNuovo } from '../dominio/controlla'
import {
  type Catalogo,
  aggiungiServizio,
  cambiaDurata,
  cambiaInizio,
  cambiaOperatrice,
  cambiaServizio,
  serviziPerLaScelta,
} from '../dominio/durate'
import { CLIENTE_CANCELLATA } from '../dominio/errori'
import { depositoDelTelefono, registraInvio, togliInvio } from '../dominio/invii-pendenti'
import {
  type Scheda,
  type SchedaSerializzata,
  type ServizioInScheda,
  adottaStato,
  altreModifiche,
  apriSchedaSuVisita,
  apriSchedaVuota,
  bloccoDelSalva,
  cosaManca,
  operatriceScelta,
  serializza,
  telefonoDalModulo,
  togli,
} from '../dominio/scheda'
import { type SchedaViva, nuovoStatoScheda } from '../dominio/scheda-viva'
import type { StatoVisita } from '../dominio/stato-visita'
import { oraDaCella } from '../dominio/tempo'
import { schedaDalGesto } from '../dominio/trascinamento'
import { dataReale } from '../dominio/validazione'
import type { DatiGiorno, RispostaApri } from '../server/lettura-scheda'
import type { Risposta } from '../server/scrittura-visita'
import { CercaCliente } from './cerca-cliente'
import { Ricariche } from './diretta'
import { type RichiesteScheda, UscitaForzata, richiesteVere } from './richieste-scheda'
import stile from './scheda-visita.module.css'

/**
 * «Salva», «Togli» ed «Elimina visita»: le Server Actions di
 * `src/server/azioni-visita.ts`. Obbligatorie: una pagina che dimenticasse di
 * passarle non compila (le prove sul componente non vedono la pagina).
 */
export interface AzioniScheda {
  salva(scheda: SchedaSerializzata, codice: string): Promise<Risposta>
  togli(scheda: SchedaSerializzata, codice: string): Promise<Risposta>
  elimina(visitaId: string, versione: string, attesi: readonly Atteso[], codice: string): Promise<Risposta>
}

/** La scheda aggiornata di §4.4: le modifiche non inviate si perdono, e lo si dice. */
const SCHEDA_AGGIORNATA = 'La scheda aggiornata: questa visita è cambiata da un’altra parte, ecco com’è ora. Le modifiche non salvate vanno rifatte.'

function esci() {
  // L'account non è più un'operatrice attiva: si va all'accesso (§4.7).
  window.location.assign('/accesso')
}

type Caricamento =
  | { readonly tipo: 'carico' }
  | { readonly tipo: 'guasto' }
  | { readonly tipo: 'assente' }
  | { readonly tipo: 'pronta'; readonly dati: RispostaApri; readonly scheda: Scheda }

export function SchedaVisita({
  apertura,
  onChiudi,
  onFatto,
  onVaiA,
  richieste = richiesteVere,
  azioni,
  io,
}: {
  apertura: Apertura
  onChiudi: () => void
  /** Un invio con un esito definitivo (✓, o il giorno da ricaricare): la scheda si chiude, e il testo resta sull'agenda. */
  onFatto: (testo: string) => void
  /** «Vai lì» di spec §10.1: l'appuntamento in conflitto, e il suo giorno. */
  onVaiA: (appuntamentoId: string, data: string) => void
  richieste?: RichiesteScheda
  azioni: AzioniScheda
  /** L'`operator.id` di chi ha fatto l'accesso: firma gli invii pendenti (§4.4 punto 3). */
  io: string
}) {
  const [caricamento, setCaricamento] = useState<Caricamento>({ tipo: 'carico' })
  const [tentativo, setTentativo] = useState(0)
  // §4.3 passo 6: 23503 su servizio od operatrice ricarica la scheda, e la frase resta.
  const [nota, setNota] = useState<string | null>(null)

  useEffect(() => {
    let viva = true
    setCaricamento({ tipo: 'carico' })
    richieste.apri(apertura.data, apertura.tipo === 'visita' ? apertura.visitaId : null).then(
      (dati) => {
        if (!viva) return
        if (apertura.tipo === 'vuota') {
          setCaricamento({ tipo: 'pronta', dati, scheda: apriSchedaVuota(apertura.data, apertura.operatriceId, apertura.inizio) })
        } else if (dati.stato === null) {
          setCaricamento({ tipo: 'assente' })
        } else {
          const letta = apriSchedaSuVisita(dati.stato, apertura.visitaId)
          // Dal trascinamento (Task 10): la scheda si apre sulla posizione del gesto.
          const scheda = apertura.sposta === undefined ? letta : schedaDalGesto(letta, apertura.sposta, dati.giorno)
          setCaricamento({ tipo: 'pronta', dati, scheda })
        }
      },
      (e) => {
        if (!viva) return
        if (e instanceof UscitaForzata) esci()
        else setCaricamento({ tipo: 'guasto' })
      },
    )
    return () => {
      viva = false
    }
  }, [apertura, richieste, tentativo])

  const titolo = apertura.tipo === 'vuota' ? 'Nuova visita' : 'Visita'
  return (
    <div className={stile.foglio} role="dialog" aria-modal="true" aria-label={titolo}>
      <header className={stile.testata}>
        <button type="button" className={stile.chiudi} onClick={onChiudi}>
          Chiudi
        </button>
        <h2 className={stile.titolo}>{titolo}</h2>
      </header>
      {caricamento.tipo === 'carico' && <p className={stile.messaggio}>Apro la scheda…</p>}
      {caricamento.tipo === 'assente' && <p className={stile.messaggio}>Questa visita non esiste più.</p>}
      {caricamento.tipo === 'guasto' && (
        <div className={stile.messaggio}>
          <p>Non riesco ad aprire la scheda.</p>
          <button type="button" className={stile.secondario} onClick={() => setTentativo((n) => n + 1)}>
            Riprova
          </button>
        </div>
      )}
      {nota !== null && <p className={stile.nota} role="status">{nota}</p>}
      {caricamento.tipo === 'pronta' && (
        <SchedaCompilata
          iniziale={caricamento.scheda}
          dati={caricamento.dati}
          richieste={richieste}
          azioni={azioni}
          io={io}
          onVaiA={onVaiA}
          onFatto={onFatto}
          onRicarica={(testo) => {
            setNota(testo)
            setTentativo((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}

const MINUTI = Array.from({ length: 12 }, (_, i) => i * 5)
const ORE = Array.from({ length: 24 }, (_, i) => i)
// Da 5 minuti a 8 ore: oltre è una giornata intera, e si scrive in due servizi.
const DURATE = Array.from({ length: 96 }, (_, i) => i + 1)

function durataLeggibile(celle: number): string {
  const minuti = celle * 5
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** D3-9: senza risposta entro 10 s dal tocco, «Non so» (§4.4). */
const ATTESA_MS = 10_000

/** L'invio di cui «Controlla» chiede: il suo codice, e ciò che ha MANDATO. */
interface UltimoInvio {
  readonly invio: Invio
  readonly codice: string
  /** La bozza inviata; per «Elimina visita» la scheda letta (id, versione, attesi vengono da lì). */
  readonly inviata: Scheda
  /** Il servizio di un «Togli»: dopo la riga 1 si riaccende la sua conferma. */
  readonly tolto: string | null
  readonly toccatoIl: number
}

/** §4.4, vita della scheda: un invio incerto vive al massimo 24 ore in memoria, come in `localStorage`. */
const VITA_SCHEDA_MS = 24 * 60 * 60 * 1000

/** La scheda caricata. Esportata per le prove sul componente. */
export function SchedaCompilata({
  iniziale,
  dati,
  richieste,
  azioni,
  io,
  attesaMs = ATTESA_MS,
  adesso = Date.now,
  onVaiA,
  onFatto,
  onRicarica,
}: {
  iniziale: Scheda
  dati: RispostaApri
  richieste: RichiesteScheda
  azioni: AzioniScheda
  io: string
  /** Solo per le prove: i 10 s di D3-9. */
  attesaMs?: number
  /** Solo per le prove: l'orologio del tocco e delle 24 ore. */
  adesso?: () => number
  onVaiA: (appuntamentoId: string, data: string) => void
  onFatto: (testo: string) => void
  onRicarica: (testo: string) => void
}) {
  const [scheda, setScheda] = useState(iniziale)
  // La scheda LETTA: quella aperta, o quella adottata dopo «La scheda
  // aggiornata». Serve a sapere se «Togli» porta altre modifiche (06/10).
  const [letta, setLetta] = useState(iniziale)
  const [inCorso, setInCorso] = useState(false)
  // §4.6: durante un salvataggio le ricariche dell'agenda si mettono da parte.
  // Il coordinatore della diretta lo chiede alla scheda finché l'invio è in
  // corso (dal tocco alla risposta, o ai 10 s del «Non so»), e alla fine riparte.
  const ricariche = useContext(Ricariche)
  useEffect(() => (inCorso && ricariche !== null ? ricariche.occupazione(() => true) : undefined), [inCorso, ricariche])
  // §4.4: dopo «Non so» «Salva» è spento e resta il solo «Controlla».
  const [incerto, setIncerto] = useState(false)
  const [inControllo, setInControllo] = useState(false)
  // §4.4 riga 4: la visita è stata cancellata dopo il salvataggio.
  const [creaDiNuovo, setCreaDiNuovo] = useState(false)
  // Il numero di generazione: una risposta di una generazione passata si scarta.
  const viva = useRef<SchedaViva | null>(null)
  if (viva.current === null) viva.current = nuovoStatoScheda(iniziale)
  const ultimo = useRef<UltimoInvio | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Alla chiusura della scheda la generazione avanza: una risposta che arriva
  // dopo si scarta — senza, `onFatto` farebbe `history.back()` su una scheda
  // già chiusa — e il suo codice resta per la striscia alla riapertura (§4.4,
  // scheda abbandonata).
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      viva.current?.controlla()
    },
    [],
  )
  const [esito, setEsito] = useState<string | null>(null)
  // D3-19: le chiavi che il server ha trovato e la scheda forse non mostra
  // ancora (una collega ha scritto dopo la lettura del giorno).
  const [chiaviDelServer, setChiaviDelServer] = useState<readonly string[]>([])
  const [conflittoDelServer, setConflittoDelServer] = useState<{ frase: string; vaiA: string | null } | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(dati.clienteNome)
  const [giorno, setGiorno] = useState<DatiGiorno>(dati.giorno)
  const [mostraTutti, setMostraTutti] = useState(false)
  const [conferma, setConferma] = useState<{ tipo: 'elimina' } | { tipo: 'togli'; id: string } | null>(null)
  const [guasto, setGuasto] = useState(false)
  const [telefonoScritto, setTelefonoScritto] = useState('')

  const catalogo: Catalogo = dati.catalogo
  const attive = dati.attive.map((o) => o.id)

  const suGuasto = (e: unknown) => {
    if (e instanceof UscitaForzata) esci()
    else setGuasto(true)
  }

  // La scheda lavora sul giorno della SUA data: se la data cambia, si rilegge
  // quel giorno per fasce, «già prenotata» e conflitti.
  useEffect(() => {
    if (scheda.data === giorno.data) return
    let viva = true
    richieste.giorno(scheda.data).then((g) => viva && setGiorno(g), (e) => viva && suGuasto(e))
    return () => {
      viva = false
    }
    // Decide la data della scheda: `giorno` cambia proprio per effetto di questa lettura.
  }, [scheda.data])

  const giornoPronto = giorno.data === scheda.data
  const nomiOperatrici = new Map<string, string>([
    ...dati.giorno.operatrici.map((o): [string, string] => [o.id, o.nome]),
    ...giorno.operatrici.map((o): [string, string] => [o.id, o.nome]),
    ...dati.attive.map((o): [string, string] => [o.id, o.nome]),
  ])
  const nomiServizi = new Map(catalogo.servizi.map((s) => [s.id, s.nome]))

  const cliente = scheda.cliente
  const nomeCliente = cliente === null ? null : cliente.tipo === 'nuova' ? cliente.nome.trim() : clienteNome
  const avvisi: Avviso[] = giornoPronto
    ? calcolaAvvisi({
        visitaId: scheda.visitaId,
        data: scheda.data,
        cliente: cliente !== null && nomeCliente ? { id: cliente.id, nome: nomeCliente } : null,
        servizi: scheda.servizi,
        giorno: { risolti: new Map(Object.entries(giorno.risolti)), appuntamenti: giorno.appuntamenti },
        nomiOperatrici,
        nomiServizi,
      })
    : []
  const conflitto = giornoPronto
    ? fraseDeiConflitti(
        trovaConflitti(scheda.servizi, giorno.appuntamenti, idInScrittura(scheda.servizi, scheda.attesi.map((a) => a.id)), nomiOperatrici),
      )
    : null
  const chiaviMostrate = new Set(avvisi.map((a) => a.chiave))
  const soloDelServer = chiaviDelServer.filter((k) => !chiaviMostrate.has(k))
  const ferma =
    fermaIlSalvataggio(avvisi, scheda.avvisiConfermati) || chiaviDelServer.some((k) => !scheda.avvisiConfermati.has(k))
  const mostraConflitto = conflitto ?? conflittoDelServer

  const bloccoD22 = bloccoDelSalva(scheda, attive)
  const mancante = cosaManca(scheda, cliente?.tipo === 'nuova' && telefonoDalModulo(telefonoScritto).errato)

  const servizi = (fn: (s: readonly ServizioInScheda[]) => ServizioInScheda[]) =>
    setScheda((s) => ({ ...s, servizi: fn(s.servizi) }))

  /** «Salva comunque» conferma le chiavi MOSTRATE (D3-19), e quelle che il server ha nominato. */
  const confermate = () => new Set([...confermaAvvisi(scheda.avvisiConfermati, avvisi), ...chiaviDelServer])

  const rileggiGiorno = (data: string, poi?: (g: DatiGiorno) => void) =>
    richieste.giorno(data).then(
      (g) => {
        setGiorno(g)
        poi?.(g)
      },
      suGuasto,
    )

  /** §4.4, «La scheda aggiornata»: il contenuto diventa lo stato corrente con le sue versioni (C3: `adottaStato` riproietta). */
  const adotta = (stato: StatoVisita, testo: string) => {
    const nuova = adottaStato(scheda, stato)
    setScheda(nuova)
    setLetta(nuova)
    setChiaviDelServer([])
    setEsito(testo === '' ? SCHEDA_AGGIORNATA : testo)
    void rileggiGiorno(nuova.data, (g) => {
      const nome = g.appuntamenti.find((a) => a.visitaId === nuova.visitaId)?.clienteNome
      if (nome !== undefined) setClienteNome(nome)
    })
  }

  /** Ciò che la scheda fa con la risposta del server. */
  const leggiRisposta = (r: Risposta) => {
    switch (r.tipo) {
      case 'uscita_forzata':
        esci()
        return
      case 'esito': {
        const m = r.messaggio
        if (m.uscitaForzata) return esci()
        // Il ✓ chiude la scheda; un esito che ricarica il giorno anche.
        if (m.spunta || m.ricaricaIlGiorno) return onFatto(m.testo)
        if (m.schedaAdottaStato && r.stato) return adotta(r.stato, m.testo)
        // `annullato` arrivato come risposta: il codice l'ha bruciato qualcun
        // altro (un'altra scheda del browser, «Esci»), e l'invio non ha
        // scritto niente. Lo si dice: sbloccarsi muti lasciava credere salvato.
        if (r.esito === 'annullato') return setEsito(NON_RISULTA)
        if (m.testo !== '') setEsito(m.testo)
        return
      }
      case 'fallita':
        // §4.4 riga 4: «Crea di nuovo» solo se la cliente esiste ancora. Lo
        // sa il 23503 su `visit.client_id`; scegliere un'altra cliente lo
        // riporta vero (`onCambia`).
        if (r.sqlstate === '23503' && r.testo === CLIENTE_CANCELLATA) setScheda((s) => ({ ...s, clienteEsisteAncora: false }))
        if (r.messaggio.ricaricaIlGiorno) return onFatto(r.testo)
        if (r.messaggio.ricaricaLaScheda) return onRicarica(r.testo)
        setEsito(r.testo)
        return
      case 'conflitto':
        // La frase del server subito, e il giorno riletto: la scheda la ritrova da sé.
        setConflittoDelServer({ frase: r.frase, vaiA: r.vaiA })
        void rileggiGiorno(scheda.data)
        return
      case 'da_confermare':
        setChiaviDelServer(r.chiavi)
        void rileggiGiorno(scheda.data)
        return
      case 'non_so':
        setIncerto(true)
        setEsito(NON_SO)
        return
      case 'app_aggiornata':
        setEsito('L’app è stata aggiornata: ricarica la pagina.')
        return
      case 'non_valida':
        setEsito(r.motivo)
        return
    }
  }

  /**
   * Un invio. Il codice nasce QUI, fuori dalla chiamata, e si scrive fra gli
   * invii pendenti AL TOCCO (§4.4 punto 3); si cancella alla risposta
   * definitiva, cioè a ogni risposta tranne «Non so». La generazione con cui
   * l'invio parte decide se la sua risposta vale ancora: «Controlla» la fa
   * avanzare, lo scadere dei 10 s no (`scheda-viva.ts`).
   */
  const invia = async (invio: Invio, inviata: Scheda, chiamata: (codice: string) => Promise<Risposta>, tolto: string | null = null) => {
    const codice = crypto.randomUUID()
    const gen = viva.current!.salva(invio, inviata)
    const toccatoIl = adesso()
    ultimo.current = { invio, codice, inviata, tolto, toccatoIl }
    registraInvio(depositoDelTelefono(), {
      codice,
      visitaId: inviata.visitaId,
      clienteId: inviata.cliente?.tipo === 'esistente' ? inviata.cliente.id : null,
      operatriceId: io,
      invio,
      toccatoIl,
    })
    setInCorso(true)
    setEsito(null)
    setConflittoDelServer(null)
    setCreaDiNuovo(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!viva.current!.corrente(gen)) return
      viva.current!.scaduto()
      setInCorso(false)
      setIncerto(true)
      setEsito(NON_SO)
    }, attesaMs)
    let r: Risposta
    try {
      r = await chiamata(codice)
    } catch (e) {
      // Next solleva così quando l'azione non esiste più dopo un rilascio.
      r = /Server Action/i.test(String((e as Error | null)?.message)) ? { tipo: 'app_aggiornata' } : { tipo: 'non_so' }
    }
    // §4.4: la risposta dell'invio abbandonato dopo «Controlla» si scarta.
    if (!viva.current!.corrente(gen)) return
    clearTimeout(timer.current)
    if (r.tipo !== 'non_so') togliInvio(depositoDelTelefono(), codice)
    setInCorso(false)
    setIncerto(false)
    leggiRisposta(r)
  }

  /** Ciò che la scheda fa con la decisione di «Controlla» (§4.4). */
  const eseguiDecisione = (d: Decisione, stato: StatoVisita | null, u: UltimoInvio) => {
    setIncerto(false)
    if (d.spunta) return onFatto(d.testo)
    if (d.offreCreaDiNuovo) {
      setCreaDiNuovo(true)
      setEsito(d.testo)
      return
    }
    if (d.ricaricaIlGiorno || d.errore) return onFatto(d.testo)
    if (d.schedaAdottaStato && stato !== null) return adotta(stato, d.testo)
    // `versioni: 'partenza'`: la scheda NON tocca versioni né contenuto, che
    // sono ancora quelli di partenza (C1). Si riaccende lo stesso invio.
    setEsito(d.testo)
    if (d.riaccende === 'togli' && u.tolto !== null) setConferma({ tipo: 'togli', id: u.tolto })
    else if (d.riaccende === 'elimina') setConferma({ tipo: 'elimina' })
  }

  /** «Controlla»: lo STESSO codice dell'invio, fuori dalla fila. Incrementa la generazione. */
  const controlla = async () => {
    const u = ultimo.current
    if (u === null) return
    // Oltre 24 ore il codice può essere già stato ripulito, e «Controlla»
    // direbbe «non risulta» di un invio salvato: non si chiede, si rilegge.
    if (adesso() - u.toccatoIl > VITA_SCHEDA_MS) {
      togliInvio(depositoDelTelefono(), u.codice)
      return onFatto('Questa scheda è rimasta aperta più di 24 ore: ricarico il giorno')
    }
    const gen = viva.current!.controlla()
    setInControllo(true)
    let r: Awaited<ReturnType<RichiesteScheda['controlla']>>
    try {
      r = await richieste.controlla(u.codice, u.inviata.visitaId)
    } catch (e) {
      if (e instanceof UscitaForzata) return esci()
      r = { tipo: 'non_so' }
    }
    if (!viva.current!.corrente(gen)) return
    setInControllo(false)
    // Un «Controlla» fallito non brucia niente: di nuovo «Non so», e il codice resta.
    if (r.tipo === 'non_so') return setEsito(NON_SO)
    togliInvio(depositoDelTelefono(), u.codice)
    viva.current!.applica(gen, r)
    const d = viva.current!.decisione
    if (d !== null) eseguiDecisione(d, r.stato, u)
  }

  const salva = () => {
    const s = ferma ? { ...scheda, avvisiConfermati: confermate() } : scheda
    setScheda(s)
    void invia('salva', s, (codice) => azioni.salva(serializza(s), codice))
  }

  /** «Togli» manda tutta la bozza (06/10): la riga ambra è sotto gli occhi, e la conferma vale anche per lei. */
  const togliEInvia = (id: string) => {
    const bozza = togli({ ...scheda, avvisiConfermati: confermate() }, id)
    void invia('togli', bozza, (codice) => azioni.togli(serializza(bozza), codice), id)
  }

  const elimina = () => {
    // «Elimina» manda id, versione e attesi della scheda letta: è con lei che «Controlla» confronta.
    void invia('elimina', { ...letta, versioneVisita: scheda.versioneVisita, attesi: scheda.attesi }, (codice) =>
      azioni.elimina(scheda.visitaId, scheda.versioneVisita!, scheda.attesi, codice),
    )
  }

  /** §4.4 riga 4: id nuovi, codice nuovo, la cliente come esistente. */
  const creaDaCapo = () => {
    const nuova = schedaPerCreaDiNuovo(ultimo.current?.inviata ?? scheda)
    setScheda(nuova)
    setLetta(nuova)
    void invia('salva', nuova, (codice) => azioni.salva(serializza(nuova), codice))
  }

  const fermo = inCorso || incerto || creaDiNuovo

  const operatriceDelNuovo = scheda.servizi[scheda.servizi.length - 1]?.operatriceId ?? scheda.partenza.operatriceId

  return (
    <div className={stile.corpo}>
      {/* B2: con la scheda ferma i campi sono spenti, tutti insieme. */}
      <fieldset className={stile.campi} disabled={fermo}>
      <section className={stile.sezione} aria-labelledby="scheda-cliente">
        <h3 id="scheda-cliente" className={stile.etichetta}>
          Cliente
        </h3>
        <CercaCliente
          cliente={scheda.cliente}
          nome={clienteNome}
          richieste={richieste}
          onGuasto={suGuasto}
          telefonoScritto={telefonoScritto}
          onTelefonoScritto={setTelefonoScritto}
          onCambia={(c, nome) => {
            setScheda((s) => ({ ...s, cliente: c, clienteEsisteAncora: true }))
            setClienteNome(nome)
          }}
        />
      </section>

      <section className={stile.sezione}>
        <label className={stile.campo}>
          <span className={stile.etichetta}>Data</span>
          <input
            type="date"
            value={scheda.data}
            onChange={(e) => {
              try {
                const d = dataReale(e.target.value)
                setScheda((s) => ({ ...s, data: d }))
              } catch {
                // un campo svuotato a metà: la data resta quella di prima
              }
            }}
          />
        </label>
      </section>

      <section className={stile.sezione} aria-labelledby="scheda-servizi">
        <h3 id="scheda-servizi" className={stile.etichetta}>
          Servizi
        </h3>
        <label className={stile.spunta}>
          <input type="checkbox" checked={mostraTutti} onChange={(e) => setMostraTutti(e.target.checked)} />
          mostra tutti i servizi
        </label>
        <ol className={stile.servizi}>
          {scheda.servizi.map((s) => {
            const scelta = operatriceScelta(s, attive)
            const gruppi = serviziPerLaScelta(catalogo, s.operatriceId, mostraTutti)
            const nelleVoci = gruppi.some((g) => g.servizi.some((x) => x.id === s.servizioId))
            return (
              <li key={s.id} className={stile.servizio} aria-label={`${nomiServizi.get(s.servizioId) ?? 'Servizio'} alle ${oraDaCella(s.inizio)}`}>
                {scelta === null && (
                  <p className={stile.nonAttiva}>
                    {nomiOperatrici.get(s.operatriceId) ?? 'Operatrice'} — non più attiva
                  </p>
                )}
                <label className={stile.campo}>
                  <span>Operatrice</span>
                  <select
                    aria-label="Operatrice"
                    value={scelta ?? ''}
                    onChange={(e) => e.target.value !== '' && servizi((x) => cambiaOperatrice(x, s.id, e.target.value, catalogo))}
                  >
                    {scelta === null && (
                      <option value="" disabled>
                        Scegli un’operatrice
                      </option>
                    )}
                    {dati.attive.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={stile.campo}>
                  <span>Servizio</span>
                  <select aria-label="Servizio" value={s.servizioId} onChange={(e) => servizi((x) => cambiaServizio(x, s.id, e.target.value, catalogo))}>
                    {!nelleVoci && <option value={s.servizioId}>{nomiServizi.get(s.servizioId) ?? 'Servizio'}</option>}
                    {gruppi.map((g) => (
                      <optgroup key={g.categoria} label={g.categoria}>
                        {g.servizi.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nome}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <div className={stile.riga}>
                  <fieldset className={stile.ora}>
                    <legend>Inizio</legend>
                    <select
                      aria-label="Ora d’inizio"
                      value={Math.floor(s.inizio / 12)}
                      onChange={(e) => servizi((x) => cambiaInizio(x, s.id, Number(e.target.value) * 12 + (s.inizio % 12), catalogo))}
                    >
                      {ORE.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span aria-hidden="true">:</span>
                    <select
                      aria-label="Minuti d’inizio"
                      value={(s.inizio % 12) * 5}
                      onChange={(e) =>
                        servizi((x) => cambiaInizio(x, s.id, Math.floor(s.inizio / 12) * 12 + Number(e.target.value) / 5, catalogo))
                      }
                    >
                      {MINUTI.map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                  <label className={stile.campo}>
                    <span>Durata</span>
                    <select aria-label="Durata" value={s.durata} onChange={(e) => servizi((x) => cambiaDurata(x, s.id, Number(e.target.value), catalogo))}>
                      {(DURATE.includes(s.durata) ? DURATE : [...DURATE, s.durata]).map((d) => (
                        <option key={d} value={d}>
                          {durataLeggibile(d)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className={stile.secondario}
                  disabled={fermo}
                  onClick={() => {
                    // Un servizio mai salvato si toglie dalla bozza; uno salvato
                    // è un invio, con una conferma (§8.7, §10.4). L'ultimo
                    // rimasto è «Elimina visita».
                    if (s.nuovo) setScheda((x) => togli(x, s.id))
                    else if (scheda.servizi.length === 1) setConferma({ tipo: 'elimina' })
                    else setConferma({ tipo: 'togli', id: s.id })
                  }}
                >
                  Togli
                </button>
              </li>
            )
          })}
        </ol>
        <label className={stile.campo}>
          <span className={stile.nascosto}>Aggiungi servizio</span>
          <select
            aria-label="Aggiungi servizio"
            value=""
            onChange={(e) => {
              if (e.target.value === '') return
              const id = e.target.value
              servizi((x) => aggiungiServizio(x, scheda.partenza, id, catalogo))
            }}
          >
            <option value="">+ Aggiungi servizio</option>
            {serviziPerLaScelta(catalogo, operatriceDelNuovo, mostraTutti).map((g) => (
              <optgroup key={g.categoria} label={g.categoria}>
                {g.servizi.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      </fieldset>

      {mostraConflitto !== null && (
        <div className={stile.conflitto} role="alert">
          <p>{mostraConflitto.frase}</p>
          {/* Un conflitto fra due servizi della scheda non ha un posto nell'agenda (C2). */}
          {mostraConflitto.vaiA !== null && (
            <button type="button" className={stile.secondario} onClick={() => onVaiA(mostraConflitto.vaiA!, scheda.data)}>
              Vai lì
            </button>
          )}
        </div>
      )}

      {(avvisi.length > 0 || bloccoD22 !== null || soloDelServer.length > 0) && (
        <div className={stile.ambra} role="status">
          {bloccoD22 !== null && <p>{bloccoD22}</p>}
          {avvisi.map((a) => (
            <p key={a.chiave}>{a.motivo}</p>
          ))}
          {soloDelServer.length > 0 && <p>Al salvataggio è comparso un avviso nuovo: ricontrolla la scheda.</p>}
        </div>
      )}
      {mancante !== null && bloccoD22 === null && <p className={stile.suggerimento}>{mancante}</p>}
      {guasto && <p className={stile.errore}>Non riesco a leggere i dati: controlla la connessione.</p>}
      {esito !== null && (
        <p className={stile.errore} role="status">
          {esito}
        </p>
      )}

      {conferma !== null && (
        <div className={stile.conferma} role="alertdialog" aria-label="Conferma">
          <p>
            {conferma.tipo === 'elimina'
              ? 'Eliminare la visita? Non si può annullare.'
              : altreModifiche(scheda, letta, conferma.id)
                ? 'Togliere questo servizio e salvare le altre modifiche?'
                : 'Togliere questo servizio dalla visita?'}
          </p>
          <div className={stile.pulsanti}>
            <button
              type="button"
              className={stile.pericolo}
              disabled={fermo}
              onClick={() => {
                if (conferma.tipo === 'elimina') elimina()
                else togliEInvia(conferma.id)
                setConferma(null)
              }}
            >
              {conferma.tipo === 'elimina' ? 'Elimina' : 'Togli'}
            </button>
            <button type="button" className={stile.secondario} onClick={() => setConferma(null)}>
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className={stile.azioni}>
        <button type="button" className={stile.primario} disabled={bloccoD22 !== null || mancante !== null || fermo} onClick={salva}>
          {ferma ? 'Salva comunque' : 'Salva'}
        </button>
        {scheda.modo === 'modifica' && (
          <button type="button" className={stile.pericolo} disabled={fermo} onClick={() => setConferma({ tipo: 'elimina' })}>
            Elimina visita
          </button>
        )}
      </div>
      {/* §4.4: dopo «Non so» un solo pulsante acceso, «Controlla». */}
      {incerto && (
        <div className={stile.azioni}>
          <button type="button" className={stile.primario} disabled={inControllo} onClick={() => void controlla()}>
            Controlla
          </button>
        </div>
      )}
      {creaDiNuovo && (
        <div className={stile.azioni}>
          <button type="button" className={stile.primario} onClick={creaDaCapo}>
            Crea di nuovo
          </button>
        </div>
      )}
    </div>
  )
}
