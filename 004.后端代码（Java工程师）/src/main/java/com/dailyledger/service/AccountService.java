package com.dailyledger.service;

import com.dailyledger.entity.Account;

import java.util.List;

public interface AccountService {

    /**
     * 获取用户所有账户
     */
    List<Account> list(Long userId);

    /**
     * 创建账户
     */
    Account create(Long userId, Account account);

    /**
     * 更新账户
     */
    void update(Long userId, Integer id, Account account);

    /**
     * 删除账户
     */
    void delete(Long userId, Integer id);

    /**
     * 确保默认账户存在（若无账户则创建默认账户）
     */
    void ensureDefaults(Long userId);

    /**
     * 获取用户记录总数
     */
    int getRecordCount(Long userId);
}
