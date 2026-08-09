"""
FastAPI 主入口
运行：python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""
import sys
import os

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import FastAPI, Request, Depends, UploadFile, File, Body, HTTPException
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
import time
from pathlib import Path
from typing import Optional, List, Dict
from pydantic import BaseModel
import json
import uuid
import re
import html
import ipaddress
from urllib.parse import urlparse

from backend.config import settings
from backend.utils.api_response import api_response, APIException
from backend.database import apply_migrations
from backend.schemas import (
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    ArticleCreateRequest,
    ArticleUpdateRequest,
    LexiconCreateRequest,
    MonitorTaskCreateRequest,
)

import math
import numbers


class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        def _sanitize_value(v):
            try:
                import pandas as pd  # type: ignore
                try:
                    if pd.isna(v):
                        return None
                except Exception:
                    pass
            except Exception:
                pass
            if v is None:
                return None
            if isinstance(v, bool):
                return v
            if isinstance(v, float):
                if not math.isfinite(v):
                    return None
                return v
            if isinstance(v, numbers.Number):
                try:
                    fv = float(v)
                except Exception:
                    return None
                if not math.isfinite(fv):
                    return None
                try:
                    if isinstance(v, int):
                        return int(v)
                except Exception:
                    pass
                return fv
            return v

        def _sanitize_key(k):
            kk = _sanitize_value(k)
            if kk is None:
                return "null"
            try:
                if isinstance(kk, numbers.Number) and not isinstance(kk, bool):
                    return str(kk)
            except Exception:
                pass
            return str(kk)

        def _sanitize_obj(obj):
            if isinstance(obj, dict):
                out = {}
                for k, v in obj.items():
                    out[_sanitize_key(k)] = _sanitize_obj(v)
                return out
            if isinstance(obj, (list, tuple, set)):
                return [_sanitize_obj(x) for x in obj]
            return _sanitize_value(obj)

        encoded = jsonable_encoder(content)
        encoded = _sanitize_obj(encoded)
        return json.dumps(encoded, ensure_ascii=False, allow_nan=False).encode("utf-8")


# 创建 FastAPI 应用
app = FastAPI(
    title="GEO API",
    description="GEO 优化平台 REST API（Python/FastAPI 重构版）",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    default_response_class=SafeJSONResponse,
)

# CORS（开发环境放开，生产环境按配置）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------- 统一异常处理器 --------
@app.exception_handler(APIException)
def api_exception_handler(request: Request, exc: APIException):
    return api_response(error={"code": exc.code, "message": exc.message}, status_code=exc.status_code)

@app.exception_handler(Exception)
def generic_exception_handler(request: Request, exc: Exception):
    return api_response(error={"code": "INTERNAL_ERROR", "message": str(exc)}, status_code=500)

# ------- 请求日志中间件（开发用）--------
class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = round((time.time() - start) * 1000, 2)
        print(f"[API] {request.method} {request.url.path} -> {response.status_code} ({elapsed}ms)")
        return response

if settings.DEBUG:
    app.add_middleware(LogMiddleware)


@app.on_event("startup")
async def _startup():
    apply_migrations()

from backend.auth.dependencies import get_current_user
from backend.utils.api_response import ok, fail
from backend.api.publish_records import router as publish_records_router
from backend.api.official_publish import router as official_publish_router
from backend.crawlers.website import scrape_website_sync, auto_resolve_website_url

app.include_router(publish_records_router)
app.include_router(official_publish_router)


@app.post("/api/v1/auth/login")
async def auth_login(req: LoginRequest):
    from backend.services.auth_service import verify_user
    from backend.auth.jwt_handler import generate_token_pair
    user = await verify_user(req.phone, req.password)
    if user is None:
        return fail("INVALID_CREDENTIALS", "手机号或密码错误")
    tokens = generate_token_pair(user["id"])
    return ok({"accessToken": tokens["access"], "refreshToken": tokens["refresh"]})


@app.post("/api/v1/auth/register")
async def auth_register(req: RegisterRequest):
    from backend.services.auth_service import create_user
    from backend.auth.jwt_handler import generate_token_pair
    user_id = await create_user(req.phone, req.password, req.real_name)
    if user_id is None:
        return fail("DUPLICATE", "手机号已注册")
    tokens = generate_token_pair(user_id)
    return ok({"accessToken": tokens["access"], "refreshToken": tokens["refresh"]})


@app.post("/api/v1/auth/refresh")
async def auth_refresh(req: RefreshRequest):
    from backend.services.auth_service import get_user_by_id
    from backend.auth.jwt_handler import decode_token, generate_token_pair
    payload = decode_token(req.refreshToken)
    if payload is None or payload.get("type") != "refresh":
        return fail("INVALID_TOKEN", "refresh token 无效或已过期")
    user_id = int(payload["sub"])
    user = await get_user_by_id(user_id)
    if user is None:
        return fail("USER_NOT_FOUND", "用户不存在")
    new_access = generate_token_pair(user_id)["access"]
    return ok({"accessToken": new_access})


@app.post("/api/v1/auth/logout")
async def auth_logout():
    return ok({"logged_out": True})


@app.get("/api/v1/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return ok({
        "id": user["id"],
        "phone": user["phone"],
        "real_name": user.get("real_name"),
        "is_real_name_verified": bool(user.get("is_real_name_verified", 0)),
    })


class TenantCreateRequest(BaseModel):
    name: str
    industry: Optional[str] = None


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None


@app.get("/api/v1/tenants")
async def tenants_list(user=Depends(get_current_user)):
    from backend.database import query
    items = query(
        "SELECT t.* FROM tenants t JOIN user_tenant ut ON t.id=ut.tenant_id WHERE ut.user_id=%s ORDER BY t.id DESC",
        [user["id"]],
    )
    return ok({"items": items})


@app.post("/api/v1/tenants")
async def tenants_create(req: TenantCreateRequest, user=Depends(get_current_user)):
    from backend.database import insert
    tid = insert(
        "INSERT INTO tenants (name, industry) VALUES (%s, %s)",
        [req.name, req.industry],
    )
    insert(
        "INSERT INTO user_tenant (user_id, tenant_id, role) VALUES (%s, %s, 'owner')",
        [user["id"], tid],
    )
    return ok({"id": tid, "name": req.name})


@app.put("/api/v1/tenants/{tid}")
async def tenants_update(tid: int, req: TenantUpdateRequest, user=Depends(get_current_user)):
    from backend.database import execute
    fields = []
    params = []
    if req.name is not None:
        fields.append("name=%s")
        params.append(req.name)
    if req.industry is not None:
        fields.append("industry=%s")
        params.append(req.industry)
    if not fields:
        return fail("INVALID_PARAM", "没有要更新的字段")
    params.append(tid)
    execute(
        f"UPDATE tenants SET {', '.join(fields)} WHERE id=%s AND id IN (SELECT tenant_id FROM user_tenant WHERE user_id=%s)",
        params + [user["id"]],
    )
    return ok({"updated": True})


@app.post("/api/v1/tenants/{tid}/switch")
async def tenants_switch(tid: int, user=Depends(get_current_user)):
    from backend.database import query_row
    ok_row = query_row(
        "SELECT 1 FROM user_tenant WHERE user_id=%s AND tenant_id=%s",
        [user["id"], tid],
    )
    if not ok_row:
        return fail("NOT_FOUND", "租户不存在或无权访问")
    return ok({"switched": True, "tenant_id": tid})


# ── Dashboard Stats ──
@app.get("/api/v1/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    from backend.database import query, query_row
    stats = {"total_articles": 0, "llm_stats": [], "publish_by_platform": {}}
    try:
        r = query_row("SELECT COUNT(*) as c FROM articles")
        stats["total_articles"] = int((r or {}).get("c", 0))
    except Exception:
        stats["total_articles"] = 0

    # llm_stats: 尝试从 articles 按 article_type 分组作为各模型产出
    try:
        llm_rows = query("SELECT article_type, COUNT(*) as articles FROM articles GROUP BY article_type")
        stats["llm_stats"] = [{"model": str(row.get("article_type", "")), "articles": int(row.get("articles", 0))} for row in (llm_rows or [])]
    except Exception:
        pass

    # publish_by_platform
    try:
        from backend.api.publish_records import _detect_publish_records_schema
        sch = _detect_publish_records_schema()
        if sch:
            pcol = sch.get("platform_col") or "platform_code"
            pr_rows = query(f"SELECT {pcol}, COUNT(*) as cnt FROM publish_records GROUP BY {pcol}")
            platforms = {}
            for row in (pr_rows or []):
                p = str(row.get(pcol, "")).strip()
                if p:
                    platforms[p] = int(row.get("cnt", 0))
            stats["publish_by_platform"] = platforms
    except Exception:
        pass

    return ok(stats)


@app.get("/api/v1/articles")
async def articles_list(
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None,
    review_status: Optional[int] = 1,
    user=Depends(get_current_user),
):
    from backend.database import query, query_row
    where = "WHERE 1=1"
    params = []
    if keyword:
        where += " AND title LIKE %s"
        params.append(f"%{keyword}%")
    if review_status is not None and review_status >= 0:
        where += " AND review_status = %s"
        params.append(review_status)
    params.append(page_size)
    params.append((page - 1) * page_size)
    sql = f"""
        SELECT id, title, article_type, creation_type, style, tone, brand_embed,
               review_status,
               DATE_FORMAT(reviewed_at, '%%Y-%%m-%%d %%H:%%i:%%s') as reviewed_at,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at
        FROM articles {where} ORDER BY id DESC LIMIT %s OFFSET %s
    """
    items = query(sql, params)
    total = query_row(f"SELECT COUNT(*) as c FROM articles {where.split('ORDER')[0]}", params[:-2])
    return ok({"total": total["c"], "page": page, "pageSize": page_size, "items": items})


@app.post("/api/v1/articles")
async def articles_create(req: ArticleCreateRequest, user=Depends(get_current_user)):
    from backend.database import query_row, insert
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_article_prompt

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon_id = int(req.lexicon_id or 0)
    lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) if lexicon_id > 0 else None
    lexicon = lexicon or {}

    def load_kb_section(sec: str):
        row = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], sec],
        ) or {}
        content = row.get("content")
        if not content:
            return None
        try:
            return json.loads(content)
        except Exception:
            return content

    kb_base = load_kb_section("企业基础信息")
    kb_docs = load_kb_section("docs")

    task = {
        "tab": req.tab,
        "question_text": req.question_text,
        "platforms": req.platforms,
        "article_type": req.article_type,
        "style": req.style,
        "tone": req.tone,
        "brand_embed": req.brand_embed,
        "user_input": req.user_input,
        "product": req.product,
        "products": req.products,
        "images": req.images,
    }
    content = str(req.content or "").strip()
    if not content:
        prompt = build_article_prompt(enterprise, lexicon, task, kb_base=kb_base, kb_docs=kb_docs)
        content = await async_call_llm(prompt)
        if not content or not content.strip():
            return fail("LLM_ERROR", "大模型服务无返回，请确认服务已启动且可访问")

    title = req.title or ""
    if not title:
        first_line = content.strip().split("\n")[0] if "\n" in content else content.strip()[:120]
        title = first_line.replace("标题：", "").replace("标题:", "").strip()[:120]
        if not title:
            title = (lexicon.get("company", "") + " " + lexicon.get("industry_keyword", "")).strip()[:120]

    article_type = req.article_type or {"product": "产品宣传", "brand": "企业品牌", "activity": "活动关键词"}.get(req.tab, "")
    aid = insert(
        """INSERT INTO articles (title, content, article_type, creation_type, style, tone, brand_embed, review_status, enterprise_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s)""",
        [title, content, article_type, req.tab, req.style, req.tone, 1 if req.brand_embed else 0, enterprise.get("id")],
    )
    return ok({"article_id": aid, "title": title, "content": content})


@app.get("/api/v1/articles/{aid}")
async def articles_get(aid: int, user=Depends(get_current_user)):
    from backend.database import query_row
    row = query_row(
        """SELECT id, title, content, article_type, creation_type, style, tone, brand_embed, review_status,
                  DATE_FORMAT(reviewed_at, '%%Y-%%m-%%d %%H:%%i:%%s') as reviewed_at,
                  DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at
           FROM articles WHERE id=%s""",
        [aid],
    )
    if not row:
        return fail("NOT_FOUND", "文章不存在")
    return ok(row)


@app.put("/api/v1/articles/{aid}")
async def articles_update(aid: int, req: ArticleUpdateRequest, user=Depends(get_current_user)):
    from backend.database import execute
    fields = []
    params = []
    if req.title is not None:
        fields.append("title=%s")
        params.append(req.title)
    if req.content is not None:
        fields.append("content=%s")
        params.append(req.content)
    if not fields:
        return fail("INVALID_PARAM", "没有要更新的字段")
    fields.append("updated_at=NOW()")
    params.append(aid)
    execute(f"UPDATE articles SET {', '.join(fields)} WHERE id=%s", params)
    return ok({"updated": True})


@app.post("/api/v1/articles/{aid}/review")
async def articles_review(aid: int, user=Depends(get_current_user)):
    from backend.database import execute, query_row
    row = query_row("SELECT review_status FROM articles WHERE id=%s", [aid])
    current = int((row or {}).get("review_status", 0) or 0)
    new_status = 0 if current == 1 else 1
    if new_status == 1:
        execute("UPDATE articles SET review_status=1, reviewed_at=NOW(), updated_at=NOW() WHERE id=%s", [aid])
    else:
        execute("UPDATE articles SET review_status=0, reviewed_at=NULL, updated_at=NOW() WHERE id=%s", [aid])
    return ok({"reviewed": new_status == 1, "review_status": new_status})


@app.delete("/api/v1/articles/{aid}")
async def articles_delete(aid: int, user=Depends(get_current_user)):
    from backend.database import execute
    execute("DELETE FROM articles WHERE id=%s", [aid])
    return ok({"deleted": True})


@app.get("/api/v1/question-words")
async def question_words_list(
    page: int = 1,
    page_size: int = 20,
    lexicon_id: Optional[int] = None,
    user=Depends(get_current_user),
):
    from backend.database import query, query_row
    if lexicon_id:
        return await question_words_by_lexicon(lexicon_id, user)
    limit = page_size
    offset = (page - 1) * page_size
    sql = """
        SELECT l.id, l.name, l.company, l.industry_keyword, l.decision_stage, l.words, l.expand_words, l.question_keyword,
               (SELECT question_text FROM question_words WHERE lexicon_id=l.id ORDER BY seq_no LIMIT 1) as first_question,
               (SELECT COUNT(*) FROM question_words WHERE lexicon_id=l.id) as question_count,
               DATE_FORMAT(l.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at
        FROM lexicons l
        WHERE l.user_id=%s
        ORDER BY l.id DESC LIMIT %s OFFSET %s
    """
    items = query(sql, [user["id"], limit, offset])
    for it in items:
        w = it.get("words")
        if isinstance(w, (bytes, bytearray)):
            try:
                w = w.decode("utf-8")
            except Exception:
                w = None
        if isinstance(w, str) and w:
            try:
                it["words"] = json.loads(w)
            except Exception:
                it["words"] = w
    total = query_row("SELECT COUNT(*) as c FROM lexicons WHERE user_id=%s", [user["id"]])
    return ok({"total": total["c"], "page": page, "pageSize": page_size, "items": items})


@app.get("/api/v1/question-words/suggest")
async def question_words_suggest(q: str = "", limit: int = 10, user=Depends(get_current_user)):
    from backend.database import query
    kw = str(q or "").strip()
    if not kw:
        return ok({"items": []})
    if limit < 1:
        limit = 10
    if limit > 50:
        limit = 50
    like = f"%{kw}%"
    prefix = f"{kw}%"
    rows = query(
        """
        SELECT qw.id as question_id,
               qw.lexicon_id,
               qw.question_text,
               DATE_FORMAT(qw.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as question_created_at,
               DATE_FORMAT(qw.gen_date, '%%Y-%%m-%%d') as gen_date,
               l.name as lexicon_name,
               DATE_FORMAT(l.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at
        FROM question_words qw
        JOIN lexicons l ON l.id=qw.lexicon_id
        WHERE l.user_id=%s AND qw.question_text LIKE %s
        ORDER BY (qw.question_text LIKE %s) DESC, qw.id DESC
        LIMIT %s
        """,
        [user["id"], like, prefix, limit],
    )
    items = []
    seen = set()
    for r in rows:
        txt = str(r.get("question_text") or "").strip()
        lid = r.get("lexicon_id")
        key = f"{lid}:{txt}"
        if not txt or key in seen:
            continue
        seen.add(key)
        items.append({
            "question_id": r.get("question_id"),
            "lexicon_id": lid,
            "question_text": txt,
            "lexicon_name": r.get("lexicon_name") or "",
            "created_at": r.get("created_at") or "",
            "question_created_at": r.get("question_created_at") or "",
            "gen_date": r.get("gen_date") or "",
        })
        if len(items) >= limit:
            break
    return ok({"items": items})


@app.get("/api/v1/question-words/by-lexicon")
async def question_words_by_lexicon(lexicon_id: int, user=Depends(get_current_user)):
    from backend.database import query, query_row
    own = query_row("SELECT id FROM lexicons WHERE id=%s AND user_id=%s", [lexicon_id, user["id"]])
    if not own:
        return fail("NOT_FOUND", "词库不存在或无权访问")
    rows = query(
        """
        SELECT id,
               seq_no,
               question_text,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at,
               DATE_FORMAT(gen_date, '%%Y-%%m-%%d') as gen_date
        FROM question_words
        WHERE lexicon_id=%s
        ORDER BY seq_no ASC, id ASC
        """,
        [lexicon_id],
    )
    return ok({"items": rows, "lexicon_id": lexicon_id})


@app.get("/api/v1/products")
async def products_list(page: int = 1, page_size: int = 200, keyword: Optional[str] = None, user=Depends(get_current_user)):
    from backend.database import query, query_row
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 200
    if page_size > 500:
        page_size = 500
    where = "WHERE 1=1"
    params = []
    if keyword:
        kw = str(keyword).strip()
        if kw:
            where += " AND (product_name LIKE %s OR material LIKE %s OR craft LIKE %s OR origin LIKE %s)"
            like = f"%{kw}%"
            params.extend([like, like, like, like])
    limit = page_size
    offset = (page - 1) * page_size
    try:
        items = query(
            f"SELECT * FROM products {where} ORDER BY id DESC LIMIT %s OFFSET %s",
            params + [limit, offset],
        )
        ids = [int(r["id"]) for r in items if r.get("id") is not None]
        images_map = {}
        if ids:
            placeholders = ",".join(["%s"] * len(ids))
            imgs = query(
                f"SELECT product_id, image_url, sort_order FROM product_images WHERE product_id IN ({placeholders}) ORDER BY product_id ASC, sort_order ASC, id ASC",
                ids,
            )
            for r in imgs:
                pid = int(r.get("product_id") or 0)
                url = str(r.get("image_url") or "").strip()
                if not pid or not url:
                    continue
                if pid not in images_map:
                    images_map[pid] = []
                if len(images_map[pid]) < 9:
                    images_map[pid].append(url)
        for it in items:
            pid = int(it.get("id") or 0)
            it["images"] = images_map.get(pid, [])
            it["precise_product_name"] = it.get("product_name") or ""
            it["core_material"] = it.get("material") or ""
            it["core_features"] = it.get("craft") or it.get("core_function") or ""
            it["core_params"] = it.get("specs") or ""
            it["use_scenarios"] = it.get("use_scene") or ""
            it["core_advantages"] = it.get("advantages") or ""
            it["target_audience"] = it.get("target_group") or ""
            it["customization_capability"] = it.get("delivery") or ""
            it["target_market"] = it.get("origin") or ""
        total = query_row(f"SELECT COUNT(*) as c FROM products {where}", params)
        if int(total.get("c") or 0) == 0:
            raise Exception("EMPTY_PRODUCTS_TABLE")
        return ok({"total": total["c"], "page": page, "pageSize": page_size, "items": items})
    except Exception:
        from backend.database import query_row as _qr
        row = _qr(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], "products"],
        )
        if not row or not row.get("content"):
            return ok({"total": 0, "page": page, "pageSize": page_size, "items": []})
        try:
            data = json.loads(row["content"])
        except Exception:
            data = {}
        rows = []
        if isinstance(data, dict) and isinstance(data.get("rows"), list):
            rows = data.get("rows") or []
        items2 = []
        kw2 = str(keyword or "").strip().lower()
        for idx, r in enumerate(rows[:2000]):
            if not isinstance(r, dict):
                continue
            name = str(r.get("precise_product_name") or r.get("product_name") or "").strip()
            if kw2:
                hay = " ".join([
                    name,
                    str(r.get("core_features") or r.get("craft") or ""),
                    str(r.get("core_material") or r.get("material") or ""),
                    str(r.get("target_market") or r.get("origin") or ""),
                ]).lower()
                if kw2 not in hay:
                    continue
            item = dict(r)
            item["id"] = item.get("id") or item.get("__id") or str(item.get("seq") or (idx + 1))
            item["precise_product_name"] = item.get("precise_product_name") or item.get("product_name") or ""
            item["core_material"] = item.get("core_material") or item.get("material") or ""
            item["core_features"] = item.get("core_features") or item.get("craft") or item.get("core_function") or ""
            item["core_params"] = item.get("core_params") or item.get("specs") or ""
            item["use_scenarios"] = item.get("use_scenarios") or item.get("use_scene") or ""
            item["core_advantages"] = item.get("core_advantages") or item.get("advantages") or ""
            item["target_audience"] = item.get("target_audience") or item.get("target_group") or ""
            item["customization_capability"] = item.get("customization_capability") or item.get("delivery") or ""
            item["target_market"] = item.get("target_market") or item.get("origin") or ""
            imgs = item.get("images")
            if not isinstance(imgs, list):
                item["images"] = []
            items2.append(item)
        total2 = len(items2)
        start = (page - 1) * page_size
        end = start + page_size
        return ok({"total": total2, "page": page, "pageSize": page_size, "items": items2[start:end]})


@app.get("/api/v1/enterprise-images")
async def enterprise_images_list(limit: int = 200, category: Optional[str] = None, user=Depends(get_current_user)):
    from backend.database import query
    if limit < 1:
        limit = 200
    if limit > 500:
        limit = 500
    params = []
    where = "WHERE 1=1"
    if category:
        cat = str(category).strip()
        if cat:
            where += " AND category=%s"
            params.append(cat)
    try:
        images = query(f"SELECT * FROM enterprise_images {where} ORDER BY id DESC LIMIT %s", params + [limit])
        cats = query("SELECT category FROM enterprise_image_categories ORDER BY id DESC LIMIT 200")
        categories = []
        seen = set()
        for r in cats:
            c = str(r.get("category") or "").strip()
            if not c or c in seen:
                continue
            seen.add(c)
            categories.append(c)
        if images:
            return ok({"categories": categories, "images": images})
    except Exception:
        images = []
        categories = []

    from backend.database import query_row as _qr
    row = _qr(
        "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
        [user["id"], "images"],
    )
    if not row or not row.get("content"):
        return ok({"categories": [], "images": []})
    try:
        data = json.loads(row["content"])
    except Exception:
        data = {}
    cats2 = data.get("categories") if isinstance(data, dict) else None
    imgs2 = data.get("images") if isinstance(data, dict) else None
    cats2 = cats2 if isinstance(cats2, list) else []
    imgs2 = imgs2 if isinstance(imgs2, list) else []
    cat_name_by_id = {}
    for c in cats2[:500]:
        if not isinstance(c, dict):
            continue
        cid = str(c.get("id") or "").strip()
        name = str(c.get("name") or c.get("category") or "").strip()
        if cid and name:
            cat_name_by_id[cid] = name
    categories2 = []
    seen2 = set()
    for name in cat_name_by_id.values():
        if name and name not in seen2:
            seen2.add(name)
            categories2.append(name)
    out = []
    for it in imgs2[:2000]:
        if not isinstance(it, dict):
            continue
        name = str(it.get("name") or it.get("file_name") or it.get("filename") or "").strip()
        cat_id = str(it.get("category_id") or "").strip()
        cat_name = str(it.get("category") or cat_name_by_id.get(cat_id, "") or "").strip()
        if category:
            cat = str(category).strip()
            if cat and cat_name != cat:
                continue
        out.append({
            "id": it.get("id") or "",
            "name": name,
            "category": cat_name,
            "created_at": it.get("created_at") or "",
            "url": it.get("url") or "",
            "image_url": it.get("url") or it.get("image_url") or "",
        })
        if len(out) >= limit:
            break
    return ok({"categories": categories2, "images": out})


@app.get("/api/v1/geo-ui-saves")
async def geo_ui_saves_get(page: str = "", section: Optional[str] = None, user=Depends(get_current_user)):
    from backend.database import query_row
    p = str(section or page or "").strip()
    if not p:
        return fail("INVALID_PARAM", "page 不能为空")
    row = query_row("SELECT * FROM geo_ui_saves WHERE page=%s ORDER BY id DESC LIMIT 1", [p])
    if not row:
        return ok({"page": p, "payload": None})
    try:
        payload = json.loads(row.get("payload_json") or "{}")
    except Exception:
        payload = row.get("payload_json")
    return ok({"page": p, "payload": payload, "id": row.get("id"), "created_at": row.get("created_at")})


@app.post("/api/v1/geo-ui-saves")
async def geo_ui_saves_save(body: dict, user=Depends(get_current_user)):
    from backend.database import insert
    p = str(body.get("section") or body.get("page") or "").strip()
    payload = body.get("payload")
    if not p:
        return fail("INVALID_PARAM", "page 不能为空")
    try:
        payload_json = json.dumps(payload, ensure_ascii=False)
    except Exception:
        payload_json = json.dumps({"raw": str(payload)}, ensure_ascii=False)
    sid = insert("INSERT INTO geo_ui_saves (page, payload_json) VALUES (%s, %s)", [p, payload_json])
    return ok({"id": sid, "page": p})


@app.get("/api/v1/question-words/items")
async def question_words_items(lexicon_id: int, user=Depends(get_current_user)):
    return await question_words_by_lexicon(lexicon_id, user)


@app.post("/api/v1/question-words")
async def question_words_create(req: LexiconCreateRequest, user=Depends(get_current_user)):
    from backend.database import insert, execute
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_expand_words_prompt
    words_obj = req.words or {}
    lid = insert(
        """INSERT INTO lexicons (user_id, name, company, industry_keyword, decision_stage, words, question_keyword)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        [
            user["id"],
            req.name or "",
            req.company or "",
            req.industry_keyword or "",
            req.decision_stage or "",
            json.dumps(words_obj, ensure_ascii=False),
            req.question_keyword or req.industry_keyword or "",
        ],
    )
    keywords = list(req.keywords or [])
    if not keywords:
        region = str((words_obj or {}).get("region") or "").strip()
        feature = str((words_obj or {}).get("feature") or "").strip()
        scene = str((words_obj or {}).get("scene") or "").strip()
        people = str((words_obj or {}).get("people") or "").strip()
        keywords = [
            str(req.industry_keyword or "").strip(),
            region,
            feature,
            scene,
            people,
        ]
        keywords = [k for k in keywords if k]
    seen = set()
    keywords2 = []
    for k in keywords:
        kk = str(k).strip()
        if not kk or kk in seen:
            continue
        seen.add(kk)
        keywords2.append(kk)
    for i, w in enumerate(keywords2, 1):
        insert(
            "INSERT INTO question_words (lexicon_id, enterprise_id, seq_no, question_text, gen_date) VALUES (%s, %s, %s, %s, CURDATE())",
            [lid, None, i, w],
        )
    kw = req.industry_keyword or ""
    if kw:
        try:
            prompt = build_expand_words_prompt(kw)
            expand = await async_call_llm(prompt)
            if expand:
                execute("UPDATE lexicons SET expand_words=%s WHERE id=%s", [expand[:500], lid])
        except Exception as e:
            print(f"[expand] 生成失败：{e}")
    return ok({"id": lid, "question_count": len(keywords2)})


@app.delete("/api/v1/question-words")
async def question_words_delete(ids: List[int] = Body(default=[]), user=Depends(get_current_user)):
    from backend.database import query, execute
    if not ids:
        return fail("INVALID_PARAM", "未提供有效 id")
    placeholders = ",".join(["%s"] * len(ids))
    uid = user["id"]; own = query(f"SELECT id FROM lexicons WHERE id IN ({placeholders}) AND user_id=%s", ids + [uid])
    own_ids = [int(r["id"]) for r in own if r.get("id") is not None]
    if not own_ids:
        return fail("NOT_FOUND", "未找到可删除的记录")
    o_placeholders = ",".join(["%s"] * len(own_ids))
    execute(f"DELETE FROM question_words WHERE lexicon_id IN ({o_placeholders})", own_ids)
    execute(f"DELETE FROM lexicons WHERE id IN ({o_placeholders})", own_ids)
    return ok({"deleted": len(own_ids)})


@app.get("/api/v1/monitor-tasks")
async def monitor_tasks_list(user=Depends(get_current_user)):
    from backend.database import query
    items = query("SELECT * FROM monitor_tasks WHERE user_id=%s ORDER BY id DESC", [user["id"]])
    return ok({"items": items})


@app.post("/api/v1/monitor-tasks")
async def monitor_tasks_create(req: MonitorTaskCreateRequest, user=Depends(get_current_user)):
    from backend.database import insert
    platforms_json = json.dumps(req.platforms, ensure_ascii=False)
    tid = insert(
        """INSERT INTO monitor_tasks (user_id, enterprise_id, keyword, platforms, status)
           VALUES (%s, %s, %s, %s, 'active')""",
        [user["id"], None, req.keyword, platforms_json],
    )
    return ok({"id": tid, "status": "active"})


@app.put("/api/v1/monitor-tasks/{tid}")
async def monitor_tasks_update(tid: int, body: dict, user=Depends(get_current_user)):
    from backend.database import execute
    status = body.get("status", "active")
    execute(
        "UPDATE monitor_tasks SET status=%s, last_run_at=NOW() WHERE id=%s AND user_id=%s",
        [status, tid, user["id"]],
    )
    return ok({"updated": True})


@app.delete("/api/v1/monitor-tasks/{tid}")
async def monitor_tasks_delete(tid: int, user=Depends(get_current_user)):
    from backend.database import execute
    execute("DELETE FROM monitor_tasks WHERE id=%s AND user_id=%s", [tid, user["id"]])


@app.get("/api/v1/public-opinion/search")
async def public_opinion_search(
    keyword: str = "",
    info_type: str = "all",
    sentiment: str = "all",
    page: int = 1,
    page_size: int = 20,
    user=Depends(get_current_user),
):
    from backend.crawlers.opinion import search_opinion

    if not keyword.strip():
        return fail("INVALID_PARAM", "keyword 不能为空")

    try:
        result = search_opinion(
            keyword=keyword.strip(),
            info_type=info_type,
            sentiment=sentiment,
            page=page,
            page_size=page_size,
        )
        return ok(result)
    except Exception as e:
        return fail("SEARCH_ERROR", str(e))
    return ok({"deleted": True})


@app.post("/api/v1/files/upload")
async def files_upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    from backend.database import insert
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    ext = Path(file.filename).suffix
    save_name = f"{uuid.uuid4().hex}{ext}"
    save_path = upload_dir / save_name
    content = await file.read()
    save_path.write_bytes(content)
    fid = insert(
        "INSERT INTO enterprise_images (enterprise_id, category, image_url, file_name) VALUES (%s, %s, %s, %s)",
        [None, "default", f"/uploads/{save_name}", file.filename],
    )
    return ok({"id": fid, "url": f"/uploads/{save_name}", "filename": file.filename})


@app.get("/api/v1/files")
async def files_list(user=Depends(get_current_user)):
    from backend.database import query
    items = query("SELECT * FROM enterprise_images ORDER BY id DESC LIMIT 200")
    return ok({"items": items})


@app.get("/api/v1/files/{fid}")
async def files_get(fid: int, user=Depends(get_current_user)):
    from backend.database import query_row
    row = query_row("SELECT * FROM enterprise_images WHERE id=%s", [fid])
    if not row:
        return fail("NOT_FOUND", "文件不存在")
    path = Path("uploads") / str(row["image_url"]).split("/")[-1]
    if not path.exists():
        return fail("NOT_FOUND", "文件不存在")
    return FileResponse(path, filename=row.get("file_name"))


@app.delete("/api/v1/files/{fid}")
async def files_delete(fid: int, user=Depends(get_current_user)):
    from backend.database import execute
    execute("DELETE FROM enterprise_images WHERE id=%s", [fid])
    return ok({"deleted": True})


@app.post("/api/v1/billing/consume")
async def billing_consume(body: dict, user=Depends(get_current_user)):
    from backend.services.consume_service import add_consumption
    event_type = str(body.get("event_type") or body.get("eventType") or "ui")
    page = str(body.get("page") or "")
    action = str(body.get("action") or "")
    units = body.get("units")
    amount = body.get("amount", 0)
    currency = str(body.get("currency") or "CNY")
    meta = body.get("meta") or body
    try:
        add_consumption(event_type, page=page, action=action, units=units, amount=amount, currency=currency, meta=meta)
    except Exception as e:
        return fail("DB_ERROR", str(e))
    return ok({"ok": True})


@app.get("/api/v1/billing/balance")
async def billing_balance(user=Depends(get_current_user)):
    from backend.database import query_row
    row = query_row(
        "SELECT COALESCE(SUM(amount),0) as balance FROM consumption_details WHERE event_type='recharge' AND page=%s",
        [str(user["id"])],
    ) or {"balance": 0}
    return ok({"balance": float(row["balance"])})


@app.get("/api/v1/billing/transactions")
async def billing_transactions(
    page: int = 1,
    page_size: int = 20,
    event_type: Optional[str] = None,
    user=Depends(get_current_user),
):
    from backend.database import query, query_row
    where = "WHERE page=%s"
    params = [str(user["id"])]
    if event_type:
        where += " AND event_type=%s"
        params.append(event_type)
    params.extend([page_size, (page - 1) * page_size])
    items = query(
        f"SELECT * FROM consumption_details {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
        params,
    )
    total = query_row(f"SELECT COUNT(*) as c FROM consumption_details {where.split('ORDER')[0]}", params[:-2])
    return ok({"total": total["c"], "page": page, "pageSize": page_size, "items": items})


@app.get("/api/v1/ai/models")
async def ai_models(user=Depends(get_current_user)):
    return ok({
        "models": [
            {"id": "wenxin", "name": "文心一言"},
            {"id": "doubao", "name": "豆包"},
            {"id": "kimi", "name": "Kimi"},
            {"id": "qwen", "name": "通义千问"},
        ]
    })


@app.post("/api/v1/diagnosis/scrape-website")
async def scrape_website_endpoint(body: dict, user=Depends(get_current_user)):
    """实时抓取官网页面内容"""
    url = str(body.get("url") or "").strip()
    if not url:
        return fail("MISSING_URL", "请提供目标网址")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    from backend.crawlers.website import scrape_website_sync
    result = scrape_website_sync(url, timeout=15, max_chars=15000)
    return ok(result)


@app.post("/api/v1/ai/execute")
async def ai_execute(body: dict, user=Depends(get_current_user)):
    from backend.database import query_row
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import (
        build_title_prompt,
        build_activity_desc_prompt,
        build_kb_profile_prompt,
        build_kb_library_prompt,
        build_kb_timeline_prompt,
        build_kb_positioning_prompt,
        build_article_prompt,
        build_article_product_chat_prompt,
        build_article_writing_init_chat_prompt,
        build_data_diagnosis_prompt,
        build_website_diagnosis_prompt,
        build_competitor_discovery_prompt,
        build_competitor_analysis_prompt,
        build_diagnosis_report_prompt,
        build_diagnosis_report_with_scrape_prompt,
        build_optimization_plan_prompt,
        build_optimization_schedule_prompt,
        build_acceptance_score_prompt,
    )
    task = body.get("task", "")
    lexicon_id = body.get("lexicon_id")
    keyword = body.get("keyword", "")
    hint = body.get("hint", "")
    page_context = str(body.get("page_context") or "").strip()

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon = {}
    if lexicon_id:
        lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) or {}

    kb_base = {}
    kb_docs = {}
    try:
        row1 = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], "企业基础信息"],
        ) or {}
        kb_base = json.loads(row1.get("content") or "{}") if row1 else {}
    except Exception:
        kb_base = {}

    try:
        row2 = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], "docs"],
        ) or {}
        kb_docs = json.loads(row2.get("content") or "{}") if row2 else {}
    except Exception:
        kb_docs = {}

    def _timeline_text(d):
        rows = d.get("timeline_rows") if isinstance(d, dict) else None
        if not isinstance(rows, list) or not rows:
            return ""
        parts = []
        for r in rows[:30]:
            t = str((r or {}).get("time") or "").strip()
            e = str((r or {}).get("event") or "").strip()
            if t or e:
                parts.append(f"{t} {e}".strip())
        return "\n".join(parts)

    # 合并前端表单实时值（用户可能刚填了但尚未保存）
    kb_form_values = body.get("kb_form_values") if isinstance(body.get("kb_form_values"), dict) else {}
    if kb_form_values:
        kb_base = {**kb_base, **kb_form_values}  # 表单值优先

    kb = {
        "enterprise_full_name": kb_base.get("企业全称") or enterprise.get("enterprise_full_name") or "",
        "enterprise_short_name": kb_base.get("企业简称") or enterprise.get("enterprise_short_name") or "",
        "enterprise_address": kb_base.get("企业地址") or enterprise.get("enterprise_address") or "",
        "enterprise_contact": kb_base.get("企业联系方式") or enterprise.get("enterprise_contact") or "",
        "enterprise_website": kb_base.get("企业官网") or enterprise.get("enterprise_website") or "",
        "main_products": kb_base.get("主营产品") or enterprise.get("main_products") or "",
        "target_customers": kb_base.get("目标客户") or enterprise.get("target_customers") or "",
        "sales_region": kb_base.get("销售区域范围") or enterprise.get("sales_region") or "",
        "sales_channel": kb_base.get("销售方式或渠道") or enterprise.get("sales_channel") or "",
        "enterprise_advantage": kb_base.get("企业优势") or enterprise.get("enterprise_advantage") or "",
        "product_advantage": kb_base.get("产品优势") or enterprise.get("product_advantage") or "",
        "tech_advantage": kb_base.get("技术优势") or enterprise.get("tech_advantage") or "",
        "company_profile": (kb_docs.get("company_profile") if isinstance(kb_docs, dict) else "") or "",
        "enterprise_library": (kb_docs.get("enterprise_library") if isinstance(kb_docs, dict) else "") or "",
        "main_positioning": (kb_docs.get("main_positioning") if isinstance(kb_docs, dict) else "") or "",
        "sub_positioning": (kb_docs.get("sub_positioning") if isinstance(kb_docs, dict) else "") or "",
        "timeline_text": _timeline_text(kb_docs if isinstance(kb_docs, dict) else {}),
        "extras": json.dumps({"base": kb_base, "docs": kb_docs}, ensure_ascii=False),
    }

    if task == "generate_title":
        prompt = build_title_prompt(enterprise, lexicon, keyword, hint)
    elif task == "generate_activity_desc":
        prompt = build_activity_desc_prompt(enterprise, lexicon, keyword, hint)
    elif task in ("generate_kb_profile", "generate_kb_library", "generate_kb_timeline", "generate_kb_positioning_main", "generate_kb_positioning_sub"):
        if task == "generate_kb_profile":
            prompt = build_kb_profile_prompt(kb)
        elif task == "generate_kb_library":
            prompt = build_kb_library_prompt(kb)
        elif task == "generate_kb_positioning_sub":
            prompt = build_kb_positioning_prompt(kb, mode="sub", current_text=str(body.get("current_text") or ""))
        elif task == "generate_kb_positioning_main":
            prompt = build_kb_positioning_prompt(kb, mode="main", current_text=str(body.get("current_text") or ""))
        else:
            prompt = build_kb_timeline_prompt(kb)
    elif task == "data_diagnosis":
        manual = str(body.get("manual") or body.get("input") or "").strip()
        prompt = build_data_diagnosis_prompt(kb, manual, page_context)
    elif task == "website_diagnosis":
        prompt = build_website_diagnosis_prompt(kb, page_context)
    elif task == "competitor_analysis":
        # ===== competitor auto-discovery + website scraping + corpus detection + comparison =====
        from backend.crawlers.website import compose_competitor_discovery_query, search_baidu_for_official_website, segment_and_summarize_long_content
        from backend.services.llm_service import call_llm_sync
        import json as _json, re as _re, logging as _logging
        _logger = _logging.getLogger(__name__)

        # Step 1: Build discovery query from KB (product + industry + region)
        _query = compose_competitor_discovery_query(kb_base, page_context, str(body.get("competitors") or "").strip())
        _disc_prompt = build_competitor_discovery_prompt(kb, _query)

        # Step 2: Call LLM to discover competitors
        try:
            _disc_result = call_llm_sync(_disc_prompt, timeout=30)
        except Exception as e:
            _logger.warning("Competitor discovery LLM failed: %s", e)
            _disc_result = ""

        # Step 3: Parse competitor JSON list
        _comp_list = []
        if _disc_result:
            try:
                _match = _re.search(r'\[.*\]', _disc_result, _re.DOTALL)
                if _match:
                    _comp_list = _json.loads(_match.group())
            except Exception as e:
                _logger.warning("Competitor JSON parse failed: %s", e)

        # Step 4: Scrape each competitor website
        _comp_scraped = {}
        _comp_names = []
        _our = str(kb_base.get("企业全称") or kb_base.get("企业简称") or "").strip()
        _req_id = str(body.get("req_id") or body.get("request_id") or f"comp_{int(time.time())}")

        for _c in _comp_list[:8]:
            _nm = str(_c.get("company_name") or "").strip()
            if not _nm or (_our and (_nm == _our or _our in _nm or _nm in _our)):
                continue

            _url = None
            try:
                _url = search_baidu_for_official_website(_nm)
            except Exception as e:
                _logger.warning("Baidu search failed for %s: %s", _nm, e)

            if _url:
                _scr = scrape_website_sync(_url, timeout=15, max_chars=15000)
                if _scr.get("ok") or _scr.get("raw_html"):
                    _comp_scraped[_nm] = _scr
                    # Item 5: 保存竞品爬取内容到 query_id/competitor/
                    save_scraped_content(_req_id, "competitor", _nm, str(_scr.get("text") or _scr.get("raw_html") or ""))
            _comp_names.append(_nm)

        # Step 5: Corpus detection - segment and summarize long content
        if _comp_scraped:
            _comp_scraped = segment_and_summarize_long_content(_comp_scraped)

        # Step 6: Build final analysis prompt with scraped competitor data
        _comp_str = ", ".join(_comp_names) if _comp_names else (
            str(body.get("competitors") or body.get("input") or "").strip()
        )
        prompt = build_competitor_analysis_prompt(
            kb, _comp_str, page_context,
            competitor_scraped=_comp_scraped
        )
    elif task == "diagnosis_report":
        extra_input = str(body.get("input") or "").strip()
        llm_name = str(body.get("llm_name") or body.get("model_name") or "").strip()
        _req_id = str(body.get("req_id") or body.get("request_id") or f"diag_{int(time.time())}")
        # 自动解析官网 URL：优先 KB 表单"企业官网" -> 百度搜索公司名
        company_name = str(kb_base.get("企业全称") or kb_base.get("企业简称") or "").strip()
        website_url = auto_resolve_website_url(kb_base, company_name)
        if website_url:
            scraped = scrape_website_sync(website_url, timeout=15, max_chars=15000)
            # Item 5: 保存自家官网爬取内容到 query_id/own/
            save_scraped_content(_req_id, "own", company_name or "own_website", str(scraped.get("text") or ""))
            if scraped.get("ok"):
                prompt = build_diagnosis_report_with_scrape_prompt(
                    kb, extra_input, llm_name, page_context, website_content=scraped
                )
            else:
                prompt = build_diagnosis_report_prompt(kb, extra_input, llm_name, page_context)
        else:
            prompt = build_diagnosis_report_prompt(kb, extra_input, llm_name, page_context)
    elif task == "optimization_plan":
        prompt = build_optimization_plan_prompt(kb)
        # Item 11: 多模型并行优化 — 调用 2 个不同视角的变体 + 汇总
        variant2 = prompt + "\n\n【额外要求】请从「技术实现与落地可行性」角度重新审视以上分析，优先提出可量化、可操作的建议。"
        import asyncio as _asyncio
        results = await _asyncio.gather(
            async_call_llm(prompt),
            async_call_llm(variant2),
            return_exceptions=True
        )
        texts = [str(r).strip() for r in results if r and not isinstance(r, Exception)]
        if len(texts) >= 2:
            summary_prompt = (
                "你是一位资深企业GEO诊断与优化专家。以下是两位专家从不同角度给出的优化建议，"
                "请将它们合并为一份统一的、去重排序的综合优化建议方案。\n\n"
                "要求：\n"
                "1. 去重合并相似建议\n"
                "2. 按优先级排序（高→低）\n"
                "3. 保留所有有价值的独特建议\n"
                "4. 输出格式与原方案一致\n\n"
                "=== 专家A（综合视角） ===\n" + texts[0] + "\n\n"
                "=== 专家B（技术落地视角） ===\n" + (texts[1] if len(texts) > 1 else "")
            )
            text = str(await async_call_llm(summary_prompt)).strip()
        else:
            text = texts[0] if texts else ""
    elif task == "optimization_schedule":
        prompt = build_optimization_schedule_prompt(kb)
    elif task == "acceptance_score":
        prompt = build_acceptance_score_prompt(kb)
    elif task == "article_product_chat":
        question_text = str(body.get("question_text") or body.get("questionText") or "").strip()
        product = body.get("product") if isinstance(body.get("product"), dict) else {}
        products = body.get("products") if isinstance(body.get("products"), list) else []
        images = body.get("images") if isinstance(body.get("images"), list) else []
        history = body.get("history") if isinstance(body.get("history"), list) else []
        prompt = build_article_product_chat_prompt(
            enterprise,
            lexicon,
            kb_base=kb_base,
            kb_docs=kb_docs,
            question_text=question_text,
            product=product,
            products=products,
            images=images,
            history=history,
        )
    elif task == "article_writing_init_chat":
        question_text = str(body.get("question_text") or body.get("questionText") or "").strip()
        products = body.get("products") if isinstance(body.get("products"), list) else []
        images = body.get("images") if isinstance(body.get("images"), list) else []
        prompt = build_article_writing_init_chat_prompt(
            enterprise,
            lexicon,
            kb_base=kb_base,
            kb_docs=kb_docs,
            question_text=question_text,
            products=products,
            images=images,
        )
    elif task == "article_product_generate":
        question_text = str(body.get("question_text") or body.get("questionText") or "").strip()
        product = body.get("product") if isinstance(body.get("product"), dict) else {}
        products = body.get("products") if isinstance(body.get("products"), list) else []
        images = body.get("images") if isinstance(body.get("images"), list) else []
        history = body.get("history") if isinstance(body.get("history"), list) else []
        platforms = body.get("platforms") if isinstance(body.get("platforms"), list) else []
        article_type = str(body.get("article_type") or "").strip()
        style = str(body.get("style") or "").strip()
        tone = str(body.get("tone") or "").strip()

        user_input = str(body.get("user_input") or body.get("userInput") or "").strip()
        if not user_input:
            parts = []
            for m in history[:80]:
                role = str((m or {}).get("role") or "").strip()
                txt = str((m or {}).get("text") or "").strip()
                if not txt:
                    continue
                if role == "user":
                    parts.append(f"用户：{txt}")
                else:
                    parts.append(f"AI：{txt}")
            user_input = "\n".join(parts).strip()

        prompt = build_article_prompt(
            enterprise,
            lexicon,
            {
                "tab": "product",
                "question_text": question_text,
                "platforms": platforms,
                "article_type": article_type,
                "style": style,
                "tone": tone,
                "brand_embed": False,
                "user_input": user_input,
                "product": product,
                "products": products,
                "images": images,
            },
            kb_base=kb_base,
            kb_docs=kb_docs,
        )
    else:
        return fail("INVALID_TASK", "不支持的任务类型")

    if task != "optimization_plan":
        text = await async_call_llm(prompt)
    raw_text = str(text or "").strip()
    # Item 8: 结构化输出 — 分离正文与优化建议
    content = raw_text
    suggestions = ""
    sep_marker = "=====GEO_SEPARATOR====="
    if sep_marker in raw_text:
        parts = raw_text.split(sep_marker, 1)
        content = parts[0].strip()
        suggestions = parts[1].strip() if len(parts) > 1 else ""
    return ok({"text": raw_text, "content": content, "suggestions": suggestions})


