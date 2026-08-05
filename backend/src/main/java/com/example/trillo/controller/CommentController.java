package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateCommentRequest;
import com.example.trillo.dto.response.CommentResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/api/cards/{cardId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable String cardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(commentService.getComments(cardId, user));
    }

    @PostMapping("/api/cards/{cardId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable String cardId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment(cardId, request, user));
    }

    @PutMapping("/api/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable String commentId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(commentService.updateComment(commentId, request, user));
    }

    @DeleteMapping("/api/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable String commentId,
            @AuthenticationPrincipal User user) {
        commentService.deleteComment(commentId, user);
        return ResponseEntity.noContent().build();
    }
}
