package com.dailyledger.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.dailyledger.entity.Record;

public interface RecordService {

    /**
     * 创建记账记录
     */
    Record create(Long userId, Record record);

    /**
     * 更新记账记录
     */
    Record update(Long userId, Long recordId, Record record);

    /**
     * 删除记账记录
     */
    void delete(Long userId, Long id);

    /**
     * 分页查询记账记录（offset + limit）
     */
    IPage<Record> page(Long userId, String month, String type, int offset, int limit);

    /**
     * 根据 ID 查询记账记录
     */
    Record getById(Long userId, Long id);
}
