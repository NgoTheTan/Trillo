package com.example.trillo.service;

import com.example.trillo.entity.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final BoardService boardService;

    @Transactional(readOnly = true)
    public String exportBoardAsJson(String boardId, User currentUser) throws Exception {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requireMember(board, currentUser);

        // Build export structure
        Map<String, Object> export = buildExportMap(board);

        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(export);
    }

    @Transactional(readOnly = true)
    public String exportBoardAsCsv(String boardId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requireMember(board, currentUser);

        StringBuilder csv = new StringBuilder();

        // Header
        csv.append("List,Card Title,Description,Priority,Deadline,Completed,Assigned Members,Labels\n");

        for (BoardList list : board.getLists()) {
            for (Card card : list.getCards()) {
                String members = card.getAssignedMembers().stream()
                        .map(cm -> cm.getUser().getFullName())
                        .reduce("", (a, b) -> a.isEmpty() ? b : a + "|" + b);

                String labels = card.getLabels().stream()
                        .map(cl -> cl.getLabel().getName())
                        .reduce("", (a, b) -> a.isEmpty() ? b : a + "|" + b);

                String deadline = card.getDeadline() != null ? card.getDeadline().toString() : "";

                csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                        escape(list.getTitle()),
                        escape(card.getTitle()),
                        escape(card.getDescription() != null ? card.getDescription() : ""),
                        card.getPriority(),
                        escape(deadline),
                        card.isCompleted(),
                        escape(members),
                        escape(labels)
                ));
            }
        }

        return csv.toString();
    }

    private Map<String, Object> buildExportMap(Board board) {
        return Map.of(
                "id", board.getId(),
                "title", board.getTitle(),
                "description", board.getDescription() != null ? board.getDescription() : "",
                "visibility", board.getVisibility(),
                "owner", board.getOwner().getFullName(),
                "exportedAt", java.time.LocalDateTime.now().toString(),
                "lists", board.getLists().stream().map(list -> Map.of(
                        "id", list.getId(),
                        "title", list.getTitle(),
                        "position", list.getPosition(),
                        "cards", list.getCards().stream().map(card -> Map.of(
                                "id", card.getId(),
                                "title", card.getTitle(),
                                "description", card.getDescription() != null ? card.getDescription() : "",
                                "priority", card.getPriority().toString(),
                                "deadline", card.getDeadline() != null ? card.getDeadline().toString() : "",
                                "completed", card.isCompleted(),
                                "assignedMembers", card.getAssignedMembers().stream()
                                        .map(cm -> cm.getUser().getFullName()).toList(),
                                "labels", card.getLabels().stream()
                                        .map(cl -> cl.getLabel().getName()).toList()
                        )).toList()
                )).toList()
        );
    }

    private String escape(String value) {
        return value != null ? value.replace("\"", "\"\"") : "";
    }
}
