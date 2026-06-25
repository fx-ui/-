package com.dailyledger.controller;

import com.dailyledger.common.JwtUtils;
import com.dailyledger.common.Result;
import com.dailyledger.dto.LoginRequest;
import com.dailyledger.dto.RegisterRequest;
import com.dailyledger.dto.UpdateProfileRequest;
import com.dailyledger.entity.User;
import com.dailyledger.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.io.File;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    /** 注册 */
    @PostMapping("/register")
    public ResponseEntity<Result> register(@Valid @RequestBody RegisterRequest req) {
        if (userService.existsByUsername(req.getUsername())) {
            return ResponseEntity.status(409)
                    .body(Result.error(409, "该用户名已被注册"));
        }

        User user = userService.register(req.getUsername(), req.getPassword());
        String token = jwtUtils.generateToken(user.getId(), user.getUsername());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", buildUserMap(user));
        data.put("token", token);
        return ResponseEntity.status(201).body(Result.created("注册成功 🌸", data));
    }

    /** 登录 */
    @PostMapping("/login")
    public ResponseEntity<Result> login(@Valid @RequestBody LoginRequest req) {
        User user;
        try {
            user = userService.login(req.getUsername(), req.getPassword());
        } catch (RuntimeException e) {
            return ResponseEntity.status(401)
                    .body(Result.error(401, "用户名或密码不正确"));
        }
        if (user.getStatus() != 1) {
            return ResponseEntity.status(403)
                    .body(Result.error(403, "该账号已被禁用，请联系管理员"));
        }

        String token = jwtUtils.generateToken(user.getId(), user.getUsername());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", buildUserMap(user));
        data.put("token", token);
        return ResponseEntity.ok(Result.ok("登录成功 🌸", data));
    }

    /** 获取当前用户信息 */
    @GetMapping("/me")
    public ResponseEntity<Result> profile(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.status(404).body(Result.error(404, "用户不存在"));
        }
        if (user.getStatus() != 1) {
            return ResponseEntity.status(403).body(Result.error(403, "该账号已被禁用"));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", buildUserMap(user));
        return ResponseEntity.ok(Result.ok(data));
    }

    /** 修改个人信息 */
    @PutMapping("/me")
    public ResponseEntity<Result> updateProfile(@RequestBody UpdateProfileRequest req,
                                                 HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.updateProfile(userId,
                req.getNickname() != null ? req.getNickname() : null,
                req.getAvatarUrl() != null ? req.getAvatarUrl() : null);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", buildUserMap(user));
        return ResponseEntity.ok(Result.ok("已更新 🌸", data));
    }

    /** 上传头像 */
    @PostMapping("/avatar")
    public ResponseEntity<Result> uploadAvatar(@RequestParam("avatar") MultipartFile file,
                                                HttpServletRequest request) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Result.error(400, "请选择图片文件"));
        }

        // 校验文件类型
        String originalName = file.getOriginalFilename();
        String ext = originalName != null
                ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : ".jpg";
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)")) {
            return ResponseEntity.badRequest().body(Result.error(400, "只支持 JPG、PNG、GIF、WebP 格式"));
        }

        // 校验文件大小（2MB）
        if (file.getSize() > 2 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Result.error(400, "图片不能超过 2MB"));
        }

        try {
            // 保存到 uploads 目录
            String uploadDir = System.getProperty("user.dir") + "/uploads";
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            String fileName = "avatar_" + request.getAttribute("userId") + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            File dest = new File(uploadDir, fileName);
            file.transferTo(dest);

            // 更新用户头像 URL
            String avatarUrl = "/uploads/" + fileName;
            Long userId = (Long) request.getAttribute("userId");
            userService.updateProfile(userId, null, avatarUrl);

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("avatar_url", avatarUrl);
            return ResponseEntity.ok(Result.ok("头像已更新 🌸", data));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Result.error(500, "上传失败: " + e.getMessage()));
        }
    }

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("nickname", user.getNickname());
        map.put("avatar_url", user.getAvatarUrl());
        map.put("role", user.getRole());
        map.put("created_at", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        return map;
    }
}
