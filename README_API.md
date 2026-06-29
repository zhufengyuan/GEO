# GEO API（FastAPI）接口文档

> 基于项目实际代码整理，与 backend/main.py 中路由注册完全一致。
> 接口基础路径：`/api/v1`

## 配置项说明

后端配置文件：backend/config.py（Settings 类）

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| DEBUG | bool | True | 调试模式：开启日志中间件、CORS 放开为 * |
| DB_HOST | str | "1.117.188.4" | MySQL 地址 |
| DB_USER | str | "root" | MySQL 用户 |
| DB_PASSWORD | str | "3POKJzGCs3JNdhum" | MySQL 密码 |
| DB_NAME | str | "geo" | 数据库名 |
| DB_PORT | int | 3306 | MySQL 端口 |
| DB_CHARSET | str | "utf8mb4" | 字符集 |
| JWT_SECRET | str | "change-me-in-production" | JWT 签名密钥（生产环境务必更换） |
| JWT_ALGORITHM | str | "HS256" | JWT 算法 |
| JWT_ACCESS_EXPIRE_MINUTES | int | 15 | Access Token 有效期 |
| JWT_REFRESH_EXPIRE_DAYS | int | 30 | Refresh Token 有效期 |
| AUTH_DISABLED | bool | True | 跳过认证开关（生产环境设为 False） |
| DEV_USER_ID | int | 1 | 开发模式默认用户 ID |
| LLM_URL | str | "http://1.117.188.4:5200/wenxinqianfan" | 大模型服务地址 |
| WENXIN_API_KEY | str | "z9LQiF34PzazRt3Bhenu0ey9" | 文心千帆 Key |
| WENXIN_SECRET_KEY | str | "n9FLmBesVrDy9V8qlStA8b0VkgujXoZl" | 文心千帆 Secret |
| OFFICIAL_MEDIA_EXCEL | str | 自动指向 data/.xls | 媒体报价 Excel 文件路径 |
| OFFICIAL_PUBLISH_PARTNER_URL | str | "" | （可选）官媒发布渠道对接地址（用于 `/official-publish/submit` 转发） |
| OFFICIAL_PUBLISH_PARTNER_TOKEN | str | "" | （可选）官媒发布渠道鉴权 Token（Bearer） |
| CORS_ORIGINS | List[str] | [localhost:4510, localhost:8000] | CORS 白名单 |

## 启动方式

```bash
# 项目根目录执行
cd GEO
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 生产环境（多 Worker）
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 4
```

启动时自动执行 migrations/ 下 22 个 SQL 迁移脚本。

静态资源说明：

- 前端 SPA：`/`
- 上传文件：`/uploads/*`
- 数据文件：`/data/*`
- 大模型 SVG 图标：`/llm-svg/*`

### MySQL 授权示例

如果你的环境同时包含以下连接方式：

- 服务器本机通过 `localhost` 连接
- 服务器本机通过公网 IP `YOUR_PUBLIC_IP` 连接自己
- 本地电脑通过公网 IP `YOUR_PUBLIC_IP` 远程连接

可以参考以下授权方式：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_root_password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;

ALTER USER 'root'@'%' IDENTIFIED BY 'your_root_password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

CREATE USER IF NOT EXISTS 'root'@'YOUR_PUBLIC_IP' IDENTIFIED BY 'your_root_password';
ALTER USER 'root'@'YOUR_PUBLIC_IP' IDENTIFIED BY 'your_root_password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'YOUR_PUBLIC_IP' WITH GRANT OPTION;

CREATE USER IF NOT EXISTS 'root'@'YOUR_PUBLIC_IP' IDENTIFIED BY 'your_root_password';
ALTER USER 'root'@'YOUR_PUBLIC_IP' IDENTIFIED BY 'your_root_password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'YOUR_PUBLIC_IP' WITH GRANT OPTION;

