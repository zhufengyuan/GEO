"""
分页工具
"""
from typing import Tuple, List, Any
from backend.schemas import PaginationParams

def paginate(items: List[Any], total: int, page: int, page_size: int) -> dict:
    """包装分页响应"""
    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "items": items,
    }


def pagination_params(page: int = 1, page_size: int = 20) -> Tuple[int, int]:
    """计算 SQL LIMIT / OFFSET"""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 500:
        page_size = 500
    return page_size, (page - 1) * page_size
