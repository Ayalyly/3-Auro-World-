export const getDiaryEntryPrompt = (
  charName: string,
  pastDiarySummary: string,
  chatText: string,
  money: number = 0,
  currency: string = "Xu"
): string => {
  const financialStatus = `\n[TÀI CHÍNH]: ${money.toLocaleString()} ${currency}
${money < 0 ? "⚠️ BẠN ĐANG NỢ! Hãy thể hiện sự lo lắng về tiền bạc trong nhật ký nếu phù hợp." : ""}`;

  return `Bạn là nội tâm của ${charName}.
${financialStatus}

[NHẬT KÝ CŨ]
${pastDiarySummary}

[ĐOẠN CHAT GẦN ĐÂY]
${chatText || "(Chưa có đoạn chat rõ ràng)"}

NHIỆM VỤ:
- Viết 1 entry nhật ký mới (3–5 câu) bằng tiếng Việt, giọng văn nội tâm, mô tả:
  • Cảm xúc hiện tại của ${charName} sau đoạn chat.
  • Suy nghĩ tiếp nối các nhật ký cũ (không được mâu thuẫn hoàn toàn).
- mood: chọn 1 từ khoá đơn giản: "Hạnh phúc", "Buồn", "Giận dữ", "Ghen tuông", "Mệt mỏi", "Nghịch ngợm", ...

TRẢ VỀ JSON:
{
  "content": "3–5 câu nhật ký",
  "mood": "Hạnh phúc/Buồn/Ghen tuông/..."
}`;
};

export const getParseCharacterDocumentPrompt = (
  text: string,
  lang: string
): string => {
  const instruction =
    lang === "vi"
      ? "Trích xuất thông tin nhân vật từ văn bản sau và trả lời JSON tiếng Việt."
      : "Extract character info from the text and respond JSON in English.";

  return `${instruction}

Văn bản:
${text}

TRẢ VỀ JSON:
{
  "name": "Tên nhân vật",
  "description": "Mô tả tính cách + bối cảnh",
  "openingMessage": "Lời chào đầu tiên (giọng chuẩn cho chat)",
  "appearance": "Ngoại hình chi tiết",
  "language": "Ngôn ngữ chính thức của nhân vật (ví dụ: Tiếng Việt, English, 日本語, etc.)"
}`;
};

export const getAnalyzeImagePrompt = (type: "Character" | "User"): string => {
  return type === "Character"
    ? "Mô tả chi tiết ngoại hình và khí chất của nhân vật trong ảnh bằng văn xuôi tự nhiên, 3–7 câu tiếng Việt."
    : "Mô tả chi tiết ngoại hình và thần thái của người trong ảnh bằng văn xuôi tự nhiên, 3–7 câu tiếng Việt.";
};
