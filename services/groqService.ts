import { ApiKeyData, Character, Message, UserProfile, AppSettings, Sender, InventoryItem } from "../types";
import { AffectionManager } from './affectionService';
import { parseSystemTag } from './utils';

export class GroqService {
  public apiKeys: ApiKeyData[] = [];
  private currentKeyIndex: number = 0;

  public updateKeys(keys: ApiKeyData[]) {
    if (keys && keys.length > 0) {
      this.apiKeys = keys.filter((k) => k.value && k.value.trim() !== "");
      this.currentKeyIndex = 0;
      console.log(`%c[GroqService] Loaded ${this.apiKeys.length} keys from settings.`, 'color: #f59e0b; font-weight: bold;');
    } else {
      this.apiKeys = [];
      this.currentKeyIndex = 0;
      console.warn('%c[GroqService] No API Keys found.', 'color: #f59e0b; font-weight: bold;');
    }
  }

  private getKey(): string | null {
    if (this.apiKeys.length === 0) {
      console.error("API Key for Groq is not configured.");
      return null;
    }

    const now = Date.now();
    let attempts = 0;
    let selectedKeyIndex = this.currentKeyIndex;
    let foundValidKey = false;

    while (attempts < this.apiKeys.length) {
      const keyData = this.apiKeys[selectedKeyIndex];
      const isPaused = keyData.pausedUntil && keyData.pausedUntil > now;
      
      if (keyData.isActive && !isPaused) {
        foundValidKey = true;
        this.currentKeyIndex = selectedKeyIndex;
        break;
      }
      
      selectedKeyIndex = (selectedKeyIndex + 1) % this.apiKeys.length;
      attempts++;
    }

    if (!foundValidKey) {
      console.warn("All Groq API keys are paused or inactive. Using current key as fallback.");
    }

    return this.apiKeys[this.currentKeyIndex].value;
  }

