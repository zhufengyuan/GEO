"""
大模型调用服务（迁移自 backend/llm.R）

对应 R 代码：
  call_llm(message)          → async_call_llm(message) -> str
  get_llm_url()              → _get_llm_url() -> str
"""
import urllib.parse
import asyncio
import httpx
from backend.config import settings
from typing import Optional
import time

async def async_call_llm(message: str, timeout: int = 60) -> str:
    """
    异步调用大模型服务
    对应 R 代码：paste0(get_llm_url(), "?message=", utils::URLencode(message))
    """
    url = _get_llm_url()
    params = urllib.parse.urlencode({"message": message})
    full_url = f"{url}?{params}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                resp = await client.post(url, json={"message": message}, headers={"Content-Type": "application/json"})
                if resp.status_code >= 200 and resp.status_code < 300:
                    text = resp.text.strip()
                    if text:
                        return text
            except Exception:
                pass

            if len(full_url) > 3500:
                head = message[:1200]
                tail = message[-1200:] if len(message) > 1200 else ""
                clipped = (head + "\n...\n" + tail).strip()
                params2 = urllib.parse.urlencode({"message": clipped})
                full_url = f"{url}?{params2}"

            resp = await client.get(full_url)
            resp.raise_for_status()
            text = resp.text.strip()
            if text:
                return text
    except Exception as e:
        print(f"[LLM] 调用失败：{e}")
    return await _call_wenxin_fallback(message, timeout=timeout)

def call_llm_sync(message: str, timeout: int = 60) -> str:
    """同步版本（兼容非 async 上下文）"""
    url = _get_llm_url()
    params = urllib.parse.urlencode({"message": message})
    full_url = f"{url}?{params}"
    try:
        import requests
        try:
            resp = requests.post(url, json={"message": message}, timeout=timeout)
            if resp.status_code >= 200 and resp.status_code < 300:
                text = resp.text.strip()
                if text:
                    return text
        except Exception:
            pass

        if len(full_url) > 3500:
            head = message[:1200]
            tail = message[-1200:] if len(message) > 1200 else ""
            clipped = (head + "\n...\n" + tail).strip()
            params2 = urllib.parse.urlencode({"message": clipped})
            full_url = f"{url}?{params2}"

        resp = requests.get(full_url, timeout=timeout)
        resp.raise_for_status()
        text = resp.text.strip()
        if text:
            return text
    except Exception as e:
        print(f"[LLM] 调用失败：{e}")
    try:
        import asyncio as _asyncio
        loop = _asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_call_wenxin_fallback(message, timeout=timeout))
        finally:
            try:
                loop.close()
            except Exception:
                pass
    except Exception:
        return ""

def _get_llm_url() -> str:
    """获取大模型服务 URL（对应 R 的 get_llm_url）"""
    return settings.LLM_URL


_wenxin_token_lock = asyncio.Lock()
_wenxin_token_value = ""
_wenxin_token_exp_at = 0.0


async def _get_wenxin_access_token(timeout: int = 30) -> str:
    global _wenxin_token_value, _wenxin_token_exp_at
    api_key = str(getattr(settings, "WENXIN_API_KEY", "") or "").strip()
    secret_key = str(getattr(settings, "WENXIN_SECRET_KEY", "") or "").strip()
    if not api_key or not secret_key:
        return ""

    now = time.time()
    if _wenxin_token_value and _wenxin_token_exp_at - now > 30:
        return _wenxin_token_value

    async with _wenxin_token_lock:
        now2 = time.time()
        if _wenxin_token_value and _wenxin_token_exp_at - now2 > 30:
            return _wenxin_token_value

        url = (
            "https://aip.baidubce.com/oauth/2.0/token"
            f"?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, headers={"Content-Type": "application/json"})
                data = resp.json() if resp.content else {}
        except Exception as e:
            print(f"[LLM] 获取文心 access_token 失败：{e}")
            return ""
        token = str(data.get("access_token") or "").strip()
        expires_in = int(data.get("expires_in") or 0)
        if not token:
            return ""
        _wenxin_token_value = token
        _wenxin_token_exp_at = time.time() + max(60, expires_in)
        return _wenxin_token_value


async def _call_wenxin_fallback(message: str, timeout: int = 60) -> str:
    token = await _get_wenxin_access_token(timeout=min(30, max(10, int(timeout / 2))))
    if not token:
        return ""
    url = "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant"
    url = f"{url}?access_token={token}"
    payload = {"messages": [{"role": "user", "content": str(message or "")}]}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers={"Content-Type": "application/json"}, json=payload)
            data = resp.json() if resp.content else {}
        return str(data.get("result") or "").strip()
    except Exception as e:
        print(f"[LLM] 文心兜底失败：{e}")
        return ""
