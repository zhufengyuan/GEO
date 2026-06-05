"""
统一 API 响应格式（符合 02-通信协议与接口.md 1.3 节）

所有接口返回：
  {"success": true, "data": {...}, "error": null}
  {"success": false, "data": null, "error": {"code": "...", "message": "..."}}
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Any, Optional
import json

def api_response(data: Any = None, error: Optional[dict] = None, status_code: int = 200):
    """统一包装响应"""
    if error is not None:
        code = error.get("code", "UNKNOWN")
        msg = error.get("message", "")
        # 根据 error code 映射 HTTP 状态码（接口文档 1.4 节）
        status_map = {
            "INVALID_CREDENTIALS": 401,
            "TOKEN_EXPIRED": 401,
            "UNAUTHORIZED": 401,
            "INSUFFICIENT_BALANCE": 402,
            "SUBSCRIPTION_EXPIRED": 403,
            "FORBIDDEN": 403,
            "NOT_FOUND": 404,
            "DUPLICATE": 409,
            "RATE_LIMIT": 429,
            "INTERNAL_ERROR": 500,
        }
        return JSONResponse(
            status_code=status_map.get(code, status_code),
            content={"success": False, "data": None, "error": error}
        )
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "data": data, "error": None}
    )

class APIException(Exception):
    """业务异常，会被 main.py 中的异常处理器捕获"""
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)

def ok(data: Any = None):
    """成功快捷方式"""
    return {"success": True, "data": data, "error": None}

def fail(code: str, message: str):
    """失败快捷方式"""
    return {"success": False, "data": None, "error": {"code": code, "message": message}}
