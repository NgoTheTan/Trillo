package com.example.trillo.service;

import com.example.trillo.dto.request.CreateListRequest;
import com.example.trillo.dto.request.ReorderRequest;
import com.example.trillo.dto.request.UpdateListRequest;
import com.example.trillo.dto.response.ListResponse;
import com.example.trillo.entity.Board;
import com.example.trillo.entity.BoardList;
import com.example.trillo.entity.Card;
import com.example.trillo.entity.User;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.BoardListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class ListService {

    private final BoardListRepository boardListRepository;
    private final BoardService boardService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ListResponse createList(String boardId, CreateListRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requireMember(board, currentUser);

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
        boardService.requireMember(board, currentUser);

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
        return boardListRepository.findByBoardIdOrderByPositionAsc(boardId)
                .stream().map(this::toListResponse).toList();
    }

    @Transactional
    public void reorderLists(String boardId, ReorderRequest request, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requireMember(board, currentUser);

        AtomicInteger pos = new AtomicInteger(0);
        request.orderedIds().forEach(listId -> {
            BoardList list = findListOrThrow(listId);
            list.setPosition(pos.getAndIncrement());
            boardListRepository.save(list);
        });

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "LISTS_REORDERED");
    }

    public BoardList findListOrThrow(String listId) {
        return boardListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("List", listId));
    }

    private ListResponse toListResponse(BoardList list) {
        List<String> cardIds = list.getCards() != null ? list.getCards().stream()
                .map(Card::getId)
                .toList() : List.of();

        return new ListResponse(
                list.getId(),
                list.getBoard().getId(),
                list.getTitle(),
                list.getPosition(),
                cardIds,
                list.getCreatedAt()
        );
    }
}
