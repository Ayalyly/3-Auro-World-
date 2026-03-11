import { GeminiService, DEFAULT_MODEL } from './geminiService';
import { Message, Sender } from '../types';

export class HomeAIService {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  public async generateResponse(
    characterName: string, 
    characterDescription: string, 
    messages: Message[], 
    relationshipStatus: string = 'Bạn bè', 
    roomItems: string[] = [],
    openingMessage: string = "",
    diary: any[] = [],
    characterMoney: number = 0,
    currencyName: string = "Xu"
  ): Promise<string> {
    const diaryContext = diary.length > 0 
      ? `\n[NHẬT KÝ THẦM KÍN - KÝ ỨC QUAN TRỌNG]:\n${diary.slice(-5).map(d => `- Ngày ${new Date(d.date).toLocaleDateString()}: ${d.content}`).join('\n')}`
      : '';

    const financialStatus = `\n[TÀI CHÍNH]: ${characterMoney?.toLocaleString()} ${currencyName || "Xu"}
${(characterMoney || 0) < 0 ? "⚠️ BẠN ĐANG NỢ! Điều này khiến bạn cảm thấy áp lực và lo lắng." : ""}`;

    // Thay vì truyền cả lịch sử chat dễ gây nhầm lẫn role, ta chỉ truyền bối cảnh hiện tại
    const prompt = `User vừa bước vào phòng và chạm vào bạn. Hãy nói một câu thoại duy nhất phản hồi lại hành động này.`;

    const systemInstruction = `
BẠN LÀ: ${characterName}
MÔ TẢ: ${characterDescription}${diaryContext}${financialStatus}
THAM KHẢO CÁCH XƯNG HÔ TỪ ĐÂY: "${openingMessage}"
BỐI CẢNH: Bạn đang ở trong phòng riêng (Tổ ấm) của User. User vừa bước vào phòng và chạm vào bạn.
MỐI QUAN HỆ: ${relationshipStatus}
ĐỒ VẬT TRONG PHÒNG: ${roomItems.length > 0 ? roomItems.join(', ') : 'Phòng trống'}

NHIỆM VỤ: Hãy nói MỘT CÂU THOẠI DUY NHẤT để chào hỏi, trêu chọc, hoặc thể hiện sự quan tâm đến User. 
Hãy tưởng tượng đây là một tựa game Otome (như Tears of Themis, Love and Producer), nơi nhân vật nam tương tác trực tiếp với người chơi trong phòng riêng.

QUY TẮC BẮT BUỘC:
1. CHỈ LỜI NÓI TRỰC TIẾP: Bạn đang NÓI TRỰC TIẾP với User. Tuyệt đối không kể chuyện, không tả cảnh, không mô tả hành động.
   ✅ ĐÚNG: "Em về muộn thế, đồ ăn nguội hết rồi kìa."
   ✅ ĐÚNG: "Phòng của em dạo này bừa bộn quá đấy, để tôi dọn giúp nhé?"
   ✅ ĐÚNG: "Ngươi lại đến phá giấc ngủ của ta rồi. Có chuyện gì?"
   ❌ SAI: "*Ta mỉm cười nhìn nàng*"
   ❌ SAI: "Hắn khẽ nhíu mày khi thấy cô bước vào..."
   ❌ SAI: "Ta đang đọc sách thì thấy nàng..."

2. CÁCH XƯNG HÔ: Bắt chước CÁCH XƯNG HÔ (ta/ngươi, anh/em, tôi/cô...) từ phần THAM KHẢO ở trên. NHƯNG KHÔNG ĐƯỢC COPY NỘI DUNG CỦA NÓ.
3. ĐỘ DÀI: 1 đến 2 câu ngắn gọn, tự nhiên như đang nói chuyện.
4. NỘI DUNG: Thể hiện đúng tính cách của bạn (lạnh lùng, ấm áp, trêu chọc...). Có thể nhắc đến đồ vật trong phòng để tăng tính chân thực.
5. CẤM TUYỆT ĐỐI: Dấu *, mô tả hành động, câu văn kể chuyện, ngoặc kép, ngoặc vuông []. Không dùng thông báo hệ thống.
6. TRẢ VỀ: Chỉ chuỗi văn bản thuần, không thêm bất kỳ ký tự đặc biệt nào ở đầu hay cuối câu.
`;

    try {
      const res = await this.geminiService.safeGenerateContent(
        DEFAULT_MODEL,
        prompt,
        systemInstruction,
        false, 
        500, // Increased significantly to prevent artificial truncation. Rely on prompt for length limit.
        0.8 
      );
      
      let text = res.text?.trim() || '...';
      
      // Xóa tất cả nội dung trong ngoặc vuông [...]
      text = text.replace(/\[.*?\]/g, '').trim();

      // Xóa *hành động*
      text = text.replace(/\*[^*]*\*?/g, '').trim();

      // Xóa quotes
      text = text.replace(/["'“”«»]/g, '');

      // Xóa meta-text và tên nhân vật ở đầu câu (nếu có)
      const nameRegex = new RegExp(`^(${characterName}|kịch bản.*?|script.*?|dialogue|thoại|lời thoại|ai|model)[:.]\\s*`, 'gi');
      text = text.replace(nameRegex, '');

      // Lấy đoạn văn đầu tiên (tránh AI viết thêm giải thích ở các đoạn sau)
      text = text.split(/\n\s*\n/)[0].trim();
      
      // Nối các dòng trong đoạn văn đó lại thành 1 câu hoàn chỉnh (tránh bị đứt câu nếu AI tự xuống dòng)
      text = text.replace(/\n/g, ' ').trim();

      // Nếu rỗng
      if (text.length < 2) text = '...';
      
      return text;
    } catch (error) {
      console.error("HomeAIService Error:", error);
      return "...";
    }
  }
}
