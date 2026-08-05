package com.example.trillo.repository;

import com.example.trillo.entity.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChecklistRepository extends JpaRepository<Checklist, String> {

    List<Checklist> findByCardIdOrderByCreatedAtAsc(String cardId);
}
