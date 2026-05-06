package com.watchshop.stats;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/public/visits")
public class PublicStatsController {

    public record VisitPayload(
        String pagePath,
        String referrer
    ) {}

    private final VisitLogRepository visitLogRepository;

    public PublicStatsController(VisitLogRepository visitLogRepository) {
        this.visitLogRepository = visitLogRepository;
    }

    @PostMapping
    public ResponseEntity<Void> recordVisit(@RequestBody(required = false) VisitPayload payload, HttpServletRequest request) {
        String ipAddress = getClientIp(request);
        String userAgent = trimValue(request.getHeader("User-Agent"));
        String url = trimValue(payload != null && payload.referrer() != null ? payload.referrer() : request.getHeader("Referer"));
        String pagePath = trimValue(payload != null ? payload.pagePath() : null);

        VisitLogEntity log = new VisitLogEntity(ipAddress, userAgent, url, LocalDateTime.now());
        log.setPagePath(pagePath);
        visitLogRepository.save(log);

        return ResponseEntity.ok().build();
    }

    private String trimValue(String value) {
        if (value == null) return null;
        return value.length() > 255 ? value.substring(0, 255) : value;
    }

    private String getClientIp(HttpServletRequest request) {
        String[] headers = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_VIA",
            "REMOTE_ADDR"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && ip.length() != 0 && !"unknown".equalsIgnoreCase(ip)) {
                // If there are multiple IPs, the first one is the real client IP
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