@app.post("/api/v1/article-writing/init-chat")
async def article_writing_init_chat(body: dict, user=Depends(get_current_user)):
    from backend.database import query_row
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_article_writing_init_chat_prompt
    payload = dict(body or {})
    lexicon_id = int(payload.get("lexicon_id") or payload.get("lexiconId") or 0)
    question_text = str(payload.get("question_text") or payload.get("questionText") or "").strip()
    products = payload.get("products") if isinstance(payload.get("products"), list) else []
    images = payload.get("images") if isinstance(payload.get("images"), list) else []

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) if lexicon_id > 0 else None
    lexicon = lexicon or {}

    def load_kb_section(sec: str):
        row = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], sec],
        ) or {}
        content = row.get("content")
        if not content:
            return None
        try:
            return json.loads(content)
        except Exception:
            return content

    kb_base = load_kb_section("企业基础信息")
    kb_docs = load_kb_section("docs")
    prompt = build_article_writing_init_chat_prompt(
        enterprise,
        lexicon,
        kb_base=kb_base,
        kb_docs=kb_docs,
        question_text=question_text,
        products=products,
        images=images,
    )
    text = await async_call_llm(prompt)
    text = str(text or "").strip()
    if not text:
        return fail("LLM_ERROR", "大模型服务无返回，请检查 LLM_URL 或网络连接")
    return ok({"text": text})


