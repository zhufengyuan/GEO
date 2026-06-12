# GEO 优化后台管理系统

> 生成式引擎优化（Generative Engine Optimization）——让您的企业品牌出现在 AI 的回答里。

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [目录结构](#目录结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [本地开发部署](#本地开发部署)
- [生产环境部署（CentOS 8 + Nginx + systemd）](#生产环境部署centos-8--nginx--systemd)
- [数据库结构](#数据库结构)
- [前端路由与页面映射](#前端路由与页面映射)
- [认证机制详解](#认证机制详解)
- [提示词模板系统](#提示词模板系统)
- [工作流程](#工作流程)
- [注意事项](#注意事项)

---

## 项目简介

本项目是一套面向企业的 GEO（Generative Engine Optimization，生成式引擎优化）全流程作业平台。

GEO 是什么？

GEO 是 SEO 在 AI 时代的进化版。传统 SEO 优化网站在搜索引擎中的排名，而 GEO 的目标是优化企业内容在豆包、Kimi、通义千问、智谱、DeepSeek、文心一言等主流 AI 大模型中的收录率和引用率——让用户向 AI 提问时，AI 的回答中包含您企业的品牌、产品和服务信息。

平台目标：

通过系统化地建立企业知识库 → 批量生成 AI 友好型内容 → 广泛投放到各大媒体平台，形成完整的 GEO 优化闭环，持续提升企业在 AI 生态中的曝光度和影响力。

---

## 核心功能

### 第一阶段：准备工作

| 模块 | 前端路由 | 说明 |
|------|----------|------|
| 企业知识库 | knowledge-base | 录入企业基本信息、产品库、图片库、官网地址、文档等，作为 AI 写作的核心素材库 |
| 基础数据诊断 | original-data-diagnosis | 分析企业现有内容数据的基本情况与健康度 |
| 企业官网诊断 | website-diagnosis | 诊断企业官网当前的 GEO 优化状态与短板 |
| 竞争对手分析 | competitor-analysis | 对比同行竞争者的 GEO 表现，发现差距与机会 |
| 企业诊断报告 | diagnosis-report | 汇总生成综合诊断报告，全面评估 GEO 现状 |
| 优化建议方案 | optimization-plan | 基于诊断结果，给出可落地的系统化优化建议 |

### 第二阶段：GEO 优化核心流水线

```
STEP 1  创建问题词库  →  STEP 2  文章创作  →  STEP 3  媒体发布 / 官媒发布  →  STEP 4  发布管理
```

| 步骤 | 模块 | 前端路由 | 功能说明 |
|------|------|----------|----------|
| STEP 1 | 问题词库 | question-bank | 输入企业名、行业/产品关键词（问题关键词）、区域词、功能词、场景词、使用人群等；点击生成后由 LLM 按决策阶段自动产出问题列表（认知触发阶段不少于 50 条，其余阶段不少于 30 条），并在“问题词库管理”中可筛选、导出、批量删除 |
| STEP 2 | 文章创作 | article-writing | 基于问题词，按产品宣传 / 企业品牌 / 主题活动创作三种类型，配置平台、风格、品牌嵌入规则，AI 批量生成内容 |
| STEP 3 | 媒体发布 | media-publish / official-publish | 从媒体资源库筛选全国网站媒体和官方自媒体（含报价、平台、地区、粉丝数、认证等），一键投放文章 |
| STEP 4 | 发布管理 | publish-manager | 统一管理所有发布记录，追踪收录状态与引用次数 |

#### 文章创作（article-writing）补充说明

- 三个模块均有“文案优化建议”：自动用大模型生成优化建议文字（基于输入信息完整性 + 已生成文案完整性）。
- 右侧展示：不再使用“文案显示”按钮和弹窗预览，改为直接显示“初稿文案 + 优化建议”两个区域。
- 产品宣传创作/主题活动创作：每次“开启创作”生成 1 篇；右侧直接显示该篇初稿文案和对应优化建议。
- 企业品牌创作：每次“开启创作”生成 3 篇同类型不同版本；右侧提供 3 张结果卡片，每张卡片均直接显示对应的初稿文案和优化建议。
- 重新优化：等同 rewrite，生成改稿版本；企业品牌创作可在 3 个优化区域中选择其中 1 篇点击“确定”写入文章管理，标题前缀为【改稿1】/【改稿2】/【改稿3】。
- 滚动规则：页面不会因右侧内容撑高；长内容只在“初稿文案”和“优化建议”的各自显示区域内纵向滚动。

### 数据分析与监控

| 模块 | 前端路由 | 说明 |
|------|----------|------|
| 数据统计 | data-statistics | 可视化展示文章数、收录数、引用数等核心 KPI 及趋势图 |
| 查询 | data-query | 数据查询工具 |
| 舆情监控 | public-opinion | 按关键词抓取今日头条、知乎、微博、小红书等平台内容，支持情感分析（正面 / 负面） |
| 消耗明细 | config | 记录并查询平台使用成本与积分消耗 |
| AI 工具箱 | ai-toolbox | 通用 AI 工具快捷入口 |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Python FastAPI 后端 (backend/)                     │
│                                                                      │
│  main.py ─── 唯一应用入口（所有对外 API 均通过 main.py 调度）          │
│    │                                                                 │
│    ├── auth/ ─── JWT 认证（纯 HmacSHA256 实现，无第三方依赖）         │
│    │   ├── jwt_handler.py    JWT 令牌生成/解码/验证                   │
│    │   ├── dependencies.py   FastAPI Depends 注入 get_current_user    │
│    │   └── routes.py        /api/v1/auth/* 路由                     │
│    │                                                                 │
│    ├── api/ ─── 可选的 APIRouter 模块（示例：publish_records.py）       │
│    │   由 main.py include_router() 挂载；其余接口直接在 main.py 中定义 │
│    │                                                                 │
│    ├── services/ ─── 服务层（业务逻辑）                                │
│    │   ├── auth_service.py    用户认证（passlib bcrypt）               │
│    │   ├── llm_service.py     大模型调用（httpx 异步 / requests 同步）│
│    │   ├── prompt_service.py  提示词模板渲染（20 个 .txt 模板）       │
│    │   ├── excel_service.py   Excel 媒体报价读取                      │
│    │   └── consume_service.py 消耗记录                               │
│    │                                                                 │
│    ├── utils/ ─── 工具层                                              │
│    │   ├── api_response.py    统一响应格式 ok/fail/APIException       │
│    │   └── pagination.py      分页工具（最大 500 条/页）               │
│    │                                                                 │
│    ├── database.py ─── PyMySQL + dbutils 连接池（最大 20 连接）       │
│    │   ├── query / query_row / execute / insert / insert_many        │
│    │   └── apply_migrations() 启动时按序执行 22 个 SQL 迁移脚本       │
│    │                                                                 │
│    ├── config.py ─── Settings 配置类                                 │
│    ├── schemas.py ─── Pydantic v2 请求/响应模型                       │
│    └── prompts/ ─── 26 个提示词/规则 .txt 模板文件                    │
│                                                                      │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTP REST API（/api/v1/*）
┌──────────────────────▼──────────────────────────────────────────────┐
│                 前端 SPA（www/）                                      │
│                                                                      │
│  index.html → 全局壳（header + sidebar + content 容器）               │
│  index.js ─── 路由引擎（PAGES 映射表 → 动态加载 page.html + page.js）│
│  styles/theme.css ── CSS Variables 主题（蓝紫色调，毛玻璃风格）        │
│  pages/* ─── 23 个功能页目录，每页独立 HTML + JS                      │
│  pages/_shared/ ── 公共页面模板                                       │
│  pages/diag-common.js ── 诊断模块公共脚本                           │
│                                                                      │
│  通信机制：fetch API → /api/v1/*                                      │
│  API Base URL 存储于 localStorage（geo_api_base_url_v1）              │
│  iframe 场景下通过 window.postMessage 接收 R Shiny 下发的配置        │
└──────────────────────────────────────────────────────────────────────┘

（可选）geo.Rmd 作为宿主页面（R Shiny Runtime）：
  通过 iframe 嵌入前端，通过 postMessage 向前端下发 api_base_url 等配置
  config.R 定义全局路径，geo_config.R 定义数据库/LLM 连接配置
```

### 技术栈明细

| 层级 | 技术 | 版本要求 | 用途 |
|------|------|----------|------|
| 后端框架 | FastAPI | >=0.104.0 | Web 框架 |
| ASGI 服务器 | Uvicorn | >=0.24.0 | 运行 FastAPI 应用 |
| 数据库 | MySQL | 8.x+ | 主数据存储 |
| 数据库驱动 | PyMySQL | >=1.1.0 | Python MySQL 客户端 |
| 连接池 | dbutils | >=3.0.0 | PooledDB，最大 20 连接，mincached=2，maxcached=5 |
| 数据验证 | Pydantic | >=2.0.0 | 请求/响应模型 |
| 配置管理 | pydantic-settings | >=2.0.0 | Settings 类 |
| 密码哈希 | passlib[bcrypt] | >=1.7.4 | bcrypt 密码哈希 |
| JWT | 纯 HmacSHA256（无第三方库） | — | 令牌生成、验证、过期检测 |
| 异步 HTTP | httpx | >=0.25.0 | 调用 LLM 大模型服务 |
| 同步 HTTP | requests | >=2.31.0 | LLM 备选调用方式 |
| Excel 处理 | pandas + openpyxl | >=2.0.0 / >=3.1.0 | 读取媒体报价 Excel（后端） |
| 图片处理 | Pillow | >=10.0.0 | 上传图片处理 |
| 文件上传 | python-multipart | >=0.0.6 | multipart/form-data 解析 |
| 环境变量 | python-dotenv | >=1.0.0 | .env 文件加载 |
| 前端 | 原生 HTML + CSS + ES Module JS | — | 零构建依赖 SPA |
| 前端 Excel | SheetJS/XLSX.js | — | 部分页面导出 Excel（动态加载 CDN） |
| 通信协议 | HTTP REST API | — | /api/v1/*，JSON 格式 |
| 可选宿主 | R Shiny | — | geo.Rmd iframe 嵌入模式 |

---

## 目录结构

```
GEO/
├── backend/                              # FastAPI 后端
│   ├── main.py                           # 应用入口（路由/中间件/静态资源挂载）
│   ├── config.py                         # 配置（数据库/JWT/LLM/CORS）
│   ├── database.py                       # 连接池 + migrations 执行
│   ├── api/                              # APIRouter 模块
│   ├── services/                         # 业务服务层
│   ├── prompts/                          # 提示词模板（.txt）
│   └── migrations/                       # MySQL 迁移脚本（.sql）
│
├── www/                                  # 前端 SPA（原生 HTML/CSS/ES Modules）
├── data/                                 # 数据集目录（Excel + data/uploads）
│   ├── 2026年网站媒体及官方自媒体报价-Q2.xls
│   ├── 数据统计_测试数据.xlsx
│   └── uploads/
│
├── geo.Rmd                               # 可选：R Shiny 宿主页面（iframe 模式）
├── config.R                              # R 配置（路径/API BaseUrl/DB/LLM）
├── geo_config.R                          # R 配置（备用/同上）
└── svg/                                  # 大模型 SVG 图标资源（FastAPI 挂载为 /llm-svg）
```

---

## 环境要求

### Python 环境

Python 3.9+，依赖见 backend/requirements.txt：

```bash
cd backend
pip install -r requirements.txt
```

### R 环境（可选，仅 Shiny 宿主模式需要）

| 包 | 用途 |
|---|------|
| shiny | Web 应用框架 |
| rmarkdown | 运行 .Rmd 文件 |
| DBI | 数据库抽象接口 |
| RMySQL | MySQL 驱动 |
| jsonlite | JSON 序列化 |
| readxl | 读取 Excel |

### 数据库

- MySQL 8.x 或以上
- 数据库名：geo
- 字符集：utf8mb4
- InnoDB 引擎

---

## 快速开始

1) 安装依赖

```bash
cd GEO/backend
pip install -r requirements.txt
```

2) 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS geo CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

3) 配置后端

编辑 `backend/config.py`，至少确认以下配置已按你的环境修改：

- `DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT`
- `LLM_URL`（也可通过环境变量 `LLM_URL` 或根目录 `config.R` 的 `llm_url` 注入）
- 生产环境务必更换 `JWT_SECRET`，并设置 `AUTH_DISABLED=False`

当前仓库内默认值（已写入配置文件）：

- `DB_HOST=YOUR_DB_HOST`
- `DB_PASSWORD=YOUR_DB_PASSWORD`
- `LLM_URL=http://YOUR_LLM_HOST:5200/wenxinqianfan`
- `WENXIN_API_KEY`、`WENXIN_SECRET_KEY` 请通过环境变量配置

4) 启动

```bash
cd GEO
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

访问：

- http://localhost:8000 （前端 SPA）
- http://localhost:8000/llm-svg/豆包.svg （SVG 图标静态资源示例）
- http://localhost:8000/api/v1/health （健康检查）
- http://localhost:8000/api/v1/docs （Swagger）

## API 文档

- 交互式文档：`/api/v1/docs`（Swagger）、`/api/v1/redoc`（ReDoc）
- 详细接口清单：[README_API.md](README_API.md)

## 本地开发部署

### 第一步：安装 Python 依赖

```bash
cd GEO/backend
pip install -r requirements.txt
```

### 第二步：创建 MySQL 数据库

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE IF NOT EXISTS geo CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

> 建表和种子数据无需手动执行，后端启动时会自动按序运行 migrations/ 下 22 个 SQL 脚本。

### 第三步：修改后端配置

编辑 backend/config.py，填入实际的数据库和 LLM 服务信息：

```python
class Settings:
    DEBUG: bool = True                           # 开发模式：开启日志中间件、放开 CORS

    # ─── 数据库配置 ───
    DB_HOST: str = "127.0.0.1"                   # 数据库地址
    DB_USER: str = "root"                         # 数据库用户
    DB_PASSWORD: str = "your_password"            # 数据库密码
    DB_NAME: str = "geo"                          # 数据库名
    DB_PORT: int = 3306                           # 数据库端口
    DB_CHARSET: str = "utf8mb4"                   # 字符集

    # ─── JWT 配置 ───
    JWT_SECRET: str = "change-me-in-production"   # 生产环境务必更换！
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15           # Access Token 有效期（分钟）
    JWT_REFRESH_EXPIRE_DAYS: int = 30             # Refresh Token 有效期（天）

    # ─── 认证开关 ───
    AUTH_DISABLED: bool = True                    # 开发模式跳过认证，自动使用 DEV_USER_ID
    DEV_USER_ID: int = 1

    # ─── LLM 大模型服务 ───
    LLM_URL: str = "http://your-llm-host:5200/wenxinqianfan"

    # ─── 媒体报价 Excel 路径 ───
    OFFICIAL_MEDIA_EXCEL: str = ...                # 默认自动指向项目根目录下的 .xls 文件

    # ─── CORS 跨域白名单 ───
    CORS_ORIGINS: List[str] = [
        "http://localhost:4510",                   # R Shiny 默认端口
        "http://127.0.0.1:4510",
        "http://localhost:8000",                   # FastAPI 独立运行端口
        "http://127.0.0.1:8000",
    ]
```

### 第四步：启动后端

```bash
# 在项目根目录（GEO/）下执行
cd GEO
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

启动时会看到：

```
INFO:     Started server process
INFO:     Waiting for application startup.
[启动时执行 migrations/ 下迁移脚本，创建/更新表结构]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 第五步：验证部署

启动成功后，可访问以下地址：

| 地址 | 说明 |
|------|------|
| http://localhost:8000 | 前端页面（FastAPI 自动托管 www/） |
| http://localhost:8000/api/v1/health | 健康检查（返回 `{"success":true,"data":{"status":"ok","version":"1.0.0"}}`） |
| http://localhost:8000/api/v1/docs | Swagger 交互式 API 文档 |
| http://localhost:8000/api/v1/redoc | ReDoc API 文档 |
| http://localhost:8000/data/* | 数据集静态访问（来自 data/） |
| http://localhost:8000/uploads/* | 上传文件访问 |

### 第六步：（可选）启动 R Shiny 宿主

如果需要使用 R Shiny iframe 嵌入模式，编辑 config.R 和 geo_config.R 中的连接信息，然后：

```bash
# 方式一：命令行
Rscript -e 'rmarkdown::run("geo.Rmd")'

# 方式二：RStudio
# 打开 geo.Rmd，点击 Run Document 按钮
```

R Shiny 启动后默认监听 4510 端口，通过 iframe 嵌入前端，并使用 postMessage 向前端下发 api_base_url。

---

## 生产环境部署（CentOS 8 + Nginx + systemd）

### 前置条件

- CentOS 8 服务器，已安装 MySQL 8.x
- Python 3.9+（建议使用 pyenv 或 conda）
- 已有可用的 LLM 大模型服务地址

### 第一步：上传项目

```bash
# 将 GEO 项目上传到服务器
scp -r GEO/ root@your-server:/srv/geo/
```

### 第二步：安装 Python 依赖

```bash
cd /srv/geo/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 第三步：配置 MySQL

```sql
-- 在 MySQL 中创建数据库和专用账户
CREATE DATABASE IF NOT EXISTS geo CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'geo_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON geo.* TO 'geo_user'@'localhost';
FLUSH PRIVILEGES;
```

### 第四步：修改生产配置

编辑 backend/config.py：

```python
class Settings:
    DEBUG: bool = False                          # 关闭调试模式

    DB_HOST: str = "localhost"
    DB_USER: str = "geo_user"                    # 使用专用账户
    DB_PASSWORD: str = "strong_password_here"    # 强密码
    DB_NAME: str = "geo"

    JWT_SECRET: str = "生成一个随机强密钥"         # 务必更换！可用命令生成：
    # python -c "import secrets; print(secrets.token_urlsafe(32))"

    AUTH_DISABLED: bool = False                   # 关闭开发模式，启用认证

    LLM_URL: str = "http://your-llm-host:5200/wenxinqianfan"

    CORS_ORIGINS: List[str] = [
        "https://your-domain.com",               # 只允许生产域名
    ]
```

### 第五步：创建 systemd 服务

创建 `/etc/systemd/system/geo.service`：

```ini
[Unit]
Description=GEO Backend (FastAPI)
After=network.target mysql.service

[Service]
Type=simple
User=nginx
Group=nginx
WorkingDirectory=/srv/geo
Environment="PATH=/srv/geo/backend/venv/bin"
ExecStart=/srv/geo/backend/venv/bin/python -m uvicorn backend.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
systemctl daemon-reload
systemctl enable geo
systemctl start geo

# 查看运行状态
systemctl status geo

# 查看日志
journalctl -u geo -f
```

### 第六步：配置 Nginx 反向代理

创建 `/etc/nginx/conf.d/geo.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 请求体大小限制（文件上传）
    client_max_body_size 50M;

    # ─── 后端 API 反向代理 ───
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;          # LLM 调用可能较慢
        proxy_send_timeout 120s;
    }

    # ─── 上传文件静态访问 ───
    location /uploads/ {
        alias /srv/geo/data/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ─── 数据集静态访问 ───
    location /data/ {
        alias /srv/geo/data/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ─── 前端 SPA ───
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> 注：也可以让 Nginx 直接托管 www/ 目录，而不经过 FastAPI 的 StaticFiles 中间件，以减轻后端负载。如果采用此方案，将 location / 改为：

```nginx
    location / {
        root /srv/geo/www;
        index index.html;
        try_files $uri $uri/ /index.html;  # SPA 路由回退
    }
```

测试并重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

### 第七步：配置 HTTPS（推荐）

```bash
# 安装 certbot
yum install -y certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d your-domain.com

# 自动续期（certbot 自动添加 cron 任务）
certbot renew --dry-run
```

### 第八步：配置防火墙

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 第九步：验证部署

```bash
# 健康检查
curl http://127.0.0.1:8000/api/v1/health

# 预期返回
# {"success":true,"data":{"status":"ok","version":"1.0.0"}}

# 通过域名访问
curl https://your-domain.com/api/v1/health
```

### 运维常用命令

```bash
# 查看服务状态
systemctl status geo

# 重启服务
systemctl restart geo

# 查看实时日志
journalctl -u geo -f

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 查看 MySQL 慢查询
tail -f /var/log/mysql/slow.log
```

---

## 数据库结构

迁移脚本按序执行，共 22 个 SQL 文件（其中包含表结构变更脚本），创建 21 张表：

### 用户与认证

| 表名 | 文件 | 字段 |
|------|------|------|
| users | 001 | id(BIGINT PK), phone(VARCHAR 20 UNIQUE), password_hash(VARCHAR 255), real_name(VARCHAR 100), is_real_name_verified(TINYINT, 默认0), created_at, updated_at |
| user_enterprise | 001 | id(BIGINT PK), user_id(BIGINT, INDEX), enterprise_id(BIGINT), role(VARCHAR 20, 默认owner), created_at |
| subscriptions | 002 | id(BIGINT PK), user_id(BIGINT, INDEX), plan_id(VARCHAR 50), status(VARCHAR 20, 默认active), start_date, end_date, created_at |
| plans | 002 | id(VARCHAR 50 PK), name, price(DECIMAL 10,2), quota_articles(INT), created_at |

plans 初始数据：

| id | name | price | quota_articles |
|----|------|-------|----------------|
| basic | 基础版 | 199.00 | 50 |
| pro | 专业版 | 599.00 | 200 |
| enterprise | 企业版 | 1999.00 | 9999 |

### 词库与问题

| 表名 | 文件 | 字段 |
|------|------|------|
| lexicons | 003 | id(BIGINT PK), user_id(BIGINT, INDEX), name(VARCHAR 200), company, industry_keyword, decision_stage(VARCHAR 50), words(JSON), expand_words(TEXT), question_keyword(VARCHAR 200), created_at |
| question_words | 008 | id(BIGINT PK), lexicon_id(BIGINT, INDEX), enterprise_id(BIGINT, INDEX), seq_no(INT, 默认1), question_text(VARCHAR 255), gen_date(DATE), created_at |

### 企业信息

| 表名 | 文件 | 字段 |
|------|------|------|
| enterprise_base_info | 006 | id(BIGINT PK), enterprise_full_name, enterprise_short_name, enterprise_address(VARCHAR 512), enterprise_contact, main_products, target_customers, enterprise_website, founded_time, sales_region, sales_channel, service_response_time, delivery_time, enterprise_advantage, product_advantage, tech_advantage, development_history(LONGTEXT), honors(LONGTEXT), major_events(LONGTEXT), created_at, updated_at |

### 文章与发布

| 表名 | 文件 | 字段 |
|------|------|------|
| articles | 007 | id(BIGINT PK), title(VARCHAR 255 NOT NULL), content(LONGTEXT), article_type(VARCHAR 50), creation_type(VARCHAR 50), style, tone, brand_embed(TINYINT, 默认0), enterprise_id(BIGINT), created_at, updated_at |
| publish_records | 011 | id(BIGINT PK), article_id(BIGINT, INDEX), platform_code(VARCHAR 50, UNIQUE(article_id,platform_code)), publish_count(INT, 默认0), last_publish_at, created_at |

### 知识库

| 表名 | 文件 | 字段 |
|------|------|------|
| knowledge_base_sections | 012 | id(BIGINT PK), user_id(BIGINT, INDEX), section(VARCHAR 50, UNIQUE(user_id,section)), content(LONGTEXT), created_at, updated_at(自动更新) |

### 监控与账单

| 表名 | 文件 | 字段 |
|------|------|------|
| monitor_tasks | 004 | id(BIGINT PK), user_id(BIGINT, INDEX), enterprise_id(BIGINT), keyword(VARCHAR 300 NOT NULL), platforms(JSON), status(VARCHAR 20, 默认active), last_run_at, created_at |
| consumption_details | 010 | id(BIGINT PK), created_at, event_type(VARCHAR 50, INDEX), page(VARCHAR 128), action(VARCHAR 128), units(INT), amount(DECIMAL 12,2, 默认0), currency(VARCHAR 10, 默认CNY), meta_json(LONGTEXT), INDEX(idx_created, created_at) |

### 租户管理

| 表名 | 文件 | 字段 |
|------|------|------|
| tenants | 005 | id(BIGINT PK), name(VARCHAR 200 NOT NULL), industry(VARCHAR 200), created_at |
| user_tenant | 005 | id(BIGINT PK), user_id(BIGINT, INDEX), tenant_id(BIGINT, INDEX), role(VARCHAR 20, 默认owner), created_at |

### 种子数据

| 文件 | 说明 |
|------|------|
| 009_seed_dev_user.sql | 插入开发测试用户 |

---

## 前端路由与页面映射

前端通过 www/index.js 中的 PAGES 映射表实现路由。每个页面由 page.html（结构）和 page.js（逻辑）组成，通过 ES Module 动态加载。

| 路由键 | 页面标题 | 文件路径 | 侧边栏分组 |
|--------|----------|----------|------------|
| home | 工作台 | pages/home/ | —（顶级） |
| knowledge-base | 企业知识库 | pages/knowledge-base/ | 准备工作 |
| original-data-diagnosis | 基础数据诊断 | pages/original-data-diagnosis/ | 准备工作 |
| website-diagnosis | 企业官网诊断 | pages/website-diagnosis/ | 准备工作 |
| competitor-analysis | 竞争对手分析 | pages/competitor-analysis/ | 准备工作 |
| diagnosis-report | 企业诊断报告 | pages/diagnosis-report/ | 准备工作 |
| optimization-plan | 优化建议方案 | pages/optimization-plan/ | 准备工作 |
| question-bank | 创建问题词库 | pages/question-bank/ | GEO优化 |
| question-bank-manager | 问题词库管理 | pages/question-bank-manager/ | GEO优化 |
| article-writing | 文章创作 | pages/article-writing/ | GEO优化 |
| article-manager | 文章管理 | pages/article-manager/ | GEO优化 |
| media-publish | 自媒体发布 | pages/media-publish/ | GEO优化 |
| official-publish | 官媒发布 | pages/official-publish/ | GEO优化 |
| publish-manager | 发布管理 | pages/publish-manager/ | GEO优化 |
| data-statistics | 数据统计 | pages/data-statistics/ | 数据分析 |
| data-query | 查询 | pages/data-query/ | 数据分析-统计 |
| config | 消耗明细 | pages/config/ | 数据分析 |
| public-opinion | 舆情监控 | pages/public-opinion/ | 数据分析（顶级） |
| ai-toolbox | AI工具箱 | pages/ai-toolbox/ | 数据分析（顶级） |
| real-name | 实名认证 | pages/real-name/ | 数据分析（顶级） |
| contact | 联系我们 | pages/contact/ | 数据分析（顶级） |

> 知识库子页面（企业图片库、产品库、导入网址链接、导入文件）共用 knowledge-base 的 page.html/page.js，通过参数区分视图。

---

## 认证机制详解

### JWT 实现

本项目的 JWT 完全基于 Python 标准库实现（HmacSHA256 + base64url），无需 python-jose 等第三方库。

Token 结构：Header.Payload.Signature（标准 JWT 三段式）

Payload 内容：

Access Token（有效期 15 分钟）：
```json
{
  "sub": "1",           // 用户 ID
  "type": "access",     // 令牌类型
  "jti": "uuid",        // 唯一标识（防重放）
  "exp": 1700000000,    // 过期时间（UTC）
  "iat": 1699999100     // 签发时间（UTC）
}
```

Refresh Token（有效期 30 天）：
```json
{
  "sub": "1",
  "type": "refresh",
  "jti": "uuid",
  "exp": 1700000000,
  "iat": 1699999100
}
```

### 密码存储

使用 passlib bcrypt 方案哈希密码。每次注册/修改密码时调用 pwd_context.hash()，验证时调用 pwd_context.verify()。

### 认证流程

```
1. 用户登录 POST /api/v1/auth/login
   → 验证手机号 + 密码（bcrypt）
   → 返回 { accessToken, refreshToken }

2. 前端存储 Token
   → accessToken 存入内存或 sessionStorage
   → refreshToken 存入 localStorage

3. 请求 API
   → Header: Authorization: Bearer <accessToken>
   → 后端 get_current_user 依赖注入自动验证 Token

4. Token 过期
   → POST /api/v1/auth/refresh { refreshToken }
   → 返回新的 accessToken

5. 开发模式（AUTH_DISABLED=True）
   → 所有请求自动以 DEV_USER_ID=1 身份运行
   → 无需 Token
```

### 免认证接口白名单

以下接口无需 JWT Token：
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/refresh
- GET /api/v1/health
- GET /api/v1/plans

---

## 提示词模板系统

系统使用 20 个 .txt 模板文件驱动 AI 内容生成，通过 prompt_service.py 的 render_prompt() 函数替换 {{key}} 占位符。

### 模板文件清单

| 模板文件 | 对应功能 | 关键占位符 |
|----------|----------|------------|
| geo_general_rules.txt | 全局写作规则（被多数模板引用） | — |
| article_product_prompt.txt | 产品宣传文章 | enterprise_full_name, lexicon_company, task_question_text, task_platforms, task_style, task_brand_embed |
| article_product_chat_prompt.txt | 产品宣传对话采集（只提问） | question_text, product_json, images_json, history_json |
| article_writing_init_chat_prompt.txt | 文章创作页 AI 初始化打招呼 | enterprise_full_name, question_text, products_json, images_json |
| article_brand_prompt.txt | 企业品牌文章 | 同上 |
| article_activity_prompt.txt | 主题活动创作文章 | 同上 |
| article_prompt.txt | 通用文章模板（兜底） | 同上 |
| title_prompt.txt | 标题生成 | keyword, hint, enterprise_full_name |
| activity_desc_prompt.txt | 活动描述生成 | keyword, hint, enterprise_full_name |
| expand_words_prompt.txt | 拓展词生成 | keyword |
| kb_profile_prompt.txt | 企业档案生成 | enterprise_full_name, enterprise_address, main_products 等 15 个字段 |
| kb_library_prompt.txt | 企业文库生成 | 同上 |
| kb_timeline_prompt.txt | 发展历程生成 | enterprise_full_name, main_products 等 |
| data_diagnosis_prompt.txt | 基础数据诊断 | enterprise_full_name, manual, page_context, company_profile 等 |
| website_diagnosis_prompt.txt | 官网诊断 | enterprise_full_name, enterprise_website, page_context |
| competitor_analysis_prompt.txt | 竞争对手分析 | enterprise_full_name, competitors, page_context |
| diagnosis_report_prompt.txt | 诊断报告 | llm_instruction, enterprise_full_name, extra_input, company_profile 等 |
| optimization_plan_prompt.txt | 优化方案 | enterprise_full_name, company_profile 等 |
| optimization_schedule_prompt.txt | 优化排期 | enterprise_full_name, main_products 等 |
| acceptance_score_prompt.txt | 验收评分 | enterprise_full_name, main_products 等 |

### 模板渲染流程

```
prompt_service.py 的 build_* 函数：
1. 从 prompts/ 读取 .txt 模板
2. 获取企业信息（knowledge_base_sections + enterprise_base_info）
3. 获取词库信息（lexicons）
4. 将数据填入 {{占位符}} 生成完整提示词
5. 传递给 llm_service.py 调用大模型
```

---

## 工作流程

```
          ┌─────────────┐
          │  企业知识库  │  录入企业信息、产品、图片、文档
          │  (AI 生成)  │  自动调用 LLM 生成企业档案/文库/发展历程
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │  诊断分析   │  官网诊断、竞品分析、出具报告
          │  (AI 分析)  │  5 种诊断模板 + 优化方案 + 排期
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │  问题词库   │  输入关键词 → 自动拆分 → LLM 生成拓展词
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │  文章创作   │  选择词库 → 选文章类型/风格 → AI 批量生成
          └──────┬──────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  ┌───────────┐    ┌───────────┐
  │  媒体发布  │    │  官媒发布  │  Excel 媒体资源库 → 筛选 → 投放
  └─────┬─────┘    └─────┬─────┘
        └────────┬────────┘
                 │
          ┌──────▼──────┐
          │  发布管理   │  聚合展示 + 收录/引用追踪
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │  数据统计   │  KPI 可视化 → 持续优化策略
          └─────────────┘
```

---

## 注意事项

1. 数据库密码安全：config.py 和 geo_config.R 中包含明文数据库连接信息，生产环境务必更换为强密码，且不要提交到公开代码仓库。

2. JWT Secret：生产环境必须更换 JWT_SECRET，建议使用 python -c "import secrets; print(secrets.token_urlsafe(32))" 生成随机密钥。

3. Excel 数据文件：2026年网站媒体及官方自媒体报价-Q2.xls 是媒体发布功能的数据源，统一放在 data/ 目录下（前端通过 /data 读取）。

4. AUTH_DISABLED 开关：生产部署时务必设置 AUTH_DISABLED=False，否则所有请求跳过认证。

5. 跨域通信：前端页面通过 window.postMessage 与 R Shiny 后端通信，本地开发时需注意浏览器跨域策略。

6. 字符编码：数据库及所有相关配置请统一使用 utf8mb4，避免中文内容乱码。

7. 静态资源托管：FastAPI 通过 StaticFiles 直接挂载 www/（SPA）、data/（数据集静态访问）以及 /uploads（对应 data/uploads），无需额外 Nginx 配置即可独立运行。生产环境建议 Nginx 直接托管静态资源以减轻后端负载。

8. 迁移脚本幂等性：所有建表语句使用 CREATE TABLE IF NOT EXISTS，种子数据使用 INSERT IGNORE，支持重复启动。

9. 系统到期提示：前端会展示“系统到期时间：2026-12-31”（见 `www/index.js`），目前为页面提示文案，不属于后端授权控制逻辑。

---

## 联系与支持

如有问题，请通过系统内的联系我们模块提交反馈。

---

*© 2026 时代科技 · GEO 优化平台*