FLUSH PRIVILEGES;
```

若应用只需要访问业务库，也可以改为：

```sql
CREATE USER 'geo_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON geo.* TO 'geo_user'@'localhost';
FLUSH PRIVILEGES;
```

当后端进程通过公网 IP 或固定出口 IP 连接数据库时，请将 `localhost` 替换为实际来源 IP，或额外增加对应授权记录。

## 统一响应格式

所有接口均返回 JSON：

成功：
```json
{"success": true, "data": {}, "error": null}
```

失败：
```json
{"success": false, "data": null, "error": {"code": "...", "message": "..."}}
```

## 错误码与 HTTP 状态码映射

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| INVALID_CREDENTIALS | 401 | 手机号或密码错误 |
| TOKEN_EXPIRED | 401 | Token 已过期 |
| UNAUTHORIZED | 401 | 未认证 |
| INSUFFICIENT_BALANCE | 402 | 余额不足 |
| SUBSCRIPTION_EXPIRED | 403 | 订阅已过期 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| DUPLICATE | 409 | 重复数据（如手机号已注册） |
| RATE_LIMIT | 429 | 请求频率限制 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| INVALID_TOKEN | 401 | Token 无效 |

> 映射关系定义在 backend/utils/api_response.py 的 status_map 中。

## 认证机制

除标注**无需认证**的接口外，其余均需携带 JWT Token：

```
Authorization: Bearer <accessToken>
```

Token 获取：通过 POST /api/v1/auth/login 登录获得。JWT 使用纯 HmacSHA256 实现（无第三方库依赖）。

开发模式（AUTH_DISABLED=True）：所有接口自动以 DEV_USER_ID=1 身份运行，无需 Token。

---

## 免认证公共接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/health` | 健康检查 |
| GET | `/api/v1/plans` | 套餐列表 |
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/register` | 注册 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |

---

## 1. 认证模块 `/api/v1/auth`

代理自 backend/auth/routes.py，白名单：login / register / refresh 无需认证。

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/login` | 否 | 手机号 + 密码登录 |
| POST | `/register` | 否 | 新用户注册 |
| POST | `/refresh` | 否 | 刷新 Access Token |
| POST | `/logout` | 是 | 登出（前端清除 Token 即可） |
| GET | `/me` | 是 | 获取当前登录用户信息 |

### 1.1 登录

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "your_password"
}
```

响应（成功）：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

响应（失败）：
```json
{
  "success": false,
  "data": null,
  "error": {"code": "INVALID_CREDENTIALS", "message": "手机号或密码错误"}
}
```

### 1.2 注册

```
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "your_password",
  "real_name": "张三"
}
```

real_name 为可选字段。注册成功自动返回 Token 对。

响应（手机号已存在）：
```json
{
  "success": false,
  "data": null,
  "error": {"code": "DUPLICATE", "message": "手机号已注册"}
}
```

### 1.3 刷新 Token

```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

响应：
```json
{
  "success": true,
  "data": {
    "accessToken": "新的access_token"
  }
}
```

### 1.4 获取当前用户

```
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

响应：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phone": "13800138000",
    "real_name": "张三",
    "is_real_name_verified": false
  }
}
```

---

## 2. 多租户管理 `/api/v1/tenants`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 我的租户列表 |
| POST | `/` | 是 | 创建租户 |
| PUT | `/{tid}` | 是 | 更新租户信息 |
| POST | `/{tid}/switch` | 是 | 切换当前激活租户 |

### 2.1 创建租户

```
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "企业名称",
  "industry": "行业"
}
```

### 2.2 更新租户

```
PUT /api/v1/tenants/1
Content-Type: application/json

{
  "name": "新名称",
  "industry": "新行业"
}
```

### 2.3 切换租户

```
POST /api/v1/tenants/1/switch
```

---

## 3. 问题词库 `/api/v1/question-words`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 词库列表（分页） |
| GET | `/by-lexicon` | 是 | 某词库下的问题词列表 |
| GET | `/items` | 是 | 同 by-lexicon（别名） |
| GET | `/suggest` | 是 | 问题词联想（?q=关键词） |
| POST | `/` | 是 | 创建词库（自动收集关键词 + 调用 LLM 生成问题列表 + 生成拓展词） |
| DELETE | `/` | 是 | 批量删除词库（同时删除关联 question_words） |

### 3.1 词库列表

```
GET /api/v1/question-words?page=1&page_size=20
```

查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页条数（最大 500） |
| lexicon_id | int | — | 传此参数时走 by-lexicon 分支 |

响应：
```json
{
  "success": true,
  "data": {
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": 1,
        "name": "",
        "company": "某企业",
        "industry_keyword": "智能水表",
        "decision_stage": "对比阶段",
        "words": {"region": "华东", "feature": "NB-IoT", "scene": "智慧城市", "people": "物业"},
        "question_keyword": "智能水表",
        "first_question": "智能水表",
        "question_count": 30,
        "created_at": "2026-05-31 12:00:00"
      }
    ]
  }
}
```

