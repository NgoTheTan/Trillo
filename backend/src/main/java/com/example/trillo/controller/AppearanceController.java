package com.example.trillo.controller;

import com.example.trillo.entity.AppearanceSetting;
import com.example.trillo.entity.User;
import com.example.trillo.repository.AppearanceSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/appearance")
@RequiredArgsConstructor
public class AppearanceController {

    private final AppearanceSettingRepository appearanceRepository;

    @GetMapping
    public ResponseEntity<AppearanceSetting> getSettings(@AuthenticationPrincipal User user) {
        AppearanceSetting setting = appearanceRepository.findById(user.getId())
                .orElse(new AppearanceSetting(user.getId(), "light", "blue"));
        return ResponseEntity.ok(setting);
    }

    @PutMapping
    @Transactional
    public ResponseEntity<AppearanceSetting> updateSettings(
            @RequestBody AppearanceSetting request,
            @AuthenticationPrincipal User user) {
        
        AppearanceSetting setting = appearanceRepository.findById(user.getId())
            .orElse(new AppearanceSetting(user.getId(), "light", "blue"));
        
        setting.setUserId(user.getId());
        setting.setTheme(request.getTheme());
        setting.setAccentColor(request.getAccentColor());
        
        return ResponseEntity.ok(appearanceRepository.save(setting));
    }
}