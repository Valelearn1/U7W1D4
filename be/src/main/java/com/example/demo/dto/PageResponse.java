package com.example.demo.dto;

import org.springframework.data.domain.Page;

import java.util.List;

// Formato stabile per la paginazione lato FE (Page di Spring non va serializzato direttamente)
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
