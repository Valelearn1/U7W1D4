package com.example.demo.services;

import com.example.demo.dto.CostanteResponse;
import com.example.demo.dto.ModificaCostanteRequest;
import com.example.demo.dto.NuovaCostanteRequest;
import com.example.demo.entities.Costante;
import com.example.demo.repositories.CostanteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;

@Slf4j
@Service
@RequiredArgsConstructor
public class CostanteService {

    private static final BigDecimal PENALE_MAX_COLONNA = new BigDecimal("99.99");

    private enum Regola {
        GIORNI("un numero intero di giorni tra 1 e 365", v -> v.matches("\\d{1,3}") && Integer.parseInt(v) >= 1 && Integer.parseInt(v) <= 365),
        IMPORTO("un importo tra 0.00 e 99.99 con al massimo 2 decimali",
                v -> v.matches("\\d{1,2}(\\.\\d{1,2})?") && new BigDecimal(v).compareTo(PENALE_MAX_COLONNA) <= 0);

        private final String descrizione;
        private final Predicate<String> valido;

        Regola(String descrizione, Predicate<String> valido) {
            this.descrizione = descrizione;
            this.valido = valido;
        }
    }

    private record Definizione(String predefinito, Regola regola) {
    }

    // Costanti usate dal codice: unico punto dove sono definiti i valori di default.
    // Se la riga manca a DB (o ha un valore non valido) si usa il default.
    private static final Map<String, Definizione> COSTANTI_SISTEMA = new LinkedHashMap<>();

    static {
        COSTANTI_SISTEMA.put(Costante.PRESTITO_DURATA_BREVE, new Definizione("7", Regola.GIORNI));
        COSTANTI_SISTEMA.put(Costante.PRESTITO_DURATA_MEDIA, new Definizione("15", Regola.GIORNI));
        COSTANTI_SISTEMA.put(Costante.PRESTITO_DURATA_LUNGA, new Definizione("23", Regola.GIORNI));
        // Euro per giorno di ritardo: valore provvisorio
        COSTANTI_SISTEMA.put(Costante.PRESTITO_PENALE_GIORNALIERA, new Definizione("0.50", Regola.IMPORTO));
        // Tetto alla penale di un singolo prestito (la colonna penale_riscossa arriva a 99.99)
        COSTANTI_SISTEMA.put(Costante.PRESTITO_PENALE_MASSIMA, new Definizione("20.00", Regola.IMPORTO));
    }

    private final CostanteRepository costanteRepository;

    // All'avvio: crea le costanti di sistema mancanti, senza toccare quelle già presenti
    @Transactional
    public void creaMancanti() {
        COSTANTI_SISTEMA.forEach((chiave, def) -> {
            if (costanteRepository.findByChiave(chiave).isEmpty()) {
                costanteRepository.save(new Costante(chiave, def.predefinito()));
            }
        });
    }

    @Transactional(readOnly = true)
    public List<CostanteResponse> tutte() {
        return costanteRepository.findAll(Sort.by("chiave")).stream()
                .map(CostanteResponse::of)
                .toList();
    }

    @Transactional
    public CostanteResponse crea(NuovaCostanteRequest r) {
        String chiave = r.chiave().trim();
        verificaChiaveLibera(chiave);
        validaValore(chiave, r.valore());
        return CostanteResponse.of(costanteRepository.save(new Costante(chiave, r.valore())));
    }

    @Transactional
    public CostanteResponse modifica(ModificaCostanteRequest r) {
        if (r.chiave() == null && r.valore() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indicare almeno chiave o valore da modificare");
        }
        Costante costante = trova(r.id());
        if (r.chiave() != null) {
            String chiave = r.chiave().trim();
            if (!chiave.equals(costante.getChiave())) {
                if (COSTANTI_SISTEMA.containsKey(costante.getChiave())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Costante di sistema: la chiave non può essere rinominata");
                }
                verificaChiaveLibera(chiave);
                costante.setChiave(chiave);
            }
        }
        if (r.valore() != null) {
            costante.setValore(r.valore());
        }
        validaValore(costante.getChiave(), costante.getValore());
        return CostanteResponse.of(costante);
    }

    // Eliminare una costante di sistema la riporta al valore di default del codice
    @Transactional
    public void elimina(UUID id) {
        costanteRepository.delete(trova(id));
    }

    @Transactional(readOnly = true)
    public int intero(String chiave) {
        return Integer.parseInt(valore(chiave));
    }

    @Transactional(readOnly = true)
    public BigDecimal importo(String chiave) {
        return new BigDecimal(valore(chiave));
    }

    // Valore a DB se presente e valido, altrimenti default del codice
    private String valore(String chiave) {
        Definizione def = COSTANTI_SISTEMA.get(chiave);
        if (def == null) {
            throw new IllegalStateException("Costante non di sistema: " + chiave);
        }
        Optional<String> salvato = costanteRepository.findByChiave(chiave).map(Costante::getValore);
        if (salvato.isEmpty()) {
            log.info("Costante {} assente: uso il default {}", chiave, def.predefinito());
            return def.predefinito();
        }
        if (!def.regola().valido.test(salvato.get())) {
            log.warn("Costante {} con valore non valido '{}': uso il default {}", chiave, salvato.get(), def.predefinito());
            return def.predefinito();
        }
        return salvato.get();
    }

    private void validaValore(String chiave, String valore) {
        Definizione def = COSTANTI_SISTEMA.get(chiave);
        if (def != null && !def.regola().valido.test(valore)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Valore non valido per " + chiave + ": deve essere " + def.regola().descrizione);
        }
    }

    private Costante trova(UUID id) {
        return costanteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Costante non trovata"));
    }

    private void verificaChiaveLibera(String chiave) {
        if (costanteRepository.findByChiave(chiave).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chiave già esistente");
        }
    }
}
