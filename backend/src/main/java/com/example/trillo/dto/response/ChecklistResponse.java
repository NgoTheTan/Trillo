package com.example.trillo.dto.response;

import com.example.trillo.entity.Checklist;
import java.time.LocalDateTime;
import java.util.List;

public record ChecklistResponse(
        String id,
        String title,
        List<ChecklistItemResponse> items,
        int totalItems,
        int completedItems,
        LocalDateTime createdAt
) {
    public static ChecklistResponse from(Checklist c) {
        if (c == null) return null;
        List<ChecklistItemResponse> items = c.getItems() != null ? c.getItems().stream()
                .map(i -> new ChecklistItemResponse(i.getId(), i.getContent(), i.isCompleted(), i.getPosition(), i.getCreatedAt()))
                .toList() : List.of();
        long completed = items.stream().filter(ChecklistItemResponse::completed).count();
        return new ChecklistResponse(c.getId(), c.getTitle(), items, items.size(), (int) completed, c.getCreatedAt());
    }
}
