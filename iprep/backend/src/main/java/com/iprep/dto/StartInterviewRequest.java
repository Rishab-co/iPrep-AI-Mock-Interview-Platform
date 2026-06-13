package com.iprep.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class StartInterviewRequest {
    @NotBlank
    private String targetRole;

    @NotBlank
    private String experienceLevel;  // FRESHER | MID | SENIOR

    @NotBlank
    @Pattern(regexp = "EASY|MEDIUM|HARD")
    private String difficulty;

    @Min(3) @Max(10)
    private int questionCount = 5;
}
