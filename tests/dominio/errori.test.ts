import { describe, expect, it } from 'vitest'
import { SEI_CON_MESSAGGIO_PROPRIO, classifica, messaggioPerAnnullato, messaggioPerSqlstate } from '../../src/dominio/errori'

describe('l involucro distingue per SOGGETTO prima che per codice (§4.3 passo 8)', () => {
  // ————— soggetto «invio» —————
  it('un SQLSTATE dell invio prova l annullamento, anche se non è fra i sei', () => {
    // §4.1, censimento misurato il 25/09/2026: salva_visita solleva anche
    // 22023, 22P02 e 23502, e sono fuori dai sei.
    for (const codice of ['22023', '22P02', '23502']) {
      expect(classifica('invio', { sqlstate: codice })).toEqual({
        tipo: 'annullato', sqlstate: codice, proprio: false,
      })
    }
  })

  it('i sei codici dell invio hanno un messaggio proprio', () => {
    for (const codice of ['40P01', '57014', '23505', '23503', '23514', '42501']) {
      expect(classifica('invio', { sqlstate: codice })).toEqual({
        tipo: 'annullato', sqlstate: codice, proprio: true,
      })
    }
    expect([...SEI_CON_MESSAGGIO_PROPRIO].sort()).toEqual(
      ['23503', '23505', '23514', '40P01', '42501', '57014'],
    )
  })

  it('un guasto dell invio SENZA sqlstate non prova niente: «Non so»', () => {
    expect(classifica('invio', {})).toEqual({ tipo: 'non_so' })
    expect(classifica('invio', { sqlstate: null })).toEqual({ tipo: 'non_so' })
    expect(classifica('invio', { sqlstate: '' })).toEqual({ tipo: 'non_so' })
  })

  it('un errore di PostgREST senza sqlstate è «Non so», non un fallimento', () => {
    // Un 500 generico, un PGRST…: sono FUORI dal database, e §4.3 passo 8 li
    // manda su «Non so se è stata salvata» con «Controlla».
    expect(classifica('invio', { sqlstate: undefined })).toEqual({ tipo: 'non_so' })
    // ⚠︎ Revisione del Task 4: la prova portava questo nome ma non passava mai
    // un codice PGRST, e `PGRST116` diventava «annullato».
    for (const codice of ['PGRST116', 'PGRST000', 'PGRST301']) {
      expect(classifica('invio', { sqlstate: codice })).toEqual({ tipo: 'non_so' })
    }
    // gemella: un SQLSTATE vero di cinque caratteri, lettere comprese, resta annullato
    expect(classifica('invio', { sqlstate: '22P02' }).tipo).toBe('annullato')
  })

  it('un azione che non esiste più è un rilascio nuovo, non un guasto del database', () => {
    expect(classifica('invio', { azioneMancante: true })).toEqual({ tipo: 'app_aggiornata' })
    // e vince sul codice, perché è una diagnosi del trasporto
    expect(classifica('invio', { azioneMancante: true, sqlstate: '23505' })).toEqual({
      tipo: 'app_aggiornata',
    })
  })

  // ————— soggetto «controlla» —————
  it('55P03 di «Controlla» dà «Non so», MAI «riprova a salvare»', () => {
    // È il caso che la revisione 20 ha scritto: 55P03 non è fra i sei, quindi
    // un involucro fedele al passo 8 direbbe «Non sono riuscita a salvare,
    // riprova» — la frase che §4.4 vieta.
    expect(classifica('controlla', { sqlstate: '55P03' })).toEqual({ tipo: 'non_so' })
  })

  it('anche i codici che PER L INVIO sono un fallimento, per «Controlla» sono «Non so»', () => {
    // 42883 è della STESSA famiglia di 42501: senza, un ramo «42xxx → uscita»
    // restava verde (revisione del Task 4).
    for (const codice of ['57014', '40P01', '40001', '23505', '22P02', 'P0003', '42883', '42P01']) {
      expect(classifica('controlla', { sqlstate: codice })).toEqual({ tipo: 'non_so' })
    }
  })

  it('42501 di «Controlla» è uscita forzata, senza affermazioni sulla visita', () => {
    expect(classifica('controlla', { sqlstate: '42501' })).toEqual({ tipo: 'uscita_forzata' })
  })

  it('un «Controlla» caduto per rete dà «Non so»', () => {
    expect(classifica('controlla', {})).toEqual({ tipo: 'non_so' })
  })

  it('lo stesso codice dà due risposte diverse a seconda del soggetto', () => {
    // La prova che nomina il contratto: è il SOGGETTO a decidere, non il codice.
    expect(classifica('invio', { sqlstate: '57014' }).tipo).toBe('annullato')
    expect(classifica('controlla', { sqlstate: '57014' }).tipo).toBe('non_so')
  })
})