### 3.2 创建词库

```
POST /api/v1/question-words
Content-Type: application/json

{
  "name": "",
  "company": "某企业",
  "industry_keyword": "智能水表",
  "decision_stage": "对比阶段",
  "words": {
    "region": "华东",
    "feature": "NB-IoT",
    "scene": "智慧城市",
    "people": "物业"
  },
  "keywords": ["智能水表", "华东", "NB-IoT", "智慧城市", "物业"],
  "question_keyword": "智能水表"
}
```

> keywords 为空时，自动从 words 对象中提取 region/feature/scene/people + industry_keyword 拼接。
> 创建成功后先调用 `question_words_prompt.txt` 生成问题列表并写入 `question_words` 表；若生成失败，则回退为保存种子关键词。
> 同时调用 `expand_words_prompt.txt` 生成拓展词（近义词/相关词），存入 `lexicons.expand_words`。

### 3.3 批量删除词库

```
DELETE /api/v1/question-words
Content-Type: application/json

[1, 2, 3]
```

Body 为 int[]，同时删除关联的 question_words 记录。仅删除属于当前用户的词库。

### 3.4 某词库下的问题词列表

```
GET /api/v1/question-words/by-lexicon?lexicon_id=1
GET /api/v1/question-words/items?lexicon_id=1
```

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {"seq_no": 1, "question_text": "智能水表"},
      {"seq_no": 2, "question_text": "华东"},
      {"seq_no": 3, "question_text": "NB-IoT"}
    ],
    "lexicon_id": 1
  }
}
```

### 3.5 问题词联想

```
GET /api/v1/question-words/suggest?q=关键词&limit=10
```

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "lexicon_id": 1,
        "question_text": "智能水表",
        "lexicon_name": "某词库",
        "created_at": "2026-06-04 10:00:00"
      }
    ]
  }
}
```

---

## 4. 文章模块 `/api/v1/articles`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 文章列表（分页 + 关键词搜索） |
| POST | `/` | 是 | 创建文章（调用 LLM 生成内容） |
| GET | `/{aid}` | 是 | 文章详情 |
| PUT | `/{aid}` | 是 | 编辑文章标题或正文 |
| POST | `/{aid}/review` | 是 | 文章审核（设置 review_status 等字段） |
| DELETE | `/{aid}` | 是 | 删除文章 |

### 4.1 文章列表

```
GET /api/v1/articles?page=1&page_size=20&keyword=关键词
```

查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页条数 |
| keyword | string | — | 标题模糊搜索 |

### 4.2 创建文章

```
POST /api/v1/articles
Content-Type: application/json

{
  "tab": "product",
  "lexicon_id": 1,
  "question_text": "智能水表",
  "platforms": ["知乎", "公众号"],
  "article_type": "产品宣传",
  "style": "专业严谨",
  "tone": "客观中立",
  "brand_embed": true,
  "title": "",
  "activity_image": "",
  "user_input": "",
  "product": null,
  "products": [],
  "images": []
}
```

请求参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tab | string | 是 | 文章类型：product（产品宣传）/ brand（企业品牌）/ activity（主题活动创作） |
| lexicon_id | int | 是 | 关联的词库 ID |
| question_text | string | 是 | 问题词 |
| platforms | string[] | 是 | 目标发布平台列表 |
| article_type | string | 否 | 不传则按 tab 映射 |
| style | string | 否 | 文章风格（专业严谨/通俗易懂等） |
| tone | string | 否 | 语调（客观中立/积极正面等） |
| brand_embed | bool | 否 | 是否嵌入品牌信息 |
| title | string | 否 | 不传则从 LLM 输出提取 |
| activity_image | string | 否 | 主题活动图片（可选，URL 或 dataURL） |
| user_input | string | 否 | 用户补充输入（产品宣传创作会承载对话摘要） |
| product | object | 否 | 选中的产品信息（单选，兼容旧版本） |
| products | object[] | 否 | 选中的产品信息（多选，最多3个；用于产品宣传创作增强） |
| images | object[] | 否 | 插入图片列表（最多3张） |

> 后端会根据 tab 选择对应的提示词模板（article_product_prompt.txt / article_brand_prompt.txt / article_activity_prompt.txt），
> 获取企业信息 + 词库信息 → render_prompt() → 调用 LLM → 提取标题和正文 → 存入 articles 表。

