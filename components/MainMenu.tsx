import React from 'react';
import { AppView } from '../types';

interface MainMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onShowFeedback: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ menuRef, onClose, onNavigate, onShowFeedback }) => {
  const handleMenuClick = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  const handleFeedbackClick = () => {
    onShowFeedback();
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 right-0 p-4 animate-in fade-in zoom-in-95 duration-100 z-50">
      <div ref={menuRef} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest ml-1">Menu Tính Năng</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {/* SOCIAL */}
          <button onClick={() => handleMenuClick('social')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-blue-50 transition-colors active:scale-95 border border-transparent hover:border-blue-100">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-white text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-blue-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-globe"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-blue-500">Auronet</span>
          </button>

          {/* PHONE */}
          <button onClick={() => handleMenuClick('phone')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-pink-50 transition-colors active:scale-95 border border-transparent hover:border-pink-100">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-50 to-white text-pink-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-pink-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-mobile-screen-button"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-pink-500">Điện thoại</span>
          </button>

          {/* HOME - NEW! */}
          <button onClick={() => handleMenuClick('home')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-orange-50 transition-colors active:scale-95 border border-transparent hover:border-orange-100">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-50 to-white text-orange-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-orange-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-house-chimney"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-orange-500">Tổ Ấm</span>
          </button>

          {/* SHOP */}
          <button onClick={() => handleMenuClick('shop')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-purple-50 transition-colors active:scale-95 border border-transparent hover:border-purple-100">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-white text-purple-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-purple-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-store"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-purple-500">Cửa hàng</span>
          </button>

          {/* PROFILE */}
          <button onClick={() => handleMenuClick('profile')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-amber-50 transition-colors active:scale-95 border border-transparent hover:border-amber-100">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-white text-amber-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-amber-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-circle-user"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-amber-500">Hồ sơ</span>
          </button>

          {/* MEMORIES */}
          <button onClick={() => handleMenuClick('memories')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-rose-50 transition-colors active:scale-95 border border-transparent hover:border-rose-100">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-50 to-white text-rose-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-rose-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-heart"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-rose-500">Kỷ Niệm</span>
          </button>

          {/* QUESTS */}
          <button onClick={() => handleMenuClick('quests')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-lime-50 transition-colors active:scale-95 border border-transparent hover:border-lime-100">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-50 to-white text-lime-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-lime-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-scroll"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-lime-500">Nhiệm Vụ</span>
          </button>

          {/* TIMELINE */}
          <button onClick={() => handleMenuClick('timeline')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-indigo-50 transition-colors active:scale-95 border border-transparent hover:border-indigo-100">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-white text-indigo-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-code-branch"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-indigo-500">Timeline</span>
          </button>

          {/* INVENTORY */}
          <button onClick={() => handleMenuClick('inventory')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-emerald-50 transition-colors active:scale-95 border border-transparent hover:border-emerald-100">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-white text-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-box-open"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-emerald-500">Túi đồ</span>
          </button>

          {/* GACHA */}
          {/* <button onClick={() => handleMenuClick('gacha')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-yellow-50 transition-colors active:scale-95 border border-transparent hover:border-yellow-100">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-50 to-white text-yellow-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-yellow-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-circle-notch animate-spin-slow"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-yellow-600">Gacha</span>
          </button> */}

          {/* SETTINGS */}
          <button onClick={() => handleMenuClick('settings')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-slate-100 transition-colors active:scale-95 border border-transparent hover:border-slate-200">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-white text-slate-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-200 group-hover:scale-110 transition-transform"><i className="fa-solid fa-gear"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-slate-600">Cài đặt</span>
          </button>

          {/* FEEDBACK */}
          <button onClick={handleFeedbackClick} className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-teal-50 transition-colors active:scale-95 border border-transparent hover:border-teal-100">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-white text-teal-500 rounded-xl flex items-center justify-center text-xl shadow-sm border border-teal-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-comment-dots"></i></div>
            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-teal-600">Góp ý</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
