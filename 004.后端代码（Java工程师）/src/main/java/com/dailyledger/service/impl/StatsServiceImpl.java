package com.dailyledger.service.impl;

import com.dailyledger.mapper.RecordMapper;
import com.dailyledger.service.StatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatsServiceImpl implements StatsService {

    @Autowired
    private RecordMapper recordMapper;

    @Override
    public Map<String, Object> monthlySummary(Long userId, String month) {
        Map<String, Object> result = recordMapper.monthlySummary(userId, month);
        if (result == null) {
            result = new HashMap<>();
            result.put("month", month);
            result.put("income", BigDecimal.ZERO);
            result.put("expense", BigDecimal.ZERO);
            result.put("balance", BigDecimal.ZERO);
        } else {
            result.put("month", month);
            BigDecimal income = result.get("income") != null
                    ? new BigDecimal(result.get("income").toString()) : BigDecimal.ZERO;
            BigDecimal expense = result.get("expense") != null
                    ? new BigDecimal(result.get("expense").toString()) : BigDecimal.ZERO;
            result.put("balance", income.subtract(expense));
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> categoryRanking(Long userId, String month, int limit) {
        return recordMapper.categoryRanking(userId, month, limit);
    }

    @Override
    public Map<String, Object> yearlySummary(Long userId, int year) {
        Map<String, Object> result = recordMapper.yearlySummary(userId, year);
        if (result == null) {
            result = new HashMap<>();
            result.put("year", year);
            result.put("income", BigDecimal.ZERO);
            result.put("expense", BigDecimal.ZERO);
            result.put("balance", BigDecimal.ZERO);
        } else {
            result.put("year", year);
            BigDecimal income = result.get("income") != null
                    ? new BigDecimal(result.get("income").toString()) : BigDecimal.ZERO;
            BigDecimal expense = result.get("expense") != null
                    ? new BigDecimal(result.get("expense").toString()) : BigDecimal.ZERO;
            result.put("balance", income.subtract(expense));
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> categoryBreakdown(Long userId, int year, String type) {
        return recordMapper.categoryBreakdown(userId, year, type);
    }

    @Override
    public List<Map<String, Object>> monthlyTrend(Long userId, int year) {
        List<Map<String, Object>> rawData = recordMapper.monthlyTrend(userId, year);

        // 将数据库结果转为按月份索引的 Map
        Map<Integer, Map<String, Object>> dataMap = new HashMap<>();
        if (rawData != null) {
            for (Map<String, Object> item : rawData) {
                Object monthObj = item.get("month");
                if (monthObj != null) {
                    int month = ((Number) monthObj).intValue();
                    dataMap.put(month, item);
                }
            }
        }

        // 填充 1-12 月，缺失月份补 0
        List<Map<String, Object>> result = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            if (dataMap.containsKey(m)) {
                result.add(dataMap.get(m));
            } else {
                Map<String, Object> emptyMonth = new HashMap<>();
                emptyMonth.put("month", m);
                emptyMonth.put("income", BigDecimal.ZERO);
                emptyMonth.put("expense", BigDecimal.ZERO);
                result.add(emptyMonth);
            }
        }

        return result;
    }
}
