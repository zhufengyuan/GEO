"""
官网爬虫模块
抓取指定 URL 的页面内容，清洗 HTML → 纯文本，供 LLM 分析使用。
采用方案A：本地爬虫+内容送API（不限制内网/localhost，可控清洗逻辑）
"""
import re
import time
import httpx
from typing import Optional, Dict
from bs4 import BeautifulSoup


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)

# 需要剔除的标签（导航、广告、脚本、样式等）
REMOVE_TAGS = [
    "script", "style", "nav", "footer", "header",
    "aside", "noscript", "iframe", "form", "svg",
]

# 需要剔除的 class/id 常见广告/导航模式
REMOVE_KEYWORDS = [
    "advertisement", "ad-", "banner", "popup",
    "cookie", "sidebar", "menu", "navigation",
    "nav-", "footer-", "header-", "breadcrumb",
    "social", "share", "comment", "related-posts",
    "recommend", "pagination",
]


def _should_remove(tag) -> bool:
    """判断标签是否应该被剔除"""
    if tag.name in REMOVE_TAGS:
        return True
    cls = " ".join(tag.get("class", [])) + " " + (tag.get("id") or "")
    cls_lower = cls.lower()
    for kw in REMOVE_KEYWORDS:
        if kw in cls_lower:
            return True
    return False


def _clean_text(text: str) -> str:
    """清洗文本：去多余空白、特殊字符"""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text.strip()


def scrape_website(url: str, timeout: int = 15, max_chars: int = 15000) -> Dict:
    """
    抓取网页内容并清洗为纯文本。

    Args:
        url: 目标网页 URL
        timeout: 请求超时秒数
        max_chars: 返回文本最大字符数（截断 + "..." 标记）

    Returns:
        {
            "ok": True/False,
            "url": str,
            "title": str,
            "text": str,
            "meta_description": str,
            "chars": int,
            "truncated": bool,
            "elapsed_ms": int,
            "error": str (仅失败时)
        }
    """
    start = time.time()
    result = {
        "ok": False,
        "url": url,
        "title": "",
        "text": "",
        "meta_description": "",
        "chars": 0,
        "truncated": False,
        "elapsed_ms": 0,
        "error": "",
        "scraped_at": "",
    }

    try:
        # 请求网页
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }
        resp = httpx.get(
            url,
            headers=headers,
            timeout=timeout,
            follow_redirects=True,
            verify=False,  # 忽略 SSL 证书错误（部分官网自签证书）
        )
        resp.raise_for_status()

        # 自动检测编码
        resp.encoding = resp.encoding or "utf-8"
        html = resp.text

    except httpx.TimeoutException:
        elapsed = int((time.time() - start) * 1000)
        result["elapsed_ms"] = elapsed
        result["error"] = f"请求超时（{timeout}s）"
        return result
    except httpx.HTTPStatusError as e:
        elapsed = int((time.time() - start) * 1000)
        result["elapsed_ms"] = elapsed
        status = e.response.status_code
        if status in (403, 429, 503):
            try:
                raw_html = e.response.text
                if raw_html and len(raw_html) > 100:
                    result["ok"] = True
                    result["raw_html"] = True
                    result["text"] = raw_html[:max_chars]
                    result["chars"] = len(raw_html)
                    result["truncated"] = len(raw_html) > max_chars
                    result["error"] = f"反爬回退(HTTP{status})：内容为原始HTML，已交由LLM解析"
                    result["scraped_at"] = datetime.now(timezone.utc).isoformat() + "Z"
                    return result
            except Exception:
                pass
        result["error"] = f"HTTP {status}"
        return result
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        result["elapsed_ms"] = elapsed
        result["error"] = str(e)[:200]
        return result

    # 解析 HTML
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        # BeautifulSoup 解析失败 → 退化为简单正则清洗
        clean = re.sub(r"<[^>]+>", " ", html)
        clean = re.sub(r"\s+", " ", clean).strip()
        result["ok"] = True
        result["elapsed_ms"] = int((time.time() - start) * 1000)
        result["text"] = clean[:max_chars]
        result["chars"] = len(clean)
        result["truncated"] = len(clean) > max_chars
        result["scraped_at"] = datetime.now(timezone.utc).isoformat() + "Z"
        return result

    # 提取标题
    title_tag = soup.find("title")
    result["title"] = _clean_text(title_tag.get_text()) if title_tag else ""

    # 提取 meta description
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        result["meta_description"] = _clean_text(meta_desc["content"])[:500]

    # 剔除广告、导航等干扰内容
    for tag_name in REMOVE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # 根据 class/id 关键词剔除
    for kw in REMOVE_KEYWORDS:
        for tag in soup.find_all(class_=re.compile(kw, re.I)):
            tag.decompose()
        for tag in soup.find_all(id=re.compile(kw, re.I)):
            tag.decompose()

    # 提取 body 文本
    body = soup.find("body")
    if body:
        text = body.get_text(separator="\n", strip=True)
    else:
        text = soup.get_text(separator="\n", strip=True)

    # 清洗
    lines = []
    for line in text.split("\n"):
        cleaned = _clean_text(line)
        if cleaned and len(cleaned) > 2:  # 过滤过短的行
            lines.append(cleaned)

    text = "\n".join(lines)

    # 截断
    truncated = len(text) > max_chars
    if truncated:
        text = text[:max_chars] + "\n...(内容已截断)"

    result["ok"] = True
    result["text"] = text
    result["chars"] = len(text)
    result["truncated"] = truncated
    result["elapsed_ms"] = int((time.time() - start) * 1000)
    result["scraped_at"] = datetime.now(timezone.utc).isoformat() + "Z"
    return result


