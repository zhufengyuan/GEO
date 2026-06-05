from fastapi import APIRouter, Depends

from backend.auth.dependencies import get_current_user
from backend.config import settings
from backend.utils.api_response import ok, fail


router = APIRouter(prefix="/api/v1")


@router.post("/official-publish/submit")
async def official_publish_submit(body: dict, user=Depends(get_current_user)):
    from backend.database import execute, query_row
    from pymysql.err import OperationalError
    import httpx

    article_id = body.get("article_id") or body.get("articleId")
    platform_code = str(body.get("platform_code") or body.get("platformCode") or "").strip()
    submit_ts = body.get("ts") or body.get("timestamp") or body.get("submitted_at")

    if not article_id or not platform_code:
        return fail("INVALID_PARAM", "article_id/platform_code 不能为空")
    try:
        aid = int(article_id)
    except Exception:
        return fail("INVALID_PARAM", "article_id 必须为数字")

    copy_text = str(body.get("copy") or body.get("content") or "").strip()
    if not copy_text:
        a = query_row("SELECT id, title, content FROM articles WHERE id=%s", [aid])
        if not a:
            return fail("NOT_FOUND", "文章不存在")
        title = str(a.get("title") or "").strip()
        content = str(a.get("content") or "").strip()
        copy_text = f"{title}\n\n{content}".strip()

    partner_payload = {
        "user_id": int(user.get("id", 0)),
        "copy_id": aid,
        "article_id": aid,
        "copy": copy_text,
        "ts": submit_ts,
        "platform_code": platform_code,
        "platform": str(body.get("platform") or "").strip(),
        "media_name": str(body.get("media_name") or body.get("mediaName") or "").strip(),
    }

    from backend.api.publish_records import _detect_publish_records_schema, _is_unknown_column

    schema = _detect_publish_records_schema()
    if not schema:
        return fail("MIGRATION_REQUIRED", "publish_records 表不存在或不可用，请重启后端以执行 migrations")

    pcol = schema.get("platform_col") or "platform_code"
    tcol = schema.get("time_col") or ""

    def _exec(time_col: str, platform_col: str):
        if time_col:
            execute(
                f"""INSERT INTO publish_records (article_id, {platform_col}, publish_count, {time_col})
                    VALUES (%s, %s, 0, NOW())
                    ON DUPLICATE KEY UPDATE {time_col}=NOW()""",
                [aid, platform_code],
            )
        else:
            execute(
                f"""INSERT INTO publish_records (article_id, {platform_col}, publish_count)
                    VALUES (%s, %s, 0)
                    ON DUPLICATE KEY UPDATE publish_count=publish_count""",
                [aid, platform_code],
            )

    try:
        _exec(tcol, pcol)
    except OperationalError as e:
        if _is_unknown_column(e, tcol) and tcol and tcol != "created_at":
            _exec("created_at", pcol)
        elif _is_unknown_column(e, pcol) and pcol != "platform":
            _exec(tcol, "platform")
        else:
            raise

    partner_url = str(getattr(settings, "OFFICIAL_PUBLISH_PARTNER_URL", "") or "").strip()
    token = str(getattr(settings, "OFFICIAL_PUBLISH_PARTNER_TOKEN", "") or "").strip()
    if not partner_url:
        return ok({"submitted": True, "forwarded": False})

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(partner_url, json=partner_payload, headers=headers or None)
            if res.status_code >= 400:
                return fail("PARTNER_ERROR", f"渠道接口错误（{res.status_code}）")
    except Exception as e:
        return fail("PARTNER_ERROR", f"渠道接口调用失败：{str(e)}")

    return ok({"submitted": True, "forwarded": True})

