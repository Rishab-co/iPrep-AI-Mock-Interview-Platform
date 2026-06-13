package com.iprep.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name = "interviews")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Interview {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false) private String targetRole;
    @Column(nullable = false) private String experienceLevel;
    @Column(nullable = false) private String difficulty;
    @Builder.Default private String status = "IN_PROGRESS";
    private int questionCount;
    @Column(columnDefinition = "TEXT") private String systemPrompt;
    @Column(nullable = false) private Instant startedAt;
    private Instant completedAt;
    private Integer durationSeconds;
    private Double technicalScore;
    private Double communicationScore;
    private Double problemSolvingScore;
    private Double depthScore;
    private Double overallScore;
    private String verdict;
}
