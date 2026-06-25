package com.dailyledger.dto;

import lombok.Data;
import javax.validation.constraints.*;
import java.math.BigDecimal;

@Data
public class TemplateRequest {
    @NotBlank(message = "名称不能为空")
    @Size(max = 50, message = "模板名称不超过50字符")
    private String name;

    private String type;          // expense / income

    @NotNull(message = "金额不能为空")
    @DecimalMin(value = "0.01", message = "金额必须大于0")
    private BigDecimal amount;

    @NotNull(message = "分类不能为空")
    private Integer categoryId;

    private Integer accountId;
    private String note;
}
