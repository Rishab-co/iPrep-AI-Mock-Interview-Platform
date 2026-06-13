package com.iprep.repository;
import com.iprep.entity.Interview;
import com.iprep.entity.TranscriptMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface TranscriptMessageRepository extends JpaRepository<TranscriptMessage, UUID> {
    List<TranscriptMessage> findByInterviewOrderBySequenceNumber(Interview interview);
    int countByInterview(Interview interview);
}