响应：
```json
{
  "success": true,
  "data": {
    "article_id": 10,
    "title": "智能水表行业深度解析",
    "content": "文章正文..."
  }
}
```

### 4.3 编辑文章

```
PUT /api/v1/articles/10
Content-Type: application/json

{
  "title": "新标题",
  "content": "新内容"
}
```

title 和 content 至少传一个。

---

## 5. AI 任务模块 `/api/v1/ai`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/models` | 是 | 可用大模型列表 |
| POST | `/execute` | 是 | 执行 AI 任务（核心接口，支持多种任务） |
| GET | `/tasks/{tid}` | 是 | 任务状态轮询 |

### 5.1 模型列表

```
GET /api/v1/ai/models
Authorization: Bearer <accessToken>
```

响应：
```json
{
  "success": true,
  "data": {
    "models": [
      {"id": "wenxin", "name": "文心一言"},
      {"id": "doubao", "name": "豆包"},
      {"id": "kimi", "name": "Kimi"},
      {"id": "qwen", "name": "通义千问"}
    ]
  }
}
```

### 5.2 执行 AI 任务

```
POST /api/v1/ai/execute
Content-Type: application/json

{
  "task": "generate_title",
  "lexicon_id": 1,
  "keyword": "",
  "hint": "",
  "page_context": "",
  "input": ""
}
```

支持的 task 类型（节选，按项目代码同步）：

| task 值 | 说明 | 使用的模板文件 | 额外参数 |
|---------|------|----------------|----------|
| generate_title | 生成标题建议 | title_prompt.txt | keyword, hint |
| generate_activity_desc | 生成主题活动描述 | activity_desc_prompt.txt | keyword, hint |
| generate_kb_profile | 生成企业档案 | kb_profile_prompt.txt | — |
| generate_kb_library | 生成企业文库 | kb_library_prompt.txt | — |
| generate_kb_timeline | 生成发展历程 | kb_timeline_prompt.txt | — |
| generate_kb_positioning_main | 生成企业定位（主定位） | kb_positioning_prompt.txt | — |
| generate_kb_positioning_sub | 生成企业定位（子定位） | kb_positioning_prompt.txt | — |
| data_diagnosis | 基础数据诊断 | data_diagnosis_prompt.txt | manual 或 input、page_context |
| website_diagnosis | 官网诊断 | website_diagnosis_prompt.txt | page_context |
| competitor_analysis | 竞争对手分析 | competitor_analysis_prompt.txt | competitors 或 input、page_context |
| diagnosis_report | 诊断报告 | diagnosis_report_prompt.txt | input、llm_name 或 model_name、page_context |
| optimization_plan | 优化方案 | optimization_plan_prompt.txt | — |
| optimization_schedule | 优化排期 | optimization_schedule_prompt.txt | — |
| acceptance_score | 验收评分 | acceptance_score_prompt.txt | — |
| article_product_chat | 产品宣传对话采集（只提问） | article_product_chat_prompt.txt | lexicon_id, question_text, history, products/images(可选) |
| article_product_generate | 产品宣传生成（基于对话历史） | article_product_prompt.txt | lexicon_id, question_text, history, products/images(可选) |
| article_writing_init_chat | 文章创作页初始化打招呼 | article_writing_init_chat_prompt.txt | lexicon_id(可选), question_text(可选), products/images(可选) |

响应：
```json
{
  "success": true,
  "data": {
    "text": "AI 生成的内容..."
  }
}
```

### 5.3 任务状态轮询

```
GET /api/v1/ai/tasks/{tid}
Authorization: Bearer <accessToken>
```

---

### 5.4 工具与导出（通用能力）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/tools/summarize-urls` | 是 | 抓取多个 URL 页面内容并归纳摘要（用于“手动输入诊断”等场景） |
| POST | `/api/v1/export/word` | 是 | 通用 Word 导出（传 title/text，返回 .doc） |
| POST | `/api/v1/export/excel` | 是 | 通用 Excel 导出（传 title + rows，返回 .xlsx） |

#### 5.4.1 URL 抓取归纳

```
POST /api/v1/tools/summarize-urls
Content-Type: application/json

{
  "urls": ["https://example.com/a", "https://example.com/b"]
}
```

响应：
```json
{
  "success": true,
  "data": {
    "urls": ["https://example.com/a", "https://example.com/b"],
    "summary": "归纳后的要点摘要..."
  }
}
```

