package com.dailyledger.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@Data
public class CategoryRequest {
    @NotBlank(message = "名称不能为空")
    @Size(max = 30, message = "分类名不超过30字符")
    private String name;

    private String icon;

    @NotBlank(message = "类型不能为空")
    @Pattern(regexp = "expense|income", message = "类型只能是 expense 或 income")
    private String type;

    private Integer parentId;
}
