package com.dailyledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DailyLedgerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DailyLedgerApplication.class, args);
        System.out.println("🌸 每日记账 Java 后端已启动 → http://localhost:8080");
    }
}
