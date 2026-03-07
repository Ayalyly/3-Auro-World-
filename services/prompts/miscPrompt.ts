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
