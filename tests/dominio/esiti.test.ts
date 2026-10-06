import { describe, expect, it } from 'vitest'
import { messaggioPerEsito, serveRicontrolloAccount } from '../../src/dominio/esiti'

const ESITI = ['salvata', 'cancellata', 'gia_cancellata', 'esiste_gia', 'modificata_altrove',
               'cancellata_altrove', 'non_trovata', 'annullato'] as const

// ⚠︎ Revisione del Task 4: le prove guardavano un campo alla volta, e
// `modificata_altrove` con il testo «✓ Salvata» restava verde. Ora ogni esito
// si confronta con il Messaggio INTERO: un campo in più o un testo sbagliato
// arrossiscono.
const fermo = {
  spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false,
}
const ATTESO = {
  salvata: { ...fermo, testo: '✓ Salvata', spunta: true },
  cancellata: { ...fermo, testo: '✓ Cancellata', spunta: true },
  gia_cancellata: { ...fermo, testo: 'Era già stata cancellata', ricaricaIlGiorno: true },
  esiste_gia: { ...fermo, testo: '' },                                   // il server rilegge e mostra
  modificata_altrove: { ...fermo, testo: '', schedaAdottaStato: true },  // «La scheda aggiornata»
  cancellata_altrove: { ...fermo, testo: 'È stata cancellata da un’altra parte', ricaricaIlGiorno: true },
  non_trovata: { ...fermo, testo: 'Questa visita non esiste più', ricaricaIlGiorno: true },
  annullato: { ...fermo, testo: '' },                                    // la risposta si scarta (§4.1)
} as const

describe('ogni esito ha il suo messaggio (§4.1)', () => {
  for (const e of ESITI) {
    it(`${e}: il messaggio intero`, () => {
      expect(messaggioPerEsito(e, false)).toEqual(ATTESO[e])
    })
  }

  it('il ✓ sta solo su salvata e cancellata, nel campo E nel testo (§4.4)', () => {
    for (const e of ESITI) {
      const m = messaggioPerEsito(e, false)
      const conSpunta = e === 'salvata' || e === 'cancellata'
      expect(m.spunta).toBe(conSpunta)
      expect(m.testo.includes('✓')).toBe(conSpunta)
    }
  })

  it('con l account chiuso ogni esito è l uscita forzata, senza frase né stato (§4.3 passo 7, §4.4)', () => {
    // Un account chiuso fra due letture riceve `modificata_altrove` con uno
    // stato «corrente» VUOTO, e adottarlo svuoterebbe la scheda; un `salvata`
    // senza UPDATE è falso. Prima c'era solo una frase, e niente diceva di
    // far uscire l'operatrice.
    for (const e of ESITI) {
      expect(messaggioPerEsito(e, true)).toEqual({ ...fermo, testo: '', uscitaForzata: true })
    }
  })

  it('non_trovata ha DUE risposte, e le separa il ricontrollo dell account', () => {
    expect(messaggioPerEsito('non_trovata', false).testo).toBe('Questa visita non esiste più')
    expect(messaggioPerEsito('non_trovata', true).uscitaForzata).toBe(true)
  })
})

describe('quando si ricontrolla l account (§4.3 passo 7)', () => {
  it('su ogni esito diverso da salvata e cancellata', () => {
    for (const e of ['esiste_gia', 'modificata_altrove', 'cancellata_altrove',
                     'non_trovata', 'gia_cancellata', 'annullato'] as const) {
      expect(serveRicontrolloAccount(e, true)).toBe(true)
    }
  })

  it('NON su salvata e cancellata, quando la scrittura ha toccato righe', () => {
    expect(serveRicontrolloAccount('salvata', true)).toBe(false)
    expect(serveRicontrolloAccount('cancellata', true)).toBe(false)
  })

  it('SÌ su un salvata che non ha eseguito alcun UPDATE: lì la regola 11 non ha righe da contare', () => {
    // §4.3 passo 7, il caso che una lettura distratta perde: uno stato già
    // identico a quello chiesto tocca zero righe, e un account chiuso in quel
    // momento riceverebbe un `salvata` falso senza che niente sollevi.
    expect(serveRicontrolloAccount('salvata', false)).toBe(true)
  })

  it('e SÌ anche su un cancellata che non ha toccato righe: è lo stesso rischio', () => {
    // La gemella della prova di sopra. Senza di lei, `haFattoUpdate` sarebbe un
    // ingresso variato per un esito solo.
    expect(serveRicontrolloAccount('cancellata', false)).toBe(true)
  })

  it('SÌ su 42501, che non è un esito ma un errore sollevato (§4.3 passo 7, §8.1)', () => {
    // ⚠︎ È il terzo dei tre ingressi che §4.3 passo 7 elenca. Il danno era che
    // un'operatrice disattivata a metà invio riceveva un messaggio di
    // fallimento generico e RESTAVA DENTRO L'APP — mentre per lo stesso codice
    // su «Controlla» §4.4 impone l'uscita forzata.
    expect(serveRicontrolloAccount({ sqlstate: '42501' }, true)).toBe(true)
  })

  it('NO sugli altri SQLSTATE: provano l annullamento e basta', () => {
    for (const c of ['23505', '23503', '23514', '57014', '22023']) {
      expect(serveRicontrolloAccount({ sqlstate: c }, true)).toBe(false)
    }
  })
})