@app.post("/api/v1/article-writing/chat")
async def article_writing_chat(body: dict, user=Depends(get_current_user)):
    from backend.database import query_row
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_article_product_chat_prompt
    payload = dict(body or {})
    if "history" not in payload and payload.get("history_json") is not None:
        try:
            raw = payload.get("history_json")
            payload["history"] = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            payload["history"] = []
    lexicon_id = int(payload.get("lexicon_id") or payload.get("lexiconId") or 0)
    question_text = str(payload.get("question_text") or payload.get("questionText") or "").strip()
    products = payload.get("products") if isinstance(payload.get("products"), list) else []
    images = payload.get("images") if isinstance(payload.get("images"), list) else []
    msg = str(payload.get("message") or payload.get("text") or "").strip()
    if not msg:
        history = payload.get("history") if isinstance(payload.get("history"), list) else []
        for m in reversed(history[-30:]):
            role = str((m or {}).get("role") or "").strip()
            if role != "user":
                continue
            txt = str((m or {}).get("text") or "").strip()
            if txt:
                msg = txt
                break

    history = payload.get("history") if isinstance(payload.get("history"), list) else []
    if msg and (not history or str((history[-1] or {}).get("role") or "").strip() != "user"):
        history = history + [{"role": "user", "text": msg}]

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) if lexicon_id > 0 else None
    lexicon = lexicon or {}

    def load_kb_section(sec: str):
        row = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], sec],
        ) or {}
        content = row.get("content")
        if not content:
            return None
        try:
            return json.loads(content)
        except Exception:
            return content

    kb_base = load_kb_section("企业基础信息")
    kb_docs = load_kb_section("docs")
    prompt = build_article_product_chat_prompt(
        enterprise,
        lexicon,
        kb_base=kb_base,
        kb_docs=kb_docs,
        question_text=question_text,
        product=(products[0] if products and isinstance(products[0], dict) else {}),
        products=products,
        images=images,
        history=history,
    )
    reply = await async_call_llm(prompt)
    reply = str(reply or "").strip()
    if not reply:
        return fail("LLM_ERROR", "大模型服务无返回，请检查 LLM_URL 或网络连接")
    return ok({"text": reply})


