"""
工作台数据统计服务
计算各 LLM 的引用次数、收录数、发布统计等，供数据看板展示。
"""
import time
from typing import Dict, List, Any, Optional
from backend.database import query, query_row

# 8 个 AI 平台（匹配前端 data-llm-key）
AI_PLATFORMS = [{'model': 'doubao', 'model_name': '豆包'}, {'model': 'qwen', 'model_name': '千问'}, {'model': 'yuanbao', 'model_name': '元宝'}, {'model': 'deepseek', 'model_name': 'DeepSeek'}, {'model': 'wenxin', 'model_name': '文心'}, {'model': 'nami360', 'model_name': '纳米360'}, {'model': 'kimi', 'model_name': 'KIMI'}, {'model': 'zhipu', 'model_name': '智谱'}]

# 发布平台 code -> 前端显示名
PLATFORM_NAME_MAP = {'sohu': '搜狐', 'wangyi': '网易', 'baijiahao': '百度号', 'toutiao': '头条号', 'xiaohongshu': '小红书', 'wechat': '公众号', 'zhihu': '知乎', 'csdn': 'CSDN', 'qiye': '企业号', 'bilibili': '哔哩', 'douyin': '抖音'}


def get_dashboard_stats(user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    获取工作台综合统计数据。

    Returns:
        {
            "llm_stats": [
                {"model": "doubao", "citations": 23, "indexed": 18, "articles": 45},
                ...
            ],
            "total_articles": 250,
            "total_indexed": 180,
            "total_cited": 95,
            "publish_by_platform": {"微信公众号": 50, "知乎": 35, ...},
            "trend_7d": [...],
            "trend_30d": [...],
            "ts": 1234567890
        }
    """
    ts = time.time() * 1000
    result = {
        "llm_stats": [],
        "total_articles": 0,
        "total_indexed": 0,
        "total_cited": 0,
        "publish_by_platform": {},
        "trend_7d": [],
        "trend_30d": [],
        "ts": ts,
    }

    try:
        # ── 文章总数 ──
        total_row = query_row("SELECT COUNT(*) as cnt FROM articles")
        if total_row:
            result["total_articles"] = int(total_row.get("cnt", 0))

        # ── 各 LLM 统计（如果有相关表） ──
        # 尝试从 diagnosis_files 目录中统计（文件系统方式）
        # 如果有专门的 stats 表则从这里查，否则从 publish_records 聚合

        # 从 publish_records 按平台统计
        try:
            platform_rows = query(
                "SELECT platform_code, COUNT(*) as cnt FROM publish_records "
                "WHERE platform_code IS NOT NULL AND platform_code != '' "
                "GROUP BY platform_code ORDER BY cnt DESC"
            )
            for row in platform_rows:
                code = str(row.get("platform_code", "")).strip()
                cnt = int(row.get("cnt", 0))
                if code and cnt > 0:
                    display_name = PLATFORM_NAME_MAP.get(code, code)
                    result["publish_by_platform"][display_name] = cnt
        except Exception:
            pass

        # ── 趋势数据（近7天 / 近30天文章数） ──
        try:
            trend_7d = query(
                "SELECT DATE(created_at) as date, COUNT(*) as cnt "
                "FROM articles "
                "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) "
                "GROUP BY DATE(created_at) ORDER BY date"
            )
            result["trend_7d"] = [
                {"date": str(r["date"]), "articles": int(r["cnt"])}
                for r in trend_7d
            ]
        except Exception:
            result["trend_7d"] = []

        try:
            trend_30d = query(
                "SELECT DATE(created_at) as date, COUNT(*) as cnt "
                "FROM articles "
                "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) "
                "GROUP BY DATE(created_at) ORDER BY date"
            )
            result["trend_30d"] = [
                {"date": str(r["date"]), "articles": int(r["cnt"])}
                for r in trend_30d
            ]
        except Exception:
            result["trend_30d"] = []

        # ── 各 LLM 统计（8 个 AI 平台，匹配前端 data-llm-key）──
        # indexed / citations 目前无数据源（monitor_tasks 表待填充）
        result["llm_stats"] = [
            {
                "model": p["model"],
                "model_name": p["model_name"],
                "articles": result["total_articles"],
                "indexed": 0,
                "citations": 0,
            }
            for p in AI_PLATFORMS
        ]


    except Exception as e:
        print(f"[DashboardStats] Error: {e}")
        # 返回空结构而非报错

    return result


def get_dashboard_quick_stats(user_id: Optional[int] = None) -> Dict[str, Any]:
    """获取工作台快速概览（轻量版）"""
    ts = time.time() * 1000
    result = {
        "total_articles": 0,
        "total_published": 0,
        "platforms": 0,
        "llm_models": 0,
        "ts": ts,
    }

    try:
        r1 = query_row("SELECT COUNT(*) as cnt FROM articles")
        if r1:
            result["total_articles"] = int(r1.get("cnt", 0))

        r2 = query_row("SELECT COUNT(*) as cnt FROM publish_records")
        if r2:
            result["total_published"] = int(r2.get("cnt", 0))

        r3 = query_row(
            "SELECT COUNT(DISTINCT platform_code) as cnt FROM publish_records "
            "WHERE platform_code IS NOT NULL AND platform_code != ''"
        )
        if r3:
            result["platforms"] = int(r3.get("cnt", 0))

        r4 = query_row(
            "SELECT COUNT(DISTINCT platform_code) as cnt FROM publish_records "
            "WHERE platform_code IS NOT NULL AND platform_code != ''"
        )
        if r4:
            result["llm_models"] = int(r4.get("cnt", 0))
    except Exception as e:
        print(f"[DashboardQuickStats] Error: {e}")

    return result
