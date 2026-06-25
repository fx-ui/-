package com.dailyledger.service.impl;

import com.dailyledger.entity.Template;
import com.dailyledger.mapper.TemplateMapper;
import com.dailyledger.service.TemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TemplateServiceImpl implements TemplateService {

    @Autowired
    private TemplateMapper templateMapper;

    @Override
    public List<Template> list(Long userId) {
        return templateMapper.findUserTemplates(userId);
    }

    @Override
    public Template create(Long userId, Template template) {
        template.setUserId(userId);
        if (template.getSortOrder() == null) {
            template.setSortOrder(99);
        }
        if (template.getUseCount() == null) {
            template.setUseCount(0);
        }
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());

        templateMapper.insert(template);
        return template;
    }

    @Override
    public void delete(Long userId, Integer id) {
        Template template = templateMapper.selectById(id);
        if (template == null) {
            throw new RuntimeException("模板不存在");
        }
        if (!template.getUserId().equals(userId)) {
            throw new RuntimeException("无权删除此模板");
        }

        templateMapper.deleteById(id);
    }

    @Override
    public void update(Long userId, Integer id, Template template) {
        Template existing = templateMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("模板不存在");
        }
        if (!existing.getUserId().equals(userId)) {
            throw new RuntimeException("无权修改此模板");
        }

        if (template.getName() != null) existing.setName(template.getName());
        if (template.getType() != null) existing.setType(template.getType());
        if (template.getAmount() != null) existing.setAmount(template.getAmount());
        if (template.getCategoryId() != null) existing.setCategoryId(template.getCategoryId());
        if (template.getAccountId() != null) existing.setAccountId(template.getAccountId());
        if (template.getNote() != null) existing.setNote(template.getNote());
        existing.setUpdatedAt(LocalDateTime.now());

        templateMapper.updateById(existing);
    }

    @Override
    public void incrementUse(Integer id) {
        templateMapper.incrementUseCount(id);
    }
}
