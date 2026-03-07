
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface UserProfileViewProps {
  user: UserProfile;
  onBack: () => void;
  onUpdateUser?: (updatedUser: UserProfile) => void;
  isOnline?: boolean;
  serverName?: string;
  joinedDate?: number; // Timestamp khi bắt đầu chơi
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ 
  user, 
  onBack, 
  onUpdateUser, 
  isOnline = false, 
  serverName = "Offline Cache",
  joinedDate = Date.now() 
}) => {
  // Local state for editing
  const [formData, setFormData] = useState<UserProfile>({ ...user });
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate days together
  const daysTogether = Math.floor((Date.now() - joinedDate) / (1000 * 60 * 60 * 24)) + 1;

  const handleChange = (field: keyof UserProfile, value: any) => {
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
    if (onUpdateUser) {
        onUpdateUser(formData);
        setIsDirty(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] relative overflow-hidden animate-in slide-in-from-right duration-300">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-[#E0E7FF] to-[#F8FAFC] z-0"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute top-20 -left-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center p-6 shrink-0">
        <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-md flex items-center justify-center hover:bg-white text-slate-500 shadow-sm border border-white/50 transition-all active:scale-95"
        >
            <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hồ Sơ Cư Dân</h2>
            <div className="h-1 w-8 bg-indigo-500/20 rounded-full mt-1"></div>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-28 relative z-10">
          <div className="max-w-2xl mx-auto space-y-6">
              
              {/* 1. IDENTITY CARD (Avatar + Name) */}
              <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-white relative text-center">
                  
                  {/* Avatar Upload */}
                  <div className="relative inline-block mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-400 to-pink-400 rounded-[2rem] opacity-50 blur-sm group-hover:opacity-80 transition-opacity duration-500"></div>
                      <img 
                          src={formData.avatar} 
                          className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl relative z-10 bg-slate-100" 
                          alt="avatar" 
                      />
                      <div className="absolute bottom-0 right-0 z-20 bg-white text-indigo-600 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border border-slate-50 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-camera text-xs"></i>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>

                  {/* Editable Name */}
                  <div className="relative group max-w-xs mx-auto">
                      <input 
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className="w-full text-center text-2xl font-black text-slate-800 bg-transparent outline-none border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 transition-all placeholder:text-slate-300 pb-1"
                          placeholder="Tên của bạn"
                      />
                      <i className="fa-solid fa-pen text-[10px] text-slate-300 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></i>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Người du hành</p>
              </div>

              {/* 2. STATS & PREFERENCES */}
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1">
                      <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg mb-1"><i className="fa-solid fa-hourglass-half"></i></span>
                      <span className="text-xl font-black text-slate-700">{daysTogether}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ngày đồng hành</span>
                  </div>
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1">
                      <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg mb-1 ${isOnline ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                          <i className={`fa-solid ${isOnline ? 'fa-signal' : 'fa-plane-slash'}`}></i>
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {isOnline ? 'Online Mode' : 'Offline'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-full px-2">{serverName}</span>
                  </div>
              </div>

              {/* 3. BIO & APPEARANCE */}
              <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                          <i className="fa-solid fa-fingerprint text-indigo-400"></i> Vai trò & Thân phận
                      </label>
                      <textarea 
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-medium text-slate-600 leading-relaxed outline-none border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 transition-all resize-none h-24 custom-scrollbar"
                          placeholder="Mô tả ngắn về bạn..."
                      />
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                          <i className="fa-solid fa-mask text-pink-400"></i> Ngoại hình (Cho AI nhìn)
                      </label>
                      <textarea 
                          value={formData.appearance || ''}
                          onChange={(e) => handleChange('appearance', e.target.value)}
                          className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-medium text-slate-600 leading-relaxed outline-none border border-transparent focus:bg-white focus:border-pink-100 focus:ring-4 focus:ring-pink-50/50 transition-all resize-none h-24 custom-scrollbar"
                          placeholder="Mô tả ngoại hình của bạn..."
                      />
                  </div>
              </div>

              {/* 4. ASSETS */}
              <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Tài sản hiện có</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* World Currency */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg shadow-slate-200 relative overflow-hidden">
                        <div className="absolute right-0 top-0 opacity-10 text-9xl -mr-6 -mt-6 rotate-12"><i className="fa-solid fa-wallet"></i></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Số dư khả dụng</p>
                            <h2 className="text-3xl font-black tracking-tight flex items-baseline gap-2">
                                {(formData.money || 0).toLocaleString()} 
                                <span className="text-sm font-bold text-amber-400">{formData.currencyName || 'Xu'}</span>
                            </h2>
                        </div>
                    </div>
                    {/* Auro Coins */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-200 relative overflow-hidden">
                        <div className="absolute right-0 top-0 opacity-10 text-9xl -mr-6 -mt-6 rotate-12"><i className="fa-solid fa-coins"></i></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest mb-1">Auro Coin</p>
                            <h2 className="text-3xl font-black tracking-tight">
                                {(formData.auroCoins || 0).toLocaleString()} 
                            </h2>
                        </div>
                    </div>
                  </div>
              </div>

          </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 pb-6 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3 max-w-2xl mx-auto">
              <button 
                  onClick={onBack}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                  Quay lại
              </button>
              
              <button 
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:scale-100 flex items-center justify-center gap-2"
              >
                  {isDirty ? <><i className="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi</> : <><i className="fa-solid fa-check"></i> Đã đồng bộ</>}
              </button>
          </div>
      </div>

    </div>
  );
};

export default UserProfileView;
