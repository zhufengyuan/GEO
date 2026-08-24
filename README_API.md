# GEO API 接口文档

> 基于 `backend/main.py` 路由注册整理，与代码保持一致。
> 基础路径：`/api/v1`，全部返回 JSON。

---

## 目录

- [通用约定](#通用约定)
- [认证 Auth](#认证-auth)
- [文章 Articles](#文章-articles)
- [AI 文章创作 Article Writing](#ai-文章创作-article-writing)
- [AI 执行与模型 AI](#ai-执行与模型-ai)
- [问题词库 Question Words](#问题词库-question-words)
- [企业知识库 Knowledge Base](#企业知识库-knowledge-base)
- [诊断 Diagnosis](#诊断-diagnosis)
- [诊断文件 Diagnosis Files](#诊断文件-diagnosis-files)
- [舆情 Public Opinion](#舆情-public-opinion)
- [官方媒体 Official Media](#官方媒体-official-media)
- [官媒发布 Official Publish](#官媒发布-official-publish)
- [发布记录 Publish Records](#发布记录-publish-records)
- [监控任务 Monitor Tasks](#监控任务-monitor-tasks)
- [租户 Tenants](#租户-tenants)
- [产品与图片 Products / Enterprise Images](#产品与图片-products--enterprise-images)
- [文件 Files](#文件-files)
- [导出 Export](#导出-export)
- [计费 Billing](#计费-billing)
- [数据看板 Dashboard](#数据看板-dashboard)
- [页面输入保存 GEO UI Saves](#页面输入保存-geo-ui-saves)
- [工具 Tools](#工具-tools)
- [健康检查 Health](#健康检查-health)
- [配置项说明](#配置项说明)

---

## 通用约定

- 响应统一为 `{"code": 0, "data": ..., "msg": "ok"}`；出错时 `code != 0` 并带 `msg`
- 认证开启时（`AUTH_DISABLED=False`）需带 `Authorization: Bearer <accessToken>`
- 时间格式 ISO 8601；`NaN/Infinity` 等非法 JSON 值自动转 `null`

---

## 认证 Auth

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录，返回 access/refresh token |
| POST | `/auth/refresh` | 刷新 access token |
| POST | `/auth/logout` | 登出 |
| GET | `/auth/me` | 当前用户信息 |

## 文章 Articles

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/articles` | 文章列表（支持筛选） |
| POST | `/articles` | 创建文章（可指定词库，AI 参与生成） |
| GET | `/articles/{aid}` | 文章详情 |
| PUT | `/articles/{aid}` | 更新文章 |
| DELETE | `/articles/{aid}` | 删除文章 |
| POST | `/articles/{aid}/review` | 审核 toggle（1↔0） |

## AI 文章创作 Article Writing

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/article-writing/init-chat` | 创作页 AI 初始化打招呼 |
| POST | `/article-writing/chat` | AI 对话采集需求 |
| POST | `/article-writing/generate` | 生成文章 |
| POST | `/article-writing/optimize` | 生成优化版本 |
| POST | `/article-writing/suggestions` | 生成写作建议 |
| POST | `/article-writing/rewrite` | 重新优化/改稿 |

## AI 执行与模型 AI

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/ai/models` | 可用模型列表 |
| GET | `/ai/inputs` | AI 输入项 |
| GET | `/ai/industries` | 行业提示词库列表（12 行业） |
| POST | `/ai/execute` | 执行 AI 任务（generate_title 等 task 分发） |
| POST | `/ai/rebuild` | 重建 ai-data 索引（llms.txt 出口） |

## 问题词库 Question Words

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/question-words` | 词库列表 |
| POST | `/question-words` | 创建词库：LLM 生成真实搜索问题（≤60 条）落库；支持 `customer_type`（请求 → words → 知识库三级回退） |
| DELETE | `/question-words` | 删除词库 |
| GET | `/question-words/items` | 问题明细 |
| GET | `/question-words/by-lexicon` | 按词库查询 |
| GET | `/question-words/suggest` | 问题推荐 |

## 企业知识库 Knowledge Base

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/knowledge-base` | 读取知识库分节（企业基础信息/企业介绍/产品库/客户案例等） |
| POST | `/knowledge-base/save` | 保存分节内容 |
| POST | `/knowledge-base/products/import` | 产品批量导入 |
| POST | `/knowledge-base/docs/export-word` | 企业文档导出 Word |

## 诊断 Diagnosis

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/diagnosis/scrape-website` | 官网内容爬取（自家/竞品，结果按查询 ID 存储） |

## 诊断文件 Diagnosis Files

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/diagnosis-files/get` | 查询诊断产物 |
| GET | `/diagnosis-files/download` | 下载诊断产物（Word/Excel） |
| POST | `/diagnosis-files/save` | 保存诊断产物 |
| POST | `/diagnosis-files/clear` | 清空诊断产物 |

## 舆情 Public Opinion

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/public-opinion/search` | 舆情搜索（搜狗微信/网页 + 必应三源聚合） |

## 官方媒体 Official Media

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/official-media` | 官媒资源列表（报价 Excel 驱动） |
| GET | `/official-media/summary` | 官媒资源汇总 |

## 官媒发布 Official Publish

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/official-publish/save` | 保存官媒发布单 |
| POST | `/official-publish/submit` | 提交发布（可选转发至合作渠道，`OFFICIAL_PUBLISH_PARTNER_URL`） |

## 发布记录 Publish Records

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/publish-records` | 发布记录列表 |
| POST | `/publish-records` | 新建发布记录 |
| POST | `/publish-records/link` | 绑定文章链接 |

## 监控任务 Monitor Tasks

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/monitor-tasks` | 任务列表 |
| POST | `/monitor-tasks` | 创建监控任务 |
| PUT | `/monitor-tasks/{tid}` | 更新任务 |
| DELETE | `/monitor-tasks/{tid}` | 删除任务 |

## 租户 Tenants

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/tenants` | 租户列表 |
| POST | `/tenants` | 创建租户 |
| POST | `/tenants/{tid}/switch` | 切换当前租户 |
| PUT | `/tenants/{tid}` | 更新租户 |

## 产品与图片 Products / Enterprise Images

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/products` | 产品列表 |
| GET | `/enterprise-images` | 企业图片（含分类） |

## 文件 Files

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/files` | 文件列表 |
| POST | `/files/upload` | 上传文件 |
| GET | `/files/{fid}` | 获取/下载文件 |
| DELETE | `/files/{fid}` | 删除文件 |

## 导出 Export

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/export/word` | 导出 Word（doc/docx） |
| POST | `/export/excel` | 导出 Excel（xls/xlsx） |

## 计费 Billing

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/billing/balance` | 余额查询 |
| GET | `/billing/transactions` | 交易明细 |
| POST | `/billing/consume` | 消费扣减 |

## 数据看板 Dashboard

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dashboard/stats` | 统计（文章总数/类型分组/发布记录按平台分组） |

## 页面输入保存 GEO UI Saves

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/geo-ui-saves` | 读取页面输入 |
| POST | `/geo-ui-saves` | 保存页面输入（同步导出 ai-data JSON） |

## 工具 Tools

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/tools/summarize-urls` | URL 内容汇总 |

## 健康检查 Health

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 服务健康检查 |

---

## 配置项说明

`backend/config.py`（Settings 类），全部支持环境变量覆盖：

| 配置项 | 默认值 | 说明 |
|---|---|---|
| DEBUG | True | 调试模式（日志中间件、CORS 放开） |
| DB_HOST | YOUR_SERVER_IP | MySQL 地址 |
| DB_USER | root | MySQL 用户 |
| DB_PASSWORD | YOUR_DB_PASSWORD | MySQL 密码 |
| DB_NAME / DB_PORT / DB_CHARSET | geo / 3306 / utf8mb4 | 库名/端口/字符集 |
| JWT_SECRET | change-me-in-production | JWT 密钥（生产必换） |
| JWT_ALGORITHM | HS256 | 签名算法 |
| JWT_ACCESS_EXPIRE_MINUTES | 15 | Access Token 有效期 |
| JWT_REFRESH_EXPIRE_DAYS | 30 | Refresh Token 有效期 |
| AUTH_DISABLED | True | 跳过认证（生产设 False） |
| DEV_USER_ID | 1 | 开发模式默认用户 |
| LLM_URL | http://YOUR_SERVER_IP:5200/wenxinqianfan | 大模型服务地址 |
| WENXIN_API_KEY / WENXIN_SECRET_KEY | YOUR_* | 文心千帆凭据 |
| OFFICIAL_MEDIA_EXCEL | data/.xls | 媒体报价 Excel 路径 |
| OFFICIAL_PUBLISH_PARTNER_URL / TOKEN | "" | 官媒发布渠道对接（可选） |
| CORS_ORIGINS | 本地开发地址 | 跨域白名单 |
