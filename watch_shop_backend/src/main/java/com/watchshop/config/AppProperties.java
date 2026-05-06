package com.watchshop.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    Cors cors,
    Jwt jwt,
    Seed seed
) {
  public record Cors(List<String> allowedOrigins) {}

  public record Jwt(String secret, String issuer, long ttlSeconds) {}

  public record Seed(boolean enabled) {}
}