def scrape_website_sync(url: str, timeout: int = 15, max_chars: int = 15000) -> Dict:
    """同步版本（兼容非 async 上下文）"""
    return scrape_website(url, timeout=timeout, max_chars=max_chars)


def search_baidu_for_official_website(company_name: str, timeout: int = 15):
    """使用百度搜索公司名称+官网，提取第一个看起来是官网的链接。"""
    import httpx
    from bs4 import BeautifulSoup
    if not company_name or len(company_name.strip()) < 2:
        return None
    query = f"{company_name.strip()} 官网"
    try:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }
        resp = httpx.get(
            "https://www.baidu.com/s",
            params={"wd": query},
            headers=headers,
            timeout=timeout,
            follow_redirects=True,
            verify=False,
        )
        resp.raise_for_status()
        resp.encoding = resp.encoding or "utf-8"
        html = resp.text
    except Exception:
        return None

    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return None

    candidates = []
    for link in soup.find_all("a", href=True):
        href = link.get("href", "").strip()
        text = link.get_text(strip=True)
        if not href:
            continue
        if "baidu.com" in href or "baike.baidu.com" in href:
            continue
        if href.startswith("javascript:") or href.startswith("#"):
            continue
        if "image.baidu.com" in href or "map.baidu.com" in href or "tieba.baidu.com" in href:
            continue
        if href.startswith("http://") or href.startswith("https://"):
            candidates.append((href, text))

    if not candidates:
        return None

    def score(item):
        url, text = item
        s = 0
        if "官网" in text or "官方网站" in text:
            s += 100
        if "www" in url:
            s += 20
        domain = url.split("/")[2] if "://" in url else url
        s -= len(domain) * 0.5
        return s

    candidates.sort(key=score, reverse=True)
    return candidates[0][0]


def auto_resolve_website_url(kb_base, company_name=""):
    """自动解析官网 URL。优先 kb_base["企业官网"] -> 企业全称 -> 企业简称 -> 百度搜索。"""
    import httpx
    from bs4 import BeautifulSoup
    website = str(kb_base.get("企业官网") or "").strip()
    if website:
        if not website.startswith("http://") and not website.startswith("https://"):
            website = "https://" + website
        return website

    if not company_name:
        company_name = str(kb_base.get("企业全称") or "").strip()
    if not company_name:
        company_name = str(kb_base.get("企业简称") or "").strip()
    if company_name:
        return search_baidu_for_official_website(company_name)

    return None


def search_baidu_for_company(company_name: str, timeout: int = 15):
    """百度搜索公司名，返回官网URL。"""
    return search_baidu_for_official_website(company_name, timeout=timeout)


