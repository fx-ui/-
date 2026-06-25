package com.dailyledger.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@Data
public class RegisterRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 20, message = "用户名长度2-20个字符")
    @Pattern(regexp = "^[a-zA-Z0-9_\\u4e00-\\u9fa5]+$", message = "用户名只能包含中英文、数字和下划线")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 3, max = 50, message = "密码长度3-50个字符")
    private String password;
}
