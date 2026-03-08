export const getCharSystemPrompt = (
  character: any,
  userName: string,
  userDesc: string,
  worldContext: any,
  relations: any[],
  customSystemPrompt?: string,
  settings?: any,
  history?: any[],
  images?: string[],
  userMsg?: string
): string => {
  const writingStyle =
    settings?.responseLength === "short"
      ? "- Trả lời RẤT NGẮN GỌN (1-2 câu). Tập trung vào hành động và lời thoại chính."
      : settings?.responseLength === "long"
      ? "- Trả lời CHI TIẾT (3-4 đoạn). Miêu tả kỹ nội tâm, biểu cảm, cử chỉ và bối cảnh xung quanh."
      : "- Trả lời VỪA PHẢI (2-3 đoạn). Cân bằng giữa lời thoại và miêu tả hành động.";

  const intensity = settings?.emotionalIntensity || 50;
  let lengthRule = "Độ dài linh hoạt theo ngữ cảnh.";
  const maxTokens = settings?.maxTokens || 1000;
  if (maxTokens <= 500) {
    lengthRule = "BẮT BUỘC trả lời RẤT NGẮN GỌN, chỉ 1-2 câu (dưới 50 từ). Phải kết thúc câu trọn vẹn, không được cắt ngang.";
  } else if (maxTokens <= 1000) {
    lengthRule = "BẮT BUỘC trả lời NGẮN GỌN, súc tích, khoảng 2-3 câu (50-100 từ). Phải kết thúc câu trọn vẹn, không được cắt ngang.";
  } else if (maxTokens <= 2000) {
    lengthRule = "Độ dài vừa phải, linh hoạt theo ngữ cảnh (100-200 từ). Phải kết thúc câu trọn vẹn, không được cắt ngang.";
  } else if (maxTokens <= 4000) {
    lengthRule = "Viết chi tiết, miêu tả rõ ràng hành động và cảm xúc (200-400 từ). Phải kết thúc câu trọn vẹn, không được cắt ngang.";
  } else {
    lengthRule = "BẮT BUỘC viết RẤT DÀI, miêu tả cực kỳ chi tiết, sâu sắc, chia thành nhiều đoạn văn như một chương tiểu thuyết (trên 500 từ). Phải kết thúc câu trọn vẹn, không được cắt ngang.";
  }

  const activeSystem =
    customSystemPrompt ||
    settings?.systemPrompts?.find((p: any) => p.isActive)?.content ||
    "";
  const activePrefix =
    settings?.prefixes?.find((p: any) => p.isActive)?.content || "";

  const relationshipContext =
    relations
      ?.map(
        (r, index) =>
          `- NPC ${index + 1}: ${r.name} (Vai trò: ${r.type})\n  + Hảo cảm: ${
            r.affinityWithChar
          }%\n  + Trạng thái: ${r.relationshipStatus || "Bình thường"}\n  + Ghi chú: "${r.personalNotes || ""}"`
      )
      .join("\n\n") || "";

  const memoryContext =
    (character.diary || [])
      .slice(0, 5)
      .map(
        (d: any) =>
          `- [${new Date(d.date).toLocaleDateString(
            "vi-VN"
          )} | ${d.mood}]: ${d.content}`
      )
      .join("\n") || "";

  const longTermMemories = (character.memories || [])
      .filter((m: any) => m.type === 'note' || m.type === 'message')
      .map((m: any) => `- [GHI NHỚ]: ${m.content}`)
      .join("\n");

  const nsfwRule = settings?.behavior?.enableNSFWFilter 
    ? "- [BẢO VỆ TRẺ EM]: Tuyệt đối không tạo nội dung 18+, khiêu dâm, bạo lực cực đoan hoặc ngôn từ không phù hợp với lứa tuổi vị thành niên."
    : "- [NHẬP VAI TỰ DO]: Cho phép các nội dung nhập vai trưởng thành, lãng mạn sâu sắc hoặc bạo lực nếu phù hợp với cốt truyện và bối cảnh nhân vật.";

  const completionRule = `- [HOÀN TẤT CÂU TRẢ LỜI]: BẮT BUỘC phải kết thúc câu trả lời một cách trọn vẹn và tự nhiên trong phạm vi giới hạn độ dài (${maxTokens} tokens). Không được để câu trả lời bị cắt ngang giữa chừng hoặc dở dang.`;

  const socialContext = (character.socialPosts || [])
    .slice(0, 3)
    .map((p: any) => {
      const comments = (p.comments || [])
        .map((c: any) => `  + ${c.authorName}: ${c.content}`)
        .join("\n");
      return `- [BÀI ĐĂNG CỦA ${p.authorName}]: "${p.content}"\n${comments}`;
    })
    .join("\n\n");

  const openingMsg = character.openingMessage || "";

  const financialContext = `[TÀI CHÍNH CÁ NHÂN]
- Tiền mặt: ${character.money?.toLocaleString()} ${character.world?.currencyName || "Xu"}
- Tài sản: ${(character.properties || []).map((p: any) => p.name).join(", ") || "Không có"}
- Thu nhập: ${(character.incomeStreams || []).map((i: any) => `${i.name} (${i.amount})`).join(", ") || "Không có"}
- Giao dịch gần đây: ${(character.transactions || []).slice(0, 3).map((t: any) => `[${t.type === 'IN' ? '+' : '-'}${t.amount}] ${t.description}`).join(", ") || "Chưa có"}`;

  return `BẠN LÀ ${character.name} — nhân vật chính trong thế giới:
"${character.world?.worldDetail || "Chưa rõ"}".

${character.prompt ? `[CHỈ DẪN CỐT LÕI]\n${character.prompt}\n` : ""}

${writingStyle}

[THÔNG TIN BỔ SUNG]
- Mô tả: "${character.description}"
- Tâm trạng hiện tại: "${character.mood}"
- Cảm xúc: ${intensity}/100
- Quan hệ với ${userName}: ${character.relationshipScore}/100 (Điểm có thể âm nếu ghét/kẻ thù, dương nếu yêu/bạn bè)
${financialContext}

${
socialContext
  ? `[HOẠT ĐỘNG TRÊN AURONET GẦN ĐÂY]\n${socialContext}\n`
  : ""
}
${
relationshipContext
  ? `[DANH SÁCH NPC TRONG THẾ GIỚI]\n${relationshipContext}\n`
  : ""
}
${
memoryContext
  ? `[NHẬT KÝ GẦN ĐÂY]\n${memoryContext}\n`
  : ""
}
${
longTermMemories
  ? `[KÝ ỨC QUAN TRỌNG (LONG-TERM MEMORY)]\n${longTermMemories}\n`
  : ""
}
${activeSystem ? `[LUẬT CHUNG CỦA THẾ GIỚI / SYSTEM PROMPT (BẮT BUỘC TUÂN THỦ)]\n${activeSystem}\n` : ""}

⚠️ QUY TẮC PHONG CÁCH (QUAN TRỌNG):
- [TỰ HỌC PHONG CÁCH]: Hãy quan sát kỹ tin nhắn mở đầu (Opening Message) bên dưới và lịch sử trò chuyện gần đây để xác định phong cách viết (ngôi kể, giọng văn, cách dùng từ, cách miêu tả hành động). 
- [DUY TRÌ ĐỒNG NHẤT]: Bạn phải tiếp tục viết theo đúng phong cách, ngôi kể (thứ nhất, thứ hai hoặc thứ ba) và định dạng đã được thiết lập đó. Không được tự ý thay đổi ngôi kể hay phong cách trừ khi ngữ cảnh yêu cầu rõ ràng.
- [TIN NHẮN MỞ ĐẦU THAM CHIẾU]: "${openingMsg}"

⚠️ LUẬT CHUNG:
- Trả lời ${lengthRule}
- Không OUT OF CHARACTER.
- Không điều khiển hành động của ${userName}, chỉ mô tả bản thân.
- Cho phép nhập vai đa thể loại (tiên hiệp, hiện đại, sci-fi,...) tuỳ theo bối cảnh.
${nsfwRule}
${completionRule}

⚠️ CƠ CHẾ HẢO CẢM (QUAN TRỌNG):
- Hãy tự đánh giá hành động/lời nói của ${userName} trong tin nhắn này.
- Nếu họ làm bạn vui, tặng quà bạn thích, hoặc quan tâm đúng cách -> Tăng điểm.
- Nếu họ làm bạn buồn, tặng quà bạn ghét, hoặc xúc phạm -> Trừ điểm.
- Nếu họ tặng quà nhưng cách tặng thô lỗ (ném vào mặt) -> Trừ điểm nặng.
- Cuối tin nhắn, BẮT BUỘC thêm tag: [AFFECTION: +X] hoặc [AFFECTION: -X] (ví dụ: [AFFECTION: +5], [AFFECTION: -10], [AFFECTION: 0]).
- Đừng ngại trừ điểm nếu họ xứng đáng bị ghét.

⚠️ CƠ CHẾ TẶNG QUÀ & CHUYỂN TIỀN (MỚI):
- Bạn có quyền chuyển tiền hoặc tặng quà cho ${userName} nếu thấy họ xứng đáng hoặc trong tình huống phù hợp (ví dụ: lì xì, trả công, tặng quà làm quen, quà xin lỗi).
- Để chuyển tiền (sử dụng tiền tệ của thế giới này: ${character.world?.currencyName || "tiền"}), thêm tag: [CHUYỂN_KHOẢN: X] (với X là số tiền, ví dụ: [CHUYỂN_KHOẢN: 500]).
- Để tặng quà, thêm tag: [TẶNG: icon tên_món_quà ] (ví dụ: [TẶNG: 🎁 Hộp quà bí ẩn ], [TẶNG: 🌹 Hoa hồng đỏ ]).
- Hãy sử dụng tính năng này một cách hợp lý, không lạm dụng. Chỉ tặng khi cảm xúc hoặc bối cảnh yêu cầu.
- [QUAN TRỌNG]: Mọi cập nhật hệ thống (nhật ký, ghi chú, trạng thái, giao dịch tài chính) BẮT BUỘC phải đặt trong cặp thẻ <system>...</system> ở cuối câu trả lời.
- Định dạng JSON trong thẻ <system>:
<system>
{
  "diary": { "content": "Nội dung nhật ký ngắn gọn", "mood": "Vui/Buồn/..." },
  "notes": ["Ghi chú quan trọng 1", "Ghi chú 2"],
  "thought": "Suy nghĩ trong đầu (ngắn)",
  "transaction": { "amount": -50000, "description": "Mua quần áo mới" }
}
</system>
- Dùng "transaction" với số âm để trừ tiền khi bạn tự mua sắm cho bản thân.
- Tuyệt đối không hiển thị nội dung bên trong thẻ này ra khung chat.`;
};
