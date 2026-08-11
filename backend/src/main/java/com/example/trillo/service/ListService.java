package com.example.trillo.service;

import com.example.trillo.dto.request.CreateListRequest;
import com.example.trillo.dto.request.ReorderRequest;
import com.example.trillo.dto.request.UpdateListRequest;
import com.example.trillo.dto.response.ListResponse;
import com.example.trillo.entity.Board;
import com.example.trillo.entity.BoardList;
import com.example.trillo.entity.Card;
import com.example.trillo.entity.User;
import com.example.trillo.enums.BoardPermission;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.BoardListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListService {

    private final BoardListRepository boardListRepository;
    private final com.example.trillo.repository.CardRepository cardRepository;
    private final BoardService boardService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ListResponse createList(String boardId, CreateListRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.CREATE_LIST);

        int maxPos = boardListRepository.findMaxPositionByBoardId(boardId);
        BoardList list = BoardList.builder()
                .board(board)
                .title(request.title())
                .position(maxPos + 1)
                .build();

        BoardList saved = boardListRepository.save(list);
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LIST_CREATED");
        return toListResponse(saved);
    }

    @Transactional
    public ListResponse updateList(String boardId, String listId, UpdateListRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.EDIT_LIST);

        BoardList list = findListOrThrow(listId);
        list.setTitle(request.title());
        BoardList saved = boardListRepository.save(list);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LIST_UPDATED");
        return toListResponse(saved);
    }

    @Transactional
    public void deleteList(String boardId, String listId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requireOwner(board, currentUser);

        BoardList list = findListOrThrow(listId);
        boardListRepository.decrementPositionsAfter(boardId, list.getPosition());
        boardListRepository.delete(list);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LIST_DELETED");
    }

    @Transactional(readOnly = true)
    public List<ListResponse> getLists(String boardId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.checkAccess(board, currentUser);
        return boardListRepository.findByBoardIdAndArchivedFalseOrderByPositionAsc(boardId)
                .stream().map(this::toListResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ListResponse> getArchivedLists(String boardId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.VIEW_ARCHIVE);
        return boardListRepository.findByBoardIdAndArchivedTrueOrderByPositionAsc(boardId)
                .stream().map(this::toListResponse).toList();
    }

    @Transactional
    public ListResponse archiveList(String boardId, String listId, boolean archived, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        BoardPermission required = archived ? BoardPermission.ARCHIVE_ITEM : BoardPermission.RESTORE_ARCHIVE;
        boardService.requirePermission(board, currentUser, required);

        BoardList list = findListOrThrow(listId);
        list.setArchived(archived);
        BoardList saved = boardListRepository.save(list);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LIST_UPDATED");
        return toListResponse(saved);
    }

    @Transactional
    public ListResponse copyList(String boardId, String listId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.CREATE_LIST);

        BoardList sourceList = findListOrThrow(listId);
        int maxPos = boardListRepository.findMaxPositionByBoardId(boardId);

        BoardList newList = BoardList.builder()
                .board(board)
                .title("Bản sao của " + sourceList.getTitle())
                .position(maxPos + 1)
                .archived(false)
                .build();
        BoardList savedList = boardListRepository.save(newList);

        // Copy non-archived cards
        List<Card> activeCards = cardRepository.findByListIdAndArchivedFalseOrderByPositionAsc(listId);
        int cardPos = 0;
        for (Card c : activeCards) {
            Card newCard = Card.builder()
                    .list(savedList)
                    .title(c.getTitle())
                    .description(c.getDescription())
                    .deadline(c.getDeadline())
                    .position(cardPos++)
                    .completed(c.isCompleted())
                    .archived(false)
                    .build();
            cardRepository.save(newCard);
        }

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LIST_CREATED");
        return toListResponse(savedList);
    }

    @Transactional
    public void moveAllCards(String boardId, String listId, String targetListId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.MOVE_CARD);

        findListOrThrow(listId);
        BoardList targetList = findListOrThrow(targetListId);

        List<Card> activeCards = cardRepository.findByListIdAndArchivedFalseOrderByPositionAsc(listId);
        int targetMaxPos = cardRepository.findMaxPositionByListId(targetListId);
        int pos = targetMaxPos + 1;

        for (Card c : activeCards) {
            c.setList(targetList);
            c.setPosition(pos++);
        }
        cardRepository.saveAll(activeCards);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "CARDS_MOVED");
    }

    @Transactional
    public void archiveAllCards(String boardId, String listId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.ARCHIVE_ITEM);

        findListOrThrow(listId);
        List<Card> activeCards = cardRepository.findByListIdAndArchivedFalseOrderByPositionAsc(listId);
        for (Card c : activeCards) {
            c.setArchived(true);
        }
        cardRepository.saveAll(activeCards);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "CARDS_ARCHIVED");
    }

    @Transactional
    public void sortCardsInList(String boardId, String listId, String sortBy, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.MOVE_CARD);

        findListOrThrow(listId);
        List<Card> cards = new java.util.ArrayList<>(cardRepository.findByListIdAndArchivedFalseOrderByPositionAsc(listId));

        if ("name_asc".equalsIgnoreCase(sortBy)) {
            cards.sort(java.util.Comparator.comparing(Card::getTitle, String.CASE_INSENSITIVE_ORDER));
        } else if ("name_desc".equalsIgnoreCase(sortBy)) {
            cards.sort(java.util.Comparator.comparing(Card::getTitle, String.CASE_INSENSITIVE_ORDER).reversed());
        } else if ("created_asc".equalsIgnoreCase(sortBy)) {
            cards.sort(java.util.Comparator.comparing(Card::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())));
        } else if ("created_desc".equalsIgnoreCase(sortBy)) {
            cards.sort(java.util.Comparator.comparing(Card::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())));
        } else if ("deadline".equalsIgnoreCase(sortBy)) {
            cards.sort(java.util.Comparator.comparing(Card::getDeadline, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())));
        }

        int pos = 0;
        for (Card c : cards) {
            c.setPosition(pos++);
        }
        cardRepository.saveAll(cards);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "CARDS_REORDERED");
    }

    @Transactional
    public void reorderLists(String boardId, ReorderRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.MOVE_CARD);

        List<BoardList> listsToSave = new java.util.ArrayList<>();
        int pos = 0;
        for (String listId : request.orderedIds()) {
            BoardList list = boardListRepository.findById(listId).orElse(null);
            if (list != null) {
                list.setPosition(pos++);
                listsToSave.add(list);
            }
        }
        boardListRepository.saveAll(listsToSave);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LISTS_REORDERED");
    }

    public BoardList findListOrThrow(String listId) {
        return boardListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("List", listId));
    }

    private ListResponse toListResponse(BoardList list) {
        List<String> cardIds = list.getCards() != null ? list.getCards().stream()
                .filter(c -> !c.isArchived())
                .map(Card::getId)
                .toList() : List.of();

        return new ListResponse(
                list.getId(),
                list.getBoard().getId(),
                list.getTitle(),
                list.getPosition(),
                list.isArchived(),
                cardIds,
                list.getCreatedAt()
        );
    }
}
