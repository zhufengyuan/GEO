# -*- coding: utf-8 -*-
"""
舆情搜索爬虫模块
- 搜狗微信搜索 (weixin.sogou.com) — 微信公众号文章
- 搜狗网页搜索 (www.sogou.com) — 通用网页（间接覆盖百度索引内容）
- 必应网页搜索 (cn.bing.com) — 国际化结果
- 关键词启发式情感分析
- 内存 TTL 缓存（5 分钟）

百度已封本服务器 IP（CAPTCHA），不使用。
"""
import time
import re
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from urllib.parse import quote_plus, urljoin

import requests
from parsel import Selector

# ── 配置 ──────────────────────────────────────────────
CACHE_TTL = 300          # 5 分钟
REQUEST_TIMEOUT = 12     # 单个请求超时
MAX_WORKERS = 3           # 并发抓取线程数
SOGOU_BASE = "https://weixin.sogou.com"
BING_BASE = "https://cn.bing.com"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

# ── 缓存 ────────────────────────────────────────────────
_cache = {}
_cache_lock = threading.Lock()


def _get_cache(key):
    with _cache_lock:
        item = _cache.get(key)
        if item and time.time() - item["t"] < CACHE_TTL:
            return item["d"]
        return None


def _set_cache(key, data):
    with _cache_lock:
        _cache[key] = {"d": data, "t": time.time()}
        # 清理过期条目，防止内存泄漏
        if len(_cache) > 80:
            now = time.time()
            for k in list(_cache.keys()):
                if now - _cache[k]["t"] > CACHE_TTL * 2:
                    del _cache[k]


# ── 情感分析（关键词启发式） ────────────────────────────
POSITIVE_WORDS = [
    "好评", "推荐", "口碑", "认可", "点赞", "优秀", "满意", "支持", "喜欢",
    "给力", "赞", "牛", "棒", "不错", "值得", "信赖", "创新", "突破", "增长",
    "领先", "优质", "卓越", "精品", "成功", "突出", "优势", "提升", "进步",
    "荣获", "获奖", "认证", "好评如潮", "热销", "爆款", "标杆", "典范",
    "首选", "龙头", "亮眼", "强劲", "回暖", "利好", "积极", "正面",
]

NEGATIVE_WORDS = [
    "投诉", "质疑", "争议", "避雷", "曝光", "差评", "假冒", "虚假", "欺骗",
    "骗", "坑", "烂", "垃圾", "维权", "退款", "违约", "事故", "安全问题",
    "质量问题", "召回", "处罚", "罚款", "亏损", "下降", "裁员", "关闭",
    "破产", "跑路", "暴雷", "翻车", "踩雷", "缺陷", "故障", "隐患", "滑坡",
    "下架", "封禁", "违规", "违法", "侵权", "索赔", "起诉", "立案", "调查",
    "危机", "负面", "恶化", "暴跌", "闪崩", "退市", "停牌", "警示", "风险",
]


def analyze_sentiment(text):
    """关键词启发式情感分析，返回 positive / negative / neutral"""
    if not text:
        return "neutral"
    pos = sum(1 for w in POSITIVE_WORDS if w in text)
    neg = sum(1 for w in NEGATIVE_WORDS if w in text)
    if neg > pos:
        return "negative"
    if pos > neg:
        return "positive"
    return "neutral"


# ── 通用工具 ────────────────────────────────────────────
def _get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }


def _clean(s):
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


def _all_text(sel, css_selector):
    """获取选择器匹配元素的所有后代文本（解决 <em> 高亮标签分割问题）"""
    parts = sel.css(css_selector + " *::text").getall()
    # 也加上直接文本
    direct = sel.css(css_selector + "::text").getall()
    all_parts = direct + parts
    return _clean(" ".join(all_parts)) if all_parts else ""


