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
@TableName("budgets")
public class Budget {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Long userId;
    private Integer categoryId;
    private BigDecimal amount;
    private String periodType;   // month / week
    @TableField("`year_month`")
    private String yearMonth;    // YYYY-MM
    private Integer isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 联表字段
    @TableField(exist = false)
    private String categoryName;
    @TableField(exist = false)
    private String categoryIcon;
    /** 本月此分类已花费 */
    @TableField(exist = false)
    private BigDecimal spent;
}
