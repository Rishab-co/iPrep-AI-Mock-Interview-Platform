package com.iprep.repository;
import com.iprep.entity.Interview;
import com.iprep.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface InterviewRepository extends JpaRepository<Interview, UUID> {
    List<Interview> findByUserOrderByStartedAtDesc(User user);
}
