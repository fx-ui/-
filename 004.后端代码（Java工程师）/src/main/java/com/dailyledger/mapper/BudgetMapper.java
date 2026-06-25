package com.dailyledger.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.dailyledger.entity.Budget;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface BudgetMapper extends BaseMapper<Budget> {

    /** 查询某用户的预算（含分类信息） */
    @Select("SELECT b.*, c.name AS category_name, c.icon AS category_icon " +
            "FROM budgets b LEFT JOIN categories c ON b.category_id = c.id " +
            "WHERE b.user_id = #{userId} " +
            "AND (b.`year_month` IS NULL OR b.`year_month` = #{month}) " +
            "ORDER BY b.id")
    List<Budget> findUserBudgets(@Param("userId") Long userId, @Param("month") String month);
}
