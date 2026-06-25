package com.dailyledger.service;

import com.dailyledger.entity.User;

public interface UserService {

    /**
     * 注册新用户
     */
    User register(String username, String password);

    /**
     * 用户登录
     */
    User login(String username, String password);

    /**
     * 根据 ID 查询用户
     */
    User getById(Long id);

    /**
     * 更新用户个人信息
     */
    User updateProfile(Long userId, String nickname, String avatarUrl);

    /**
     * 检查用户名是否已存在
     */
    boolean existsByUsername(String username);
}
