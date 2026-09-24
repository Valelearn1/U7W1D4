package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// username = email dell'utente
public record LoginRequest(
        @NotBlank @Email String username,
        @NotBlank String password
) {
}
