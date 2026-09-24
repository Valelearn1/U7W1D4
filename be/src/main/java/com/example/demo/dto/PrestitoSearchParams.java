package com.example.demo.dto;

import java.time.LocalDate;
import java.util.UUID;

// Filtri di ricerca prestiti da query string, tutti facoltativi e combinati in AND
public record PrestitoSearchParams(
        String q,               // testo libero su email/nome/cognome utente, titolo, ISBN
        UUID userId,            // ignorato in /UserPrestiti (forzato all'utente del JWT)
        UUID libroId,
        StatoPrestito stato,
        Boolean extended,
        LocalDate dataDa,       // data di apertura (created_at) da...
        LocalDate dataA,        // ...a (inclusa)
        LocalDate scadenzaDa,   // data di riconsegna prevista da...
        LocalDate scadenzaA     // ...a (inclusa)
) {
}
