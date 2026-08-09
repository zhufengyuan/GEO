"""
提示词模板渲染服务（迁移自 backend/llm.R）

对应 R 函数：
  read_prompt_template(geo_root, name)  → _read_template(name)
  render_prompt(tpl, vars)              → render_prompt(tpl, vars)
  build_article_prompt(...)              → build_article_prompt(...)
  build_title_prompt(...)                → build_title_prompt(...)
  build_activity_desc_prompt(...)        → build_activity_desc_prompt(...)
  build_expand_words_prompt(...)        → build_expand_words_prompt(...)
"""
import os
from typing import Dict, Optional
from pathlib import Path
import json

# 文件名业务信息解析
from backend.utils.filename_parser import extract_business_context_from_images

# 模板目录（相对于 backend-py/）
_PROMPT_DIR = Path(__file__).parent.parent / "prompts"


def _read_template(name: str) -> str:
    """读取提示词模板文件"""
    path = _PROMPT_DIR / name
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def render_prompt(tpl: str, vars: dict) -> str:
    """
    渲染提示词模板（替换 {{key}} 占位符）
    对应 R 代码：gsub(token, as.character(vars[[k]]), out, fixed=TRUE)
    """
    out = tpl
    for k, v in vars.items():
        token = "{{" + k + "}}"
        val = "" if v is None else str(v)
        out = out.replace(token, val)
    return out


# ------- 各 prompt 构建函数（对应 R 的 build_* 函数）--------

def build_expand_words_prompt(keyword: str) -> str:
    tpl = _read_template("expand_words_prompt.txt")
    return render_prompt(tpl, {"keyword": keyword})


def build_title_prompt(
    enterprise: dict, lexicon: dict,
    keyword: str, hint: str
) -> str:
    tpl = _read_template("title_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": enterprise.get("enterprise_full_name", ""),
        "enterprise_short_name": enterprise.get("enterprise_short_name", ""),
        "main_products": enterprise.get("main_products", ""),
        "keyword": keyword,
        "hint": hint,
        "lexicon_company": lexicon.get("company", ""),
        "lexicon_industry_keyword": lexicon.get("industry_keyword", ""),
    })


def build_activity_desc_prompt(
    enterprise: dict, lexicon: dict,
    keyword: str, hint: str
) -> str:
    tpl = _read_template("activity_desc_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": enterprise.get("enterprise_full_name", ""),
        "enterprise_short_name": enterprise.get("enterprise_short_name", ""),
        "main_products": enterprise.get("main_products", ""),
        "keyword": keyword,
        "hint": hint,
        "lexicon_company": lexicon.get("company", ""),
        "lexicon_industry_keyword": lexicon.get("industry_keyword", ""),
    })


