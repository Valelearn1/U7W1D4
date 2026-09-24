package com.example.demo.services;

import com.example.demo.dto.LibroSearchParams;
import com.example.demo.entities.Genere;
import com.example.demo.entities.Libro;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

import static com.example.demo.services.SearchUtils.like;
import static com.example.demo.services.SearchUtils.presente;

final class LibroSpecifications {

    private LibroSpecifications() {
    }

    static Specification<Libro> da(LibroSearchParams p) {
        return (root, query, cb) -> {
            Join<Libro, Genere> genere = root.join("genere");
            List<Predicate> filtri = new ArrayList<>();

            if (presente(p.q())) {
                List<Predicate> or = new ArrayList<>(List.of(
                        like(cb, root.get("titolo"), p.q()),
                        like(cb, root.get("autore"), p.q()),
                        like(cb, root.get("casaEditrice"), p.q()),
                        like(cb, genere.get("nome"), p.q())));
                String q = p.q().trim();
                if (q.matches("\\d{1,13}")) {
                    or.add(cb.equal(root.get("isbn"), new BigDecimal(q)));
                }
                filtri.add(cb.or(or.toArray(Predicate[]::new)));
            }
            if (presente(p.titolo())) filtri.add(like(cb, root.get("titolo"), p.titolo()));
            if (presente(p.autore())) filtri.add(like(cb, root.get("autore"), p.autore()));
            if (presente(p.casaEditrice())) filtri.add(like(cb, root.get("casaEditrice"), p.casaEditrice()));
            if (p.genereId() != null) filtri.add(cb.equal(genere.get("id"), p.genereId()));
            if (p.annoDa() != null) filtri.add(cb.greaterThanOrEqualTo(root.get("annoDiUscita"), Year.of(p.annoDa())));
            if (p.annoA() != null) filtri.add(cb.lessThanOrEqualTo(root.get("annoDiUscita"), Year.of(p.annoA())));
            if (p.prezzoMin() != null) filtri.add(cb.greaterThanOrEqualTo(root.get("prezzo"), p.prezzoMin()));
            if (p.prezzoMax() != null) filtri.add(cb.lessThanOrEqualTo(root.get("prezzo"), p.prezzoMax()));
            if (p.copertinaRigida() != null) filtri.add(cb.equal(root.get("copertinaRigida"), p.copertinaRigida()));
            if (Boolean.TRUE.equals(p.disponibile())) filtri.add(cb.greaterThan(root.get("copieDisponibili"), 0));

            return cb.and(filtri.toArray(Predicate[]::new));
        };
    }
}
