package com.example.demo.services;

import com.example.demo.entities.Ruolo;
import com.example.demo.entities.RuoloUtente;
import com.example.demo.entities.User;
import com.example.demo.repositories.RuoloRepository;
import com.example.demo.repositories.RuoloUtenteRepository;
import com.example.demo.repositories.TokenJwtRepository;
import com.example.demo.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RuoloService {

    private final RuoloRepository ruoloRepository;
    private final RuoloUtenteRepository ruoloUtenteRepository;
    private final UserRepository userRepository;
    private final TokenJwtRepository tokenJwtRepository;

    @Transactional
    public void crea(String nome) {
        String ruolo = nome.trim();
        if (ruoloRepository.findByRuolo(ruolo).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ruolo già esistente");
        }
        ruoloRepository.save(new Ruolo(ruolo));
    }

    @Transactional
    public void grantAdmin(UUID userId) {
        User user = trovaUtente(userId);
        Ruolo admin = ruoloAdmin();
        if (ruoloUtenteRepository.existsByUserAndRuolo(user, admin)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "L'utente è già Admin");
        }
        ruoloUtenteRepository.save(new RuoloUtente(user, admin));
        revocaTokenAttivi(user);
    }

    @Transactional
    public void revokeAdmin(UUID userId) {
        User user = trovaUtente(userId);
        Ruolo admin = ruoloAdmin();
        RuoloUtente ruoloUtente = ruoloUtenteRepository.findByUserAndRuolo(user, admin)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "L'utente non è Admin"));
        ruoloUtenteRepository.delete(ruoloUtente);
        revocaTokenAttivi(user);
    }

    // I ruoli sono dentro il JWT: i token già emessi vanno invalidati, l'utente rifà login con i ruoli aggiornati
    private void revocaTokenAttivi(User user) {
        tokenJwtRepository.findByUserAndRevocatoFalse(user).forEach(t -> t.setRevocato(true));
    }

    private User trovaUtente(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
    }

    private Ruolo ruoloAdmin() {
        return ruoloRepository.findByRuolo(Ruolo.ADMIN).orElseThrow();
    }
}
