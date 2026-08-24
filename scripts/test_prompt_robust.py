#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""prompt 调用链全量健壮性测试（在服务器上运行）"""
import sys, re
sys.path.insert(0, "/srv/shiny-server/GEO")
from backend.services import prompt_service as ps

fails = []
warns = []

# ---------- 1) 25 个行业文件全部可读且非空 ----------
lst = ps.list_industry_prompts()
print("[1] industry files:", len(lst))
if len(lst) != 25:
    fails.append(f"行业文件数 {len(lst)} != 25")
for it in lst:
    try:
        txt = ps.get_industry_prompt(it["industry"])
        if not txt or len(txt.strip()) < 100:
            fails.append(f"行业文件过短/为空: {it['file']}")
    except Exception as ex:
        fails.append(f"读取 {it['file']} 异常: {ex!r}")

# ---------- 2) resolve 边界输入（None/空/空白/路径穿越/乱码/超长/大小写） ----------
edge_cases = [
    None, "", "   ", "../../etc/passwd", "未知行业xyz", "制造业", "制造业 ",
    "MANUFACTURING", "餐饮行业", "餐饮行业.txt", "软件", "a" * 500,
    "制造业/房地产", "🤖垃圾输入 ../../../",
]
print("[2] resolve edge cases:")
for e_ in edge_cases:
    try:
        r = ps.resolve_industry_file(e_)
        p = ps._INDUSTRY_PROMPT_DIR / r
        ok = p.exists()
        print(f"    {repr(e_)[:40]:<42} -> {r:<24} exists={ok}")
        if not ok:
            fails.append(f"resolve {repr(e_)} -> {r}，但文件不存在（会触发兜底）")
    except Exception as ex:
        fails.append(f"resolve {repr(e_)} 抛异常: {ex!r}")

# get_industry_prompt 垃圾输入不抛异常且返回非空（兜底 geo_general_rules）
try:
    t = ps.get_industry_prompt("垃圾输入🤖../../../etc")
    if not t or len(t.strip()) < 50:
        fails.append("get_industry_prompt 垃圾输入返回过短")
    else:
        print(f"[2b] get_industry_prompt(垃圾输入) -> 兜底 {len(t)} 字符 OK")
except Exception as ex:
    fails.append(f"get_industry_prompt 垃圾输入抛异常: {ex!r}")

# ---------- 3) 全部 build 函数最小/None 参数调用 + 占位符残留检测 ----------
kb = {}
tests = {
    "question_words(None,None)": lambda: ps.build_question_words_prompt(None, None),
    "question_words(empty,words={})": lambda: ps.build_question_words_prompt("", "", words={}),
    "question_words(完整)": lambda: ps.build_question_words_prompt(
        "测试公司", "智能制造", main_keyword="工业机器人", customer_type="采购负责人",
        decision_stage="对比筛选", words={"region": "广州", "price": "报价"}),
    "kb_profile({})": lambda: ps.build_kb_profile_prompt({}),
    "kb_library({})": lambda: ps.build_kb_library_prompt(kb),
    "kb_timeline({})": lambda: ps.build_kb_timeline_prompt(kb),
    "kb_positioning(None,None)": lambda: ps.build_kb_positioning_prompt(kb, mode=None, current_text=None),
    "data_diagnosis(None)": lambda: ps.build_data_diagnosis_prompt(kb, None),
    "website_diagnosis(None)": lambda: ps.build_website_diagnosis_prompt(kb, None),
    "competitor_discovery(None)": lambda: ps.build_competitor_discovery_prompt(kb, None),
    "competitor_analysis(None,None,None)": lambda: ps.build_competitor_analysis_prompt(kb, None, None, None),
    "competitor_analysis(带爬取)": lambda: ps.build_competitor_analysis_prompt(
        kb, "竞品A,竞品B", "ctx", {"竞品A": {"url": "http://x", "title": "t", "text": "内容", "ok": True},
                                   "竞品B": {"error": "超时", "ok": False}}),
    "diagnosis_report(None,None)": lambda: ps.build_diagnosis_report_prompt(kb, None, None),
    "optimization_plan({})": lambda: ps.build_optimization_plan_prompt(kb),
    "optimization_schedule({})": lambda: ps.build_optimization_schedule_prompt(kb),
    "acceptance_score({})": lambda: ps.build_acceptance_score_prompt(kb),
    "article(product,{})": lambda: ps.build_article_prompt({}, {}, {"tab": "product"}),
    "article(brand,{})": lambda: ps.build_article_prompt({}, {}, {"tab": "brand"}),
    "article(activity,{})": lambda: ps.build_article_prompt({}, {}, {"tab": "activity"}),
    "article(未知tab)": lambda: ps.build_article_prompt({}, {}, {"tab": "whatever"}),
    "expand_words(None)": lambda: ps.build_expand_words_prompt(None),
    "title(None,None)": lambda: ps.build_title_prompt({}, {}, None, None),
    "activity_desc(None,None)": lambda: ps.build_activity_desc_prompt({}, {}, None, None),
    "chat({},{})": lambda: ps.build_article_product_chat_prompt({}, {}),
    "optimize(user_input=None)": lambda: ps.build_article_product_optimize_prompt({}, {}, user_input=None),
    "init_chat({},{})": lambda: ps.build_article_writing_init_chat_prompt({}, {}),
    "suggestions({},{})": lambda: ps.build_article_writing_suggestions_prompt({}, {}),
    "rewrite({},{})": lambda: ps.build_article_writing_rewrite_prompt({}, {}),
    "inject_industry_rules('',None)": lambda: ps.inject_industry_rules("", None),
    "inject_industry_rules(完整)": lambda: ps.inject_industry_rules("正文", "餐饮"),
}
# 本次替换的 8 个模板对应函数（残留即 bug）；其余为旧模板（残留仅警告，可能是历史遗留）
STRICT = {"question_words", "kb_profile", "data_diagnosis", "website_diagnosis",
          "competitor_analysis", "diagnosis_report", "article(product", "article(brand"}
ph = re.compile(r"\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}")
print("[3] build 函数最小参数调用:")
for name, fn in tests.items():
    try:
        out = fn() or ""
        residue = sorted(set(ph.findall(out)))
        tag = "OK"
        if residue:
            is_strict = any(name.startswith(s) for s in STRICT)
            (fails if is_strict else warns).append(f"{name}: 占位符残留 {residue}")
            tag = ("RESIDUE-FAIL " if is_strict else "RESIDUE-WARN ") + str(residue)
        print(f"    {name:<38} len={len(out):<6} {tag}")
    except Exception as ex:
        fails.append(f"{name} 抛异常: {ex!r}")
        print(f"    {name:<38} EXCEPTION {ex!r}")

# ---------- 4) GEO_SEPARATOR 完整性 ----------
print("[4] GEO_SEPARATOR 检查:")
for f in ["article_product_prompt.txt", "article_brand_prompt.txt", "article_prompt.txt",
          "article_activity_prompt.txt"]:
    txt = ps._read_template(f)
    if txt:
        print(f"    {f:<32} contains={'=====GEO_SEPARATOR=====' in txt}")

print("\n========== 结果 ==========")
print("FAIL:", len(fails))
for f in fails: print("  [FAIL]", f)
print("WARN:", len(warns))
for w in warns: print("  [WARN]", w)
print("ALL_PASS" if not fails else "HAS_FAILURES")
