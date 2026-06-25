package com.dailyledger.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.dailyledger.common.Result;
import com.dailyledger.dto.RecordRequest;
import com.dailyledger.entity.Record;
import com.dailyledger.service.RecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    @Autowired
    private RecordService recordService;

    /** 创建记录 */
    @PostMapping
    public ResponseEntity<Result> create(@Valid @RequestBody RecordRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Record record = new Record();
        record.setType(req.getType());
        record.setAmount(req.getAmount());
        record.setCategoryId(req.getCategoryId());
        record.setAccountId(req.getAccountId());
        record.setRecordDate(LocalDate.parse(req.getRecordDate()));
        record.setNote(req.getNote());

        Record created = recordService.create(userId, record);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", created.getId());
        return ResponseEntity.status(201).body(Result.created("记账成功", data));
    }

    /** 查询记录列表（offset + limit 分页，对齐前端） */
    @GetMapping
    public ResponseEntity<Result> list(@RequestParam(defaultValue = "") String month,
                                       @RequestParam(defaultValue = "") String type,
                                       @RequestParam(defaultValue = "0") int offset,
                                       @RequestParam(defaultValue = "20") int limit,
                                       HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        String qMonth = month.isEmpty() ? null : month;
        String qType  = type.isEmpty()  ? null : type;

        IPage<Record> result = recordService.page(userId, qMonth, qType, offset, limit);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", result.getRecords());
        data.put("total", result.getTotal());
        return ResponseEntity.ok(Result.ok(data));
    }

    /** 编辑记录 */
    @PutMapping("/{id}")
    public ResponseEntity<Result> update(@PathVariable Long id,
                                          @Valid @RequestBody RecordRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Record record = new Record();
        record.setType(req.getType());
        record.setAmount(req.getAmount());
        record.setCategoryId(req.getCategoryId());
        record.setAccountId(req.getAccountId());
        record.setRecordDate(LocalDate.parse(req.getRecordDate()));
        record.setNote(req.getNote());

        recordService.update(userId, id, record);
        return ResponseEntity.ok(Result.ok("已更新"));
    }

    /** 删除记录 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Result> delete(@PathVariable Long id,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        recordService.delete(userId, id);
        return ResponseEntity.ok(Result.ok("已删除"));
    }
}
