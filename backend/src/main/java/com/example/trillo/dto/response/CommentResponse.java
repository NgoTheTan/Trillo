package com.example.trillo.dto.response;

import java.time.LocalDateTime;

public record CommentResponse(
        String id,
        UserResponse author,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
