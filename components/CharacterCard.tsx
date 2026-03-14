
import React, { useState, useRef } from 'react';
import { Character } from '../types';
import { GeminiService } from '../services/geminiService';
import { SecurityOverlay } from './SecurityOverlay';

interface CharacterCardProps {
  character: Character;
  onSave: (updatedChar: Character) => void;
  onBack: () => void;
  isOnline?: boolean; // NEW PROP
  onShare?: () => void; // NEW PROP
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onSave, onBack, isOnline, onShare }) => {
  // Use local state for editing
  const [formData, setFormData] = useState<Character>({ ...character });
  const [isDirty, setIsDirty] = useState(false);
  
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const geminiRef = useRef(new GeminiService());

  // --- HELPER: TOAST ---
  const showToast = (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
  };

  // --- CALCULATION LOGIC (Visual Only) ---
  const level = Math.floor(character.relationshipScore / 100) + 1;
  const expPercent = character.relationshipScore % 100;
  
  const getAffinityStatus = (score: number) => {
      if (score <= -80) return { label: 'Kẻ thù truyền kiếp', color: 'text-rose-700' };
      if (score <= -40) return { label: 'Cực kỳ ghét bỏ', color: 'text-rose-500' };
      if (score < 0) return { label: 'Căng thẳng/Ác cảm', color: 'text-orange-500' };
      if (score < 20) return { label: 'Lạnh nhạt/Người lạ', color: 'text-slate-400' };
      if (score < 50) return { label: 'Quan tâm', color: 'text-blue-400' };
      if (score < 80) return { label: 'Thân thiết', color: 'text-indigo-500' };
      if (score < 150) return { label: 'Yêu thích', color: 'text-pink-500' };
      return { label: 'Gắn bó trọn đời', color: 'text-rose-600' };
  };
  
  const affinity = getAffinityStatus(character.relationshipScore);

  const handleChange = (field: keyof Character, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('avatar', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onBack();
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
      {/* TOAST NOTIFICATION */}
      {toast && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-4 py-2.5 rounded-full shadow-2xl text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4 flex items-center gap-2 border border-slate-700">
              <i className="fa-solid fa-circle-check text-emerald-400"></i>
              {toast}
          </div>
      )}

      {/* BACKGROUND DECORATION - AURO THEME */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#2E3192] to-slate-50 z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none z-0"></div>
      
      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center p-6 text-white shrink-0">
        <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/20 shadow-sm"
        >
            <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] opacity-90">Auro Character Card</h2>
            <div className="h-0.5 w-10 bg-white/30 rounded-full mt-1"></div>
        </div>
        
        {/* SHARE BUTTON (ONLINE ONLY) */}
        {isOnline && onShare ? (
            <button 
                onClick={onShare} 
                className="w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center shadow-lg border border-white/20 transition-all animate-in zoom-in"
                title="Share Auro Card"
            >
                <i className="fa-solid fa-share-nodes"></i>
            </button>
        ) : <div className="w-10"></div>}
      </div>

      {/* CARD CONTAINER */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 z-10">
          <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 p-6 md:p-8 animate-in slide-in-from-bottom-8 duration-500 relative overflow-hidden">
              
              <div className="flex flex-col md:flex-row gap-8">
                  
                  {/* --- LEFT COLUMN: VISUALS --- */}
                  <div className="w-full md:w-1/3 flex flex-col gap-6">
                      
                      {/* A. AVATAR MAIN */}
                      <div className="relative group cursor-pointer mx-auto md:mx-0 w-full max-w-[280px]" onClick={() => fileInputRef.current?.click()}>
                          <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] opacity-75 blur-sm group-hover:opacity-100 transition duration-500"></div>
                          <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-slate-100 shadow-2xl ring-4 ring-white">
                              <img 
                                  src={formData.avatar} 
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                  alt="avatar" 
                                  onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/notionists/svg?seed=fallback')}
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                                  <i className="fa-solid fa-camera text-white text-3xl drop-shadow-lg"></i>
                              </div>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>

                  </div>

                  {/* --- RIGHT COLUMN: INFO & STATS --- */}
                  <div className="w-full md:w-2/3 space-y-6">
                      
                      {/* IDENTITY HEADER */}
                      <div className="flex flex-col gap-2">
                          <input 
                              type="text" 
                              value={formData.name} 
                              onChange={(e) => handleChange('name', e.target.value)}
                              className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 w-full"
                              placeholder="Character Name"
                          />
                          <input 
                              type="text" 
                              value={formData.status} 
                              onChange={(e) => handleChange('status', e.target.value)}
                              className="text-sm font-bold text-indigo-500 bg-transparent border-none outline-none placeholder:text-indigo-300 w-full"
                              placeholder="Role / Title"
                          />
                      </div>

                      {/* A. PROGRESS & STATS */}
                      <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                          {/* Level & EXP */}
                          <div>
                              <div className="flex justify-between items-end mb-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Level</span>
                                  <span className="text-sm font-black text-slate-800">LV.{level}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${expPercent}%` }}></div>
                              </div>
                          </div>

                          {/* Affection */}
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 text-xl shadow-sm border border-rose-100">
                                  <i className="fa-solid fa-heart"></i>
                              </div>
                              <div className="flex-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mối quan hệ</p>
                                  <div className="flex items-baseline gap-2">
                                      <span className="text-xl font-black text-slate-800">{formData.relationshipScore}</span>
                                      <span className={`text-[10px] font-bold uppercase ${affinity.color}`}>{affinity.label}</span>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tâm trạng</p>
                                  <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase border border-amber-100">
                                      {formData.mood}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* B. NPC RELATIONS (Horizontal Scroll) */}
                      <div>
                          <div className="flex justify-between items-center mb-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <i className="fa-solid fa-users"></i> Mối quan hệ
                              </label>
                              <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold">
                                  {(formData.relations as any) === 'LOCKED' ? '?' : (formData.relations?.length || 0)}
                              </span>
                          </div>
                          
                          {(formData.relations as any) === 'LOCKED' ? (
                              <div className="relative h-24">
                                  <SecurityOverlay isLocked={true} compact={true} label="Bảo mật" borderRadius="rounded-2xl" />
                              </div>
                          ) : (!formData.relations || formData.relations.length === 0) ? (
                              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                  <p className="text-[10px] text-slate-400 italic">Chưa có mối quan hệ nào.</p>
                              </div>
                          ) : (
                              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                                  {(formData.relations as any[]).map(rel => (
                                      <div key={rel.id} className="min-w-[140px] bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 shrink-0">
                                          <img src={rel.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                                          <div className="text-center w-full">
                                              <p className="text-[10px] font-bold text-slate-700 truncate w-full">{rel.name}</p>
                                              <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-wide">{rel.type}</p>
                                          </div>
                                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                              <div className="h-full bg-emerald-400" style={{ width: `${Math.min(rel.affinityWithChar || 50, 100)}%` }}></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* LORE (Collapsible logic could be added here, but keep simple for now) */}
                      <div className="space-y-4 pt-2">
                          <div className="relative group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Identity Core (Prompt)</label>
                              <div className="relative rounded-2xl overflow-hidden">
                                  <textarea 
                                      value={formData.description === 'LOCKED' ? 'NỘI DUNG ĐÃ ĐƯỢC BẢO VỆ BỞI CHỦ SỞ HỮU' : formData.description}
                                      onChange={(e) => handleChange('description', e.target.value)}
                                      className={`w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none resize-none custom-scrollbar transition-all font-medium ${formData.description === 'LOCKED' ? 'select-none pointer-events-none' : ''}`}
                                      placeholder="Character description..."
                                      disabled={formData.description === 'LOCKED'}
                                  />
                                  <SecurityOverlay isLocked={formData.description === 'LOCKED'} compact={true} label="Bảo mật" borderRadius="rounded-2xl" />
                              </div>
                          </div>
                          
                          <div className="relative group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Opening Line</label>
                              <div className="relative rounded-2xl overflow-hidden">
                                  <textarea 
                                      value={formData.openingMessage === 'LOCKED' ? 'NỘI DUNG ĐÃ ĐƯỢC BẢO VỆ BỞI CHỦ SỞ HỮU' : formData.openingMessage}
                                      onChange={(e) => handleChange('openingMessage', e.target.value)}
                                      className={`w-full h-20 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none resize-none custom-scrollbar transition-all italic ${formData.openingMessage === 'LOCKED' ? 'select-none pointer-events-none' : ''}`}
                                      placeholder="Hello..."
                                      disabled={formData.openingMessage === 'LOCKED'}
                                  />
                                  <SecurityOverlay isLocked={formData.openingMessage === 'LOCKED'} compact={true} label="Bảo mật" borderRadius="rounded-2xl" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* ACTION BUTTONS */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur p-4 -mx-6 -mb-6 md:-mx-8 md:-mb-8 rounded-b-[2.5rem] z-20">
                  <button 
                      onClick={onBack}
                      className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={handleSave}
                      disabled={!isDirty}
                      className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      <i className="fa-solid fa-floppy-disk"></i> Save Profile
                  </button>
              </div>

          </div>
      </div>
    </div>
  );
};

export default CharacterCard;
