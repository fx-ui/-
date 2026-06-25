package com.dailyledger.controller;

import com.dailyledger.common.Result;
import com.dailyledger.dto.CategoryRequest;
import com.dailyledger.entity.Category;
import com.dailyledger.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    /** 获取分类树 */
    @GetMapping
    public ResponseEntity<Result> list(@RequestParam(defaultValue = "expense") String type,
                                        HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        List<Category> tree = categoryService.getTree(userId, type);
        return ResponseEntity.ok(Result.ok(tree));
    }

    /** 新增自定义分类 */
    @PostMapping
    public ResponseEntity<Result> add(@Valid @RequestBody CategoryRequest req,
                                       HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        Category cat = new Category();
        cat.setName(req.getName());
        cat.setIcon(req.getIcon() != null ? req.getIcon() : "📌");
        cat.setType(req.getType());
        cat.setParentId(req.getParentId());

        Category created = categoryService.add(userId, cat);
        return ResponseEntity.status(201).body(Result.created("分类已添加", created));
    }

    /** 删除自定义分类 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Result> delete(@PathVariable Integer id,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        categoryService.delete(userId, id);
        return ResponseEntity.ok(Result.ok("已删除"));
    }
}