@app.post("/api/v1/article-writing/generate")
async def article_writing_generate(body: dict, user=Depends(get_current_user)):
    payload = dict(body or {})
    if "history" not in payload and payload.get("history_json") is not None:
        try:
            raw = payload.get("history_json")
            payload["history"] = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            payload["history"] = []
    payload["task"] = "article_product_generate"
    return await ai_execute(payload, user)



@app.post("/api/v1/article-writing/suggestions")
async def article_writing_suggestions(body: dict, user=Depends(get_current_user)):
    from backend.database import query_row
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_article_writing_suggestions_prompt

    payload = dict(body or {})
    lexicon_id = int(payload.get("lexicon_id") or payload.get("lexiconId") or 0)
    task_tab = str(payload.get("tab") or "").strip()
    question_text = str(payload.get("question_text") or payload.get("questionText") or "").strip()
    platforms = str(payload.get("platforms") or "").strip()
    user_input = str(payload.get("user_input") or payload.get("userInput") or "").strip()
    product = payload.get("product")
    products = payload.get("products") if isinstance(payload.get("products"), list) else []
    images = payload.get("images") if isinstance(payload.get("images"), list) else []
    article_text = str(payload.get("content") or payload.get("text") or "").strip()

    if not article_text:
        return fail("INVALID_PARAM", "content 不能为空")

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) if lexicon_id > 0 else None
    lexicon = lexicon or {}

    def load_kb_section(sec: str):
        row = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], sec],
        ) or {}
        content = row.get("content")
        if not content:
            return None
        try:
            return json.loads(content)
        except Exception:
            return content

    kb_base = load_kb_section("企业基础信息")
    kb_docs = load_kb_section("docs")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    prompt = build_article_writing_suggestions_prompt(
        enterprise=enterprise,
        lexicon=lexicon,
        kb_base=kb_base,
        kb_docs=kb_docs,
        task_tab=task_tab,
        task_question_text=question_text,
        task_platforms=platforms,
        task_user_input=user_input,
        task_product_json=_safe_json(product),
        task_products_json=_safe_json(products) if products else "",
        task_images_json=_safe_json(images) if images else "",
        article_text=article_text,
    )

    if not prompt:
        return fail("LLM_ERROR", "提示词模板缺失")

    raw = str((await async_call_llm(prompt)) or "").strip()
    if not raw:
        return fail("LLM_ERROR", "大模型服务无返回，请稍后重试")

    return ok({"text": raw, "suggestions": raw})
