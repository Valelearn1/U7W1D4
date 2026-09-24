package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record AggiungiCopieRequest(
        @NotNull UUID idLibro,
        // Facoltativo, default 1
        @Positive Integer copie
) {
}
