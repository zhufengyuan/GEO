import asyncio
import json
import re
import time
import httpx
from backend.config import settings
from backend.services.llm_service import async_call_llm


COPYWRITING_KEYWORDS = [
    "文案", "广告", "营销", "推广", "宣传", "品牌", "slogan", "口号",
    "标语", "推文", "软文", "产品介绍", "产品描述", "促销", "卖点",
    "写一篇", "帮我写", "生成文案", "创作文案",
]


INDUSTRY_PATTERNS = {
    "industry": [
        r"(教育|医疗|金融|电商|零售|餐饮|旅游|科技|互联网|游戏|健康|美容|时尚|汽车|房地产|建筑|农业|食品|母婴|宠物|家居|家电|3C|数码|服装|运动|健身|法律|咨询|人力资源|物流|供应链|SaaS|AI|人工智能|直播|短视频|社交|政务|公益|环保|能源|化工|制造)"
    ],
    "target_audience": [
        r"(学生|白领|宝妈|老年人|年轻人|00后|90后|80后|女性|男性|创业者|企业主|中小企业|大企业|个人用户|B端|C端|政府|医生|律师|程序员|设计师|摄影师|运动爱好者|家长)"
    ],
    "product_type": [
        r"(App|软件|平台|课程|服务|商品|产品|工具|系统|方案|食品|饮料|化妆品|护肤品|服装|鞋包|数码|家电|保险|贷款|投资|理财|药品|健康品|教材|书籍|设备|机器)"
    ],
}


_token_lock = asyncio.Lock()
_token_value = ""
_token_exp_at = 0.0


async def _get_access_token() -> str:
    api_key = str(getattr(settings, "WENXIN_API_KEY", "") or "").strip()
    secret_key = str(getattr(settings, "WENXIN_SECRET_KEY", "") or "").strip()
    if not api_key or not secret_key:
        return ""

    now = time.time()
    if _token_value and _token_exp_at - now > 30:
        return _token_value

    async with _token_lock:
        now2 = time.time()
        if _token_value and _token_exp_at - now2 > 30:
            return _token_value

        url = (
            "https://aip.baidubce.com/oauth/2.0/token"
            f"?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, headers={"Content-Type": "application/json"})
                data = resp.json() if resp.content else {}
        except Exception as e:
            print(f"[WENXIN] 获取 access_token 失败：{e}")
            return ""
        token = str(data.get("access_token") or "").strip()
        expires_in = int(data.get("expires_in") or 0)
        if not token:
            return ""
        global _token_value, _token_exp_at
        _token_value = token
        _token_exp_at = time.time() + max(60, expires_in)
        return _token_value


async def _call_wenxin(messages: list) -> str:
    token = await _get_access_token()
    if not token:
        return ""
    url = "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant"
    url = f"{url}?access_token={token}"
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, headers={"Content-Type": "application/json"}, json={"messages": messages})
            data = resp.json() if resp.content else {}
        return str(data.get("result") or "").strip()
    except Exception as e:
        print(f"[WENXIN] 调用失败：{e}")
        return ""


def _is_copywriting_request(user_input: str) -> bool:
    lower = str(user_input or "").lower()
    return any(kw in lower for kw in COPYWRITING_KEYWORDS)


def _extract_industry_info(user_input: str) -> dict:
    info = {"product_type": None, "target_audience": None, "industry": None}
    text = str(user_input or "")
    for field, patterns in INDUSTRY_PATTERNS.items():
        for pattern in patterns:
            m = re.search(pattern, text)
            if m:
                info[field] = m.group(1)
                break
    return info


def _get_missing_fields(info: dict) -> list:
    return [k for k, v in (info or {}).items() if v is None]


def _build_confirm_question(missing: list) -> str:
    questions = []
    if "product_type" in missing:
        questions.append("1. 您的产品/服务类型是什么？（例如：App、课程、实体商品、咨询服务等）")
    if "target_audience" in missing:
        questions.append("2. 您的目标用户群体是哪类人群？（例如：学生、职场白领、宝妈、老年人等）")
    if "industry" in missing:
        questions.append("3. 您所在的行业是？（例如：教育、医疗、电商、餐饮、科技等）")
    return "为了帮您生成更精准的文案，需要先了解以下信息：\n\n" + "\n".join(questions) + "\n\n请依次回答上述问题后，我将为您生成文案。"


def _build_enriched_prompt(original_request: str, info: dict) -> str:
    lines = [str(original_request or "").strip(), ""]
    lines.append("【背景信息（请据此生成文案）】")
    if info.get("product_type"):
        lines.append(f"- 产品/服务类型：{info['product_type']}")
    if info.get("target_audience"):
        lines.append(f"- 目标用户群体：{info['target_audience']}")
    if info.get("industry"):
        lines.append(f"- 所在行业：{info['industry']}")
    return "\n".join(lines).strip()


def _history_to_transcript(history: list, max_turns: int = 60) -> str:
    items = history[-max_turns:] if isinstance(history, list) else []
    parts = []
    for m in items:
        role = str((m or {}).get("role") or "").strip()
        content = str((m or {}).get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            parts.append(f"用户：{content}")
        else:
            parts.append(f"AI：{content}")
    return "\n".join(parts).strip()


class ChatBot:
    def __init__(self):
        self.history = []
        self.pending_request = ""
        self.industry_info = {}
        self.awaiting_industry = False

    async def _call_ai(self, user_input: str = None) -> str:
        if user_input:
            self.history.append({"role": "user", "content": user_input})

        reply = ""
        reply = await _call_wenxin(self.history)
        if not reply:
            transcript = _history_to_transcript(self.history)
            prompt = transcript if transcript else str(user_input or "")
            reply = await async_call_llm(prompt)
        reply = str(reply or "").strip()
        if reply:
            self.history.append({"role": "assistant", "content": reply})
        return reply

    async def chat(self, user_input: str) -> str:
        user_input = str(user_input or "").strip()
        if not user_input:
            return "（输入为空，请重新输入）"

        if self.awaiting_industry:
            return await self._handle_industry_confirm(user_input)

        if _is_copywriting_request(user_input):
            info = _extract_industry_info(user_input)
            missing = _get_missing_fields(info)
            if missing:
                self.pending_request = user_input
                self.industry_info = info
                self.awaiting_industry = True
                return _build_confirm_question(missing)
            enriched_prompt = _build_enriched_prompt(user_input, info)
            return await self._call_ai(enriched_prompt)

        return await self._call_ai(user_input)

    async def _handle_industry_confirm(self, user_input: str) -> str:
        new_info = _extract_industry_info(user_input)
        for field, value in new_info.items():
            if value and self.industry_info.get(field) is None:
                self.industry_info[field] = value

        missing = _get_missing_fields(self.industry_info)
        if missing:
            combined = user_input
            for field in missing:
                self.industry_info[field] = combined
            missing = []

        self.awaiting_industry = False
        enriched_prompt = _build_enriched_prompt(self.pending_request, self.industry_info)
        self.pending_request = ""
        self.industry_info = {}
        return await self._call_ai(enriched_prompt)


_bots = {}
_bots_lock = asyncio.Lock()


async def get_bot(key: str, reset: bool = False) -> ChatBot:
    k = str(key or "").strip()
    if not k:
        k = "_default"
    async with _bots_lock:
        if reset or k not in _bots:
            _bots[k] = ChatBot()
        return _bots[k]
