package com.example.demo.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "ruoli")
@Getter
@Setter
@NoArgsConstructor
public class Ruolo {

    public static final String SUPER_USER = "SuperUser";
    public static final String ADMIN = "Admin";
    public static final String USER = "User";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String ruolo;

    public Ruolo(String ruolo) {
        this.ruolo = ruolo;
    }
}
