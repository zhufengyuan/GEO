"""
知识库公共工具函数

提取自 main.py 中多处重复的 load_kb_section 及企业信息加载逻辑。
"""
import json
from typing import Optional, Dict, Any

from backend.database import query_row


def load_kb_section(user_id: int, section: str) -> Optional[Any]:
    """
    从 knowledge_base_sections 表加载指定 section 的内容。
    如果内容是 JSON 字符串，自动解析为 dict/list；否则返回原始字符串。
    """
    row = query_row(
        "SELECT content FROM knowledge_base_sections WHERE user_id=%s AND section=%s",
        [user_id, section],
    ) or {}
    content = row.get("content")
    if not content:
        return None
    try:
        return json.loads(content)
    except Exception:
        return content


def load_enterprise_info() -> Dict[str, Any]:
    """加载最新的企业基础信息"""
    return query_row("SELECT * FROM enterprise_base_info ORDER BY id DESC LIMIT 1") or {}


def load_lexicon(lexicon_id: int) -> Dict[str, Any]:
    """根据 ID 加载词库，无效 ID 返回空 dict"""
    if not lexicon_id or lexicon_id <= 0:
        return {}
    return query_row("SELECT * FROM lexicons WHERE id=%s", [lexicon_id]) or {}


def load_full_kb(user_id: int, lexicon_id: int = 0) -> Dict[str, Any]:
    """
    一次性加载完整上下文：企业信息 + 词库 + 知识库（基础信息 + 文档）。

    返回:
        {
            "enterprise": dict,
            "lexicon": dict,
            "kb_base": dict | None,
            "kb_docs": dict | None,
        }
    """
    enterprise = load_enterprise_info()
    lexicon = load_lexicon(lexicon_id)
    kb_base = load_kb_section(user_id, "企业基础信息")
    kb_docs_raw = load_kb_section(user_id, "docs")
    kb_positioning = load_kb_section(user_id, "positioning")
    kb_docs = kb_docs_raw if isinstance(kb_docs_raw, dict) else ({} if kb_docs_raw is None else {"content": kb_docs_raw})
    if kb_positioning is not None:
        if not isinstance(kb_docs, dict):
            kb_docs = {"content": kb_docs_raw}
        kb_docs["positioning"] = kb_positioning
    return {
        "enterprise": enterprise,
        "lexicon": lexicon,
        "kb_base": kb_base,
        "kb_docs": kb_docs,
    }


def build_kb_context(kb_base: Optional[Dict], kb_docs: Optional[Dict], enterprise: Dict) -> Dict[str, str]:
    """
    构建统一的 KB 上下文字典，供 prompt_service 的 build_* 函数使用。
    与 main.py 中 ai_execute 端点内的 kb 构建逻辑一致。
    """

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

    return {
        "enterprise_full_name": (kb_base or {}).get("企业全称") or enterprise.get("enterprise_full_name") or "",
        "enterprise_short_name": (kb_base or {}).get("企业简称") or enterprise.get("enterprise_short_name") or "",
        "enterprise_address": (kb_base or {}).get("企业地址") or enterprise.get("enterprise_address") or "",
        "enterprise_contact": (kb_base or {}).get("企业联系方式") or enterprise.get("enterprise_contact") or "",
        "enterprise_website": (kb_base or {}).get("企业官网") or enterprise.get("enterprise_website") or "",
        "main_products": (kb_base or {}).get("主营产品") or enterprise.get("main_products") or "",
        "target_customers": (kb_base or {}).get("目标客户") or enterprise.get("target_customers") or "",
        "sales_region": (kb_base or {}).get("销售区域范围") or enterprise.get("sales_region") or "",
        "sales_channel": (kb_base or {}).get("销售方式或渠道") or enterprise.get("sales_channel") or "",
        "enterprise_advantage": (kb_base or {}).get("企业优势") or enterprise.get("enterprise_advantage") or "",
        "product_advantage": (kb_base or {}).get("产品优势") or enterprise.get("product_advantage") or "",
        "tech_advantage": (kb_base or {}).get("技术优势") or enterprise.get("tech_advantage") or "",
        "company_profile": ((kb_docs or {}).get("company_profile") if isinstance(kb_docs, dict) else "") or "",
        "enterprise_library": ((kb_docs or {}).get("enterprise_library") if isinstance(kb_docs, dict) else "") or "",
        "timeline_text": _timeline_text(kb_docs if isinstance(kb_docs, dict) else {}),
        "extras": json.dumps({"base": kb_base, "docs": kb_docs}, ensure_ascii=False),
    }
