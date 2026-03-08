// (FIX20) src/services/geminiService.ts

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AffectionManager } from './affectionService';
import { parseSystemTag } from './utils';
import { groqService } from './groqService';
import { proxyService, ProxyConfig } from './proxyService';
import {
  Character,
  Message,
  UserProfile,
  AppSettings,
  InventoryItem,
  ShopNPC,
  Relation,
  Sender,
  ApiKeyData
} from "../types";

// Cấu hình Model mặc định tại đây.
// Nếu Google ngừng hỗ trợ 3.0, bạn chỉ cần đổi giá trị này.
export const DEFAULT_MODEL = "gemini-3.1-flash-lite-preview"; 
export const VISION_MODEL = "gemini-2.5-flash"; // Dùng cho phân tích ảnh

import { getCharSystemPrompt } from './prompts/charPrompt';
import { getNpcGenerationPrompt, getNextSocialTurnSystemPrompt, getSocialChatPrompt } from './prompts/npcPrompt';
import { getWorldContextPrompt, getWorldSettingPrompt, getSocialMemoryPrompt, getEconomyPrompt, getOnIdleThoughtPrompt, getInitialAssetsPrompt, getAnalyzeUserLorePrompt } from './prompts/worldPrompt';
import { getLegacyContentPrompt, getRandomPostPrompt } from './prompts/socialPrompt';
import { getSingleReactionToPostPrompt, getSingleReactionToCommentPrompt, getMassReactionsToCommentPrompt } from './prompts/reactionPrompt';
import { getDiaryEntryPrompt, getParseCharacterDocumentPrompt, getAnalyzeImagePrompt } from './prompts/characterDataPrompt';
import { getDonationVerificationPrompt } from './prompts/miscPrompt';

export class GeminiService {
  public apiKeys: ApiKeyData[] = [];
  private currentKeyIndex: number = 0;
  
  public groqApiKeys: ApiKeyData[] = [];
  private currentGroqKeyIndex: number = 0;

  private proxyConfig: ProxyConfig | null = null;

  public get apiKeysList(): string[] {
    return this.apiKeys.map(k => k.value);
  }

