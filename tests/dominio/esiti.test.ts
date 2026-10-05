import { describe, expect, it } from 'vitest'
import { messaggioPerEsito, serveRicontrolloAccount } from '../../src/dominio/esiti'

const ESITI = ['salvata', 'cancellata', 'gia_cancellata', 'esiste_gia', 'modificata_altrove',
               'cancellata_altrove', 'non_trovata', 'annullato'] as const

describe('ogni esito ha il suo messaggio (§4.1)', () => {
  it('salvata e cancellata portano il ✓; nessun altro lo porta', () => {
    expect(messaggioPerEsito('salvata', false)).toMatchObject({ testo: '✓ Salvata', spunta: true })
    expect(messaggioPerEsito('cancellata', false)).toMatchObject({ testo: '✓ Cancellata', spunta: true })
    for (const e of ['gia_cancellata', 'esiste_gia', 'modificata_altrove',
                     'cancellata_altrove', 'non_trovata', 'annullato'] as const) {
      expect(messaggioPerEsito(e, false).spunta).toBe(false)
    }
  })

  it('modificata_altrove fa adottare lo stato corrente alla scheda («La scheda aggiornata»)', () => {
    expect(messaggioPerEsito('modificata_altrove', false).schedaAdottaStato).toBe(true)
    // gemella: nessun altro esito lo fa
    for (const e of ESITI.filter((x) => x !== 'modificata_altrove')) {
      expect(messaggioPerEsito(e, false).schedaAdottaStato).toBe(false)
    }
  })

  it('gia_cancellata dice «Era già stata cancellata» e non offre di ricreare', () => {
    expect(messaggioPerEsito('gia_cancellata', false).testo).toBe('Era già stata cancellata')
  })

  it('cancellata_altrove dice che è stata cancellata da un altra parte', () => {
    expect(messaggioPerEsito('cancellata_altrove', false).testo)
      .toBe('È stata cancellata da un’altra parte')
  })

  it('non_trovata ha DUE messaggi, e li separa il ricontrollo dell account', () => {
    expect(messaggioPerEsito('non_trovata', true).testo).toMatch(/account/i)
    expect(messaggioPerEsito('non_trovata', false).testo).toBe('Questa visita non esiste più')
  })

  it('annullato non è un messaggio per l operatrice: la risposta si scarta (§4.1)', () => {
    expect(messaggioPerEsito('annullato', false).testo).toBe('')
  })

  it('esiste_gia non ha messaggio: il server rilegge e mostra (§4.1)', () => {
    expect(messaggioPerEsito('esiste_gia', false).testo).toBe('')
  })

  it('con l account chiuso nessun esito dà il ✓ né fa adottare lo stato (§4.3 passo 7)', () => {
    // «si ricontrolla l'account prima di scegliere il messaggio e prima che la
    // scheda adotti lo stato restituito»: un account chiuso fra due letture
    // riceve `modificata_altrove` con uno stato «corrente» VUOTO, e adottarlo
    // svuoterebbe la scheda. E un `salvata` senza UPDATE è falso.
    for (const e of ESITI) {
      const m = messaggioPerEsito(e, true)
      expect(m.spunta).toBe(false)
      expect(m.schedaAdottaStato).toBe(false)
      expect(m.testo).toMatch(/account/i)
    }
  })

  it('ricaricano il giorno gli esiti che affermano che la visita non c è più', () => {
    // [proposta del Task 4] La scheda non ha più niente da mostrare: l'agenda
    // dietro va riletta. Gli altri esiti la lasciano com'è.
    for (const e of ['cancellata_altrove', 'gia_cancellata', 'non_trovata'] as const) {
      expect(messaggioPerEsito(e, false).ricaricaIlGiorno).toBe(true)
    }
    for (const e of ['salvata', 'cancellata', 'esiste_gia', 'modificata_altrove', 'annullato'] as const) {
      expect(messaggioPerEsito(e, false).ricaricaIlGiorno).toBe(false)
    }
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
