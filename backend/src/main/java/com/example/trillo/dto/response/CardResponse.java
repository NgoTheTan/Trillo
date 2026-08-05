package com.example.trillo.dto.response;

import com.example.trillo.enums.Priority;

import java.time.LocalDateTime;
import java.util.List;

public record CardResponse(
        String id,
        String listId,
        String listTitle,
        String boardId,
        String title,
        String description,
        LocalDateTime deadline,
        Priority priority,
        int position,
        boolean completed,
        List<UserResponse> assignedMembers,
        List<LabelResponse> labels,
        List<ChecklistResponse> checklists,
        List<CommentResponse> comments,
        List<AttachmentResponse> attachments,
        List<ActivityLogResponse> activityLogs,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
