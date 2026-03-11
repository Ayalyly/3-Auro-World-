import { Character } from '../../types';

export const getWorldContextPrompt = (
  charName: string,
  charDesc: string,
  userName: string,
  userDesc: string,
  rawSetting: string,
  charPersona: string = '',
  userPersona: string = '',
  charAppearance: string = '',
  userAppearance: string = '',
  firstMessage: string = '',
  language: string = 'Tiếng Việt'
): string => {
  return `Bạn là chuyên gia phân tích kịch bản và kiến trúc sư thế giới.
BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.
[DỮ LIỆU ĐẦU VÀO]
- Nhân vật chính: ${charName}
- Mô tả nhân vật: ${charDesc}
- Tính cách & Cốt truyện nhân vật: ${charPersona}
- Ngoại hình nhân vật: ${charAppearance}
- Lời mở đầu của nhân vật: "${firstMessage}"
- Người chơi: ${userName}
- Mô tả người chơi: ${userDesc}
- Vai trò & Tính cách người chơi: ${userPersona}
- Ngoại hình người chơi: ${userAppearance}
- Bối cảnh mong muốn: "${rawSetting || "Dựa theo cốt truyện và tính cách"}"

[NHIỆM VỤ QUAN TRỌNG NHẤT]
Phân tích kỹ TOÀN BỘ dữ liệu trên (đặc biệt là cốt truyện, tính cách và lời mở đầu) để xác định CHÍNH XÁC thể loại (Genre) và Bối cảnh (Setting).

⚠️ QUY TẮC BẮT BUỘC (KHÔNG ĐƯỢC SAI):
1. NẾU cốt truyện là Hiện đại / Đời thực (tình yêu, hôn nhân, công sở, học đường, gia đình, xã hội đen...):
   -> Genre phải là "Hiện đại / Đô thị / Tâm lý".
   -> TUYỆT ĐỐI KHÔNG bịa đặt các yếu tố kỳ ảo (ma pháp, tu tiên, khế ước linh hồn, kết giới, hệ thống, xuyên không...).
   -> Thế giới phải tuân theo vật lý và logic thực tế.

2. NẾU cốt truyện có từ khóa rõ ràng về phép thuật (tu tiên, ma cà rồng, không gian ảo, tận thế zombie...):
   -> Mới được phép thiết lập thế giới Fantasy/Sci-fi.

[YÊU CẦU ĐẦU RA JSON]:
{
  "genre": "Thể loại chính xác (Ví dụ: Hiện đại Đô thị, Ngược tâm, Hào môn thế gia...)",
  "era": "Thời đại (Ví dụ: Thế kỷ 21, Hiện đại...)",
  "techLevel": "Cấp độ công nghệ (Ví dụ: Smartphone, Internet...)",
  "worldDetail": "Mô tả bối cảnh xã hội nơi câu chuyện diễn ra (1-2 câu). Ví dụ: Thành phố phồn hoa nhưng lạnh lẽo, nơi đồng tiền và quyền lực chi phối.",
  "worldRules": ["Quy tắc 1 (Ví dụ: Luật pháp)", "Quy tắc 2 (Ví dụ: Quyền lực ngầm)", "Quy tắc 3 (Ví dụ: Định kiến xã hội)"],
  "tone": "Tông màu cảm xúc (Ví dụ: Bi kịch, U tối, Lãng mạn...)",
  "mainConflict": "Xung đột chính giữa nhân vật và người chơi",
  "coreLore": "Tóm tắt ngắn gọn cốt truyện"
}`;
};

