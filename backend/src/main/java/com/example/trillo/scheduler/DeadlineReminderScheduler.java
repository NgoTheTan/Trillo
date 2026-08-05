package com.example.trillo.scheduler;

import com.example.trillo.entity.Card;
import com.example.trillo.entity.CardMember;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.repository.CardRepository;
import com.example.trillo.repository.InviteTokenRepository;
import com.example.trillo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeadlineReminderScheduler {

    private final CardRepository cardRepository;
    private final NotificationService notificationService;
    private final InviteTokenRepository inviteTokenRepository;

    /**
     * Every day at 8:00 AM: notify card assignees whose cards have a deadline tomorrow.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendDeadlineReminders() {
        log.info("Running deadline reminder scheduler...");

        LocalDateTime tomorrowStart = LocalDateTime.now().plusDays(1).toLocalDate().atStartOfDay();
        LocalDateTime tomorrowEnd = tomorrowStart.plusDays(1).minusSeconds(1);

        List<Card> cards = cardRepository.findCardsWithDeadlineBetween(tomorrowStart, tomorrowEnd);
        log.info("Found {} cards with deadlines tomorrow", cards.size());

        for (Card card : cards) {
            String message = "⏰ Card '" + card.getTitle() + "' is due tomorrow!";

            // Notify all assigned members
            for (CardMember member : card.getAssignedMembers()) {
                try {
                    notificationService.createNotification(
                            member.getUser(),
                            NotificationType.DEADLINE_REMINDER,
                            message,
                            card.getId(),
                            "CARD"
                    );
                } catch (Exception e) {
                    log.error("Failed to send deadline notification to user {}", member.getUser().getId(), e);
                }
            }
        }

        log.info("Deadline reminder scheduler completed");
    }

    /**
     * Every day at midnight: clean up expired invite tokens.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupExpiredInviteTokens() {
        log.info("Cleaning up expired invite tokens...");
        inviteTokenRepository.deleteExpiredTokens(LocalDateTime.now());
        log.info("Expired invite tokens cleaned up");
    }
}
