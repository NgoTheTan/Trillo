package com.example.trillo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSetting {
    @Id
    private String userId;

    private boolean taskAssigned = true;
    private boolean taskDueSoon = true;
    private boolean taskOverdue = true;
    private boolean comments = true;
    private boolean mentions = true;
    private boolean boardInvites = true;
}