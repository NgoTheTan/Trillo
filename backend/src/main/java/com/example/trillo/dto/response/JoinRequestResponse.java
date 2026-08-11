package com.example.trillo.dto.response;

import com.example.trillo.entity.JoinRequest;

import java.time.LocalDateTime;

public record JoinRequestResponse(
        String id,
        String boardId,
        String boardTitle,
        UserResponse requester,
        String status,
        String source,
        LocalDateTime createdAt
) {
    public static JoinRequestResponse from(JoinRequest req, UserResponse requesterResp) {
        return new JoinRequestResponse(
                req.getId(),
                req.getBoard().getId(),
                req.getBoard().getTitle(),
                requesterResp,
                req.getStatus(),
                req.getSource(),
                req.getCreatedAt()
        );
    }
}
