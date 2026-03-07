
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSettings, ApiKeyData, ApiProviderConfig } from '../types';
import { PROXY_PRESETS } from '../constants';

export const GEMINI_MODELS = [
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', desc: 'Siêu Nhanh - Khuyên dùng' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Thông minh nhất' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Ổn định, cân bằng' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Mạnh mẽ, ổn định' }
];

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', desc: 'Thông minh, Roleplay tốt' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', desc: 'Siêu nhanh, nhẹ' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', desc: 'Cân bằng' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', desc: 'Mạnh mẽ, suy luận tốt' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', desc: 'Tốc độ bàn thờ' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', desc: 'Thử nghiệm' },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 0905', desc: 'Moonshot AI' }
];

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  settings: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
  showApiInputs?: boolean;
}

export default function ModelSelector({ 
  selectedModel, 
  onSelectModel, 
  settings, 
  onUpdateSettings,
  showApiInputs = true
}: ModelSelectorProps) {
  const [activeTab, setActiveTab] = useState<'gemini' | 'groq' | 'proxy'>('gemini');
  
  const [groqKey, setGroqKey] = useState('');
  const [proxyBaseUrl, setProxyBaseUrl] = useState('');
  const [proxyKey, setProxyKey] = useState('');
  const [proxyModelName, setProxyModelName] = useState('');

  useEffect(() => {
    const groqConfig = settings.apiConfigs?.find(c => c.provider === 'groq');
    if (groqConfig && groqConfig.keys.length > 0) {
      setGroqKey(groqConfig.keys[0].value);
    }

    const proxyConfig = settings.apiConfigs?.find(c => c.provider === 'proxy');
    if (proxyConfig) {
        setProxyBaseUrl(proxyConfig.baseUrl || '');
        setProxyModelName(proxyConfig.activeModel || '');
        if (proxyConfig.keys.length > 0) {
            setProxyKey(proxyConfig.keys[0].value);
        }
    }

    // Initial tab detection
    if (selectedModel.includes('llama') || selectedModel.includes('qwen') || selectedModel.includes('gpt-oss') || selectedModel.includes('kimi')) {
      setActiveTab('groq');
    } else if (proxyConfig && (proxyConfig.activeModel === selectedModel || proxyConfig.model === selectedModel)) {
      setActiveTab('proxy');
    } else {
      setActiveTab('gemini');
    }
  }, [selectedModel, settings.apiConfigs]);

  const handleApplyProxyPreset = (preset: typeof PROXY_PRESETS[0]) => {
      setProxyBaseUrl(preset.baseUrl);
      setProxyModelName(preset.model);
      onSelectModel(preset.model);
      
      if (onUpdateSettings) {
          updateProxyInSettings(preset.baseUrl, preset.model, proxyKey);
      }
  };

  const updateProxyInSettings = (baseUrl: string, model: string, key: string) => {
      if (!onUpdateSettings) return;
      
      let newApiConfigs = [...(settings.apiConfigs || [])];
      const proxyIndex = newApiConfigs.findIndex(c => c.provider === 'proxy');
      const proxyKeyData: ApiKeyData = { value: key, isActive: true };
      
      if (proxyIndex >= 0) {
          newApiConfigs[proxyIndex] = {
              ...newApiConfigs[proxyIndex],
              baseUrl,
              model,
              activeModel: model,
              keys: key ? [proxyKeyData] : newApiConfigs[proxyIndex].keys,
              isEnabled: true
          };
      } else {
          newApiConfigs.push({
              provider: 'proxy',
              isEnabled: true,
              activeModel: model,
              model,
              baseUrl,
              keys: key ? [proxyKeyData] : []
          });
      }
      
      onUpdateSettings({ ...settings, apiConfigs: newApiConfigs });
  };

  const handleGroqKeyChange = (val: string) => {
      setGroqKey(val);
      if (onUpdateSettings) {
          let newApiConfigs = [...(settings.apiConfigs || [])];
          const groqIndex = newApiConfigs.findIndex(c => c.provider === 'groq');
          const groqKeyData: ApiKeyData = { value: val, isActive: true };
          
          if (groqIndex >= 0) {
              newApiConfigs[groqIndex].keys = val ? [groqKeyData] : [];
          } else if (val) {
              newApiConfigs.push({
                  provider: 'groq',
                  isEnabled: true,
                  activeModel: '',
                  keys: [groqKeyData]
              });
          }
          onUpdateSettings({ ...settings, apiConfigs: newApiConfigs });
      }
  };

  return (
    <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors ${activeTab === 'gemini' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Google Gemini
          </button>
          <button 
            onClick={() => setActiveTab('groq')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors ${activeTab === 'groq' ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Groq Cloud
          </button>
          <button 
            onClick={() => setActiveTab('proxy')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors ${activeTab === 'proxy' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Custom Proxy
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'gemini' && (
              <motion.div 
                key="gemini"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-[9px] text-indigo-700">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Mặc định sử dụng API Key của hệ thống.
                </div>

                <div className="space-y-2">
                  {GEMINI_MODELS.map(model => (
                    <div 
                      key={model.id}
                      onClick={() => onSelectModel(model.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedModel === model.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 bg-white'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{model.name}</span>
                        {selectedModel === model.id && <i className="fa-solid fa-circle-check text-indigo-500"></i>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{model.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'groq' && (
              <motion.div 
                key="groq"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                {showApiInputs && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <label className="text-[10px] font-bold text-rose-700 uppercase mb-1 block">Groq API Key</label>
                        <input 
                            type="password" 
                            value={groqKey}
                            onChange={(e) => handleGroqKeyChange(e.target.value)}
                            placeholder="gsk_..."
                            className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs outline-none focus:border-rose-400"
                        />
                        <div className="text-[9px] text-rose-500 mt-1 italic">
                            Lấy key tại <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-bold">console.groq.com</a>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                  {GROQ_MODELS.map(model => (
                    <div 
                      key={model.id}
                      onClick={() => onSelectModel(model.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedModel === model.id ? 'border-rose-500 bg-rose-50' : 'border-slate-100 hover:border-rose-200 bg-white'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{model.name}</span>
                        {selectedModel === model.id && <i className="fa-solid fa-circle-check text-rose-500"></i>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{model.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'proxy' && (
              <motion.div 
                key="proxy"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {PROXY_PRESETS.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleApplyProxyPreset(preset)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                proxyModelName === preset.model && proxyBaseUrl === preset.baseUrl
                                ? 'bg-purple-100 border-purple-300 text-purple-800 shadow-sm'
                                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="font-bold text-[10px]">{preset.name}</div>
                            <div className="text-[8px] opacity-70 truncate">{preset.baseUrl}</div>
                        </button>
                    ))}
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-[10px] uppercase mb-1.5">
                    <i className="fa-solid fa-server"></i>
                    Cấu hình Proxy
                  </div>
                  {proxyBaseUrl ? (
                    <div className="space-y-1">
                        <div className="text-[9px] text-purple-600">
                            <span className="font-bold">Base URL:</span> {proxyBaseUrl}
                        </div>
                        <div className="text-[9px] text-purple-600">
                            <span className="font-bold">Model:</span> {proxyModelName}
                        </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-purple-600 italic">
                        Chưa có cấu hình Proxy.
                    </div>
                  )}
                </div>

                {proxyModelName && (
                    <div 
                      onClick={() => onSelectModel(proxyModelName)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedModel === proxyModelName ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200 bg-white'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{proxyModelName}</span>
                        {selectedModel === proxyModelName && <i className="fa-solid fa-circle-check text-purple-500"></i>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Custom Proxy Model</div>
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  );
}
