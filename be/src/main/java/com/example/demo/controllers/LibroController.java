package com.example.demo.controllers;

import com.example.demo.dto.*;
import com.example.demo.services.LibroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/book")
@RequiredArgsConstructor
public class LibroController {

    private final LibroService libroService;

    // ?page=0&size=20 ; ordinamento fisso per titolo crescente
    @PreAuthorize("permitAll()")
    @GetMapping("/all")
    public PageResponse<LibroResponse> all(@PageableDefault(size = 20) Pageable pageable) {
        return libroService.tutti(pageable);
    }

    // 201 se il libro è nuovo, 200 se l'ISBN esisteva e sono state aggiunte le copie
    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @PostMapping("/newLibro")
    public ResponseEntity<LibroOperazioneResponse> newLibro(@Valid @RequestBody NuovoLibroRequest request) {
        LibroService.EsitoNuovoLibro esito = libroService.nuovo(request);
        return ResponseEntity.status(esito.creato() ? HttpStatus.CREATED : HttpStatus.OK).body(esito.risposta());
    }

    @PreAuthorize("hasAnyRole('Admin', 'SuperUser')")
    @PatchMapping("/addLibro")
    public LibroOperazioneResponse addLibro(@Valid @RequestBody AggiungiCopieRequest request) {
        return libroService.aggiungiCopie(request.idLibro(), request.copie());
    }

    // Esempio: /search?q=tolkien&annoDa=1950&disponibile=true&sort=autore,asc&sort=prezzo,desc&page=0&size=10
    @PreAuthorize("permitAll()")
    @PostMapping("/search")
    public PageResponse<LibroResponse> search(@ModelAttribute LibroSearchParams params,
                                              @PageableDefault(size = 20) Pageable pageable) {
        return libroService.cerca(params, pageable);
    }
}
