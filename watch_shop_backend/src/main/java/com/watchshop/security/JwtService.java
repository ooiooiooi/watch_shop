package com.watchshop.security;

import com.watchshop.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

@Component
public class JwtService implements InitializingBean {
  private final SecretKey key;
  private final String issuer;
  private final long ttlSeconds;
  private final String secret;
  private final boolean prod;

  public JwtService(AppProperties props, Environment environment) {
    this.secret = props.jwt().secret();
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.issuer = props.jwt().issuer();
    this.ttlSeconds = props.jwt().ttlSeconds();
    this.prod = environment.acceptsProfiles(Profiles.of("prod")) || "prod".equalsIgnoreCase(environment.getProperty("app.env"));
  }

  @Override
  public void afterPropertiesSet() {
    if (prod && (secret == null || secret.contains("change-me-in-env"))) {
      throw new IllegalStateException("APP_JWT_SECRET 未配置或仍为默认值（生产环境禁止）");
    }
  }

  public String issueAdminToken(String username) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(ttlSeconds);
    return Jwts.builder()
        .issuer(issuer)
        .subject(username)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .claim("role", "ADMIN")
        .signWith(key)
        .compact();
  }

  public Jws<Claims> parse(String token) {
    return Jwts.parser()
        .verifyWith(key)
        .requireIssuer(issuer)
        .build()
        .parseSignedClaims(token);
  }
}
