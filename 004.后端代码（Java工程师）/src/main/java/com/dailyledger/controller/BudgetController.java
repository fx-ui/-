package com.dailyledger.controller;

import com.dailyledger.common.Result;
import com.dailyledger.dto.BudgetRequest;
import com.dailyledger.entity.Budget;
import com.dailyledger.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    /** 获取预算列表 */
    @GetMapping
    public ResponseEntity<Result> list(@RequestParam(defaultValue = "") String month,
                                        HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (month.isEmpty()) {
            month = java.time.LocalDate.now().toString().substring(0, 7);
        }

        List<Budget> budgets = budgetService.list(userId, month);

        // 计算本月总支出
        BigDecimal totalSpent = budgets.stream()
                .filter(b -> b.getCategoryId() == null)
                .map(b -> b.getSpent() != null ? b.getSpent() : BigDecimal.ZERO)
                .findFirst().orElse(BigDecimal.ZERO);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("budgets", budgets);
        data.put("totalSpent", totalSpent);
        return ResponseEntity.ok(Result.ok(data));
    }

    /** 设置/更新预算 */
    @PostMapping
    public ResponseEntity<Result> save(@Valid @RequestBody BudgetRequest req,
                                        HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Budget budget = new Budget();
        budget.setCategoryId(req.getCategoryId());
        budget.setAmount(req.getAmount());
        budget.setPeriodType(req.getPeriodType() != null ? req.getPeriodType() : "month");
        budget.setYearMonth(req.getYearMonth() != null ? req.getYearMonth()
                : java.time.LocalDate.now().toString().substring(0, 7));

        budgetService.save(userId, budget);
        return ResponseEntity.ok(Result.ok("预算已设置"));
    }

    /** 删除预算 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Result> delete(@PathVariable Integer id,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        budgetService.delete(userId, id);
        return ResponseEntity.ok(Result.ok("已删除"));
    }
}
