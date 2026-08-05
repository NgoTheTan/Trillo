package com.example.trillo.dto.response;

import com.example.trillo.enums.BoardRole;
import com.example.trillo.enums.Visibility;

import java.time.LocalDateTime;
import java.util.List;

public record BoardResponse(
        String id,
        String title,
        String description,
        Visibility visibility,
        String coverColor,
        UserResponse owner,
        BoardRole currentUserRole,
        List<MemberResponse> members,
        List<ListResponse> lists,
        List<LabelResponse> labels,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record MemberResponse(
            String id,
            UserResponse user,
            BoardRole role,
            LocalDateTime joinedAt
    ) {}
}
