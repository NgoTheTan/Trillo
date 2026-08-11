package com.example.trillo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationRunner.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            log.info("Checking & ensuring archived columns exist in database tables...");
            jdbcTemplate.execute("ALTER TABLE board_lists ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;");
            jdbcTemplate.execute("ALTER TABLE cards ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;");
            log.info("Database migration check completed successfully.");
        } catch (Exception e) {
            log.error("Failed to run database migration: ", e);
        }
    }
}
