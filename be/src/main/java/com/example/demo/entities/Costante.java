package com.example.demo.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

// Tabella isolata chiave/valore per configurazioni salvate a DB
@Entity
@Table(name = "costanti")
@Getter
@Setter
@NoArgsConstructor
public class Costante {

    // Chiavi usate dall'applicazione (default e fallback in CostanteService)
    public static final String PRESTITO_DURATA_BREVE = "prestito.durata.breve";
    public static final String PRESTITO_DURATA_MEDIA = "prestito.durata.media";
    public static final String PRESTITO_DURATA_LUNGA = "prestito.durata.lunga";
    public static final String PRESTITO_PENALE_GIORNALIERA = "prestito.penale.giornaliera";
    public static final String PRESTITO_PENALE_MASSIMA = "prestito.penale.massima";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String chiave;

    @Column(nullable = false)
    private String valore;

    public Costante(String chiave, String valore) {
        this.chiave = chiave;
        this.valore = valore;
    }
}
