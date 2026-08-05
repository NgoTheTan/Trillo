package com.example.trillo.dto.request;

import com.example.trillo.enums.Visibility;

public record UpdateBoardRequest(
        String title,
        String description,
        Visibility visibility,
        String coverColor
) {}
