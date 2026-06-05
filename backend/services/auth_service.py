"""
用户认证服务（密码 hash + 用户 CRUD）
依赖：passlib[bcrypt]
"""
from typing import Optional, Dict
import json
from backend.database import query_row, insert, execute


async def verify_user(phone: str, password: str) -> Optional[Dict]:
    """
    验证用户名密码
    返回 user dict 或 None
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    user = query_row("SELECT * FROM users WHERE phone=%s", [phone])
    if user is None:
        return None
    # 注意：R 版没有密码字段，这是新增功能
    # 兼容旧数据（没有 password_hash 的账户需先重置密码）
    if not user.get("password_hash"):
        return None
    if not pwd_context.verify(password, user["password_hash"]):
        return None
    return user


async def create_user(phone: str, password: str, real_name: Optional[str] = None) -> Optional[int]:
    """创建用户，返回 user_id 或 None（重复）"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    existing = query_row("SELECT id FROM users WHERE phone=%s", [phone])
    if existing:
        return None

    pwd_hash = pwd_context.hash(password)
    uid = insert(
        "INSERT INTO users (phone, password_hash, real_name) VALUES (%s, %s, %s)",
        [phone, pwd_hash, real_name]
    )
    return uid


async def get_user_by_id(user_id: int) -> Optional[Dict]:
    """根据 ID 获取用户"""
    return query_row("SELECT * FROM users WHERE id=%s", [user_id])


async def get_user_by_phone(phone: str) -> Optional[Dict]:
    """根据手机号获取用户"""
    return query_row("SELECT * FROM users WHERE phone=%s", [phone])
