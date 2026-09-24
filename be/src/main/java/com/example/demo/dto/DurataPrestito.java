package com.example.demo.dto;

import com.example.demo.entities.Costante;

// Durata scelta all'apertura: i giorni sono letti dalla tabella costanti
public enum DurataPrestito {
    BREVE(Costante.PRESTITO_DURATA_BREVE),
    MEDIA(Costante.PRESTITO_DURATA_MEDIA),
    LUNGA(Costante.PRESTITO_DURATA_LUNGA);

    private final String chiaveCostante;

    DurataPrestito(String chiaveCostante) {
        this.chiaveCostante = chiaveCostante;
    }

    public String chiaveCostante() {
        return chiaveCostante;
    }
}
