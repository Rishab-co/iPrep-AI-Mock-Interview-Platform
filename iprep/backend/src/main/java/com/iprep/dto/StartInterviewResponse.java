package com.iprep.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data @Builder
public class StartInterviewResponse {
    private UUID interviewId;
    private String aiMessage;
    private String audioBase64;   // Base64-encoded MP3 — frontend plays this directly
    private String mimeType;      // "audio/mpeg"
}
