package com.example.trillo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TrilloApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrilloApplication.class, args);
    }
}
