package com.example.trillo.dto.response;

import java.time.LocalDateTime;

public record AttachmentResponse(
        String id,
        UserResponse uploadedBy,
        String fileName,
        String fileUrl,
        String fileType,
        Long fileSize,
        LocalDateTime createdAt
) {}
