import { useState, useEffect } from 'react';
import { AppSettings, PromptPreset, ApiProviderConfig } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'vi',
  model: 'gemini-3.1-flash-lite-preview',
  speed: 1,
  responseLength: 'balanced',
  emotionalIntensity: 50,
  maxTokens: 2000,
  theme: {
    primaryColor: '#6366f1',
    chatBg: '#f8fafc',
    userBubbleColor: '#6366f1',
    aiBubbleColor: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 14,
    textColor: '#334155'
  },
  apiConfigs: [
    {
      provider: 'gemini',
      keys: [{ value: '', isActive: true }],
      activeModel: 'gemini-3.1-flash-lite-preview',
      isEnabled: true
    }
  ],
  systemPrompts: [],
  prefixes: [],
  giftCodeSheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKQDXmiKXdJw5AOl9gDA9BqXwMgJt_Lgww-G6eMUOjLC1dPN3p_A_LE1ooIPf_f5vZ4XH4ekYQrj77/pub?output=csv',
  unallocatedAuroCoins: 0,
  unallocatedItems: [],
  usedGiftCodes: [],
  behavior: {
    npcAutoReply: true,
    npcAutoComment: true,
    enableImageUpload: true,
    enableNSFWFilter: true
  },
  chatDisplayLimit: 15
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Load settings from local storage on initial load
    const saved = localStorage.getItem('auro_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) { console.error("Failed to parse settings from localStorage", e); }
    }
  }, []);

  const saveSettingsToStorage = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('auro_settings', JSON.stringify(newSettings));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn("LocalStorage quota exceeded. Attempting to clear custom icon to save space.");
        // Try removing custom icon as it's likely the largest item
        if (newSettings.theme?.customIcon) {
           const fallbackSettings = {
             ...newSettings,
             theme: { ...newSettings.theme, customIcon: undefined }
           };
           try {
             localStorage.setItem('auro_settings', JSON.stringify(fallbackSettings));
             setSettings(fallbackSettings); // Update state to reflect removal
             alert("Bộ nhớ trình duyệt đã đầy! Không thể lưu icon tùy chỉnh. Các cài đặt khác đã được lưu.");
             return;
           } catch (retryError) {
             console.error("Still failed after removing icon", retryError);
           }
        }
        alert("Bộ nhớ trình duyệt đã đầy (Quota Exceeded)! Vui lòng xóa bớt dữ liệu hoặc reset app.");
      } else {
        console.error("Failed to save settings", e);
      }
    }
    // Note: The Firebase sync part will be handled by a different hook that uses this one.
  };

  const handleUpdateRules = (type: 'system' | 'prefix', prompts: PromptPreset[]) => {
    saveSettingsToStorage({
      ...settings,
      [type === 'system' ? 'systemPrompts' : 'prefixes']: prompts
    });
  };

  return {
    settings,
    setSettings, // Expose setSettings for direct updates if needed
    saveSettingsToStorage,
    handleUpdateRules,
    DEFAULT_SETTINGS
  };
};