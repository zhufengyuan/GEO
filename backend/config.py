from typing import List
from pathlib import Path
import os
import re

_ROOT_DIR = Path(__file__).resolve().parents[1]


def _read_config_r() -> dict:
    p = _ROOT_DIR / "config.R"
    if not p.exists():
        return {}
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return {}

    out = {}
    for key in ["llm_url", "api_base_url", "wenxin_api_key", "wenxin_secret_key"]:
        m = re.search(rf"(?m)\b{re.escape(key)}\s*=\s*([\"'])(.*?)\1\s*,?", text)
        if m:
            out[key] = m.group(2)
    return out


_R_CFG = _read_config_r()


class Settings:
    DEBUG: bool = True

    DB_HOST: str = os.getenv("DB_HOST", "YOUR_DB_HOST")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "YOUR_DB_PASSWORD")
    DB_NAME: str = os.getenv("DB_NAME", "geo")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_CHARSET: str = "utf8mb4"

    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    AUTH_DISABLED: bool = True
    DEV_USER_ID: int = 1

    LLM_URL: str = _R_CFG.get("llm_url") or os.getenv("LLM_URL", "http://YOUR_LLM_HOST:5200/wenxinqianfan")
    WENXIN_API_KEY: str = os.getenv("WENXIN_API_KEY", "YOUR_WENXIN_API_KEY")
    WENXIN_SECRET_KEY: str = os.getenv("WENXIN_SECRET_KEY", "YOUR_WENXIN_SECRET_KEY")
    OFFICIAL_MEDIA_EXCEL: str = (Path(__file__).resolve().parents[1] / "data" / "2026年网站媒体及官方自媒体报价-Q2.xls").as_posix()
    OFFICIAL_PUBLISH_PARTNER_URL: str = os.getenv("OFFICIAL_PUBLISH_PARTNER_URL", "")
    OFFICIAL_PUBLISH_PARTNER_TOKEN: str = os.getenv("OFFICIAL_PUBLISH_PARTNER_TOKEN", "")

    CORS_ORIGINS: List[str] = [
        "http://localhost:4510",
        "http://127.0.0.1:4510",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()
