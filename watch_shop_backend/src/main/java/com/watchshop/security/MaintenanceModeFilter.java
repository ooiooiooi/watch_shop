package com.watchshop.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.watchshop.common.ApiError;
import com.watchshop.settings.SettingsDtos.MaintenanceConfigDto;
import com.watchshop.settings.SettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Objects;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class MaintenanceModeFilter extends OncePerRequestFilter {
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final String PUBLIC_API_PREFIX = "/api/public/";
  private static final String PUBLIC_MAINTENANCE_PATH = "/api/public/settings/maintenance";
  private static final String PUBLIC_CUSTOMER_SERVICE_PATH = "/api/public/settings/customer-service";

  private final SettingsService settingsService;

  public MaintenanceModeFilter(SettingsService settingsService) {
    this.settingsService = settingsService;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain
  )
      throws ServletException, IOException {
    if (HttpMethod.OPTIONS.matches(Objects.requireNonNull(request.getMethod()))) {
      filterChain.doFilter(request, response);
      return;
    }

    String path = Objects.requireNonNull(request.getRequestURI());
    if (!path.startsWith(PUBLIC_API_PREFIX)
        || PUBLIC_MAINTENANCE_PATH.equals(path)
        || PUBLIC_CUSTOMER_SERVICE_PATH.equals(path)) {
      filterChain.doFilter(request, response);
      return;
    }

    MaintenanceConfigDto config = settingsService.getMaintenanceConfig();
    if (!Boolean.TRUE.equals(config.enabled())) {
      filterChain.doFilter(request, response);
      return;
    }

    ApiError body = new ApiError(
        Instant.now(),
        HttpStatus.SERVICE_UNAVAILABLE.value(),
        HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase(),
        config.message(),
        path
    );
    response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(MAPPER.writeValueAsString(body));
  }
}
