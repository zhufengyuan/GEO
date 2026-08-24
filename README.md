# GEO 智能优化平台

> 生成式引擎优化（Generative Engine Optimization）——让企业品牌出现在 AI 的回答里。

FastAPI + R Shiny + MySQL 构建的一站式 GEO 内容生产平台：企业知识库沉淀 → AI 文案创作 → 多渠道发布 → 效果数据统计，并为 AI 爬虫提供标准化的 `llms.txt` / `ai-data` 数据出口。

---

## 目录

- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [目录结构](#目录结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [生产环境部署](#生产环境部署)
- [数据库结构](#数据库结构)
- [配置说明](#配置说明)
- [前端页面一览](#前端页面一览)
- [AI 数据出口](#ai-数据出口)

---

## 核心功能

### 1. 企业知识库
- **企业基础信息**：全称/简称/主营产品/目标客户/客户类型（B端/C端）/区域市场/企业优势等结构化字段
- **企业介绍**：公司简介、企业资料库、发展大事记（时间线）
- **产品库**：产品信息管理、批量导入
- **客户案例**：合作项目标题、客户名称、项目合作介绍（背景→痛点→方案→结果→证言），支持撰写示范说明
- **企业定位 / 知识图谱**：AI 生成企业定位；知识图谱 SVG 渲染（节点点击/缩放平移）

### 2. AI 文案创作
- **文章创作**：AI 对话式采集需求 → 生成文章 → 优化建议 → 重新改稿，全流程闭环
- **品牌/活动/产品宣传**：三类模板化创作，自动提取企业知识库数据，多模型并行优化（子 agent + 总 agent 整合）
- **优化方案**：AI 生成优化方案并强制输出 Excel

### 3. 问题词库
- LLM 生成真实用户搜索问题（最多 60 条/次），替代原始关键词直接落库
- 客户类型视角适配：B 端（选型/采购/交付）/ C 端（好不好用/怎么选/值不值）
- 决策阶段中文映射、分页管理

### 4. 诊断分析
- **官网诊断**：单一大模型爬取自家/竞争对手官网并分析（结果按查询 ID 区分存储）
- **竞品分析**：多源聚合分析
- **数据诊断 / 原始数据诊断**：上传数据 AI 分析，Word/Excel 格式化导出

### 5. 舆情与发布
- **舆情搜索**：搜狗微信/网页 + 必应三源聚合，关键词监控任务管理
- **媒体发布**：官媒（报价 Excel 驱动）与自媒体发布记录管理，文章审核 toggle
- **发布记录**：多平台发布记录与文章链接绑定

### 6. 数据看板
- 文章总数/类型分组/发布记录按平台分组的统计视图

### 7. AI 数据出口（GEO 自优化）
- `llms.txt` / `robots.txt` / `ai-data/*.json`：所有用户输入信息自动导出为 AI 可爬取的 JSON（索引 + 全量聚合 + 每页最新 + 完整历史 JSONL），让平台自身内容可被生成式引擎引用

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│  浏览器                                      │
│  www/ 原生 JS SPA（hash 路由，无构建工具）      │
└──────────────┬──────────────────────────────┘
               │ /api/v1（REST + JSON）
┌──────────────▼──────────────────────────────┐
│  backend/  FastAPI (uvicorn)                 │
│  ├─ main.py          路由 + 业务编排           │
│  ├─ services/        prompt_service / llm…   │
│  ├─ api/             official_publish 等      │
│  ├─ ai_export.py     llms.txt / ai-data 导出  │
│  └─ migrations/      001~022 SQL 迁移         │
└───────┬───────────────────────┬──────────────┘
        │                       │
┌───────▼────────┐   ┌──────────▼──────────────┐
│  MySQL (geo)   │   │  文心千帆 LLM             │
│  22 张表        │   │  LLM_URL /wenxinqianfan  │
└────────────────┘   └─────────────────────────┘

┌─────────────────────────────────────────────┐
│  geo.Rmd  R Shiny（数据分析与报表模块）         │
│  经 config.R / geo_config.R 连接同一 MySQL     │
└─────────────────────────────────────────────┘
```

- **后端**：Python 3.6+（兼容 3.6/3.8），FastAPI + PyMySQL + PyJWT
- **前端**：原生 HTML/CSS/JS，Design Token 主题体系（theme.css v6）
- **分析端**：R Shiny（geo.Rmd），与后端共享数据库
- **LLM**：文心千帆（提示词模板 30+，行业专属提示词 25 个）

---

## 目录结构

```
GEO/
├─ backend/
│  ├─ main.py                 # FastAPI 入口与全部核心路由
│  ├─ config.py               # Settings（支持环境变量注入）
│  ├─ database.py             # 连接池 + 迁移执行
│  ├─ schemas.py              # Pydantic 请求模型
│  ├─ ai_export.py            # AI 爬取数据出口（llms.txt/ai-data）
│  ├─ api/                    # 子路由（official_publish / publish_records）
│  ├─ auth/                   # JWT 签发与校验
│  ├─ services/               # prompt_service / llm_service / excel…
│  ├─ crawlers/               # 官网/舆情爬取
│  ├─ prompts/                # 提示词模板（含 industries/ 25 行业）
│  └─ migrations/             # 001~022 建表/变更 SQL
├─ www/                       # 前端 SPA（hash 路由）
│  ├─ index.html / index.js
│  ├─ pages/<页面>/page.html + page.js
│  ├─ styles/theme.css        # Design Token 主题
│  └─ ai-data/                # AI 数据出口（运行时生成）
├─ geo.Rmd                    # R Shiny 分析模块
├─ config.R / geo_config.R    # R 侧配置
├─ data/                      # 业务数据（媒体报价表等）
├─ rmd/                       # R 辅助脚本与 SQL
├─ scripts/                   # 运维脚本
├─ svg/ icons/                # LLM 生成图标素材
└─ screenshots/               # 文档截图
```

---

## 环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| Python | 3.6+ | 后端（代码兼容 3.6 语法） |
| R | 4.x + Shiny | 分析模块（geo.Rmd） |
| MySQL | 5.7+ / 8.0 | 字符集 utf8mb4 |
| Node | 可选 | 无需构建，仅静态托管 |

Python 依赖：`fastapi uvicorn pymysql pyjwt pandas openpyxl python-multipart requests`（按 import 按需安装）

---

## 快速开始

```bash
# 1) 配置环境变量（所有敏感项均从环境注入，代码内为占位符）
export DB_HOST=127.0.0.1
export DB_USER=root
export DB_PASSWORD=你的密码
export LLM_URL=http://你的LLM服务:5200/wenxinqianfan
export WENXIN_API_KEY=你的Key
export WENXIN_SECRET_KEY=你的Secret
export JWT_SECRET=一个足够随机的字符串

# 2) 建库（迁移在启动时自动执行）
mysql -e "CREATE DATABASE geo DEFAULT CHARSET utf8mb4"

# 3) 启动后端（首次启动自动跑 migrations）
cd GEO && uvicorn backend.main:app --host 0.0.0.0 --port 8123

# 4) 启动前端（任意静态服务器指向 www/，或用 Shiny Server 托管）
python -m http.server 8000 -d www

# 5) R 分析模块（可选）
Rscript -e 'shiny::runApp("geo.Rmd")'
```

> 开发模式下 `AUTH_DISABLED=True` 跳过登录；生产环境务必设为 `False` 并更换 `JWT_SECRET`。

---

## 生产环境部署

参考拓扑（CentOS / OpenCloudOS）：

| 服务 | 端口 | 进程管理 |
|---|---|---|
| FastAPI 后端 | 8123 | systemd（uvicorn） |
| R Shiny | 3838 | shiny-server |
| MySQL | 3306 | systemd |
| 前端静态资源 | 由 Nginx 反代 `www/` | nginx |

要点：
- Nginx 将 `/api/v1` 反代至 8123，`/geo` 指向 GEO 应用根目录
- `www/ai-data/` 需保证 Web 可读（供 AI 爬虫访问）
- 日志：`journalctl` + 应用自身日志文件轮转

---

## 数据库结构

`backend/migrations/`（启动自动按序执行）：

| 迁移 | 表 | 说明 |
|---|---|---|
| 001 | users | 用户 |
| 002 | subscriptions | 订阅 |
| 003 | lexicons | 词库 |
| 004 | monitor_tasks | 监控任务 |
| 005 | tenants | 租户 |
| 006 | enterprise_base_info | 企业基础信息 |
| 007 | articles | 文章 |
| 008 | question_words | 问题词 |
| 009 | — | 开发用户种子 |
| 010 | consumption_details | 消耗明细 |
| 011 | publish_records | 发布记录 |
| 012 | knowledge_base_sections | 知识库分节内容 |
| 013 | enterprise_images | 企业图片 |
| 014 | geo_ui_saves | 页面输入保存 |
| 015~017 | products / product_images / enterprise_image_categories | 产品与图片 |
| 018~022 | enterprise_docs / article_links / 变更 | 企业文档、文章链接、审核字段等 |

---

## 配置说明

`backend/config.py` Settings 类，全部支持同名环境变量覆盖（代码内默认值为占位符）：

| 配置项 | 默认值 | 说明 |
|---|---|---|
| DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT | YOUR_* / geo / 3306 | MySQL 连接 |
| JWT_SECRET | change-me-in-production | JWT 签名密钥 |
| JWT_ACCESS_EXPIRE_MINUTES / JWT_REFRESH_EXPIRE_DAYS | 15 / 30 | Token 有效期 |
| AUTH_DISABLED | True | 跳过认证（生产必须 False） |
| LLM_URL | http://YOUR_SERVER_IP:5200/wenxinqianfan | 文心千帆代理地址 |
| WENXIN_API_KEY / WENXIN_SECRET_KEY | YOUR_* | 文心千帆凭据 |
| CORS_ORIGINS | 本地开发地址 | 跨域白名单 |

R 侧 `config.R` / `geo_config.R` 同样使用占位符，部署时替换或改造成环境变量读取。

---

## 前端页面一览

| 页面 | 功能 |
|---|---|
| home | 工作台首页 |
| knowledge-base | 企业知识库（基础信息/介绍/产品库/客户案例/定位/图谱） |
| article-writing | AI 对话式文章创作 |
| article-manager | 文章管理（审核 toggle） |
| question-bank / question-bank-manager | 问题词库生成与管理 |
| website-diagnosis / competitor-analysis / diagnosis-report / original-data-diagnosis | 官网/竞品/报告/数据诊断 |
| public-opinion / public-opinion-report / public-opinion-mobile | 舆情搜索与报告 |
| official-publish / media-publish / publish-manager | 官媒/自媒体发布与记录 |
| data-statistics | 数据看板 |
| ai-toolbox | AI 工具箱 |
| optimization-plan | 优化方案 |
| config / real-name / contact | 系统配置等 |

---

## AI 数据出口

`backend/ai_export.py` 在每次输入保存时同步导出 JSON，供生成式引擎爬取：

```
/geo/llms.txt                       # AI 站点标准入口
/geo/robots.txt                     # 爬虫规则
/geo/ai-data/index.json             # 可爬取文件索引
/geo/ai-data/inputs/all.json        # 全部输入聚合（AI 主入口）
/geo/ai-data/inputs/latest_<page>.json   # 每页最新输入
/geo/ai-data/inputs/history/<page>.jsonl  # 完整历史（每行一条）
```

`POST /api/v1/ai/rebuild` 可手动重建索引。

---

## License

私有项目，版权所有。
