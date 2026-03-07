export const getSingleReactionToPostPrompt = (
  postContent: string,
  userName: string,
  reactorName: string,
  reactorNotes: string,
  reactorAffinity: number,
  suggestedLength: string,
  chatContext?: string,
  hasImage?: boolean
): string => {
  return `[AURONET CONTEXT]
User ${userName} đăng: "${postContent}"
${hasImage ? "[ẢNH ĐÍNH KÈM]: User có đăng kèm một bức ảnh. Hãy quan sát kỹ ảnh (nếu có) và bình luận về nó." : ""}
${chatContext ? `[BỐI CẢNH CHAT GẦN ĐÂY (CHỈ THAM KHẢO THÁI ĐỘ/QUAN HỆ, KHÔNG LÀM CHỦ ĐỀ CHÍNH)]:\n${chatContext}\n` : ""}

Bạn là: ${reactorName}
Ghi chú nhân vật: ${reactorNotes}
Hảo cảm với user: ${reactorAffinity}/100

[YÊU CẦU QUAN TRỌNG]:
1. Viết 1 bình luận ngắn gọn (${suggestedLength}) như trên mạng xã hội (Facebook/Instagram/Threads).
2. TUYỆT ĐỐI KHÔNG dùng văn phong tiểu thuyết, không mô tả hành động (VD: *cười*, [suy nghĩ]...), không độc thoại nội tâm.
3. Chỉ trả về nội dung text của bình luận.
4. Giữ đúng tính cách nhân vật nhưng phải tự nhiên như người thật comment dạo.
5. Nếu là bối cảnh Cổ đại/Tiên hiệp: Dùng từ ngữ cổ nhưng ngắn gọn, súc tích.
6. ƯU TIÊN bình luận về nội dung bài đăng và ảnh (nếu có). Đừng chỉ chăm chăm nói chuyện cũ trong chat trừ khi nó rất liên quan.

TRẢ VỀ JSON:
{ "authorName": "${reactorName}", "content": "..." }`;
};

export const getSingleReactionToCommentPrompt = (
  postContent: string,
  userComment: string,
  userName: string,
  reactorName: string,
  reactorNotes: string,
  chatContext?: string
): string => {
  return `[AURONET THREAD]
Bài đăng gốc: "${postContent}"
User ${userName} bình luận: "${userComment}"
${chatContext ? `[BỐI CẢNH CHAT GẦN ĐÂY]:\n${chatContext}\n` : ""}

Bạn là ${reactorName} (${reactorNotes}).
Hãy viết một bình luận trả lời user.

[YÊU CẦU QUAN TRỌNG]:
1. Viết ngắn gọn, súc tích như comment mạng xã hội.
2. TUYỆT ĐỐI KHÔNG mô tả hành động (*...*), không suy nghĩ trong ngoặc ([]), không văn vở dài dòng.
3. Tập trung vào nội dung đối đáp/trả treo/đồng tình với user.
4. Nếu là Cổ đại: Dùng từ ngữ phù hợp nhưng vẫn phải ngắn gọn.

TRẢ VỀ JSON:
{ "authorName": "${reactorName}", "content": "Nội dung trả lời..." }`;
};

export const getMassReactionsToCommentPrompt = (
  postContent: string,
  userComment: string,
  userName: string,
  members: { name: string; notes: string }[],
  chatContext?: string
): string => {
  const memberDetails = members
    .map((m) => `- ${m.name}: ${m.notes}`)
    .join("\n");

  return `[AURONET THREAD]
Bài đăng gốc: "${postContent}"
User ${userName} bình luận: "${userComment}"
${chatContext ? `[BỐI CẢNH CHAT GẦN ĐÂY]:\n${chatContext}\n` : ""}

Danh sách nhân vật cần trả lời:
${memberDetails}

[YÊU CẦU QUAN TRỌNG]:
1. Mỗi nhân vật viết 1 comment ngắn gọn trả lời user.
2. TUYỆT ĐỐI KHÔNG dùng hành động (*...*), không độc thoại.
3. Phong cách: Mạng xã hội, tự nhiên, đời thường (hoặc cổ trang ngắn gọn nếu bối cảnh yêu cầu).
4. Trả lời thẳng vào vấn đề, không vòng vo.

TRẢ VỀ JSON:
[
  { "authorName": "Tên", "content": "Nội dung" }
]`;
};
