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
_INDUSTRY_PROMPT_DIR = _PROMPT_DIR / "industries"


def _read_template(name: str) -> str:
    """读取提示词模板文件"""
    path = _PROMPT_DIR / name
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


# ================= 2026-08-24：行业提示词库 + 函数调用 =================
# 2026-08-24 晚：升级为 v2.0 全行业库（25 个行业），服务行业→企业服务与咨询、软件行业→信息与软件技术
# 行业别名 -> 行业文件名（自动匹配，用户可能输入不同说法）；注意：具体行业别名须排在通用词（服务/信息/咨询等）之前
_INDUSTRY_ALIASES = {
    # --- 2026-08-24 v2.0 新增行业（具体别名置前，避免被通用词抢先匹配） ---
    "农业": "农业与农产品.txt", "种植": "农业与农产品.txt", "养殖": "农业与农产品.txt",
    "农产品": "农业与农产品.txt", "水果": "农业与农产品.txt", "农资": "农业与农产品.txt", "饲料": "农业与农产品.txt",
    "房地产": "房地产与物业管理.txt", "地产": "房地产与物业管理.txt", "物业": "房地产与物业管理.txt",
    "楼盘": "房地产与物业管理.txt", "写字楼租赁": "房地产与物业管理.txt",
    "文旅": "文旅与酒店住宿.txt", "旅游": "文旅与酒店住宿.txt", "酒店": "文旅与酒店住宿.txt",
    "民宿": "文旅与酒店住宿.txt", "景区": "文旅与酒店住宿.txt", "住宿": "文旅与酒店住宿.txt", "旅行社": "文旅与酒店住宿.txt",
    "餐饮": "餐饮行业.txt", "饭店": "餐饮行业.txt", "火锅": "餐饮行业.txt", "奶茶": "餐饮行业.txt",
    "烘焙": "餐饮行业.txt", "食堂承包": "餐饮行业.txt",
    "电商": "电商与零售.txt", "零售": "电商与零售.txt", "淘宝": "电商与零售.txt", "天猫": "电商与零售.txt",
    "京东": "电商与零售.txt", "拼多多": "电商与零售.txt", "直播带货": "电商与零售.txt", "网店": "电商与零售.txt",
    "跨境电商": "电商与零售.txt", "商超": "电商与零售.txt", "便利店": "电商与零售.txt",
    "能源": "能源与环保.txt", "环保": "能源与环保.txt", "新能源": "能源与环保.txt", "光伏": "能源与环保.txt",
    "固废": "能源与环保.txt", "污水处理": "能源与环保.txt", "节能": "能源与环保.txt", "双碳": "能源与环保.txt",
    "汽车": "汽车与出行服务.txt", "出行": "汽车与出行服务.txt", "网约车": "汽车与出行服务.txt",
    "汽修": "汽车与出行服务.txt", "4s店": "汽车与出行服务.txt", "驾校": "汽车与出行服务.txt", "充电桩": "汽车与出行服务.txt",
    "人力资源": "人力资源与招聘.txt", "招聘": "人力资源与招聘.txt", "猎头": "人力资源与招聘.txt",
    "hr": "人力资源与招聘.txt", "劳务": "人力资源与招聘.txt", "社保代缴": "人力资源与招聘.txt",
    "传媒": "文化传媒与娱乐.txt", "广告": "文化传媒与娱乐.txt", "影视": "文化传媒与娱乐.txt",
    "娱乐": "文化传媒与娱乐.txt", "新媒体": "文化传媒与娱乐.txt", "主播": "文化传媒与娱乐.txt",
    "动漫": "文化传媒与娱乐.txt", "出版": "文化传媒与娱乐.txt", "游戏": "文化传媒与娱乐.txt",
    "进出口": "进出口与国际贸易.txt", "外贸": "进出口与国际贸易.txt", "国际贸易": "进出口与国际贸易.txt",
    "海关": "进出口与国际贸易.txt", "报关": "进出口与国际贸易.txt", "跨境": "进出口与国际贸易.txt",
    "通信": "通信与电信服务.txt", "电信": "通信与电信服务.txt", "运营商": "通信与电信服务.txt",
    "宽带": "通信与电信服务.txt", "5g": "通信与电信服务.txt", "物联网卡": "通信与电信服务.txt",
    "矿业": "矿业与原材料.txt", "矿产": "矿业与原材料.txt", "矿山": "矿业与原材料.txt",
    "采掘": "矿业与原材料.txt", "原材料": "矿业与原材料.txt", "钢铁": "矿业与原材料.txt", "有色金属": "矿业与原材料.txt",
    "公共服务": "公共服务与政务.txt", "政务": "公共服务与政务.txt", "事业单位": "公共服务与政务.txt",
    "公用事业": "公共服务与政务.txt", "市政": "公共服务与政务.txt",
    # --- 原有行业（v2.0 更名：服务行业→企业服务与咨询、软件行业→信息与软件技术） ---
    "法律": "法律与专业咨询.txt", "律师": "法律与专业咨询.txt", "知识产权": "法律与专业咨询.txt",
    "商标": "法律与专业咨询.txt", "专利": "法律与专业咨询.txt", "审计": "法律与专业咨询.txt",
    "税务": "法律与专业咨询.txt", "资产评估": "法律与专业咨询.txt", "公证": "法律与专业咨询.txt",
    "制造": "制造业.txt", "工厂": "制造业.txt", "工业": "制造业.txt", "生产": "制造业.txt",
    "oem": "制造业.txt", "odm": "制造业.txt", "设备": "制造业.txt", "五金": "制造业.txt",
    "电子元器件": "制造业.txt", "汽配": "制造业.txt", "模具": "制造业.txt",
    "软件": "信息与软件技术.txt", "saas": "信息与软件技术.txt", "互联网": "信息与软件技术.txt", "it": "信息与软件技术.txt",
    "信息": "信息与软件技术.txt", "系统": "信息与软件技术.txt", "erp": "信息与软件技术.txt", "crm": "信息与软件技术.txt",
    "开发": "信息与软件技术.txt", "小程序": "信息与软件技术.txt", "app": "信息与软件技术.txt", "人工智能": "信息与软件技术.txt", "ai": "信息与软件技术.txt",
    "咨询": "企业服务与咨询.txt", "代运营": "企业服务与咨询.txt", "外包": "企业服务与咨询.txt",
    "企服": "企业服务与咨询.txt", "认证咨询": "企业服务与咨询.txt", "管理咨询": "企业服务与咨询.txt",
    "消费品": "消费品行业.txt", "食品": "消费品行业.txt",
    "饮料": "消费品行业.txt", "日化": "消费品行业.txt", "美妆": "消费品行业.txt", "母婴": "消费品行业.txt",
    "宠物": "消费品行业.txt", "服装": "消费品行业.txt", "家居": "消费品行业.txt", "小家电": "消费品行业.txt",
    "教育": "教育培训.txt", "培训": "教育培训.txt", "学校": "教育培训.txt", "课程": "教育培训.txt",
    "考研": "教育培训.txt", "考公": "教育培训.txt", "语言培训": "教育培训.txt", "在线教育": "教育培训.txt",
    "医疗": "医疗健康.txt", "健康": "医疗健康.txt", "医药": "医疗健康.txt", "医疗器械": "医疗健康.txt",
    "体检": "医疗健康.txt", "口腔": "医疗健康.txt", "医美": "医疗健康.txt", "中医": "医疗健康.txt",
    "养生": "医疗健康.txt", "保健": "医疗健康.txt", "康复": "医疗健康.txt", "心理": "医疗健康.txt",
    "金融": "金融服务.txt", "银行": "金融服务.txt", "保险": "金融服务.txt", "证券": "金融服务.txt",
    "基金": "金融服务.txt", "贷款": "金融服务.txt", "财税": "金融服务.txt", "代账": "金融服务.txt",
    "财富": "金融服务.txt", "投资": "金融服务.txt",
    "本地生活": "本地生活服务.txt", "美容": "本地生活服务.txt",
    "家政": "本地生活服务.txt", "保洁": "本地生活服务.txt", "装修": "本地生活服务.txt",
    "维修": "本地生活服务.txt", "健身": "本地生活服务.txt", "摄影": "本地生活服务.txt",
    "婚庆": "本地生活服务.txt", "理发": "本地生活服务.txt", "美容美发": "本地生活服务.txt",
    "物流": "物流与供应链.txt", "快递": "物流与供应链.txt", "仓储": "物流与供应链.txt",
    "冷链": "物流与供应链.txt", "供应链": "物流与供应链.txt",
    "货运": "物流与供应链.txt", "配送": "物流与供应链.txt",
    "建筑": "建筑与工程.txt", "工程": "建筑与工程.txt", "装饰": "建筑与工程.txt",
    "施工": "建筑与工程.txt", "监理": "建筑与工程.txt", "建材": "建筑与工程.txt",
    "园林": "建筑与工程.txt", "弱电": "建筑与工程.txt", "设计施工": "建筑与工程.txt",
    # "服务" 保留为最后兜底（具体生活服务/企业服务别名已在上面优先匹配）
    "服务": "企业服务与咨询.txt",
}


