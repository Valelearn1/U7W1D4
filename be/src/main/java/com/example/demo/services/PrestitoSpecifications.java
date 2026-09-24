package com.example.demo.services;

import com.example.demo.dto.PrestitoSearchParams;
import com.example.demo.entities.Libro;
import com.example.demo.entities.Prestito;
import com.example.demo.entities.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.example.demo.services.SearchUtils.like;
import static com.example.demo.services.SearchUtils.presente;

final class PrestitoSpecifications {

    private PrestitoSpecifications() {
    }

    // userForzato != null: filtra sempre su quell'utente, ignorando p.userId()
    static Specification<Prestito> da(PrestitoSearchParams p, UUID userForzato, LocalDate oggi, ZoneId zona) {
        return (root, query, cb) -> {
            Join<Prestito, User> user = root.join("user");
            Join<Prestito, Libro> libro = root.join("libro");
            List<Predicate> filtri = new ArrayList<>();

            if (presente(p.q())) {
                List<Predicate> or = new ArrayList<>(List.of(
                        like(cb, user.get("email"), p.q()),
                        like(cb, user.get("nome"), p.q()),
                        like(cb, user.get("cognome"), p.q()),
                        like(cb, libro.get("titolo"), p.q())));
                String q = p.q().trim();
                if (q.matches("\\d{1,13}")) {
                    or.add(cb.equal(libro.get("isbn"), new BigDecimal(q)));
                }
                filtri.add(cb.or(or.toArray(Predicate[]::new)));
            }

            UUID userId = userForzato != null ? userForzato : p.userId();
            if (userId != null) filtri.add(cb.equal(user.get("id"), userId));
            if (p.libroId() != null) filtri.add(cb.equal(libro.get("id"), p.libroId()));

            if (p.stato() != null) {
                switch (p.stato()) {
                    case APERTO -> filtri.add(cb.isNull(root.get("dataRiconsegnaEffettiva")));
                    case CHIUSO -> filtri.add(cb.isNotNull(root.get("dataRiconsegnaEffettiva")));
                    case IN_RITARDO -> {
                        filtri.add(cb.isNull(root.get("dataRiconsegnaEffettiva")));
                        filtri.add(cb.lessThan(root.get("dataRiconsegnaPrevista"), oggi));
                    }
                }
            }
            if (p.extended() != null) filtri.add(cb.equal(root.get("extended"), p.extended()));

            // created_at è un Instant: i giorni vanno convertiti nel fuso della biblioteca
            if (p.dataDa() != null) {
                filtri.add(cb.greaterThanOrEqualTo(root.get("createdAt"), p.dataDa().atStartOfDay(zona).toInstant()));
            }
            if (p.dataA() != null) {
                filtri.add(cb.lessThan(root.get("createdAt"), p.dataA().plusDays(1).atStartOfDay(zona).toInstant()));
            }
            if (p.scadenzaDa() != null) filtri.add(cb.greaterThanOrEqualTo(root.get("dataRiconsegnaPrevista"), p.scadenzaDa()));
            if (p.scadenzaA() != null) filtri.add(cb.lessThanOrEqualTo(root.get("dataRiconsegnaPrevista"), p.scadenzaA()));

            return cb.and(filtri.toArray(Predicate[]::new));
        };
    }
}
