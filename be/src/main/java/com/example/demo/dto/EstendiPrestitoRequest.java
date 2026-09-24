package com.example.demo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record EstendiPrestitoRequest(
        @NotNull UUID idPrestito,
        // Giorni aggiunti alla data di riconsegna prevista
        @NotNull @Positive @Max(365) Integer giorni
) {
}
