// src/cliente/vista.ts
//
// Testo e bordo di un blocco si calcolano dal CONTRASTO del colore
// dell'operatrice, non dal suo nome (spec 3a §6.2): il colore arriva da
// `operator.color` e può cambiare dalle Impostazioni.

export const SFONDO = '#FDEDF0'
export const INCHIOSTRO = '#140D18'
const BIANCO = '#FFFFFF'

// Il bordo serve a separare il blocco dallo sfondo: sotto 3:1 non lo fa il
// colore, e lo fa l'inchiostro (L9, Annalisa a 1,13).
const SOGLIA_BORDO = 3

const ESADECIMALE = /^#[0-9A-Fa-f]{6}$/

function luminanza(colore: string): number {
  const canali = [1, 3, 5].map((i) => parseInt(colore.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canali.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Il rapporto di contrasto WCAG fra due colori `#RRGGBB`. */
export function contrasto(a: string, b: string): number {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export interface ColoriDelBlocco {
  /** Va in un attributo SVG, mai in uno `style`: la CSP di produzione lo bloccherebbe. */
  readonly riempimento: string
  /** Una classe, non un colore: due sole scelte. */
  readonly testo: 'chiaro' | 'scuro'
  readonly bordo: string
}

export function coloriDelBlocco(colore: string): ColoriDelBlocco {
  // Un valore che non è `#RRGGBB` non entra in un attributo: si ripiega sul
  // bianco con il bordo, che resta leggibile.
  const riempimento = ESADECIMALE.test(colore) ? colore.toUpperCase() : BIANCO
  const testo = contrasto(BIANCO, riempimento) >= contrasto(INCHIOSTRO, riempimento) ? 'chiaro' : 'scuro'
  const bordo = contrasto(riempimento, SFONDO) >= SOGLIA_BORDO ? riempimento : INCHIOSTRO
  return { riempimento, testo, bordo }
}