def build_article_prompt(
    enterprise: dict, lexicon: dict, task: dict,
    kb_base: Optional[dict] = None,
    kb_docs: Optional[dict] = None,
) -> str:
    """
    task 结构（对应 R 的 task 变量）：
      tab, question_text, platforms[], article_type, style, tone, brand_embed, user_input
    """
    tab = task.get("tab", "product")
    # 选模板（对应 R 的 if/else）
    tpl_name = "article_prompt.txt"
    if tab == "product":
        tpl_name = "article_product_prompt.txt"
    elif tab == "brand":
        tpl_name = "article_brand_prompt.txt"
    elif tab == "activity":
        tpl_name = "article_activity_prompt.txt"

    tpl = _read_template(tpl_name)
    if not tpl:
        tpl = _read_template("article_prompt.txt")

    words_obj = lexicon.get("words", None)
    if isinstance(words_obj, (bytes, bytearray)):
        try:
            words_obj = words_obj.decode("utf-8")
        except Exception:
            words_obj = None
    if isinstance(words_obj, str) and words_obj:
        try:
            words_obj = json.loads(words_obj)
        except Exception:
            pass

    products = task.get("products") or []
    if not isinstance(products, list):
        products = []
    prod = task.get("product") or {}
    if not isinstance(prod, dict):
        prod = {}
    if not prod and products and isinstance(products[0], dict):
        prod = products[0]
    images = task.get("images") or []
    if not isinstance(images, list):
        images = []

    geo_general_rules = _read_template("geo_general_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    def _task_corpus() -> str:
        parts = []
        parts.append(f"创作入口：{tab}")
        qt = str(task.get("question_text") or "").strip()
        if qt:
            parts.append(f"选中问题词：{qt}")
        title = str(task.get("title") or "").strip()
        if title:
            parts.append(f"标题：{title}")
        platforms = task.get("platforms") if isinstance(task.get("platforms"), list) else []
        if platforms:
            parts.append("主要平台：" + "、".join([str(x).strip() for x in platforms if str(x).strip()]))
        at = str(task.get("article_type") or "").strip()
        if at:
            parts.append(f"文章类型：{at}")
        style = str(task.get("style") or "").strip()
        if style:
            parts.append(f"文章风格：{style}")
        tone = str(task.get("tone") or "").strip()
        if tone:
            parts.append(f"文章语调：{tone}")
        ui = str(task.get("user_input") or "").strip()
        if ui:
            parts.append("用户输入内容：\n" + ui)
        if prod:
            pn = str(prod.get("precise_product_name") or prod.get("product_name") or "").strip()
            if pn:
                parts.append(f"产品/服务名称：{pn}")
        return "\n".join([p for p in parts if p]).strip()

    return render_prompt(tpl, {
        "enterprise_full_name": enterprise.get("enterprise_full_name", ""),
        "enterprise_short_name": enterprise.get("enterprise_short_name", ""),
        "enterprise_website": enterprise.get("enterprise_website", ""),
        "main_products": enterprise.get("main_products", ""),
        "enterprise_advantage": enterprise.get("enterprise_advantage", ""),
        "product_advantage": enterprise.get("product_advantage", ""),
        "tech_advantage": enterprise.get("tech_advantage", ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "geo_general_rules": geo_general_rules,
        "lexicon_name": lexicon.get("name", ""),
        "lexicon_company": lexicon.get("company", ""),
        "lexicon_industry_keyword": lexicon.get("industry_keyword", ""),
        "lexicon_decision_stage": lexicon.get("decision_stage", ""),
        "lexicon_words_json": json.dumps(words_obj if words_obj is not None else {}, ensure_ascii=False),
        "task_corpus": _task_corpus(),
        "task_tab": tab,
        "task_question_text": task.get("question_text", ""),
        "task_platforms": "、".join(task.get("platforms", [])),
        "task_article_type": task.get("article_type", ""),
        "task_style": task.get("style", ""),
        "task_tone": task.get("tone", ""),
        "task_brand_embed": "是" if task.get("brand_embed") else "否",
        "task_user_input": task.get("user_input", ""),
        "product_precise_product_name": prod.get("precise_product_name", ""),
        "product_core_material": prod.get("core_material", ""),
        "product_core_params": prod.get("core_params", ""),
        "product_core_features": prod.get("core_features", ""),
        "product_core_advantages": prod.get("core_advantages", ""),
        "product_use_scenarios": prod.get("use_scenarios", ""),
        "product_target_audience": prod.get("target_audience", ""),
        "product_target_market": prod.get("target_market", ""),
        "product_customization_capability": prod.get("customization_capability", ""),
        "task_product_json": json.dumps(prod, ensure_ascii=False),
        "task_products_json": json.dumps(products, ensure_ascii=False),
        "task_images_json": json.dumps(images, ensure_ascii=False),
        "image_filename_context": extract_business_context_from_images(images),
    })


def build_article_product_chat_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base: Optional[dict] = None,
    kb_docs: Optional[dict] = None,
    question_text: str = "",
    product: Optional[dict] = None,
    products: Optional[list] = None,
    images: Optional[list] = None,
    history: Optional[list] = None,
) -> str:
    tpl = _read_template("article_product_chat_prompt.txt")
    if not tpl:
        tpl = _read_template("article_product_prompt.txt")

    words_obj = lexicon.get("words", None)
    if isinstance(words_obj, (bytes, bytearray)):
        try:
            words_obj = words_obj.decode("utf-8")
        except Exception:
            words_obj = None
    if isinstance(words_obj, str) and words_obj:
        try:
            words_obj = json.loads(words_obj)
        except Exception:
            pass

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")
    prods = products if isinstance(products, list) else []
    prod = product if isinstance(product, dict) else {}
    if not prod and prods and isinstance(prods[0], dict):
        prod = prods[0]
    imgs = images if isinstance(images, list) else []
    hist = history if isinstance(history, list) else []

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
        "enterprise_full_name": enterprise.get("enterprise_full_name", ""),
        "enterprise_short_name": enterprise.get("enterprise_short_name", ""),
        "enterprise_website": enterprise.get("enterprise_website", ""),
        "main_products": enterprise.get("main_products", ""),
        "enterprise_advantage": enterprise.get("enterprise_advantage", ""),
        "product_advantage": enterprise.get("product_advantage", ""),
        "tech_advantage": enterprise.get("tech_advantage", ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "lexicon_company": lexicon.get("company", ""),
        "lexicon_industry_keyword": lexicon.get("industry_keyword", ""),
        "lexicon_decision_stage": lexicon.get("decision_stage", ""),
        "lexicon_words_json": json.dumps(words_obj if words_obj is not None else {}, ensure_ascii=False),
        "question_text": question_text or "",
        "product_json": _safe_json(prod),
        "products_json": _safe_json(prods),
        "images_json": _safe_json(imgs),
        "image_filename_context": extract_business_context_from_images(imgs),
        "history_json": _safe_json(hist),
    })


