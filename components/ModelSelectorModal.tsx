import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppSettings, ApiKeyData } from '../types';
import ModelSelector from './ModelSelector';

interface ModelSelectorModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
  onTestModel?: (model: string) => Promise<{ success: boolean; latency: number; message: string }>;
  targetField?: 'model' | 'shopModel' | 'socialModel' | 'worldModel';
  title?: string;
}

export default function ModelSelectorModal({ 
  settings, 
  onSaveSettings, 
  onClose, 
  onTestModel,
  targetField = 'model',
  title = 'Chọn Model AI'
}: ModelSelectorModalProps) {
  const [selectedModel, setSelectedModel] = useState(settings[targetField] || 'gemini-3.1-flash-lite-preview');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number; message: string } | null>(null);

  // Only sync settings, don't force reset selectedModel if it's already being edited
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Only reset selectedModel when targetField changes or on initial mount
  useEffect(() => {
    setSelectedModel(settings[targetField] || 'gemini-3.1-flash-lite-preview');
  }, [targetField]);

  const handleSave = () => {
    onSaveSettings({
      ...localSettings,
      [targetField]: selectedModel
    });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!onTestModel) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      // Cập nhật settings tạm thời để test
      onSaveSettings({
        ...localSettings,
        model: selectedModel
      });

      // Đợi 1 chút để settings cập nhật vào GeminiService
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await onTestModel(selectedModel);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, latency: 0, message: error.message || 'Lỗi kết nối' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <i className="fa-solid fa-microchip text-indigo-500"></i>
            {title}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Reusable Model Selector Content */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <ModelSelector 
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                settings={localSettings}
                onUpdateSettings={setLocalSettings}
                showApiInputs={true}
            />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
          {onTestModel && (
            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
              <button 
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isTesting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                Test Kết Nối
              </button>
              {testResult && (
                <span className={`text-[10px] font-bold ${testResult.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {testResult.success ? <i className="fa-solid fa-check-circle mr-1"></i> : <i className="fa-solid fa-triangle-exclamation mr-1"></i>}
                  {testResult.success ? `OK (${testResult.latency}ms)` : `Lỗi: ${testResult.message}`}
                </span>
              )}
            </div>
          )}
          <button 
            onClick={handleSave}
            className="w-full py-3 bg-slate-800 text-white font-bold text-xs uppercase rounded-xl hover:bg-slate-700 transition-colors shadow-md"
          >
            Lưu Thiết Lập
          </button>
        </div>
      </motion.div>
    </div>
  );
}
