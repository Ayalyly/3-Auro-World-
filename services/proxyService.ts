import { ApiKeyData, Character, Message, UserProfile, AppSettings, Sender, InventoryItem } from "../types";
import { AffectionManager } from './affectionService';
import { parseSystemTag } from './utils';

export interface ProxyConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  isActive: boolean;
}

export class ProxyService {
  private config: ProxyConfig | null = null;

  constructor(config?: ProxyConfig) {
    if (config) {
      this.config = config;
    }
  }

  updateConfig(config: ProxyConfig) {
    this.config = config;
  }

  public cleanJsonString(text: string): string {
    if (!text) return "{}";
    let clean = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");
    clean = clean.replace(/```/g, "").trim();
    return clean;
  }

  // --- PROMPT GENERATION (Similar to Groq) ---
  private getProxySystemPrompt(
    character: Character,
    user: UserProfile,
    settings: AppSettings
  ): string {
    const intensity = settings.emotionalIntensity || 50;
    
    // 1. Core Identity & World
    let prompt = `BẠN LÀ ${character.name} trong thế giới "${character.world?.worldDetail || "Chưa rõ"}".\n`;
    if (character.prompt) prompt += `[CHỈ DẪN CỐT LÕI]: ${character.prompt}\n`;

    // 2. Writing Style
    const style = settings.responseLength === "short" 
      ? "Trả lời RẤT NGẮN (1-2 câu)." 
      : settings.responseLength === "long" 
      ? "Trả lời CHI TIẾT (3-4 đoạn)." 
      : "Trả lời VỪA PHẢI (2-3 đoạn).";
    prompt += `PHONG CÁCH: ${style} Độ dài linh hoạt theo ngữ cảnh.\n`;

    // 3. Status & Relationship
    prompt += `[TRẠNG THÁI]\n- Tâm trạng: "${character.mood}" (${intensity}/100)\n- Quan hệ với ${user.name}: ${character.relationshipScore}/100\n`;

    // 4. Financial
    prompt += `[TÀI CHÍNH]: Tiền mặt: ${character.money?.toLocaleString()} ${character.world?.currencyName || "Xu"}.\n`;

    // 5. Diary
    const diary = character.diary || [];
    let selectedDiary = [];
    if (diary.length > 0) {
        selectedDiary.push(diary[diary.length - 1]); 
        if (diary.length > 1) selectedDiary.push(diary[0]);
        if (diary.length > 2) selectedDiary.push(diary[1]);
    }
    
    if (selectedDiary.length > 0) {
        const diaryText = selectedDiary.map(d => `- [${new Date(d.date).toLocaleDateString("vi-VN")}]: ${d.content}`).join("\n");
        prompt += `[NHẬT KÝ TIÊU BIỂU]\n${diaryText}\n`;
    }

    // 6. Rules
    prompt += `
⚠️ LUẬT:
- KHÔNG OUT OF CHARACTER.
- Tự đánh giá hành động của ${user.name} để tăng/giảm hảo cảm. Tag cuối câu: [AFFECTION: +X] hoặc [AFFECTION: -X].
- Có thể chuyển tiền/tặng quà nếu phù hợp. Tag: [CHUYỂN_KHOẢN: X] hoặc [TẶNG: icon tên_quà].
- Cập nhật hệ thống (nhật ký, ghi chú) bằng JSON trong thẻ <system>...</system> ở cuối.
<system>
{
  "diary": { "content": "Nội dung", "mood": "Vui/Buồn" },
  "notes": ["Ghi chú"],
  "thought": "Suy nghĩ",
  "transaction": { "amount": -50000, "description": "Mua đồ" }
}
</system>
`;

    return prompt;
  }

  public async sendMessage(
    character: Character,
    history: Message[],
    userMsg: string,
    user: UserProfile,
    settings: AppSettings,
    image?: string,
    systemPrompt?: string
  ) {
    if (!this.config || !this.config.isActive) {
      return { text: "❌ Lỗi: Proxy chưa được cấu hình." };
    }

    const finalSystemPrompt = systemPrompt || this.getProxySystemPrompt(character, user, settings);
    
    // History truncation - Reduced to 25 to avoid context length errors
    const recentHistory = history.slice(-25);
    
    const messages = [];
    messages.push({ role: "system", content: finalSystemPrompt });

    for (const m of recentHistory) {
      messages.push({ 
        role: m.sender === Sender.USER ? "user" : "assistant", 
        content: m.text 
      });
    }

    const activePrefix = settings.prefixes?.find((p) => p.isActive)?.content || "";
    const finalUserMsg = activePrefix ? `(${activePrefix}) ${userMsg}` : userMsg;

    if (image) {
        messages.push({ role: "user", content: finalUserMsg + " [Image attached but not processed]" });
    } else {
        messages.push({ role: "user", content: finalUserMsg });
    }

    try {
      // Construct URL: Ensure it ends with /chat/completions if not present, or use as is if it's full path
      // But usually user enters base URL. Let's assume user enters base URL like https://api.pawan.krd/cosmosrp/v1
      // We should append /chat/completions if it's a standard OpenAI compatible base.
      // However, some users might paste the full endpoint.
      // Let's try to be smart.
      let url = this.config.baseUrl;
      if (!url.endsWith('/chat/completions')) {
          if (url.endsWith('/')) {
              url += 'chat/completions';
          } else {
              url += '/chat/completions';
          }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: messages,
          temperature: settings.temperature || 0.7,
          max_tokens: settings.maxTokens || 1000,
          stream: false
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Proxy API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || "";

      // --- PARSING RESPONSE ---
      const transferMatch = text.match(/\[(?:CHUYỂN_KHOẢN|CK|TRANSFER|SEND):\s*(\d+)\]/i);
      const giftMatch = text.match(/\[TẶNG:\s*(.*?)\s+(.*?)\]/i);
      const affectionChange = AffectionManager.parseAffectionTag(text);

      // 1. Parse System Tag
      const { cleanText: parsedCleanText, systemData: systemUpdate } = parseSystemTag(text);

      // 2. Clean Text
      let cleanText = AffectionManager.cleanAffectionTag(parsedCleanText);
      cleanText = cleanText.replace(/\[(?:CHUYỂN_KHOẢN|CK|TRANSFER|SEND):\s*\d+\]/gi, "");
      cleanText = cleanText.replace(/\[TẶNG:\s*.*?\s+.*?\]/gi, "");

      let giftItem: InventoryItem | undefined;
      if (giftMatch) {
        giftItem = {
          id: "gift-" + Date.now(),
          icon: giftMatch[1].trim(),
          name: giftMatch[2].trim(),
          description: `Quà từ ${character.name}`,
          value: 0,
          affinityBonus: 10,
          category: "Gift"
        };
      }

      return {
        text: cleanText,
        transfer: transferMatch ? parseInt(transferMatch[1]) : undefined,
        gift: giftItem,
        affectionChange: affectionChange,
        systemUpdate: systemUpdate
      };

    } catch (error: any) {
      return { text: `❌ Lỗi Proxy: ${error.message}` };
    }
  }

  public async *sendMessageStream(
    character: Character,
    history: Message[],
    userMsg: string,
    user: UserProfile,
    settings: AppSettings,
    image?: string,
    systemPrompt?: string
  ): AsyncGenerator<string> {
    if (!this.config || !this.config.isActive) {
        yield "❌ Lỗi: Proxy chưa được cấu hình.";
        return;
    }

    const finalSystemPrompt = systemPrompt || this.getProxySystemPrompt(character, user, settings);
    const recentHistory = history.slice(-25);
    
    const messages = [];
    messages.push({ role: "system", content: finalSystemPrompt });

    for (const m of recentHistory) {
      messages.push({ 
        role: m.sender === Sender.USER ? "user" : "assistant", 
        content: m.text 
      });
    }

    const activePrefix = settings.prefixes?.find((p) => p.isActive)?.content || "";
    const finalUserMsg = activePrefix ? `(${activePrefix}) ${userMsg}` : userMsg;
    
    if (image) {
        messages.push({ role: "user", content: finalUserMsg + " [Image attached but not processed]" });
    } else {
        messages.push({ role: "user", content: finalUserMsg });
    }

    try {
        let url = this.config.baseUrl;
        if (!url.endsWith('/chat/completions')) {
            if (url.endsWith('/')) {
                url += 'chat/completions';
            } else {
                url += '/chat/completions';
            }
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.config.modelName,
                messages: messages,
                temperature: settings.temperature || 0.7,
                max_tokens: settings.maxTokens || 1000,
                stream: true
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Proxy API Error: ${response.status}`);
        }

        if (!response.body) throw new Error("No response body");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices && data.choices[0]?.delta?.content) {
                            yield data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        }
    } catch (error: any) {
        yield `❌ Lỗi Proxy Stream: ${error.message}`;
    }
  }

  async generateContent(
    prompt: string,
    systemInstruction?: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
  ): Promise<string> {
    if (!this.config || !this.config.isActive) {
      throw new Error('Proxy service is not configured or active.');
    }

    const messages = [];

    // Add system instruction if present
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    // Add history
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts[0].text
      });
    });

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    try {
      let url = this.config.baseUrl;
      if (!url.endsWith('/chat/completions')) {
          if (url.endsWith('/')) {
              url += 'chat/completions';
          } else {
              url += '/chat/completions';
          }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: messages,
          temperature: 0.7, // Recommended temperature from docs
          max_tokens: 1000, // Adjust as needed
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Proxy API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from Proxy API');
      }

    } catch (error) {
      console.error('Proxy Service Error:', error);
      throw error;
    }
  }
  
  // Helper to check if a string is a valid URL
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }
}

export const proxyService = new ProxyService();
