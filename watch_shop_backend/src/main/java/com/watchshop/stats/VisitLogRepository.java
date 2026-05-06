package com.watchshop.stats;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface VisitLogRepository extends JpaRepository<VisitLogEntity, Long>, JpaSpecificationExecutor<VisitLogEntity> {

    @Query("SELECT COUNT(v) FROM VisitLogEntity v WHERE v.visitedAt >= :start AND v.visitedAt < :end")
    long countVisitsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT v.ipAddress) FROM VisitLogEntity v WHERE v.visitedAt >= :start AND v.visitedAt < :end")
    long countUniqueVisitorsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT COUNT(DISTINCT v.ipAddress) FROM VisitLogEntity v")
    long countTotalUniqueVisitors();

    Page<VisitLogEntity> findAllByOrderByVisitedAtDesc(Pageable pageable);
}
