"""
通用数据清洗工具

提取自 main.py 中的 SafeJSONResponse 和 official_media_list 中的重复 sanitize 逻辑。
"""
import math
import numbers
import datetime


def sanitize_value(v):
    """
    清洗单个值：NaN → None，Inf → None，pandas Timestamp → ISO 字符串，其他原样返回。
    """
    try:
        import pandas as pd  # type: ignore
        try:
            if pd.isna(v):
                return None
        except Exception:
            pass
        if isinstance(v, getattr(pd, "Timestamp", ())):
            try:
                return v.to_pydatetime().isoformat()
            except Exception:
                return str(v)
    except Exception:
        pass
    if v is None:
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()
    if isinstance(v, bool):
        return v
    if isinstance(v, float):
        if not math.isfinite(v):
            return None
        return v
    if isinstance(v, numbers.Number):
        try:
            fv = float(v)
        except Exception:
            return None
        if not math.isfinite(fv):
            return None
        try:
            if isinstance(v, int):
                return int(v)
        except Exception:
            pass
        return fv
    return v


def sanitize_key(k):
    """清洗字典键：确保键为字符串，处理 None 和数字键。"""
    kk = sanitize_value(k)
    if kk is None:
        return "null"
    try:
        if isinstance(kk, numbers.Number) and not isinstance(kk, bool):
            return str(kk)
    except Exception:
        pass
    return str(kk)


def sanitize_obj(obj):
    """
    递归清洗对象：遍历 dict/list/set/tuple，对每个值和键执行 sanitize。
    """
    if isinstance(obj, dict):
        return {sanitize_key(k): sanitize_obj(sanitize_value(v)) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [sanitize_obj(sanitize_value(x)) for x in obj]
    return sanitize_value(obj)
