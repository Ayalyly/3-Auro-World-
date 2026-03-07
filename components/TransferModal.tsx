import React, { useState } from 'react';
import { UserProfile } from '../types';

interface TransferModalProps {
  user: UserProfile;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ user, onConfirm, onCancel }) => {
  const [amount, setAmount] = useState<string>('');
  const currentBalance = user.money || 0;

  const handleConfirm = () => {
    const val = parseInt(amount.replace(/,/g, ''));
    if (!isNaN(val) && val > 0 && val <= currentBalance) {
      onConfirm(val);
    }
  };

  const setQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const isValid = !isNaN(parseInt(amount)) && parseInt(amount) > 0 && parseInt(amount) <= currentBalance;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-300 relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-90 mb-1">Chuyển Khoản</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-3xl font-black tracking-tight">{currentBalance.toLocaleString()}</span>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">VND</span>
            </div>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-wide mt-1">Số dư hiện tại</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            
            {/* Input */}
            <div className="relative group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nhập số tiền</label>
                <div className="relative">
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 pl-12 text-xl font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                        autoFocus
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                        <i className="fa-solid fa-money-bill-wave"></i>
                    </div>
                    {amount && (
                        <button onClick={() => setAmount('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors">
                            <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000, 50000, 100000].map(val => (
                    <button 
                        key={val}
                        onClick={() => setQuickAmount(val)}
                        disabled={val > currentBalance}
                        className="py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        +{val.toLocaleString()}
                    </button>
                ))}
                <button 
                    onClick={() => setQuickAmount(currentBalance)}
                    className="py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-black text-indigo-600 hover:bg-indigo-100 transition-all"
                >
                    Tất cả
                </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                    Huỷ
                </button>
                <button 
                    onClick={handleConfirm}
                    disabled={!isValid}
                    className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <i className="fa-solid fa-paper-plane"></i> Xác nhận
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TransferModal;
