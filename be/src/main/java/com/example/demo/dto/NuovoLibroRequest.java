package com.example.demo.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.UUID;

public record NuovoLibroRequest(
        @NotNull @Positive @Digits(integer = 13, fraction = 0) BigDecimal isbn,
        @NotBlank String titolo,
        @NotBlank String autore,
        String edizione,
        @NotBlank String casaEditrice,
        @NotNull @DecimalMin("0.00") @Digits(integer = 2, fraction = 2) BigDecimal prezzo,
        @NotNull @Min(1450) Integer annoDiUscita,
        // Copie da inserire: diventano copieTotali e copieDisponibili (o si sommano se l'ISBN esiste già)
        @NotNull @Positive Integer copie,
        @NotNull Boolean copertinaRigida,
        // Id di un genere esistente (menu a tendina da /api/generi/allGeneri)
        @NotNull UUID genereId,
        String path
) {
}
