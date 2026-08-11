package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateBoardRequest;
import com.example.trillo.dto.request.InviteMemberRequest;
import com.example.trillo.dto.request.UpdateBoardRequest;
import com.example.trillo.dto.request.UpdateMemberPermissionsRequest;
import com.example.trillo.dto.response.BoardInvitationResponse;
import com.example.trillo.dto.response.BoardResponse;
import com.example.trillo.dto.response.BoardSummaryResponse;
import com.example.trillo.dto.response.InviteResponse;
import com.example.trillo.dto.response.JoinRequestResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public ResponseEntity<List<BoardSummaryResponse>> getMyBoards(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getMyBoards(user, search));
    }

    @GetMapping("/public")
    public ResponseEntity<List<BoardSummaryResponse>> getPublicBoards(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getPublicBoards(user, search));
    }

    @PostMapping
    public ResponseEntity<BoardResponse> createBoard(
            @Valid @RequestBody CreateBoardRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(boardService.createBoard(request, user));
    }

    @GetMapping("/starred")
    public ResponseEntity<List<BoardSummaryResponse>> getStarredBoards(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getStarredBoards(user));
    }

    @GetMapping("/{boardId}")
    public ResponseEntity<BoardResponse> getBoard(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getBoard(boardId, user));
    }

    @PutMapping("/{boardId}")
    public ResponseEntity<BoardResponse> updateBoard(
            @PathVariable String boardId,
            @RequestBody UpdateBoardRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.updateBoard(boardId, request, user));
    }

    @PatchMapping("/{boardId}/title")
    public ResponseEntity<BoardResponse> updateBoardTitle(
            @PathVariable String boardId,
            @Valid @RequestBody com.example.trillo.dto.request.UpdateBoardTitleRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.updateBoardTitle(boardId, request, user));
    }

    /**
     * Toggle the starred state of a board for the authenticated user.
     */
    @RequestMapping(value = "/{boardId}/star", method = {RequestMethod.PATCH, RequestMethod.POST})
    public ResponseEntity<Map<String, Boolean>> toggleStar(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        boolean starred = boardService.toggleStar(boardId, user);
        return ResponseEntity.ok(Map.of("starred", starred));
    }

    @DeleteMapping("/{boardId}")
    public ResponseEntity<Void> deleteBoard(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        boardService.deleteBoard(boardId, user);
        return ResponseEntity.noContent().build();
    }

    // ── Invite Member (sends invitation notification) ─────────────────────────
    @PostMapping("/{boardId}/invite")
    public ResponseEntity<InviteResponse> inviteMember(
            @PathVariable String boardId,
            @Valid @RequestBody InviteMemberRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.inviteMember(boardId, request, user));
    }

    // ── Accept invite via link → creates JoinRequest ──────────────────────────
    @PostMapping("/accept-invite/{token}")
    public ResponseEntity<JoinRequestResponse> acceptInvite(
            @PathVariable String token,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.acceptInvite(token, user));
    }

    // ── Respond to a board invitation (accept/decline) ─────────────────────────
    @PostMapping("/invitations/{invitationId}/respond")
    public ResponseEntity<Void> respondToInvitation(
            @PathVariable String invitationId,
            @RequestParam boolean accept,
            @AuthenticationPrincipal User user) {
        boardService.respondToInvitation(invitationId, accept, user);
        return ResponseEntity.noContent().build();
    }

    // ── Get pending invitations for current user ───────────────────────────────
    @GetMapping("/invitations/pending")
    public ResponseEntity<List<BoardInvitationResponse>> getPendingInvitations(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getPendingInvitations(user));
    }

    // ── Join requests (for public boards or link-accept) ──────────────────────
    @GetMapping("/{boardId}/join-requests")
    public ResponseEntity<List<JoinRequestResponse>> getJoinRequests(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getJoinRequests(boardId, user));
    }

    @PostMapping("/{boardId}/join-requests")
    public ResponseEntity<JoinRequestResponse> createJoinRequest(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(boardService.createJoinRequest(boardId, user));
    }

    @PostMapping("/{boardId}/join-requests/{requestId}/approve")
    public ResponseEntity<Void> approveJoinRequest(
            @PathVariable String boardId,
            @PathVariable String requestId,
            @AuthenticationPrincipal User user) {
        boardService.approveJoinRequest(requestId, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{boardId}/join-requests/{requestId}/reject")
    public ResponseEntity<Void> rejectJoinRequest(
            @PathVariable String boardId,
            @PathVariable String requestId,
            @AuthenticationPrincipal User user) {
        boardService.rejectJoinRequest(requestId, user);
        return ResponseEntity.noContent().build();
    }

    // ── Remove Member ─────────────────────────────────────────────────────────
    @DeleteMapping("/{boardId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable String boardId,
            @PathVariable String userId,
            @AuthenticationPrincipal User user) {
        boardService.removeMember(boardId, userId, user);
        return ResponseEntity.noContent().build();
    }

    /**
     * Owner grants or revokes specific permissions for a board member.
     */
    @PutMapping("/{boardId}/members/{memberId}/permissions")
    public ResponseEntity<BoardResponse.MemberResponse> updateMemberPermissions(
            @PathVariable String boardId,
            @PathVariable String memberId,
            @RequestBody UpdateMemberPermissionsRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                boardService.updateMemberPermissions(boardId, memberId, request, user)
        );
    }
}
