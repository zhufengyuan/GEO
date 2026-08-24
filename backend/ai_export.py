"""
AI 数据导出模块（2026-08-24 新增）

功能：将所有用户输入信息以 JSON 形式落盘到 www/ai-data/，
供 AI 搜索引擎（GPTBot / ClaudeBot / PerplexityBot / Baiduspider 等）直接爬取。

对外 HTTP 路径（nginx location /geo/ -> GEO/www/）：
    http://www.sunfitness123.xyz/geo/ai-data/index.json           # 索引
    http://www.sunfitness123.xyz/geo/ai-data/inputs/all.json      # 全部输入信息聚合（AI 主入口）
    http://www.sunfitness123.xyz/geo/ai-data/inputs/latest_<page>.json   # 每页最新输入
    http://www.sunfitness123.xyz/geo/ai-data/inputs/history/<page>.jsonl # 完整历史（每行一条 JSON）
    http://www.sunfitness123.xyz/geo/llms.txt                     # AI 站点标准入口
    http://www.sunfitness123.xyz/geo/robots.txt                   # 爬虫规则
"""
import json
import os
import time
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
AI_DATA_DIR = _PROJECT_ROOT / "www" / "ai-data"
INPUTS_DIR = AI_DATA_DIR / "inputs"
HISTORY_DIR = INPUTS_DIR / "history"

# all.json 最多保留的输入条数（防止无限膨胀）
MAX_ALL_ENTRIES = 300

# 页面/分区名 -> 文件名 slug 映射（未命中则原文，中文文件名 Linux 下安全）
_PAGE_SLUGS = {
    "knowledge-base": "knowledge-base",
    "question-bank": "question-bank",
    "config": "config",
    "real-name": "real-name",
    "contact": "contact",
    "企业基础信息": "enterprise-base",
    "products": "products",
    "docs": "docs",
    "website": "website",
    "files": "files",
    "cases": "cases",
    "consumption": "consumption",
    "verify": "verify",
    "monitor": "monitor",
}


