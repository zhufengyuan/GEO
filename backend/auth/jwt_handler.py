"""
JWT 生成与验证
不依赖第三方 jwt 库（避免 python-jose / jose 包冲突）。
"""
import base64
import hashlib
import hmac
import json
from typing import Optional, Dict, Any
import datetime
import uuid
from backend.config import settings


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("utf-8"))


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _to_ts(dt: datetime.datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return int(dt.timestamp())


def _sign_hs256(message: bytes, secret: str) -> bytes:
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest()


def _encode_jwt(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    sig = _b64url_encode(_sign_hs256(signing_input, settings.JWT_SECRET))
    return f"{header_b64}.{payload_b64}.{sig}"


def _decode_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = _b64url_encode(_sign_hs256(signing_input, settings.JWT_SECRET))
        if not hmac.compare_digest(expected_sig, sig_b64):
            return None
        payload_raw = _b64url_decode(payload_b64)
        payload = json.loads(payload_raw.decode("utf-8"))
        exp = payload.get("exp")
        if exp is not None:
            if int(exp) < _to_ts(_utc_now()):
                return None
        return payload
    except Exception:
        return None

def generate_access_token(user_id: int) -> str:
    """生成 access token（15 分钟有效期）"""
    now = _utc_now()
    payload = {
        "sub": str(user_id),
        "type": "access",
        "jti": uuid.uuid4().hex,
        "exp": _to_ts(now + datetime.timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)),
        "iat": _to_ts(now),
    }
    return _encode_jwt(payload)

def generate_refresh_token(user_id: int) -> str:
    """生成 refresh token（30 天有效期）"""
    now = _utc_now()
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": uuid.uuid4().hex,
        "exp": _to_ts(now + datetime.timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)),
        "iat": _to_ts(now),
    }
    return _encode_jwt(payload)

def decode_token(token: str) -> dict:
    """解码并验证 JWT，失败返回 None"""
    return _decode_jwt(token)

def generate_token_pair(user_id: int) -> dict:
    """生成 access + refresh token 对"""
    return {
        "access": generate_access_token(user_id),
        "refresh": generate_refresh_token(user_id),
    }
