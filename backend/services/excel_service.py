"""
Excel 读取服务（迁移自 geo.Rmd 中的 readxl 逻辑）
对应 R：readxl::read_excel(xls_path, sheet=sh)

功能：
  1. 读取"2026年网站媒体及官方自媒体报价-Q2.xls"
  2. 解析为结构化数据，通过 GET /api/v1/official-media 返回
"""
import pandas as pd
from typing import List, Dict, Any
import os
from pathlib import Path
from backend.config import settings
import math
import datetime

_DEFAULT_EXCEL = (Path(__file__).resolve().parents[2] / "2026年网站媒体及官方自媒体报价-Q2.xls").as_posix()
EXCEL_PATH = str(getattr(settings, "OFFICIAL_MEDIA_EXCEL", "") or _DEFAULT_EXCEL)


def _detect_media_type(sheet_name: str) -> str:
    """判断媒体类型（对应 R 的 type_of 函数）"""
    s = sheet_name.lower()
    if any(k in s for k in ["自媒体", "官媒", "官方"]):
        return "官方自媒体"
    elif any(k in s for k in ["全国", "网站"]):
        return "全国网站媒体"
    return "未知"


def _sanitize_excel_value(v):
    if v is None:
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()
    if isinstance(v, pd.Timestamp):
        try:
            return v.to_pydatetime().isoformat()
        except Exception:
            return str(v)
    try:
        fv = float(v)
        if not math.isfinite(fv):
            return None
        return fv if not math.isnan(fv) else None
    except Exception:
        pass
    try:
        item = getattr(v, "item", None)
        if callable(item):
            return _sanitize_excel_value(item())
    except Exception:
        pass
    return v


_HEADER_HINTS = [
    "媒体",
    "账号",
    "平台",
    "地区",
    "地域",
    "行业",
    "领域",
    "粉丝",
    "认证",
    "报价",
    "价格",
    "刊例",
    "费用",
    "单价",
    "链接",
    "网址",
    "备注",
    "说明",
    "出稿",
    "时效",
    "收录",
]


def _looks_like_header(cols) -> bool:
    if cols is None:
        return False
    try:
        seq = list(cols)
    except Exception:
        seq = []
    names = [str("" if c is None else c).strip() for c in seq]
    if not names:
        return False
    text = " ".join(names)
    if any("http" in n.lower() for n in names):
        return False
    if sum(1 for h in _HEADER_HINTS if h in text) >= 2:
        return True
    return False


def _to_text(v) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    return s


def _normalize_positional_row(values, media_type: str) -> Dict[str, Any]:
    vals = [_sanitize_excel_value(v) for v in (values or [])]
    while vals and (_to_text(vals[-1]) == ""):
        vals.pop()
    if not vals:
        return {}
    non_empty = sum(1 for v in vals if _to_text(v) != "")
    if non_empty < 3:
        return {}

    row: Dict[str, Any] = {}
    if media_type == "全国网站媒体":
        row["__name"] = _to_text(vals[0]) if len(vals) > 0 else ""
        row["__platform"] = _to_text(vals[1]) if len(vals) > 1 else ""
        row["__region"] = _to_text(vals[2]) if len(vals) > 2 else ""
        row["__industry"] = _to_text(vals[3]) if len(vals) > 3 else ""
        row["__price"] = _to_text(vals[4]) if len(vals) > 4 else ""
        row["__url"] = _to_text(vals[5]) if len(vals) > 5 else ""
        row["__remark"] = _to_text(vals[6]) if len(vals) > 6 else ""
        row["__speed"] = _to_text(vals[7]) if len(vals) > 7 else ""
        row["__rate"] = _to_text(vals[8]) if len(vals) > 8 else ""
    else:
        row["__name"] = _to_text(vals[0]) if len(vals) > 0 else ""
        row["__platform"] = _to_text(vals[1]) if len(vals) > 1 else ""
        row["__region"] = _to_text(vals[2]) if len(vals) > 2 else ""
        row["__industry"] = _to_text(vals[3]) if len(vals) > 3 else ""
        row["__fans"] = _to_text(vals[4]) if len(vals) > 4 else ""
        row["__verify"] = _to_text(vals[5]) if len(vals) > 5 else ""
        row["__price"] = _to_text(vals[6]) if len(vals) > 6 else ""
        row["__url"] = _to_text(vals[7]) if len(vals) > 7 else ""
        row["__speed"] = _to_text(vals[8]) if len(vals) > 8 else ""
        row["__remark"] = _to_text(vals[9]) if len(vals) > 9 else ""

    return row


def read_official_media_excel(excel_path: str = None) -> List[Dict[str, Any]]:
    """
    读取报价 Excel，返回统一格式的行列表
    每个元素：{..., __sheet, __type}
    """
    path = excel_path or EXCEL_PATH
    if not os.path.exists(path):
        return []

    all_rows: List[Dict] = []
    try:
        xls = pd.ExcelFile(path)
    except Exception as e:
        print(f"[Excel] 读取失败：{e}")
        return []

    for sheet_name in xls.sheet_names:
        media_type = _detect_media_type(sheet_name)
        try:
            # header=1 对应 R readxl::read_excel(.， name_repair="unique_quiet")
            df = pd.read_excel(xls, sheet_name=sheet_name, header=1)
        except Exception:
            df = None
        if df is None:
            try:
                df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
            except Exception:
                continue
        if df.empty:
            continue

        if df.columns is not None and _looks_like_header(df.columns):
            try:
                df.columns = (
                    df.columns.astype(str)
                    .str.strip()
                    .str.replace(r"\s+", " ", regex=True)
                    .str.replace(r"[\r\n\t]", " ", regex=True)
                )
            except Exception:
                pass
            for _, row in df.iterrows():
                row_dict = row.where(row.notna(), None).to_dict()
                for k, v in list(row_dict.items()):
                    row_dict[k] = _sanitize_excel_value(v)
                row_dict["__sheet"] = sheet_name
                row_dict["__type"] = media_type
                all_rows.append(row_dict)
        else:
            try:
                df2 = pd.read_excel(xls, sheet_name=sheet_name, header=None)
            except Exception:
                continue
            if df2.empty:
                continue
            for _, row in df2.iterrows():
                norm = _normalize_positional_row(list(row.values), media_type)
                if not norm:
                    continue
                norm["__sheet"] = sheet_name
                norm["__type"] = media_type
                all_rows.append(norm)

    return all_rows


def get_excel_summary(excel_path: str = None) -> Dict:
    """获取 Excel 文件的摘要信息（sheet 数量、总行数）"""
    path = excel_path or EXCEL_PATH
    if not os.path.exists(path):
        return {"sheets": 0, "total_rows": 0, "sheet_names": []}
    try:
        xls = pd.ExcelFile(path)
        total = sum(
            pd.read_excel(xls, sheet_name=s).shape[0]
            for s in xls.sheet_names
        )
        return {
            "sheets": len(xls.sheet_names),
            "total_rows": total,
            "sheet_names": xls.sheet_names,
        }
    except Exception as e:
        print(f"[Excel] 摘要读取失败：{e}")
        return {"sheets": 0, "total_rows": 0, "sheet_names": []}