  constructor() {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
      this.apiKeys = [{ value: envKey, isActive: true }];
    }
  }

  public updateKeys(keys: ApiKeyData[]) {
    const envKey = process.env.GEMINI_API_KEY;
    if (keys && keys.length > 0) {
      this.apiKeys = keys.filter((k) => k.value && k.value.trim() !== "");
      this.currentKeyIndex = 0;
      console.log(`%c[GeminiService] Loaded ${this.apiKeys.length} keys from settings.`, 'color: #10b981; font-weight: bold;');
    } else if (envKey) {
      this.apiKeys = [{ value: envKey, isActive: true }];
      this.currentKeyIndex = 0;
      console.log('%c[GeminiService] Using platform default API Key.', 'color: #10b981; font-weight: bold;');
    } else {
      this.apiKeys = [];
      this.currentKeyIndex = 0;
      console.warn('%c[GeminiService] No API Keys found.', 'color: #f59e0b; font-weight: bold;');
    }
  }

  public updateGroqKeys(keys: ApiKeyData[]) {
    if (keys && keys.length > 0) {
      this.groqApiKeys = keys.filter((k) => k.value && k.value.trim() !== "");
      this.currentGroqKeyIndex = 0;
    } else {
      this.groqApiKeys = [];
      this.currentGroqKeyIndex = 0;
    }
    groqService.updateKeys(this.groqApiKeys);
  }

  public updateProxySettings(config: ProxyConfig | null) {
    this.proxyConfig = config;
    if (config) {
        proxyService.updateConfig(config);
    }
  }

  private getGroqKey(): string | null {
    if (this.groqApiKeys.length === 0) {
      console.error("API Key for Groq is not configured. Please provide one.");
      return null;
    }

    const now = Date.now();
    let attempts = 0;
    let selectedKeyIndex = this.currentGroqKeyIndex;
    let foundValidKey = false;

    while (attempts < this.groqApiKeys.length) {
      const keyData = this.groqApiKeys[selectedKeyIndex];
      const isPaused = keyData.pausedUntil && keyData.pausedUntil > now;
      
      if (keyData.isActive && !isPaused) {
        foundValidKey = true;
        this.currentGroqKeyIndex = selectedKeyIndex;
        break;
      }
      
      selectedKeyIndex = (selectedKeyIndex + 1) % this.groqApiKeys.length;
      attempts++;
    }

    if (!foundValidKey) {
      console.warn("All Groq API keys are paused or inactive. Using current key as fallback.");
    }

    return this.groqApiKeys[this.currentGroqKeyIndex].value;
  }

  private getClient(): GoogleGenAI {
    // API keys are now managed solely via updateKeys from user settings.
    // The platform-provided key (if any) is expected to be passed via updateKeys if desired.

    if (this.apiKeys.length === 0) {
      const envKey = process.env.GEMINI_API_KEY;
      if (envKey) {
          this.apiKeys = [{ value: envKey, isActive: true }];
      } else {
          // Fallback nếu không có key nào được cung cấp (kể cả platform key)
          console.error("API Key for Gemini is not configured. Please provide one.");
          return new GoogleGenAI({ apiKey: "" });
      }
    }

    // Xoay vòng key thông minh (bỏ qua key đang tạm dừng)
    const now = Date.now();
    let attempts = 0;
    let selectedKeyIndex = this.currentKeyIndex;
    let foundValidKey = false;

    // Tìm key khả dụng tiếp theo
    while (attempts < this.apiKeys.length) {
        const keyData = this.apiKeys[selectedKeyIndex];
        const isPaused = keyData.pausedUntil && keyData.pausedUntil > now;
        
        if (keyData.isActive && !isPaused) {
            foundValidKey = true;
            this.currentKeyIndex = selectedKeyIndex; // Cập nhật index hiện tại
            break;
        }
        
        selectedKeyIndex = (selectedKeyIndex + 1) % this.apiKeys.length;
        attempts++;
    }

    // Nếu không tìm thấy key nào khả dụng (tất cả đều pause hoặc inactive), 
    // vẫn dùng key hiện tại (để báo lỗi hoặc thử vận may) nhưng log warning
    if (!foundValidKey) {
        console.warn("All API keys are paused or inactive. Using current key as fallback.");
    }

    const keyData = this.apiKeys[this.currentKeyIndex];
    const key = keyData.value;
    
    console.log(`%c[GeminiService] Using API Key index ${this.currentKeyIndex}: ...${key.slice(-4)} ${keyData.pausedUntil && keyData.pausedUntil > now ? '(PAUSED)' : ''}`, 'color: #6366f1; font-weight: bold;');
    
    // Chuẩn bị cho lần gọi tiếp theo
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    return new GoogleGenAI({ apiKey: key });
  }

  public cleanJsonString(text: string): string {
    if (!text) return "{}";
    let clean = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");
    clean = clean.replace(/```/g, "").trim();
    return clean;
  }

  private parseImageData(raw: string): { data: string; mimeType: string } {
    let mimeType = "image/png";
    let data = raw;

    if (raw.startsWith("data:")) {
      const commaIndex = raw.indexOf(",");
      if (commaIndex !== -1) {
        const prefix = raw.substring(0, commaIndex);
        const match = prefix.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+)/);
        if (match?.[1]) mimeType = match[1];
        data = raw.substring(commaIndex + 1);
      }
    } else {
      if (raw.startsWith("/9j/")) mimeType = "image/jpeg";
      else if (raw.startsWith("iVBORw0KGgo")) mimeType = "image/png";
      else if (raw.startsWith("UklGR")) mimeType = "image/webp";
    }

    if (!mimeType.startsWith("image/")) mimeType = "image/png";
    return { data, mimeType };
  }

  private isProxyModel(modelName: string): boolean {
    if (!modelName) return false;
    return this.proxyConfig?.modelName === modelName;
  }

  private isGroqModel(modelName: string): boolean {
    if (!modelName) return false;
    if (this.isProxyModel(modelName)) return false;
    return !modelName.startsWith('gemini-') && !modelName.startsWith('veo-') && !modelName.startsWith('auto-');
  }

  private async generateGroqContent(
    modelName: string,
    contents: any,
    systemInstruction?: string,
    isJson: boolean = false,
    maxTokens: number = 2000,
    temperature: number = 0.9
  ): Promise<any> {
    return groqService.generateContent(modelName, contents, systemInstruction, isJson, maxTokens, temperature);
  }

  private async *generateGroqContentStream(
    modelName: string,
    contents: any,
    systemInstruction?: string,
    maxTokens: number = 2000,
    temperature: number = 0.9
  ): AsyncGenerator<any, void, unknown> {
    const stream = groqService.generateContentStream(modelName, contents, systemInstruction, maxTokens, temperature);
    for await (const chunk of stream) {
      yield chunk;
    }
  }

  public async safeGenerateContent(
    modelName: string,
    contents: any,
    systemInstruction?: string,
    isJson: boolean = false,
    maxTokens: number = 2000,
    temperature: number = 0.9,
    thinkingConfig?: { thinkingLevel: 'LOW' | 'HIGH' }
  ): Promise<any> {
    let actualModelName = modelName || DEFAULT_MODEL; 
    
    if (actualModelName === "auto-fast") actualModelName = "gemini-3.1-flash-lite-preview";
    else if (actualModelName === "auto-pro") actualModelName = "gemini-3.1-pro-preview";

    if (this.isProxyModel(actualModelName)) {
        // Convert contents to string if it's complex, as proxyService.generateContent expects string prompt currently
        // Or better, update proxyService to handle complex contents. 
        // For now, let's assume simple usage or stringify.
        let prompt = "";
        if (typeof contents === 'string') prompt = contents;
        else if (Array.isArray(contents)) prompt = contents.map(c => c.parts?.[0]?.text || "").join("\n");
        else if (contents?.parts) prompt = contents.parts.map((p:any) => p.text).join("\n");
        
        return proxyService.generateContent(prompt, systemInstruction);
    }

    if (this.isGroqModel(actualModelName)) {
      return this.generateGroqContent(actualModelName, contents, systemInstruction, isJson, maxTokens, temperature);
    }

    if (this.apiKeys.length === 0) {
      console.warn("⚠️ Chưa nhập API Key.");
      return { text: "❌ Lỗi: Chưa nhập API Key." };
    }

    const MAX_RETRIES = Math.max(10, this.apiKeys.length * 3); 
    const BASE_DELAY_MS = 300; 

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const ai = this.getClient(); 

        const config: any = {
          responseMimeType: isJson ? "application/json" : "text/plain",
          temperature: temperature,
          maxOutputTokens: maxTokens
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        if (thinkingConfig) {
          config.thinkingConfig = thinkingConfig;
        }

        if (actualModelName.toLowerCase().includes("pro") || actualModelName.toLowerCase().includes("thinking")) {
          config.maxOutputTokens = Math.max(maxTokens, 8000);
        }

        const res = await Promise.race([
          ai.models.generateContent({
            model: actualModelName,
            contents,
            config
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 30000))
        ]) as any;

        return res || { text: "" };
      } catch (error: any) {
        if (await this.handleApiError(error, attempt, MAX_RETRIES, BASE_DELAY_MS)) {
          continue;
        }
        
        if (actualModelName !== DEFAULT_MODEL && attempt === MAX_RETRIES - 1) {
           return this.safeGenerateContent(DEFAULT_MODEL, contents, systemInstruction, isJson, maxTokens, temperature);
        }
        return { text: this.getErrorMessage(error) };
      }
    }
    return { text: "❌ Hệ thống AI đang bận." };
  }

  public async *safeGenerateContentStream(
    modelName: string,
    contents: any,
    systemInstruction?: string,
    maxTokens: number = 2000,
    temperature: number = 0.9,
    thinkingConfig?: { thinkingLevel: 'LOW' | 'HIGH' },
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    let actualModelName = modelName || DEFAULT_MODEL;
    if (actualModelName === "auto-fast") actualModelName = "gemini-3.1-flash-lite-preview";
    else if (actualModelName === "auto-pro") actualModelName = "gemini-3.1-pro-preview";

    if (this.isGroqModel(actualModelName)) {
      const stream = this.generateGroqContentStream(actualModelName, contents, systemInstruction, maxTokens, temperature);
      for await (const chunk of stream) {
        if (signal?.aborted) break;
        if (chunk.text) {
          yield chunk.text;
        }
      }
      return;
    }

    if (this.apiKeys.length === 0) {
      yield "❌ Lỗi: Chưa nhập API Key.";
      return;
    }

    const ai = this.getClient();
    const config: any = {
      temperature: temperature,
      maxOutputTokens: maxTokens
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (thinkingConfig) {
      config.thinkingConfig = thinkingConfig;
    }

    try {
      const result = await ai.models.generateContentStream({
        model: actualModelName,
        contents,
        config
      });

      for await (const chunk of result) {
        if (signal?.aborted) break;
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error: any) {
      console.error("Streaming Error:", error);
      yield `\n[LỖI AI: ${this.getErrorMessage(error)}]`;
    }
  }

  private async handleApiError(error: any, attempt: number, maxRetries: number, baseDelay: number): Promise<boolean> {
    const errStr = String(error).toLowerCase();
    const isQuotaError =
      errStr.includes("429") ||
      errStr.includes("quota") ||
      errStr.includes("exhausted") ||
      errStr.includes("rate limit") ||
      errStr.includes("overloaded");

    const isInvalidKeyError = 
      errStr.includes("api key not valid") ||
      errStr.includes("unauthenticated");

    if ((isQuotaError || isInvalidKeyError) && attempt < maxRetries - 1) {
      const failedKeyIdx = (this.currentKeyIndex - 1 + this.apiKeys.length) % this.apiKeys.length;
      const currentFailedKey = this.apiKeys[failedKeyIdx];
      
      if (isInvalidKeyError) {
        console.warn(`[GeminiService] Removing invalid key: ...${currentFailedKey.value.slice(-4)}`);
        this.apiKeys = this.apiKeys.filter(k => k !== currentFailedKey);
        this.currentKeyIndex = this.currentKeyIndex % Math.max(1, this.apiKeys.length);
      } else if (isQuotaError) {
        console.warn(`[GeminiService] Pausing exhausted key: ...${currentFailedKey.value.slice(-4)}`);
        currentFailedKey.pausedUntil = Date.now() + 60000; // Pause for 1 minute
      }

      if (this.apiKeys.length === 0) return false;

      let delay = 0;
      if (this.apiKeys.length === 1) {
         delay = baseDelay * Math.pow(1.5, attempt);
         if (isQuotaError) delay = Math.max(delay, 5000);
      } else {
         delay = (isQuotaError ? 1000 : 200) + Math.random() * 500; 
      }
       
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      return true;
    }
    return false;
  }

  private getErrorMessage(error: any): string {
    const errStr = String(error).toLowerCase();
    if (errStr.includes("api key not valid") || errStr.includes("unauthenticated")) {
      return "❌ API Key không hợp lệ.";
    }
    if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("exhausted")) {
      return "❌ Key này đang bị Google giới hạn (sẽ tự hồi phục sau). Hãy thêm Key mới.";
    }
    if (errStr.includes("ai_timeout")) {
      return "⏰ Kết nối với AI quá chậm hoặc bị treo.";
    }
    return "❌ Hệ thống AI đang bận.";
  }

  // ================================================================
  // CHAT CHÍNH (GỬI TIN NHẮN)
  // ================================================================
  public async sendMessage(
    character: Character,
    history: Message[],
    userMsg: string,
    user: UserProfile,
    settings: AppSettings,
    image?: string
  ) {
    const activeSystem =
      settings.systemPrompts?.find((p) => p.isActive)?.content || "";
    const activePrefix =
      settings.prefixes?.find((p) => p.isActive)?.content || "";

    const systemPrompt = getCharSystemPrompt(
      character,
      user.name,
      user.description,
      character.world,
      character.relations,
      activeSystem,
      settings,
      history,
      image,
      userMsg
    );

    if (this.isProxyModel(settings.model)) {
        return proxyService.sendMessage(character, history, userMsg, user, settings, image, systemPrompt);
    }

    if (this.isGroqModel(settings.model)) {
      return groqService.sendMessage(character, history, userMsg, user, settings, image, systemPrompt);
    }

    const intensity = settings.emotionalIntensity || 50;
    const maxTokens = settings.maxTokens || 2000;
    const apiMaxTokens = maxTokens + 300; // Thêm buffer cho thẻ <system> và các tag ẩn

    // INCREASED CONTEXT WINDOW FROM 15 TO 60 MESSAGES
    const chatParts: any[] = history
      .slice(-60)
      .map((m) => ({
        role: m.sender === Sender.USER ? "user" : "model",
        parts: [{ text: m.text }]
      }));

    const finalUserMsg = activePrefix ? `(${activePrefix}) ${userMsg}` : userMsg;

    if (image) {
      const img = this.parseImageData(image);
      chatParts.push({
        role: "user",
        parts: [
          { inlineData: { data: img.data, mimeType: img.mimeType } },
          { text: finalUserMsg }
        ]
      });
    } else {
      chatParts.push({ role: "user", parts: [{ text: finalUserMsg }] });
    }

    const res = await this.safeGenerateContent(
      settings.model || DEFAULT_MODEL,
      chatParts,
      systemPrompt,
      false,
      apiMaxTokens,
      settings.temperature || 0.9,
      settings.thinkingEnabled ? { thinkingLevel: settings.thinkingLevel || 'HIGH' } : undefined
    );
    const text = res.text || "";

    // Parse các lệnh chuyển khoản/quà nếu có
    const transferMatch = text.match(/\[(?:CHUYỂN_KHOẢN|CK|TRANSFER|SEND):\s*(\d+)\]/i);
    const giftMatch = text.match(/\[TẶNG:\s*(.*?)\s+(.*?)\]/i);
    
    // Parse Affection Change using AffectionManager
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
  }

  public async *sendMessageStream(
    character: Character,
    history: Message[],
    userMsg: string,
    user: UserProfile,
    settings: AppSettings,
    image?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const activeSystem = settings.systemPrompts?.find((p) => p.isActive)?.content || "";
    const activePrefix = settings.prefixes?.find((p) => p.isActive)?.content || "";

    const systemPrompt = getCharSystemPrompt(
      character,
      user.name,
      user.description,
      character.world,
      character.relations,
      activeSystem,
      settings,
      history,
      image,
      userMsg
    );

    if (this.isProxyModel(settings.model)) {
        const stream = proxyService.sendMessageStream(character, history, userMsg, user, settings, image, systemPrompt);
        for await (const chunk of stream) {
            if (signal?.aborted) break;
            yield chunk;
        }
        return;
    }

    if (this.isGroqModel(settings.model)) {
      const stream = groqService.sendMessageStream(character, history, userMsg, user, settings, image, systemPrompt);
      for await (const chunk of stream) {
        if (signal?.aborted) break;
        yield chunk;
      }
      return;
    }

    const maxTokens = settings.maxTokens || 2000;
    const apiMaxTokens = maxTokens + 300; // Thêm buffer cho thẻ <system> và các tag ẩn

    const chatParts: any[] = history
      .slice(-60)
      .map((m) => ({
        role: m.sender === Sender.USER ? "user" : "model",
        parts: [{ text: m.text }]
      }));

    const finalUserMsg = activePrefix ? `(${activePrefix}) ${userMsg}` : userMsg;

    if (image) {
      const img = this.parseImageData(image);
      chatParts.push({
        role: "user",
        parts: [
          { inlineData: { data: img.data, mimeType: img.mimeType } },
          { text: finalUserMsg }
        ]
      });
    } else {
      chatParts.push({ role: "user", parts: [{ text: finalUserMsg }] });
    }

    const stream = this.safeGenerateContentStream(
      settings.model || DEFAULT_MODEL,
      chatParts,
      systemPrompt,
      apiMaxTokens,
      settings.temperature || 0.9,
      settings.thinkingEnabled ? { thinkingLevel: settings.thinkingLevel || 'HIGH' } : undefined,
      signal
    );

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      yield chunk;
    }
  }


  // ================================================================
  // USER PHONE: CHAT WITH NPC
  // ================================================================
  public async chatWithNPC(
    npcName: string,
    npcPersona: string, // e.g., "Bạn thân của Character", "Chủ shop"
    userRelation: string, // e.g., "Crush", "Kẻ thù"
    userName: string,
    history: { sender: 'USER' | 'NPC'; text: string }[],
    userMessage: string
  ): Promise<string> {
    const systemInstruction = `Bạn đang nhập vai là NPC tên "${npcName}".
Tính cách/Vai trò: ${npcPersona}.
Mối quan hệ với người dùng (${userName}): ${userRelation}.

[NHIỆM VỤ]
- Trả lời tin nhắn của ${userName} một cách tự nhiên, ngắn gọn (như chat qua điện thoại).
- Thể hiện rõ thái độ dựa trên mối quan hệ "${userRelation}".
  + Nếu là "Bạn bè": Thân thiện, cởi mở.
  + Nếu là "Kẻ thù": Cộc lốc, khó chịu, châm chọc.
  + Nếu là "Crush": Ngại ngùng, quan tâm, hoặc thả thính (tùy tính cách).
  + Nếu là "Người lạ": Lịch sự, xa cách.
- KHÔNG được phá vỡ vai diễn (break character).
- KHÔNG trả lời quá dài dòng. Dùng ngôn ngữ chat (teencode nhẹ, emoji) nếu phù hợp.

[LỊCH SỬ CHAT]
${history.map(m => `${m.sender === 'USER' ? userName : npcName}: ${m.text}`).join('\n')}
`;

    const content = [{
      role: 'user',
      parts: [{ text: userMessage }]
    }];

    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      systemInstruction,
      false,
      500, // Max tokens
      1.0 // Temperature
    );

    return res.text || "...";
  }

  // ================================================================
  // SOCIAL CHAT / NPC REPLIES (PHONE)
  // ================================================================
  public async generateNextSocialTurn(
    charName: string,
    charLore: string,
    npcName: string,
    npcType: string,
    history: any[],
    affinity: number = 50,
    personalNotes: string = ""
  ) {
    const system = getNextSocialTurnSystemPrompt(
      charName,
      charLore,
      npcName,
      npcType,
      affinity,
      personalNotes
    );

    const content = [
      {
        role: "user",
        parts: [
          {
            text: `Lịch sử chat gần đây: ${JSON.stringify(history.slice(-5))}`
          }
        ]
      }
    ];

    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      system,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      if (parsed && parsed.text) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async generateSocialChat(
    charName: string,
    charLore: string,
    npcName: string,
    npcType: string,
    affinity: number = 50,
    personalNotes: string = ""
  ) {
    const prompt = getSocialChatPrompt(
      charName,
      charLore,
      npcName,
      npcType,
      affinity,
      personalNotes
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ================================================================
  // MEMORY SYSTEM: AUTO-SUMMARIZATION
  // ================================================================
  public async autoSummarizeMemory(
    history: Message[],
    existingMemories: string[]
  ): Promise<string[]> {
    if (history.length < 5) return [];

    const system = `Bạn là hệ thống Ghi Nhớ Ký Ức cho một AI Character.
Nhiệm vụ: Đọc đoạn hội thoại và trích xuất các thông tin QUAN TRỌNG về User hoặc các sự kiện chính trong cốt truyện để lưu vào bộ nhớ dài hạn.

[DỮ LIỆU HIỆN CÓ]:
${existingMemories.map(m => `- ${m}`).join('\n')}

[YÊU CẦU]:
1. Chỉ trích xuất thông tin MỚI chưa có trong dữ liệu hiện có.
2. Tập trung vào: Tên user, sở thích, công việc, mối quan hệ, các sự kiện bước ngoặt vừa xảy ra.
3. Bỏ qua các câu chào hỏi xã giao, tán gẫu vô thưởng vô phạt.
4. Trả về danh sách các gạch đầu dòng ngắn gọn.
5. Nếu không có gì đáng nhớ, trả về "NO_UPDATE".

[ĐỊNH DẠNG TRẢ VỀ]:
- User thích ăn kem.
- User vừa chia tay người yêu.
- Cả hai đã đi dạo ở công viên.`;

    const content = [{
      role: 'user',
      parts: [{ text: `Hội thoại cần phân tích:\n${history.map(m => `${m.sender}: ${m.text}`).join('\n')}` }]
    }];

    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      system,
      false,
      500,
      0.5
    );

    const text = res.text || "";
    if (text.includes("NO_UPDATE") || text.length < 5) return [];

    // Split by newlines and clean up
    return text.split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('NO_UPDATE'));
  }

  // ================================================================
  // SHOP: AI PRODUCT PROPOSAL FROM CHAT
  // ================================================================
  public async proposeProductFromChat(chatText: string, currency: string): Promise<InventoryItem | null> {
    const system = `Bạn là một AI chuyên gia về vật phẩm trong game, nhiệm vụ của bạn là phân tích một đoạn chat và xác định xem người dùng có đang "ám chỉ" hay "mong muốn" một vật phẩm cụ thể hay không.\n\n[QUY TẮC PHÂN TÍCH]\n1.  **Ưu tiên thấp**: Nếu người dùng chỉ nhắc đến một vật phẩm đã quá phổ biến (ví dụ: "tôi cần một cái điện thoại", "tôi muốn uống nước"), hãy bỏ qua và trả về null.\n2.  **Ưu tiên cao**: Nếu người dùng mô tả một vật phẩm có tính độc đáo, kỳ ảo, hoặc mang một công dụng đặc biệt (ví dụ: "ước gì có một chiếc la bàn chỉ về phía người mình yêu", "tôi cần một viên thuốc có thể giúp tôi quên đi mọi thứ"), hãy tạo ra vật phẩm đó.\n3.  **Sáng tạo**: Dựa trên mô tả, hãy sáng tạo ra một cái tên thật "kêu", một icon (emoji) phù hợp, mô tả hấp dẫn, giá cả hợp lý, và độ hiếm.\n4.  **Chỉ trả về JSON**: Nếu xác định được một vật phẩm, hãy trả về một object JSON. Nếu không, trả về null.\n\n[ĐỊNH DẠNG JSON]\n{\n  "id": "pro-random_string",\n  "name": "Tên vật phẩm (sáng tạo)",\n  "icon": "<emoji>",\n  "description": "Mô tả công dụng và vẻ ngoài của vật phẩm.",\n  "value": <giá_bán_bằng_số>,\n  "rarity": "Thường" | "Hiếm" | "Cực hiếm" | "Huyền thoại",\n  "category": "Consumable" | "Equipment" | "Special" | "Gift",\n  "affinityBonus": <điểm_hảo_cảm_cộng_thêm_khi_tặng>\n}`;

    const content = [{
      role: 'user',
      parts: [{ text: `Phân tích đoạn chat sau: \"${chatText}\"` }]
    }];

    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      system,
      true
    );

    const text = res.text || "";
    if (!text || text.startsWith("❌") || text.toLowerCase().trim() === 'null') {
      return null;
    }

    try {
      const parsed = JSON.parse(this.cleanJsonString(text));
      // Validate the parsed object to ensure it looks like an InventoryItem
      if (parsed && parsed.name && parsed.value && parsed.description) {
        return parsed as InventoryItem;
      }
      return null;
    } catch (e) {
      console.error("Proposal Parse Error:", e, "Raw:", text);
      return null;
    }
  }

  // ================================================================
  // DONATION CODE GENERATION
  // ================================================================
  public async generateDonationCode(amount: number): Promise<string> {
    const system = `Bạn là một AI sáng tạo, nhiệm vụ của bạn là tạo ra một lời chúc ngắn gọn, độc đáo, không dấu, và phải chứa cụm từ "Auro World".
    
    [VÍ DỤ]
    - Chuc ban mot ngay tot lanh cung Auro World
    - Ngan ngoi sao may man den voi ban trong Auro World
    - Auro World cam on tam long cua ban
    
    [YÊU CẦU]
    - Chỉ trả về một chuỗi văn bản duy nhất.
    - Ngắn gọn (dưới 15 từ).
    - Không dấu.
    - Bắt buộc chứa "Auro World".`;

    const content = [{
      role: 'user',
      parts: [{ text: `Tạo một lời chúc cho khoản ủng hộ ${amount.toLocaleString()} VNĐ.` }]
    }];

    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      system,
      false,
      50, // Max tokens thấp để đảm bảo ngắn gọn
      1.2 // Tăng temperature để đa dạng hơn
    );

    const text = res.text || "Auro World cam on ban";
    // Đảm bảo cụm từ luôn có mặt
    if (!text.toLowerCase().includes('auro world')) {
      return `${text} - Auro World`;
    }
    return text;
  }

  // ================================================================
  // DONATION VERIFICATION
  // ================================================================
  public async verifyDonation(imageFile: File, expectedAmount: number, expectedCode: string): Promise<{ success: boolean; message: string }> {
    try {
        const base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });

        const prompt = getDonationVerificationPrompt(expectedAmount, expectedCode);

        const content = [{
            role: 'user',
            parts: [
                { inlineData: { data: base64Image, mimeType: imageFile.type } },
                { text: prompt }
            ]
        }];

        const response = await this.safeGenerateContent(
            VISION_MODEL,
            content,
            undefined,
            true // isJson
        );

        const text = response.text;
        if (!text || text.includes("❌ Lỗi")) return { success: false, message: text || "Không nhận được phản hồi từ AI." };
        
        const result = JSON.parse(text);
        return {
            success: result.success,
            message: result.message
        };

    } catch (error) {
        console.error("Error verifying donation:", error);
        return { success: false, message: "Đã xảy ra lỗi trong quá trình xác minh hình ảnh." };
    }
  }

  // ================================================================
  // SHOP: TALK & STOCK (Moved to ShopService)
  // ================================================================
  // Methods chatWithShopkeeper and generateShopStock have been moved to ShopService.ts


  // ================================================================
  // CONNECTION TEST (SMART ROTATION)
  // ================================================================
  public async testModelConnection(modelName: string): Promise<{ success: boolean; latency: number; message: string }> {
    const start = Date.now();
    let lastErrorMsg = "Không có phản hồi.";

    // Bắt đầu thử từ Key hiện tại, sau đó xoay vòng
    const initialIndex = this.currentKeyIndex;

    // Thử từng key một trong danh sách (bắt đầu từ currentKeyIndex)
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (initialIndex + i) % this.apiKeys.length;
      
      try {
        // Tạo instance tạm với key thứ keyIndex
        const ai = new GoogleGenAI({ apiKey: this.apiKeys[keyIndex].value });
        
        // Gọi thử Ping
        const res = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          config: { maxOutputTokens: 5 }
        });

        // Nếu thành công (không throw lỗi)
        if (res && res.text) {
          const end = Date.now();
          
          // QUAN TRỌNG: Cập nhật luôn key đang dùng sang key ngon này
          this.currentKeyIndex = keyIndex;
          console.log(`[GeminiService] Test connection success with Key #${keyIndex + 1}. Switched to this key.`);
          
          return { 
            success: true, 
            latency: end - start, 
            message: `Kết nối Tốt (Đang dùng Key ${keyIndex + 1}/${this.apiKeys.length})` 
          };
        }
      } catch (error: any) {
        lastErrorMsg = error.message || "Lỗi kết nối.";
        console.warn(`[GeminiService] Key #${keyIndex + 1} failed test for ${modelName}: ${lastErrorMsg}`);
        // Key này lỗi, thử key tiếp theo...
      }
    }

    // Nếu chạy hết vòng lặp mà vẫn xuống đây -> Tất cả key đều lỗi
    const end = Date.now();
    
    // Dịch lỗi (lấy lỗi của key cuối cùng thử)
    let msg = lastErrorMsg;
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "Hết lượt (Quota) ở TẤT CẢ các Key. Hãy thêm Key mới.";
    } else if (msg.includes("API key not valid") || msg.includes("400")) {
        msg = "Tất cả API Key đều không hợp lệ.";
    } else if (msg.includes("503") || msg.includes("overloaded")) {
        msg = "Server Google quá tải (All Keys).";
    } else if (msg.includes("fetch failed")) {
        msg = "Lỗi mạng. Kiểm tra kết nối Internet.";
    }

    return { success: false, latency: end - start, message: msg };
  }

  // ================================================================
  // OPTIMIZED GENERATION METHODS (COMBINED STEPS)
  // ================================================================

  public async generateWorldContext(
    charName: string,
    charDesc: string,
    userName: string,
    userDesc: string,
    rawSetting: string,
    modelName: string = DEFAULT_MODEL
  ) {
    const prompt = getWorldContextPrompt(
      charName,
      charDesc,
      userName,
      userDesc,
      rawSetting
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(modelName, content, undefined, true);
    
    try {
      const text = res.text || "";
      if (text.startsWith("❌")) return { error: text };
      return JSON.parse(this.cleanJsonString(text));
    } catch {
      return {
        genre: "Hiện đại", era: "Hiện đại", techLevel: "Điện tử",
        worldDetail: "Một thế giới hiện đại bình thường.",
        worldRules: ["Luật pháp", "Tiền bạc", "Địa vị"], tone: "Thực tế", mainConflict: "Mâu thuẫn tình cảm", coreLore: charDesc
      };
    }
  }

  public async generateSocialAndEconomy(
    charName: string,
    userName: string,
    worldContext: any,
    modelName: string = DEFAULT_MODEL
  ) {
    const prompt = getNpcGenerationPrompt(charName, userName, worldContext);

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(modelName, content, undefined, true);

    try {
      const text = res.text || "";
      if (text.startsWith("❌")) return { error: text };
      return JSON.parse(this.cleanJsonString(text));
    } catch {
      return {
        relations: [], currencyName: "VND", shopNPCs: [],
        charMoney: 1000000, userMoney: 100000, charAssets: [], userAssets: []
      };
    }
  }

  // ================================================================
  // WORLD & LORE (OLD METHODS KEPT FOR COMPATIBILITY IF NEEDED)
  // ================================================================
  public async analyzeUserLore(
    charName: string,
    charDesc: string,
    userName: string,
    userDesc: string,
    rawSetting: string
  ) {
    const prompt = getAnalyzeUserLorePrompt(
      charName,
      charDesc,
      userName,
      userDesc,
      rawSetting
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );

    const text = res.text || "";
    if (text.startsWith("❌")) {
      return { text };
    }

    try {
      return JSON.parse(this.cleanJsonString(text));
    } catch {
      // fallback đơn giản
      return {
        genre: "hiện đại",
        era: "Hiện đại",
        techLevel: "điện tử",
        powerSystem: "",
        species: ["nhân loại"],
        coreLore: charDesc,
        mainConflict: `Quan hệ giữa ${charName} và ${userName} chưa rõ ràng.`,
        vibe: "trung tính",
        timelineSnapshot: "Khởi đầu câu chuyện"
      };
    }
  }

  public async generateWorldSetting(loreAnalysis: any) {
    const prompt = getWorldSettingPrompt(loreAnalysis);

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );

    const text = res.text || "";
    if (text.startsWith("❌")) {
      return { text };
    }

    try {
      return JSON.parse(this.cleanJsonString(text));
    } catch {
      return {
        worldDetail: "Một thế giới chưa xác định rõ, nơi mọi thứ đều có thể xảy ra.",
        worldRules: [],
        tone: loreAnalysis?.vibe || "trung tính"
      };
    }
  }

  // ================================================================
  // SOCIAL MEMORY (NPC PHỤ)
  // ================================================================
  public async generateSocialMemory(
    charName: string,
    worldGenesis: any,
    loreAnalysis: any
  ) {
    const prompt = getSocialMemoryPrompt(
      charName,
      worldGenesis,
      loreAnalysis
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      return {
        relations: Array.isArray(parsed.relations) ? parsed.relations : []
      };
    } catch {
      return { relations: [] };
    }
  }

  public async enrichNPC(
    charName: string,
    npc: any,
    _styleRefs: string[] = []
  ): Promise<Relation> {
    // Avatar dùng Dicebear, không gen ảnh AI (tiết kiệm token)
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
      npc.name
    )}`;

    return {
      id: npc.id || "rel-" + Math.random().toString(36).substr(2, 9),
      name: npc.name,
      type: npc.type,
      avatar: avatarUrl,
      description: npc.description || npc.visualPrompt || "Một người quen.",
      relationshipLevel: npc.relationshipLevel || npc.affinityWithChar || 50,
      relationshipStatus: npc.relationshipStatus || "Bình thường",
      personalNotes: npc.personalNotes || "",
      affinityWithChar: npc.affinityWithChar || npc.relationshipLevel || 50,
      history: npc.history || [],
      lastMessage: npc.lastMessage || "..."
    };
  }

  // ================================================================
  // ECONOMY & INITIAL ASSETS
  // ================================================================
  public async generateEconomy(worldGenesis: any) {
    const prompt = getEconomyPrompt(worldGenesis);

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );
    try {
      return JSON.parse(this.cleanJsonString(res.text));
    } catch {
      return {
        currencyName: "Xu",
        shopNPCs: []
      };
    }
  }

  public async generateOnIdleThought(
    charName: string,
    charDesc: string,
    history: Message[],
    settings: AppSettings
  ): Promise<{ text: string; mood: string }> {
    const system = getOnIdleThoughtPrompt(charName, charDesc);

    const content = [
      {
        role: "user",
        parts: [
          {
            text: `Lịch sử chat gần đây: ${JSON.stringify(history.slice(-5))}`
          }
        ]
      }
    ];

    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      system,
      true,
      200,
      0.9,
      settings.thinkingEnabled ? { thinkingLevel: settings.thinkingLevel || 'HIGH' } : undefined
    );
    try {
      return JSON.parse(this.cleanJsonString(res.text));
    } catch {
      return { text: "...", mood: "neutral" };
    }
  }

  public async generateInitialAssets(
    charName: string,
    userName: string,
    worldGenesis: any,
    loreAnalysis: any
  ) {
    const prompt = getInitialAssetsPrompt(
      charName,
      userName,
      worldGenesis,
      loreAnalysis
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      return {
        ...parsed,
        charInventory: Array.isArray(parsed.charInventory)
          ? parsed.charInventory
          : [],
        userInventory: Array.isArray(parsed.userInventory)
          ? parsed.userInventory
          : [],
        charProperties: Array.isArray(parsed.charProperties)
          ? parsed.charProperties
          : [],
        userProperties: Array.isArray(parsed.userProperties)
          ? parsed.userProperties
          : [],
        incomeStreams: Array.isArray(parsed.incomeStreams)
          ? parsed.incomeStreams
          : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
      };
    } catch {
      return {
        charMoney: 10000,
        userMoney: 500,
        charInventory: [],
        userInventory: [],
        charProperties: [],
        userProperties: [],
        incomeStreams: [],
        expenses: [],
        transactions: []
      };
    }
  }

  // ================================================================
  // AURONET / SOCIAL FEED
  // ================================================================
  public async generateLegacyContent(
    charName: string,
    relations: Relation[],
    worldGenesis: any,
    loreAnalysis: any,
    modelName: string = DEFAULT_MODEL
  ) {
    const npcNames = relations.map((r) => r.name).join(", ");
    const prompt = getLegacyContentPrompt(
      charName,
      npcNames,
      worldGenesis,
      loreAnalysis
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      modelName,
      content,
      undefined,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      return {
        legacySocialPosts: Array.isArray(parsed.legacySocialPosts)
          ? parsed.legacySocialPosts
          : []
      };
    } catch {
      return { legacySocialPosts: [] };
    }
  }

  public async generateRandomPost(
    character: Character,
    relations: Relation[],
    messages: Message[] = [],
    modelName: string = DEFAULT_MODEL
  ) {
    const authors = [character.name, ...relations.map((r) => r.name)];
    const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
    const chatContext = messages.slice(-10).map(m => `${m.sender === Sender.USER ? "User" : character.name}: ${m.text}`).join("\n");

    const prompt = getRandomPostPrompt(
      randomAuthor,
      character.world?.worldDetail || "",
      character.status || "",
      chatContext
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      modelName,
      content,
      undefined,
      true
    );
    try {
      return JSON.parse(this.cleanJsonString(res.text));
    } catch {
      return {};
    }
  }

  public async *generateUserPostReactionsStream(
    postContent: string,
    user: UserProfile,
    character: Character,
    relations: Relation[],
    messages: Message[] = [],
    postImage?: string,
    modelName: string = DEFAULT_MODEL
  ): AsyncGenerator<{ authorName: string; content: string }, void, unknown> {
    const validRelations = relations.filter((r: any) => (r.affinityWithChar || 50) > 0);
    // Shuffle and pick up to 3 NPCs + Main Character = 4 total
    const shuffledRelations = [...validRelations].sort(() => 0.5 - Math.random()).slice(0, 3);
    const reactors = [character, ...shuffledRelations];

    const alreadyCommented: string[] = [];
    const chatContext = messages.slice(-10).map(m => `${m.sender === Sender.USER ? user.name : character.name}: ${m.text}`).join("\n");

    for (const reactor of reactors) {
      const reaction = await this.generateSingleReactionToPost(
        postContent,
        user,
        {
          name: (reactor as any).name,
          notes:
            (reactor as any).personalNotes || (reactor as any).description || "",
          affinity: (reactor as any).affinityWithChar || (reactor as any).relationshipScore || 50
        },
        alreadyCommented,
        chatContext,
        postImage,
        modelName
      );
      if (reaction) {
          alreadyCommented.push(reaction.authorName);
          yield reaction;
      }
    }
  }

  public async generateUserPostReactions(
    postContent: string,
    user: UserProfile,
    character: Character,
    relations: Relation[],
    messages: Message[] = [],
    postImage?: string,
    modelName: string = DEFAULT_MODEL
  ): Promise<{ authorName: string; content: string }[]> {
    // Main character always reacts. Relations react if affinity > 0.
    const validRelations = relations.filter((r: any) => (r.affinityWithChar || 50) > 0);
    const shuffledRelations = [...validRelations].sort(() => 0.5 - Math.random()).slice(0, 3);
    const reactors = [character, ...shuffledRelations];

    const reactions: { authorName: string; content: string }[] = [];
    const chatContext = messages.slice(-10).map(m => `${m.sender === Sender.USER ? user.name : character.name}: ${m.text}`).join("\n");

    for (const reactor of reactors) {
      const reaction = await this.generateSingleReactionToPost(
        postContent,
        user,
        {
          name: (reactor as any).name,
          notes:
            (reactor as any).personalNotes || (reactor as any).description || "",
          affinity: (reactor as any).affinityWithChar || (reactor as any).relationshipScore || 50
        },
        reactions.map((r) => r.authorName),
        chatContext,
        postImage,
        modelName
      );
      if (reaction) reactions.push(reaction);
    }
    return reactions;
  }

  public async generateSingleReactionToPost(
    postContent: string,
    user: UserProfile,
    reactor: { name: string; notes: string; affinity: number },
    _alreadyCommented: string[],
    chatContext?: string,
    postImage?: string,
    modelName: string = DEFAULT_MODEL
  ): Promise<{ authorName: string; content: string } | null> {
    const len = postContent.length;
    const suggestedLength =
      len > 200 ? "10–30 từ" : len > 80 ? "5–15 từ" : "3–8 từ";

    const prompt = getSingleReactionToPostPrompt(
      postContent,
      user.name,
      reactor.name,
      reactor.notes,
      reactor.affinity,
      suggestedLength,
      chatContext,
      !!postImage
    );

    const parts: any[] = [{ text: prompt }];
    if (postImage) {
        const img = this.parseImageData(postImage);
        parts.unshift({ inlineData: { data: img.data, mimeType: img.mimeType } });
    }

    const content = [{ role: "user", parts: parts }];
    const res = await this.safeGenerateContent(
      modelName,
      content,
      undefined,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      return parsed.content ? parsed : null;
    } catch {
      return null;
    }
  }

  public async *generateMassReactionsToCommentStream(
    postContent: string,
    userComment: string,
    user: UserProfile,
    character: Character,
    relations: Relation[],
    messages: Message[] = [],
    modelName: string = DEFAULT_MODEL
  ): AsyncGenerator<{ authorName: string; content: string }, void, unknown> {
    // Chỉ chọn main character và tối đa 3 relations ngẫu nhiên
    const shuffledRelations = [...relations].sort(() => 0.5 - Math.random()).slice(0, 3);
    const members = [
      { name: character.name, notes: character.description },
      ...shuffledRelations.map((r) => ({ name: r.name, notes: r.personalNotes }))
    ];

    const chatContext = messages.slice(-10).map(m => `${m.sender === Sender.USER ? user.name : character.name}: ${m.text}`).join("\n");

    for (const member of members) {
        const singleReaction = await this.generateSingleReactionToComment(postContent, userComment, user, member, chatContext, modelName);
        if(singleReaction) {
            yield singleReaction;
        }
    }
  }

  // This is a helper for the stream above
  private async generateSingleReactionToComment(
    postContent: string,
    userComment: string,
    user: UserProfile,
    reactor: { name: string; notes: string; },
    chatContext?: string,
    modelName: string = DEFAULT_MODEL
  ): Promise<{ authorName: string; content: string } | null> {
      const prompt = getSingleReactionToCommentPrompt(
        postContent,
        userComment,
        user.name,
        reactor.name,
        reactor.notes,
        chatContext
      );

      const content = [{ role: "user", parts: [{ text: prompt }] }];
      const res = await this.safeGenerateContent(
          modelName,
          content,
          undefined,
          true
      );
      try {
          const parsed = JSON.parse(this.cleanJsonString(res.text));
          return parsed.content ? parsed : null;
      } catch {
          return null;
      }
  }

  public async generateMassReactionsToComment(
    postContent: string,
    userComment: string,
    user: UserProfile,
    char: Character,
    relations: Relation[],
    messages: Message[] = [],
    modelName: string = DEFAULT_MODEL
  ) {
    const members = [
      { name: char.name, notes: char.description },
      ...relations.map((r) => ({ name: r.name, notes: r.personalNotes }))
    ];

    const chatContext = messages.slice(-10).map(m => `${m.sender === Sender.USER ? user.name : char.name}: ${m.text}`).join("\n");

    const prompt = getMassReactionsToCommentPrompt(
      postContent,
      userComment,
      user.name,
      members,
      chatContext
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      modelName,
      content,
      undefined,
      true
    );
    try {
      const parsed = JSON.parse(this.cleanJsonString(res.text));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ================================================================
  // NHẬT KÝ (DIARY) – ĐỌC TOÀN BỘ NHẬT KÝ CŨ
  // ================================================================
  public async generateDiaryEntry(
    char: Character,
    messages: Message[]
  ): Promise<{ content: string; mood: string }> {
    const recentMessages = messages.slice(-15);
    const chatText = recentMessages
      .map((m) => {
        const speaker = m.sender === Sender.USER ? "User" : char.name;
        return `${speaker}: ${m.text}`;
      })
      .join("\n");

    const pastDiarySummary =
      (char.diary || [])
        .map(
          (d) =>
            `- [${new Date(d.date).toLocaleDateString(
              "vi-VN"
            )} | ${d.mood}]: ${d.content}`
        )
        .join("\n") || "Chưa có nhật ký trước đó.";

    const prompt = getDiaryEntryPrompt(
      char.name,
      pastDiarySummary,
      chatText
    );

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );
    try {
      return JSON.parse(this.cleanJsonString(res.text));
    } catch {
      return {
        content: `Hôm nay ${char.name} im lặng, nhưng trong lòng vẫn còn nhiều điều chưa nói.`,
        mood: "Mệt mỏi"
      };
    }
  }

  // ================================================================
  // PARSE CHAR DOC / IMAGE / CHIBI / CARD ART
  // ================================================================
  public async parseCharacterDocument(text: string, lang: string = "vi") {
    const prompt = getParseCharacterDocumentPrompt(text, lang);

    const content = [{ role: "user", parts: [{ text: prompt }] }];
    const res = await this.safeGenerateContent(
      DEFAULT_MODEL,
      content,
      undefined,
      true
    );
    try {
      return JSON.parse(this.cleanJsonString(res.text));
    } catch {
      return {};
    }
  }

  public async analyzeImage(
    base64: string,
    type: "Character" | "User"
  ): Promise<string> {
    const img = this.parseImageData(base64);
    try {
      const content = [
        {
          role: "user",
          parts: [
            { inlineData: { data: img.data, mimeType: img.mimeType } },
            {
              text: getAnalyzeImagePrompt(type)
            }
          ]
        }
      ];

      const res = await this.safeGenerateContent(
        VISION_MODEL,
        content,
        undefined,
        false
      );
      return res.text || "";
    } catch (e) {
      console.error("Image analysis failed:", e);
      return "❌ Không thể phân tích ảnh.";
    }
  }
}
