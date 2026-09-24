package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.UUID;

// Filtri di /api/book/search da query string, tutti facoltativi e combinati in AND
public record LibroSearchParams(
        String q,                  // testo libero su titolo, autore, casa editrice, genere, ISBN
        String titolo,
        String autore,
        String casaEditrice,
        UUID genereId,
        Integer annoDa,
        Integer annoA,
        BigDecimal prezzoMin,
        BigDecimal prezzoMax,
        Boolean copertinaRigida,
        Boolean disponibile        // true = solo libri con copie disponibili
) {
}
