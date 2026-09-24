package com.example.demo.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "prestiti")
@Getter
@Setter
@NoArgsConstructor
public class Prestito {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "libro_id", nullable = false)
    private Libro libro;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "data_riconsegna_prevista", nullable = false)
    private LocalDate dataRiconsegnaPrevista;

    @Column(name = "data_riconsegna_effettiva")
    private LocalDate dataRiconsegnaEffettiva;

    @Column(name = "penale_riscossa", precision = 4, scale = 2)
    private BigDecimal penaleRiscossa;

    // true se il prestito è stato prorogato
    @Column(name = "is_extended", nullable = false, columnDefinition = "boolean default false")
    private boolean extended = false;

    // Admin che ha aperto il prestito
    @ManyToOne(optional = false)
    @JoinColumn(name = "admin_open_id", nullable = false)
    private User adminOpen;

    // Admin che ha chiuso il prestito (NULL finché è aperto)
    @ManyToOne
    @JoinColumn(name = "admin_close_id")
    private User adminClose;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
