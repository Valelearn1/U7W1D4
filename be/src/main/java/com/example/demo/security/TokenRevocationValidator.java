package com.example.demo.security;

import com.example.demo.repositories.TokenJwtRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

// Un JWT è valido solo se è stato emesso da noi (presente in DB) e non è stato revocato con /logout
@RequiredArgsConstructor
public class TokenRevocationValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error REVOKED =
            new OAuth2Error("invalid_token", "Token revocato o sconosciuto", null);

    private final TokenJwtRepository tokenJwtRepository;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        boolean attivo = tokenJwtRepository.findByToken(TokenHasher.sha256(jwt.getTokenValue()))
                .map(t -> !t.isRevocato())
                .orElse(false);
        return attivo ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(REVOKED);
    }
}
