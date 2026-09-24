package com.example.demo.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "ruoli_utenti",
        uniqueConstraints = @UniqueConstraint(name = "ruoli_utenti_unique", columnNames = {"id_utente", "id_ruolo"}))
@Getter
@Setter
@NoArgsConstructor
public class RuoloUtente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_utente", nullable = false)
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_ruolo", nullable = false)
    private Ruolo ruolo;

    public RuoloUtente(User user, Ruolo ruolo) {
        this.user = user;
        this.ruolo = ruolo;
    }
}