def build_article_product_optimize_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base: Optional[dict] = None,
    kb_docs: Optional[dict] = None,
    question_text: str = "",
    user_input: str = "",
    products: Optional[list] = None,
    images: Optional[list] = None,
    draft_text: str = "",
) -> str:
    tpl = _read_template("article_product_optimize_prompt.txt")
    if not tpl:
        tpl = _read_template("article_product_prompt.txt")

    words_obj = lexicon.get("words", None)
    if isinstance(words_obj, (bytes, bytearray)):
        try:
            words_obj = words_obj.decode("utf-8")
        except Exception:
            words_obj = None
    if isinstance(words_obj, str) and words_obj:
        try:
            words_obj = json.loads(words_obj)
        except Exception:
            pass

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")
    prods = products if isinstance(products, list) else []
    imgs = images if isinstance(images, list) else []

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "lexicon_company": lexicon.get("company", ""),
        "lexicon_industry_keyword": lexicon.get("industry_keyword", ""),
        "lexicon_decision_stage": lexicon.get("decision_stage", ""),
        "lexicon_words_json": json.dumps(words_obj if words_obj is not None else {}, ensure_ascii=False),
        "question_text": question_text or "",
        "user_input": str(user_input or "").strip(),
        "products_json": _safe_json(prods),
        "images_json": _safe_json(imgs),
        "image_filename_context": extract_business_context_from_images(imgs),
        "draft_text": str(draft_text or "").strip(),
    })


def build_article_writing_init_chat_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base: Optional[dict] = None,
    kb_docs: Optional[dict] = None,
    question_text: str = "",
    products: Optional[list] = None,
    images: Optional[list] = None,
) -> str:
    tpl = _read_template("article_writing_init_chat_prompt.txt")
    if not tpl:
        tpl = _read_template("article_product_chat_prompt.txt")

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")
    prods = products if isinstance(products, list) else []
    imgs = images if isinstance(images, list) else []

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
        "enterprise_full_name": enterprise.get("enterprise_full_name", ""),
        "enterprise_short_name": enterprise.get("enterprise_short_name", ""),
        "enterprise_website": enterprise.get("enterprise_website", ""),
        "main_products": enterprise.get("main_products", ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "lexicon_company": lexicon.get("company", ""),
        "lexicon_industry_keyword": lexicon.get("industry_keyword", ""),
        "lexicon_decision_stage": lexicon.get("decision_stage", ""),
        "lexicon_words_json": _safe_json(lexicon.get("words", "")),
        "question_text": question_text or "",
        "products_json": _safe_json(prods),
        "images_json": _safe_json(imgs),
        "image_filename_context": extract_business_context_from_images(imgs),
    })


