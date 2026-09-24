package com.example.demo.dto;

import com.example.demo.entities.Libro;

import java.math.BigDecimal;
import java.util.UUID;

public record LibroResponse(
        UUID id,
        BigDecimal isbn,
        String titolo,
        String autore,
        String edizione,
        String casaEditrice,
        BigDecimal prezzo,
        Integer annoDiUscita,
        Integer copieTotali,
        Integer copieDisponibili,
        Boolean copertinaRigida,
        String path,
        UUID genereId,
        String genere
) {
    public static LibroResponse of(Libro l) {
        return new LibroResponse(l.getId(), l.getIsbn(), l.getTitolo(), l.getAutore(), l.getEdizione(),
                l.getCasaEditrice(), l.getPrezzo(), l.getAnnoDiUscita().getValue(), l.getCopieTotali(),
                l.getCopieDisponibili(), l.getCopertinaRigida(), l.getPath(),
                l.getGenere().getId(), l.getGenere().getNome());
    }
}
