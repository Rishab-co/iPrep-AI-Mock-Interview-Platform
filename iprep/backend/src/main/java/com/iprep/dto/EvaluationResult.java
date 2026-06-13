package com.iprep.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class EvaluationResult {
    private double technicalScore;
    private double communicationScore;
    private double problemSolvingScore;
    private double depthScore;
    private double overallScore;
    private String verdict;             // READY_FOR_PLACEMENT | BORDERLINE | NEEDS_MORE_PRACTICE
    private String verdictTitle;
    private String verdictDescription;
    private List<String> strengths;
    private List<String> areasForImprovement;
    private List<QuestionScore> questionScores;
    private String correctnessAnalysis;
    private List<String> recommendedTopics;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QuestionScore {
        private int questionNumber;
        private int score;
        private String feedback;
    }
}
