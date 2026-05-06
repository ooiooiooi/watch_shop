package com.watchshop.security;

import com.watchshop.common.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {
  private static final String PATH = "/api/admin/auth/login";
  private static final int MAX_REQUESTS = 10;
  private static final long WINDOW_MS = 60_000;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final Map<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    if (!HttpMethod.POST.matches(request.getMethod()) || !PATH.equals(request.getRequestURI())) {
      filterChain.doFilter(request, response);
      return;
    }

    String ip = clientIp(request);
    long now = System.currentTimeMillis();
    Deque<Long> q = buckets.computeIfAbsent(ip, k -> new ArrayDeque<>());
    synchronized (q) {
      while (!q.isEmpty() && now - q.peekFirst() > WINDOW_MS) q.pollFirst();
      if (q.size() >= MAX_REQUESTS) {
        writeError(response, HttpStatus.TOO_MANY_REQUESTS, "登录请求过于频繁，请稍后再试", request.getRequestURI());
        return;
      }
      q.addLast(now);
    }

    filterChain.doFilter(request, response);
  }

  private static String clientIp(HttpServletRequest request) {
    String xff = request.getHeader("X-Forwarded-For");
    if (xff != null && !xff.isBlank()) {
      String first = xff.split(",")[0].trim();
      if (!first.isBlank()) return first;
    }
    String xr = request.getHeader("X-Real-IP");
    if (xr != null && !xr.isBlank()) return xr.trim();
    return request.getRemoteAddr();
  }

  private static void writeError(HttpServletResponse response, HttpStatus status, String message, String path) throws IOException {
    ApiError body = new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path);
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(MAPPER.writeValueAsString(body));
  }
}