def _extract_time_from_js(text):
    """从 Sogou 的 timeConvert('1496919616') 提取时间戳"""
    m = re.search(r"timeConvert\['\"]?(\d{10})['\"]?\)", text or "")
    if m:
        ts = int(m.group(1))
        t = time.localtime(ts)
        return time.strftime("%Y-%m-%d %H:%M", t)
    return ""


def _infer_tag(source, engine=""):
    """从来源和引擎推断标签"""
    # 搜狗微信搜索的结果一定是公众号文章
    if engine == "sogou_weixin":
        return "公众号"
    s = source or ""
    if any(k in s for k in ["微信", "公众号"]):
        return "公众号"
    if any(k in source for k in ["微博", "贴吧", "论坛", "社区"]):
        return "论坛"
    if any(k in source for k in ["知乎", "小红书", "抖音", "快手", "B站", "哔哩"]):
        return "APP"
    if any(k in source for k in ["新闻", "头条", "百度", "腾讯", "新浪", "网易", "搜狐", "凤凰"]):
        return "新闻"
    return "新闻"


def _calc_heat(rank, engine_count, sentiment):
    """计算热度分 0-100"""
    base = max(0, 100 - rank * 5)
    engine_bonus = min(20, engine_count * 10)
    sent_bonus = 10 if sentiment == "negative" else 5 if sentiment == "positive" else 0
    return min(100, base + engine_bonus + sent_bonus)


