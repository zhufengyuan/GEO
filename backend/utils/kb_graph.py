import math
import re
from typing import Any, Dict, List, Optional, Tuple


SECTION_SPECS: List[Dict[str, Any]] = [
    {
        "key": "基础信息",
        "importance": 10,
        "relation": "HAS_PROFILE",
        "fields": ["企业全称", "企业简称", "企业地址", "成立时间", "所在行业", "企业官网"],
    },
    {
        "key": "核心业务",
        "importance": 9,
        "relation": "HAS_BUSINESS",
        "fields": ["主营产品", "细分赛道", "行业地位"],
    },
    {
        "key": "客户与市场",
        "importance": 8,
        "relation": "SERVES_MARKET",
        "fields": ["目标客户", "销售区域范围", "服务行业"],
    },
    {
        "key": "核心优势",
        "importance": 9,
        "relation": "HAS_ADVANTAGE",
        "fields": ["企业优势"],
    },
    {
        "key": "产能与规模",
        "importance": 7,
        "relation": "HAS_CAPACITY",
        "fields": ["厂房或店面面积", "生产设备", "产能产量", "员工数量", "分支机构"],
    },
    {
        "key": "企业团队实力",
        "importance": 7,
        "relation": "HAS_TEAM",
        "fields": ["核心人员背景", "团队经验", "技术能力", "服务经验"],
    },
    {
        "key": "品牌理念",
        "importance": 6,
        "relation": "HAS_BRAND",
        "fields": ["企业宗旨", "经营理念", "核心价值观", "企业愿景"],
    },
    {
        "key": "品质与服务",
        "importance": 7,
        "relation": "HAS_QUALITY",
        "fields": ["生产标准", "服务流程", "品控体系", "售后体系", "交付保障"],
    },
    {
        "key": "差异化亮点",
        "importance": 8,
        "relation": "HAS_DIFFERENTIATOR",
        "fields": ["差异化亮点"],
    },
    {
        "key": "其他补充",
        "importance": 3,
        "relation": "HAS_OTHER",
        "fields": ["其他"],
    },
]


def _clean_text(value: Any) -> str:
    text = str(value or "").replace("\r", "\n").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _is_empty(value: Any) -> bool:
    return _clean_text(value) == ""


def _clip(text: str, limit: int = 72) -> str:
    raw = _clean_text(text)
    if len(raw) <= limit:
        return raw
    return raw[: limit - 1].rstrip() + "…"


def _slug(text: str) -> str:
    raw = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "_", str(text or "").strip())
    return raw.strip("_").lower() or "node"


def _split_items(value: Any, limit: int = 4) -> List[str]:
    text = _clean_text(value)
    if not text:
        return []
    parts = re.split(r"[；;，,\n、/|]+", text)
    items = []
    for part in parts:
        item = part.strip()
        if item:
            items.append(item)
        if len(items) >= limit:
            break
    return items


def _node_size(node_type: str, importance: int = 5) -> int:
    if node_type == "company":
        return 46
    if node_type == "section":
        return 30 + max(0, min(importance, 10) - 3) * 2
    return 18 + max(0, min(importance, 10) - 3)


def _node_color(node_type: str, importance: int = 5) -> str:
    if node_type == "company":
        return "#14b8a6"
    if node_type == "section":
        return "#34d399" if importance >= 8 else "#5eead4"
    return "#d1fae5" if importance >= 7 else "#ecfdf5"


