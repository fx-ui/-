package com.dailyledger.service;

import com.dailyledger.entity.Budget;

import java.util.List;

public interface BudgetService {

    /**
     * 查询某月预算列表（含已花费金额）
     */
    List<Budget> list(Long userId, String month);

    /**
     * 保存预算
     */
    void save(Long userId, Budget budget);

    /**
     * 删除预算
     */
    void delete(Long userId, Integer id);
}
