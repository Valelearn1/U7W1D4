package com.example.demo.services;

import com.example.demo.dto.*;
import com.example.demo.entities.Genere;
import com.example.demo.entities.Libro;
import com.example.demo.repositories.GenereRepository;
import com.example.demo.repositories.LibroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LibroService {

    // Colonne ordinabili da /search: nome nel parametro sort -> proprietà JPA
    private static final Map<String, String> SORT_CONSENTITI = Map.of(
            "titolo", "titolo",
            "autore", "autore",
            "casaEditrice", "casaEditrice",
            "edizione", "edizione",
            "prezzo", "prezzo",
            "annoDiUscita", "annoDiUscita",
            "copieDisponibili", "copieDisponibili",
            "copieTotali", "copieTotali",
            "isbn", "isbn",
            "genere", "genere.nome");

    private final LibroRepository libroRepository;
    private final GenereRepository genereRepository;

    @Transactional(readOnly = true)
    public PageResponse<LibroResponse> tutti(Pageable pageable) {
        Pageable perTitolo = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("titolo").ascending());
        return PageResponse.of(libroRepository.findAll(perTitolo).map(LibroResponse::of));
    }

    @Transactional(readOnly = true)
    public PageResponse<LibroResponse> cerca(LibroSearchParams params, Pageable pageable) {
        Sort sort = SearchUtils.traduciSort(pageable.getSort(), SORT_CONSENTITI, Sort.by("titolo"));
        Pageable richiesta = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        return PageResponse.of(libroRepository.findAll(LibroSpecifications.da(params), richiesta).map(LibroResponse::of));
    }

    public record EsitoNuovoLibro(boolean creato, LibroOperazioneResponse risposta) {
    }

    @Transactional
    public EsitoNuovoLibro nuovo(NuovoLibroRequest r) {
        verificaAnno(r.annoDiUscita());

        var esistente = libroRepository.findByIsbn(r.isbn());
        if (esistente.isPresent()) {
            return new EsitoNuovoLibro(false, aggiungiCopie(esistente.get().getId(), r.copie()));
        }

        Libro libro = new Libro();
        libro.setIsbn(r.isbn());
        libro.setTitolo(r.titolo().trim());
        libro.setAutore(r.autore().trim());
        libro.setEdizione(r.edizione() == null || r.edizione().isBlank() ? null : r.edizione().trim());
        libro.setCasaEditrice(r.casaEditrice().trim());
        libro.setPrezzo(r.prezzo());
        libro.setAnnoDiUscita(Year.of(r.annoDiUscita()));
        libro.setCopieTotali(r.copie());
        libro.setCopieDisponibili(r.copie());
        libro.setCopertinaRigida(r.copertinaRigida());
        libro.setPath(r.path());
        libro.setGenere(trovaGenere(r.genereId()));
        libroRepository.save(libro);

        return new EsitoNuovoLibro(true, new LibroOperazioneResponse("Libro creato", LibroResponse.of(libro)));
    }

    @Transactional
    public LibroOperazioneResponse aggiungiCopie(UUID idLibro, Integer copie) {
        int n = copie == null ? 1 : copie;
        if (libroRepository.aggiungiCopie(idLibro, n) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Libro non trovato");
        }
        Libro aggiornato = libroRepository.findById(idLibro).orElseThrow();
        String messaggio = n == 1 ? "Aggiunta 1 copia" : "Aggiunte " + n + " copie";
        return new LibroOperazioneResponse(messaggio, LibroResponse.of(aggiornato));
    }

    private Genere trovaGenere(UUID genereId) {
        return genereRepository.findById(genereId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Genere inesistente"));
    }

    private static void verificaAnno(int anno) {
        if (anno > Year.now().getValue()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "annoDiUscita non può essere nel futuro");
        }
    }
}
