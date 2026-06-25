# 每日记账 — Spring Boot 后端开发规范

> 版本：V1.0 | 适用：Spring Boot 2.7.x + MyBatis-Plus 3.5 + JDK 8 | 分层架构：Controller → Service → Mapper

---

## 目录

- [一、项目结构规范](#一项目结构规范)
- [二、命名规范](#二命名规范)
- [三、分层职责规范](#三分层职责规范)
- [四、API 接口设计规范](#四api-接口设计规范)
- [五、数据库与 MyBatis-Plus 规范](#五数据库与-mybatis-plus-规范)
- [六、异常处理规范](#六异常处理规范)
- [七、日志规范](#七日志规范)
- [八、安全规范](#八安全规范)
- [九、测试规范](#九测试规范)
- [十、Git 提交规范](#十git-提交规范)

---

## 一、项目结构规范

### 1.1 标准分层目录

```
src/main/java/com/dailyledger/
├── DailyLedgerApplication.java      # 启动类（放在根包下）
├── common/                           # 公共组件
│   ├── Result.java                   # 统一响应体
│   ├── JwtUtils.java                 # JWT 工具
│   └── GlobalExceptionHandler.java   # 全局异常处理
├── config/                           # 配置类
│   ├── MyBatisPlusConfig.java
│   └── WebMvcConfig.java
├── interceptor/                      # 拦截器
│   └── JwtInterceptor.java
├── entity/                           # 数据库实体（PO）
├── dto/                              # 数据传输对象
├── mapper/                           # MyBatis Mapper 接口
├── service/                          # 业务接口
│   └── impl/                         # 业务实现
└── controller/                       # REST 控制器
```

### 1.2 包结构规则

| 规则 | 说明 |
|------|------|
| **单向依赖** | Controller → Service → Mapper，禁止反向依赖 |
| **包隔离** | 不同层之间禁止跨包直接调用 Mapper |
| **循环依赖** | 严禁 Service 之间循环依赖，引入中间协调 Service |
| **DTO 隔离** | Controller 不直接接收 Entity，使用 DTO 包装 |

### 1.3 文件放置规则

| 类型 | 位置 | 示例 |
|------|------|------|
| 启动类 | 根包 | `DailyLedgerApplication.java` |
| 公共常量 | `common/constant/` | `ApiConstants.java` |
| 枚举类 | `common/enums/` | `RecordTypeEnum.java` |
| 工具类 | `common/utils/` | `DateUtils.java` |
| 自定义注解 | `common/annotation/` | `@Log.java` |

---

## 二、命名规范

### 2.1 Java 命名

| 元素 | 风格 | 示例 |
|------|------|------|
| 包名 | 全小写，单数 | `com.dailyledger.controller` |
| 类名 | 大驼峰 | `RecordService`, `RecordServiceImpl` |
| 接口 | 大驼峰，不加 `I` 前缀 | `RecordService` ✅ `IRecordService` ❌ |
| 方法 | 小驼峰，动词开头 | `getById()`, `createRecord()` |
| 常量 | 全大写，下划线分隔 | `MAX_PAGE_SIZE` |
| 变量 | 小驼峰 | `recordDate`, `userId` |
| 实体字段 | 小驼峰（与数据库蛇形映射） | `recordDate` → `record_date` |

### 2.2 方法命名约定

| 操作 | 前缀 | 示例 |
|------|------|------|
| 查询单个 | `get` | `getById(Long id)` |
| 查询列表 | `list` / `find` | `list(Long userId)`, `findByMonth()` |
| 查询分页 | `page` | `page(Long userId, int page, int size)` |
| 新增 | `create` / `add` | `create(Record record)` |
| 修改 | `update` | `update(Long id, Record record)` |
| 删除 | `delete` / `remove` | `delete(Long id)` |
| 判断存在 | `exists` | `existsByUsername(String username)` |
| 计数 | `count` | `countByMonth(String month)` |

### 2.3 数据库命名

| 元素 | 约定 | 示例 |
|------|------|------|
| 表名 | 小写蛇形，复数 | `records`, `categories` |
| 主键 | `id` | `id BIGINT UNSIGNED AUTO_INCREMENT` |
| 外键 | `表名_id` | `user_id`, `category_id` |
| 时间戳 | `created_at`, `updated_at` | MySQL `DATETIME` |
| 布尔标记 | `is_xxx` | `is_deleted`, `is_active` |

---

## 三、分层职责规范

### 3.1 Controller 层

**职责**：接收请求 → 参数校验 → 调用 Service → 返回响应

```java
@RestController
@RequestMapping("/api/records")
public class RecordController {

    @Autowired
    private RecordService recordService;

    @PostMapping
    public ResponseEntity<Result> create(@Valid @RequestBody RecordRequest req,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        // 1. DTO → Entity
        Record record = buildRecord(req);
        // 2. 调用 Service
        Record created = recordService.create(userId, record);
        // 3. 返回统一格式
        return ResponseEntity.status(201).body(Result.created("记账成功", created.getId()));
    }
}
```

**规则**：
- ❌ Controller 禁止包含业务逻辑
- ❌ Controller 禁止直接调用 Mapper
- ✅ 使用 `@Valid` 做参数校验，校验逻辑在 DTO 中
- ✅ 统一返回 `Result` 包装对象
- ✅ 从 `HttpServletRequest.getAttribute("userId")` 获取当前用户

### 3.2 Service 层

**职责**：业务逻辑编排 → 事务管理 → 调用 Mapper

```java
@Service
public class RecordServiceImpl implements RecordService {

    @Autowired
    private RecordMapper recordMapper;
    @Autowired
    private AccountMapper accountMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Record create(Long userId, Record record) {
        record.setUserId(userId);
        // 1. 业务校验
        if (record.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("金额必须大于0");
        }
        // 2. 更新账户余额
        if (record.getAccountId() != null) {
            BigDecimal delta = "income".equals(record.getType())
                ? record.getAmount() : record.getAmount().negate();
            accountMapper.updateBalance(record.getAccountId(), delta);
        }
        // 3. 持久化
        recordMapper.insert(record);
        return record;
    }
}
```

**规则**：
- ✅ 写操作必须加 `@Transactional(rollbackFor = Exception.class)`
- ✅ 涉及多表操作放入事务
- ✅ 业务异常抛 `RuntimeException`，不要返回 `null` 来表示失败
- ❌ Service 不依赖 `HttpServletRequest`

### 3.3 Mapper 层

**职责**：数据访问，只做 CRUD

```java
@Mapper
public interface RecordMapper extends BaseMapper<Record> {

    // 复杂查询写在 Mapper 上，简单 CRUD 用 BaseMapper
    @Select("SELECT * FROM records WHERE user_id = #{userId} AND is_deleted = 0")
    List<Record> findUserRecords(Long userId);
}
```

**规则**：
- ✅ 继承 `BaseMapper<T>`，获取免费 CRUD
- ✅ 复杂查询优先用 `@Select` 注解，超长 SQL 用 XML
- ❌ Mapper 中不写业务判断、不调用其他 Mapper

---

## 四、API 接口设计规范

### 4.1 URL 设计

```
GET    /api/records              # 查询列表（?month=&type=&page=&size=）
POST   /api/records              # 创建记录
PUT    /api/records/{id}         # 更新记录
DELETE /api/records/{id}         # 删除记录

GET    /api/records/{id}         # 查询单条（如有需要）
```

| 规则 | 正确 | 错误 |
|------|------|------|
| URL 用名词复数 | `/api/records` | `/api/getRecord` |
| 动作用 HTTP 方法表示 | `DELETE /api/records/1` | `POST /api/records/delete` |
| 层级关系用路径 | `/api/records/1/comments` | `/api/recordComments?id=1` |
| 驼峰转蛇形 | `?record_date=` | `?recordDate=` |

### 4.2 统一响应格式

```json
// 成功
{ "code": 200, "message": "操作成功", "data": { ... } }

// 创建成功
{ "code": 201, "message": "记账成功", "data": { "id": 1 } }

// 客户端错误
{ "code": 400, "message": "金额不能为空", "data": {} }

// 未登录
{ "code": 401, "message": "未登录，请先登录", "data": {} }

// 服务端错误
{ "code": 500, "message": "服务器内部错误", "data": {} }
```

**规则**：
- ✅ 所有接口返回 `application/json`
- ✅ `data` 为空时返回 `{}`（空对象），不返回 `null`
- ✅ HTTP 状态码与 `code` 字段保持一致

### 4.3 分页请求/响应

**请求**：`GET /api/records?month=2026-06&page=1&size=20`

**响应**：
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [ ... ],
    "total": 156
  }
}
```

---

## 五、数据库与 MyBatis-Plus 规范

### 5.1 Entity 定义

```java
@Data
@TableName("records")
public class Record {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String type;           // expense | income
    private BigDecimal amount;
    private Integer categoryId;
    private Integer accountId;
    private LocalDate recordDate;
    private String note;

    @TableLogic
    private Integer isDeleted;     // 逻辑删除标记

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ---- 联表字段（非表中列） ----
    @TableField(exist = false)
    private String categoryName;
}
```

**规则**：
- ✅ 金额字段统一用 `BigDecimal`，禁止用 `Float` / `Double`
- ✅ 日期用 `LocalDate`（日期）或 `LocalDateTime`（时间戳）
- ✅ 使用 `@TableLogic` 标记逻辑删除字段
- ✅ 蛇形自动映射驼峰，无需每个字段加 `@TableField`
- ❌ 禁止在 Entity 中写业务逻辑

### 5.2 Mapper 接口

```java
@Mapper
public interface RecordMapper extends BaseMapper<Record> {

    // ✅ 复杂查询用注解
    @Select("SELECT r.*, c.name AS category_name FROM records r " +
            "LEFT JOIN categories c ON r.category_id = c.id " +
            "WHERE r.user_id = #{userId} ORDER BY r.id DESC")
    Page<Record> findPage(Page<Record> page, Long userId);

    // ✅ 简单查询直接使用 BaseMapper 方法
    // baseMapper.selectById(id)
    // baseMapper.selectList(wrapper)
    // baseMapper.selectPage(page, wrapper)
}
```

### 5.3 SQL 编写规范

```sql
-- ✅ 用 #{} 参数化，防止注入
@Select("SELECT * FROM records WHERE user_id = #{userId}")

-- ❌ 用 ${} 拼接字符串，有注入风险
@Select("SELECT * FROM records WHERE user_id = ${userId}")

-- ✅ JOIN 用 LEFT JOIN，别名清晰
SELECT r.id, c.name AS category_name
FROM records r
LEFT JOIN categories c ON r.category_id = c.id

-- ❌ 禁止 SELECT *
-- @Select("SELECT * FROM records") ← 生产环境不可用，用具体字段
```

---

## 六、异常处理规范

### 6.1 异常分类

```java
// 1. 业务异常（传 400）
throw new RuntimeException("金额不能为空");

// 2. 资源不存在（传 404）
throw new NoSuchElementException("记录不存在");

// 3. 拒绝操作（传 403）
throw new AccessDeniedException("无权操作此记录");
```

### 6.2 全局异常处理器

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Result> handleRuntime(RuntimeException e) {
        log.error("业务异常: {}", e.getMessage());
        return ResponseEntity.badRequest()
                .body(Result.error(400, e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result> handleUnknown(Exception e) {
        log.error("未捕获异常", e);  // 打印全量堆栈
        return ResponseEntity.status(500)
                .body(Result.error(500, "服务器内部错误"));
    }
}
```

**规则**：
- ✅ 已知的业务异常给出中文提示
- ✅ 未知异常统一返回 `500`，不暴露堆栈给前端
- ✅ 全局异常处理器记录完整堆栈日志
- ❌ Controller 中不要写 `try-catch` 包裹整方法

---

## 七、日志规范

### 7.1 日志级别

| 级别 | 使用场景 |
|------|---------|
| **ERROR** | 系统异常、数据库连接失败、第三方调用失败 |
| **WARN** | 可恢复的异常、降级处理、配置缺失 |
| **INFO** | 关键业务流程、请求响应摘要、定时任务执行 |
| **DEBUG** | 参数详情、SQL 输出、中间计算结果 |

### 7.2 日志写法

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class RecordServiceImpl {
    private static final Logger log = LoggerFactory.getLogger(RecordServiceImpl.class);

    public Record create(Long userId, Record record) {
        log.info("创建记录: userId={}, type={}, amount={}", userId, record.getType(), record.getAmount());
        // ...
        log.debug("记录已保存: id={}", record.getId());
        return record;
    }

    public void doSomething() {
        try {
            // ...
        } catch (Exception e) {
            log.error("操作失败: userId={}", userId, e);  // 第二个参数传异常对象
        }
    }
}
```

**规则**：
- ✅ 使用 Lombok `@Slf4j` 或 `LoggerFactory.getLogger()`
- ✅ 日志用 `{}` 占位符，不用字符串拼接
- ❌ 禁止 `System.out.println()`
- ❌ 禁止在循环中打 `INFO` 级别日志
- ❌ 禁止打印用户密码、Token 等敏感信息

---

## 八、安全规范

### 8.1 JWT 鉴权

```java
// ✅ 路由设计：所有 /api/** 需要登录，auth/login 和 auth/register 除外
registry.addInterceptor(jwtInterceptor)
    .addPathPatterns("/api/**")
    .excludePathPatterns("/api/auth/login", "/api/auth/register", "/api/health");
```

**规则**：
- ✅ Token 通过 `Authorization: Bearer xxx` 头传递
- ✅ JWT 过期时间 7 天，生产环境建议 2 小时
- ✅ 密钥通过 `application.yml` 外部配置，不硬编码
- ❌ Token 不放在 URL 参数中
- ❌ `JWT_SECRET` 不提交到 Git（放到 `.env` 或配置中心）

### 8.2 输入校验

```java
@Data
public class RegisterRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 20, message = "用户名长度2-20个字符")
    @Pattern(regexp = "^[a-zA-Z0-9_\\u4e00-\\u9fa5]+$", message = "用户名只能包含中英文、数字和下划线")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 3, max = 50, message = "密码长度3-50个字符")
    private String password;
}
```

**规则**：
- ✅ 所有 DTO 必须加 `@Valid` + `javax.validation` 注解
- ✅ 字符串字段限制长度（防数据库截断 + DoS）
- ❌ 不在 Controller 中手动 `if` 判空

### 8.3 SQL 注入防护

- ✅ 100% 使用 MyBatis `#{}` 参数化查询
- ❌ 严禁 `${}` 拼接用户输入
- ✅ 动态排序字段用白名单校验

---

## 九、测试规范

### 9.1 测试层级

```
单元测试    → Service 层，Mock Mapper
集成测试    → Controller 层，MockMvc
API 测试    → 启动完整 Spring 上下文
```

### 9.2 测试写法

```java
@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testRegister() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"test\",\"password\":\"123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(201));
    }
}
```

**规则**：
- ✅ 核心 Service 必须有单元测试
- ✅ 测试方法命名：`test + 被测方法 + 场景`
- ✅ 测试类包结构与源码一致

---

## 十、Git 提交规范

### 10.1 分支策略

```
master       → 生产就绪（只接受 merge）
develop      → 开发主线
feature/*    → 功能分支（从 develop 切出）
fix/*        → 修复分支
```

### 10.2 Commit Message 格式

```
<type>: <简短描述>

[可选的详细说明]
```

**类型 `type`**：

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不改变功能） |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `test` | 测试相关 |
| `chore` | 构建/工具变更 |

**示例**：
```
feat: 新增账户管理 CRUD API

- GET /api/accounts 获取账户列表
- POST /api/accounts 新增账户
- DELETE /api/accounts/{id} 删除账户
```

### 10.3 提交频率

- ✅ 每个功能点完成后立即提交
- ✅ 提交粒度 = 一个逻辑变更
- ❌ 不提交编译不过的代码
- ❌ 不提交 `.class`、`target/`、`.log` 等构建产物

---

## 附录：快速检查清单

开发完成后，逐项自查：

- [ ] Controller 只做参数接收和返回，无业务逻辑
- [ ] Service 使用 `@Transactional` 标注写操作
- [ ] 金额字段使用 `BigDecimal`
- [ ] 所有 DTO 有 `@Valid` + 校验注解
- [ ] 统一返回 `Result` 格式
- [ ] 异常不泄露堆栈到前端
- [ ] 日志使用 `{}` 占位符
- [ ] Token 不在代码中硬编码
- [ ] Maven `compile` 零错误

---

> 📌 本规范随项目迭代持续更新。规范不是教条，写代码时优先考虑**可读性**和**一致性**。
