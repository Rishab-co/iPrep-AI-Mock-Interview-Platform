package com.iprep.service;

import com.iprep.dto.*;
import com.iprep.entity.Interview;
import com.iprep.entity.TranscriptMessage;
import com.iprep.entity.User;
import com.iprep.repository.InterviewRepository;
import com.iprep.repository.TranscriptMessageRepository;
import com.iprep.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final OpenAIService openAIService;
    private final InterviewRepository interviewRepository;
    private final TranscriptMessageRepository transcriptRepo;
    private final UserRepository userRepository;

    // ── Start ──────────────────────────────────────────────────────────────
    @Transactional
    public StartInterviewResponse startInterview(StartInterviewRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Interview interview = Interview.builder()
                .user(user)
                .targetRole(request.getTargetRole())
                .experienceLevel(request.getExperienceLevel())
                .difficulty(request.getDifficulty())
                .questionCount(request.getQuestionCount())
                .status("IN_PROGRESS")
                .systemPrompt(openAIService.buildSystemPrompt(
                        request.getTargetRole(), request.getExperienceLevel(),
                        request.getDifficulty(), request.getQuestionCount()))
                .startedAt(Instant.now())
                .build();
        interview = interviewRepository.save(interview);

        // First AI message
        String aiMessage = openAIService.chat(List.of(), interview.getSystemPrompt());
        saveMessage(interview, "AI", aiMessage, 1);

        byte[] audio = openAIService.textToSpeech(aiMessage);

        return StartInterviewResponse.builder()
                .interviewId(interview.getId())
                .aiMessage(aiMessage)
                .audioBase64(Base64.getEncoder().encodeToString(audio))
                .mimeType("audio/mpeg")
                .build();
    }

    // ── Respond ────────────────────────────────────────────────────────────
    @Transactional
    public RespondResponse processUserResponse(UUID interviewId, String userContent, String userEmail) {
        Interview interview = getAuthorizedInterview(interviewId, userEmail);

        if (!"IN_PROGRESS".equals(interview.getStatus())) {
            throw new IllegalStateException("Interview is not in progress");
        }

        int seq = transcriptRepo.countByInterview(interview);
        saveMessage(interview, "USER", userContent, seq + 1);

        List<InterviewMessage> history = buildHistory(interview);
        String aiMessage = openAIService.chat(history, interview.getSystemPrompt());

        boolean isLast = aiMessage.toLowerCase().contains("that wraps up") ||
                         aiMessage.toLowerCase().contains("concludes our") ||
                         aiMessage.toLowerCase().contains("end of our interview") ||
                         aiMessage.toLowerCase().contains("great effort!");

        saveMessage(interview, "AI", aiMessage, seq + 2);

        byte[] audio = openAIService.textToSpeech(aiMessage);
        long userMsgs = history.stream().filter(m -> "USER".equals(m.getSpeaker())).count();

        return RespondResponse.builder()
                .aiMessage(aiMessage)
                .audioBase64(Base64.getEncoder().encodeToString(audio))
                .mimeType("audio/mpeg")
                .isLastQuestion(isLast)
                .questionNumber((int) userMsgs + 1)
                .build();
    }

    // ── Transcribe Audio ───────────────────────────────────────────────────
    public String transcribeAudio(UUID interviewId, String userEmail,
                                   byte[] audioBytes, String mimeType) {
        getAuthorizedInterview(interviewId, userEmail); // access check
        return openAIService.transcribeAudio(audioBytes, mimeType);
    }

    // ── End + Evaluate ─────────────────────────────────────────────────────
    @Transactional
    public EvaluationResult endInterview(UUID interviewId, String userEmail) {
        Interview interview = getAuthorizedInterview(interviewId, userEmail);

        List<InterviewMessage> history = buildHistory(interview);
        EvaluationResult result = openAIService.evaluateInterview(
                history, interview.getTargetRole(), interview.getExperienceLevel());

        interview.setStatus("COMPLETED");
        interview.setCompletedAt(Instant.now());
        interview.setDurationSeconds(
                (int)(Instant.now().getEpochSecond() - interview.getStartedAt().getEpochSecond()));
        interview.setTechnicalScore(result.getTechnicalScore());
        interview.setCommunicationScore(result.getCommunicationScore());
        interview.setProblemSolvingScore(result.getProblemSolvingScore());
        interview.setDepthScore(result.getDepthScore());
        interview.setOverallScore(result.getOverallScore());
        interview.setVerdict(result.getVerdict());
        interviewRepository.save(interview);

        return result;
    }

    // ── List ───────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<InterviewSummaryDTO> getInterviewSummaries(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return interviewRepository.findByUserOrderByStartedAtDesc(user)
                .stream()
                .map(i -> InterviewSummaryDTO.builder()
                        .id(i.getId())
                        .targetRole(i.getTargetRole())
                        .experienceLevel(i.getExperienceLevel())
                        .difficulty(i.getDifficulty())
                        .status(i.getStatus())
                        .overallScore(i.getOverallScore())
                        .verdict(i.getVerdict())
                        .startedAt(i.getStartedAt())
                        .durationSeconds(i.getDurationSeconds())
                        .build())
                .collect(Collectors.toList());
    }

    // ── Detail ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public InterviewDetailDTO getInterviewDetail(UUID interviewId, String userEmail) {
        Interview interview = getAuthorizedInterview(interviewId, userEmail);
        List<InterviewMessage> messages = transcriptRepo
                .findByInterviewOrderBySequenceNumber(interview)
                .stream()
                .map(m -> InterviewMessage.builder()
                        .speaker(m.getSpeaker())
                        .content(m.getContent())
                        .sequenceNumber(m.getSequenceNumber())
                        .build())
                .collect(Collectors.toList());

        // rebuild evaluation if completed
        EvaluationResult eval = null;
        if ("COMPLETED".equals(interview.getStatus()) && interview.getOverallScore() != null) {
            eval = EvaluationResult.builder()
                    .technicalScore(nvl(interview.getTechnicalScore()))
                    .communicationScore(nvl(interview.getCommunicationScore()))
                    .problemSolvingScore(nvl(interview.getProblemSolvingScore()))
                    .depthScore(nvl(interview.getDepthScore()))
                    .overallScore(nvl(interview.getOverallScore()))
                    .verdict(interview.getVerdict())
                    .build();
        }

        return InterviewDetailDTO.builder()
                .id(interview.getId())
                .targetRole(interview.getTargetRole())
                .status(interview.getStatus())
                .transcript(messages)
                .evaluation(eval)
                .build();
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private Interview getAuthorizedInterview(UUID id, String userEmail) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Interview not found"));
        if (!interview.getUser().getEmail().equals(userEmail))
            throw new RuntimeException("Access denied");
        return interview;
    }

    private TranscriptMessage saveMessage(Interview interview, String speaker,
                                           String content, int seq) {
        return transcriptRepo.save(TranscriptMessage.builder()
                .interview(interview)
                .speaker(speaker)
                .content(content)
                .sequenceNumber(seq)
                .build());
    }

    private List<InterviewMessage> buildHistory(Interview interview) {
        return transcriptRepo.findByInterviewOrderBySequenceNumber(interview)
                .stream()
                .map(m -> InterviewMessage.builder()
                        .speaker(m.getSpeaker())
                        .content(m.getContent())
                        .sequenceNumber(m.getSequenceNumber())
                        .build())
                .collect(Collectors.toList());
    }

    private double nvl(Double d) { return d == null ? 0.0 : d; }
}
