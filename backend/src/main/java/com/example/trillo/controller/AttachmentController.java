package com.example.trillo.controller;

import com.example.trillo.dto.request.AddAttachmentRequest;
import com.example.trillo.dto.response.AttachmentResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.AttachmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @GetMapping("/api/cards/{cardId}/attachments")
    public ResponseEntity<List<AttachmentResponse>> getAttachments(
            @PathVariable String cardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attachmentService.getAttachments(cardId, user));
    }

    @PostMapping("/api/cards/{cardId}/attachments")
    public ResponseEntity<AttachmentResponse> addAttachment(
            @PathVariable String cardId,
            @Valid @RequestBody AddAttachmentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attachmentService.addAttachment(cardId, request, user));
    }

    @DeleteMapping("/api/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable String attachmentId,
            @AuthenticationPrincipal User user) {
        attachmentService.deleteAttachment(attachmentId, user);
        return ResponseEntity.noContent().build();
    }
}
