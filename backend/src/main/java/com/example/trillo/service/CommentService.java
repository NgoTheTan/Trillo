package com.example.trillo.service;

import com.example.trillo.dto.request.CreateCommentRequest;
import com.example.trillo.dto.response.CommentResponse;
import com.example.trillo.entity.*;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CardService cardService;
    private final BoardService boardService;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public CommentResponse addComment(String cardId, CreateCommentRequest request, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);

        Comment comment = Comment.builder()
                .card(card)
                .author(currentUser)
                .content(request.content())
                .build();

        Comment saved = commentRepository.save(comment);

        // Notify card assignees (except commenter)
        card.getAssignedMembers().stream()
                .map(CardMember::getUser)
                .filter(u -> !u.getId().equals(currentUser.getId()))
                .forEach(u -> notificationService.createNotification(
                        u, NotificationType.COMMENT_ADDED,
                        currentUser.getFullName() + " commented on '" + card.getTitle() + "'",
                        cardId, "CARD"
                ));

        messagingTemplate.convertAndSend("/topic/board/" + card.getList().getBoard().getId(), "COMMENT_ADDED");

        return toResponse(saved);
    }

    @Transactional
    public CommentResponse updateComment(String commentId, CreateCommentRequest request, User currentUser) {
        Comment comment = findOrThrow(commentId);

        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the author can edit this comment");
        }

        comment.setContent(request.content());
        return toResponse(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(String commentId, User currentUser) {
        Comment comment = findOrThrow(commentId);

        boolean isAuthor = comment.getAuthor().getId().equals(currentUser.getId());
        boolean isOwner = boardService
                .findBoardOrThrow(comment.getCard().getList().getBoard().getId())
                .getOwner().getId().equals(currentUser.getId());

        if (!isAuthor && !isOwner) {
            throw new AccessDeniedException("Not authorized to delete this comment");
        }

        commentRepository.delete(comment);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String cardId, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.checkAccess(card.getList().getBoard(), currentUser);
        return commentRepository.findByCardIdOrderByCreatedAtDesc(cardId)
                .stream().map(this::toResponse).toList();
    }

    private Comment findOrThrow(String id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", id));
    }

    private CommentResponse toResponse(Comment c) {
        return new CommentResponse(c.getId(), authService.toUserResponse(c.getAuthor()),
                c.getContent(), c.getCreatedAt(), c.getUpdatedAt());
    }
}