def _add_node(nodes: List[Dict[str, Any]], node_index: Dict[str, Dict[str, Any]], *, node_id: str, label: str,
              labels: List[str], node_type: str, importance: int = 5, properties: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    existing = node_index.get(node_id)
    if existing:
        return existing
    node = {
        "id": node_id,
        "label": label,
        "labels": labels,
        "type": node_type,
        "importance": importance,
        "size": _node_size(node_type, importance),
        "color": _node_color(node_type, importance),
        "properties": properties or {},
    }
    nodes.append(node)
    node_index[node_id] = node
    return node


def _add_rel(relationships: List[Dict[str, Any]], rel_index: set, *, start: str, end: str, rel_type: str,
             properties: Optional[Dict[str, Any]] = None) -> None:
    key = (start, end, rel_type)
    if key in rel_index:
        return
    rel_index.add(key)
    relationships.append(
        {
            "id": f"rel_{len(relationships) + 1}",
            "startNode": start,
            "endNode": end,
            "type": rel_type,
            "properties": properties or {},
        }
    )


def build_knowledge_graph(
    kb_base: Optional[Dict[str, Any]] = None,
    kb_docs: Optional[Dict[str, Any]] = None,
    kb_positioning: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    base = kb_base if isinstance(kb_base, dict) else {}
    docs = kb_docs if isinstance(kb_docs, dict) else {}
    positioning = kb_positioning if isinstance(kb_positioning, dict) else {}

    nodes: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    node_index: Dict[str, Dict[str, Any]] = {}
    rel_index = set()
    field_nodes: Dict[str, str] = {}
    section_nodes: Dict[str, str] = {}

    company_name = _clean_text(base.get("企业全称") or base.get("企业简称") or "企业知识图谱")
    company_id = "company_main"
    _add_node(
        nodes,
        node_index,
        node_id=company_id,
        label=company_name,
        labels=["Enterprise"],
        node_type="company",
        importance=10,
        properties={
            "name": company_name,
            "full_name": _clean_text(base.get("企业全称")),
            "short_name": _clean_text(base.get("企业简称")),
        },
    )

    filled_fields = 0
    section_order: List[str] = []

    for spec in SECTION_SPECS:
        entries: List[Tuple[str, str]] = []
        for key in spec["fields"]:
            value = _clean_text(base.get(key))
            if value:
                entries.append((key, value))
        if not entries:
            continue
        section_id = f"section_{_slug(spec['key'])}"
        section_nodes[spec["key"]] = section_id
        section_order.append(spec["key"])
        _add_node(
            nodes,
            node_index,
            node_id=section_id,
            label=spec["key"],
            labels=["Section"],
            node_type="section",
            importance=spec["importance"],
            properties={"name": spec["key"], "filled_count": len(entries)},
        )
        _add_rel(
            relationships,
            rel_index,
            start=company_id,
            end=section_id,
            rel_type=spec["relation"],
            properties={"importance": spec["importance"]},
        )
        for key, value in entries:
            filled_fields += 1
            field_id = f"field_{_slug(key)}"
            field_nodes[key] = field_id
            _add_node(
                nodes,
                node_index,
                node_id=field_id,
                label=key,
                labels=["Field"],
                node_type="field",
                importance=spec["importance"],
                properties={"name": key, "value": value, "section": spec["key"]},
            )
            _add_rel(
                relationships,
                rel_index,
                start=section_id,
                end=field_id,
                rel_type="INCLUDES",
                properties={"value": _clip(value, 80)},
            )

    docs_section_entries: List[Tuple[str, str, str]] = []
    company_profile = _clean_text(docs.get("company_profile"))
    if company_profile:
        docs_section_entries.append(("企业简介", company_profile, "DESCRIBES"))
    enterprise_library = _clean_text(docs.get("enterprise_library"))
    if enterprise_library:
        docs_section_entries.append(("企业介绍", enterprise_library, "EXPANDS"))
    main_positioning = _clean_text(positioning.get("main_positioning") or (docs.get("positioning") or {}).get("main_positioning"))
    if main_positioning:
        docs_section_entries.append(("主定位", main_positioning, "POSITIONS"))
    sub_positioning = _clean_text(positioning.get("sub_positioning") or (docs.get("positioning") or {}).get("sub_positioning"))
    if sub_positioning:
        docs_section_entries.append(("子定位", sub_positioning, "REFINES"))

    timeline_rows = docs.get("timeline_rows") if isinstance(docs.get("timeline_rows"), list) else []
    timeline_rows = [row for row in timeline_rows if isinstance(row, dict)]

    if docs_section_entries or timeline_rows:
        section_id = "section_knowledge_docs"
        section_nodes["企业文档"] = section_id
        section_order.append("企业文档")
        _add_node(
            nodes,
            node_index,
            node_id=section_id,
            label="企业文档",
            labels=["Section"],
            node_type="section",
            importance=6,
            properties={"name": "企业文档"},
        )
        _add_rel(relationships, rel_index, start=company_id, end=section_id, rel_type="HAS_DOCUMENT", properties={"importance": 6})
        for idx, (name, value, rel_type) in enumerate(docs_section_entries, start=1):
            field_id = f"doc_{idx}_{_slug(name)}"
            field_nodes[name] = field_id
            _add_node(
                nodes,
                node_index,
                node_id=field_id,
                label=name,
                labels=["Document"],
                node_type="field",
                importance=6,
                properties={"name": name, "value": value, "section": "企业文档"},
            )
            _add_rel(relationships, rel_index, start=section_id, end=field_id, rel_type=rel_type, properties={"value": _clip(value, 80)})
        for idx, row in enumerate(timeline_rows[:6], start=1):
            event = _clean_text(row.get("event"))
            when = _clean_text(row.get("time"))
            if not event and not when:
                continue
            node_id = f"timeline_{idx}"
            label = when or f"里程碑{idx}"
            _add_node(
                nodes,
                node_index,
                node_id=node_id,
                label=label,
                labels=["Milestone"],
                node_type="field",
                importance=5,
                properties={"time": when, "event": event, "section": "企业文档"},
            )
            _add_rel(relationships, rel_index, start=section_id, end=node_id, rel_type="MILESTONE", properties={"event": _clip(event, 72)})

    def link(a: str, b: str, rel_type: str, desc: str = ""):
        start = field_nodes.get(a)
        end = field_nodes.get(b)
        if start and end:
            _add_rel(relationships, rel_index, start=start, end=end, rel_type=rel_type, properties={"reason": desc})

    link("所在行业", "细分赛道", "SEGMENTS", "行业决定细分赛道")
    link("主营产品", "目标客户", "SERVES", "业务对应目标客群")
    link("主营产品", "服务行业", "APPLIES_TO", "产品或服务对应服务行业")
    link("企业优势", "差异化亮点", "DIFFERENTIATES", "优势沉淀为差异化亮点")
    link("技术能力", "产能产量", "ENABLES", "技术能力支撑交付能力")
    link("生产设备", "产能产量", "ENABLES", "设备条件影响产能产量")
    link("核心人员背景", "团队经验", "SUPPORTS", "核心成员背景支撑团队经验")
    link("团队经验", "服务经验", "SUPPORTS", "团队经验转化为服务经验")
    link("生产标准", "品控体系", "ENSURES", "标准落地到品控体系")
    link("品控体系", "交付保障", "ENSURES", "品控提升交付保障")
    link("售后体系", "目标客户", "BUILDS_TRUST", "售后体系增强客户信任")
    link("企业宗旨", "核心价值观", "GUIDES", "宗旨指引价值观")
    link("经营理念", "企业愿景", "GUIDES", "理念延展为发展愿景")
    link("主定位", "子定位", "REFINES", "子定位细化主定位")
    link("企业简介", "企业介绍", "EXPANDS", "企业介绍展开企业简介")

    summary_lines = []
    if base.get("主营产品"):
        summary_lines.append(f"核心业务聚焦于{_clip(str(base.get('主营产品')), 28)}。")
    if base.get("目标客户"):
        summary_lines.append(f"主要服务客群为{_clip(str(base.get('目标客户')), 24)}。")
    if base.get("企业优势"):
        summary_lines.append("核心优势已形成独立优势节点，可与差异化亮点建立承接关系。")
    if base.get("生产设备") or base.get("产能产量"):
        summary_lines.append("产能与设备信息可用于构建交付能力链路。")
    if not summary_lines:
        summary_lines.append("当前可用信息较少，图谱仅展示已填写的关键节点。")

    completeness = 0
    total_fields = sum(len(spec["fields"]) for spec in SECTION_SPECS)
    if total_fields:
        completeness = int(math.floor((filled_fields / total_fields) * 100))

    return {
        "graph": {
            "nodes": nodes,
            "relationships": relationships,
        },
        "meta": {
            "company_name": company_name,
            "filled_fields": filled_fields,
            "section_count": len(section_order),
            "node_count": len(nodes),
            "relationship_count": len(relationships),
            "completeness": completeness,
            "summary_lines": summary_lines,
        },
    }
