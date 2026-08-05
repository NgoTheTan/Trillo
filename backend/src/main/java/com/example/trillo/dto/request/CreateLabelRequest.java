package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateLabelRequest(
        @NotBlank(message = "Label name is required")
        String name,

        @NotBlank(message = "Label color is required")
        @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Color must be a valid HEX color (e.g. #FF5733)")
        String color
) {}