# ── 搜狗微信搜索 ────────────────────────────────────────
def crawl_sogou_weixin(keyword, page=1):
    """搜索微信公众号文章"""
    url = f"{SOGOU_BASE}/weixin?type=2&query={quote_plus(keyword)}&ie=utf8&page={page}"
    try:
        r = requests.get(url, headers=_get_headers(), timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            return []
        sel = Selector(text=r.text)
        items = sel.css(".news-list li")
        results = []
        for item in items:
            # 标题（<em> 标签会分割文本，用 xpath string() 获取完整文本）
            title = item.xpath("string(.//h3//a)").get()
            title = _clean(title)
            if not title:
                continue
            # 链接（Sogou 重定向链接，保留原样）
            link = item.css("h3 a::attr(href)").get()
            if link and not link.startswith("http"):
                link = urljoin(SOGOU_BASE, link)
            # 摘要
            snippet = item.xpath("string(.//p[contains(@class,'txt-info')])").get()
            if not snippet:
                snippet = item.xpath("string(.//p)").get()
            snippet = _clean(snippet)
            # 账号名（在 .all-time-y2 span 中）
            account = item.css(".all-time-y2::text").get()
            if not account:
                account = item.css(".account::text").get()
            if not account:
                account = item.css(".s-p a::text").get()
            account = _clean(account) or "微信公众号"
            # 时间（从 .s-p 内的 script 提取时间戳）
            sp_html = item.css(".s-p").get()
            time_str = _extract_time_from_js(sp_html)
            results.append({
                "title": title,
                "snippet": snippet,
                "url": link or "",
                "source": account,
                "time": time_str,
                "engine": "sogou_weixin",
            })
        return results
    except Exception:
        return []


# ── 搜狗网页搜索 ────────────────────────────────────────
def crawl_sogou_web(keyword, page=1):
    """搜狗通用网页搜索"""
    url = f"https://www.sogou.com/web?query={quote_plus(keyword)}&page={page}"
    try:
        r = requests.get(url, headers=_get_headers(), timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            return []
        sel = Selector(text=r.text)
        items = sel.css(".results .vrwrap")
        if not items:
            items = sel.css(".vrwrap")
        results = []
        for item in items:
            title = item.xpath("string(.//h3//a)").get()
            title = _clean(title)
            if not title:
                continue
            link = item.css("h3 a::attr(href)").get()
            if link and not link.startswith("http"):
                link = urljoin("https://www.sogou.com", link)
            snippet = item.xpath("string(.//div[contains(@class,'str_info')])").get()
            if not snippet:
                snippet = item.xpath("string(.//p)").get()
            snippet = _clean(snippet)
            # 来源域名
            cite = item.css("cite::text").get()
            source = _clean(cite) if cite else "搜狗网页"
            results.append({
                "title": title,
                "snippet": snippet,
                "url": link or "",
                "source": source,
                "time": "",
                "engine": "sogou_web",
            })
        return results
    except Exception:
        return []


# ── 必应网页搜索 ────────────────────────────────────────
def crawl_bing(keyword, page=1):
    """必应网页搜索"""
    offset = (page - 1) * 10
    url = f"{BING_BASE}/search?q={quote_plus(keyword)}&first={offset + 1}"
    try:
        r = requests.get(url, headers=_get_headers(), timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            return []
        sel = Selector(text=r.text)
        items = sel.css("#b_results .b_algo")
        results = []
        for item in items:
            title = item.xpath("string(.//h2//a)").get()
            title = _clean(title)
            if not title:
                continue
            link = item.css("h2 a::attr(href)").get()
            snippet = item.xpath("string(.//div[contains(@class,'b_caption')]//p)").get()
            if not snippet:
                snippet = item.xpath("string(.//p)").get()
            snippet = _clean(snippet)
            # 来源
            cite = item.css("cite::text").get()
            source = _clean(cite) if cite else "必应搜索"
            # 时间（必应有时在 snippet 里显示日期）
            time_str = ""
            time_match = re.search(r"(\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2})", snippet or "")
            if time_match:
                time_str = time_match.group(1)
            results.append({
                "title": title,
                "snippet": snippet,
                "url": link or "",
                "source": source,
                "time": time_str,
                "engine": "bing",
            })
        return results
    except Exception:
        return []


# ── 聚合搜索 ────────────────────────────────────────────
def search_opinion(keyword, info_type="all", sentiment="all", page=1, page_size=20):
    """
    聚合搜索三个引擎，返回统一格式结果。

    返回:
        {
            "items": [{tag, title, snippet, time, source, heat, sentiment, url}],
            "total": int,
            "page": int,
            "page_size": int,
            "total_all": int,        # 不含情感过滤的总数
            "total_positive": int,
            "total_neutral": int,
            "total_negative": int,
            "cached": bool,
        }
    """
    cache_key = f"{keyword}|{info_type}|{page}"
    cached = _get_cache(cache_key)
    if cached:
        # 缓存命中后做情感过滤（缓存存全量，过滤在调用时做）
        result = _filter_sentiment(cached, sentiment, page, page_size)
        result["cached"] = True
        return result

    # 并行抓取三源
    all_results = []
    crawlers = [
        ("sogou_weixin", crawl_sogou_weixin),
        ("sogou_web", crawl_sogou_web),
        ("bing", crawl_bing),
    ]
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fn, keyword, page): name
            for name, fn in crawlers
        }
        try:
            for future in as_completed(futures, timeout=REQUEST_TIMEOUT + 3):
                try:
                    results = future.result(timeout=REQUEST_TIMEOUT + 3)
                    all_results.extend(results)
                except Exception:
                    pass  # 单源失败不影响整体
        except FuturesTimeout:
            pass  # 超时则用已拿到的结果

    # 去重（按 URL）
    seen = set()
    deduped = []
    for r in all_results:
        url = r.get("url", "")
        if url and url not in seen:
            seen.add(url)
            deduped.append(r)

    # 补充字段：sentiment / tag / heat
    # 统计引擎出现次数（多引擎命中 = 更高热度）
    url_engines = {}
    for r in all_results:
        u = r.get("url", "")
        if u:
            url_engines[u] = url_engines.get(u, 0) + 1

    for idx, r in enumerate(deduped):
        text = (r.get("title", "") + " " + r.get("snippet", "")).strip()
        r["sentiment"] = analyze_sentiment(text)
        r["tag"] = _infer_tag(r.get("source", ""), r.get("engine", ""))
        engine_count = url_engines.get(r.get("url", ""), 1)
        r["heat"] = _calc_heat(idx, engine_count, r["sentiment"])

    # info_type 过滤
    if info_type and info_type != "all":
        tag_map = {"news": "新闻", "app": "APP", "forum": "论坛"}
        target_tag = tag_map.get(info_type, "")
        if target_tag:
            deduped = [r for r in deduped if r["tag"] == target_tag]

    # 按热度排序
    deduped.sort(key=lambda x: x.get("heat", 0), reverse=True)

    # 统计情感分布
    total_all = len(deduped)
    total_pos = sum(1 for r in deduped if r["sentiment"] == "positive")
    total_neg = sum(1 for r in deduped if r["sentiment"] == "negative")
    total_neu = total_all - total_pos - total_neg

    result = {
        "items": deduped,
        "total": total_all,
        "total_all": total_all,
        "total_positive": total_pos,
        "total_neutral": total_neu,
        "total_negative": total_neg,
        "page": 1,
        "page_size": page_size,
        "cached": False,
    }
    _set_cache(cache_key, result)
    filtered = _filter_sentiment(result, sentiment, page, page_size)
    filtered["cached"] = False
    return filtered


def _filter_sentiment(cached_result, sentiment, page, page_size):
    """对缓存结果做情感过滤 + 分页"""
    items = cached_result["items"]
    if sentiment and sentiment != "all":
        items = [r for r in items if r.get("sentiment") == sentiment]

    total = len(items)
    start = (page - 1) * page_size
    paged = items[start:start + page_size]

    return {
        "items": paged,
        "total": total,
        "total_all": cached_result["total_all"],
        "total_positive": cached_result["total_positive"],
        "total_neutral": cached_result["total_neutral"],
        "total_negative": cached_result["total_negative"],
        "page": page,
        "page_size": page_size,
    }


# ── 统计聚合（报告页用） ────────────────────────────────
def get_opinion_stats(keyword):
    """获取统计聚合数据，供报告页使用"""
    # 搜索全量数据（利用缓存）
    result = search_opinion(keyword, page=1, page_size=100)
    items = result.get("items", [])
    all_items = result.get("items", [])

    # 如果缓存的全量数据被情感过滤了，需要重新获取
    # search_opinion 缓存的是全量，_filter_sentiment 返回的是过滤后的
    # 但 items 在缓存里是全量的，我们直接用 total 分布
    total = result["total_all"]
    pos = result["total_positive"]
    neg = result["total_negative"]
    neu = result["total_neutral"]

    # 来源分布
    source_count = {}
    for r in all_items:
        s = r.get("source", "未知")
        source_count[s] = source_count.get(s, 0) + 1
    source_rows = sorted(source_count.items(), key=lambda x: -x[1])[:8]

    # 话题分布（按 tag）
    tag_count = {}
    for r in all_items:
        t = r.get("tag", "新闻")
        tag_count[t] = tag_count.get(t, 0) + 1
    topic_rows = sorted(tag_count.items(), key=lambda x: -x[1])[:6]

    # 7 天趋势（基于 time 字段，如果没有则模拟）
    trend = _build_trend(all_items)

    return {
        "total": total,
        "positive": pos,
        "neutral": neu,
        "negative": neg,
        "trend_days": trend["days"],
        "trend_values": trend["values"],
        "topic_rows": [{"name": n, "count": c} for n, c in topic_rows],
        "source_rows": [{"name": n, "count": c} for n, c in source_rows],
    }


def _build_trend(items):
    """基于结果时间构建 7 天趋势"""
    now = time.time()
    days = []
    values = []
    for i in range(6, -1, -1):
        t = now - i * 86400
        dt = time.localtime(t)
        key = time.strftime("%Y-%m-%d", dt)
        days.append(key)
        # 统计当天结果数
        count = 0
        for r in items:
            rt = r.get("time", "")
            if key in rt:
                count += 1
        values.append(count)
    # 如果没有时间数据，给一个合理的默认趋势
    if sum(values) == 0:
        values = [0, 0, 0, 0, 0, 0, len(items)]
    return {"days": days, "values": values}
