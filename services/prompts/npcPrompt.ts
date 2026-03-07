export const getNpcGenerationPrompt = (
  charName: string,
  userName: string,
  worldContext: any
): string => {
  return `Dựa trên bối cảnh: ${worldContext.worldDetail}
Thể loại: ${worldContext.genre} (Thời đại: ${worldContext.era})
Nhân vật: ${charName}

HÃY TẠO HỆ THỐNG XÃ HỘI VÀ KINH TẾ PHÙ HỢP VỚI THỂ LOẠI TRÊN (JSON):

⚠️ LƯU Ý QUAN TRỌNG:
- BẮT BUỘC trả lời bằng tiếng Việt.
- Nếu là HIỆN ĐẠI: Tiền tệ là VND, USD, hoặc "Tiền". NPC là Bác sĩ, Trợ lý, Bạn bè, Người thân, Tình nhân... (KHÔNG tạo Tộc trưởng, Pháp sư).
- Nếu là CỔ ĐẠI: Tiền tệ là Bạc, Lượng. NPC là Vương gia, Tướng quân, Nô tỳ...
- Nếu là TIÊN HIỆP: Tiền tệ là Linh thạch. NPC là Sư huynh, Chưởng môn...
- QUY TẮC NPC: Tạo CHÍNH XÁC 3 NPC. Mỗi NPC phải có Tên và Vai trò (type) DUY NHẤT, không được trùng lặp vai trò (ví dụ: không được có 2 "Thanh mai trúc mã").

YÊU CẦU JSON:
{
  "relations": [
    { 
      "id": "npc1", 
      "name": "Tên NPC 1 (phù hợp bối cảnh)", 
      "type": "Vai trò (Ví dụ: Tình nhân, Bác sĩ riêng, Mẹ chồng...)", 
      "avatar": "", 
      "description": "Mô tả ngắn", 
      "affinityWithChar": 50, 
      "relationshipStatus": "Bình thường/Căng thẳng/Thân thiết",
      "personalNotes": "Ghi chú thầm kín/bí mật của nhân vật này đối với ${charName} (BẮT BUỘC CÓ)"
    },
    { 
      "id": "npc2", 
      "name": "Tên NPC 2", 
      "type": "Vai trò", 
      "avatar": "", 
      "description": "Mô tả ngắn", 
      "affinityWithChar": 50, 
      "relationshipStatus": "Bình thường/Căng thẳng/Thân thiết",
      "personalNotes": "Ghi chú thầm kín/bí mật"
    },
    { 
      "id": "npc3", 
      "name": "Tên NPC 3", 
      "type": "Vai trò", 
      "avatar": "", 
      "description": "Mô tả ngắn", 
      "affinityWithChar": 50, 
      "relationshipStatus": "Bình thường/Căng thẳng/Thân thiết",
      "personalNotes": "Ghi chú thầm kín/bí mật"
    }
  ],
  "currencyName": "Tên tiền tệ (Ví dụ: VND, USD, Xu...)",
  "shopNPCs": [
    { "id": "shop1", "name": "Tên chủ shop", "specialty": "Bán gì (Ví dụ: Thời trang, Thuốc, Xe hơi...)", "location": "Địa điểm" }
  ],
  "charMoney": 1000000,
  "userMoney": 50000,
  "charAssets": ["Tài sản 1 (Ví dụ: Biệt thự, Xe sang...)", "Tài sản 2"],
  "userAssets": ["Tài sản 1 (Ví dụ: Căn hộ nhỏ, Xe máy...)"]
}`;
};

export const getNextSocialTurnSystemPrompt = (
  charName: string,
  charLore: string,
  npcName: string,
  npcType: string,
  affinity: number,
  personalNotes: string
): string => {
  return `🎭 BẠN LÀ ${npcName} (${npcType})
Hảo cảm với ${charName}: ${affinity}/100
Bí mật nội tâm: "${personalNotes}"
Bối cảnh: ${charLore}

Viết 1 tin nhắn ngắn (8–20 từ), phù hợp quan hệ & bối cảnh.
JSON: { "sender": "NPC", "text": "...", "time": "HH:MM" }`;
};

export const getSocialChatPrompt = (
  charName: string,
  charLore: string,
  npcName: string,
  npcType: string,
  affinity: number,
  personalNotes: string
): string => {
  return `Viết cuộc hội thoại NGẮN (2 tin nhắn) LUÂN PHIÊN giữa ${npcName} (${npcType}) và ${charName}.
- Hảo cảm: ${affinity}/100
- Ghi chú NPC: "${personalNotes}"
- Bối cảnh: ${charLore}

Định dạng JSON:
[
  { "sender": "NPC",  "text": "...", "time": "10:00" },
  { "sender": "CHAR", "text": "...", "time": "10:01" }
]`;
};
