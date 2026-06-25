package com.dailyledger.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.dailyledger.entity.Template;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface TemplateMapper extends BaseMapper<Template> {

    /** 获取用户模板（含分类和账户名） */
    @Select("SELECT t.*, c.name AS category_name, c.icon AS category_icon, " +
            "       a.name AS account_name, a.icon AS account_icon " +
            "FROM templates t " +
            "LEFT JOIN categories c ON t.category_id = c.id " +
            "LEFT JOIN accounts a ON t.account_id = a.id " +
            "WHERE t.user_id = #{userId} " +
            "ORDER BY t.use_count DESC, t.sort_order, t.id")
    List<Template> findUserTemplates(@Param("userId") Long userId);

    /** 使用次数 +1 */
    @Update("UPDATE templates SET use_count = use_count + 1 WHERE id = #{id}")
    int incrementUseCount(@Param("id") Integer id);
}