def build_kb_profile_prompt(kb: dict) -> str:
    tpl = _read_template("kb_profile_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_address": kb.get("enterprise_address", ""),
        "enterprise_contact": kb.get("enterprise_contact", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "sales_region": kb.get("sales_region", ""),
        "sales_channel": kb.get("sales_channel", ""),
        "extras": kb.get("extras", ""),
    })


def build_kb_library_prompt(kb: dict) -> str:
    tpl = _read_template("kb_library_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_address": kb.get("enterprise_address", ""),
        "enterprise_contact": kb.get("enterprise_contact", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "sales_region": kb.get("sales_region", ""),
        "sales_channel": kb.get("sales_channel", ""),
        "extras": kb.get("extras", ""),
    })


def build_kb_timeline_prompt(kb: dict) -> str:
    tpl = _read_template("kb_timeline_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "main_products": kb.get("main_products", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "extras": kb.get("extras", ""),
    })


def build_kb_positioning_prompt(kb: dict, mode: str = "main", current_text: str = "") -> str:
    tpl = _read_template("kb_positioning_prompt.txt")
    return render_prompt(tpl, {
        "mode": mode or "main",
        "current_text": current_text or "",
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "sales_region": kb.get("sales_region", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "company_profile": kb.get("company_profile", ""),
        "enterprise_library": kb.get("enterprise_library", ""),
        "timeline_text": kb.get("timeline_text", ""),
        "extras": kb.get("extras", ""),
    })


def build_data_diagnosis_prompt(kb: dict, manual: str, page_context: str = "") -> str:
    tpl = _read_template("data_diagnosis_prompt.txt")
    return render_prompt(tpl, {
        "company_profile": kb.get("company_profile", ""),
        "enterprise_library": kb.get("enterprise_library", ""),
        "timeline_text": kb.get("timeline_text", ""),
        "manual": manual or "",
        "page_context": page_context or "",
        "extras": kb.get("extras", ""),
    })


def build_website_diagnosis_prompt(kb: dict, page_context: str = "") -> str:
    tpl = _read_template("website_diagnosis_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_website": kb.get("enterprise_website", ""),
        "page_context": page_context or "",
        "extras": kb.get("extras", ""),
    })


def build_competitor_discovery_prompt(kb: dict, query: str = "") -> str:
    """构建竞品发现提示词——让LLM推荐该领域的Top竞争对手"""
    tpl = _read_template("competitor_discovery_prompt.txt")
    q = query or ""
    if not q:
        # 自动构建查询词
        parts = []
        region = str(kb.get("sales_region", "") or kb.get("销售区域范围", "")).strip()
        if region:
            parts.append(region)
        product = str(kb.get("main_products", "") or kb.get("主营产品", "") or kb.get("主营产品/服务", "")).strip()
        if product:
            parts.append(product)
        industry = str(kb.get("industry", "") or kb.get("所在行业", "")).strip()
        if industry:
            parts.append(industry)
        q = " ".join(parts) if parts else str(kb.get("enterprise_full_name", ""))
    return render_prompt(tpl, {
        "query": q,
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "industry": kb.get("industry", "") or kb.get("所在行业", ""),
        "sales_region": kb.get("sales_region", "") or kb.get("销售区域范围", ""),
    })


