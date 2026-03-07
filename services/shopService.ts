import { GeminiService, DEFAULT_MODEL } from './geminiService';
import { ShopNPC, Message, UserProfile, InventoryItem } from '../types';

export class ShopService {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  private cleanJsonString(text: string): string {
    if (!text) return "{}";
    let clean = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");
    clean = clean.replace(/```/g, "").trim();
    return clean;
  }

  public async chatWithShopkeeper(
    npc: ShopNPC,
    history: Message[],
    userMsg: string,
    user: UserProfile,
    modelName?: string
  ): Promise<{ text: string; proposals?: InventoryItem[] }> {
    const system = `🏪 BẠN LÀ CHỦ SHOP: ${npc.name}
📍 Địa điểm: ${npc.location}
🎭 Tính cách: ${npc.personality}
🛒 Chuyên môn: ${npc.specialty}
💰 Khách hàng: ${user.name} (Ví: ${user.money} ${user.currencyName || "Xu"})

NHIỆM VỤ:
- Trả lời giống đúng tính cách của chủ shop.
- Nếu khách hỏi "có gì bán?" hoặc hỏi chung chung về sản phẩm → liệt kê 2–3 món phù hợp ${npc.specialty} và LUÔN thêm chúng vào mảng "proposals".
- Nếu khách hỏi mua/giá món cụ thể → thêm món đó vào "proposals".
- LUÔN LUÔN trả về định dạng JSON, không được trả về văn bản thuần túy.

JSON FORMAT:
{
  "text": "Lời NPC nói (tiếng Việt)",
  "proposals": [
    { "id": "item_id", "name": "Tên món", "value": 100, "description": "...", "icon": "🎁", "category": "General" }
  ]
}`;

    const content = [
      {
        role: "user",
        parts: [{ text: userMsg }]
      }
    ];
    const res = await this.geminiService.safeGenerateContent(
      modelName || DEFAULT_MODEL,
      content,
      system,
      true
    );
    
    const text = res.text || "";
    if (text.startsWith("❌")) {
      return { text };
    }

    try {
      const parsed = JSON.parse(this.cleanJsonString(text));
      return {
        text: parsed.text || "Tôi có thể giúp gì cho bạn?",
        proposals: parsed.proposals || []
      };
    } catch (e) {
      console.error("Shop Parse Error:", e, "Raw:", text);
      return { text: text || "Xin lỗi, tôi hơi lãng tai." };
    }
  }

  public async generateShopStock(
    npc: ShopNPC,
    currency: string,
    modelName?: string
  ): Promise<InventoryItem[]> {
    const prompt = `Bạn là hệ thống shop NPC.

Chủ shop: ${npc.name} (${npc.specialty})
Tiền tệ: ${currency}

Tạo 4 món hàng phù hợp chuyên môn shop. Mỗi món:
- id: string
- name: string
- icon: emoji hoặc ký tự
- description: mô tả ngắn
- value: giá (số)
- category: "Consumable" | "Equipment" | "Decoration" | "Gift" | ...

JSON: [
  { "id": "item1", "name": "...", "icon": "🎁", "description": "...", "value": 100, "category": "Gift" }
]`;

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.geminiService.safeGenerateContent(
      modelName || DEFAULT_MODEL,
      content,
      undefined,
      true
    );

    const text = res.text || "";
    if (text.startsWith("❌")) {
      console.error("Shop Stock Error:", text);
      return [];
    }

    try {
      const parsed = JSON.parse(this.cleanJsonString(text));
      return Array.isArray(parsed) ? parsed : (parsed.items || []);
    } catch (e) {
      console.error("Shop Stock Parse Error:", e, "Raw:", text);
      return [];
    }
  }

  public async createCustomShop(
    shopName: string,
    ownerName: string,
    description: string,
    modelName?: string
  ): Promise<ShopNPC> {
    const prompt = `Bạn là hệ thống tạo NPC Cửa hàng cho game nhập vai.
Người dùng yêu cầu tạo một cửa hàng với thông tin sau:
- Tên cửa hàng: ${shopName}
- Tên chủ shop: ${ownerName}
- Mô tả ngắn: ${description}

Dựa vào thông tin trên, hãy tạo ra một NPC chủ shop hoàn chỉnh với định dạng JSON sau:
{
  "name": "Tên chủ shop (kèm danh xưng nếu phù hợp)",
  "avatar": "Một emoji đại diện cho chủ shop hoặc cửa hàng",
  "specialty": "Chuyên môn/Mặt hàng kinh doanh chính của cửa hàng (dựa vào mô tả và tên cửa hàng)",
  "personality": "Tính cách của chủ shop (ngắn gọn)",
  "greeting": "Câu chào mừng đặc trưng khi khách bước vào",
  "location": "Tên cửa hàng hoặc vị trí (dựa vào Tên cửa hàng)"
}

Chỉ trả về JSON hợp lệ, không kèm văn bản nào khác.`;

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.geminiService.safeGenerateContent(
      modelName || DEFAULT_MODEL,
      content,
      undefined,
      true
    );

    const text = res.text || "";
    if (text.startsWith("❌")) {
      throw new Error(text);
    }

    try {
      const parsed = JSON.parse(this.cleanJsonString(text));
      return {
        id: 'shop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        name: parsed.name || ownerName || "Chủ shop ẩn danh",
        avatar: parsed.avatar || "🏪",
        specialty: parsed.specialty || "Tạp hóa",
        personality: parsed.personality || "Bình thường",
        greeting: parsed.greeting || "Kính chào quý khách!",
        location: parsed.location || shopName || "Cửa hàng nhỏ"
      };
    } catch (e) {
      console.error("Create Shop Parse Error:", e, "Raw:", text);
      throw new Error("Không thể tạo cửa hàng lúc này. Vui lòng thử lại.");
    }
  }
}
