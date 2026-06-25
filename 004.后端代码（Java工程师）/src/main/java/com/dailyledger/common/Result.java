package com.dailyledger.common;

import java.util.HashMap;
import java.util.Map;

/**
 * 统一响应格式
 */
public class Result {

    private int code;
    private String message;
    private Object data;

    private Result(int code, String message, Object data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static Result ok() {
        return new Result(200, "操作成功", null);
    }

    public static Result ok(String message) {
        return new Result(200, message, null);
    }

    public static Result ok(Object data) {
        return new Result(200, "操作成功", data);
    }

    public static Result ok(String message, Object data) {
        return new Result(200, message, data);
    }

    public static Result created(String message, Object data) {
        return new Result(201, message, data);
    }

    public static Result error(int code, String message) {
        return new Result(code, message, null);
    }

    // 序列化为 JSON 时，data 为空时返回空对象
    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("code", code);
        map.put("message", message);
        map.put("data", data != null ? data : new HashMap<>());
        return map;
    }

    public int getCode() { return code; }
    public String getMessage() { return message; }
    public Object getData() { return data; }
}