def compose_competitor_discovery_query(kb_base: dict, page_context: str = "", competitors: str = "") -> str:
    """根据KB信息、页面上下文和请求参数构建竞品发现查询词。
    
    支持从三个来源提取信息（优先级：kb_base > page_context > competitors）：
    1. kb_base: 企业知识库（企业基础信息 section）
    2. page_context: 前端 buildPageContext 生成的 "- 键：值\n" 格式文本
    3. competitors: 前端传入的 competitors 参数（自动过滤 LLM 风格提示）
    """
    def _parse_kv(text):
        """解析 "- 键：值\n" 格式的文本，返回 {key: value} 字典"""
        result = {}
        if not text:
            return result
        for line in text.split('\n'):
            line = line.strip()
            if line.startswith('- '):
                line = line[2:]
            if '：' in line:
                key, value = line.split('：', 1)
                key = key.strip()
                value = value.strip()
                if value:
                    result[key] = value
            elif ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                if value:
                    result[key] = value
        return result
    
    # 1. 从 kb_base 提取
    region = str(kb_base.get("销售区域范围") or kb_base.get("销售区域") or kb_base.get("服务区域") or "").strip()
    product = str(kb_base.get("主营产品") or kb_base.get("主营产品/服务") or kb_base.get("核心产品/服务") or "").strip()
    industry = str(kb_base.get("所在行业") or kb_base.get("行业") or "").strip()
    name = str(kb_base.get("企业全称") or kb_base.get("企业简称") or "").strip()
    
    # 2. 从 page_context 提取（fallback）
    if page_context:
        ctx = _parse_kv(page_context)
        if not region:
            region = str(ctx.get("销售区域范围") or ctx.get("销售区域") or ctx.get("服务区域") or ctx.get("想要对标范围") or "").strip()
        if not product:
            product = str(ctx.get("主营产品") or ctx.get("主营产品/服务") or ctx.get("核心产品/服务") or "").strip()
        if not industry:
            industry = str(ctx.get("所在行业") or ctx.get("行业") or "").strip()
        if not name:
            name = str(ctx.get("企业全称") or ctx.get("企业简称") or "").strip()
    
    # 3. 从 competitors 参数提取（过滤 LLM 风格提示后的 fallback）
    if competitors and not any([region, product, industry, name]):
        # 过滤 LLM 风格提示（如"请按照豆包大模型的风格生成内容。\n\n"）
        clean = re.sub(r'请按照.*?大模型的风格生成内容。?\n?\n?', '', competitors)
        clean = clean.strip()
        if clean:
            ctx = _parse_kv(clean)
            if not region:
                region = str(ctx.get("销售区域范围") or ctx.get("销售区域") or ctx.get("服务区域") or ctx.get("想要对标范围") or "").strip()
            if not product:
                product = str(ctx.get("主营产品") or ctx.get("主营产品/服务") or ctx.get("核心产品/服务") or "").strip()
            if not industry:
                industry = str(ctx.get("所在行业") or ctx.get("行业") or "").strip()
            if not name:
                name = str(ctx.get("企业全称") or ctx.get("企业简称") or "").strip()
    
    # 构建查询：产品 + 行业 + 区域（至少包含一项）
    query_parts = []
    if product:
        query_parts.append(product)
    if industry:
        query_parts.append(industry)
    if region:
        query_parts.append(region)
    
    # 如果没有任何产品/行业/区域信息，回退到企业名称
    if not query_parts and name:
        query_parts.append(name)
    
    return " ".join(query_parts) if query_parts else ""


def segment_and_summarize_long_content(
    scraped: dict,
    max_per_competitor: int = 6000,
    max_total: int = 35000,
    segment_size: int = 4000,
) -> dict:
    """语料检测+分段摘要机制。超限时分段调用LLM提取关键信息摘要。"""
    if not scraped:
        return scraped

    from backend.services.llm_service import call_llm_sync

    needs_summary = False
    total_chars = 0
    for name, data in scraped.items():
        if not isinstance(data, dict):
            continue
        text = data.get("text", "")
        chars = len(text)
        total_chars += chars
        if chars > max_per_competitor:
            needs_summary = True

    if not needs_summary and total_chars <= max_total:
        return scraped

    for name, data in scraped.items():
        if not isinstance(data, dict):
            continue
        text = data.get("text", "")
        if not text:
            continue
        if len(text) <= max_per_competitor and total_chars <= max_total:
            continue

        target_chars = min(max_per_competitor, int(max_total / max(1, len(scraped))))
        segments = []
        pos = 0
        while pos < len(text):
            seg = text[pos:pos + segment_size]
            if seg.strip():
                segments.append(seg.strip())
            pos += segment_size

        if not segments:
            continue

        summaries = []
        for i, seg in enumerate(segments):
            ln1 = "请从以下网页内容中提取该企业的核心业务信息，"
            ln2 = "用简洁中文点列出（产品服务、优势特色、目标客户、市场定位），"
            ln3 = "每条不超过50字，总共不超过300字。"
            prompt = ln1 + ln2 + ln3 + "\n\n---\n" + seg + "\n---"
            try:
                summary = call_llm_sync(prompt, timeout=25)
                if summary and len(summary) > 10:
                    summaries.append(summary.strip())
            except Exception:
                pass
            if i >= 4:
                break

        if summaries:
            combined = "\n".join(summaries)
            if len(combined) > target_chars:
                combined = combined[:target_chars]
            data["text"] = combined
            data["chars"] = len(combined)
            data["summarized"] = True
            data["original_chars"] = len(text)
            data["segment_count"] = len(segments)
        else:
            data["text"] = text[:target_chars]
            data["chars"] = target_chars
            data["truncated"] = True
            data["original_chars"] = len(text)

    final_total = sum(
        d.get("chars", 0) for d in scraped.values() if isinstance(d, dict)
    )
    if final_total > max_total:
        ratio = max_total / max(1, final_total)
        for name, data in scraped.items():
            if not isinstance(data, dict):
                continue
            current = data.get("chars", 0)
            new_limit = max(300, int(current * ratio))
            if current > new_limit and data.get("text"):
                data["text"] = data["text"][:new_limit]
                data["chars"] = new_limit

    return scraped