export const getAnalyzeUserLorePrompt = (
  charName: string,
  charDesc: string,
  userName: string,
  userDesc: string,
  rawSetting: string,
  charPersona: string = '',
  userPersona: string = '',
  charAppearance: string = '',
  userAppearance: string = '',
  firstMessage: string = '',
  language: string = 'Tiếng Việt'
): string => {
  return `Bạn là kiến trúc sư thế giới đa thể loại (cổ đại, hiện đại, tiên hiệp, ABO, thú nhân, tinh tế, sci-fi,...).
BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.

[THÔNG TIN CHI TIẾT]
- Nhân vật chính: ${charName}
  Mô tả: ${charDesc}
  Tính cách & Cốt truyện: ${charPersona}
  Ngoại hình: ${charAppearance}
  Lời mở đầu: "${firstMessage}"

- Người chơi: ${userName}
  Mô tả: ${userDesc}
  Vai trò & Tính cách: ${userPersona}
  Ngoại hình: ${userAppearance}

[BỐI CẢNH DO USER NHẬP]
"${rawSetting || "Chưa cung cấp rõ ràng, hãy tự suy luận từ cốt truyện và tính cách."}"

[NHIỆM VỤ]
1. Phân tích TẤT CẢ thông tin trên để suy ra thể loại (genre) phù hợp nhất: ví dụ "cổ đại cung đấu", "hiện đại đô thị", "tiên hiệp", "ABO học viện", "thú nhân bộ lạc", "tinh tế đế quốc", "sci-fi cyberpunk",...
2. Xác định:
   - era: thời đại (cổ đại / cận đại / hiện đại / tương lai / ngoài vũ trụ / ...).
   - techLevel: cấp độ công nghệ ("phi điện", "công nghiệp", "điện tử", "liên tinh").
   - powerSystem: hệ thống sức mạnh nếu có ("tu linh khí", "dị năng", "pheromone ABO", "thú hóa",...).
   - species: các giống loài chính (nhân loại, thú nhân, alpha/omega, máy móc,...).
3. Tóm tắt coreLore (1–3 câu) và mainConflict (xung đột cốt lõi giữa ${charName} và ${userName}).
4. Chọn vibe (tông cảm xúc) và timelineSnapshot (giai đoạn hiện tại trong cốt truyện).

TRẢ VỀ JSON:
{
  "genre": "string",
  "era": "string",
  "techLevel": "string",
  "powerSystem": "string",
  "species": ["..."],
  "coreLore": "1–3 câu",
  "mainConflict": "xung đột giữa hai nhân vật",
  "vibe": "tông cảm xúc",
  "timelineSnapshot": "giai đoạn hiện tại"
}`;
};

export const getWorldSettingPrompt = (loreAnalysis: any, language: string = 'Tiếng Việt'): string => {
  return `Dựa trên phân tích sau:
${JSON.stringify(loreAnalysis, null, 2)}

Hãy xây dựng thế giới tổng thể nhất quán với "genre" và "era".
BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.

YÊU CẦU:
- worldDetail: Miêu tả chi tiết thế giới (không cần quá dài, 1–2 đoạn), bao gồm:
  • Không gian (đế quốc, thành phố, tông môn, học viện,...)
  • Cấu trúc xã hội (giai cấp, chức vụ, luật lệ cơ bản)
  • Bối cảnh chung (hoà bình, chiến tranh, tranh đấu quyền lực...)

- worldRules: Mảng 3–7 quy tắc / luật chơi cốt lõi của thế giới:
  • Ví dụ tiên hiệp: cảnh giới tu luyện, thiên kiếp, tông môn tranh đấu...
  • Ví dụ ABO: pheromone, heat, dấu ấn, luật bảo vệ...
  • Ví dụ thú nhân: luật bầy đàn, đánh dấu bạn đời, mùa săn...
  • Ví dụ tinh tế: luật liên bang, cấm sử dụng vũ khí hạt nhân, hệ thứ bậc quân hàm...

- tone: Giọng điệu chung (u ám, xa hoa lạnh lẽo, chữa lành, điên cuồng,...).

TRẢ VỀ JSON:
{
  "worldDetail": "string",
  "worldRules": ["..."],
  "tone": "string"
}`;
};

