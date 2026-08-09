package com.example.trillo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "appearance_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppearanceSetting {
    @Id
    private String userId; 

    @Column(nullable = false)
    private String theme = "light"; 

    @Column(nullable = false)
    private String accentColor = "blue"; 
}