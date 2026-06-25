package com.dailyledger.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.dailyledger.entity.Budget;
import com.dailyledger.mapper.BudgetMapper;
import com.dailyledger.mapper.RecordMapper;
import com.dailyledger.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BudgetServiceImpl implements BudgetService {

    @Autowired
    private BudgetMapper budgetMapper;

    @Autowired
    private RecordMapper recordMapper;

    @Override
    public List<Budget> list(Long userId, String month) {
        List<Budget> budgets = budgetMapper.findUserBudgets(userId, month);

        for (Budget budget : budgets) {
            BigDecimal spent = recordMapper.categorySpent(userId, budget.getCategoryId(), month);
            budget.setSpent(spent != null ? spent : BigDecimal.ZERO);
        }

        return budgets;
    }

    @Override
    public void save(Long userId, Budget budget) {
        // 检查是否已存在相同 (userId, categoryId, yearMonth) 的预算
        QueryWrapper<Budget> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId)
               .eq("category_id", budget.getCategoryId())
               .eq("`year_month`", budget.getYearMonth());

        Budget existing = budgetMapper.selectOne(wrapper);

        if (existing != null) {
            // 更新已有预算
            existing.setAmount(budget.getAmount());
            if (budget.getPeriodType() != null) {
                existing.setPeriodType(budget.getPeriodType());
            }
            existing.setUpdatedAt(LocalDateTime.now());
            budgetMapper.updateById(existing);
        } else {
            // 新增预算
            budget.setUserId(userId);
            if (budget.getPeriodType() == null) {
                budget.setPeriodType("month");
            }
            if (budget.getIsActive() == null) {
                budget.setIsActive(1);
            }
            budget.setCreatedAt(LocalDateTime.now());
            budget.setUpdatedAt(LocalDateTime.now());
            budgetMapper.insert(budget);
        }
    }

    @Override
    public void delete(Long userId, Integer id) {
        Budget budget = budgetMapper.selectById(id);
        if (budget == null) {
            throw new RuntimeException("预算不存在");
        }
        if (!budget.getUserId().equals(userId)) {
            throw new RuntimeException("无权删除此预算");
        }

        budgetMapper.deleteById(id);
    }
}
