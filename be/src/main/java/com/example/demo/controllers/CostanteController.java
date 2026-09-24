package com.example.demo.controllers;

import com.example.demo.dto.CostanteResponse;
import com.example.demo.dto.ModificaCostanteRequest;
import com.example.demo.dto.NuovaCostanteRequest;
import com.example.demo.services.CostanteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/costanti")
@RequiredArgsConstructor
public class CostanteController {

    private final CostanteService costanteService;

    // Ordinate per chiave
    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @GetMapping("/all")
    public List<CostanteResponse> all() {
        return costanteService.tutte();
    }

    // 409 se la chiave esiste già
    @PreAuthorize("hasRole('SuperUser')")
    @PostMapping("/newCostante")
    @ResponseStatus(HttpStatus.CREATED)
    public CostanteResponse newCostante(@Valid @RequestBody NuovaCostanteRequest request) {
        return costanteService.crea(request);
    }

    @PreAuthorize("hasRole('SuperUser')")
    @DeleteMapping("/deleteCostante/{id}")
    public void deleteCostante(@PathVariable UUID id) {
        costanteService.elimina(id);
    }

    // Aggiorna solo i campi inviati; 409 se la nuova chiave è già usata
    @PreAuthorize("hasRole('SuperUser')")
    @PatchMapping("/editCostante")
    public CostanteResponse editCostante(@Valid @RequestBody ModificaCostanteRequest request) {
        return costanteService.modifica(request);
    }
}
