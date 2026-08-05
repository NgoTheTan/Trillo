package com.example.trillo.dto.response;

import java.time.LocalDateTime;

public record ActivityLogResponse(
        String id,
        UserResponse user,
        String action,
        String detail,
        LocalDateTime createdAt
) {}