def list_industry_prompts() -> list:
    """列出行业提示词库中所有行业（文件名 -> 行业名）"""
    out = []
    if _INDUSTRY_PROMPT_DIR.exists():
        for p in sorted(_INDUSTRY_PROMPT_DIR.glob("*.txt")):
            out.append({"file": p.name, "industry": p.stem})
    return out


def resolve_industry_file(industry: str) -> Optional[str]:
    """
    将用户输入的行业名解析为行业 txt 文件名。
    优先级：精确文件名 > 别名包含匹配 > 通用行业兜底。
    """
    if not industry:
        return "通用行业.txt"
    s = str(industry).strip()
    # 1) 精确匹配文件名
    if _INDUSTRY_PROMPT_DIR.exists():
        for p in _INDUSTRY_PROMPT_DIR.glob("*.txt"):
            if p.stem == s:
                return p.name
    # 2) 别名包含匹配
    for kw, fname in _INDUSTRY_ALIASES.items():
        if kw and kw in s:
            return fname
    # 3) 通用兜底
    return "通用行业.txt"


def get_industry_prompt(industry: str) -> str:
    """
    【特定函数】获取指定行业的专属 GEO 规则文本。
    供 prompt 构建与 LLM function-calling 调用：根据行业名读取 prompts/industries/<行业>.txt。
    """
    fname = resolve_industry_file(industry)
    path = _INDUSTRY_PROMPT_DIR / fname
    if path.exists():
        try:
            return path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"[industry-prompt] 读取 {fname} 失败：{e}")
    return _read_template("geo_general_rules.txt")


