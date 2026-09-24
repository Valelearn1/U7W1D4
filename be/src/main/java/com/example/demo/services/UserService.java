package com.example.demo.services;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.UserResponse;
import com.example.demo.entities.Ruolo;
import com.example.demo.entities.RuoloUtente;
import com.example.demo.entities.User;
import com.example.demo.repositories.RuoloRepository;
import com.example.demo.repositories.RuoloUtenteRepository;
import com.example.demo.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RuoloRepository ruoloRepository;
    private final RuoloUtenteRepository ruoloUtenteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        // Stesso errore per email inesistente e password errata: non riveliamo quali email sono registrate
        User user = userRepository.findByEmail(normalizzaEmail(request.username()))
                .filter(u -> passwordEncoder.matches(request.password(), u.getPassword()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenziali non valide"));
        return jwtService.emetti(user, nomiRuoli(user));
    }

    @Transactional
    public void register(RegisterRequest request) {
        String email = normalizzaEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email già registrata");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setDataDiNascita(request.dataDiNascita());
        user.setNome(request.nome());
        user.setCognome(request.cognome());
        user.setIndirizzo(request.indirizzo());
        userRepository.save(user);

        Ruolo ruoloUser = ruoloRepository.findByRuolo(Ruolo.USER).orElseThrow();
        ruoloUtenteRepository.save(new RuoloUtente(user, ruoloUser));
    }

    @Transactional
    public LoginResponse refresh(UUID userId, String tokenAttuale) {
        User user = trovaUtente(userId);
        jwtService.revoca(tokenAttuale);
        return jwtService.emetti(user, nomiRuoli(user));
    }

    public void logout(String token) {
        jwtService.revoca(token);
    }

    @Transactional(readOnly = true)
    public UserResponse me(UUID userId) {
        User user = trovaUtente(userId);
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNome(),
                user.getCognome(),
                user.getDataDiNascita(),
                user.getIndirizzo(),
                nomiRuoli(user),
                user.getCreatedAt());
    }

    private User trovaUtente(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utente non trovato"));
    }

    private List<String> nomiRuoli(User user) {
        return ruoloUtenteRepository.findByUser(user).stream()
                .map(ru -> ru.getRuolo().getRuolo())
                .toList();
    }

    private static String normalizzaEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
