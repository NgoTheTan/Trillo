package com.example.trillo.service;

import com.example.trillo.dto.request.ChangePasswordRequest;
import com.example.trillo.dto.request.UpdateProfileRequest;
import com.example.trillo.dto.response.UserProfileResponse;
import com.example.trillo.dto.response.UserResponse;
import com.example.trillo.entity.User;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return authService.toUserResponse(user);
    }

    public List<UserResponse> searchUsers(String query) {
        return userRepository
                .findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(query, query)
                .stream()
                .map(authService::toUserResponse)
                .toList();
    }

    public User getEntityById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    public UserProfileResponse getUserProfile(User currentUser) {
        return mapToResponse(currentUser);
    }

    @Transactional
    public UserProfileResponse updateProfile(User currentUser, UpdateProfileRequest request) {
        currentUser.setFullName(request.displayName());
        currentUser.setPhone(request.phone());
        userRepository.save(currentUser);
        return mapToResponse(currentUser);
    }

    public static final String PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$";

    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (currentUser == null) {
            throw new IllegalArgumentException("User is not authenticated");
        }
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }
        if (request.newPassword() == null || !request.newPassword().matches(PASSWORD_PATTERN)) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt");
        }
        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
    }

    @Transactional
    public UserProfileResponse uploadAvatar(User currentUser, MultipartFile file) {
        if (currentUser == null) {
            throw new IllegalArgumentException("User is not authenticated");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        try {
            java.nio.file.Path uploadPath = java.nio.file.Paths.get(System.getProperty("user.dir"), "uploads", "avatars");
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar.png";
            String cleanFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            String fileName = java.util.UUID.randomUUID() + "-" + cleanFilename;

            java.nio.file.Path filePath = uploadPath.resolve(fileName);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String avatarUrl = "/uploads/avatars/" + fileName;
            currentUser.setAvatarUrl(avatarUrl);
            userRepository.save(currentUser);
            return mapToResponse(currentUser);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save avatar image: " + e.getMessage(), e);
        }
    }

    private UserProfileResponse mapToResponse(User user) {
        return new UserProfileResponse(
            user.getId(), 
            user.getFullName(), 
            user.getUsername(), 
            user.getEmail(), 
            user.getPhone(), 
            user.getAvatarUrl(), 
            "USER" 
        );
    }
}