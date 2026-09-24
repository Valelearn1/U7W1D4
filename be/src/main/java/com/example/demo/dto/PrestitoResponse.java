package com.example.demo.dto;

import com.example.demo.entities.Libro;
import com.example.demo.entities.Prestito;
import com.example.demo.entities.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PrestitoResponse(
        UUID id,
        UtenteBreve user,
        LibroBreve libro,
        Instant createdAt,
        LocalDate dataRiconsegnaPrevista,
        LocalDate dataRiconsegnaEffettiva,
        BigDecimal penaleRiscossa,
        boolean extended,
        StatoPrestito stato,
        UtenteBreve adminOpen,
        UtenteBreve adminClose
) {
    public record UtenteBreve(UUID id, String email, String nome, String cognome) {
        static UtenteBreve of(User u) {
            return u == null ? null : new UtenteBreve(u.getId(), u.getEmail(), u.getNome(), u.getCognome());
        }
    }

    public record LibroBreve(UUID id, BigDecimal isbn, String titolo, String autore) {
        static LibroBreve of(Libro l) {
            return new LibroBreve(l.getId(), l.getIsbn(), l.getTitolo(), l.getAutore());
        }
    }

    public static PrestitoResponse of(Prestito p, LocalDate oggi) {
        StatoPrestito stato = p.getDataRiconsegnaEffettiva() != null ? StatoPrestito.CHIUSO
                : p.getDataRiconsegnaPrevista().isBefore(oggi) ? StatoPrestito.IN_RITARDO
                : StatoPrestito.APERTO;
        return new PrestitoResponse(p.getId(), UtenteBreve.of(p.getUser()), LibroBreve.of(p.getLibro()),
                p.getCreatedAt(), p.getDataRiconsegnaPrevista(), p.getDataRiconsegnaEffettiva(),
                p.getPenaleRiscossa(), p.isExtended(), stato,
                UtenteBreve.of(p.getAdminOpen()), UtenteBreve.of(p.getAdminClose()));
    }
}
