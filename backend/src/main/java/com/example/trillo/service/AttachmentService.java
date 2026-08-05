package com.example.trillo.service;

import com.example.trillo.dto.request.AddAttachmentRequest;
import com.example.trillo.dto.response.AttachmentResponse;
import com.example.trillo.entity.*;
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

    @Transactional
    public AttachmentResponse addAttachment(String cardId, AddAttachmentRequest request, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);

        Attachment attachment = Attachment.builder()
                .card(card)
                .uploadedBy(currentUser)
                .fileName(request.fileName())
                .fileUrl(request.fileUrl())
                .fileType(request.fileType())
                .fileSize(request.fileSize())
                .build();

        return toResponse(attachmentRepository.save(attachment));
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
