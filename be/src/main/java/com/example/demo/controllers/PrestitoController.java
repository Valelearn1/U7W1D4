package com.example.demo.controllers;

import com.example.demo.dto.*;
import com.example.demo.services.PrestitoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/prestiti")
@RequiredArgsConstructor
public class PrestitoController {

    private final PrestitoService prestitoService;

    // 409 se il libro non ha copie disponibili
    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @PostMapping("/NewPrestito")
    @ResponseStatus(HttpStatus.CREATED)
    public PrestitoResponse newPrestito(@Valid @RequestBody NuovoPrestitoRequest request, @AuthenticationPrincipal Jwt jwt) {
        return prestitoService.apri(request, UUID.fromString(jwt.getSubject()));
    }

    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @PatchMapping("/ClosePrestito")
    @ResponseStatus(HttpStatus.CREATED)
    public PrestitoResponse closePrestito(@Valid @RequestBody ChiudiPrestitoRequest request, @AuthenticationPrincipal Jwt jwt) {
        return prestitoService.chiudi(request, UUID.fromString(jwt.getSubject()));
    }

    // Esempio: /AllPrestiti?stato=IN_RITARDO&q=rossi&sort=dataRiconsegnaPrevista,asc&page=0&size=20
    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @GetMapping("/AllPrestiti")
    public PageResponse<PrestitoResponse> allPrestiti(@ModelAttribute PrestitoSearchParams params,
                                                      @PageableDefault(size = 20) Pageable pageable) {
        return prestitoService.cerca(params, null, pageable);
    }

    // Stessi filtri di /AllPrestiti, ma sempre limitati all'utente del JWT
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/UserPrestiti")
    public PageResponse<PrestitoResponse> userPrestiti(@ModelAttribute PrestitoSearchParams params,
                                                       @PageableDefault(size = 20) Pageable pageable,
                                                       @AuthenticationPrincipal Jwt jwt) {
        return prestitoService.cerca(params, UUID.fromString(jwt.getSubject()), pageable);
    }

    // 409 se il prestito è già stato esteso una volta o è chiuso
    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @PatchMapping("/ExtendPrestito")
    public PrestitoResponse extendPrestito(@Valid @RequestBody EstendiPrestitoRequest request) {
        return prestitoService.estendi(request);
    }
}
