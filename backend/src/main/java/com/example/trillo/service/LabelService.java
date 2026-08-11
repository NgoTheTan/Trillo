package com.example.trillo.service;

import com.example.trillo.dto.request.CreateLabelRequest;
import com.example.trillo.dto.request.UpdateLabelRequest;
import com.example.trillo.dto.response.LabelResponse;
import com.example.trillo.entity.*;
import com.example.trillo.enums.BoardPermission;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.CardLabelRepository;
import com.example.trillo.repository.LabelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LabelService {

    private final LabelRepository labelRepository;
    private final CardLabelRepository cardLabelRepository;
    private final BoardService boardService;
    private final CardService cardService;
    private final SimpMessagingTemplate messagingTemplate;

    private void broadcastBoardEvent(String boardId) {
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "CARD_UPDATED");
    }

    @Transactional
    public LabelResponse createLabel(String boardId, CreateLabelRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.MANAGE_LABELS);

        Label label = Label.builder()
                .board(board)
                .name(request.name())
                .color(request.color())
                .build();

        Label saved = labelRepository.save(label);
        broadcastBoardEvent(boardId);
        return toResponse(saved);
    }

    @Transactional
    public LabelResponse updateLabel(String labelId, UpdateLabelRequest request, User currentUser) {
        Label label = labelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("Label", labelId));
        boardService.requirePermission(label.getBoard(), currentUser, BoardPermission.MANAGE_LABELS);

        if (request.name() != null && !request.name().isBlank()) {
            label.setName(request.name());
        }
        if (request.color() != null && !request.color().isBlank()) {
            label.setColor(request.color());
        }

        Label saved = labelRepository.save(label);
        broadcastBoardEvent(saved.getBoard().getId());
        return toResponse(saved);
    }

    @Transactional
    public void deleteLabel(String labelId, User currentUser) {
        Label label = labelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("Label", labelId));
        String boardId = label.getBoard().getId();
        boardService.requirePermission(label.getBoard(), currentUser, BoardPermission.MANAGE_LABELS);
        cardLabelRepository.deleteByLabelId(labelId);
        labelRepository.delete(label);
        broadcastBoardEvent(boardId);
    }

    @Transactional(readOnly = true)
    public List<LabelResponse> getLabelsForBoard(String boardId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.checkAccess(board, currentUser);
        return labelRepository.findByBoardId(boardId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void addLabelToCard(String cardId, String labelId, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.MANAGE_LABELS);

        if (cardLabelRepository.existsByCardIdAndLabelId(cardId, labelId)) {
            throw new DuplicateResourceException("Label already added to this card");
        }

        Label label = labelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("Label", labelId));

        CardLabel cardLabel = CardLabel.builder()
                .card(card)
                .label(label)
                .build();
        cardLabelRepository.save(cardLabel);
        broadcastBoardEvent(card.getList().getBoard().getId());
    }

    @Transactional
    public void removeLabelFromCard(String cardId, String labelId, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.MANAGE_LABELS);
        cardLabelRepository.deleteByCardIdAndLabelId(cardId, labelId);
        broadcastBoardEvent(card.getList().getBoard().getId());
    }

    private LabelResponse toResponse(Label l) {
        return new LabelResponse(l.getId(), l.getBoard().getId(), l.getName(), l.getColor(), l.getCreatedAt());
    }
}