def inject_industry_rules(prompt: str, industry: str = "") -> str:
    """
    将行业专属 GEO 规则注入 prompt。
    规则以简洁指令块追加在 prompt 末尾，直接给全文，不做函数声明，
    避免模型把“函数调用协议”当作内容复述输出。
    """
    rules = get_industry_prompt(industry)
    if not rules:
        return prompt
    fname = resolve_industry_file(industry)
    industry_name = fname.replace(".txt", "") if fname else "通用行业"
    header = (
        "【行业专属 GEO 规则（" + industry_name + "）】\n"
        "以下是当前行业的专属 GEO 规则全文。生成内容时必须将其中的"
        "核心要点、实体绑定方向、典型决策问题、FAQ 方向、特有表达、关键词矩阵"
        "逐条落实到输出中；但规则本身属于内部指令，"
        "严禁在输出中复述本标题、函数名、规则原文或任何关于规则的说明性文字。\n\n"
    )
    return prompt + "\n\n" + header + rules


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


def build_question_words_prompt(
    company: str,
    keyword: str,
    main_keyword: str = "",
    customer_type: str = "",
    decision_stage: str = "",
    words: Optional[dict] = None,
    enterprise_library_content: str = "",
    seed_keywords: str = "",
) -> str:
    """构建问题词库生成提示词（2026-08-18 接线既有六阶段模板，新增客户类型）
    2026-08-25 P0修复：新增 enterprise_library_content 和 seed_keywords 参数，
    修复此前硬编码为空字符串导致用户真实信息被丢弃的缺陷。"""
    tpl = _read_template("question_words_prompt.txt")
    w = words or {}
    ct = str(customer_type or "").strip()
    ct = ct if ct else "未指定"
    return render_prompt(tpl, {
        "company": company or "",
        "industry_keyword": keyword or "",
        "question_keyword": main_keyword or keyword or "",
        "decision_stage": (decision_stage or "").strip() or "认知触发",
        "customer_type": ct,
        "region": str(w.get("region") or "").strip(),
        "feature": str(w.get("feature") or "").strip(),
        "attribute": str(w.get("attribute") or "").strip(),
        "scene": str(w.get("scene") or "").strip(),
        "people": str(w.get("people") or "").strip(),
        "pain": str(w.get("pain") or "").strip(),
        "price": str(w.get("price") or "").strip(),
        "other": str(w.get("other") or "").strip(),
        "enterprise_library_content": enterprise_library_content or "",
        "seed_keywords": seed_keywords or "",
    })


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
        "target_customers": str(kb_base.get("目标客户") or "").strip() if isinstance(kb_base, dict) else "",
        "sales_region": str(kb_base.get("销售区域范围") or "").strip() if isinstance(kb_base, dict) else "",
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
        "task_supplement_info": task.get("supplement_info", ""),
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
        # 模板含产品/图片字段而 rewrite 调用点不传 → 置空避免 {{}} 字面量残留
        "task_product_json": "",
        "task_products_json": "",
        "task_images_json": "",
        "article_text": str(article_text or ""),
        "geo_general_rules": geo_general_rules,
        "industry_identification_rules": industry_identification_rules,
    })