#### 5.4.2 Word 导出

```
POST /api/v1/export/word
Content-Type: application/json

{
  "title": "企业介绍",
  "text": "正文内容..."
}
```

#### 5.4.3 Excel 导出

```
POST /api/v1/export/excel
Content-Type: application/json

{
  "title": "表格导出",
  "rows": [
    ["列1", "列2"],
    ["a", "b"]
  ]
}
```

---

## 6. 媒体资源模块 `/api/v1/official-media`

数据来源于 OFFICIAL_MEDIA_EXCEL 配置的 Excel 文件（pandas 读取）。

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 媒体资源列表（分页 + 筛选） |
| GET | `/summary` | 是 | Excel 摘要（sheet 数、总行数） |

### 6.1 媒体资源列表

```
GET /api/v1/official-media?page=1&page_size=50&keyword=科技&media_type=&sheet=
Authorization: Bearer <accessToken>
```

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码 |
| page_size | int | 每页条数 |
| keyword | string | 全文搜索关键词 |
| media_type | string | 类型筛选 |
| sheet | string | Sheet 名称筛选 |

### 6.2 Excel 摘要

```
GET /api/v1/official-media/summary
Authorization: Bearer <accessToken>
```

响应示例：
```json
{
  "success": true,
  "data": {
    "sheets": ["网站媒体", "官方自媒体"],
    "total_rows": 1523
  }
}
```

---

## 7. 发布记录模块 `/api/v1/publish-records`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/` | 是 | 记录发布（文章 + 平台，支持批量） |
| POST | `/link` | 是 | 设置发布链接（需要 publish_records.link_url 字段） |
| GET | `/` | 是 | 发布记录列表（聚合展示） |

### 7.1 记录发布

```
POST /api/v1/publish-records
Content-Type: application/json

{
  "article_ids": [10, 11],
  "platforms": ["zhihu", "wechat", "xiaohongshu"],
  "links": {
    "zhihu": "https://www.zhihu.com/xxx"
  }
}
```

> 支持别名 articleIds 和 platformCodes。
> 平台代码自动映射为中文显示名：zhihu → 知乎、wechat → 公众号、xiaohongshu → 小红书 等。
> 使用 INSERT ... ON DUPLICATE KEY UPDATE，重复发布同一文章到同一平台时累加计数。

### 7.2 设置发布链接

```
POST /api/v1/publish-records/link
Content-Type: application/json

{
  "article_id": 10,
  "platform_code": "zhihu",
  "link_url": "https://www.zhihu.com/xxx"
}
```

> 仅当 `publish_records` 表存在 `link_url` 字段时可用（对应迁移脚本 `020_alter_publish_records_add_link.sql`）。

### 7.2 发布记录列表

```
GET /api/v1/publish-records?keyword=关键词&start_date=2026-01-01&end_date=2026-05-31&limit=200&flat=0
Authorization: Bearer <accessToken>
```

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| keyword | string | 文章标题搜索 |
| start_date | string | 发布时间起始（YYYY-MM-DD） |
| end_date | string | 发布时间截止（YYYY-MM-DD） |
| limit | int | 最大返回条数 |
| flat | int | 1：返回明细行（每行=文章+平台）；0：返回聚合行（默认） |

响应（聚合格式，同一文章的多平台发布合并为一条）：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "article_id": 10,
        "title": "文章标题",
        "created_at": "2026-05-31 12:00:00",
        "article_type": "产品宣传",
        "publish_at": "2026-05-31 15:00:00",
        "platforms": "知乎、公众号、小红书",
        "platform_num": 3,
        "platform_publish_counts": "知乎(2)、公众号(1)、小红书(1)",
        "publish_count": 4
      }
    ]
  }
}
```

---

## 8. 知识库模块 `/api/v1/knowledge-base`

使用 section 分区存储 JSON 格式数据，实际对应 knowledge_base_sections 表。

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 获取知识库分区数据 |
| POST | `/save` | 是 | 保存知识库分区数据 |
| POST | `/graph` | 是 | 生成企业知识图谱（返回节点、关系与统计信息） |
| POST | `/products/import` | 是 | 导入产品 Excel |

### 8.1 获取知识库分区

```
GET /api/v1/knowledge-base?section=企业基础信息
Authorization: Bearer <accessToken>
```

常用 section 值：

| section | 说明 |
|---------|------|
| 企业基础信息 | 企业基本信息（自动同步到 enterprise_base_info 表） |
| docs | 文档 |
| company_profile | 企业档案（AI 生成） |
| enterprise_library | 企业文库（AI 生成） |
| timeline_text | 发展历程（AI 生成） |
| extras | 额外信息 |

### 8.2 保存知识库分区

```
POST /api/v1/knowledge-base/save
Content-Type: application/json

