export const getNpcGenerationPrompt = (
  charName: string,
  charDesc: string,
  userName: string,
  userDesc: string,
  charPersona: string,
  userPersona: string,
  charAppearance: string,
  userAppearance: string,
  firstMessage: string,
  worldContext: any,
  language: string = 'Tiếng Việt'
): string => {
  return `Dựa trên thông tin chi tiết:
- Nhân vật chính: ${charName} (${charDesc})
- Tính cách & Cốt truyện nhân vật: ${charPersona}
- Ngoại hình nhân vật: ${charAppearance}
- Lời mở đầu của nhân vật: "${firstMessage}"
- Người chơi: ${userName} (${userDesc})
- Vai trò & Tính cách người chơi: ${userPersona}
- Ngoại hình người chơi: ${userAppearance}
- Bối cảnh thế giới: ${worldContext.worldDetail}
- Thể loại: ${worldContext.genre} (Thời đại: ${worldContext.era})

HÃY TẠO HỆ THỐNG XÃ HỘI VÀ KINH TẾ PHÙ HỢP VỚI CỐT TRUYỆN VÀ THỂ LOẠI TRÊN (JSON):

⚠️ LƯU Ý QUAN TRỌNG:
- BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}. NẾU NGÔN NGỮ LÀ 'TIẾNG VIỆT', BẠN PHẢI TRẢ LỜI BẰNG TIẾNG VIỆT. TUYỆT ĐỐI KHÔNG SỬ DỤNG TIẾNG ANH HOẶC BẤT KỲ NGÔN NGỮ NÀO KHÁC TRỪ KHI NGƯỜI DÙNG YÊU CẦU RÕ RÀNG.
- Nếu là HIỆN ĐẠI: Tiền tệ là VND, USD, hoặc "Tiền". NPC là Bác sĩ, Trợ lý, Bạn bè, Người thân, Tình nhân, Chủ nợ, Hàng xóm... (KHÔNG tạo Tộc trưởng, Pháp sư).
- Nếu là CỔ ĐẠI: Tiền tệ là Bạc, Lượng. NPC là Vương gia, Tướng quân, Nô tỳ...
- Nếu là TIÊN HIỆP: Tiền tệ là Linh thạch. NPC là Sư huynh, Chưởng môn...
- QUY TẮC NPC: Tạo CHÍNH XÁC 3-5 NPC. AI phải tự sáng tạo dựa trên cốt truyện nếu không có sẵn thông tin.
- TIÊU CHUẨN CHI TIẾT (SƯỜN MẪU):
  + Tên: Phải đậm chất đời thực/phù hợp bối cảnh.
  + Ngoại hình: Tả cụ thể (vết sẹo, cách ăn mặc, mùi hương, phụ kiện...).
  + Tính cách: Có chiều sâu (ví dụ: ngoài mặt hiền lành nhưng bên trong toan tính).
  + Bí mật/Ghi chú (personalNotes): Phải là một thông tin đắt giá, ảnh hưởng đến cốt truyện (ví dụ: đang nợ tiền nhân vật chính, hoặc đang thầm yêu người chơi).
  + Vai trò: Phải có sự kết nối logic (Chủ nợ, Bạn thân từ nhỏ, Đối thủ cạnh tranh...).
- QUY TẮC TÀI SẢN: Phân bổ tài sản (charMoney, userMoney, charAssets, userAssets) PHẢI PHẢN ÁNH ĐÚNG ĐỊA VỊ VÀ HOÀN CẢNH của nhân vật. Hãy liệt kê các tài sản cụ thể (ví dụ: xe máy cũ, điện thoại nứt màn hình, hoặc biệt thự sân vườn) thay vì chỉ ghi chung chung.

YÊU CẦU JSON:
{
  "relations": [
    { 
      "id": "npc1", 
      "name": "Tên NPC 1 (phù hợp bối cảnh)", 
      "type": "Vai trò (Ví dụ: Tình nhân, Bác sĩ riêng, Mẹ chồng, Hàng xóm...)", 
      "avatar": "", 
      "description": "Mô tả ngắn", 
      "affinityWithChar": 50, 
      "relationshipStatus": "Bình thường/Căng thẳng/Thân thiết",
      "personalNotes": "Ghi chú thầm kín/bí mật của nhân vật này đối với ${charName} hoặc ${userName} (BẮT BUỘC CÓ)"
    }
  ],
  "currencyName": "Tên tiền tệ (Ví dụ: VND, USD, Xu...)",
  "shopNPCs": [
    { "id": "shop1", "name": "Tên chủ shop", "specialty": "Bán gì (Ví dụ: Thời trang, Thuốc, Xe hơi...)", "location": "Địa điểm" }
  ],
  "charMoney": 1000000,
  "userMoney": 50000,
  "charAssets": ["Tài sản 1 (Ví dụ: Biệt thự, Xe sang...)", "Tài sản 2"],
  "userAssets": ["Tài sản 1 (Ví dụ: Căn hộ nhỏ, Xe máy cũ...)"]
}`;
};

