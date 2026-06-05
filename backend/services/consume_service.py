"""
消耗记录服务（迁移自 geo.Rmd 中的 insert_consumption / query_consumption）
"""
from typing import Optional, List, Dict
from datetime import datetime
from backend.database import insert, query, query_row


def add_consumption(
    event_type: str,
    page: Optional[str] = None,
    action: Optional[str] = None,
    units: Optional[int] = None,
    amount: Optional[float] = 0.0,
    currency: str = "CNY",
    meta: Optional[Dict] = None,
) -> bool:
    """记录消耗"""
    import json
    meta_json = json.dumps(meta, ensure_ascii=False) if meta else None
    insert(
        """INSERT INTO consumption_details
           (event_type, page, action, units, amount, currency, meta_json)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        [event_type, page, action, units, amount, currency, meta_json]
    )
    return True


def query_consumptions(
    kw: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
) -> Dict:
    """查询消耗明细（对应 R 的 query_consumption）"""
    where = ["1=1"]
    params: List = []

    if event_type:
        where.append("event_type=%s")
        params.append(event_type)
    if kw:
        where.append("(page LIKE %s OR action LIKE %s)")
        like = f"%{kw}%"
        params.extend([like, like])
    if start_date:
        where.append("created_at >= %s")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        where.append("created_at <= %s")
        params.append(f"{end_date} 23:59:59")

    params.extend([limit])
    sql = f"""
        SELECT id,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') as created_at,
               event_type, page, action, units, amount, currency
        FROM consumption_details
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC LIMIT %s
    """
    rows = query(sql, params)

    # 月度 / 当日统计
    month_sql = """SELECT COALESCE(SUM(amount),0) as month_amount, COUNT(1) as month_count
                    FROM consumption_details
                    WHERE created_at >= DATE_FORMAT(NOW(), '%%Y-%%m-01 00:00:00')"""
    today_sql = """SELECT COALESCE(SUM(amount),0) as today_amount
                   FROM consumption_details
                   WHERE created_at >= DATE_FORMAT(NOW(), '%%Y-%%m-%%d 00:00:00')"""

    month_row = query_row(month_sql)
    today_row = query_row(today_sql)

    return {
        "summary": {
            "today_amount": float(today_row["today_amount"] or 0),
            "month_amount": float(month_row["month_amount"] or 0),
            "month_count": int(month_row["month_count"] or 0),
        },
        "list": rows,
    }
