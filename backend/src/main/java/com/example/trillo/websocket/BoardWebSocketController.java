package com.example.trillo.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * WebSocket message controller for board real-time events.
 *
 * Connection flow (frontend):
 * 1. Connect to: ws://localhost:8080/ws (SockJS endpoint)
 * 2. Subscribe to board events: /topic/board/{boardId}
 * 3. Subscribe to personal notifications: /user/queue/notifications
 *
 * Events broadcast on /topic/board/{boardId}:
 *   BOARD_UPDATED, MEMBER_ADDED, MEMBER_REMOVED,
 *   LIST_CREATED, LIST_UPDATED, LIST_DELETED, LISTS_REORDERED,
 *   CARD_CREATED, CARD_UPDATED, CARD_MOVED, CARD_DELETED, CARDS_REORDERED,
 *   COMMENT_ADDED
 *
 * The frontend should refresh board data when receiving these events.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class BoardWebSocketController {

    /**
     * Handles messages sent from clients to /app/board/{boardId}.
     * Re-broadcasts to all subscribers of /topic/board/{boardId}.
     * This allows clients to announce custom events if needed.
     */
    @MessageMapping("/board/{boardId}")
    @SendTo("/topic/board/{boardId}")
    public String handleBoardMessage(
            @DestinationVariable String boardId,
            String event) {
        log.debug("WebSocket event for board {}: {}", boardId, event);
        return event;
    }
}
