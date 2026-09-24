package com.example.demo.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String nome,
        String cognome,
        LocalDate dataDiNascita,
        String indirizzo,
        List<String> ruoli,
        Instant createdAt
) {
}
