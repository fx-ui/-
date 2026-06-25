package com.dailyledger.service;

import com.dailyledger.entity.Category;

import java.util.List;

public interface CategoryService {

    /**
     * 获取分类树（支持按类型筛选）
     */
    List<Category> getTree(Long userId, String type);

    /**
     * 添加自定义分类
     */
    Category add(Long userId, Category category);

    /**
     * 删除分类
     */
    void delete(Long userId, Integer id);
}
