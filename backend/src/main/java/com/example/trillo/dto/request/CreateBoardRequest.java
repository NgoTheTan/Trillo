package com.example.trillo.dto.request;

import com.example.trillo.enums.Visibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateBoardRequest(
        @NotBlank(message = "Board title is required")
        String title,

        String description,

        @NotNull(message = "Visibility is required")
        Visibility visibility,

        String coverColor
) {}