def build_competitor_analysis_prompt(kb: dict, competitors: str, page_context: str = "", competitor_scraped: dict = None) -> str:
    """构建竞品分析提示词

    Args:
        kb: 企业知识库字典
        competitors: 竞品名称列表（逗号分隔）
        page_context: 页面上下文
        competitor_scraped: {公司名: {url, title, text, scraped_at, ...}} 竞品官网爬取结果
    """
    # 构建竞品爬取内容块
    scraped_block = ""
    if competitor_scraped:
        from datetime import datetime
        parts = ["## 以下为实时爬取的竞品官网内容\n"]
        for i, (comp_name, data) in enumerate(competitor_scraped.items(), 1):
            if not isinstance(data, dict):
                continue
            parts.append(f"### 竞品{i}：{comp_name}")
            scrape_time = data.get("scraped_at", datetime.now().isoformat())
            parts.append(f"- 官网URL：{data.get('url', '')}")
            parts.append(f"- 页面标题：{data.get('title', '')}")
            parts.append(f"- 爬取时间：{scrape_time}")
            if data.get("raw_html"):
                parts.append("- （遭遇反爬，原始HTML交由LLM解析）")
            if data.get("error") and not data.get("ok"):
                parts.append(f"- 爬取失败：{data.get('error', '未知')}")
                parts.append("")
                continue
            text = data.get("text", "")
            if text:
                parts.append(f"- 页面内容：")
                parts.append(text)
            parts.append("")
        scraped_block = "\n".join(parts)

    tpl = _read_template("competitor_analysis_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "competitors": competitors or "",
        "competitor_scraped_block": scraped_block,
        "page_context": page_context or "",
        "extras": kb.get("extras", ""),
    })


def build_diagnosis_report_prompt(kb: dict, extra_input: str, llm_name: str, page_context: str = "") -> str:
    tpl = _read_template("diagnosis_report_prompt.txt")
    llm = str(llm_name or "").strip()
    llm_instruction = f"请按照{llm}大模型的风格生成内容。\n\n" if llm else ""
    return render_prompt(tpl, {
        "llm_instruction": llm_instruction,
        "company_profile": kb.get("company_profile", ""),
        "enterprise_library": kb.get("enterprise_library", ""),
        "timeline_text": kb.get("timeline_text", ""),
        "extra_input": extra_input or "",
        "page_context": page_context or "",
        "extras": kb.get("extras", ""),
    })


def build_diagnosis_report_with_scrape_prompt(
    kb: dict,
    extra_input: str,
    llm_name: str,
    page_context: str = "",
    website_content: dict = None,
) -> str:
    """生成含实时爬虫内容的诊断报告提示词"""
    tpl = _read_template("diagnosis_report_scrape_prompt.txt")
    llm = str(llm_name or "").strip()
    llm_instruction = f"请按照{llm}大模型的风格生成内容。\n\n" if llm else ""

    # 构建爬虫内容块（带时间戳标注）
    website_content_block = ""
    if website_content and isinstance(website_content, dict) and website_content.get("ok"):
        from datetime import datetime
        fetch_time = website_content.get("scraped_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        fetch_url = str(website_content.get("url") or "")
        fetch_title = str(website_content.get("title") or "")
        fetch_text = str(website_content.get("text") or "")
        fetch_chars = website_content.get("chars", 0)
        fetch_elapsed_ms = website_content.get("elapsed_ms", 0)
        fetch_truncated = website_content.get("truncated", False)

        parts = [
            "## 【实时爬取的官网内容 — 以下内容为刚刚从官网实时抓取】",
            f"- 抓取时间：{fetch_time}",
            f"- 来源网址：{fetch_url}",
            f"- 页面标题：{fetch_title}",
            f"- 内容长度：{fetch_chars} 字符（抓取耗时 {fetch_elapsed_ms}ms）",
        ]
        if fetch_truncated:
            parts.append("- ⚠️ 内容过长已截断（仅保留前 15000 字符）")

        parts.append("")
        parts.append("### 官网页面正文内容")
        parts.append(fetch_text)

        website_content_block = "\n".join(parts)
    elif website_content and isinstance(website_content, dict) and website_content.get("error"):
        fetch_time = website_content.get("scraped_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        website_content_block = (
            f"## 【官网爬取失败】\n"
            f"- 爬取时间：{fetch_time}\n"
            f"- 目标网址：{website_content.get('url', '')}\n"
            f"- 失败原因：{website_content.get('error', '未知错误')}\n"
            f"- 请基于现有知识库内容进行分析。"
        )

    return render_prompt(tpl, {
        "llm_instruction": llm_instruction,
        "company_profile": kb.get("company_profile", ""),
        "enterprise_library": kb.get("enterprise_library", ""),
        "timeline_text": kb.get("timeline_text", ""),
        "website_content_block": website_content_block,
        "extra_input": extra_input or "",
        "page_context": page_context or "",
        "extras": kb.get("extras", ""),
    })


def build_optimization_plan_prompt(kb: dict) -> str:
    tpl = _read_template("optimization_plan_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "company_profile": kb.get("company_profile", ""),
        "enterprise_library": kb.get("enterprise_library", ""),
        "timeline_text": kb.get("timeline_text", ""),
        "extras": kb.get("extras", ""),
    })