{
  "section": "企业基础信息",
  "data": {
    "企业全称": "某某科技有限公司",
    "企业简称": "某某科技",
    "主营产品": "智能水表、智能燃气表",
    "目标客户": "自来水公司、物业公司",
    "企业地址": "北京市朝阳区xxx",
    "企业联系方式": "010-12345678",
    "企业网站": "https://www.example.com",
    "企业优势": "...",
    "产品优势": "...",
    "技术优势": "...",
    "销售区域": "...",
    "销售渠道": "...",
    "extras": ""
  }
}
```

> 当 section 为"企业基础信息"时，自动同步写入 enterprise_base_info 表。
> 使用 INSERT ... ON DUPLICATE KEY UPDATE（UNIQUE KEY: user_id + section）实现幂等保存。

### 8.3 生成企业知识图谱

```
POST /api/v1/knowledge-base/graph
Content-Type: application/json

{
  "base": {
    "企业全称": "某某科技有限公司",
    "企业简称": "某某科技",
    "主营产品": "智能水表",
    "目标客户": "物业公司"
  },
  "docs": {
    "company_profile": "企业简介...",
    "enterprise_library": "企业介绍..."
  },
  "positioning": {
    "main_positioning": "主营定位",
    "sub_positioning": "细分定位"
  }
}
```

说明：

- 后端会合并已保存的知识库内容与本次请求体中的 `base / docs / positioning`。
- 返回值包含 `graph.nodes`、`graph.relationships` 以及 `meta.company_name / node_count / relationship_count / completeness / summary_lines` 等统计信息。
- 前端知识图谱弹窗据此渲染 SVG 图谱，并支持滚轮缩放与右侧按钮缩放。

### 8.4 导入产品 Excel

```
POST /api/v1/knowledge-base/products/import
Content-Type: multipart/form-data

file: <xlsx/xls 文件>
```

> 自动识别列名关键词（产品名称、核心功能、特点优势等），最多解析 200 行。

---

## 9. 文件管理模块 `/api/v1/files`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/upload` | 是 | 上传文件 |
| GET | `/` | 是 | 文件列表 |
| GET | `/{fid}` | 是 | 下载/查看文件 |
| DELETE | `/{fid}` | 是 | 删除文件 |

### 9.1 上传文件

```
POST /api/v1/files/upload
Content-Type: multipart/form-data

file: <文件>
```

响应：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "/uploads/abc123.png",
    "filename": "原始文件名.png"
  }
}
```

> 文件存储在 data/uploads/ 目录，URL 前缀 /uploads/（URL 不变，仅真实目录迁移）。
> 同时记录到 enterprise_images 表（如存在）。

### 9.2 文件列表

```
GET /api/v1/files?page=1&page_size=20
Authorization: Bearer <accessToken>
```

---

## 10. 账单模块 `/api/v1/billing`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/consume` | 是 | 记录一次消耗 |
| GET | `/balance` | 是 | 余额查询 |
| GET | `/transactions` | 是 | 流水查询（分页） |

### 10.1 记录消耗

```
POST /api/v1/billing/consume
Content-Type: application/json

{
  "event_type": "article",
  "page": "article-writing",
  "action": "generate",
  "units": 1,
  "amount": 10,
  "currency": "CNY"
}
```

> 支持别名 eventType。数据存入 consumption_details 表。

### 10.2 余额查询

```
GET /api/v1/billing/balance
Authorization: Bearer <accessToken>
```

### 10.3 流水查询

```
GET /api/v1/billing/transactions?page=1&page_size=20&event_type=article
Authorization: Bearer <accessToken>
```

---

## 11. 监测任务模块 `/api/v1/monitor-tasks`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 监测任务列表 |
| POST | `/` | 是 | 创建监测任务 |
| PUT | `/{tid}` | 是 | 更新任务状态（暂停/恢复） |
| DELETE | `/{tid}` | 是 | 删除监测任务 |

### 11.1 创建监测任务

