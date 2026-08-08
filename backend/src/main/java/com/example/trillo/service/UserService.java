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

    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không đúng");
        }
        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
    }

    @Transactional
    public UserProfileResponse uploadAvatar(User currentUser, MultipartFile file) {
        String avatarUrl = "/uploads/avatars/" + file.getOriginalFilename(); 
        currentUser.setAvatarUrl(avatarUrl);
        userRepository.save(currentUser);
        return mapToResponse(currentUser);
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