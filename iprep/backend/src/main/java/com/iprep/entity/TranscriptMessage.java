package com.iprep.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name = "transcript_messages")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TranscriptMessage {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "interview_id", nullable = false) private Interview interview;
    @Column(nullable = false) private int sequenceNumber;
    @Column(nullable = false) private String speaker;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    private Instant createdAt;
    @PrePersist public void prePersist() { if (createdAt == null) createdAt = Instant.now(); }
}