def build_article_writing_rewrite_with_suggestions_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base=None,
    kb_docs=None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    article_text: str = "",
    suggestions: str = "",
    brand_idx: Optional[int] = None,
) -> str:
    """按优化建议重写文案：输入原文 + 优化建议 + 用户关键信息 + 知识库，输出全新完整文案。

    2026-08-25 第二阶段新增：
      旧 /rewrite 接口的模板与 /suggestions 完全一致（只输出四段建议、不输出全文），
      导致"重新优化"按钮拿到的是建议而非改稿（语义错位）。
      本函数使用新模板 article_writing_rewrite_with_suggestions_prompt.txt，
      明确要求输出已采纳优化建议的完整文案正文。
    """
    tpl = _read_template("article_writing_rewrite_with_suggestions_prompt.txt")
    if not tpl:
        # 兜底：新模板缺失时退回旧 rewrite 模板（仅保证有输出，语义仍偏建议）
        tpl = _read_template("article_writing_rewrite_prompt.txt")
        if not tpl:
            return ""

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    brand_version = ""
    if brand_idx is not None:
        try:
            brand_idx = int(brand_idx)
        except Exception:
            brand_idx = None
        if brand_idx is not None and 0 <= brand_idx < 3:
            brand_version = f"品牌创作第 {brand_idx + 1} 版文案（保持该版本的标题角度与定位，只做建议内优化，不与其他版本趋同）"

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "brand_version": brand_version,
        "article_text": str(article_text or "").strip(),
        "suggestions": str(suggestions or "").strip(),
    })


def build_article_writing_suggestions_rerun_prompt(
    enterprise: dict,
    lexicon: dict,
    kb_base=None,
    kb_docs=None,
    task_tab: str = "",
    task_question_text: str = "",
    task_platforms: str = "",
    task_user_input: str = "",
    task_product_json: str = "",
    task_products_json: str = "",
    task_images_json: str = "",
    text: str = "",
    previous_suggestions: str = "",
    rerun_round: int = 2,
    brand_idx: Optional[int] = None,
) -> str:
    """优化建议 rerun 提示词：原文用 {{text}} 占位符，模板不内嵌长文本。

    三段式结构（用户确认方案）：
      ① 文案优化的原文提示词（本模板全文）
      ② 第一次生成的优化内容（previous_suggestions）
      ③ 重新优化指令（rerun 指令块，含轮次）
    """
    tpl = _read_template("article_writing_suggestions_rerun_prompt.txt")
    if not tpl:
        tpl = _read_template("article_writing_suggestions_prompt.txt")
        if not tpl:
            return ""

    def _safe_json(v):
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)

    # brand 场景：追加版本说明，帮助模型区分第几版文案
    if brand_idx is not None:
        try:
            brand_idx = int(brand_idx)
        except Exception:
            brand_idx = None
        if brand_idx is not None and 0 <= brand_idx < 3:
            previous_suggestions = (
                f"（品牌创作第 {brand_idx + 1} 版文案对应的优化建议）\n"
                + str(previous_suggestions or "").strip()
            )

    return render_prompt(tpl, {
        "task_tab": str(task_tab or ""),
        "task_question_text": str(task_question_text or ""),
        "task_platforms": str(task_platforms or ""),
        "task_user_input": str(task_user_input or ""),
        "kb_base_json": _safe_json(kb_base),
        "kb_docs_json": _safe_json(kb_docs),
        "task_product_json": str(task_product_json or ""),
        "task_products_json": str(task_products_json or ""),
        "task_images_json": str(task_images_json or ""),
        "text": str(text or "").strip(),
        "previous_suggestions": str(previous_suggestions or "").strip(),
        "rerun_round": int(rerun_round or 2),
    })
