package com.example.trillo.dto.response;

import com.example.trillo.enums.Priority;

import java.time.LocalDateTime;
import java.util.List;

public record CardSummaryResponse(
        String id,
        String listId,
        String title,
        LocalDateTime deadline,
        Priority priority,
        int position,
        boolean completed,
        List<UserResponse> assignedMembers,
        List<LabelResponse> labels,
        int checklistTotal,
        int checklistCompleted,
        int commentCount,
        LocalDateTime createdAt
) {}
