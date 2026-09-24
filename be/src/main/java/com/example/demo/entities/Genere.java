package com.example.demo.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "generi")
@Getter
@Setter
@NoArgsConstructor
public class Genere {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String nome;

    @OneToMany(mappedBy = "genere")
    private List<Libro> libri = new ArrayList<>();

    public Genere(String nome) {
        this.nome = nome;
    }
}
