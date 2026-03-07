
import React from 'react';
import { InventoryItem, UserProfile } from '../types';

interface ItemSummonerProps {
  user: UserProfile;
  showItemPicker: boolean;
  selectedItemForAction: InventoryItem | null;
  onClosePicker: () => void;
  onSelectItem: (item: InventoryItem) => void;
  onCancelAction: () => void;
  onInsertActionTag: (action: 'GIFT' | 'USE') => void;
  onTriggerTransfer: () => void;
}

const ItemSummoner: React.FC<ItemSummonerProps> = ({
  user,
  showItemPicker,
  selectedItemForAction,
  onClosePicker,
  onSelectItem,
  onCancelAction,
  onInsertActionTag,
  onTriggerTransfer
}) => {
  if (!showItemPicker && !selectedItemForAction) return null;

  // Filter out furniture items as requested
  const filteredInventory = user.inventory.filter(item => !item.isFurniture);

  return (
    <div className="absolute bottom-full left-4 right-4 mb-3 z-[60]">
      {/* Action Popup for Item */}
      {selectedItemForAction && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 animate-in zoom-in duration-200 shadow-2xl flex flex-col items-center text-center">
           <div className="text-4xl mb-2">{selectedItemForAction.icon}</div>
           <h3 className="font-black text-slate-800 uppercase tracking-tight mb-4 text-sm">{selectedItemForAction.name}</h3>
           <div className="flex gap-3 w-full">
              <button 
                onClick={() => onInsertActionTag('USE')} 
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Sử dụng
              </button>
              <button 
                onClick={() => onInsertActionTag('GIFT')} 
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg transition-all"
              >
                Tặng quà
              </button>
           </div>
           <button 
            onClick={onCancelAction} 
            className="mt-3 text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600"
           >
            Huỷ bỏ
           </button>
        </div>
      )}

      {/* Item Picker */}
      {showItemPicker && !selectedItemForAction && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 animate-in slide-in-from-bottom-2 duration-200 shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
           <div className="flex justify-between items-center mb-3">
             <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                <i className="fa-solid fa-bolt mr-1"></i> Quick Action
             </p>
             <button onClick={onClosePicker} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
             </button>
           </div>
           
           <button 
            onClick={onTriggerTransfer} 
            className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all group mb-4 text-left active:scale-95"
           >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-money-bill-transfer"></i>
                </div>
                <div><p className="text-[10px] font-black text-slate-700 uppercase">Chuyển tiền</p></div>
           </button>

           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Vật phẩm</p>
           {filteredInventory.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                    {filteredInventory.map((item, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => onSelectItem(item)} 
                            className="flex flex-col items-center p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-400 hover:shadow-md transition-all group"
                        >
                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
                            <p className="text-[9px] font-bold text-slate-700 text-center line-clamp-1">{item.name}</p>
                        </button>
                    ))}
                </div>
           ) : (
            <div className="text-center py-4 opacity-50 text-[10px] italic text-slate-400">
                Túi đồ trống (không bao gồm nội thất).
            </div>
           )}
        </div>
      )}
    </div>
  );
};

export default ItemSummoner;
