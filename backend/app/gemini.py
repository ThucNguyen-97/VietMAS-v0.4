import httpx

from .config import settings


def generate_reply(message: str) -> str:
    if not settings.gemini_api_key:
        return "Đã tiếp nhận yêu cầu. Gemini API chưa được cấu hình; bạn có thể tiếp tục kiểm tra dữ liệu kho trong dashboard."
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    payload = {
        "system_instruction": {
            "parts": [{"text": "Bạn là trợ lý quản lý kho cho doanh nghiệp sản xuất muối ớt. Trả lời ngắn gọn bằng tiếng Việt. Không tự bịa số lượng tồn kho; nếu thiếu dữ liệu, hãy hỏi lại."}]
        },
        "contents": [{"role": "user", "parts": [{"text": message}]}],
        "generationConfig": {"temperature": 0.2},
    }
    try:
        response = httpx.post(url, params={"key": settings.gemini_api_key}, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError):
        return "Hiện chưa thể nhận phản hồi từ Gemini. Vui lòng thử lại sau."

