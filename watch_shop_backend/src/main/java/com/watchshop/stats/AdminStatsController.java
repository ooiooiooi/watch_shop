package com.watchshop.stats;

import com.watchshop.common.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/stats")
public class AdminStatsController {

    public record VisitorLogItem(
        Long id,
        String ipAddress,
        String pagePath,
        String referrer,
        String userAgent,
        LocalDateTime visitedAt
    ) {}

    private final VisitLogRepository visitLogRepository;

    public AdminStatsController(VisitLogRepository visitLogRepository) {
        this.visitLogRepository = visitLogRepository;
    }

    @GetMapping
    public Map<String, Object> getDashboardStats() {
        ZoneId zone = ZoneId.of("Asia/Shanghai");
        LocalDate today = LocalDate.now(zone);
        LocalDateTime startOfDay = LocalDateTime.of(today, LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(today.plusDays(1), LocalTime.MIN);

        long todayVisits = visitLogRepository.countVisitsBetween(startOfDay, endOfDay);
        long todayUniqueVisitors = visitLogRepository.countUniqueVisitorsBetween(startOfDay, endOfDay);
        long totalVisits = visitLogRepository.count();
        long totalUniqueVisitors = visitLogRepository.countTotalUniqueVisitors();
        DateTimeFormatter labelFormatter = DateTimeFormatter.ofPattern("MM-dd");

        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        for (int i = 59; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime dayStart = LocalDateTime.of(date, LocalTime.MIN);
            LocalDateTime dayEnd = LocalDateTime.of(date.plusDays(1), LocalTime.MIN);

            Map<String, Object> point = new HashMap<>();
            point.put("date", date.toString());
            point.put("label", date.format(labelFormatter));
            point.put("visits", visitLogRepository.countVisitsBetween(dayStart, dayEnd));
            point.put("uniqueVisitors", visitLogRepository.countUniqueVisitorsBetween(dayStart, dayEnd));
            dailyTrend.add(point);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayVisits", todayVisits);
        stats.put("todayUniqueVisitors", todayUniqueVisitors);
        stats.put("totalVisits", totalVisits);
        stats.put("totalUniqueVisitors", totalUniqueVisitors);
        stats.put("dailyTrend", dailyTrend);

        return stats;
    }

    @GetMapping("/visitors")
    public PageResponse<VisitorLogItem> getVisitorLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam Optional<String> q
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Specification<VisitLogEntity> spec = Specification.where(null);

        if (q.isPresent() && !q.get().isBlank()) {
            String keyword = "%" + q.get().trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(cb.coalesce(root.get("ipAddress"), "")), keyword),
                cb.like(cb.lower(cb.coalesce(root.get("pagePath"), "")), keyword),
                cb.like(cb.lower(cb.coalesce(root.get("url"), "")), keyword),
                cb.like(cb.lower(cb.coalesce(root.get("userAgent"), "")), keyword)
            ));
        }

        Page<VisitLogEntity> result = visitLogRepository.findAll(
            spec,
            PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "visitedAt").and(Sort.by(Sort.Direction.DESC, "id")))
        );

        List<VisitorLogItem> items = result.getContent().stream()
            .map(log -> new VisitorLogItem(
                log.getId(),
                log.getIpAddress(),
                log.getPagePath(),
                log.getUrl(),
                log.getUserAgent(),
                log.getVisitedAt()
            ))
            .toList();

        return new PageResponse<>(items, result.getTotalElements(), safePage, safeSize);
    }
}
