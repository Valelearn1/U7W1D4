package com.example.demo.repositories;

import com.example.demo.entities.Prestito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface PrestitoRepository extends JpaRepository<Prestito, UUID>, JpaSpecificationExecutor<Prestito> {

    // Utente, libro e admin caricati con JOIN nella stessa query, niente N+1
    @Override
    @EntityGraph(attributePaths = {"user", "libro", "adminOpen", "adminClose"})
    Page<Prestito> findAll(Specification<Prestito> spec, Pageable pageable);

}
