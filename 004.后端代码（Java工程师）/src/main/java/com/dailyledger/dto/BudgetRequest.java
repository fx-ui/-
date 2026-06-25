package com.dailyledger.dto;

import lombok.Data;
import javax.validation.constraints.*;
import java.math.BigDecimal;

@Data
public class BudgetRequest {
    private Integer categoryId;   // null = 总预算

    @NotNull(message = "金额不能为空")
    @DecimalMin(value = "0.01", message = "金额必须大于0")
    private BigDecimal amount;

    private String periodType;    // month / week

    private String yearMonth;     // YYYY-MM
}
