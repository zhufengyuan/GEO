"""
FastAPI 认证依赖（Depends）
用法：def my_endpoint(user = Depends(get_current_user)):
"""
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict
import json

from backend.services.auth_service import get_user_by_id
from backend.utils.api_response import APIException
from backend.config import settings

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """从 Authorization: Bearer <token> 中提取当前用户"""
    from backend.auth.jwt_handler import decode_token

    if getattr(settings, "AUTH_DISABLED", False):
        user = await get_user_by_id(int(getattr(settings, "DEV_USER_ID", 1)))
        if user is None:
            raise APIException("USER_NOT_FOUND", "DEV_USER 不存在，请先执行 migrations", 401)
        return user

    if credentials is None:
        # 尝试从 cookie 读取（Web 端可选）
        token = request.cookies.get("access_token")
        if not token:
            raise APIException("UNAUTHORIZED", "未认证，请先登录", 401)
    else:
        token = credentials.credentials

    payload = decode_token(token)
    if payload is None:
        raise APIException("TOKEN_EXPIRED", "Token 已过期或无效", 401)

    user_id = int(payload.get("sub", 0))
    user = await get_user_by_id(user_id)
    if user is None:
        raise APIException("USER_NOT_FOUND", "用户不存在", 401)

    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """可选认证（某些接口允许匿名访问）"""
    try:
        return await get_current_user(request, credentials)
    except APIException:
        return None
