package com.example.trillo.service;

import com.example.trillo.entity.ActivityLog;
import com.example.trillo.entity.Card;
import com.example.trillo.entity.User;
import com.example.trillo.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Transactional
    public void logActivity(Card card, User user, String action, String detail) {
        if (card == null || user == null) return;
        ActivityLog log = ActivityLog.builder()
                .card(card)
                .user(user)
                .action(action)
                .detail(detail)
                .build();
        activityLogRepository.save(log);
    }
}
