package com.example.trillo.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record CardSummaryResponse(
        String id,
        String listId,
        String title,
        String description,
        LocalDateTime deadline,
        int position,
        boolean completed,
        boolean archived,
        List<UserResponse> assignedMembers,
        List<LabelResponse> labels,
        int checklistTotal,
        int checklistCompleted,
        int commentCount,
        int attachmentCount,
        List<ChecklistResponse> checklists,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
