package com.dailyledger.service;

import com.dailyledger.entity.Template;

import java.util.List;

public interface TemplateService {

    /**
     * 获取用户所有模板
     */
    List<Template> list(Long userId);

    /**
     * 创建模板
     */
    Template create(Long userId, Template template);

    /**
     * 删除模板
     */
    void delete(Long userId, Integer id);

    /**
     * 更新模板
     */
    void update(Long userId, Integer id, Template template);

    /**
     * 增加模板使用次数
     */
    void incrementUse(Integer id);
}