def _now_iso() -> str:
    """当前时间 ISO8601（服务器本地时间）"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _slug(page: str) -> str:
    return _PAGE_SLUGS.get(str(page), str(page))


def _ensure_dirs() -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    INPUTS_DIR.mkdir(parents=True, exist_ok=True)
    AI_DATA_DIR.mkdir(parents=True, exist_ok=True)
    # 服务器 umask 可能是 027，需确保 nginx(www-data) 可读目录
    for d in (AI_DATA_DIR, INPUTS_DIR, HISTORY_DIR):
        try:
            os.chmod(d, 0o755)
        except Exception:
            pass


def _chmod_public(path: Path) -> None:
    """确保文件 644（nginx 可读）"""
    try:
        os.chmod(path, 0o644)
    except Exception:
        pass


def _sanitize(v):
    """递归清理 NaN / Infinity 等非标准 JSON 值"""
    if v is None or isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, float):
        if v != v or v in (float("inf"), float("-inf")):
            return None
        return v
    if isinstance(v, dict):
        return {str(k): _sanitize(x) for k, x in v.items()}
    if isinstance(v, (list, tuple, set)):
        return [_sanitize(x) for x in v]
    try:
        f = float(v)
        if f != f or f in (float("inf"), float("-inf")):
            return None
        return f
    except Exception:
        return str(v)


def _read_json(path: Path, default=None):
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"[ai-export] 读取 {path.name} 失败：{e}")
    return default if default is not None else {}


def _write_json(path: Path, obj) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(_sanitize(obj), f, ensure_ascii=False, indent=2)
        _chmod_public(path)
        return True
    except Exception as e:
        print(f"[ai-export] 写入 {path.name} 失败：{e}")
        return False


def export_input(kind: str, page: str, payload, meta: dict = None) -> dict:
    """
    导出一条用户输入信息为 JSON。

    :param kind: 数据类型（ui / kb / lexicon / article ...）
    :param page: 页面或分区名（如 knowledge-base / 企业基础信息 / docs）
    :param payload: 输入数据（dict / list / str）
    :param meta: 附加元信息（user、action 等）
    :return: {"ok": bool, "files": [...]}
    """
    try:
        _ensure_dirs()
        page = str(page or "").strip()
        if not page:
            page = "unknown"
        slug = _slug(page)
        now = _now_iso()
        record = {
            "kind": str(kind or "ui"),
            "page": page,
            "saved_at": now,
            "payload": _sanitize(payload),
        }
        if isinstance(meta, dict) and meta:
            for k, v in meta.items():
                record.setdefault(str(k), _sanitize(v))

        # 1) 每页最新数据
        latest_path = INPUTS_DIR / f"latest_{slug}.json"
        _write_json(latest_path, {"page": page, "kind": kind, "saved_at": now, "payload": _sanitize(payload)})

        # 2) 完整历史（jsonl 追加，每行一条）
        hist_path = HISTORY_DIR / f"{slug}.jsonl"
        try:
            with open(hist_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
            _chmod_public(hist_path)
        except Exception as e:
            print(f"[ai-export] 追加历史失败：{e}")

        # 3) 聚合 all.json（同 page 覆盖旧记录，最新在前）
        all_obj = _read_json(INPUTS_DIR / "all.json", {"updated_at": "", "entries": []})
        entries = all_obj.get("entries") if isinstance(all_obj, dict) else []
        if not isinstance(entries, list):
            entries = []
        entries = [e for e in entries if not (isinstance(e, dict) and e.get("page") == page)]
        entries.insert(0, record)
        entries = entries[:MAX_ALL_ENTRIES]
        _write_json(INPUTS_DIR / "all.json", {
            "site": "GEO优化管理平台 - 用户输入信息（AI可爬取数据）",
            "description": "该 JSON 汇总了平台用户在 GEO 优化管理中录入的全部信息（企业基础信息、知识库、产品、文档、问题词库、页面配置等），供 AI 搜索引擎与大模型爬取引用。",
            "updated_at": now,
            "total_pages": len({e.get("page") for e in entries}),
            "entries": entries,
        })

        # 4) 重建索引
        _rebuild_index()
        return {"ok": True, "files": [latest_path.name, hist_path.name, "all.json"]}
    except Exception as e:
        print(f"[ai-export] 导出失败：{e}")
        return {"ok": False, "error": str(e)}


def _rebuild_index() -> None:
    """重建 index.json：列出 ai-data 下所有可爬取文件"""
    try:
        _ensure_dirs()
        now = _now_iso()
        files = []
        # latest_*.json
        for p in sorted(INPUTS_DIR.glob("latest_*.json")):
            files.append({
                "path": f"inputs/{p.name}",
                "url": "/geo/ai-data/inputs/" + quote(p.name),
                "type": "latest",
                "name": p.name.replace("latest_", "").replace(".json", ""),
            })
        # all.json
        if (INPUTS_DIR / "all.json").exists():
            files.insert(0, {"path": "inputs/all.json", "url": "/geo/ai-data/inputs/all.json", "type": "all", "name": "全部输入信息聚合"})
        # history/*.jsonl
        for p in sorted(HISTORY_DIR.glob("*.jsonl")):
            files.append({
                "path": f"inputs/history/{p.name}",
                "url": "/geo/ai-data/inputs/history/" + quote(p.name),
                "type": "history",
                "name": p.name.replace(".jsonl", ""),
            })
        _write_json(AI_DATA_DIR / "index.json", {
            "site": "GEO优化管理平台",
            "description": "AI 数据索引。llms.txt 为站点标准 AI 入口；inputs/all.json 为全部用户输入信息的聚合 JSON，AI 可直接爬取引用。",
            "updated_at": now,
            "llms_txt": "/geo/llms.txt",
            "robots_txt": "/geo/robots.txt",
            "files": files,
        })
    except Exception as e:
        print(f"[ai-export] 重建索引失败：{e}")


def init_ai_site() -> None:
    """初始化 AI 爬取入口（llms.txt / robots.txt），幂等"""
    try:
        www = _PROJECT_ROOT / "www"
        www.mkdir(parents=True, exist_ok=True)

        # llms.txt —— AI 站点标准入口（llmstxt.org 规范）
        llms = (
            "# GEO优化管理平台\n\n"
            "> 面向企业提供 GEO（生成式引擎优化）管理：企业知识库、产品资料、问题词库、文案生成、竞品分析、诊断报告等。\n"
            "> 本文件为 AI 爬取入口，结构化数据见下方 ai-data 目录。\n\n"
            "## 结构化数据（JSON，AI 可直接爬取）\n\n"
            "- [全部输入信息聚合](https://www.sunfitness123.xyz/geo/ai-data/inputs/all.json)：平台用户录入的全部信息（企业基础信息、知识库、产品、文档、问题词库、页面配置等）\n"
            "- [数据索引](https://www.sunfitness123.xyz/geo/ai-data/index.json)：ai-data 目录文件清单\n"
            "- [最新录入-知识库](https://www.sunfitness123.xyz/geo/ai-data/inputs/latest_enterprise-base.json)：企业基础信息最新录入\n"
            "- [最新录入-问题词库](https://www.sunfitness123.xyz/geo/ai-data/inputs/latest_question-bank.json)：问题词库最新录入\n\n"
            "## 数据说明\n\n"
            "- 每次保存/修改会实时更新 latest_*.json，并追加到 history/*.jsonl 历史\n"
            "- all.json 为全部页面最新数据的聚合，是 AI 引用的首选\n"
            "- 所有数据均为用户主动录入的真实信息，无虚构内容\n"
        )
        (www / "llms.txt").write_text(llms, encoding="utf-8")
        _chmod_public(www / "llms.txt")

        # robots.txt —— 允许主流 AI 爬虫
        robots = (
            "User-agent: GPTBot\n"
            "Allow: /geo/ai-data/\n"
            "Allow: /geo/llms.txt\n"
            "Allow: /geo/ai-data/inputs/all.json\n"
            "\n"
            "User-agent: ClaudeBot\n"
            "Allow: /geo/ai-data/\n"
            "Allow: /geo/llms.txt\n"
            "\n"
            "User-agent: PerplexityBot\n"
            "Allow: /geo/ai-data/\n"
            "Allow: /geo/llms.txt\n"
            "\n"
            "User-agent: Google-Extended\n"
            "Allow: /geo/ai-data/\n"
            "Allow: /geo/llms.txt\n"
            "\n"
            "User-agent: Baiduspider\n"
            "Allow: /geo/ai-data/\n"
            "Allow: /geo/llms.txt\n"
            "\n"
            "User-agent: Bytespider\n"
            "Allow: /geo/ai-data/\n"
            "Allow: /geo/llms.txt\n"
            "\n"
            "User-agent: CCBot\n"
            "Allow: /geo/ai-data/\n"
            "\n"
            "User-agent: *\n"
            "Allow: /\n"
        )
        (www / "robots.txt").write_text(robots, encoding="utf-8")
        _chmod_public(www / "robots.txt")
        _rebuild_index()
        print("[ai-export] AI 爬取入口初始化完成（llms.txt / robots.txt / ai-data）")
    except Exception as e:
        print(f"[ai-export] 初始化 AI 站点失败：{e}")


def get_all_inputs() -> dict:
    """读取 all.json（供后端 API 返回）"""
    obj = _read_json(INPUTS_DIR / "all.json", {"entries": []})
    if not isinstance(obj, dict):
        obj = {"entries": []}
    return obj


def rebuild_from_db(db_query) -> dict:
    """
    从数据库一次性重建 all.json（全量导出）。

    :param db_query: 函数 (sql, params) -> list[dict]，返回查询结果
    """
    try:
        _ensure_dirs()
        now = _now_iso()
        entries = []

        # 知识库各分区
        try:
            rows = db_query(
                "SELECT section, content, updated_at FROM knowledge_base_sections ORDER BY updated_at DESC", []
            )
            for r in rows or []:
                sec = str(r.get("section") or "").strip()
                try:
                    payload = json.loads(r.get("content") or "{}")
                except Exception:
                    payload = r.get("content") or ""
                if not sec:
                    continue
                entries.append({
                    "kind": "kb",
                    "page": sec,
                    "saved_at": str(r.get("updated_at") or "")[:19],
                    "payload": _sanitize(payload),
                })
        except Exception as e:
            print(f"[ai-export] 读取知识库失败：{e}")

        # UI 保存（每页最新一条）
        try:
            rows = db_query(
                "SELECT t1.page, t1.payload_json, t1.created_at FROM geo_ui_saves t1 "
                "JOIN (SELECT page, MAX(id) AS mid FROM geo_ui_saves GROUP BY page) t2 ON t1.id = t2.mid "
                "ORDER BY t1.created_at DESC", []
            )
            for r in rows or []:
                page = str(r.get("page") or "unknown").strip()
                try:
                    payload = json.loads(r.get("payload_json") or "{}")
                except Exception:
                    payload = r.get("payload_json") or ""
                entries.append({
                    "kind": "ui",
                    "page": page,
                    "saved_at": str(r.get("created_at") or "")[:19],
                    "payload": _sanitize(payload),
                })
        except Exception as e:
            print(f"[ai-export] 读取 geo_ui_saves 失败：{e}")

        # 问题词库（最近 50 条）
        try:
            rows = db_query(
                "SELECT id, name, company, industry_keyword, decision_stage, words, question_keyword, created_at "
                "FROM lexicons ORDER BY id DESC LIMIT 50", []
            )
            for r in rows or []:
                try:
                    words = json.loads(r.get("words") or "{}")
                except Exception:
                    words = r.get("words") or {}
                entries.append({
                    "kind": "lexicon",
                    "page": "question-bank",
                    "saved_at": str(r.get("created_at") or "")[:19],
                    "payload": {
                        "id": r.get("id"),
                        "name": r.get("name"),
                        "company": r.get("company"),
                        "industry_keyword": r.get("industry_keyword"),
                        "decision_stage": r.get("decision_stage"),
                        "question_keyword": r.get("question_keyword"),
                        "words": words,
                    },
                })
        except Exception as e:
            print(f"[ai-export] 读取问题词库失败：{e}")

        # 去重（同 kind+page 保留最新）
        seen = {}
        for e in entries:
            key = (e["kind"], e["page"])
            if key not in seen:
                seen[key] = e
        entries = list(seen.values())[:MAX_ALL_ENTRIES]

        _write_json(INPUTS_DIR / "all.json", {
            "site": "GEO优化管理平台 - 用户输入信息（AI可爬取数据）",
            "description": "从数据库全量导出的用户录入信息（知识库分区、页面配置、问题词库），供 AI 搜索引擎与大模型爬取引用。",
            "updated_at": now,
            "total_pages": len(entries),
            "entries": entries,
        })
        # 同步每页 latest 文件
        for e in entries:
            slug = _slug(e["page"])
            _write_json(INPUTS_DIR / f"latest_{slug}.json", {
                "page": e["page"],
                "kind": e["kind"],
                "saved_at": e["saved_at"],
                "payload": e["payload"],
            })
        _rebuild_index()
        return {"ok": True, "total": len(entries), "updated_at": now}
    except Exception as e:
        print(f"[ai-export] 全量重建失败：{e}")
        return {"ok": False, "error": str(e)}


if __name__ == "__main__":
    # 手动测试：python -m backend.ai_export
    init_ai_site()
    export_input("ui", "test-page", {"hello": "world", "num": 1.5})
    print(json.dumps(get_all_inputs(), ensure_ascii=False, indent=2)[:500])
