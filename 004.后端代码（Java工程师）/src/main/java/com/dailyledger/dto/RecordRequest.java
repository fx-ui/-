package com.dailyledger.dto;

import lombok.Data;
import javax.validation.constraints.*;
import java.math.BigDecimal;

@Data
public class RecordRequest {
    @NotBlank(message = "类型不能为空")
    @Pattern(regexp = "expense|income", message = "类型只能是 expense 或 income")
    private String type;

    @NotNull(message = "金额不能为空")
    @DecimalMin(value = "0.01", message = "金额必须大于0")
    private BigDecimal amount;

    @NotNull(message = "分类不能为空")
    private Integer categoryId;

    private Integer accountId;

    @NotBlank(message = "日期不能为空")
    private String recordDate;  // YYYY-MM-DD

    private String note;
}
