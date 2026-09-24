package com.example.demo.controllers;

import com.example.demo.dto.CreaRuoloRequest;
import com.example.demo.services.RuoloService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/role")
@RequiredArgsConstructor
public class RuoloController {

    private final RuoloService ruoloService;

    @PreAuthorize("hasRole('SuperUser')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void crea(@Valid @RequestBody CreaRuoloRequest request) {
        ruoloService.crea(request.ruolo());
    }

    @PreAuthorize("hasRole('SuperUser')")
    @PostMapping("/grantAdmin/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    public void grantAdmin(@PathVariable UUID userId) {
        ruoloService.grantAdmin(userId);
    }

    @PreAuthorize("hasRole('SuperUser')")
    @DeleteMapping("/revokeAdmin/{userId}")
    public void revokeAdmin(@PathVariable UUID userId) {
        ruoloService.revokeAdmin(userId);
    }
}
