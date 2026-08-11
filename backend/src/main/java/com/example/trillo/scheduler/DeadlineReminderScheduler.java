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
     * Every minute: check cards with deadline reminders due according to card reminder setting.
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void sendDeadlineReminders() {
        LocalDateTime now = LocalDateTime.now();

        List<Card> cards = cardRepository.findPendingReminderCards();

        for (Card card : cards) {
            if (card.isCompleted() || card.isArchived() || card.getDeadline() == null) continue;

            long minutesBefore = getReminderMinutesBefore(card.getReminder());
            if (minutesBefore < 0) continue;

            LocalDateTime reminderTime = card.getDeadline().minusMinutes(minutesBefore);
            if (!now.isBefore(reminderTime)) {
                String deadlineFormatted = card.getDeadline()
                        .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy 'lúc' HH:mm"));
                String message = "Thẻ '" + card.getTitle() + "' sắp đến hạn (Hạn chót: " + deadlineFormatted + ")";
                String boardId = card.getList().getBoard().getId();

                if (card.getAssignedMembers() != null && !card.getAssignedMembers().isEmpty()) {
                    for (CardMember member : card.getAssignedMembers()) {
                        try {
                            notificationService.createNotification(
                                    member.getUser(),
                                    NotificationType.DEADLINE_REMINDER,
                                    message,
                                    card.getId(),
                                    "CARD",
                                    boardId,
                                    card.getId()
                            );
                        } catch (Exception e) {
                            log.error("Failed to send deadline notification to user {}", member.getUser().getId(), e);
                        }
                    }
                } else if (card.getList().getBoard().getOwner() != null) {
                    try {
                        notificationService.createNotification(
                                card.getList().getBoard().getOwner(),
                                NotificationType.DEADLINE_REMINDER,
                                message,
                                card.getId(),
                                "CARD",
                                boardId,
                                card.getId()
                        );
                    } catch (Exception e) {
                        log.error("Failed to send deadline notification to owner", e);
                    }
                }

                card.setReminderSent(true);
                cardRepository.save(card);
            }
        }
    }

    private long getReminderMinutesBefore(String reminder) {
        if (reminder == null) return 1440;
        return switch (reminder.toLowerCase()) {
            case "at_due" -> 0;
            case "5_min_before" -> 5;
            case "15_min_before" -> 15;
            case "1_hour_before" -> 60;
            case "2_hours_before" -> 120;
            case "1_day_before" -> 1440;
            case "2_days_before" -> 2880;
            case "none" -> -1;
            default -> 1440;
        };
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
