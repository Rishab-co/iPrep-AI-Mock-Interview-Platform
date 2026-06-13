package com.iprep.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class InterviewDetailDTO {
    private UUID id;
    private String targetRole;
    private String status;
    private List<InterviewMessage> transcript;
    private EvaluationResult evaluation;
}
