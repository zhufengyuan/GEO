"""
文件名业务信息解析工具

从上传图片的文件名中提取公司/产品/业务相关信息，
注入到 LLM 提示词中，提升生成内容的相关性和准确性。

用户上传图片时，文件名通常包含产品名称、公司信息、业务关键词等：
  例："尚丰健身器材_跑步机T900_产品图.jpg" → 尚丰健身器材、跑步机T900
  例："sunfitness_treadmill_pro_front.png" → sunfitness、treadmill pro
  例："公司前台_接待区.jpg" → 公司前台、接待区
"""

import re
import os
from typing import List, Dict, Optional


# 常见噪音词（文件名中无业务含义的前缀/后缀）
_NOISE_WORDS = {
    # 中文噪音
    "IMG", "img", "IMG_", "img_", "DSC", "DSC_", "dsc_",
    "微信图片", "微信截图", "截图", "截屏", "屏幕截图",
    "图片", "照片", "相片", "未命名", "新建", "新建文件夹",
    "无标题", "untitled", "Untitled", "photo", "Photo",
    "image", "Image", "picture", "Picture",
    "mmexport", "mmexport_",
    # 设备/相机前缀
    "IMG_", "DSC_", "PXL_", "PAN_", "DCIM_", "MOV_", "VID_",
    # 时间戳模式 20240101_ 或 2024-01-01
}

# 常见文件扩展名
_IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
    ".tiff", ".tif", ".ico", ".heic", ".heif", ".avif",
    ".psd", ".ai", ".eps", ".pdf", ".raw", ".cr2", ".nef",
}

# 最小有意义的片段长度（过滤太短的无意义词）
_MIN_SEGMENT_LEN = 2

# 中文公司/产品常见后缀词（可帮助识别但不过滤）
_BUSINESS_SUFFIX_HINTS = [
    "公司", "厂", "集团", "品牌", "科技", "实业", "器械", "设备",
    "产品", "系列", "型号", "款", "版", "新品", "新款", "旗舰",
    "图", "图片", "展示", "主图", "详情", "海报", "宣传",
    "前台", "工厂", "车间", "生产线", "仓库", "办公室", "门店",
    "正面", "侧面", "背面", "内部", "外观", "细节", "场景",
]


def _strip_extension(filename: str) -> str:
    """去除文件扩展名"""
    name = filename
    for ext in _IMAGE_EXTENSIONS:
        if name.lower().endswith(ext):
            name = name[:-len(ext)]
            break
    return name


def _clean_filename(name: str) -> str:
    """清洗文件名：去除噪音词、替换分隔符、返回有意义的文本"""
    # 去扩展名
    name = _strip_extension(name)

    # 替换常见分隔符为空格
    name = name.replace("_", " ").replace("-", " ").replace(".", " ")

    # 折叠多余空格
    name = re.sub(r"\s+", " ", name).strip()

    # 按空格分片
    segments = name.split()
    cleaned = []
    for seg in segments:
        seg = seg.strip()
        if not seg or len(seg) < _MIN_SEGMENT_LEN:
            continue
        # 跳过纯数字/日期片段
        if re.match(r"^\d{4,}$", seg):
            continue
        if re.match(r"^\d{6,8}$", seg):  # 日期格式 20240101
            continue
        # 跳过纯噪音词（大小写不敏感）
        if seg in _NOISE_WORDS:
            continue
        # 跳过以噪音词开头的片段（如 IMG_1234）
        is_noise = False
        for nw in _NOISE_WORDS:
            if seg.startswith(nw) and len(seg) <= len(nw) + 8:
                is_noise = True
                break
        if is_noise:
            continue
        cleaned.append(seg)

    return " ".join(cleaned)


def _extract_keywords(text: str) -> List[str]:
    """从清洗后的文本中提取业务关键词（中文按2-6字窗口，英文按单词）"""
    keywords = []
    text = text.strip()
    if not text:
        return keywords

    # 检查是否包含中文字符
    has_chinese = bool(re.search(r"[\u4e00-\u9fff]", text))

    if has_chinese:
        # 中文：按 2-6 字滑动窗口提取有意义的片段
        # 同时保留完整的空格分隔的片段
        segments = text.split()
        for seg in segments:
            seg = seg.strip()
            if len(seg) >= 2:
                keywords.append(seg)
            # 对较长片段做子串提取
            if len(seg) >= 6:
                # 按常见后缀拆分
                for hint in _BUSINESS_SUFFIX_HINTS:
                    if hint in seg and seg != hint:
                        keywords.append(seg)
    else:
        # 英文/数字：直接按空格分片
        for seg in text.split():
            seg = seg.strip()
            if len(seg) >= 2 and not seg.isdigit():
                keywords.append(seg)

    # 去重并保持顺序
    seen = set()
    unique = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique.append(kw)
    return unique


def extract_business_context_from_images(images: list) -> str:
    """
    从图片列表中提取文件名中的业务上下文信息。

    Args:
        images: 图片对象列表，每项包含 `name` 字段（文件名）

    Returns:
        格式化的业务上下文字符串，若无有效信息则返回空字符串。
        例："从上传图片文件名中识别的补充信息：尚丰健身器材、跑步机 T900、产品正面图"
    """
    if not images or not isinstance(images, list) or len(images) == 0:
        return ""

    all_keywords = []
    for img in images:
        if not isinstance(img, dict):
            continue
        # 尝试多种可能的文件名字段
        filename = (
            img.get("name")
            or img.get("file_name")
            or img.get("filename")
            or ""
        ).strip()
        if not filename:
            continue

        # 清洗文件名
        cleaned = _clean_filename(filename)
        if not cleaned:
            continue

        # 提取关键词
        kws = _extract_keywords(cleaned)
        all_keywords.extend(kws)

    if not all_keywords:
        return ""

    # 构建输出
    unique_kws = list(dict.fromkeys(all_keywords))  # 保持顺序去重
    kw_text = "、".join(unique_kws[:15])  # 最多15个关键词
    return f"【从上传图片文件名中识别的补充信息（请参考这些信息辅助内容生成）】\n{kw_text}"


def extract_business_context_from_images_json(images_json: str) -> str:
    """
    从 images_json 字符串中解析并提取文件名上下文。
    适用于已在 prompt 中序列化为 JSON 的图片数据。

    Args:
        images_json: JSON 字符串，如 '[{"name":"product.jpg",...}]'

    Returns:
        格式化的业务上下文字符串
    """
    import json
    try:
        images = json.loads(images_json) if isinstance(images_json, str) else images_json
    except (json.JSONDecodeError, TypeError):
        return ""
    return extract_business_context_from_images(images)
