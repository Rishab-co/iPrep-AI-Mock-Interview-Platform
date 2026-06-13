package com.iprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iprep.dto.EvaluationResult;
import com.iprep.dto.InterviewMessage;
import com.iprep.exception.OpenAIException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * AIService — powered by FREE alternatives:
 *
 *   CHAT / EVAL  →  Groq API  (Llama 3.3 70B — free tier, very fast)
 *                   https://console.groq.com  →  "Create API Key"
 *
 *   TTS          →  NOT handled here. Moved to browser Web Speech API
 *                   (SpeechSynthesis) — completely free, no key needed.
 *
 *   STT          →  Groq Whisper (whisper-large-v3-turbo — free tier)
 *                   Same API key as chat.
 *
 * The Groq API is 100% OpenAI-compatible — same JSON schema, same endpoints.
 * Only the base URL and model names change.
 */
@Slf4j
@Service
public class OpenAIService {

    // ── Groq credentials (set GROQ_API_KEY in your .env) ──────────────────
    @Value("${groq.api-key}")
    private String apiKey;

    @Value("${groq.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${groq.chat-model:llama-3.3-70b-versatile}")
    private String chatModel;

    @Value("${groq.whisper-model:whisper-large-v3-turbo}")
    private String whisperModel;

    @Value("${groq.max-tokens:1024}")
    private int maxTokens;