@app.post("/api/v1/article-writing/optimize")
async def article_writing_optimize(body: dict, user=Depends(get_current_user)):
    from backend.database import query_row
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_article_product_optimize_prompt

    payload = dict(body or {})
    lexicon_id = int(payload.get("lexicon_id") or payload.get("lexiconId") or 0)
    question_text = str(payload.get("question_text") or payload.get("questionText") or "").strip()
    products = payload.get("products") if isinstance(payload.get("products"), list) else []
    images = payload.get("images") if isinstance(payload.get("images"), list) else []
    user_input = str(payload.get("user_input") or payload.get("userInput") or "").strip()
    draft = str(payload.get("draft") or payload.get("text") or "").strip()
    if not draft:
        return fail("INVALID_PARAM", "draft 不能为空")

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) if lexicon_id > 0 else None
    lexicon = lexicon or {}

    def load_kb_section(sec: str):
        row = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], sec],
        ) or {}
        content = row.get("content")
        if not content:
            return None
        try:
            return json.loads(content)
        except Exception:
            return content

    kb_base = load_kb_section("企业基础信息")
    kb_docs = load_kb_section("docs")
    prompt = build_article_product_optimize_prompt(
        enterprise,
        lexicon,
        kb_base=kb_base,
        kb_docs=kb_docs,
        question_text=question_text,
        user_input=user_input,
        products=products,
        images=images,
        draft_text=draft,
    )
    raw = str((await async_call_llm(prompt)) or "").strip()
    if not raw:
        return fail("LLM_ERROR", "大模型服务无返回，请稍后重试")

    suggestions = ""
    optimized = raw
    m1 = re.split(r"【优化后文案】", raw, maxsplit=1)
    if len(m1) == 2:
        left, right = m1[0], m1[1]
        optimized = right.strip()
        left2 = re.split(r"【优化建议】", left, maxsplit=1)
        suggestions = (left2[1] if len(left2) == 2 else left).strip()
    else:
        m2 = re.split(r"【优化建议】", raw, maxsplit=1)
        if len(m2) == 2:
            suggestions = m2[1].strip()
            optimized = ""

    if not optimized:
        optimized = raw.strip()

    return ok({"suggestions": suggestions, "text": optimized})

@app.post("/api/v1/article-writing/rewrite")
async def article_writing_rewrite(body: dict, user=Depends(get_current_user)):
    from backend.database import query_row
    from backend.services.llm_service import async_call_llm
    from backend.services.prompt_service import build_article_writing_rewrite_prompt

    payload = dict(body or {})
    lexicon_id = int(payload.get("lexicon_id") or payload.get("lexiconId") or 0)
    task_tab = str(payload.get("tab") or "").strip()
    question_text = str(payload.get("question_text") or payload.get("questionText") or "").strip()
    platforms = str(payload.get("platforms") or "").strip()
    user_input = str(payload.get("user_input") or payload.get("userInput") or "").strip()
    article_text = str(payload.get("content") or payload.get("text") or "").strip()

    if not article_text:
        return fail("INVALID_PARAM", "content 不能为空")

    enterprise = query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}
    lexicon = query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) if lexicon_id > 0 else None
    lexicon = lexicon or {}

    def load_kb_section(sec: str):
        row = query_row(
            "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
            [user["id"], sec],
        ) or {}
        content = row.get("content")
        if not content:
            return None
        try:
            return json.loads(content)
        except Exception:
            return content

    kb_base = load_kb_section("企业基础信息")
    kb_docs = load_kb_section("docs")

    prompt = build_article_writing_rewrite_prompt(
        enterprise=enterprise,
        lexicon=lexicon,
        kb_base=kb_base,
        kb_docs=kb_docs,
        task_tab=task_tab,
        task_question_text=question_text,
        task_platforms=platforms,
        task_user_input=user_input,
        article_text=article_text,
    )

    if not prompt:
        return fail("LLM_ERROR", "提示词模板缺失")

    raw = str((await async_call_llm(prompt)) or "").strip()
    if not raw:
        return fail("LLM_ERROR", "大模型服务无返回，请稍后重试")

    return ok({"text": raw, "suggestions": raw})

@app.get("/api/v1/official-media")
async def official_media_list(
    page: int = 1,
    page_size: int = 50,
    keyword: Optional[str] = None,
    media_type: Optional[str] = None,
    sheet: Optional[str] = None,
    user=Depends(get_current_user),
):
    from backend.services.excel_service import read_official_media_excel
    import math
    import datetime
    import numbers
    rows = read_official_media_excel()

    def _sanitize(v):
        try:
            import pandas as pd  # type: ignore
            try:
                if pd.isna(v):
                    return None
            except Exception:
                pass
            if isinstance(v, getattr(pd, "Timestamp", ())):
                try:
                    return v.to_pydatetime().isoformat()
                except Exception:
                    return str(v)
        except Exception:
            pass
        if v is None:
            return None
        if isinstance(v, (datetime.datetime, datetime.date)):
            return v.isoformat()
        if isinstance(v, bool):
            return v
        if isinstance(v, numbers.Number):
            try:
                fv = float(v)
            except Exception:
                return None
            if not math.isfinite(fv):
                return None
            try:
                if isinstance(v, int):
                    return int(v)
            except Exception:
                pass
            return fv
        return v

    def _sanitize_obj(obj):
        if isinstance(obj, dict):
            return {k: _sanitize_obj(_sanitize(v)) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_sanitize_obj(_sanitize(x)) for x in obj]
        return _sanitize(obj)

    rows = _sanitize_obj(rows)
    if keyword:
        kw = keyword.strip().lower()
        def _match(r):
            for v in (r or {}).values():
                if v is None:
                    continue
                if kw in str(v).lower():
                    return True
            return False
        rows = [r for r in rows if _match(r)]
    if media_type:
        rows = [r for r in rows if str(r.get("__type", "")) == media_type]
    if sheet:
        rows = [r for r in rows if str(r.get("__sheet", "")) == sheet]

    total = len(rows)
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 50
    start = (page - 1) * page_size
    end = start + page_size
    items = rows[start:end]
    return ok({"total": total, "page": page, "pageSize": page_size, "items": items})


@app.get("/api/v1/official-media/summary")
async def official_media_summary(user=Depends(get_current_user)):
    from backend.services.excel_service import get_excel_summary
    return ok(get_excel_summary())


@app.get("/api/v1/knowledge-base")
async def knowledge_base_get(section: str, user=Depends(get_current_user)):
    from backend.database import query_row
    sec = str(section or "").strip()
    if not sec:
        return fail("INVALID_PARAM", "section 不能为空")
    row = query_row(
        "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
        [user["id"], sec],
    )
    if not row or not row.get("content"):
        return ok({"section": sec, "data": None})
    try:
        data = json.loads(row["content"])
    except Exception:
        data = row["content"]
    return ok({"section": sec, "data": data})


_enterprise_cols_cache = None


def _to_str(v, limit: Optional[int] = None) -> Optional[str]:
    if v is None:
        return None
    s = str(v)
    if limit is not None:
        return s[:limit]
    return s


def _get_enterprise_columns():
    global _enterprise_cols_cache
    if _enterprise_cols_cache is not None:
        return _enterprise_cols_cache
    from backend.database import query
    try:
        cols = query("SHOW COLUMNS FROM enterprise_base_info")
    except Exception:
        _enterprise_cols_cache = None
        return None
    fields = [str(r.get("Field") or "").strip() for r in (cols or [])]
    _enterprise_cols_cache = set([f for f in fields if f])
    return _enterprise_cols_cache


@app.post("/api/v1/knowledge-base/save")
async def knowledge_base_save(body: dict, user=Depends(get_current_user)):
    from backend.database import execute, insert
    sec = str(body.get("section") or "").strip()
    data = body.get("data")
    if not sec:
        return fail("INVALID_PARAM", "section 不能为空")

    try:
        content = json.dumps(data, ensure_ascii=False)
    except Exception:
        content = json.dumps({"raw": str(data)}, ensure_ascii=False)

    execute(
        """INSERT INTO knowledge_base_sections (user_id, section, content)
           VALUES (%s, %s, %s)
           ON DUPLICATE KEY UPDATE content=VALUES(content), updated_at=CURRENT_TIMESTAMP""",
        [user["id"], sec, content],
    )

    if sec == "企业基础信息" and isinstance(data, dict):
        m: Dict = data
        available = _get_enterprise_columns()
        if not available:
            return ok({"saved": True, "section": sec})
        mapping = {
            "企业全称": ("enterprise_full_name", 255),
            "企业简称": ("enterprise_short_name", 255),
            "企业地址": ("enterprise_address", 512),
            "企业联系方式": ("enterprise_contact", 512),
            "主营产品": ("main_products", 512),
            "目标客户": ("target_customers", 512),
            "企业官网": ("enterprise_website", 512),
            "成立时间": ("founded_time", 128),
            "所在行业": ("industry", 255),
            "行业地位": ("industry_position", 255),
            "销售区域范围": ("sales_region", 512),
            "销售方式或渠道": ("sales_channel", 512),
            "服务响应时间": ("service_response_time", 128),
            "产品交付时限": ("delivery_time", 128),
            "客户复购率": ("repurchase_rate", 128),
            "客户好评率": ("positive_rate", 128),
            "历史累计营业额": ("total_revenue", 128),
            "员工数量": ("employee_count", 128),
            "厂房或店面面积": ("site_area", 128),
            "企业优势": ("enterprise_advantage", 512),
            "产品优势": ("product_advantage", 512),
            "技术优势": ("tech_advantage", 512),
            "管理模式优势": ("management_advantage", 512),
            "企业愿景": ("vision", 255),
            "企业宗旨": ("purpose", 255),
            "企业使命": ("mission", 255),
        }
        cols = []
        params = []
        for k, (col, limit) in mapping.items():
            if k not in m:
                continue
            if col not in available:
                continue
            cols.append(col)
            params.append(_to_str(m.get(k), limit))
        if cols:
            placeholders = ",".join(["%s"] * len(cols))
            insert(f"INSERT INTO enterprise_base_info ({', '.join(cols)}) VALUES ({placeholders})", params)

    return ok({"saved": True, "section": sec})


@app.post("/api/v1/knowledge-base/products/import")
async def knowledge_base_import_products(file: UploadFile = File(...), user=Depends(get_current_user)):
    import pandas as pd
    from io import BytesIO
    try:
        content = await file.read()
    except Exception:
        return fail("INVALID_FILE", "文件读取失败")

    try:
        df = pd.read_excel(BytesIO(content))
    except Exception:
        return fail("INVALID_FILE", "无法解析 Excel，请确认文件格式为 xlsx/xls")

    if df is None or df.empty:
        return ok({"rows": []})

    df.columns = [str(c).strip() for c in df.columns]

    def pick(col_keywords):
        for c in df.columns:
            name = str(c).strip()
            for k in col_keywords:
                if k in name:
                    return c
        return None

    col_map = {
        "product_name": pick(["产品名称", "产品名", "品名", "名称"]),
        "core_function": pick(["核心功能", "功能"]),
        "advantages": pick(["特点优势", "优势", "卖点"]),
        "specs": pick(["规格参数", "规格", "参数"]),
        "material": pick(["材质"]),
        "craft": pick(["工艺"]),
        "origin": pick(["产地", "来源"]),
        "use_scene": pick(["使用场景", "场景"]),
        "target_group": pick(["目标人群", "人群", "受众"]),
        "delivery": pick(["发货方式", "交付", "物流"]),
        "others": pick(["其他", "备注"]),
    }

    rows = []
    for _, r in df.iterrows():
        row = {}
        for k, c in col_map.items():
            if not c:
                row[k] = ""
                continue
            v = r.get(c)
            if v is None:
                row[k] = ""
            else:
                s = str(v).strip()
                row[k] = "" if s.lower() in ("nan", "none") else s
        if any(str(row.get(k) or "").strip() for k in row.keys()):
            rows.append(row)
        if len(rows) >= 200:
            break

    return ok({"rows": rows})


