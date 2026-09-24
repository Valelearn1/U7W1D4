package com.example.demo.controllers;

import com.example.demo.dto.GenereResponse;
import com.example.demo.dto.NuovoGenereRequest;
import com.example.demo.services.GenereService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/generi")
@RequiredArgsConstructor
public class GenereController {

    private final GenereService genereService;

    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @PostMapping("/newGenere")
    @ResponseStatus(HttpStatus.CREATED)
    public GenereResponse newGenere(@Valid @RequestBody NuovoGenereRequest request) {
        return genereService.crea(request.nome());
    }

    // Lista completa ordinata per nome, per i menu a tendina (ricerca e aggiunta libro)
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/allGeneri")
    public List<GenereResponse> allGeneri() {
        return genereService.tutti();
    }
}
