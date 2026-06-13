package com.iprep.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data @Builder
public class InterviewSummaryDTO {
    private UUID id;
    private String targetRole;
    private String experienceLevel;
    private String difficulty;
    private String status;
    private Double overallScore;
    private String verdict;
    private Instant startedAt;
    private Integer durationSeconds;
}
