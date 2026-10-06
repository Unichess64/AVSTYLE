// src/cliente/preferenze.ts
//
// D2-1: la vista colonne/lista e l'operatrice della settimana si ricordano in
// `localStorage`, per dispositivo. Non sono dati personali: due preferenze di
// vista, e un `operator.id`.
//
// ⚠︎ Ogni lettura e ogni scrittura sta in un try/catch: in navigazione privata,
// con lo spazio pieno o con i dati del sito bloccati `localStorage` solleva, o
// non c'è. La pagina funziona senza: si vede la vista a colonne e il giorno.

export const CHIAVE_VISTA = 'avstyle.vista'
export const CHIAVE_OPERATRICE = 'avstyle.operatriceSettimana'

export function leggiPreferenza(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave)
  } catch {
    return null
  }
}

/** `null` cancella. */
export function scriviPreferenza(chiave: string, valore: string | null): void {
  try {
    if (valore === null) localStorage.removeItem(chiave)
    else localStorage.setItem(chiave, valore)
  } catch {
    // Una preferenza persa non è un guasto: la prossima apertura mostra le colonne.
  }
}

/**
 * La vista che l'interruttore applica al montaggio. Legge la PREFERENZA, non
 * l'attributo `data-vista`: dopo una navigazione dal client lo script non ha
 * girato e l'attributo manca (revisione del Task 6, misurato dopo l'accesso).
 */
export function vistaRicordata(preferenza: string | null): 'colonne' | 'lista' {
  return preferenza === 'lista' ? 'lista' : 'colonne'
}

/**
 * Che cosa fa il selettore dell'operatrice al montaggio.
 *
 * - sulla settimana: la ricorda;
 * - sul giorno, arrivandoci (accesso, barra in basso): riapre la settimana
 *   ricordata, se l'operatrice è ancora attiva, altrimenti la dimentica;
 * - sul giorno, tornando INDIETRO: la dimentica. Riaprirla sostituiva la voce
 *   del giorno con la settimana, e servivano tre «indietro» per uscire
 *   (revisione del Task 6, misurato). Chi torna indietro al giorno ha lasciato
 *   la settimana come chi tocca «Tutte · giorno».
 */
export function decisioneSettimana(stato: {
  settimana: string | null
  ricordata: string | null
  attive: readonly string[]
  daIndietro: boolean
}): 'ricorda' | 'riapri' | 'dimentica' | 'niente' {
  if (stato.settimana !== null) return 'ricorda'
  if (stato.ricordata === null) return 'niente'
  if (stato.daIndietro || !stato.attive.includes(stato.ricordata)) return 'dimentica'
  return 'riapri'
}

/**
 * Lo script in testa all'agenda, che gira PRIMA della prima pittura: il
 * server non vede `localStorage`, e senza questo chi ha scelto la lista
 * vedrebbe un lampo di colonne a ogni apertura.
 *
 * - la lista ricordata mette `data-vista="lista"` sull'`html`, e il CSS
 *   nasconde le colonne;
 * - l'operatrice ricordata, se l'indirizzo non porta già `?settimana=`,
 *   riapre la sua settimana con `location.replace`, tenendo il giorno.
 *
 * Gira solo al caricamento vero della pagina: React non esegue gli script che
 * inserisce in una navigazione dal client — l'accesso (`redirect('/agenda')`)
 * e la barra in basso lo sono. Dopo, lo stesso lavoro lo fanno
 * `InterruttoreVista` con `vistaRicordata` e `SelettoreOperatrice` con
 * `decisioneSettimana`, che leggono `localStorage` e non l'attributo.
 *
 * ⚠︎ È una stringa, con il nonce della CSP: niente `unsafe-inline`. Si valuta
 * nelle prove così com'è.
 */
export const SCRIPT_PREFERENZE = `(function(){try{
var v=localStorage.getItem('${CHIAVE_VISTA}');
if(v==='lista')document.documentElement.setAttribute('data-vista','lista');
var o=localStorage.getItem('${CHIAVE_OPERATRICE}');
if(!o||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o))return;
if(/[?&]settimana=/.test(location.search))return;
var g=/[?&]giorno=(\\d{4}-\\d{2}-\\d{2})(?:&|$)/.exec(location.search);
location.replace(location.pathname+(g?'?giorno='+g[1]+'&settimana=':'?settimana=')+o);
}catch(e){}})()`
