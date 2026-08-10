package com.example.trillo.service;

import com.example.trillo.dto.request.AddAttachmentRequest;
import com.example.trillo.dto.response.AttachmentResponse;
import com.example.trillo.entity.*;
import com.example.trillo.enums.BoardPermission;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.AttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final CardService cardService;
    private final BoardService boardService;
    private final AuthService authService;
    private final ActivityLogService activityLogService;

    @Transactional
    public AttachmentResponse addAttachment(String cardId, AddAttachmentRequest request, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.UPLOAD_ATTACHMENT);

        Attachment attachment = Attachment.builder()
                .card(card)
                .uploadedBy(currentUser)
                .fileName(request.fileName() != null && !request.fileName().isBlank() ? request.fileName() : request.fileUrl())
                .fileUrl(request.fileUrl())
                .fileType(request.fileType() != null ? request.fileType() : "link")
                .fileSize(request.fileSize())
                .build();

        Attachment saved = attachmentRepository.save(attachment);
        activityLogService.logActivity(card, currentUser, "attached_link",
                currentUser.getFullName() + " attached link '" + saved.getFileName() + "'");

        return toResponse(saved);
    }

    @Transactional
    public AttachmentResponse uploadFileAttachment(String cardId, org.springframework.web.multipart.MultipartFile file, User currentUser) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        Card card = cardService.findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.UPLOAD_ATTACHMENT);

        try {
            java.nio.file.Path uploadPath = java.nio.file.Paths.get(System.getProperty("user.dir"), "uploads", "attachments");
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment.bin";
            String cleanFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            String fileName = java.util.UUID.randomUUID() + "-" + cleanFilename;

            java.nio.file.Path filePath = uploadPath.resolve(fileName);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/attachments/" + fileName;

            Attachment attachment = Attachment.builder()
                    .card(card)
                    .uploadedBy(currentUser)
                    .fileName(originalFilename)
                    .fileUrl(fileUrl)
                    .fileType(file.getContentType() != null ? file.getContentType() : "file")
                    .fileSize(file.getSize())
                    .build();

            Attachment saved = attachmentRepository.save(attachment);
            activityLogService.logActivity(card, currentUser, "attached_file",
                    currentUser.getFullName() + " attached file '" + originalFilename + "'");

            return toResponse(saved);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload attachment file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteAttachment(String attachmentId, User currentUser) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));

        boolean isUploader = attachment.getUploadedBy().getId().equals(currentUser.getId());
        boolean isOwner = attachment.getCard().getList().getBoard().getOwner().getId().equals(currentUser.getId());

        if (!isUploader && !isOwner) {
            throw new AccessDeniedException("Not authorized to delete this attachment");
        }

        activityLogService.logActivity(attachment.getCard(), currentUser, "deleted_attachment",
                currentUser.getFullName() + " removed attachment '" + attachment.getFileName() + "'");

        attachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> getAttachments(String cardId, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.checkAccess(card.getList().getBoard(), currentUser);
        return attachmentRepository.findByCardIdOrderByCreatedAtDesc(cardId)
                .stream().map(this::toResponse).toList();
    }

    private AttachmentResponse toResponse(Attachment a) {
        return new AttachmentResponse(a.getId(), authService.toUserResponse(a.getUploadedBy()),
                a.getFileName(), a.getFileUrl(), a.getFileType(), a.getFileSize(), a.getCreatedAt());
    }
}
