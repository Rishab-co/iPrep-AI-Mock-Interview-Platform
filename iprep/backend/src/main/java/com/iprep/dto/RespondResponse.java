package com.iprep.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class RespondResponse {
    private String aiMessage;
    private String audioBase64;
    private String mimeType;
    private boolean isLastQuestion;
    private int questionNumber;
}