def build_optimization_schedule_prompt(kb: dict) -> str:
    tpl = _read_template("optimization_schedule_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "extras": kb.get("extras", ""),
    })


def build_acceptance_score_prompt(kb: dict) -> str:
    tpl = _read_template("acceptance_score_prompt.txt")
    return render_prompt(tpl, {
        "enterprise_full_name": kb.get("enterprise_full_name", ""),
        "enterprise_short_name": kb.get("enterprise_short_name", ""),
        "enterprise_website": kb.get("enterprise_website", ""),
        "main_products": kb.get("main_products", ""),
        "target_customers": kb.get("target_customers", ""),
        "enterprise_advantage": kb.get("enterprise_advantage", ""),
        "product_advantage": kb.get("product_advantage", ""),
        "tech_advantage": kb.get("tech_advantage", ""),
        "extras": kb.get("extras", ""),
    })


def build_article_writing_suggestions_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base: Optional[dict] = None,
    kb_docs: Optional[dict] = None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    task_product_json: str = "",
    task_products_json: str = "",
    task_images_json: str = "",
    article_text: str = "",
) -> str:
    tpl = _read_template("article_writing_suggestions_prompt.txt")
    if not tpl:
        return ""

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "task_product_json": _safe_json(task_product_json),
        "task_products_json": _safe_json(task_products_json),
        "task_images_json": _safe_json(task_images_json),
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })


def build_article_writing_suggestions_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base: Optional[dict] = None,
    kb_docs: Optional[dict] = None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    task_product_json: str = "",
    task_products_json: str = "",
    task_images_json: str = "",
    article_text: str = "",
) -> str:
    tpl = _read_template("article_writing_suggestions_prompt.txt")
    if not tpl:
        return ""

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "task_product_json": _safe_json(task_product_json),
        "task_products_json": _safe_json(task_products_json),
        "task_images_json": _safe_json(task_images_json),
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })


def build_article_writing_rewrite_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base=None,
    kb_docs=None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    article_text: str = "",
) -> str:
    tpl = _read_template("article_writing_rewrite_prompt.txt")
    if not tpl:
        return ""

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })


def build_article_writing_rewrite_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base=None,
    kb_docs=None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    article_text: str = "",
) -> str:
    tpl = _read_template("article_writing_rewrite_prompt.txt")
    if not tpl:
        return ""

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })


def build_article_writing_rewrite_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base=None,
    kb_docs=None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    article_text: str = "",
) -> str:
    tpl = _read_template("article_writing_rewrite_prompt.txt")
    if not tpl:
        return ""

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })


def build_article_writing_rewrite_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base=None,
    kb_docs=None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    article_text: str = "",
) -> str:
    tpl = _read_template("article_writing_rewrite_prompt.txt")
    if not tpl:
        return ""

    geo_general_rules = _read_template("geo_general_rules.txt")
    industry_identification_rules = _read_template("industry_identification_rules.txt")

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })
