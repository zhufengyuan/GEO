from fastapi import APIRouter, Depends
from typing import Optional, List, Dict

from backend.auth.dependencies import get_current_user
from backend.utils.api_response import ok, fail


router = APIRouter(prefix="/api/v1")

_publish_records_schema_cache = None

_PLATFORM_NAME: Dict[str, str] = {
    "zhihu": "知乎",
    "wechat": "公众号",
    "douyin": "抖音",
    "xiaohongshu": "小红书",
    "baijiahao": "百家号",
    "toutiao": "今日头条",
    "qyhao": "企业号",
    "bilibili": "哔哩哔哩",
    "sogou": "搜狗",
    "wangyi": "网易",
    "csdn": "CSDN",
    "official_media": "官方媒体",
}

def _platform_label(pcode: str) -> str:
    s = str(pcode or "").strip()
    if not s:
        return "-"
    if s.startswith("wechat:"):
        name = s.split(":", 1)[1].strip()
        return f"公众号({name})" if name else "公众号"
    if s.startswith("wechat_"):
        name = s.split("_", 1)[1].strip()
        return f"公众号({name})" if name else "公众号"
    return _PLATFORM_NAME.get(s, s)


def _is_unknown_column(err: Exception, col: str) -> bool:
    try:
        code = int(getattr(err, "args", [None])[0])
    except Exception:
        code = None
    if code != 1054:
        return False
    return col in str(err)


def _detect_publish_records_schema():
    global _publish_records_schema_cache
    if _publish_records_schema_cache is not None:
        return _publish_records_schema_cache
    from backend.database import query
    try:
        cols = query("SHOW COLUMNS FROM publish_records")
    except Exception:
        _publish_records_schema_cache = None
        return None

    fields = [str(r.get("Field") or "").strip() for r in (cols or [])]
    field_set = set([f for f in fields if f])

    if "platform_code" in field_set:
        platform_col = "platform_code"
    elif "platform" in field_set:
        platform_col = "platform"
    else:
        platform_col = next((f for f in fields if "platform" in f), "platform_code")

    time_candidates = [
        "last_publish_at",
        "publish_at",
        "last_publish_time",
        "publish_time",
        "published_at",
        "updated_at",
        "created_at",
    ]
    time_col = next((c for c in time_candidates if c in field_set), None)
    if time_col is None:
        time_col = next((f for f in fields if ("publish" in f and (f.endswith("at") or f.endswith("time")))), None)

    link_col = "link_url" if "link_url" in field_set else None

    _publish_records_schema_cache = {"platform_col": platform_col, "time_col": time_col, "link_col": link_col}
    return _publish_records_schema_cache


@router.post("/publish-records")
async def publish_records_record(body: dict, user=Depends(get_current_user)):
    from backend.database import execute
    from pymysql.err import OperationalError
    article_ids = body.get("article_ids") or body.get("articleIds") or []
    platforms = body.get("platforms") or body.get("platformCodes") or []
    links = body.get("links") or {}
    if isinstance(article_ids, (str, int)):
        article_ids = [article_ids]
    if isinstance(platforms, str):
        platforms = [platforms]

    aid_list: List[int] = []
    for x in article_ids:
        try:
            aid_list.append(int(x))
        except Exception:
            pass
    p_list = [str(x).strip() for x in platforms if str(x).strip()]

    if not aid_list or not p_list:
        return fail("INVALID_PARAM", "article_ids/platforms 不能为空")

    schema = _detect_publish_records_schema()
    if not schema:
        return fail("MIGRATION_REQUIRED", "publish_records 表不存在或不可用，请重启后端以执行 migrations")

    platform_col = schema.get("platform_col") or "platform_code"
    time_col = schema.get("time_col") or ""
    link_col = schema.get("link_col") or ""

    link_map: Dict[str, str] = {}
    if isinstance(links, dict):
        for k, v in links.items():
            ks = str(k or "").strip()
            vs = str(v or "").strip()
            if ks and vs:
                link_map[ks] = vs

    def _exec(aid: int, p: str, pcol: str, tcol: str, lcol: str, link_url: str):
        use_link = bool(lcol and link_url)
        if tcol and use_link:
            execute(
                f"""INSERT INTO publish_records (article_id, {pcol}, {lcol}, publish_count, {tcol})
                    VALUES (%s, %s, %s, 1, NOW())
                    ON DUPLICATE KEY UPDATE
                      publish_count = publish_count + 1,
                      {tcol} = NOW(),
                      {lcol} = IF(VALUES({lcol}) IS NULL OR VALUES({lcol})='', {lcol}, VALUES({lcol}))""",
                [aid, p, link_url],
            )
            return
        if tcol:
            execute(
                f"""INSERT INTO publish_records (article_id, {pcol}, publish_count, {tcol})
                    VALUES (%s, %s, 1, NOW())
                    ON DUPLICATE KEY UPDATE
                      publish_count = publish_count + 1,
                      {tcol} = NOW()""",
                [aid, p],
            )
        else:
            if use_link:
                execute(
                    f"""INSERT INTO publish_records (article_id, {pcol}, {lcol}, publish_count)
                        VALUES (%s, %s, %s, 1)
                        ON DUPLICATE KEY UPDATE
                          publish_count = publish_count + 1,
                          {lcol} = IF(VALUES({lcol}) IS NULL OR VALUES({lcol})='', {lcol}, VALUES({lcol}))""",
                    [aid, p, link_url],
                )
            else:
                execute(
                    f"""INSERT INTO publish_records (article_id, {pcol}, publish_count)
                        VALUES (%s, %s, 1)
                        ON DUPLICATE KEY UPDATE
                          publish_count = publish_count + 1""",
                    [aid, p],
                )

    for aid in aid_list:
        for p in p_list:
            link_url = link_map.get(p, "")
            try:
                _exec(aid, p, platform_col, time_col, link_col, link_url)
            except OperationalError as e:
                if _is_unknown_column(e, time_col) and time_col and time_col != "created_at":
                    _exec(aid, p, platform_col, "created_at" if platform_col else "", link_col, link_url)
                elif _is_unknown_column(e, platform_col) and platform_col != "platform":
                    _exec(aid, p, "platform", time_col, link_col, link_url)
                else:
                    raise
    return ok({"ok": True})

@router.post("/publish-records/link")
async def publish_records_set_link(body: dict, user=Depends(get_current_user)):
    from backend.database import execute
    article_id = body.get("article_id") or body.get("articleId")
    platform_code = str(body.get("platform_code") or body.get("platformCode") or "").strip()
    link_url = str(body.get("link_url") or body.get("linkUrl") or "").strip()
    if not article_id or not platform_code or not link_url:
        return fail("INVALID_PARAM", "article_id/platform_code/link_url 不能为空")
    try:
        aid = int(article_id)
    except Exception:
        return fail("INVALID_PARAM", "article_id 必须为数字")

    schema = _detect_publish_records_schema()
    if not schema:
        return fail("MIGRATION_REQUIRED", "publish_records 表不存在或不可用，请重启后端以执行 migrations")
    pcol = schema.get("platform_col") or "platform_code"
    tcol = schema.get("time_col") or "last_publish_at"
    lcol = schema.get("link_col") or ""
    if not lcol:
        return fail("MIGRATION_REQUIRED", "publish_records 缺少 link_url 字段")

    execute(
        f"""INSERT INTO publish_records (article_id, {pcol}, {lcol}, publish_count, {tcol})
            VALUES (%s, %s, %s, 0, NOW())
            ON DUPLICATE KEY UPDATE {lcol}=VALUES({lcol})""",
        [aid, platform_code, link_url],
    )
    return ok({"updated": True})


