package com.example.demo.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;
import java.time.Year;
import java.util.UUID;

@Entity
@Table(name = "libri")
@Check(name = "libri_copie_check", constraints = "copie_disponibili >= 0 AND copie_disponibili <= copie_totali")
@Getter
@Setter
@NoArgsConstructor
public class Libro {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, precision = 13, scale = 0)
    private BigDecimal isbn;

    @Column(nullable = false)
    private String titolo;

    @Column(nullable = false)
    private String autore;

    private String edizione;

    @Column(name = "casa_editrice", nullable = false)
    private String casaEditrice;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal prezzo;

    // Postgres non ha YEAR: Hibernate mappa java.time.Year su INTEGER
    @Column(name = "anno_di_uscita", nullable = false)
    private Year annoDiUscita;

    @Column(name = "copie_totali", nullable = false)
    private Integer copieTotali;

    @Column(name = "copie_disponibili", nullable = false)
    private Integer copieDisponibili;

    @Column(name = "copertina_rigida", nullable = false)
    private Boolean copertinaRigida;

    // Percorso della foto di copertina (NULL se non caricata)
    private String path;

    @ManyToOne(optional = false)
    @JoinColumn(name = "genere_id", nullable = false)
    private Genere genere;
}
