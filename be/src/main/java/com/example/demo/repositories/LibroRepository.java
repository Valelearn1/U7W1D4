package com.example.demo.repositories;

import com.example.demo.entities.Libro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface LibroRepository extends JpaRepository<Libro, UUID>, JpaSpecificationExecutor<Libro> {

    Optional<Libro> findByIsbn(BigDecimal isbn);

    // Genere caricato nella stessa query (JOIN), niente N+1
    @Override
    @EntityGraph(attributePaths = "genere")
    Page<Libro> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "genere")
    Page<Libro> findAll(Specification<Libro> spec, Pageable pageable);

    // UPDATE atomico: richieste concorrenti non si sovrascrivono le copie
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Libro l SET l.copieTotali = l.copieTotali + :copie, "
            + "l.copieDisponibili = l.copieDisponibili + :copie WHERE l.id = :id")
    int aggiungiCopie(@Param("id") UUID id, @Param("copie") int copie);

    // Prestito: toglie una copia solo se disponibile (0 righe aggiornate = nessuna copia)
    @Modifying(flushAutomatically = true)
    @Query("UPDATE Libro l SET l.copieDisponibili = l.copieDisponibili - 1 WHERE l.id = :id AND l.copieDisponibili > 0")
    int prendiCopia(@Param("id") UUID id);

    // Riconsegna: rimette la copia tra le disponibili
    @Modifying(flushAutomatically = true)
    @Query("UPDATE Libro l SET l.copieDisponibili = l.copieDisponibili + 1 WHERE l.id = :id AND l.copieDisponibili < l.copieTotali")
    int restituisciCopia(@Param("id") UUID id);

}
