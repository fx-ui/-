package com.dailyledger.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.dailyledger.entity.Account;
import com.dailyledger.entity.Record;
import com.dailyledger.mapper.AccountMapper;
import com.dailyledger.mapper.RecordMapper;
import com.dailyledger.service.RecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class RecordServiceImpl implements RecordService {

    @Autowired
    private RecordMapper recordMapper;

    @Autowired
    private AccountMapper accountMapper;

    @Override
    @Transactional
    public Record create(Long userId, Record record) {
        record.setUserId(userId);
        record.setCreatedAt(LocalDateTime.now());
        record.setUpdatedAt(LocalDateTime.now());

        // 如果关联了账户，更新账户余额
        if (record.getAccountId() != null) {
            updateAccountBalance(record.getAccountId(), record.getType(), record.getAmount());
        }

        recordMapper.insert(record);
        return record;
    }

    @Override
    @Transactional
    public Record update(Long userId, Long recordId, Record record) {
        Record oldRecord = recordMapper.selectById(recordId);
        if (oldRecord == null) {
            throw new RuntimeException("记录不存在");
        }
        if (!oldRecord.getUserId().equals(userId)) {
            throw new RuntimeException("无权操作此记录");
        }

        // 撤销旧记录对账户余额的影响
        if (oldRecord.getAccountId() != null) {
            revertAccountBalance(oldRecord.getAccountId(), oldRecord.getType(), oldRecord.getAmount());
        }

        // 应用新记录对账户余额的影响
        if (record.getAccountId() != null) {
            updateAccountBalance(record.getAccountId(), record.getType(), record.getAmount());
        }

        // 更新记录字段
        oldRecord.setType(record.getType());
        oldRecord.setAmount(record.getAmount());
        oldRecord.setCategoryId(record.getCategoryId());
        oldRecord.setAccountId(record.getAccountId());
        oldRecord.setRecordDate(record.getRecordDate());
        oldRecord.setNote(record.getNote());
        oldRecord.setUpdatedAt(LocalDateTime.now());

        recordMapper.updateById(oldRecord);

        return oldRecord;
    }

    @Override
    @Transactional
    public void delete(Long userId, Long id) {
        Record record = recordMapper.selectById(id);
        if (record == null) {
            throw new RuntimeException("记录不存在");
        }
        if (!record.getUserId().equals(userId)) {
            throw new RuntimeException("无权操作此记录");
        }

        // 撤销对账户余额的影响
        if (record.getAccountId() != null) {
            revertAccountBalance(record.getAccountId(), record.getType(), record.getAmount());
        }

        recordMapper.deleteById(id);
    }

    @Override
    public IPage<Record> page(Long userId, String month, String type, int offset, int limit) {
        // MyBatis-Plus 分页从 1 开始，offset/limit 转换为 page/size
        int pageNum = (offset / limit) + 1;
        Page<Record> page = new Page<>(pageNum, limit);
        return recordMapper.findUserRecords(page, userId, month, type);
    }

    @Override
    public Record getById(Long userId, Long id) {
        Record record = recordMapper.selectById(id);
        if (record == null) {
            throw new RuntimeException("记录不存在");
        }
        if (!record.getUserId().equals(userId)) {
            throw new RuntimeException("无权查看此记录");
        }
        return record;
    }

    /**
     * 更新账户余额：收入增加，支出减少
     */
    private void updateAccountBalance(Integer accountId, String type, BigDecimal amount) {
        Account account = accountMapper.selectById(accountId);
        if (account == null) {
            return;
        }
        if ("income".equals(type)) {
            account.setBalance(account.getBalance().add(amount));
        } else if ("expense".equals(type)) {
            account.setBalance(account.getBalance().subtract(amount));
        }
        account.setUpdatedAt(LocalDateTime.now());
        accountMapper.updateById(account);
    }

    /**
     * 撤销账户余额变动：与 updateAccountBalance 相反
     */
    private void revertAccountBalance(Integer accountId, String type, BigDecimal amount) {
        Account account = accountMapper.selectById(accountId);
        if (account == null) {
            return;
        }
        if ("income".equals(type)) {
            account.setBalance(account.getBalance().subtract(amount));
        } else if ("expense".equals(type)) {
            account.setBalance(account.getBalance().add(amount));
        }
        account.setUpdatedAt(LocalDateTime.now());
        accountMapper.updateById(account);
    }
}
