package com.example.trillo.service;

import com.example.trillo.config.JwtService;
import com.example.trillo.dto.request.GoogleLoginRequest;
import com.example.trillo.dto.request.LoginRequest;
import com.example.trillo.dto.request.RegisterRequest;
import com.example.trillo.dto.response.AuthResponse;
import com.example.trillo.dto.response.UserResponse;
import com.example.trillo.entity.User;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    private final RestTemplate restTemplate = new RestTemplate();

    public static final String PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$";

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email already registered: " + request.email());
        }

        if (request.password() == null || !request.password().matches(PASSWORD_PATTERN)) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt");
        }

        User user = User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .avatarUrl(request.avatarUrl())
                .build();

        userRepository.save(user);

        return toUserResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (AuthenticationException e) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, toUserResponse(user));
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.idToken();
        Map<String, Object> tokenInfo;
        try {
            tokenInfo = restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Google token verification failed: " + e.getMessage());
        }

        if (tokenInfo == null || !tokenInfo.containsKey("email")) {
            throw new IllegalArgumentException("Invalid Google token or missing email in claims");
        }

        String email = (String) tokenInfo.get("email");
        String name = (String) tokenInfo.getOrDefault("name", email.split("@")[0]);
        String picture = (String) tokenInfo.get("picture");

        if (googleClientId != null && !googleClientId.isBlank()) {
            String aud = (String) tokenInfo.get("aud");
            if (!googleClientId.equals(aud)) {
                throw new IllegalArgumentException("Google token client ID mismatch");
            }
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .fullName(name)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .avatarUrl(picture)
                    .build();
            return userRepository.save(newUser);
        });

        if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) && picture != null) {
            user.setAvatarUrl(picture);
            userRepository.save(user);
        }

        String jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken, toUserResponse(user));
    }

    public UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getCreatedAt()
        );
    }
}