describe('i sei SQLSTATE con un messaggio proprio (§4.3 passi 5, 6, 7)', () => {
  it('40P01 esauriti e 57014 dicono di riprovare', () => {
    expect(messaggioPerSqlstate('40P01')).toBe('Non sono riuscita a salvare, riprova')
    expect(messaggioPerSqlstate('57014')).toBe('Non sono riuscita a salvare, riprova')
  })

  it('23503 ha DUE frasi, e le distingue il nome del vincolo', () => {
    // ⚠︎ È la coppia che una prova sola non separerebbe. §4.3 passo 6: sulla
    // cliente «La cliente è stata cancellata», senza offerta di ricrearla; su
    // servizio od operatrice «Il servizio o l'operatrice non esiste più», e la
    // scheda si ricarica. Due messaggi, due comportamenti.
    expect(messaggioPerSqlstate('23503', 'visit_client_id_fkey'))
      .toBe('La cliente è stata cancellata')
    expect(messaggioPerSqlstate('23503', 'appointment_service_id_fkey'))
      .toBe('Il servizio o l’operatrice non esiste più')
    expect(messaggioPerSqlstate('23503', 'appointment_operator_id_fkey'))
      .toBe('Il servizio o l’operatrice non esiste più')
  })

  it('23505 su appointment_slot_unique rimanda al controllo dei conflitti', () => {
    // §4.3 passo 6: la frase la ricostruisce il passo 3, con TUTTI i conflitti.
    expect(messaggioPerSqlstate('23505', 'appointment_slot_unique')).toBe('')
  })

  it('23505 su una chiave primaria è un invio doppio: il server rilegge, non ripete', () => {
    expect(messaggioPerSqlstate('23505', 'visit_pkey')).toBe('')
    expect(messaggioPerSqlstate('23505', 'appointment_pkey')).toBe('')
    expect(messaggioPerSqlstate('23505', 'client_pkey')).toBe('')
  })

  it('23514 e 42501 hanno le loro frasi', () => {
    // Frasi decise dall'utente il 05/10/2026: la spec non le scrive. Con 23514
    // la scheda resta com'era; con 42501 — account ancora attivo al
    // ricontrollo — la scheda si chiude e il giorno si ricarica. Con l'account
    // CHIUSO, 42501 è l'uscita forzata di §4.4 e questa frase non si mostra:
    // lo decide `serveRicontrolloAccount` prima di chiederla.
    expect(messaggioPerSqlstate('23514'))
      .toBe('L’orario o la durata non sono validi. Controlla la scheda e riprova.')
    expect(messaggioPerSqlstate('42501'))
      .toBe('Questa visita non è più accessibile. Ricarico il giorno.')
  })

  it('un codice fuori dai sei dà la frase generica, e non una stringa vuota', () => {
    // §4.3 passo 8: «ogni altro SQLSTATE con "Non sono riuscita a salvare,
    // riprova", registrato per chi sviluppa». Mai «Non so se è stata salvata».
    for (const c of ['22023', '22P02', '23502', '22003']) {
      expect(messaggioPerSqlstate(c)).toBe('Non sono riuscita a salvare, riprova')
    }
  })

  it('un vincolo che nessun ramo nomina dà la frase generica, non il silenzio', () => {
    // Un 23505 o un 23503 su un vincolo sconosciuto non è né il controllo dei
    // conflitti né l'invio doppio: senza questa prova, `''` sarebbe un modo
    // di non dire niente a un'operatrice la cui scrittura è annullata.
    expect(messaggioPerSqlstate('23505', 'vincolo_che_non_esiste'))
      .toBe('Non sono riuscita a salvare, riprova')
    expect(messaggioPerSqlstate('23505')).toBe('Non sono riuscita a salvare, riprova')
    expect(messaggioPerSqlstate('23503', 'appointment_visit_date_fk'))
      .toBe('Non sono riuscita a salvare, riprova')
  })
})

describe('il messaggio intero di un invio annullato, nella forma degli esiti (revisione del Task 4)', () => {
  const resta = {
    spunta: false, schedaAdottaStato: false, ricaricaIlGiorno: false, ricaricaLaScheda: false, uscitaForzata: false,
  }

  it('23503 su servizio od operatrice ricarica la scheda; sulla cliente no (§4.3 passo 6)', () => {
    for (const v of ['appointment_service_id_fkey', 'appointment_operator_id_fkey']) {
      expect(messaggioPerAnnullato('23503', v)).toEqual({
        ...resta, testo: 'Il servizio o l’operatrice non esiste più', ricaricaLaScheda: true,
      })
    }
    expect(messaggioPerAnnullato('23503', 'visit_client_id_fkey')).toEqual({
      ...resta, testo: 'La cliente è stata cancellata',
    })
  })

  it('42501 con l account ancora attivo chiude la scheda e ricarica il giorno', () => {
    expect(messaggioPerAnnullato('42501')).toEqual({
      ...resta, testo: 'Questa visita non è più accessibile. Ricarico il giorno.', ricaricaIlGiorno: true,
    })
  })

  it('gli altri lasciano la scheda com era, e nessuno porta il ✓ né fa uscire', () => {
    expect(messaggioPerAnnullato('23514')).toEqual({
      ...resta, testo: 'L’orario o la durata non sono validi. Controlla la scheda e riprova.',
    })
    for (const c of ['40P01', '57014', '22023']) {
      expect(messaggioPerAnnullato(c)).toEqual({ ...resta, testo: 'Non sono riuscita a salvare, riprova' })
    }
  })
})
