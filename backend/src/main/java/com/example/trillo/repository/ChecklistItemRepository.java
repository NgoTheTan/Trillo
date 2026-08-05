package com.example.trillo.repository;

import com.example.trillo.entity.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, String> {

    List<ChecklistItem> findByChecklistIdOrderByPositionAsc(String checklistId);

    @Query("SELECT COALESCE(MAX(i.position), -1) FROM ChecklistItem i WHERE i.checklist.id = :checklistId")
    int findMaxPositionByChecklistId(@Param("checklistId") String checklistId);
}
