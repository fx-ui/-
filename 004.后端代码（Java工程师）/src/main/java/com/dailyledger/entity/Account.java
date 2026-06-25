package com.dailyledger.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
@TableName("accounts")
public class Account {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Long userId;
    private String name;
    private String icon;
    private String type;        // cash / bank / ewallet / other
    private BigDecimal balance;
    private BigDecimal initialBalance;
    private Integer isDefault;
    private Integer sortOrder;
    private String remark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