export const getSocialMemoryPrompt = (
  charName: string,
  charDesc: string,
  userName: string,
  userDesc: string,
  charPersona: string,
  userPersona: string,
  worldGenesis: any,
  loreAnalysis: any,
  language: string = 'Tiếng Việt'
): string => {
  return `Dựa trên thông tin chi tiết:
- Nhân vật chính: ${charName} (${charDesc})
- Tính cách & Cốt truyện nhân vật: ${charPersona}
- Người chơi: ${userName} (${userDesc})
- Vai trò & Tính cách người chơi: ${userPersona}
- Thế giới: ${worldGenesis.worldDetail || "Chưa rõ"}
- Thể loại: ${loreAnalysis.genre || "Chưa rõ"}
- Xung đột chính: ${loreAnalysis.mainConflict || "Chưa rõ"}

TẠO RA 3-5 NPC QUAN TRỌNG đối với ${charName} HOẶC ${userName}:
BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.

YÊU CẦU:
- Mỗi NPC:
  {
    "id": "string",
    "name": "Tên phù hợp văn hoá & thể loại",
    "type": "Vai trò cụ thể (vợ cũ, thư ký, sư huynh, thủ lĩnh thú nhân, đội trưởng chiến hạm, hàng xóm, chủ nợ...)",
    "affinityWithChar": 0–100,
    "relationshipStatus": "Thân thiết/Bình thường/Căng thẳng/Xa cách",
    "personalNotes": "Ghi chú thầm kín/bí mật của nhân vật này đối với ${charName} hoặc ${userName} (BẮT BUỘC CÓ). Ví dụ: 'Thương hại nhưng không dám nói', 'Lợi dụng để thăng tiến'...",
    "avatar": "tạm để trống hoặc emoji"
  }
- Quan hệ & vai trò phải cực kỳ phù hợp với cốt truyện, tính cách nhân vật và thể loại (cổ đại, tiên hiệp, ABO, thú nhân, tinh tế, hiện đại,...).
- Đảm bảo các NPC tạo ra sự phong phú cho câu chuyện (có người giúp đỡ, có người cản trở, có người trung lập).

TRẢ VỀ JSON:
{ "relations": [ ... ] }`;
};

export const getEconomyPrompt = (
  charName: string,
  charDesc: string,
  userName: string,
  userDesc: string,
  charPersona: string,
  userPersona: string,
  worldGenesis: any,
  language: string = 'Tiếng Việt'
): string => {
  return `Dựa trên thông tin chi tiết:
- Nhân vật chính: ${charName} (${charDesc})
- Tính cách & Cốt truyện nhân vật: ${charPersona}
- Người chơi: ${userName} (${userDesc})
- Vai trò & Tính cách người chơi: ${userPersona}
- Thế giới: "${worldGenesis.worldDetail || "Chưa rõ"}"

Hãy thiết kế hệ thống kinh tế CƠ BẢN:
BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.

YÊU CẦU:
- currencyName: tên tiền tệ, phù hợp thể loại & không gian văn hoá:
  • Cổ đại: "Lượng", "Bạc", "Quan tiền",...
  • Tiên hiệp: "Linh thạch", "Huyền tinh",...
  • Hiện đại/Đô thị: "Đồng", "VND", "USD", "Yên",...
  • Tinh tế/Interstellar: "Liên Bang Tệ", "星币", "StarCoin",...
  • Thú nhân: tùy biến nhưng hợp lý.
- shopNPCs: 2–3 chủ shop phù hợp thế giới (quán rượu, tiệm dược, đấu giá hội, boutique cao cấp, cửa hàng vũ khí, gara chiến hạm,...).

TRẢ VỀ JSON:
{
  "currencyName": "string",
  "shopNPCs": [
    { "id": "npc1", "name": "Tên", "personality": "Tính cách", "specialty": "Mặt hàng chính", "location": "Vị trí shop" }
  ]
}`;
};

export const getOnIdleThoughtPrompt = (
  character: Character,
  diary: any[] = []
): string => {
  const diaryContext = diary.length > 0 
    ? `\n[NHẬT KÝ THẦM KÍN - KÝ ỨC QUAN TRỌNG]:\n${diary.slice(-5).map(d => `- Ngày ${new Date(d.date).toLocaleDateString()}: ${d.content}`).join('\n')}`
    : '';

  const financialStatus = `\n[TÀI CHÍNH]: ${character.money?.toLocaleString()} ${character.world?.currencyName || "Xu"}
${(character.money || 0) < 0 ? "⚠️ BẠN ĐANG NỢ! Bạn cảm thấy vô cùng áp lực và lo lắng về tiền bạc." : ""}`;

  return `Nhân vật: ${character.name}
Mô tả: ${character.description}${diaryContext}${financialStatus}

Hãy viết một suy nghĩ ngắn (dưới 15 từ) của nhân vật trong đầu lúc này dựa trên lịch sử trò chuyện, nhật ký ký ức và tình trạng tài chính.
Cũng xác định tâm trạng (mood) phù hợp: "happy", "sad", "angry", "love", "neutral".

⚠️ BẮT BUỘC: Hoàn tất câu trả lời một cách trọn vẹn, không để bị cắt ngang.

JSON: { "text": "...", "mood": "..." }`;
};

