package com.example.trillo.controller;

import com.example.trillo.dto.response.UserResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.example.trillo.dto.request.ChangePasswordRequest;
import com.example.trillo.dto.request.UpdateProfileRequest;
import com.example.trillo.dto.response.UserProfileResponse;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getUserProfile(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.updateProfile(user, request));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserProfileResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.uploadAvatar(user, file));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        userService.changePassword(user, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> searchUsers(
            @RequestParam String q) {
        return ResponseEntity.ok(userService.searchUsers(q));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUser(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }

    @PostMapping("/me/logout-all")
    public ResponseEntity<Void> logoutAllDevices(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok().build();
    }
}
