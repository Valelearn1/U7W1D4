package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

// chiave e valore facoltativi: si aggiorna solo ciò che viene inviato (almeno uno dei due)
public record ModificaCostanteRequest(
        @NotNull UUID id,
        @Size(max = 255) @Pattern(regexp = ".*\\S.*", message = "non deve essere vuota") String chiave,
        @Size(max = 255) String valore
) {
}
