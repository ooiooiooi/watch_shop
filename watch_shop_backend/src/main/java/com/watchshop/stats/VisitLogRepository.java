package com.watchshop.stats;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface VisitLogRepository extends JpaRepository<VisitLogEntity, Long>, JpaSpecificationExecutor<VisitLogEntity> {

    @Query("""
        SELECT COUNT(v)
        FROM VisitLogEntity v
        WHERE v.visitedAt >= :start
          AND v.visitedAt < :end
          AND (v.eventType IS NULL OR v.eventType = :eventType)
        """)
    long countEventsBetween(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("eventType") String eventType
    );

    @Query("""
        SELECT COUNT(DISTINCT v.ipAddress)
        FROM VisitLogEntity v
        WHERE v.visitedAt >= :start
          AND v.visitedAt < :end
          AND (v.eventType IS NULL OR v.eventType = :eventType)
        """)
    long countUniqueIpsBetween(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("eventType") String eventType
    );

    @Query("""
        SELECT COUNT(DISTINCT v.ipAddress)
        FROM VisitLogEntity v
        WHERE (v.eventType IS NULL OR v.eventType = :eventType)
        """)
    long countTotalUniqueIps(@Param("eventType") String eventType);

    default long countVisitEventsBetween(LocalDateTime start, LocalDateTime end) {
        return countEventsBetween(start, end, VisitLogEntity.EVENT_VISIT);
    }

    default long countUniqueVisitIpsBetween(LocalDateTime start, LocalDateTime end) {
        return countUniqueIpsBetween(start, end, VisitLogEntity.EVENT_VISIT);
    }

    default long countTotalUniqueVisitIps() {
        return countTotalUniqueIps(VisitLogEntity.EVENT_VISIT);
    }

    default long countInquiryEventsBetween(LocalDateTime start, LocalDateTime end) {
        return countEventsBetween(start, end, VisitLogEntity.EVENT_INQUIRY);
    }

    default long countUniqueInquiryIpsBetween(LocalDateTime start, LocalDateTime end) {
        return countUniqueIpsBetween(start, end, VisitLogEntity.EVENT_INQUIRY);
    }

    default long countTotalUniqueInquiryIps() {
        return countTotalUniqueIps(VisitLogEntity.EVENT_INQUIRY);
    }

    Page<VisitLogEntity> findAllByOrderByVisitedAtDesc(Pageable pageable);
}
