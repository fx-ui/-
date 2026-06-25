package com.dailyledger.controller;

import com.dailyledger.common.Result;
import com.dailyledger.service.StatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired
    private StatsService statsService;

    /** 月度收支总览 */
    @GetMapping("/monthly-summary")
    public ResponseEntity<Result> monthlySummary(@RequestParam String month,
                                                  HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        Map<String, Object> summary = statsService.monthlySummary(userId, month);
        return ResponseEntity.ok(Result.ok(summary));
    }

    /** 分类支出排名 */
    @GetMapping("/category-ranking")
    public ResponseEntity<Result> categoryRanking(@RequestParam String month,
                                                   @RequestParam(defaultValue = "3") int limit,
                                                   HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Map<String, Object>> ranking = statsService.categoryRanking(userId, month, limit);
        return ResponseEntity.ok(Result.ok(ranking));
    }

    /** 年度收支总览 */
    @GetMapping("/yearly-summary")
    public ResponseEntity<Result> yearlySummary(@RequestParam int year,
                                                 HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        Map<String, Object> summary = statsService.yearlySummary(userId, year);
        return ResponseEntity.ok(Result.ok(summary));
    }

    /** 分类统计（饼图） */
    @GetMapping("/category-breakdown")
    public ResponseEntity<Result> categoryBreakdown(@RequestParam int year,
                                                     @RequestParam(defaultValue = "expense") String type,
                                                     HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Map<String, Object>> breakdown = statsService.categoryBreakdown(userId, year, type);
        return ResponseEntity.ok(Result.ok(breakdown));
    }

    /** 月度趋势 */
    @GetMapping("/monthly-trend")
    public ResponseEntity<Result> monthlyTrend(@RequestParam int year,
                                                HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Map<String, Object>> trend = statsService.monthlyTrend(userId, year);
        return ResponseEntity.ok(Result.ok(trend));
    }

    /** 导出 CSV（含 BOM，Excel 可正确识别中文） */
    @GetMapping("/export")
    public void exportCsv(@RequestParam int year,
                           HttpServletRequest request,
                           HttpServletResponse response) throws IOException {
        Long userId = (Long) request.getAttribute("userId");

        Map<String, Object> summary = statsService.yearlySummary(userId, year);
        List<Map<String, Object>> breakdown = statsService.categoryBreakdown(userId, year, "expense");
        List<Map<String, Object>> trend = statsService.monthlyTrend(userId, year);

        response.setContentType("text/csv; charset=utf-8");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"daily-ledger-" + year + ".csv\"");

        PrintWriter writer = response.getWriter();
        // BOM for Excel UTF-8
        writer.print('﻿');

        writer.println(year + "年 每日记账统计报告");
        writer.println();
        writer.println("年度总览");
        writer.println("全年收入,全年支出,全年结余");
        writer.println(summary.get("income") + "," + summary.get("expense") + ","
                + summary.get("balance"));
        writer.println();
        writer.println("分类统计");
        writer.println("分类,金额");
        for (Map<String, Object> c : breakdown) {
            writer.println(c.get("name") + "," + c.get("total"));
        }
        writer.println();
        writer.println("月度趋势");
        writer.println("月份,收入,支出,结余");
        for (Map<String, Object> m : trend) {
            BigDecimal inc = m.get("income") != null
                    ? new BigDecimal(m.get("income").toString()) : BigDecimal.ZERO;
            BigDecimal exp = m.get("expense") != null
                    ? new BigDecimal(m.get("expense").toString()) : BigDecimal.ZERO;
            writer.println(m.get("month") + "月," + inc + "," + exp + ","
                    + inc.subtract(exp));
        }
        writer.flush();
    }
}
