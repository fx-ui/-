package com.dailyledger.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
@TableName("records")
public class Record {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String type;           // expense / income
    private BigDecimal amount;
    private Integer categoryId;
    private Integer accountId;
    private LocalDate recordDate;
    private String note;

    @TableLogic
    private Integer isDeleted;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ---- 联表字段（非表中） ----
    @TableField(exist = false)
    private String categoryName;
    @TableField(exist = false)
    private String categoryIcon;
    @TableField(exist = false)
    private String accountName;
    @TableField(exist = false)
    private String accountIcon;
}
