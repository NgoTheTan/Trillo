package com.example.trillo.repository;

import com.example.trillo.entity.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, String> {
}