package com.dailyledger.service.impl;

import com.dailyledger.entity.Category;
import com.dailyledger.mapper.CategoryMapper;
import com.dailyledger.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    private CategoryMapper categoryMapper;

    @Override
    public List<Category> getTree(Long userId, String type) {
        List<Category> allCategories = categoryMapper.findUserCategories(userId, type);

        List<Category> parents = new ArrayList<>();
        List<Category> children = new ArrayList<>();

        for (Category category : allCategories) {
            if (category.getParentId() == null) {
                parents.add(category);
            } else {
                children.add(category);
            }
        }

        for (Category parent : parents) {
            List<Category> subList = new ArrayList<>();
            for (Category child : children) {
                if (child.getParentId().equals(parent.getId())) {
                    subList.add(child);
                }
            }
            parent.setChildren(subList);
        }

        return parents;
    }

    @Override
    public Category add(Long userId, Category category) {
        category.setUserId(userId);
        category.setIsSystem(0);
        if (category.getSortOrder() == null) {
            category.setSortOrder(99);
        }
        category.setCreatedAt(LocalDateTime.now());
        category.setUpdatedAt(LocalDateTime.now());

        categoryMapper.insert(category);
        return category;
    }

    @Override
    public void delete(Long userId, Integer id) {
        Category category = categoryMapper.selectById(id);
        if (category == null) {
            throw new RuntimeException("分类不存在");
        }

        // 只允许删除用户自己的非系统分类
        if (category.getIsSystem() != null && category.getIsSystem() == 1) {
            throw new RuntimeException("系统预置分类不可删除");
        }
        if (!userId.equals(category.getUserId())) {
            throw new RuntimeException("无权删除此分类");
        }

        categoryMapper.deleteById(id);
    }
}
