package com.example.trillo.repository;

import com.example.trillo.entity.AppearanceSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppearanceSettingRepository extends JpaRepository<AppearanceSetting, String> {
}