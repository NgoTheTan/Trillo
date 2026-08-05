package com.example.trillo.service;

import com.example.trillo.dto.request.CreateLabelRequest;
import com.example.trillo.dto.response.LabelResponse;
import com.example.trillo.entity.*;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.CardLabelRepository;
import com.example.trillo.repository.LabelRepository;
import lombok.RequiredArgsConstructor;
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

    @Transactional
    public LabelResponse createLabel(String boardId, CreateLabelRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requireMember(board, currentUser);

        Label label = Label.builder()
                .board(board)
                .name(request.name())
                .color(request.color())
                .build();

        return toResponse(labelRepository.save(label));
    }

    @Transactional
    public void deleteLabel(String labelId, User currentUser) {
        Label label = labelRepository.findById(labelId)
                .orElseThrow(() -> new ResourceNotFoundException("Label", labelId));
        boardService.requireOwner(label.getBoard(), currentUser);
        labelRepository.delete(label);
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
        boardService.requireMember(card.getList().getBoard(), currentUser);

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
    }

    @Transactional
    public void removeLabelFromCard(String cardId, String labelId, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);
        cardLabelRepository.deleteByCardIdAndLabelId(cardId, labelId);
    }

    private LabelResponse toResponse(Label l) {
        return new LabelResponse(l.getId(), l.getBoard().getId(), l.getName(), l.getColor(), l.getCreatedAt());
    }
}
