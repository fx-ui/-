package com.dailyledger.service;

import java.util.List;
import java.util.Map;

public interface StatsService {

    /**
     * 月度收支汇总
     */
    Map<String, Object> monthlySummary(Long userId, String month);

    /**
     * 分类排行
     */
    List<Map<String, Object>> categoryRanking(Long userId, String month, int limit);

    /**
     * 年度汇总
     */
    Map<String, Object> yearlySummary(Long userId, int year);

    /**
     * 年度分类收支明细
     */
    List<Map<String, Object>> categoryBreakdown(Long userId, int year, String type);

    /**
     * 月度趋势
     */
    List<Map<String, Object>> monthlyTrend(Long userId, int year);
}
