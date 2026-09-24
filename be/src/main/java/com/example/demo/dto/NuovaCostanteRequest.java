package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NuovaCostanteRequest(
        @NotBlank @Size(max = 255) String chiave,
        @NotNull @Size(max = 255) String valore
) {
}