    @Value("${groq.temperature:0.7}")
    private double temperature;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // =========================================================================
    // 1. CHAT  —  Groq Llama 3.3 70B  (interview Q&A)
    // =========================================================================
    public String chat(List<InterviewMessage> messages, String systemPrompt) {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", chatModel);
            body.put("max_tokens", maxTokens);
            body.put("temperature", temperature);

            ArrayNode msgs = body.putArray("messages");
            msgs.addObject().put("role", "system").put("content", systemPrompt);

            for (InterviewMessage msg : messages) {
                msgs.addObject()
                    .put("role", "USER".equals(msg.getSpeaker()) ? "user" : "assistant")
                    .put("content", msg.getContent());
            }

            Request request = buildJsonRequest(baseUrl + "/chat/completions", body);
            try (Response response = httpClient.newCall(request).execute()) {
                String rb = response.body().string();
                if (!response.isSuccessful()) {
                    log.error("Groq Chat error {}: {}", response.code(), rb);
                    throw new OpenAIException("Groq Chat API error " + response.code() + ": " + rb);
                }
                JsonNode json = objectMapper.readTree(rb);
                return json.at("/choices/0/message/content").asText();
            }
        } catch (IOException e) {
            throw new OpenAIException("Chat IO error: " + e.getMessage());
        }
    }

    // =========================================================================
    // 2. TTS  —  NOT on the backend anymore!
    //
    //    The frontend uses the browser's built-in Web Speech API:
    //      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
    //
    //    This method still exists so InterviewService compiles unchanged,
    //    but it returns an empty byte array — the frontend ignores audioBase64
    //    when it is empty and falls back to Web Speech API instead.
    // =========================================================================
    public byte[] textToSpeech(String text) {
        // TTS is handled by the browser (Web Speech API).
        // Return empty — frontend detects this and uses SpeechSynthesis.
        log.debug("TTS skipped on backend — handled by browser Web Speech API");
        return new byte[0];
    }

    // =========================================================================
    // 3. STT  —  Groq Whisper (whisper-large-v3-turbo, free tier)
    // =========================================================================
    public String transcribeAudio(byte[] audioBytes, String mimeType) {
        try {
            String extension = mimeType.contains("webm") ? "webm"
                    : mimeType.contains("wav")  ? "wav"
                    : mimeType.contains("mp4")  ? "mp4"
                    : mimeType.contains("ogg")  ? "ogg" : "webm";

            RequestBody audioBody = RequestBody.create(audioBytes, MediaType.parse(mimeType));
            MultipartBody multipart = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("model", whisperModel)
                    .addFormDataPart("language", "en")
                    .addFormDataPart("response_format", "json")
                    .addFormDataPart("file", "recording." + extension, audioBody)
                    .build();

            Request request = new Request.Builder()
                    .url(baseUrl + "/audio/transcriptions")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .post(multipart)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String rb = response.body().string();
                if (!response.isSuccessful()) {
                    log.error("Groq Whisper error {}: {}", response.code(), rb);
                    throw new OpenAIException("Whisper error " + response.code() + ": " + rb);
                }
                return objectMapper.readTree(rb).path("text").asText("").trim();
            }
        } catch (IOException e) {
            throw new OpenAIException("Whisper IO error: " + e.getMessage());
        }
    }

    // =========================================================================
    // 4. EVALUATION  —  Groq Llama 3.3 70B  (final report)
    // =========================================================================
    public EvaluationResult evaluateInterview(List<InterviewMessage> transcript,
                                               String targetRole,
                                               String experienceLevel) {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", chatModel);
            body.put("max_tokens", 2048);
            body.put("temperature", 0.2);    // low temp = deterministic JSON

            ArrayNode msgs = body.putArray("messages");
            msgs.addObject()
                .put("role", "system")
                .put("content", "You are a strict technical interview evaluator. "
                    + "Return ONLY valid JSON — no markdown fences, no explanation, no extra text.");
            msgs.addObject()
                .put("role", "user")
                .put("content", buildEvaluationPrompt(transcript, targetRole, experienceLevel));

            Request request = buildJsonRequest(baseUrl + "/chat/completions", body);
            try (Response response = httpClient.newCall(request).execute()) {
                String rb = response.body().string();
                if (!response.isSuccessful()) {
                    throw new OpenAIException("Evaluation API error " + response.code());
                }
                String content = objectMapper.readTree(rb)
                        .at("/choices/0/message/content").asText()
                        .replaceAll("(?s)```json\\s*", "")
                        .replaceAll("(?s)```\\s*", "")
                        .trim();
                return objectMapper.readValue(content, EvaluationResult.class);
            }
        } catch (IOException e) {
            throw new OpenAIException("Evaluation IO error: " + e.getMessage());
        }
    }

    // =========================================================================
    // 5. SYSTEM PROMPT BUILDER
    // =========================================================================
    public String buildSystemPrompt(String targetRole, String experienceLevel,
                                     String difficulty, int questionCount) {
        return """
                You are Alex, a Senior Technical Interviewer at a top tech company.
                Role being interviewed for: %s
                Candidate level: %s | Difficulty: %s | Questions to ask: %d

                RULES:
                1. Ask exactly ONE question at a time — never stack questions.
                2. Ask follow-ups if an answer is incomplete, vague, or wrong.
                3. After thoroughly covering a topic, move to the next question naturally.
                4. After all %d questions, end with: "That wraps up our session — great effort!"
                5. Acknowledge good answers briefly. Give small hints if they are stuck.
                6. Do NOT score or evaluate during the interview.
                7. Match technical depth to the %s level.
                8. Keep responses concise — you are conducting an interview, not lecturing.

                Start with a warm professional greeting and your first question.
                """.formatted(targetRole, experienceLevel, difficulty, questionCount,
                              questionCount, experienceLevel);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================
    private String buildEvaluationPrompt(List<InterviewMessage> transcript,
                                          String targetRole, String experienceLevel) {
        StringBuilder sb = new StringBuilder();
        sb.append("Evaluate this technical interview for a ").append(targetRole)
          .append(" position at ").append(experienceLevel).append(" level.\n\n## Transcript:\n");
        for (InterviewMessage msg : transcript) {
            sb.append("[").append(msg.getSpeaker()).append("]: ")
              .append(msg.getContent()).append("\n\n");
        }
        sb.append("""
                Return ONLY this JSON object (no extra text, no markdown):
                {
                  "technicalScore": <1-10>,
                  "communicationScore": <1-10>,
                  "problemSolvingScore": <1-10>,
                  "depthScore": <1-10>,
                  "overallScore": <1-10>,
                  "verdict": "<READY_FOR_PLACEMENT|BORDERLINE|NEEDS_MORE_PRACTICE>",
                  "verdictTitle": "<short title>",
                  "verdictDescription": "<2-3 sentence summary>",
                  "strengths": ["<str1>", "<str2>", "<str3>"],
                  "areasForImprovement": ["<area1>", "<area2>", "<area3>"],
                  "questionScores": [{"questionNumber": 1, "score": <1-10>, "feedback": "<sentence>"}],
                  "correctnessAnalysis": "<detailed paragraph>",
                  "recommendedTopics": ["<topic1>", "<topic2>", "<topic3>"]
                }
                """);
        return sb.toString();
    }

    private Request buildJsonRequest(String url, ObjectNode body) throws IOException {
        String json = objectMapper.writeValueAsString(body);
        return new Request.Builder()
                .url(url)
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(json, MediaType.parse("application/json")))
                .build();
    }
}