@app.post("/api/v1/knowledge-base/docs/export-word")
async def knowledge_base_export_word(body: dict = Body(...), user=Depends(get_current_user)):
    company_profile = str(body.get("company_profile") or "")
    enterprise_library = str(body.get("enterprise_library") or "")
    filename = str(body.get("filename") or "企业介绍").strip() or "企业介绍"

    if not company_profile.strip() and not enterprise_library.strip():
        raise APIException("INVALID_PARAM", "企业介绍内容为空，无法导出")

    def _block(title: str, text: str) -> str:
        raw = str(text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
        if not raw:
            return ""
        parts = [p for p in raw.split("\n\n") if p.strip()]
        ps = []
        for p in parts:
            lines = [html.escape(x) for x in p.split("\n")]
            ps.append("<p>" + "<br/>".join(lines) + "</p>")
        return f"<h2>{html.escape(title)}</h2>" + "\n".join(ps)

    doc_html = f"""<html>
<head>
<meta charset="utf-8"/>
</head>
<body style="font-family:Microsoft YaHei, SimSun; font-size:14px; line-height:1.8;">
<h1>{html.escape(filename)}</h1>
{_block("企业简介", company_profile)}
{_block("企业介绍", enterprise_library)}
</body>
</html>"""

    from urllib.parse import quote
    disp_name = quote(f"{filename}.docx")
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{disp_name}"}
    return Response(
        content=doc_html.encode("utf-8"),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8",
        headers=headers,
    )


@app.post("/api/v1/export/word")
async def export_word(body: dict = Body(...), user=Depends(get_current_user)):
    title = str(body.get("title") or body.get("filename") or "文档").strip() or "文档"
    text = str(body.get("text") or "")
    sections = body.get("sections")

    def _block(heading: str, content: str) -> str:
        raw = str(content or "").replace("\r\n", "\n").replace("\r", "\n").strip()
        if not raw:
            return ""
        parts = [p for p in raw.split("\n\n") if p.strip()]
        ps = []
        for p in parts:
            lines = [html.escape(x) for x in p.split("\n")]
            ps.append("<p>" + "<br/>".join(lines) + "</p>")
        if heading:
            return f"<h2>{html.escape(heading)}</h2>" + "\n".join(ps)
        return "\n".join(ps)

    body_html = ""
    if isinstance(sections, list) and sections:
        for s in sections:
            heading = str((s or {}).get("heading") or "").strip()
            content = str((s or {}).get("text") or "")
            body_html += _block(heading, content)
    else:
        body_html = _block("", text)

    if not body_html.strip():
        raise APIException("INVALID_PARAM", "导出内容为空")

    doc_html = f"""<html>
<head>
<meta charset="utf-8"/>
</head>
<body style="font-family:Microsoft YaHei, SimSun; font-size:14px; line-height:1.8;">
<h1>{html.escape(title)}</h1>
{body_html}
</body>
</html>"""

    from urllib.parse import quote
    disp_name = quote(f"{title}.docx")
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{disp_name}"}
    return Response(
        content=doc_html.encode("utf-8"),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8",
        headers=headers,
    )


@app.post("/api/v1/export/excel")
async def export_excel(body: dict = Body(...), user=Depends(get_current_user)):
    filename = str(body.get("filename") or "表格").strip() or "表格"
    sheets = body.get("sheets")
    sheet_name = str(body.get("sheet_name") or "Sheet1").strip() or "Sheet1"
    table_text = body.get("table_text")

    if not isinstance(sheets, list) or not sheets:
        sheets = [{"name": sheet_name, "table_text": table_text}]

    from io import BytesIO
    from openpyxl import Workbook

    def _parse_table(text: str):
        lines = str(text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
        out = []
        for raw in lines:
            line = raw.strip()
            if not line:
                continue
            if set(line.replace("|", "").replace("｜", "").replace("-", "").replace(" ", "")) == set():
                continue
            parts = [p.strip() for p in re.split(r"[|｜\t]", line)]
            parts = [p for p in parts if p != ""]
            if len(parts) < 2:
                continue
            out.append(parts)
        if not out:
            return []
        col_count = max(len(r) for r in out)
        fixed = [r + [""] * (col_count - len(r)) for r in out]
        return fixed

    wb = Workbook()
    first = True
    for s in sheets:
        name = str((s or {}).get("name") or "Sheet").strip() or "Sheet"
        t = (s or {}).get("table_text")
        rows = _parse_table(str(t or ""))
        if not rows:
            continue
        if first:
            ws = wb.active
            ws.title = name[:31]
            first = False
        else:
            ws = wb.create_sheet(title=name[:31])
        for r in rows:
            ws.append([str(x) for x in r])

    if first:
        raise APIException("INVALID_PARAM", "导出表格内容为空")

    bio = BytesIO()
    wb.save(bio)
    data = bio.getvalue()
    from urllib.parse import quote
    disp_name = quote(f"{filename}.xlsx")
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{disp_name}"}
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@app.post("/api/v1/tools/summarize-urls")
async def tools_summarize_urls(body: dict = Body(...), user=Depends(get_current_user)):
    urls = body.get("urls")
    if isinstance(urls, str):
        urls = [x.strip() for x in re.split(r"[;\n\r；]+", urls) if x.strip()]
    if not isinstance(urls, list):
        raise APIException("INVALID_PARAM", "urls 参数错误")
    urls = [str(x).strip() for x in urls if str(x).strip()]
    urls = urls[:10]
    if not urls:
        raise APIException("INVALID_PARAM", "urls 不能为空")

    def _is_safe_url(u: str) -> bool:
        try:
            p = urlparse(u)
        except Exception:
            return False
        if p.scheme not in ("http", "https"):
            return False
        host = str(p.hostname or "").strip().lower()
        if not host:
            return False
        if host in ("localhost", "127.0.0.1", "::1"):
            return False
        try:
            ip = ipaddress.ip_address(host)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        except Exception:
            pass
        return True

    safe_urls = [u for u in urls if _is_safe_url(u)]
    if not safe_urls:
        raise APIException("INVALID_PARAM", "没有可抓取的有效 URL（仅支持 http/https，且不允许本机/内网地址）")

    import httpx
    texts = []
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(12.0, connect=6.0),
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (GEO Bot)"},
    ) as client:
        for u in safe_urls:
            try:
                r = await client.get(u)
                ct = str(r.headers.get("content-type") or "").lower()
                raw = r.text if "text" in ct or "html" in ct or ct == "" else ""
            except Exception:
                raw = ""
            raw = str(raw or "")
            raw = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", raw)
            raw = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", raw)
            raw = re.sub(r"(?is)<noscript[^>]*>.*?</noscript>", " ", raw)
            raw = re.sub(r"(?is)<[^>]+>", " ", raw)
            raw = html.unescape(raw)
            raw = re.sub(r"[ \t]+", " ", raw)
            raw = re.sub(r"\n{3,}", "\n\n", raw)
            raw = raw.strip()
            if len(raw) > 8000:
                raw = raw[:8000]
            if raw:
                texts.append(f"【URL】{u}\n【正文】{raw}")

    if not texts:
        raise APIException("INVALID_PARAM", "未能抓取到可用内容，请检查链接是否可公开访问")

    from backend.services.llm_service import async_call_llm
    prompt = (
        "你是信息提炼助手。请对下面每个URL的正文进行归纳提炼，输出用于“基础数据诊断”的摘要。\n"
        "要求：\n"
        "1) 必须分URL输出，每个URL用“【URL摘要】<url>”作为标题\n"
        "2) 每个URL输出 5-10 条要点（用 - 开头），只保留可用于判断企业信息是否一致的事实信息\n"
        "3) 不要编造，不要猜测；如果内容不足，就写“可提取信息不足”\n"
        "4) 全部输出中文\n\n"
        + "\n\n".join(texts)
    )
    summary = await async_call_llm(prompt, timeout=80)
    return ok({"urls": safe_urls, "summary": summary or ""})


_DIAG_UPLOAD_DIR = Path("uploads")
_DIAG_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
_SCRAPED_DIR = _DIAG_UPLOAD_DIR / "scraped"
_SCRAPED_DIR.mkdir(parents=True, exist_ok=True)


def _scraped_query_dir(query_id: str, category: str) -> Path:
    """返回 {query_id}/{category}/ 目录，不存在则自动创建"""
    qid = _diag_safe_task(query_id) or "unknown"
    cat = _diag_safe_task(category) or "own"
    d = _SCRAPED_DIR / qid / cat
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_scraped_content(query_id: str, category: str, filename: str, content: str) -> None:
    """保存爬取内容到 {query_id}/{category}/{filename}"""
    import datetime as _dt
    _d = _scraped_query_dir(query_id, category)
    _ts = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    _safe_fn = str(filename or "scraped").replace("/", "_").replace("\\", "_")[:80]
    _p = _d / f"{_ts}_{_safe_fn}.txt"
    _p.write_text(str(content or ""), encoding="utf-8")


def _diag_safe_task(v: str) -> str:
    s = str(v or "").strip().lower()
    if not s:
        return ""
    if not re.fullmatch(r"[a-z0-9_\-]+", s):
        return ""
    return s


def _diag_safe_model(v: str) -> str:
    s = str(v or "").strip().lower()
    if not s:
        return ""
    if not re.fullmatch(r"[a-z0-9_\-]+", s):
        return ""
    return s


def _diag_file_path(user_id: int, task: str, model: str) -> Path:
    name = f"diag_{user_id}_{task}_{model}.txt"
    return _DIAG_UPLOAD_DIR / name


@app.post("/api/v1/diagnosis-files/clear")
async def diagnosis_files_clear(body: dict, user=Depends(get_current_user)):
    task = _diag_safe_task(body.get("task", ""))
    if not task:
        return fail("INVALID_PARAM", "task 不能为空")
    prefix = f"diag_{int(user['id'])}_{task}_"
    deleted = 0
    for p in list(_DIAG_UPLOAD_DIR.glob(f"{prefix}*.txt")) + list(_DIAG_UPLOAD_DIR.glob(f"{prefix}*.doc")):
        try:
            p.unlink()
            deleted += 1
        except Exception:
            pass
    return ok({"deleted": deleted})


@app.post("/api/v1/diagnosis-files/save")
async def diagnosis_files_save(body: dict, user=Depends(get_current_user)):
    task = _diag_safe_task(body.get("task", ""))
    model = _diag_safe_model(body.get("model", ""))
    content = str(body.get("content") or "")
    if not task or not model:
        return fail("INVALID_PARAM", "task/model 不能为空")
    p = _diag_file_path(int(user["id"]), task, model)
    try:
        p.write_text(content, encoding="utf-8")
    except Exception as e:
        return fail("WRITE_FAILED", str(e))
    return ok({"saved": True, "path": str(p).replace("\\", "/")})


@app.get("/api/v1/diagnosis-files/get")
async def diagnosis_files_get(task: str, model: str, user=Depends(get_current_user)):
    t = _diag_safe_task(task)
    m = _diag_safe_model(model)
    if not t or not m:
        return fail("INVALID_PARAM", "task/model 不能为空")
    p = _diag_file_path(int(user["id"]), t, m)
    if not p.exists():
        return ok({"task": t, "model": m, "exists": False, "content": ""})
    try:
        content = p.read_text(encoding="utf-8")
    except Exception:
        content = ""
    return ok({"task": t, "model": m, "exists": True, "content": content})


@app.get("/api/v1/diagnosis-files/download")
async def diagnosis_files_download(task: str, model: Optional[str] = None, user=Depends(get_current_user)):
    t = _diag_safe_task(task)
    m = _diag_safe_model(model or "summary")
    if not t:
        return fail("INVALID_PARAM", "task 不能为空")
    if not m:
        m = "summary"
    p = _diag_file_path(int(user["id"]), t, m)
    if not p.exists():
        return fail("NOT_FOUND", "文件不存在，请先生成")

    try:
        content = p.read_text(encoding="utf-8")
    except Exception:
        content = ""

    safe = html.escape(content).replace("\n", "<br/>")
    doc_html = (
        "<html><head><meta charset='utf-8'></head>"
        "<body style='font-family:Microsoft YaHei,SimSun,Arial; font-size:12pt;'>"
        f"{safe}"
        "</body></html>"
    )
    uid = user["id"]; tmp_name = f"diag_{int(uid)}_{t}_{m}_{uuid.uuid4().hex}.docx"
    tmp_path = _DIAG_UPLOAD_DIR / tmp_name
    tmp_path.write_text(doc_html, encoding="utf-8")

    filename = f"{t}-{m}.docx"
    return FileResponse(
        path=str(tmp_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )

@app.get("/api/v1/health")
def health_check():
    return api_response({"status": "ok", "version": "2026-06-04-reform-2"})

@app.get("/api/v1/plans")
def get_plans():
    """套餐列表（无需认证，白名单）"""
    return api_response({
        "plans": [
            {"id": "basic", "name": "基础版", "price": 199, "quota_articles": 50},
            {"id": "pro", "name": "专业版", "price": 599, "quota_articles": 200},
            {"id": "enterprise", "name": "企业版", "price": 1999, "quota_articles": 9999},
        ]
    })

@app.get("/@vite/client")
@app.get("/%40vite/client")
def vite_probe():
    return Response(status_code=204)

_www_dir = (Path(_PROJECT_ROOT) / "www").resolve()
if _www_dir.exists():
    app.mount("/", StaticFiles(directory=str(_www_dir), html=True), name="www")

_uploads_dir = (Path(_PROJECT_ROOT) / "uploads").resolve()
if _uploads_dir.exists():
    app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
