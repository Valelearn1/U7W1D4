package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record NuovoPrestitoRequest(
        @NotNull UUID userId,
        @NotNull UUID libroId,
        // Facoltativa, default MEDIA
        DurataPrestito durata
) {
}
