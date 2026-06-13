package com.iprep.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class InterviewMessage {
    private String speaker;   // "USER" | "AI"
    private String content;
    private int sequenceNumber;
}
