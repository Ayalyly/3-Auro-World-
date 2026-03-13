export const getDonationVerificationPrompt = (
  expectedAmount: number,
  expectedCode: string
): string => {
  return `Bạn là một hệ thống kiểm tra giao dịch chuyển khoản.
Hãy xem xét hình ảnh biên lai chuyển khoản này và xác minh 2 thông tin sau:
1. Số tiền chuyển khoản có đúng là ${expectedAmount} VNĐ không? (Có thể có dấu phẩy hoặc chấm phân cách hàng nghìn).
2. Nội dung chuyển khoản có chứa chính xác đoạn mã sau không: "${expectedCode}"?

Trả về kết quả dưới định dạng JSON:
{
  "success": true/false,
  "message": "Lý do chi tiết (ví dụ: 'Xác minh thành công', 'Số tiền không khớp', 'Không tìm thấy mã ủng hộ', 'Ảnh không rõ ràng', v.v.)"
}`;
};

export const getGachaRewardPrompt = (
  charName: string,
  charPrompt: string,
  rewardType: string
): string => {
  return `Bạn là hệ thống sinh phần thưởng "Xé Túi Mù" (Blind Bag) cho trò chơi "Auro World".
Dựa trên thông tin nhân vật sau:
Tên: ${charName}
Mô tả/Tính cách: ${charPrompt}

Hãy sinh một phần thưởng ngẫu nhiên ẩn giấu trong túi mù thuộc loại: "${rewardType}".
Các loại phần thưởng có thể là:
- furniture: Một món đồ nội thất độc đáo phù hợp với phong cách của nhân vật.
- item: Một vật phẩm đặc biệt, có thể là quà tặng hoặc đồ dùng cá nhân của nhân vật.
- story: Một cột mốc quan trọng trong quá khứ hoặc tương lai của nhân vật (Timeline).
- memory: Một ký ức sâu sắc, bí mật hoặc kỷ niệm đẹp của nhân vật (Memory).
- situation: Một gợi ý tình huống mới, kịch tính hoặc lãng mạn để người chơi bắt đầu chat với nhân vật.

Yêu cầu:
- Nội dung phải cực kỳ sáng tạo, mang đậm dấu ấn cá nhân của nhân vật ${charName}.
- Nếu là furniture/item: Cần có icon (emoji) phù hợp.
- Nếu là story/memory: Cần có tiêu đề hấp dẫn và mô tả chi tiết, giàu cảm xúc.
- Nếu là situation: Cần là một lời dẫn dắt để người chơi có thể nhập vai ngay lập tức.

Trả về kết quả dưới định dạng JSON:
{
  "type": "${rewardType}",
  "name": "Tên phần thưởng (hoặc tiêu đề)",
  "description": "Mô tả chi tiết phần thưởng hoặc nội dung tình huống/ký ức",
  "icon": "Emoji phù hợp (chỉ dành cho furniture/item/memory)"
}`;
};
