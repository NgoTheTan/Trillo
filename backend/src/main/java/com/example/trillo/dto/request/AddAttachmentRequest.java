package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AddAttachmentRequest(
        @NotBlank(message = "File name is required")
        String fileName,

        @NotBlank(message = "File URL is required")
        String fileUrl,

        String fileType,

        Long fileSize
) {}
