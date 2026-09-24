package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// La penale è calcolata dal server (giorni di ritardo x penale giornaliera, con tetto massimo)
public record ChiudiPrestitoRequest(
        @NotNull UUID idPrestito
) {
}
