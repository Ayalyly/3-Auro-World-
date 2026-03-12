
import React, { useState, useRef } from 'react';
import { AppSettings, Character, UserProfile, Message, AuraExportData, PromptPreset } from '../types';
import ModelSelectorModal from './ModelSelectorModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  gameData: {
    character: Character | null;
    user: UserProfile;
    messages: Message[];
  };
  onImport: (data: AuraExportData) => void;
  onTestModel?: (model: string) => Promise<{ success: boolean; latency: number; message: string }>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSaveSettings, gameData, onImport, onTestModel }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'data' | 'behavior' | 'appearance'>('general');
  const [modelSelectorConfig, setModelSelectorConfig] = useState<{ isOpen: boolean; target: 'model' | 'shopModel' | 'socialModel'; title: string }>({
    isOpen: false,
    target: 'model',
    title: 'Chọn Model AI'
  });
  const [localSettings, setLocalSettings] = useState<AppSettings>(JSON.parse(JSON.stringify(settings)));
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    if (!onTestModel) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTestModel(localSettings.model || 'gemini-3.1-flash-lite-preview');
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, latency: 0, message: "Lỗi không xác định." });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Import/Export Local State
  const [exportSelection, setExportSelection] = useState({
    character: true,
    user: true,
    inventory: true,
    money: true,
    stats: true,
    messages: true,
    settings: true
  });
  const [parsedImportData, setParsedImportData] = useState<AuraExportData | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const updateBehavior = (key: keyof NonNullable<AppSettings['behavior']>, value: boolean) => {
    const newBehavior = {
      ...localSettings.behavior,
      npcAutoReply: localSettings.behavior?.npcAutoReply ?? false,
      npcAutoComment: localSettings.behavior?.npcAutoComment ?? false,
      enableImageUpload: localSettings.behavior?.enableImageUpload ?? true,
      enableNSFWFilter: localSettings.behavior?.enableNSFWFilter ?? false,
      [key]: value
    };
    const updated = { ...localSettings, behavior: newBehavior };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  // --- LOGIC: HANDLE RULE SELECTION ---
  const handleSelectRule = (id: string, type: 'system' | 'prefix') => {
      const field = type === 'system' ? 'systemPrompts' : 'prefixes';
      const currentList = localSettings[field] || [];
      
      const newList = currentList.map(item => ({
          ...item,
          isActive: item.id === id
      }));
      
      const updated = { ...localSettings, [field]: newList };
      setLocalSettings(updated);
      onSaveSettings(updated);
  };

  const activeSystemPrompt = localSettings.systemPrompts?.find(p => p.isActive);
  const activePrefix = localSettings.prefixes?.find(p => p.isActive);

  // --- LOGIC: IMPORT/EXPORT ---
  const handleExportJson = () => {
    const { character, user, messages } = gameData;
    const data: any = { meta: { version: '1.0', timestamp: Date.now() } };

    if (exportSelection.character && character) data.character = character;
    if (exportSelection.user && user) {
        const u = { ...user };
        if (!exportSelection.inventory) u.inventory = [];
        if (!exportSelection.money) { u.money = 0; u.transactions = []; }
        data.user = u;
    }
    if (exportSelection.messages) data.messages = messages;
    if (exportSelection.settings) data.settings = localSettings;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Auro_Export_${Date.now()}.json`;
    a.click();
  };

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          setParsedImportData(json);
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const executeImport = () => {
    if (parsedImportData) {
      onImport(parsedImportData);
      setParsedImportData(null);
      alert('Import thành công!');
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Hành động này sẽ xóa bộ nhớ đệm và tải lại ứng dụng để cập nhật phiên bản mới nhất. Bạn có chắc chắn?')) {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (e) {
          console.error("SW unregister failed", e);
        }
      }
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
        } catch (e) {
          console.error("Cache clear failed", e);
        }
      }
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-sliders"></i> Cài Đặt
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-slate-300">v1.2.5-stable</span>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[{
            id: 'general', label: 'AI Control', icon: 'fa-brain' },
            { id: 'rules', label: 'Rules', icon: 'fa-scroll' },
            { id: 'appearance', label: 'Giao diện', icon: 'fa-palette' },
            { id: 'data', label: 'Data', icon: 'fa-database' },
            { id: 'behavior', label: 'Behavior', icon: 'fa-robot' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          
          {/* 1. AI CONTROL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">AI Model (Chat Chính)</label>
                <div 
                  onClick={() => setModelSelectorConfig({ isOpen: true, target: 'model', title: 'Chọn Model Chat Chính' })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-microchip text-indigo-500"></i>
                    <span>{localSettings.model || 'gemini-3.1-flash-lite-preview'}</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400"></i>
                </div>
              </div>

              {/* Shop Model Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">AI Model (Cửa Hàng)</label>
                <div 
                  onClick={() => setModelSelectorConfig({ isOpen: true, target: 'shopModel', title: 'Chọn Model Cửa Hàng' })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-shop text-emerald-500"></i>
                    <span>{localSettings.shopModel || 'Dùng chung Chat Chính'}</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400"></i>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic">* Groq giúp cửa hàng load nhanh hơn đáng kể.</p>
              </div>

              {/* Social Model Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">AI Model (Auro Net)</label>
                <div 
                  onClick={() => setModelSelectorConfig({ isOpen: true, target: 'socialModel', title: 'Chọn Model Auro Net' })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-globe text-blue-500"></i>
                    <span>{localSettings.socialModel || 'Dùng chung Chat Chính'}</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400"></i>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic">* Dùng model nhanh để tạo feed và comment mượt hơn.</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Max Output Tokens</label>
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{localSettings.maxTokens || 2000}</span>
                </div>
                <input 
                  type="range" 
                  min="256" max="16384" step="256"
                  value={localSettings.maxTokens || 2000}
                  onChange={e => {
                    const updated = {...localSettings, maxTokens: parseInt(e.target.value)};
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-bold">
                  <span>256 (Ngắn)</span>
                  <span>16k (Tiểu thuyết)</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="flex items-center justify-between cursor-pointer mb-3">
                  <span className="text-xs font-bold text-slate-700 uppercase">Bật AI Thinking (Reasoning)</span>
                  <input 
                    type="checkbox" 
                    checked={localSettings.thinkingEnabled ?? false}
                    onChange={e => {
                      const updated = {...localSettings, thinkingEnabled: e.target.checked};
                      setLocalSettings(updated);
                      onSaveSettings(updated);
                    }}
                    className="accent-indigo-600 w-4 h-4"
                  />
                </label>
                {localSettings.thinkingEnabled && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Thinking Level</label>
                    <select 
                      value={localSettings.thinkingLevel || 'HIGH'}
                      onChange={e => {
                        const updated = {...localSettings, thinkingLevel: e.target.value as 'LOW' | 'HIGH'};
                        setLocalSettings(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none"
                    >
                      <option value="LOW">Low (Nhanh, ít suy luận)</option>
                      <option value="HIGH">High (Sâu sắc, suy luận kỹ)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Temperature (Creativity)</label>
                  <span className="text-xs font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded">{localSettings.temperature || 0.9}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1"
                  value={localSettings.temperature || 0.9}
                  onChange={e => {
                    const updated = {...localSettings, temperature: parseFloat(e.target.value)};
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full accent-pink-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}



          {/* 2. RULES & PREFIX (CONNECTED TO DASHBOARD DATA) */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              
              {/* SYSTEM PROMPTS SELECTOR */}
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase block">Quy tắc ứng xử (Preset)</label>
                    <span className="text-[9px] text-slate-400 italic">(Dữ liệu từ Dashboard)</span>
                </div>
                
                {localSettings.systemPrompts && localSettings.systemPrompts.length > 0 ? (
                    <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none mb-2 font-bold text-slate-700 focus:border-indigo-500"
                        value={activeSystemPrompt?.id || ''}
                        onChange={(e) => handleSelectRule(e.target.value, 'system')}
                    >
                        <option value="">-- Mặc định (Không dùng Preset) --</option>
                        {localSettings.systemPrompts.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                ) : (
                    <div className="p-3 border border-dashed border-amber-300 bg-amber-50 rounded-xl text-[10px] text-amber-700 mb-2">
                        Chưa có quy tắc nào. Hãy vào <b>Trung tâm điều hành</b> để tạo.
                    </div>
                )}

                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[10px] text-slate-500 italic min-h-[60px]">
                  {activeSystemPrompt ? activeSystemPrompt.content : "Đang dùng thiết lập mặc định của nhân vật."}
                </div>
              </div>

              {/* PREFIX SELECTOR */}
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase block">Tiền tố lời thoại (Prefix)</label>
                    <span className="text-[9px] text-slate-400 italic">(Dữ liệu từ Dashboard)</span>
                </div>

                {localSettings.prefixes && localSettings.prefixes.length > 0 ? (
                    <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none mb-2 font-bold text-slate-700 focus:border-indigo-500"
                        value={activePrefix?.id || ''}
                        onChange={(e) => handleSelectRule(e.target.value, 'prefix')}
                    >
                        <option value="">-- Không dùng --</option>
                        {localSettings.prefixes.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                ) : (
                    <div className="p-3 border border-dashed border-slate-300 bg-slate-50 rounded-xl text-[10px] text-slate-400 mb-2">
                        Chưa có tiền tố nào. Hãy vào <b>Trung tâm điều hành</b> để tạo.
                    </div>
                )}

                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[10px] text-slate-500 italic">
                  Preview: "{activePrefix ? activePrefix.content : ""}..."
                </div>
              </div>
            </div>
          )}

          {/* 3. DATA IMPORT/EXPORT */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* EXPORT SECTION */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-indigo-600 uppercase mb-3 flex items-center gap-2"><i className="fa-solid fa-download"></i> Export JSON</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.keys(exportSelection).map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={(exportSelection as any)[key]} 
                        onChange={e => setExportSelection({...exportSelection, [key]: e.target.checked})}
                        className="accent-indigo-600"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{key}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleExportJson} className="w-full py-2 bg-indigo-50 text-indigo-600 font-bold text-[10px] uppercase rounded-lg hover:bg-indigo-100 border border-indigo-200">
                  Tải xuống Backup (.JSON)
                </button>
              </div>

              {/* IMPORT SECTION */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-emerald-600 uppercase mb-3 flex items-center gap-2"><i className="fa-solid fa-upload"></i> Import JSON</h3>
                <input type="file" ref={importInputRef} accept=".json" onChange={handleFileRead} className="hidden" />
                
                {!parsedImportData ? (
                  <button onClick={() => importInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all">
                    <i className="fa-solid fa-file-circle-plus text-2xl"></i>
                    <span className="text-[10px] font-bold uppercase">Chọn file JSON</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] text-emerald-700">
                      <p><b>File Valid!</b> Found: Char, User, Messages...</p>
                    </div>
                    <button onClick={executeImport} className="w-full py-2 bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-lg shadow-md hover:bg-emerald-600">
                      Xác nhận Import
                    </button>
                    <button onClick={() => setParsedImportData(null)} className="w-full py-2 text-slate-400 text-[10px] font-bold uppercase hover:text-slate-600">Huỷ</button>
                  </div>
                )}
              </div>

              {/* CACHE SECTION */}
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
                <h3 className="text-xs font-black text-rose-600 uppercase mb-1 flex items-center gap-2"><i className="fa-solid fa-broom"></i> Bảo trì & Cập nhật</h3>
                <p className="text-[9px] text-rose-400 mb-3">Nếu ứng dụng không tự cập nhật giao diện mới hoặc gặp lỗi lạ, hãy thử xóa cache.</p>
                <button onClick={handleClearCache} className="w-full py-2 bg-white text-rose-600 font-bold text-[10px] uppercase rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors">
                  Xóa Cache & Cập nhật ngay
                </button>
              </div>
            </div>
          )}

          {/* 5. APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Phông chữ (Hỗ trợ Tiếng Việt)</label>
                <select 
                  value={localSettings.theme.fontFamily || 'Inter'}
                  onChange={e => {
                    const updated = {
                      ...localSettings, 
                      theme: { ...localSettings.theme, fontFamily: e.target.value }
                    };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="Inter">Inter (Mặc định)</option>
                  <option value="Roboto">Roboto (Hiện đại)</option>
                  <option value="Montserrat">Montserrat (Trẻ trung)</option>
                  <option value="Be Vietnam Pro">Be Vietnam Pro (Tối ưu Việt)</option>
                  <option value="Quicksand">Quicksand (Mềm mại)</option>
                  <option value="Playfair Display">Playfair Display (Cổ điển)</option>
                  <option value="Cormorant Garamond">Cormorant Garamond (Sang trọng)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Cỡ chữ chat</label>
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{localSettings.theme.fontSize || 14}px</span>
                </div>
                <input 
                  type="range" 
                  min="12" max="24" step="1"
                  value={localSettings.theme.fontSize || 14}
                  onChange={e => {
                    const updated = {
                      ...localSettings, 
                      theme: { ...localSettings.theme, fontSize: parseInt(e.target.value) }
                    };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Độ mờ bong bóng chat</label>
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{localSettings.theme.bubbleOpacity !== undefined ? localSettings.theme.bubbleOpacity : 90}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="100" step="5"
                  value={localSettings.theme.bubbleOpacity !== undefined ? localSettings.theme.bubbleOpacity : 90}
                  onChange={e => {
                    const updated = {
                      ...localSettings, 
                      theme: { ...localSettings.theme, bubbleOpacity: parseInt(e.target.value) }
                    };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Loại hình nền Chat</label>
                <select 
                  value={localSettings.theme.chatBgType || 'color'}
                  onChange={e => {
                    const updated = {
                      ...localSettings, 
                      theme: { ...localSettings.theme, chatBgType: e.target.value as 'color' | 'image' | 'youtube' }
                    };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 mb-3"
                >
                  <option value="color">Màu trơn</option>
                  <option value="image">Hình ảnh</option>
                  <option value="youtube">Video YouTube</option>
                </select>

                {(!localSettings.theme.chatBgType || localSettings.theme.chatBgType === 'color') && (
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={localSettings.theme.chatBg || '#f4f6ff'}
                      onChange={e => {
                        const updated = {
                          ...localSettings, 
                          theme: { ...localSettings.theme, chatBg: e.target.value }
                        };
                        setLocalSettings(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                    />
                    <span className="text-xs font-mono text-slate-500">{localSettings.theme.chatBg || '#f4f6ff'}</span>
                  </div>
                )}

                {localSettings.theme.chatBgType === 'image' && (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Nhập link hình ảnh (URL)..."
                      value={localSettings.theme.chatBgImage || ''}
                      onChange={e => {
                        const updated = {
                          ...localSettings, 
                          theme: { ...localSettings.theme, chatBgImage: e.target.value }
                        };
                        setLocalSettings(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-indigo-500"
                    />
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const updated = {
                                ...localSettings, 
                                theme: { ...localSettings.theme, chatBgImage: reader.result as string }
                              };
                              setLocalSettings(updated);
                              onSaveSettings(updated);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full p-3 bg-indigo-50 border border-indigo-200 border-dashed rounded-xl text-xs font-bold text-indigo-600 text-center flex justify-center items-center gap-2 hover:bg-indigo-100 transition-colors">
                        <i className="fa-solid fa-upload"></i> Hoặc tải ảnh lên từ máy
                      </div>
                    </div>
                  </div>
                )}

                {localSettings.theme.chatBgType === 'youtube' && (
                  <div>
                    <input 
                      type="text" 
                      placeholder="Nhập link YouTube (VD: https://www.youtube.com/watch?v=...)"
                      value={localSettings.theme.chatBgYoutubeUrl || ''}
                      onChange={e => {
                        const updated = {
                          ...localSettings, 
                          theme: { ...localSettings.theme, chatBgYoutubeUrl: e.target.value }
                        };
                        setLocalSettings(updated);
                        onSaveSettings(updated);
                      }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Giao diện Chat</label>
                <select 
                  value={localSettings.theme.chatLayoutStyle || 'default'}
                  onChange={e => {
                    const updated = {
                      ...localSettings, 
                      theme: { ...localSettings.theme, chatLayoutStyle: e.target.value as 'default' | 'immersive' | 'immersive-short' }
                    };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="default">Mặc định (Nền xám/trắng)</option>
                  <option value="immersive">Trong suốt (Ngắm nền)</option>
                  <option value="immersive-short">Trong suốt (Cắt ngắn 1/3)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Màu chữ chính</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={localSettings.theme.textColor || '#334155'}
                    onChange={e => {
                      const updated = {
                        ...localSettings, 
                        theme: { ...localSettings.theme, textColor: e.target.value }
                      };
                      setLocalSettings(updated);
                      onSaveSettings(updated);
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                  />
                  <span className="text-xs font-mono text-slate-500">{localSettings.theme.textColor || '#334155'}</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Xem trước:</p>
                <div 
                  className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                  style={{ 
                    fontFamily: localSettings.theme.fontFamily || 'Inter',
                    fontSize: `${localSettings.theme.fontSize || 14}px`,
                    color: localSettings.theme.textColor || '#334155'
                  }}
                >
                  Đây là nội dung tin nhắn mẫu để bạn xem trước phông chữ và màu sắc.
                </div>
              </div>
            </div>
          )}

          {/* 6. BEHAVIOR */}
          {activeTab === 'behavior' && (
            <div className="space-y-3">
              {[{
                key: 'npcAutoReply', label: 'NPC Tự động Chat (Auto-reply)', desc: 'NPC chủ động nhắn tin khi bạn im lặng.' },
                { key: 'npcAutoComment', label: 'NPC Tự động Comment', desc: 'NPC tự vào bình luận khi bạn đăng bài.' },
                { key: 'enableImageUpload', label: 'Gửi Ảnh (Vision)', desc: 'Cho phép gửi ảnh cho AI xem.' },
                { key: 'enableNSFWFilter', label: 'BỘ LỌC BẢO VỆ TRẺ VỊ THÀNH NIÊN (NSFW 18+)', desc: 'Bật để lọc các nội dung nhạy cảm.' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 uppercase">{item.label}</p>
                    <p className="text-[9px] text-slate-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={(localSettings.behavior as any)?.[item.key] ?? false}
                      onChange={e => updateBehavior(item.key as any, e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-50 transition-colors">
            Huỷ bỏ
          </button>
          <button onClick={handleSave} className="px-8 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
            Lưu Cài Đặt
          </button>
        </div>

      </div>
      
      {modelSelectorConfig.isOpen && (
        <ModelSelectorModal
          settings={localSettings}
          targetField={modelSelectorConfig.target}
          title={modelSelectorConfig.title}
          onSaveSettings={(newSettings) => {
            setLocalSettings(newSettings);
            onSaveSettings(newSettings);
          }}
          onClose={() => setModelSelectorConfig({ ...modelSelectorConfig, isOpen: false })}
          onTestModel={onTestModel}
        />
      )}
    </div>
  );
};

export default SettingsModal;
