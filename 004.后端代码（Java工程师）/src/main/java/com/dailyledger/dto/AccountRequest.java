package com.dailyledger.dto;

import lombok.Data;
import javax.validation.constraints.*;
import java.math.BigDecimal;

@Data
public class AccountRequest {
    @NotBlank(message = "账户名称不能为空")
    @Size(max = 30, message = "账户名称不超过30字符")
    private String name;

    private String icon;

    @Pattern(regexp = "cash|bank|ewallet|other", message = "类型无效")
    private String type;

    private BigDecimal initialBalance;
}