export const getNextSocialTurnSystemPrompt = (
  charName: string,
  charLore: string,
  npcName: string,
  npcType: string,
  affinity: number,
  personalNotes: string,
  language: string = 'Tiếng Việt',
  nextSender: 'NPC' | 'CHAR' = 'NPC',
  relations: any[] = [],
  diary: any[] = [],
  userContext: { name: string, description: string, relationshipScore: number } = { name: 'Người dùng', description: '', relationshipScore: 50 }
): string => {
  const relContext = relations.map(r => `- ${r.name} (${r.type}): ${r.personalNotes || 'Không có ghi chú'}`).join('\n');
  const diaryContext = diary.slice(0, 5).map(d => `- [${d.mood}]: ${d.content}`).join('\n');
  
  const roleInstruction = nextSender === 'NPC' 
    ? `🎭 BẠN ĐANG NHẬP VAI: ${npcName} (${npcType})
- Đối tượng nhắn tin: ${charName} (Nhân vật chính)
- Hảo cảm với ${charName}: ${affinity}/100
- Bí mật/Tính cách của bạn: "${personalNotes}"`
    : `🎭 BẠN ĐANG NHẬP VAI: ${charName} (Nhân vật chính)
- Đối tượng nhắn tin: ${npcName} (${npcType})
- Mối quan hệ với ${npcName}: ${affinity}/100
- Ghi chú về ${npcName}: "${personalNotes}"
- Thông tin về bản thân bạn: "${charLore}"
- Mối quan hệ của bạn với ${userContext.name} (Người chơi): ${userContext.relationshipScore}/100. Mô tả: ${userContext.description}
- Nhật ký thầm kín của bạn (Tóm tắt):
${diaryContext || 'Chưa có nhật ký.'}
- Danh sách các mối quan hệ khác của bạn:
${relContext}`;

  return `${roleInstruction}
- Bối cảnh thế giới: ${charLore}

NHIỆM VỤ:
1. Viết 1 tin nhắn ngắn (8–20 từ) phù hợp với tính cách và hoàn cảnh hiện tại.
2. Tuyệt đối không nhầm lẫn vai vế. Bạn đang nhắn tin TRÊN ĐIỆN THOẠI.
3. Nếu bạn là ${charName}, hãy nhớ các sự kiện, nhật ký và mối quan hệ khác trong thế giới.
4. BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.

Định dạng JSON: { "sender": "${nextSender}", "text": "...", "time": "HH:MM" }`;
};

export const getSocialChatPrompt = (
  charName: string,
  charLore: string,
  npcName: string,
  npcType: string,
  affinity: number,
  personalNotes: string,
  language: string = 'Tiếng Việt'
): string => {
  return `Hãy viết một cuộc hội thoại ngắn (2 tin nhắn) LUÂN PHIÊN giữa ${npcName} (${npcType}) và ${charName} trên ứng dụng nhắn tin.

BỐI CẢNH:
- Nhân vật chính: ${charName}
- NPC: ${npcName} (${npcType})
- Mối quan hệ: ${affinity}/100
- Ghi chú về NPC: "${personalNotes}"
- Thế giới: ${charLore}

QUY TẮC:
1. Tin nhắn 1: ${npcName} nhắn cho ${charName}.
2. Tin nhắn 2: ${charName} nhắn lại cho ${npcName}.
3. Tuyệt đối KHÔNG nhắc đến "User" hay "Người chơi". Đây là cuộc hội thoại riêng tư giữa 2 nhân vật trong thế giới.
4. Giọng văn phải phù hợp với tính cách và mối quan hệ của họ.
5. BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.

Định dạng JSON:
[
  { "sender": "NPC",  "text": "...", "time": "10:00" },
  { "sender": "CHAR", "text": "...", "time": "10:01" }
]`;
};
