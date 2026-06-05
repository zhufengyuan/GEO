"""
Pydantic schemas（请求/响应验证）
"""
from pydantic import BaseModel, Field
from pydantic import validator
from typing import List, Optional, Any
from datetime import datetime

# ========== Auth ==========

class LoginRequest(BaseModel):
    phone: str
    password: str

class RegisterRequest(BaseModel):
    phone: str
    password: str
    real_name: Optional[str] = None

class RefreshRequest(BaseModel):
    refreshToken: str

class AuthResponse(BaseModel):
    accessToken: str
    refreshToken: str

# ========== Question Words / Lexicons ==========

class LexiconCreateRequest(BaseModel):
    name: Optional[str] = ""
    company: Optional[str] = ""
    industry_keyword: Optional[str] = ""
    decision_stage: Optional[str] = ""
    words: Optional[dict] = None
    keywords: List[str] = []
    question_keyword: Optional[str] = ""

class LexiconResponse(BaseModel):
    id: int
    name: Optional[str] = None
    company: Optional[str] = None
    industry_keyword: Optional[str] = None
    first_question: Optional[str] = None
    question_count: Optional[int] = 0
    created_at: Optional[str] = None

# ========== Articles ==========

class ArticleCreateRequest(BaseModel):
    tab: str = "product"                # product | brand | activity
    lexicon_id: Optional[int] = 0
    question_text: str = ""
    platforms: List[str] = []
    article_type: Optional[str] = None
    style: Optional[str] = ""
    tone: Optional[str] = ""
    brand_embed: Optional[bool] = False
    title: Optional[str] = ""
    content: Optional[str] = ""
    activity_image: Optional[str] = ""
    user_input: Optional[str] = ""
    product: Optional[dict] = None
    products: List[dict] = Field(default_factory=list)
    images: List[dict] = Field(default_factory=list)

    @validator("lexicon_id", pre=True)
    def _coerce_lexicon_id(cls, v):
        if v is None:
            return 0
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return 0
            try:
                return int(s)
            except Exception:
                return 0
        try:
            return int(v)
        except Exception:
            return 0

class ArticleUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    article_type: Optional[str] = None
    style: Optional[str] = None
    tone: Optional[str] = None
    brand_embed: Optional[bool] = None

class ArticleResponse(BaseModel):
    id: int
    title: str
    article_type: Optional[str] = None
    creation_type: Optional[str] = None
    style: Optional[str] = None
    tone: Optional[str] = None
    brand_embed: Optional[bool] = None
    review_status: Optional[int] = 0
    reviewed_at: Optional[str] = None
    created_at: Optional[str] = None

# ========== Monitor Tasks ==========

class MonitorTaskCreateRequest(BaseModel):
    keyword: str
    platforms: List[str] = []

class MonitorTaskResponse(BaseModel):
    id: int
    keyword: str
    platforms: List[str] = []
    status: str = "active"
    last_run_at: Optional[str] = None
    created_at: Optional[str] = None

# ========== Files ==========

class FileUploadResponse(BaseModel):
    id: int
    url: str
    filename: str

# ========== 统一分页 ==========

class PaginationParams(BaseModel):
    page: int = 1
    pageSize: int = 20

# ========== 统一响应（泛型） ==========

class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[dict] = None
