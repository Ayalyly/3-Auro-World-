
import React, { useState, useRef } from 'react';
import { Character, UserProfile, Message, AppSettings, ExportOptions, AuraExportData } from '../types';

interface ImportExportModalProps {
  onClose: () => void;
  // Data for Export
  character: Character | null;
  user: UserProfile;
  messages: Message[];
  settings: AppSettings;
  currentWorldId: string | null;
  currentBranchId: string;
  // Handlers for Import
  onImportData: (data: AuraExportData, options: { 
      importChar: boolean, 
      importUser: boolean, 
      importChat: boolean, 
      importSettings: boolean,
      importMode?: 'overwrite' | 'new_slot'
  }) => void;
  t: (key: string) => string;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({ 
    onClose, character, user, messages, settings, currentWorldId, currentBranchId, onImportData, t
}) => {
  const [mode, setMode] = useState<'menu' | 'export_config' | 'import_preview'>('menu');
  
  // EXPORT STATE
  const [expOpts, setExpOpts] = useState<ExportOptions>({
      includeCharacter: true, // Always included if available
      chatMode: 'all',
      includeWorld: true,
      includeSystem: true,
      includeUser: true,
      hideKeys: true,
      hideWorldId: true
  });

  // IMPORT STATE
  const [importedJson, setImportedJson] = useState<AuraExportData | null>(null);
  const [impSelection, setImpSelection] = useState({
      importChar: true,
      importUser: true,
      importChat: true,
      importSettings: false // Default off for safety
  });
  const [importMode, setImportMode] = useState<'overwrite' | 'new_slot'>('new_slot');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC: EXPORT ---
  const handleExport = () => {
      if (!character) {
          alert("Chưa có nhân vật để xuất!");
          return;
      }

      // 1. Prepare Data based on Options
      const exportPayload: AuraExportData = {
          meta: {
              version: '0.9.8',
              timestamp: Date.now(),
              platform: 'AuroWorld',
              type: 'CUSTOM'
          }
      };

      // Character & World Data
      // Note: Screenshots show 'NPC & SOCIAL' as one checkbox. 
      // If checked (includeWorld=true), we include full char data including social/world. 
      // If unchecked, we might strip it, but for simplicity we assume character object has it.
      // Logic: always export character, strip specific parts if unchecked.
      
      const charCopy = { ...character };
      if (!expOpts.includeWorld) {
          charCopy.socialPosts = [];
          charCopy.world = { ...charCopy.world, shopNPCs: [] }; // Minimal
          charCopy.relations = [];
      }
      exportPayload.character = charCopy;

      // User Data
      if (expOpts.includeUser) {
          exportPayload.user = user;
      }

      // Messages (Branching Logic)
      if (expOpts.chatMode === 'all') {
          exportPayload.messages = messages;
      } else if (expOpts.chatMode === 'current_branch') {
          exportPayload.messages = messages.filter(m => !m.branchId || m.branchId === 'main' || m.branchId === currentBranchId);
      } else {
          exportPayload.messages = [];
      }

      // Settings
      if (expOpts.includeSystem) {
          const settCopy = { ...settings };
          if (expOpts.hideKeys) {
              settCopy.apiConfigs = []; // Strip Keys
          }
          exportPayload.settings = settCopy;
      }

      // World ID
      if (!expOpts.hideWorldId) {
          exportPayload.worldId = currentWorldId || undefined;
      }

      // 2. Download
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AuroBackup_${character.name}_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      
      onClose();
  };

  // --- LOGIC: IMPORT ---
  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.meta && (json.meta.platform === 'AuraWorld' || json.meta.platform === 'AuroWorld')) {
                  setImportedJson(json);
                  setMode('import_preview');
                  // Auto-detect available data
                  setImpSelection({
                      importChar: !!json.character,
                      importUser: !!json.user,
                      importChat: !!json.messages && json.messages.length > 0,
                      importSettings: !!json.settings
                  });
              } else {
                  alert("File JSON không hợp lệ hoặc không phải định dạng Auro World.");
              }
          } catch (err) { alert("Lỗi đọc file JSON."); }
      };
      reader.readAsText(file);
  };

  const executeImport = () => {
      if (importedJson) {
          onImportData(importedJson, { ...impSelection, importMode });
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        
        {/* Main Card */}
        <div className="bg-slate-100 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* HEADER FOR ALL SCREENS */}
            <div className="bg-white p-5 pb-4 border-b border-slate-200 text-center relative shrink-0">
                <div className="w-12 h-1 rounded-full bg-slate-200 mx-auto mb-3"></div>
                <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <i className="fa-solid fa-folder-open text-sm"></i>
                    </div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">QUẢN LÝ DỮ LIỆU</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">BACKUP & RESTORE</p>
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50 relative">
                
                {/* MODE: MENU */}
                {mode === 'menu' && (
                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                        {/* Export Card */}
                        <div onClick={() => setMode('export_config')} className="bg-white p-5 rounded-3xl shadow-sm border border-white cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-file-export"></i>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-700 uppercase text-sm mb-1 group-hover:text-indigo-600 transition-colors">XUẤT DỮ LIỆU (EXPORT)</h3>
                                    <p className="text-[10px] text-slate-400 leading-tight">Tạo file backup .json chứa nhân vật, tin nhắn & cài đặt để lưu trữ.</p>
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full -mr-8 -mt-8"></div>
                        </div>

                        {/* Import Card */}
                        <div onClick={() => fileInputRef.current?.click()} className="bg-white p-5 rounded-3xl shadow-sm border border-white cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileRead} />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-file-import"></i>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-700 uppercase text-sm mb-1 group-hover:text-emerald-600 transition-colors">NHẬP DỮ LIỆU (IMPORT)</h3>
                                    <p className="text-[10px] text-slate-400 leading-tight">Khôi phục từ file backup. Có thể chọn nhập toàn bộ hoặc từng phần.</p>
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full -mr-8 -mt-8"></div>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-2 mt-2">
                            <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xs mt-0.5"></i>
                            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                Lưu ý: Dữ liệu Import sẽ ghi đè lên dữ liệu hiện tại của World này nếu trùng khớp. Hãy chắc chắn bạn đã backup trước khi thực hiện.
                            </p>
                        </div>
                    </div>
                )}

                {/* MODE: EXPORT CONFIG */}
                {mode === 'export_config' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        
                        {/* 1. Chat History Selector */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 ml-1">
                                <i className="fa-solid fa-comments text-slate-400 text-xs"></i>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LỊCH SỬ TRÒ CHUYỆN</span>
                            </div>
                            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                {['none', 'current_branch', 'all'].map(opt => (
                                    <button 
                                        key={opt}
                                        onClick={() => setExpOpts({...expOpts, chatMode: opt as any})}
                                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-bold uppercase transition-all ${expOpts.chatMode === opt ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                    >
                                        {opt === 'none' ? 'KHÔNG' : (opt === 'current_branch' ? 'NHÁNH NÀY' : 'TẤT CẢ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Content Checkboxes */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${expOpts.includeWorld ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 border-slate-300'}`}>
                                    {expOpts.includeWorld && <i className="fa-solid fa-check text-white text-xs"></i>}
                                </div>
                                <input type="checkbox" className="hidden" checked={expOpts.includeWorld} onChange={e => setExpOpts({...expOpts, includeWorld: e.target.checked})} />
                                <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">NPC & SOCIAL</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${expOpts.includeSystem ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 border-slate-300'}`}>
                                    {expOpts.includeSystem && <i className="fa-solid fa-check text-white text-xs"></i>}
                                </div>
                                <input type="checkbox" className="hidden" checked={expOpts.includeSystem} onChange={e => setExpOpts({...expOpts, includeSystem: e.target.checked})} />
                                <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">CÀI ĐẶT & LUẬT</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${expOpts.includeUser ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 border-slate-300'}`}>
                                    {expOpts.includeUser && <i className="fa-solid fa-check text-white text-xs"></i>}
                                </div>
                                <input type="checkbox" className="hidden" checked={expOpts.includeUser} onChange={e => setExpOpts({...expOpts, includeUser: e.target.checked})} />
                                <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">HỒ SƠ NGƯỜI DÙNG (USER PROFILE)</span>
                            </label>
                        </div>

                        {/* 3. Security Toggles */}
                        <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">BẢO MẬT</span>
                            </div>
                            
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-[10px] font-bold text-slate-700 uppercase">ẨN API KEYS</span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${expOpts.hideKeys ? 'bg-rose-400' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${expOpts.hideKeys ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                                <input type="checkbox" className="hidden" checked={expOpts.hideKeys} onChange={e => setExpOpts({...expOpts, hideKeys: e.target.checked})} />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-[10px] font-bold text-slate-700 uppercase">ẨN WORLD ID</span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${expOpts.hideWorldId ? 'bg-indigo-400' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${expOpts.hideWorldId ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                                <input type="checkbox" className="hidden" checked={expOpts.hideWorldId} onChange={e => setExpOpts({...expOpts, hideWorldId: e.target.checked})} />
                            </label>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex gap-3">
                            <button onClick={() => setMode('menu')} className="px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold uppercase text-[10px] hover:bg-slate-50 transition-colors shadow-sm">
                                QUAY LẠI
                            </button>
                            <button onClick={handleExport} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <i className="fa-solid fa-download"></i> TẢI XUỐNG JSON
                            </button>
                        </div>
                    </div>
                )}

                {/* MODE: IMPORT PREVIEW */}
                {mode === 'import_preview' && importedJson && (
                    <div className="space-y-5 animate-in slide-in-from-right duration-300">
                        {/* Summary Card */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
                                <i className="fa-solid fa-check text-emerald-500"></i>
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase mb-1">TÌM THẤY DỮ LIỆU</h3>
                            <p className="text-[10px] text-slate-400">File hợp lệ • {new Date(importedJson.meta.timestamp).toLocaleDateString()}</p>
                            
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Nhân vật</span>
                                    <span className="block text-xs font-black text-slate-700 truncate">{importedJson.character?.name || 'N/A'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Tin nhắn</span>
                                    <span className="block text-xs font-black text-indigo-500">{importedJson.messages?.length || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Import Options Checkboxes */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">CHỌN THÀNH PHẦN NHẬP</h4>
                            
                            {importedJson.character && (
                                <label className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">NHÂN VẬT</span>
                                    <input type="checkbox" checked={impSelection.importChar} onChange={e => setImpSelection({...impSelection, importChar: e.target.checked})} className="accent-emerald-500 w-5 h-5 rounded" />
                                </label>
                            )}
                            {importedJson.user && (
                                <label className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">USER PROFILE</span>
                                    <input type="checkbox" checked={impSelection.importUser} onChange={e => setImpSelection({...impSelection, importUser: e.target.checked})} className="accent-emerald-500 w-5 h-5 rounded" />
                                </label>
                            )}
                            {importedJson.messages && importedJson.messages.length > 0 && (
                                <label className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">LỊCH SỬ CHAT</span>
                                    <input type="checkbox" checked={impSelection.importChat} onChange={e => setImpSelection({...impSelection, importChat: e.target.checked})} className="accent-emerald-500 w-5 h-5 rounded" />
                                </label>
                            )}
                            {importedJson.settings && (
                                <label className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">CẤU HÌNH HỆ THỐNG</span>
                                    <input type="checkbox" checked={impSelection.importSettings} onChange={e => setImpSelection({...impSelection, importSettings: e.target.checked})} className="accent-amber-500 w-5 h-5 rounded" />
                                </label>
                            )}
                        </div>

                        {/* Import Mode Selector */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">CHẾ ĐỘ LƯU TRỮ</h4>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setImportMode('new_slot')}
                                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${importMode === 'new_slot' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                                >
                                    TẠO SLOT MỚI
                                </button>
                                <button 
                                    onClick={() => setImportMode('overwrite')}
                                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${importMode === 'overwrite' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                                >
                                    GHI ĐÈ SLOT NÀY
                                </button>
                            </div>
                            <p className="text-[8px] text-slate-400 mt-2 text-center italic">
                                {importMode === 'new_slot' ? '*Sẽ tạo một bản lưu mới trong danh sách.' : '*Sẽ thay thế dữ liệu của nhân vật hiện tại.'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setMode('menu')} className="px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold uppercase text-[10px] hover:bg-slate-50 transition-colors shadow-sm">
                                QUAY LẠI
                            </button>
                            <button onClick={executeImport} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <i className="fa-solid fa-file-import"></i> XÁC NHẬN NHẬP
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default ImportExportModal;
