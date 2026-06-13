package com.iprep.controller;

import com.iprep.dto.*;
import com.iprep.entity.User;
import com.iprep.service.InterviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller — Interview Lifecycle
 *
 *  POST  /api/v1/interviews                       → Start interview
 *  POST  /api/v1/interviews/{id}/respond          → Submit text response
 *  POST  /api/v1/interviews/{id}/transcribe       → Upload audio → Whisper STT
 *  POST  /api/v1/interviews/{id}/end              → End + evaluate
 *  GET   /api/v1/interviews                       → List user interviews
 *  GET   /api/v1/interviews/{id}                  → Interview detail + transcript
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    // ── Start ──────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<StartInterviewResponse> startInterview(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody StartInterviewRequest request) {

        log.info("User {} starting interview for: {}", user.getEmail(), request.getTargetRole());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(interviewService.startInterview(request, user.getEmail()));
    }

    // ── Respond (text) ─────────────────────────────────────────────────────
    @PostMapping("/{interviewId}/respond")
    public ResponseEntity<RespondResponse> respond(
            @AuthenticationPrincipal User user,
            @PathVariable UUID interviewId,
            @Valid @RequestBody RespondRequest request) {

        return ResponseEntity.ok(
            interviewService.processUserResponse(interviewId, request.getContent(), user.getEmail()));
    }

    // ── Transcribe audio (Whisper) ─────────────────────────────────────────
    @PostMapping("/{interviewId}/transcribe")
    public ResponseEntity<TranscribeResponse> transcribe(
            @AuthenticationPrincipal User user,
            @PathVariable UUID interviewId,
            @RequestParam("audio") MultipartFile audioFile) {

        log.info("Transcribing audio for interview {} — {} bytes",
                 interviewId, audioFile.getSize());
        try {
            byte[] bytes = audioFile.getBytes();
            String mimeType = audioFile.getContentType() != null
                ? audioFile.getContentType() : "audio/webm";
            String text = interviewService.transcribeAudio(interviewId, user.getEmail(), bytes, mimeType);
            return ResponseEntity.ok(new TranscribeResponse(text));
        } catch (Exception e) {
            log.error("Transcription failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ── End + Evaluate ─────────────────────────────────────────────────────
    @PostMapping("/{interviewId}/end")
    public ResponseEntity<EvaluationResult> endInterview(
            @AuthenticationPrincipal User user,
            @PathVariable UUID interviewId) {

        return ResponseEntity.ok(interviewService.endInterview(interviewId, user.getEmail()));
    }

    // ── List ───────────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<InterviewSummaryDTO>> listInterviews(
            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(interviewService.getInterviewSummaries(user.getEmail()));
    }

    // ── Detail ─────────────────────────────────────────────────────────────
    @GetMapping("/{interviewId}")
    public ResponseEntity<InterviewDetailDTO> getInterview(
            @AuthenticationPrincipal User user,
            @PathVariable UUID interviewId) {

        return ResponseEntity.ok(interviewService.getInterviewDetail(interviewId, user.getEmail()));
    }
}
