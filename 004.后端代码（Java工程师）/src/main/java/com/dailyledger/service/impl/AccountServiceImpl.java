package com.dailyledger.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.dailyledger.entity.Account;
import com.dailyledger.mapper.AccountMapper;
import com.dailyledger.mapper.RecordMapper;
import com.dailyledger.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AccountServiceImpl implements AccountService {

    @Autowired
    private AccountMapper accountMapper;

    @Autowired
    private RecordMapper recordMapper;

    @Override
    public List<Account> list(Long userId) {
        QueryWrapper<Account> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId).orderByAsc("sort_order");
        return accountMapper.selectList(wrapper);
    }

    @Override
    public Account create(Long userId, Account account) {
        account.setUserId(userId);
        if (account.getBalance() == null) {
            account.setBalance(BigDecimal.ZERO);
        }
        if (account.getInitialBalance() == null) {
            account.setInitialBalance(BigDecimal.ZERO);
        }
        if (account.getIsDefault() == null) {
            account.setIsDefault(0);
        }
        if (account.getSortOrder() == null) {
            account.setSortOrder(99);
        }
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        accountMapper.insert(account);
        return account;
    }

    @Override
    public void update(Long userId, Integer id, Account account) {
        Account existing = accountMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("账户不存在");
        }
        if (!existing.getUserId().equals(userId)) {
            throw new RuntimeException("无权操作此账户");
        }

        if (account.getName() != null) {
            existing.setName(account.getName());
        }
        if (account.getIcon() != null) {
            existing.setIcon(account.getIcon());
        }
        if (account.getType() != null) {
            existing.setType(account.getType());
        }
        if (account.getBalance() != null) {
            existing.setBalance(account.getBalance());
        }
        if (account.getInitialBalance() != null) {
            existing.setInitialBalance(account.getInitialBalance());
        }
        if (account.getIsDefault() != null) {
            existing.setIsDefault(account.getIsDefault());
        }
        if (account.getSortOrder() != null) {
            existing.setSortOrder(account.getSortOrder());
        }
        if (account.getRemark() != null) {
            existing.setRemark(account.getRemark());
        }
        existing.setUpdatedAt(LocalDateTime.now());

        accountMapper.updateById(existing);
    }

    @Override
    public void delete(Long userId, Integer id) {
        Account account = accountMapper.selectById(id);
        if (account == null) {
            throw new RuntimeException("账户不存在");
        }
        if (!account.getUserId().equals(userId)) {
            throw new RuntimeException("无权操作此账户");
        }

        // 检查是否有记录关联此账户
        QueryWrapper<com.dailyledger.entity.Record> recordWrapper = new QueryWrapper<>();
        recordWrapper.eq("account_id", id);
        Long recordCount = recordMapper.selectCount(recordWrapper);
        if (recordCount != null && recordCount > 0) {
            throw new RuntimeException("该账户下存在记账记录，无法删除");
        }

        accountMapper.deleteById(id);
    }

    @Override
    public int getRecordCount(Long userId) {
        QueryWrapper<com.dailyledger.entity.Record> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId).eq("is_deleted", 0);
        Long count = recordMapper.selectCount(wrapper);
        return count != null ? count.intValue() : 0;
    }

    @Override
    public void ensureDefaults(Long userId) {
        List<Account> accounts = list(userId);
        if (accounts != null && !accounts.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        // 现金钱包
        Account cash = new Account();
        cash.setUserId(userId);
        cash.setName("现金钱包");
        cash.setIcon("💵");
        cash.setType("cash");
        cash.setBalance(BigDecimal.ZERO);
        cash.setInitialBalance(BigDecimal.ZERO);
        cash.setIsDefault(1);
        cash.setSortOrder(1);
        cash.setCreatedAt(now);
        cash.setUpdatedAt(now);
        accountMapper.insert(cash);

        // 银行卡
        Account bank = new Account();
        bank.setUserId(userId);
        bank.setName("银行卡");
        bank.setIcon("🏦");
        bank.setType("bank");
        bank.setBalance(BigDecimal.ZERO);
        bank.setInitialBalance(BigDecimal.ZERO);
        bank.setIsDefault(1);
        bank.setSortOrder(2);
        bank.setCreatedAt(now);
        bank.setUpdatedAt(now);
        accountMapper.insert(bank);

        // 支付宝
        Account alipay = new Account();
        alipay.setUserId(userId);
        alipay.setName("支付宝");
        alipay.setIcon("📱");
        alipay.setType("ewallet");
        alipay.setBalance(BigDecimal.ZERO);
        alipay.setInitialBalance(BigDecimal.ZERO);
        alipay.setIsDefault(1);
        alipay.setSortOrder(3);
        alipay.setCreatedAt(now);
        alipay.setUpdatedAt(now);
        accountMapper.insert(alipay);

        // 微信钱包
        Account wechat = new Account();
        wechat.setUserId(userId);
        wechat.setName("微信钱包");
        wechat.setIcon("💬");
        wechat.setType("ewallet");
        wechat.setBalance(BigDecimal.ZERO);
        wechat.setInitialBalance(BigDecimal.ZERO);
        wechat.setIsDefault(1);
        wechat.setSortOrder(4);
        wechat.setCreatedAt(now);
        wechat.setUpdatedAt(now);
        accountMapper.insert(wechat);
    }
}