@router.get("/publish-records")
async def publish_records_list(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    flat: int = 0,
    user=Depends(get_current_user),
):
    from backend.database import query
    from pymysql.err import OperationalError
    schema = _detect_publish_records_schema()
    if not schema:
        return ok({"items": []})
    platform_col = schema.get("platform_col") or "platform_code"
    time_col = schema.get("time_col") or "created_at"
    link_col = schema.get("link_col") or ""

    def _build_where(time_col: str):
        where = ["1=1"]
        params: List = []
        if keyword:
            where.append("a.title LIKE %s")
            params.append(f"%{keyword}%")
        if start_date:
            where.append(f"pr.{time_col} >= %s")
            params.append(f"{start_date} 00:00:00")
        if end_date:
            where.append(f"pr.{time_col} <= %s")
            params.append(f"{end_date} 23:59:59")
        params.append(int(limit))
        return where, params

    def _fetch(platform_col: str, time_col: str):
        where, params = _build_where(time_col)
        link_select = f"pr.{link_col} as link_url," if link_col else "NULL as link_url,"
        return query(
            f"""
            SELECT pr.article_id,
                   pr.{platform_col} as platform_code,
                   {link_select}
                   pr.publish_count,
                   DATE_FORMAT(pr.{time_col}, '%%Y-%%m-%%d %%H:%%i:%%s') as last_publish_at,
                   a.title,
                   a.article_type,
                   DATE_FORMAT(a.created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at
            FROM publish_records pr
            JOIN articles a ON a.id = pr.article_id
            WHERE {' AND '.join(where)}
            ORDER BY pr.{time_col} DESC
            LIMIT %s
            """,
            params,
        )

    try:
        rows = _fetch(platform_col, time_col)
    except OperationalError as e:
        if platform_col != "platform_code" and (_is_unknown_column(e, "pr.platform_code") or _is_unknown_column(e, "platform_code")):
            rows = _fetch("platform", time_col)
        elif time_col != "created_at" and (_is_unknown_column(e, f"pr.{time_col}") or _is_unknown_column(e, time_col)):
            rows = _fetch(platform_col, "created_at")
        else:
            raise

    if int(flat or 0) == 1:
        out = []
        for r in rows:
            pcode = str(r.get("platform_code") or "").strip()
            pname = _platform_label(pcode)
            out.append({
                "article_id": int(r.get("article_id") or 0),
                "title": r.get("title") or "",
                "created_at": r.get("created_at") or "",
                "article_type": r.get("article_type") or "-",
                "publish_at": r.get("last_publish_at") or "",
                "platform_code": pcode,
                "platform_name": pname,
                "platforms": pname,
                "link_url": str(r.get("link_url") or "").strip(),
                "publish_count": int(r.get("publish_count") or 0),
            })
        return ok({"items": out})

    agg: Dict[int, dict] = {}
    for r in rows:
        aid = int(r["article_id"])
        it = agg.get(aid)
        if not it:
            it = {
                "article_id": aid,
                "title": r.get("title") or "",
                "created_at": r.get("created_at") or "",
                "article_type": r.get("article_type") or "-",
                "publish_at": r.get("last_publish_at") or "",
                "latest_platform_code": "",
                "platform_codes": [],
                "platforms": {},
                "platform_code_by_name": {},
                "links": {},
                "link_url": "",
                "publish_count": 0,
            }
            agg[aid] = it
        pub_at = r.get("last_publish_at") or ""
        if pub_at and (not it.get("publish_at") or str(pub_at) > str(it.get("publish_at"))):
            it["publish_at"] = pub_at
            it["latest_platform_code"] = str(r.get("platform_code") or "").strip()

        pcode = str(r.get("platform_code") or "").strip()
        pname = _platform_label(pcode)
        cnt = int(r.get("publish_count") or 0)
        link_url = str(r.get("link_url") or "").strip()
        if pcode and pcode not in (it.get("platform_codes") or []):
            it["platform_codes"] = list(it.get("platform_codes") or []) + [pcode]
        if pname and pcode:
            m2 = it.get("platform_code_by_name") or {}
            if pname not in m2:
                m2[pname] = pcode
                it["platform_code_by_name"] = m2
        if pname and link_url:
            it["links"][pname] = link_url
            if not it.get("link_url"):
                it["link_url"] = link_url
        if pname:
            it["platforms"][pname] = int(it["platforms"].get(pname, 0)) + cnt
        it["publish_count"] = int(it["publish_count"]) + cnt

    def _platform_str(x):
        m = x.get("platforms") or {}
        keys = list(m.keys())
        return "、".join(keys) if keys else "-"

    def _platform_count_str(x):
        m = x.get("platforms") or {}
        items = [(k, int(v or 0)) for k, v in m.items()]
        items.sort(key=lambda t: t[1], reverse=True)
        keys = [f"{k}({v})" for k, v in items if k]
        return "、".join(keys) if keys else "-"

    items = list(agg.values())
    items.sort(key=lambda x: str(x.get("publish_at") or ""), reverse=True)

    out = []
    for it in items:
        m = it.get("platforms") or {}
        code_by_name = it.get("platform_code_by_name") or {}
        links = it.get("links") or {}
        platform_items = []
        for name, count in m.items():
            platform_items.append({
                "platform_name": name,
                "platform_code": code_by_name.get(name) or "",
                "publish_count": int(count or 0),
                "link_url": str(links.get(name) or "").strip(),
            })
        platform_items.sort(key=lambda x: int(x.get("publish_count") or 0), reverse=True)
        out.append({
            "article_id": it["article_id"],
            "title": it["title"],
            "created_at": it["created_at"],
            "article_type": it["article_type"] or "-",
            "publish_at": it.get("publish_at") or "",
            "platforms": _platform_str(it),
            "link_url": it.get("link_url") or "",
            "links": it.get("links") or {},
            "latest_platform_code": it.get("latest_platform_code") or "",
            "platform_codes": it.get("platform_codes") or [],
            "platform_items": platform_items,
            "platform_num": len(list(m.keys())),
            "platform_publish_counts": _platform_count_str(it),
            "publish_count": int(it.get("publish_count") or 0),
        })
    return ok({"items": out})
