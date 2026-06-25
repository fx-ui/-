package com.dailyledger.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.dailyledger.entity.Record;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface RecordMapper extends BaseMapper<Record> {

    /** 分页查询记录（联表查分类和账户名） */
    @Select("<script>" +
            "SELECT r.*, c.name AS category_name, c.icon AS category_icon, " +
            "       a.name AS account_name, a.icon AS account_icon " +
            "FROM records r " +
            "LEFT JOIN categories c ON r.category_id = c.id " +
            "LEFT JOIN accounts a ON r.account_id = a.id " +
            "WHERE r.user_id = #{userId} AND r.is_deleted = 0 " +
            "<if test='month != null and month != \"\"'> AND DATE_FORMAT(r.record_date, '%Y-%m') = #{month} </if>" +
            "<if test='type != null and type != \"\"'> AND r.type = #{type} </if>" +
            "ORDER BY r.record_date DESC, r.created_at DESC" +
            "</script>")
    Page<Record> findUserRecords(Page<Record> page,
                                 @Param("userId") Long userId,
                                 @Param("month") String month,
                                 @Param("type") String type);

    /** 月度收支汇总 */
    @Select("SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS income, " +
            "       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense " +
            "FROM records WHERE user_id = #{userId} AND is_deleted = 0 " +
            "AND DATE_FORMAT(record_date, '%Y-%m') = #{month}")
    Map<String, Object> monthlySummary(@Param("userId") Long userId, @Param("month") String month);

    /** 分类支出排名 */
    @Select("SELECT c.id, c.name, c.icon, SUM(r.amount) AS total " +
            "FROM records r JOIN categories c ON r.category_id = c.id " +
            "WHERE r.user_id = #{userId} AND r.type = 'expense' AND r.is_deleted = 0 " +
            "AND DATE_FORMAT(r.record_date, '%Y-%m') = #{month} " +
            "GROUP BY c.id, c.name, c.icon ORDER BY total DESC LIMIT #{limit}")
    List<Map<String, Object>> categoryRanking(@Param("userId") Long userId,
                                              @Param("month") String month,
                                              @Param("limit") int limit);

    /** 年度汇总 */
    @Select("SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS income, " +
            "       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense " +
            "FROM records WHERE user_id = #{userId} AND is_deleted = 0 AND YEAR(record_date) = #{year}")
    Map<String, Object> yearlySummary(@Param("userId") Long userId, @Param("year") int year);

    /** 分类统计（饼图） */
    @Select("SELECT c.id, c.name, c.icon, SUM(r.amount) AS total " +
            "FROM records r JOIN categories c ON r.category_id = c.id " +
            "WHERE r.user_id = #{userId} AND r.type = #{type} AND r.is_deleted = 0 " +
            "AND YEAR(r.record_date) = #{year} " +
            "GROUP BY c.id, c.name, c.icon ORDER BY total DESC")
    List<Map<String, Object>> categoryBreakdown(@Param("userId") Long userId,
                                                @Param("year") int year,
                                                @Param("type") String type);

    /** 月度趋势 */
    @Select("SELECT MONTH(record_date) AS month, " +
            "       COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS income, " +
            "       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense " +
            "FROM records WHERE user_id = #{userId} AND is_deleted = 0 AND YEAR(record_date) = #{year} " +
            "GROUP BY MONTH(record_date) ORDER BY month")
    List<Map<String, Object>> monthlyTrend(@Param("userId") Long userId, @Param("year") int year);

    /** 该月某分类已支出金额 */
    @Select("SELECT COALESCE(SUM(amount), 0) FROM records " +
            "WHERE user_id = #{userId} AND type = 'expense' AND is_deleted = 0 " +
            "AND category_id = #{categoryId} AND DATE_FORMAT(record_date, '%Y-%m') = #{month}")
    java.math.BigDecimal categorySpent(@Param("userId") Long userId,
                                       @Param("categoryId") Integer categoryId,
                                       @Param("month") String month);
}
