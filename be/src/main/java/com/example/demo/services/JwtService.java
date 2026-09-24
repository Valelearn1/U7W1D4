package com.example.demo.services;

import com.example.demo.dto.LoginResponse;
import com.example.demo.entities.TokenJwt;
import com.example.demo.entities.User;
import com.example.demo.repositories.TokenJwtRepository;
import com.example.demo.security.SecurityConfig;
import com.example.demo.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final TokenJwtRepository tokenJwtRepository;

    @Value("${app.jwt.expiration-minutes}")
    private long expirationMinutes;

    @Transactional
    public LoginResponse emetti(User user, List<String> ruoli) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expirationMinutes, ChronoUnit.MINUTES);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("email", user.getEmail())
                .claim(SecurityConfig.ROLES_CLAIM, ruoli)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

        TokenJwt tokenJwt = new TokenJwt();
        tokenJwt.setUser(user);
        tokenJwt.setToken(TokenHasher.sha256(token));
        tokenJwt.setExpiresAt(expiresAt);
        tokenJwtRepository.save(tokenJwt);

        return new LoginResponse(token, "Bearer", expiresAt);
    }

    @Transactional
    public void revoca(String token) {
        tokenJwtRepository.findByToken(TokenHasher.sha256(token))
                .ifPresent(t -> t.setRevocato(true));
    }
}
