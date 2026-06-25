package com.dailyledger.controller;

import com.dailyledger.common.Result;
import com.dailyledger.dto.TemplateRequest;
import com.dailyledger.entity.Template;
import com.dailyledger.service.TemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    @Autowired
    private TemplateService templateService;

    /** 获取模板列表 */
    @GetMapping
    public ResponseEntity<Result> list(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Template> templates = templateService.list(userId);
        return ResponseEntity.ok(Result.ok(templates));
    }

    /** 创建模板 */
    @PostMapping
    public ResponseEntity<Result> create(@Valid @RequestBody TemplateRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Template tpl = new Template();
        tpl.setName(req.getName());
        tpl.setType(req.getType() != null ? req.getType() : "expense");
        tpl.setAmount(req.getAmount());
        tpl.setCategoryId(req.getCategoryId());
        tpl.setAccountId(req.getAccountId());
        tpl.setNote(req.getNote());

        Template created = templateService.create(userId, tpl);
        return ResponseEntity.status(201).body(Result.created("模板已创建", created));
    }

    /** 修改模板 */
    @PutMapping("/{id}")
    public ResponseEntity<Result> update(@PathVariable Integer id,
                                          @RequestBody TemplateRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Template tpl = new Template();
        tpl.setName(req.getName());
        tpl.setType(req.getType());
        tpl.setAmount(req.getAmount());
        tpl.setCategoryId(req.getCategoryId());
        tpl.setAccountId(req.getAccountId());
        tpl.setNote(req.getNote());

        templateService.update(userId, id, tpl);
        return ResponseEntity.ok(Result.ok("已更新"));
    }

    /** 使用模板（计数+1） */
    @PostMapping("/{id}/use")
    public ResponseEntity<Result> use(@PathVariable Integer id) {
        templateService.incrementUse(id);
        return ResponseEntity.ok(Result.ok("ok"));
    }

    /** 删除模板 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Result> delete(@PathVariable Integer id,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        templateService.delete(userId, id);
        return ResponseEntity.ok(Result.ok("已删除"));
    }
}
