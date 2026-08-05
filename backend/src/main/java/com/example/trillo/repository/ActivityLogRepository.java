package com.example.trillo.repository;

import com.example.trillo.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, String> {

    List<ActivityLog> findByCardIdOrderByCreatedAtDesc(String cardId);
}
