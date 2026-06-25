package com.dailyledger.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
@TableName("categories")
public class Category {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Long userId;
    private Integer parentId;
    private String name;
    private String icon;
    private String type;       // expense / income
    private Integer sortOrder;
    private Integer isSystem;  // 1=系统预置, 0=用户自定义
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 非表字段 — 子分类
    @TableField(exist = false)
    private java.util.List<Category> children;
}