```
POST /api/v1/monitor-tasks
Content-Type: application/json

{
  "keyword": "智能水表",
  "platforms": ["zhihu", "weibo", "toutiao"]
}
```

### 11.2 更新任务状态

```
PUT /api/v1/monitor-tasks/1
Content-Type: application/json

{
  "status": "paused"
}
```

status 取值：active（活跃）/ paused（暂停）。

---

## 12. 诊断文件模块 `/api/v1/diagnosis-files`

诊断结果以文本文件形式存储在 data/uploads/ 目录，支持保存、读取、下载（转为 .doc）、清除。

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/save` | 是 | 保存诊断结果文本 |
| GET | `/get` | 是 | 获取诊断结果文本 |
| GET | `/download` | 是 | 下载 Word 文档（.doc 格式，HTML 内容） |
| POST | `/clear` | 是 | 清除指定任务的诊断文件 |

### 12.1 保存诊断结果

```
POST /api/v1/diagnosis-files/save
Content-Type: application/json

{
  "task": "data_diagnosis",
  "model": "wenxin",
  "content": "诊断结果文本..."
}
```

> 文件命名规则：data/uploads/diag_{user_id}_{task}_{model}.txt
> task 取值：data_diagnosis / website_diagnosis / competitor_analysis / diagnosis_report 等

### 12.2 获取诊断结果

```
GET /api/v1/diagnosis-files/get?task=data_diagnosis&model=wenxin
Authorization: Bearer <accessToken>
```

响应：
```json
{
  "success": true,
  "data": {
    "task": "data_diagnosis",
    "model": "wenxin",
    "exists": true,
    "content": "诊断结果文本..."
  }
}
```

### 12.3 下载 Word 文档

```
GET /api/v1/diagnosis-files/download?task=data_diagnosis&model=wenxin
Authorization: Bearer <accessToken>
```

> 将文本内容转换为 HTML 格式的 .doc 文件供下载。

### 12.4 清除诊断文件

```
POST /api/v1/diagnosis-files/clear
Content-Type: application/json