export const getInitialAssetsPrompt = (
  charName: string,
  charDesc: string,
  userName: string,
  userDesc: string,
  charPersona: string,
  userPersona: string,
  charAppearance: string,
  userAppearance: string,
  firstMessage: string,
  worldGenesis: any,
  loreAnalysis: any,
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
- Thế giới: ${worldGenesis.worldDetail || "Chưa rõ"}
- Thể loại: ${loreAnalysis.genre || "Chưa rõ"}

Hãy thiết kế tài sản, bất động sản, dòng tiền và vật phẩm BAN ĐẦU một cách CỰC KỲ CHI TIẾT VÀ HỢP LÝ. AI phải tự suy luận dựa trên hoàn cảnh nhân vật nếu không có sẵn.

⚠️ TIÊU CHUẨN CHI TIẾT (SƯỜN MẪU):
- Properties (Nơi ở): Không chỉ ghi "Nhà", hãy ghi "Căn hộ chung cư cũ 45m2, tường bong tróc" hoặc "Biệt thự ven sông, nội thất dát vàng".
- Income (Dòng tiền vào): Ghi rõ nguồn (Lương văn phòng, Tiền thuê nhà, Trợ cấp gia đình...).
- Expenses (Dòng tiền ra): Các khoản chi cố định (Tiền thuốc men cho mẹ, Tiền trả góp xe, Tiền ăn uống...).
- Assets (Tài sản): Liệt kê vật phẩm có giá trị sử dụng (Xe máy Wave cũ, Laptop gaming, Đồng hồ hiệu...).
- Debts (Nợ nần): Nếu nhân vật nghèo/vất vả, hãy thêm các khoản nợ (Nợ tín dụng, Nợ xã hội đen, Nợ bạn bè...).
- Money (Tiền mặt): Con số phải khớp với logic chi tiêu/thu nhập.
- TÀI CHÍNH CHI TIẾT: Phải bao gồm cả các khoản nợ, các khoản đầu tư (nếu có), và các tài sản vô hình (nếu có).
- SO SÁNH ĐỊA VỊ: Đảm bảo sự chênh lệch giàu nghèo giữa các nhân vật (nếu có trong cốt truyện) được thể hiện rõ qua tài sản và thu nhập.

YÊU CẦU JSON:
{
  "charMoney": 100000,
  "userMoney": 1000,
  "charInventory": [
    { "id": "item1", "name": "Tên vật phẩm", "description": "Mô tả chi tiết tình trạng", "value": 50000, "quantity": 1 }
  ],
  "userInventory": [
    { "id": "item2", "name": "Tên vật phẩm", "description": "Mô tả chi tiết tình trạng", "value": 100000, "quantity": 1 }
  ],
  "charProperties": [
    { "id": "p1", "name": "Tên nhà/nơi ở", "description": "Mô tả chi tiết (Ví dụ: Căn biệt thự xa hoa, Phòng trọ nhỏ...)", "value": 500000, "isShared": false }
  ],
  "userProperties": [],
  "incomeStreams": [
    { "id": "inc1", "name": "Nguồn thu nhập (Ví dụ: Lương giám đốc, Tiền làm thêm...)", "type": "salary|rental|investment|business|passive", "amount": 5000, "frequency": "monthly", "nextPayment": 1234567890, "isActive": true }
  ],
  "expenses": [
    { "id": "exp1", "name": "Khoản chi (Ví dụ: Tiền thuê nhà, Phí sinh hoạt...)", "amount": 2000, "frequency": "monthly", "nextPayment": 1234567890, "isActive": true }
  ],
  "transactions": [
    { "id": "tx1", "type": "IN", "amount": 100000, "description": "Tiền tiết kiệm ban đầu", "date": 1234567890 }
  ]
}`;
};
