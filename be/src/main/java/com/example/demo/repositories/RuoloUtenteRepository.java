package com.example.demo.repositories;

import com.example.demo.entities.Ruolo;
import com.example.demo.entities.RuoloUtente;
import com.example.demo.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuoloUtenteRepository extends JpaRepository<RuoloUtente, UUID> {

    List<RuoloUtente> findByUser(User user);

    boolean existsByUserAndRuolo(User user, Ruolo ruolo);

    Optional<RuoloUtente> findByUserAndRuolo(User user, Ruolo ruolo);

}
