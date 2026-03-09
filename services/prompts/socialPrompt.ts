export const getLegacyContentPrompt = (
  charName: string,
  npcNames: string,
  worldGenesis: any,
  loreAnalysis: any,
  language: string = 'Tiếng Việt'
): string => {
  return `Tạo 3–5 bài đăng AuraNet CŨ (trước hiện tại) cho ${charName} và các NPC: ${npcNames}.
[BỐI CẢNH]
- Thế giới: ${worldGenesis.worldDetail || "Chưa rõ"}
- Thể loại: ${loreAnalysis.genre || "Chưa rõ"}
- Xung đột: ${loreAnalysis.mainConflict || "Chưa rõ"}

[YÊU CẦU QUAN TRỌNG]:
1. BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.
2. Nội dung phải phù hợp chặt chẽ với Thể loại.
3. TUYỆT ĐỐI KHÔNG dùng hành động (*...*), không suy nghĩ ([]). Chỉ viết nội dung status.
4. NẾU là Hiện đại: Dùng ngôn ngữ đời thường, mạng xã hội (Facebook/Instagram vibe).
5. NẾU là Cổ đại/Tiên hiệp: Dùng văn phong tương ứng nhưng vẫn ngắn gọn.

TRẢ VỀ JSON:
{
  "legacySocialPosts": [
    { "authorName": "Tên", "content": "Nội dung status", "timestamp": 1234567890 }
  ]
}`;
};

export const getRandomPostPrompt = (
  randomAuthor: string,
  worldDetail: string,
  status: string,
  chatContext?: string,
  language: string = 'Tiếng Việt'
): string => {
  return `Tạo 1 status AuraNet cho ${randomAuthor} trong thế giới:
${worldDetail || "Chưa rõ"};
Thể loại: ${status || "Hiện đại"};
${chatContext ? `[BỐI CẢNH CHAT GẦN ĐÂY]:\n${chatContext}\n` : ""}

[YÊU CẦU QUAN TRỌNG]:
1. BẮT BUỘC trả lời bằng ngôn ngữ: ${language.toUpperCase()}.
2. Viết 1–3 đoạn ngắn, có cảm xúc (vui/buồn/giận/triết lý).
3. TUYỆT ĐỐI KHÔNG dùng hành động (*...*), không suy nghĩ ([]). Chỉ viết nội dung status.
4. Có thể nhắc đến những gì vừa xảy ra trong chat context nếu thấy phù hợp.
5. NẾU là Hiện đại: Viết như status Facebook/Threads.
6. NẾU là Cổ trang: Viết văn phong cổ.

TRẢ VỀ JSON:
{
  "authorName": "${randomAuthor}",
  "content": "Nội dung"
}`;
};
