package com.example.demo.dto;

import com.example.demo.entities.Genere;

import java.util.UUID;

public record GenereResponse(
        UUID id,
        String nome
) {
    public static GenereResponse of(Genere g) {
        return new GenereResponse(g.getId(), g.getNome());
    }
}
