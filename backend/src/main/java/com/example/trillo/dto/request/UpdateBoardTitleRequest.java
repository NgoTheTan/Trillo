package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateBoardTitleRequest(
        @NotBlank(message = "Board title is required")
        String title
) {}
