package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateBoardRequest;
import com.example.trillo.dto.request.InviteMemberRequest;
import com.example.trillo.dto.request.UpdateBoardRequest;
import com.example.trillo.dto.response.BoardResponse;
import com.example.trillo.dto.response.BoardSummaryResponse;
import com.example.trillo.dto.response.InviteResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public ResponseEntity<List<BoardSummaryResponse>> getMyBoards(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getMyBoards(user));
    }

    @GetMapping("/public")
    public ResponseEntity<List<BoardSummaryResponse>> getPublicBoards(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getPublicBoards(user));
    }

    @PostMapping
    public ResponseEntity<BoardResponse> createBoard(
            @Valid @RequestBody CreateBoardRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(boardService.createBoard(request, user));
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

    @DeleteMapping("/{boardId}")
    public ResponseEntity<Void> deleteBoard(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        boardService.deleteBoard(boardId, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{boardId}/invite")
    public ResponseEntity<InviteResponse> inviteMember(
            @PathVariable String boardId,
            @Valid @RequestBody InviteMemberRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.inviteMember(boardId, request, user));
    }

    @PostMapping("/accept-invite/{token}")
    public ResponseEntity<BoardSummaryResponse> acceptInvite(
            @PathVariable String token,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.acceptInvite(token, user));
    }

    @DeleteMapping("/{boardId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable String boardId,
            @PathVariable String userId,
            @AuthenticationPrincipal User user) {
        boardService.removeMember(boardId, userId, user);
        return ResponseEntity.noContent().build();
    }
}
