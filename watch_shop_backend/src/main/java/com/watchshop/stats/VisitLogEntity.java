package com.watchshop.stats;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "visit_logs", indexes = {
    @Index(name = "idx_visit_visited_at", columnList = "visitedAt"),
    @Index(name = "idx_visit_ip", columnList = "ipAddress"),
    @Index(name = "idx_visit_event_type", columnList = "eventType")
})
public class VisitLogEntity {
    public static final String EVENT_VISIT = "VISIT";
    public static final String EVENT_INQUIRY = "INQUIRY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ipAddress;
    private String userAgent;
    private String url;
    private String pagePath;
    private String eventType;
    private String eventSource;
    private String productId;
    
    @Column(nullable = false)
    private LocalDateTime visitedAt;

    public VisitLogEntity() {}

    public VisitLogEntity(String ipAddress, String userAgent, String url, LocalDateTime visitedAt) {
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.url = url;
        this.visitedAt = visitedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getPagePath() { return pagePath; }
    public void setPagePath(String pagePath) { this.pagePath = pagePath; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getEventSource() { return eventSource; }
    public void setEventSource(String eventSource) { this.eventSource = eventSource; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public LocalDateTime getVisitedAt() { return visitedAt; }
    public void setVisitedAt(LocalDateTime visitedAt) { this.visitedAt = visitedAt; }
}