  public cleanJsonString(text: string): string {
    if (!text) return "{}";
    let clean = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");
    clean = clean.replace(/```/g, "").trim();
    return clean;
  }

  public async generateContent(
    modelName: string,
    contents: any,
    systemInstruction?: string,
    isJson: boolean = false,
    maxTokens: number = 2000,
    temperature: number = 0.9
  ): Promise<any> {
    const apiKey = this.getKey();
    if (!apiKey) {
      return { text: "❌ Lỗi: Chưa nhập API Key cho Groq." };
    }

    let messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }

    if (typeof contents === "string") {
      messages.push({ role: "user", content: contents });
    } else if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item.role && item.parts) {
          const textContent = item.parts.filter((p: any) => p.text).map((p: any) => p.text).join("\n");
          messages.push({ role: item.role === "model" ? "assistant" : "user", content: textContent });
        } else if (typeof item === "string") {
          messages.push({ role: "user", content: item });
        }
      }
    } else if (contents?.parts) {
      const textParts = contents.parts.filter((p: any) => p.text).map((p: any) => p.text).join("\n");
      messages.push({ role: "user", content: textParts });
    }

    const MAX_RETRIES = Math.max(5, this.apiKeys.length * 2);
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const apiKey = this.getKey();
      if (!apiKey) {
        return { text: "❌ Lỗi: Chưa nhập API Key cho Groq." };
      }

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            temperature: temperature,
            max_completion_tokens: maxTokens,
            response_format: isJson ? { type: "json_object" } : undefined,
            stream: false
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errStr = JSON.stringify(errorData).toLowerCase();
          
          const isQuotaError = response.status === 429 || errStr.includes("quota") || errStr.includes("rate limit") || errStr.includes("overloaded");
          const isInvalidKeyError = response.status === 401 || errStr.includes("api key") || errStr.includes("unauthenticated");

          if ((isQuotaError || isInvalidKeyError) && attempt < MAX_RETRIES - 1) {
            console.warn(`Groq API Error (${response.status}): ${isQuotaError ? 'Quota' : 'Auth'}. Retrying with next key...`);
            
            // Mark key as paused if quota error
            if (isQuotaError) {
              const currentKey = this.apiKeys[this.currentKeyIndex];
              if (currentKey) {
                currentKey.pausedUntil = Date.now() + 60000; // Pause for 1 minute
              }
            }
            
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          throw new Error(errorData.error?.message || `Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        return { text: data.choices[0]?.message?.content || "" };
      } catch (error: any) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`Groq Request Error: ${error.message}. Retrying...`);
          this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return { text: `❌ Lỗi Groq: ${error.message}` };
      }
    }
    return { text: "❌ Groq đang bận." };
  }

  public async *generateContentStream(
    modelName: string,
    contents: any,
    systemInstruction?: string,
    maxTokens: number = 2000,
    temperature: number = 0.9
  ): AsyncGenerator<any, void, unknown> {
    const apiKey = this.getKey();
    if (!apiKey) {
      yield { text: "❌ Lỗi: Chưa nhập API Key cho Groq." };
      return;
    }

    let messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }

    if (typeof contents === "string") {
      messages.push({ role: "user", content: contents });
    } else if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item.role && item.parts) {
          const textContent = item.parts.filter((p: any) => p.text).map((p: any) => p.text).join("\n");
          messages.push({ role: item.role === "model" ? "assistant" : "user", content: textContent });
        } else if (typeof item === "string") {
          messages.push({ role: "user", content: item });
        }
      }
    } else if (contents?.parts) {
      const textParts = contents.parts.filter((p: any) => p.text).map((p: any) => p.text).join("\n");
      messages.push({ role: "user", content: textParts });
    }

    const MAX_RETRIES = Math.max(5, this.apiKeys.length * 2);
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const apiKey = this.getKey();
      if (!apiKey) {
        yield { text: "❌ Lỗi: Chưa nhập API Key cho Groq." };
        return;
      }

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            temperature: temperature,
            max_completion_tokens: maxTokens,
            stream: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errStr = JSON.stringify(errorData).toLowerCase();
          
          const isQuotaError = response.status === 429 || errStr.includes("quota") || errStr.includes("rate limit") || errStr.includes("overloaded");
          const isInvalidKeyError = response.status === 401 || errStr.includes("api key") || errStr.includes("unauthenticated");

          if ((isQuotaError || isInvalidKeyError) && attempt < MAX_RETRIES - 1) {
            console.warn(`Groq Stream API Error (${response.status}): ${isQuotaError ? 'Quota' : 'Auth'}. Retrying with next key...`);
            
            if (isQuotaError) {
              const currentKey = this.apiKeys[this.currentKeyIndex];
              if (currentKey) {
                currentKey.pausedUntil = Date.now() + 60000;
              }
            }
            
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          yield { text: `❌ Lỗi Groq (${response.status}): ${errorData.error?.message || response.statusText}` };
          return;
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
                  yield { text: data.choices[0].delta.content };
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
        return; // Success
      } catch (error: any) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`Groq Stream Request Error: ${error.message}. Retrying...`);
          this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        yield { text: `❌ Lỗi Groq Stream: ${error.message}` };
        return;
      }
    }
  }

  // --- PROMPT GENERATION FOR GROQ (OPTIMIZED FOR ~6000 TOKENS) ---
  private getGroqSystemPrompt(
    character: Character,
    user: UserProfile,
    settings: AppSettings
  ): string {
    const intensity = settings.emotionalIntensity || 50;
    
    // 1. Core Identity & World
    let prompt = `BẠN LÀ ${character.name} trong thế giới "${character.world?.worldDetail || "Chưa rõ"}".\n`;
    if (character.prompt) prompt += `[CHỈ DẪN CỐT LÕI]: ${character.prompt}\n`;

    // 2. Writing Style (Condensed)
    const style = settings.responseLength === "short" 
      ? "Trả lời RẤT NGẮN (1-2 câu)." 
      : settings.responseLength === "long" 
      ? "Trả lời CHI TIẾT (3-4 đoạn)." 
      : "Trả lời VỪA PHẢI (2-3 đoạn).";
    prompt += `PHONG CÁCH: ${style} Độ dài linh hoạt theo ngữ cảnh.\n`;

    // 3. Status & Relationship
    prompt += `[TRẠNG THÁI]\n- Tâm trạng: "${character.mood}" (${intensity}/100)\n- Quan hệ với ${user.name}: ${character.relationshipScore}/100\n`;

    // 4. Financial (Simplified)
    prompt += `[TÀI CHÍNH]: Tiền mặt: ${character.money?.toLocaleString()} ${character.world?.currencyName || "Xu"}.\n`;

    // 5. Diary (Old + New) - As requested: "vài nhật ký cũ"
    // Strategy: Take 1 oldest and 2 newest diary entries to give context of past and present.
    const diary = character.diary || [];
    let selectedDiary = [];
    if (diary.length > 0) {
        // Add oldest entry (assuming index length-1 is oldest if sorted new->old, or index 0 if old->new)
        // Usually diaries are displayed new->old. Let's assume index 0 is newest.
        // So length-1 is oldest.
        selectedDiary.push(diary[diary.length - 1]); 
        // Add up to 2 newest entries
        if (diary.length > 1) selectedDiary.push(diary[0]);
        if (diary.length > 2) selectedDiary.push(diary[1]);
    }
    
    if (selectedDiary.length > 0) {
        const diaryText = selectedDiary.map(d => `- [${new Date(d.date).toLocaleDateString("vi-VN")}]: ${d.content}`).join("\n");
        prompt += `[NHẬT KÝ TIÊU BIỂU]\n${diaryText}\n`;
    }

    // 6. Rules (Condensed)
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
    const apiKey = this.getKey();
    if (!apiKey) return { text: "❌ Lỗi: Chưa nhập API Key cho Groq." };

    const finalSystemPrompt = systemPrompt || this.getGroqSystemPrompt(character, user, settings);
    
    // --- HISTORY TRUNCATION FOR GROQ ---
    // Reduced to 12 messages because Groq has lower token limits (6k-10k)
    const recentHistory = history.slice(-12);
    
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
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: settings.model,
          messages: messages,
          temperature: settings.temperature || 0.9,
          max_completion_tokens: settings.maxTokens || 1000, // Groq limit is tight
          stream: false
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Groq API Error");
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || "";

      // --- PARSING RESPONSE (Same logic as GeminiService) ---
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
      return { text: `❌ Lỗi Groq: ${error.message}` };
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
    const apiKey = this.getKey();
    if (!apiKey) {
        yield "❌ Lỗi: Chưa nhập API Key cho Groq.";
        return;
    }

    const finalSystemPrompt = systemPrompt || this.getGroqSystemPrompt(character, user, settings);
    const recentHistory = history.slice(-12);
    
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
    messages.push({ role: "user", content: finalUserMsg });

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: settings.model,
                messages: messages,
                temperature: settings.temperature || 0.9,
                max_completion_tokens: settings.maxTokens || 1000,
                stream: true
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Groq API Error");
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
        yield `❌ Lỗi Groq Stream: ${error.message}`;
    }
  }
}

export const groqService = new GroqService();
