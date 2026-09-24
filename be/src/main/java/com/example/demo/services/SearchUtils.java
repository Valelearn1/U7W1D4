package com.example.demo.services;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

// Helper comuni per le ricerche con Specification e ordinamento da query string
final class SearchUtils {

    private SearchUtils() {
    }

    static Predicate like(CriteriaBuilder cb, Expression<String> campo, String testo) {
        return cb.like(cb.lower(campo), likePattern(testo), '\\');
    }

    // Contiene, case-insensitive; % e _ inseriti dall'utente vengono trattati come caratteri normali
    static String likePattern(String testo) {
        String escaped = testo.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }

    static boolean presente(String s) {
        return s != null && !s.isBlank();
    }

    // Traduce il sort richiesto (nomi pubblici) in proprietà JPA; colonne non in whitelist -> 400
    static Sort traduciSort(Sort richiesto, Map<String, String> consentiti, Sort predefinito) {
        if (richiesto.isUnsorted()) {
            return predefinito;
        }
        return Sort.by(richiesto.stream()
                .map(o -> {
                    String proprieta = consentiti.get(o.getProperty());
                    if (proprieta == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Ordinamento non consentito: " + o.getProperty() + ". Valori ammessi: " + consentiti.keySet());
                    }
                    return new Sort.Order(o.getDirection(), proprieta);
                })
                .toList());
    }
}
