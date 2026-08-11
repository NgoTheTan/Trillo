package com.example.trillo.dto.response;

import com.example.trillo.entity.BoardInvitation;

import java.time.LocalDateTime;

public record BoardInvitationResponse(
        String id,
        String boardId,
        String boardTitle,
        UserResponse inviter,
        UserResponse invitee,
        String status,
        LocalDateTime createdAt
) {
    public static BoardInvitationResponse from(BoardInvitation inv, UserResponse inviterResp, UserResponse inviteeResp) {
        return new BoardInvitationResponse(
                inv.getId(),
                inv.getBoard().getId(),
                inv.getBoard().getTitle(),
                inviterResp,
                inviteeResp,
                inv.getStatus(),
                inv.getCreatedAt()
        );
    }
}
