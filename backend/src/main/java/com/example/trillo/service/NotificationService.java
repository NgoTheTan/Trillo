package com.example.trillo.service;

import com.example.trillo.dto.response.NotificationResponse;
import com.example.trillo.entity.Notification;
import com.example.trillo.entity.NotificationSetting;
import com.example.trillo.entity.User;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.NotificationRepository;
import com.example.trillo.repository.NotificationSettingRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationSettingRepository settingRepository;
    
    public NotificationSetting getSettings(String userId) {
        return settingRepository.findById(userId)
                .orElseGet(() -> settingRepository.save(new NotificationSetting(userId, true, true, true, true, true, true)));
    }

    @Transactional
    public NotificationSetting updateSettings(String userId, NotificationSetting updatedSettings) {
        updatedSettings.setUserId(userId);
        return settingRepository.save(updatedSettings);
    }

    @Transactional
    public void createNotification(User recipient, NotificationType type,
                                   String message, String referenceId, String referenceType) {
        
        NotificationSetting settings = getSettings(recipient.getId());
        
        boolean shouldSend = true;
        if (type != null) {
            switch (type) {
                case TASK_ASSIGNED -> shouldSend = settings.isTaskAssigned();
                case TASK_DUE_SOON -> shouldSend = settings.isTaskDueSoon();
                case TASK_OVERDUE -> shouldSend = settings.isTaskOverdue();
                case COMMENT -> shouldSend = settings.isComments();
                case MENTION -> shouldSend = settings.isMentions();
                case BOARD_INVITE -> shouldSend = settings.isBoardInvites();
                default -> shouldSend = true;
            }
        }

        if (!shouldSend) {
            return;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .message(message)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .build();

        Notification saved = notificationRepository.save(notification);

        try {
            messagingTemplate.convertAndSendToUser(
                    recipient.getId(),
                    "/queue/notifications",
                    toResponse(saved)
            );
        } catch (Exception e) {
            log.warn("Could not push WebSocket notification to user {}", recipient.getId(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(User user) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(User user) {
        return notificationRepository.findByRecipientIdAndReadFalseOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markAsRead(String notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));

        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new com.example.trillo.exception.AccessDeniedException();
        }

        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public NotificationResponse markAsUnread(String notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));

        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new com.example.trillo.exception.AccessDeniedException();
        }

        notification.setRead(false);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getMessage(),
                n.getReferenceId(), n.getReferenceType(),
                n.isRead(), n.getCreatedAt()
        );
    }
}