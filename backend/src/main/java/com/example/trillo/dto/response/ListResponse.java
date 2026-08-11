package com.example.trillo.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ListResponse(
        String id,
        String boardId,
        String title,
        int position,
        boolean archived,
        List<String> cards,
        LocalDateTime createdAt
) {}

