package com.dailyledger.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    @javax.validation.constraints.Size(min = 1, max = 30, message = "昵称长度1-30个字符")
    private String nickname;
    private String avatarUrl;
}
