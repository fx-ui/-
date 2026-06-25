package com.dailyledger.controller;

import com.dailyledger.common.Result;
import com.dailyledger.dto.AccountRequest;
import com.dailyledger.entity.Account;
import com.dailyledger.service.AccountService;
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
@RequestMapping("/api/accounts")
public class AccountController {

    @Autowired
    private AccountService accountService;

    /** 获取账户总览（含记录数，对齐 Node.js 后端） */
    @GetMapping("/summary")
    public ResponseEntity<Result> summary(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Account> accounts = accountService.list(userId);

        BigDecimal totalBalance = accounts.stream()
                .map(a -> a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 查询记录总数
        int recordCount = accountService.getRecordCount(userId);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accountCount", accounts.size());
        data.put("totalBalance", totalBalance);
        data.put("recordCount", recordCount);
        return ResponseEntity.ok(Result.ok(data));
    }

    /** 获取账户列表 */
    @GetMapping
    public ResponseEntity<Result> list(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Account> accounts = accountService.list(userId);
        return ResponseEntity.ok(Result.ok(accounts));
    }

    /** 新增账户 */
    @PostMapping
    public ResponseEntity<Result> create(@Valid @RequestBody AccountRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Account account = new Account();
        account.setName(req.getName());
        account.setIcon(req.getIcon() != null ? req.getIcon() : "🏦");
        account.setType(req.getType() != null ? req.getType() : "other");
        account.setBalance(req.getInitialBalance() != null ? req.getInitialBalance() : BigDecimal.ZERO);
        account.setInitialBalance(req.getInitialBalance() != null ? req.getInitialBalance() : BigDecimal.ZERO);

        Account created = accountService.create(userId, account);
        return ResponseEntity.status(201).body(Result.created("账户已添加", created));
    }

    /** 修改账户 */
    @PutMapping("/{id}")
    public ResponseEntity<Result> update(@PathVariable Integer id,
                                          @RequestBody AccountRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Account account = new Account();
        account.setName(req.getName());
        account.setIcon(req.getIcon());
        account.setType(req.getType());

        accountService.update(userId, id, account);
        return ResponseEntity.ok(Result.ok("已更新"));
    }

    /** 删除账户 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Result> delete(@PathVariable Integer id,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        accountService.delete(userId, id);
        return ResponseEntity.ok(Result.ok("已删除"));
    }
}