{
  "task": "data_diagnosis"
}
```

> 清除当前用户指定 task 的所有诊断文件。

---

## 前端路由与 API 调用关系

补充说明：

- `www/index.js` 在 iframe / Shiny 宿主场景下通过 `postMessage` 桥接文章列表、文章详情、发布记录与官媒查询结果，再分发为 `geo_articles_data`、`geo_article_detail` 等前端消息。
- 桌面端 UI 使用固定左侧边栏、右侧独立滚动的后台布局；发布页的选文列表默认仅展示约 5 行，预览区超长内容在容器内滚动。
- 基础数据诊断、竞争对手分析、企业诊断报告页的前端多模型切换已补充 `deepseek` 按钮；这 3 个页面的“汇总分析”按钮居中显示，并使用草绿色实心样式。
- 企业知识图谱弹窗位于企业知识库页面，顶部保留统计说明，缩放与刷新按钮位于右侧说明栏底部。
- 官媒发布页默认通过 `/api/v1/official-media` 加载媒体数据，前端不再提供手动导入 Excel 按钮；预览下方“发布到后台”会先调用 `/api/v1/official-publish/save` 写入 `data/uploads`，再调用 `/api/v1/official-publish/submit`；该保存链路已做过实际接口联调验证。
- 发布管理页的最后三列“平台发布次数 / 收录情况 / 引用次数”在前端表头中采用横向换行显示；当整表过宽时，页面保留横向滚动查看能力。

| 前端页面 | 主要调用的 API |
|----------|----------------|
| 工作台 (home) | /api/v1/health、/api/v1/billing/balance |
| 企业知识库 (knowledge-base) | /api/v1/knowledge-base/*（含 `/graph`）、/api/v1/files/*、/api/v1/products、/api/v1/enterprise-images |
| 基础数据诊断 | /api/v1/ai/execute (task=data_diagnosis) |
| 企业官网诊断 | /api/v1/ai/execute (task=website_diagnosis) |
| 竞争对手分析 | /api/v1/ai/execute (task=competitor_analysis) |
| 企业诊断报告 | /api/v1/ai/execute (task=diagnosis_report) |
| 优化建议方案 | /api/v1/ai/execute (task=optimization_plan) |
| 创建问题词库 (question-bank) | POST /api/v1/question-words |
| 问题词库管理 (question-bank-manager) | GET /api/v1/question-words、DELETE /api/v1/question-words |
| 文章创作 (article-writing) | POST /api/v1/articles（生成并入库）、POST /api/v1/article-writing/suggestions（生成优化建议）、POST /api/v1/article-writing/rewrite（重新优化/改稿） |
| 文章管理 (article-manager) | GET/PUT/DELETE /api/v1/articles |
| 自媒体发布 (media-publish) | GET /api/v1/articles、GET /api/v1/articles/{id}、POST /api/v1/publish-records |
| 官媒发布 (official-publish) | GET /api/v1/articles、GET /api/v1/articles/{id}、GET /api/v1/official-media/*、POST /api/v1/official-publish/save、POST /api/v1/official-publish/submit |
| 发布管理 (publish-manager) | GET /api/v1/publish-records |
| 数据统计 (data-statistics) | /api/v1/articles (count)、/api/v1/publish-records (count) |
| 消耗明细 (config) | GET /api/v1/billing/transactions |
| 舆情监控 (public-opinion) | /api/v1/monitor-tasks/* |
| AI 工具箱 (ai-toolbox) | POST /api/v1/ai/execute |
| 实名认证 (real-name) | PUT /api/v1/auth/me |
| 联系我们 (contact) | 无 API 调用（静态页面） |

---

## 文章创作（article-writing）补充说明

- 模块范围：产品宣传 / 企业品牌 / 主题活动创作三个入口共用同一套 API。
- 优化建议：`POST /api/v1/article-writing/suggestions`，入参 `content` 为已生成文案正文；服务端基于“输入信息完整性 + 文案完整性”输出一段可直接展示的建议文本。
- 重新优化（改稿）：`POST /api/v1/article-writing/rewrite`，入参 `content` 为原文案正文；返回重写后的新文案。
- 入库规则：文章生成与“确定”入库均使用 `POST /api/v1/articles`（写入 articles 表）。
- 企业品牌创作（3 篇）：前端一次生成 3 篇；改稿后可在 3 篇中任选 1 篇点击“确定”入库。入库标题前缀为【改稿1】/【改稿2】/【改稿3】。

## Pydantic 数据模型参考

请求/响应模型定义在 backend/schemas.py，主要模型：

| 模型 | 用途 | 关键字段 |
|------|------|----------|
| LoginRequest | 登录 | phone: str, password: str |
| RegisterRequest | 注册 | phone: str, password: str, real_name?: str |
| RefreshRequest | 刷新 Token | refreshToken: str |
| AuthResponse | 登录/注册响应 | accessToken: str, refreshToken: str |
| LexiconCreateRequest | 创建词库 | name, company, industry_keyword, decision_stage, words?: dict, keywords?: list, question_keyword |
| ArticleCreateRequest | 创建文章 | tab, lexicon_id, question_text, platforms[], article_type?, style?, tone?, brand_embed?, title?, user_input? |
| ArticleUpdateRequest | 编辑文章 | title?: str, content?: str |
| MonitorTaskCreateRequest | 创建监测 | keyword: str, platforms[]: list |
| PaginationParams | 分页参数 | page: int = 1, pageSize: int = 20 |
| APIResponse | 统一响应 | success: bool, data?: Any, error?: {code: str, message: str} |

---

## 服务器启动事件

FastAPI 应用启动时自动执行以下初始化操作（定义在 main.py 的 _startup 函数）：

```python
@app.on_event("startup")
async def _startup():
    apply_migrations()  # 自动执行 migrations/ 下所有 .sql 文件
```

迁移执行逻辑（database.py apply_migrations）：
1. 扫描 backend/migrations/ 目录下所有 .sql 文件
2. 按文件名排序（001 到 022）
3. 逐文件读取，跳过注释行（以 -- 开头）
4. 按分号拆分 SQL 语句，逐条执行
5. 所有建表语句使用 IF NOT EXISTS，种子数据使用 INSERT IGNORE，支持幂等重复执行

## 请求日志中间件

仅在 DEBUG=True 时启用（backend/main.py LogMiddleware）：

```
[API] GET /api/v1/health -> 200 (2.15ms)
```

包含：HTTP 方法、URL 路径、响应状态码、耗时（毫秒）。

## CORS 配置

- DEBUG=True 时：allow_origins = ["*"]（允许所有来源）
- DEBUG=False 时：按 CORS_ORIGINS 配置的白名单

---

*文档版本：1.0.0 | 最后更新：2026-06-29*
