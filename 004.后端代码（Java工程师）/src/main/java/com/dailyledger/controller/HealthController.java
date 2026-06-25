package com.dailyledger.controller;

import com.dailyledger.common.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<Result> health() {
        return ResponseEntity.ok(Result.ok("每日记账服务运行中 🌸"));
    }
}
