package com.example.trillo.service;

import com.example.trillo.dto.request.CreateCardRequest;
import com.example.trillo.dto.request.MoveCardRequest;
import com.example.trillo.dto.request.ReorderRequest;
import com.example.trillo.dto.request.UpdateCardRequest;
import com.example.trillo.dto.response.*;
import com.example.trillo.entity.*;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final CardMemberRepository cardMemberRepository;
    private final CardLabelRepository cardLabelRepository;
    private final BoardListRepository boardListRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;
    private final BoardService boardService;
    private final AuthService authService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public CardSummaryResponse createCard(String listId, CreateCardRequest request, User currentUser) {
        BoardList list = findListOrThrow(listId);
        boardService.requireMember(list.getBoard(), currentUser);

        int maxPos = cardRepository.findMaxPositionByListId(listId);
        Card card = Card.builder()
                .list(list)
                .title(request.title())
                .description(request.description())
                .deadline(request.deadline())
                .priority(request.priority() != null ? request.priority() : com.example.trillo.enums.Priority.MEDIUM)
                .position(maxPos + 1)
                .build();

        Card saved = cardRepository.save(card);
        logActivity(saved, currentUser, "created", "Card '" + saved.getTitle() + "' was created");
        broadcastBoardEvent(list.getBoard().getId(), "CARD_CREATED");

        return toCardSummaryResponse(saved);
    }

    @Transactional
    public CardResponse updateCard(String cardId, UpdateCardRequest request, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);

        StringBuilder changes = new StringBuilder("Card updated: ");
        if (request.title() != null) { changes.append("title, "); card.setTitle(request.title()); }
        if (request.description() != null) { changes.append("description, "); card.setDescription(request.description()); }
        if (request.deadline() != null) { changes.append("deadline, "); card.setDeadline(request.deadline()); }
        if (request.priority() != null) { changes.append("priority, "); card.setPriority(request.priority()); }
        if (request.completed() != null) { card.setCompleted(request.completed()); changes.append(request.completed() ? "marked complete" : "marked incomplete"); }

        Card saved = cardRepository.save(card);
        logActivity(saved, currentUser, "updated", changes.toString().replaceAll(", $", ""));
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_UPDATED");

        return toCardResponse(saved);
    }

    @Transactional
    public void deleteCard(String cardId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);

        String boardId = card.getList().getBoard().getId();
        cardRepository.decrementPositionsAfter(card.getList().getId(), card.getPosition());
        cardRepository.delete(card);

        broadcastBoardEvent(boardId, "CARD_DELETED");
    }

    @Transactional
    public CardSummaryResponse moveCard(String cardId, MoveCardRequest request, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);

        BoardList sourceList = card.getList();
        BoardList targetList = findListOrThrow(request.targetListId());

        String oldListTitle = sourceList.getTitle();
        String newListTitle = targetList.getTitle();

        // Shift positions in source list
        cardRepository.decrementPositionsAfter(sourceList.getId(), card.getPosition());

        // Set new position and list
        card.setList(targetList);
        card.setPosition(request.targetPosition());
        Card saved = cardRepository.save(card);

        logActivity(saved, currentUser, "moved",
                "Card moved from '" + oldListTitle + "' to '" + newListTitle + "'");
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_MOVED");

        return toCardSummaryResponse(saved);
    }

    @Transactional
    public void reorderCards(String listId, ReorderRequest request, User currentUser) {
        BoardList list = findListOrThrow(listId);
        boardService.requireMember(list.getBoard(), currentUser);

        AtomicInteger pos = new AtomicInteger(0);
        request.orderedIds().forEach(id -> {
            Card card = findCardOrThrow(id);
            card.setPosition(pos.getAndIncrement());
            cardRepository.save(card);
        });

        broadcastBoardEvent(list.getBoard().getId(), "CARDS_REORDERED");
    }

    @Transactional
    public CardResponse assignMember(String cardId, String userId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);

        if (cardMemberRepository.existsByCardIdAndUserId(cardId, userId)) {
            throw new DuplicateResourceException("User is already assigned to this card");
        }

        User assignee = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Verify assignee is board member
        boardService.requireMember(card.getList().getBoard(), assignee);

        CardMember cm = CardMember.builder()
                .card(card)
                .user(assignee)
                .build();
        cardMemberRepository.save(cm);

        logActivity(card, currentUser, "assigned", currentUser.getFullName() + " assigned " + assignee.getFullName());

        // Notify assignee
        notificationService.createNotification(
                assignee,
                NotificationType.CARD_ASSIGNED,
                currentUser.getFullName() + " assigned you to card: " + card.getTitle(),
                cardId,
                "CARD"
        );

        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_UPDATED");
        return toCardResponse(cardRepository.findById(cardId).orElseThrow());
    }

    @Transactional
    public CardResponse unassignMember(String cardId, String userId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requireMember(card.getList().getBoard(), currentUser);
        cardMemberRepository.deleteByCardIdAndUserId(cardId, userId);

        logActivity(card, currentUser, "unassigned", "Member removed from card");
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_UPDATED");
        return toCardResponse(cardRepository.findById(cardId).orElseThrow());
    }

    @Transactional(readOnly = true)
    public CardResponse getCard(String cardId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.checkAccess(card.getList().getBoard(), currentUser);
        return toCardResponse(card);
    }

    @Transactional(readOnly = true)
    public List<CardSummaryResponse> getCardsByList(String listId, User currentUser) {
        BoardList list = findListOrThrow(listId);
        boardService.checkAccess(list.getBoard(), currentUser);
        return cardRepository.findByListIdOrderByPositionAsc(listId)
                .stream().map(this::toCardSummaryResponse).toList();
    }

    // Calendar view: cards with deadline in a date range
    @Transactional(readOnly = true)
    public List<CardSummaryResponse> getCardsForCalendar(String boardId, LocalDateTime from, LocalDateTime to, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.checkAccess(board, currentUser);
        return cardRepository.findByBoardAndDeadlineBetween(boardId, from, to)
                .stream().map(this::toCardSummaryResponse).toList();
    }

    // Filter & Search
    @Transactional(readOnly = true)
    public List<CardSummaryResponse> filterCards(String boardId, String labelId, String memberId,
                                                  LocalDateTime deadlineFrom, LocalDateTime deadlineTo,
                                                  String search, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.checkAccess(board, currentUser);

        List<Card> cards;

        if (search != null && !search.isBlank()) {
            cards = cardRepository.searchByTitleInBoard(boardId, search);
        } else if (labelId != null) {
            cards = cardRepository.findByLabelId(labelId);
        } else if (deadlineFrom != null && deadlineTo != null) {
            cards = cardRepository.findByBoardAndDeadlineBetween(boardId, deadlineFrom, deadlineTo);
        } else {
            cards = cardRepository.findAllByBoardId(boardId);
        }

        // Filter by member if specified
        if (memberId != null) {
            cards = cards.stream()
                    .filter(c -> c.getAssignedMembers().stream()
                            .anyMatch(cm -> cm.getUser().getId().equals(memberId)))
                    .toList();
        }

        return cards.stream().map(this::toCardSummaryResponse).toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private void logActivity(Card card, User user, String action, String detail) {
        ActivityLog log = ActivityLog.builder()
                .card(card)
                .user(user)
                .action(action)
                .detail(detail)
                .build();
        activityLogRepository.save(log);
    }

    private void broadcastBoardEvent(String boardId, String event) {
        messagingTemplate.convertAndSend("/topic/board/" + boardId, event);
    }

    public Card findCardOrThrow(String cardId) {
        return cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", cardId));
    }

    private BoardList findListOrThrow(String listId) {
        return boardListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("List", listId));
    }

    private CardSummaryResponse toCardSummaryResponse(Card card) {
        List<UserResponse> members = card.getAssignedMembers().stream()
                .map(cm -> authService.toUserResponse(cm.getUser())).toList();
        List<LabelResponse> labels = card.getLabels().stream()
                .map(cl -> new LabelResponse(cl.getLabel().getId(), cl.getLabel().getBoard().getId(),
                        cl.getLabel().getName(), cl.getLabel().getColor(), cl.getLabel().getCreatedAt()))
                .toList();
        int totalItems = card.getChecklists().stream().mapToInt(c -> c.getItems().size()).sum();
        int completedItems = card.getChecklists().stream()
                .mapToInt(c -> (int) c.getItems().stream().filter(ChecklistItem::isCompleted).count()).sum();

        return new CardSummaryResponse(
                card.getId(), card.getList().getId(), card.getTitle(),
                card.getDeadline(), card.getPriority(), card.getPosition(),
                card.isCompleted(), members, labels,
                totalItems, completedItems, card.getComments().size(), card.getCreatedAt()
        );
    }

    public CardResponse toCardResponse(Card card) {
        List<UserResponse> members = card.getAssignedMembers().stream()
                .map(cm -> authService.toUserResponse(cm.getUser())).toList();
        List<LabelResponse> labels = card.getLabels().stream()
                .map(cl -> new LabelResponse(cl.getLabel().getId(), cl.getLabel().getBoard().getId(),
                        cl.getLabel().getName(), cl.getLabel().getColor(), cl.getLabel().getCreatedAt()))
                .toList();
        List<ChecklistResponse> checklists = card.getChecklists().stream()
                .map(this::toChecklistResponse).toList();
        List<CommentResponse> comments = card.getComments().stream()
                .map(c -> new CommentResponse(c.getId(), authService.toUserResponse(c.getAuthor()),
                        c.getContent(), c.getCreatedAt(), c.getUpdatedAt()))
                .toList();
        List<AttachmentResponse> attachments = card.getAttachments().stream()
                .map(a -> new AttachmentResponse(a.getId(), authService.toUserResponse(a.getUploadedBy()),
                        a.getFileName(), a.getFileUrl(), a.getFileType(), a.getFileSize(), a.getCreatedAt()))
                .toList();
        List<ActivityLogResponse> logs = card.getActivityLogs().stream()
                .map(l -> new ActivityLogResponse(l.getId(), authService.toUserResponse(l.getUser()),
                        l.getAction(), l.getDetail(), l.getCreatedAt()))
                .toList();

        return new CardResponse(
                card.getId(), card.getList().getId(), card.getList().getTitle(),
                card.getList().getBoard().getId(), card.getTitle(), card.getDescription(),
                card.getDeadline(), card.getPriority(), card.getPosition(), card.isCompleted(),
                members, labels, checklists, comments, attachments, logs,
                card.getCreatedAt(), card.getUpdatedAt()
        );
    }

    private ChecklistResponse toChecklistResponse(Checklist c) {
        List<ChecklistItemResponse> items = c.getItems().stream()
                .map(i -> new ChecklistItemResponse(i.getId(), i.getContent(), i.isCompleted(), i.getPosition(), i.getCreatedAt()))
                .toList();
        long completed = items.stream().filter(ChecklistItemResponse::completed).count();
        return new ChecklistResponse(c.getId(), c.getTitle(), items, items.size(), (int) completed, c.getCreatedAt());
    }
}
