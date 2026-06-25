package com.dailyledger.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
@TableName("templates")
public class Template {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Long userId;
    private String name;
    private String type;           // expense / income
    private BigDecimal amount;
    private Integer categoryId;
    private Integer accountId;
    private String note;
    private Integer sortOrder;
    private Integer useCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 联表字段
    @TableField(exist = false)
    private String categoryName;
    @TableField(exist = false)
    private String categoryIcon;
    @TableField(exist = false)
    private String accountName;
    @TableField(exist = false)
    private String accountIcon;
}
