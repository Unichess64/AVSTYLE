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
 * inserisce in una navigazione dal client. Lo stesso lavoro, dopo, lo fanno
 * `InterruttoreVista` e `SelettoreOperatrice`.
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
