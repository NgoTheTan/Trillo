package com.example.trillo.dto.response;

import java.time.LocalDateTime;

public record UserResponse(
        String id,
        String email,
        String fullName,
        String avatarUrl,
        LocalDateTime createdAt
) {}
