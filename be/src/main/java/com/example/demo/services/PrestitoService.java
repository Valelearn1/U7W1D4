package com.example.demo.services;

import com.example.demo.dto.*;
import com.example.demo.entities.Costante;
import com.example.demo.entities.Prestito;
import com.example.demo.repositories.LibroRepository;
import com.example.demo.repositories.PrestitoRepository;
import com.example.demo.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrestitoService {

    private static final ZoneId ZONA = ZoneId.systemDefault();

    // Colonne ordinabili: nome nel parametro sort -> proprietà JPA
    private static final Map<String, String> SORT_CONSENTITI = Map.of(
            "createdAt", "createdAt",
            "dataRiconsegnaPrevista", "dataRiconsegnaPrevista",
            "dataRiconsegnaEffettiva", "dataRiconsegnaEffettiva",
            "penaleRiscossa", "penaleRiscossa",
            "extended", "extended",
            "titolo", "libro.titolo",
            "email", "user.email",
            "cognome", "user.cognome",
            "nome", "user.nome");
    private static final Sort SORT_PREDEFINITO = Sort.by(Sort.Direction.DESC, "createdAt");

    private final PrestitoRepository prestitoRepository;
    private final LibroRepository libroRepository;
    private final UserRepository userRepository;
    private final CostanteService costanteService;

    @Transactional
    public PrestitoResponse apri(NuovoPrestitoRequest r, UUID adminId) {
        if (!userRepository.existsById(r.userId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato");
        }
        if (!libroRepository.existsById(r.libroId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Libro non trovato");
        }
        // Decremento atomico: con 0 copie disponibili nessuna riga viene aggiornata
        if (libroRepository.prendiCopia(r.libroId()) == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nessuna copia disponibile per questo libro");
        }

        DurataPrestito durata = r.durata() != null ? r.durata() : DurataPrestito.MEDIA;
        int giorni = costanteService.intero(durata.chiaveCostante());

        Prestito prestito = new Prestito();
        prestito.setUser(userRepository.getReferenceById(r.userId()));
        prestito.setLibro(libroRepository.getReferenceById(r.libroId()));
        prestito.setAdminOpen(userRepository.getReferenceById(adminId));
        prestito.setDataRiconsegnaPrevista(LocalDate.now(ZONA).plusDays(giorni));
        prestitoRepository.save(prestito);

        return risposta(prestito);
    }

    @Transactional
    public PrestitoResponse chiudi(ChiudiPrestitoRequest r, UUID adminId) {
        Prestito prestito = trova(r.idPrestito());
        if (prestito.getDataRiconsegnaEffettiva() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prestito già chiuso");
        }
        LocalDate oggi = LocalDate.now(ZONA);
        prestito.setDataRiconsegnaEffettiva(oggi);
        prestito.setPenaleRiscossa(calcolaPenale(prestito.getDataRiconsegnaPrevista(), oggi));
        prestito.setAdminClose(userRepository.getReferenceById(adminId));
        libroRepository.restituisciCopia(prestito.getLibro().getId());

        return risposta(prestito);
    }

    @Transactional
    public PrestitoResponse estendi(EstendiPrestitoRequest r) {
        Prestito prestito = trova(r.idPrestito());
        if (prestito.getDataRiconsegnaEffettiva() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prestito già chiuso");
        }
        if (prestito.isExtended()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prestito già esteso: non è possibile estenderlo ancora");
        }
        prestito.setDataRiconsegnaPrevista(prestito.getDataRiconsegnaPrevista().plusDays(r.giorni()));
        prestito.setExtended(true);

        return risposta(prestito);
    }

    @Transactional(readOnly = true)
    public PageResponse<PrestitoResponse> cerca(PrestitoSearchParams params, UUID userForzato, Pageable pageable) {
        Sort sort = SearchUtils.traduciSort(pageable.getSort(), SORT_CONSENTITI, SORT_PREDEFINITO);
        Pageable richiesta = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        LocalDate oggi = LocalDate.now(ZONA);
        return PageResponse.of(prestitoRepository
                .findAll(PrestitoSpecifications.da(params, userForzato, oggi, ZONA), richiesta)
                .map(p -> PrestitoResponse.of(p, oggi)));
    }

    // Giorni di ritardo x penale giornaliera, con tetto alla penale massima; NULL se riconsegnato in tempo
    private BigDecimal calcolaPenale(LocalDate prevista, LocalDate riconsegna) {
        long giorniRitardo = ChronoUnit.DAYS.between(prevista, riconsegna);
        if (giorniRitardo <= 0) {
            return null;
        }
        BigDecimal penale = costanteService.importo(Costante.PRESTITO_PENALE_GIORNALIERA)
                .multiply(BigDecimal.valueOf(giorniRitardo));
        return penale.min(costanteService.importo(Costante.PRESTITO_PENALE_MASSIMA))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Prestito trova(UUID id) {
        return prestitoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prestito non trovato"));
    }

    private PrestitoResponse risposta(Prestito prestito) {
        return PrestitoResponse.of(prestito, LocalDate.now(ZONA));
    }
}
