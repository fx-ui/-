package com.dailyledger.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.dailyledger.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {

    /** 获取某个用户的系统预置 + 自定义分类（树形结构用） */
    @Select("SELECT * FROM categories WHERE (user_id IS NULL OR user_id = #{userId}) AND type = #{type} ORDER BY sort_order")
    List<Category> findUserCategories(@Param("userId") Long userId, @Param("type") String type);

    /** 获取系统预置分类 */
    @Select("SELECT * FROM categories WHERE user_id IS NULL AND type = #{type} ORDER BY sort_order")
    List<Category> findSystemCategories(@Param("type") String type);
}
