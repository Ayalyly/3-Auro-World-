
import React, { useState } from 'react';
import { InventoryItem, UserProfile } from '../types';

interface InventoryViewProps {
  user: UserProfile;
  onUseItem: (item: InventoryItem) => void;
  onDeleteItem?: (item: InventoryItem) => void;
  onGiftItem?: (item: InventoryItem) => void;
  onClose: () => void;
}

// Helper to render icon, providing a fallback
const renderIcon = (iconStr: string | undefined, sizeClass = "text-4xl") => {
    if (!iconStr || typeof iconStr !== 'string') return <div className={sizeClass}>🎁</div>;
    
    // Check if it's an image URL
    if (iconStr.startsWith('http') || iconStr.startsWith('data:') || iconStr.startsWith('/')) {
       // Extract width/height from sizeClass if possible, or default to w-12 h-12 for list, w-24 h-24 for detail
       let imgClass = "w-12 h-12";
       if (sizeClass.includes("text-6xl")) imgClass = "w-20 h-20"; // For detail view
       
       return <img src={iconStr} className={`object-cover rounded-md ${imgClass}`} alt="item" />;
    }
    return <div className={sizeClass}>{iconStr}</div>;
 };

const InventoryView: React.FC<InventoryViewProps> = ({ user, onUseItem, onDeleteItem, onGiftItem, onClose }) => {
  const [filter, setFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const items = user.inventory || [];
  
  // Group items for display, but keep original references for actions
  const groupedItems = items.reduce((acc, item) => {
      // Show ALL items, including furniture
      const existing = acc.find(i => i.name === item.name);
      if (existing) {
          existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
      } else {
          acc.push({ ...item }); // Create a copy for display grouping
      }
      return acc;
  }, [] as InventoryItem[]);

  const filteredItems = filter === 'all' ? groupedItems : groupedItems.filter(i => i.category === filter);

  const handleUseItem = (itemToUse: InventoryItem) => {
      // Find the *first actual* item in the user's inventory that matches the name.
      const originalItem = user.inventory?.find(i => i.name === itemToUse.name);
      if (originalItem) {
          onUseItem(originalItem);
          setSelectedItem(null);
      } else {
          console.error("Could not find original item to use:", itemToUse.name);
      }
  };

  const handleGiftItem = (itemToGift: InventoryItem) => {
      if (!onGiftItem) return;
      const originalItem = user.inventory?.find(i => i.name === itemToGift.name);
      if (originalItem) {
          onGiftItem(originalItem);
          setSelectedItem(null);
      }
  };

  const handleDeleteItem = (itemToDelete: InventoryItem) => {
      if (!onDeleteItem) return;
      const originalItem = user.inventory?.find(i => i.name === itemToDelete.name);
      if (originalItem) {
          onDeleteItem(originalItem);
          setSelectedItem(null);
      }
  };

  const getRarityColor = (rarity?: string) => {
      switch(rarity) {
          case 'Huyền thoại': return 'bg-amber-100 text-amber-600 border-amber-200';
          case 'Cực hiếm': return 'bg-purple-100 text-purple-600 border-purple-200';
          case 'Hiếm': return 'bg-blue-100 text-blue-600 border-blue-200';
          default: return 'bg-slate-100 text-slate-500 border-slate-200';
      }
  };

  return (
    <div className="h-full flex flex-col aura-glass animate-in zoom-in-95 duration-300 bg-white/80 backdrop-blur-xl">
        {/* Header */}
        <div className="p-6 border-b border-white/50 flex justify-between items-center bg-white/20 shrink-0">
            <div>
                <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Túi Đồ Cá Nhân</h2>
                <p className="text-[10px] font-bold text-[var(--text-soft)] uppercase tracking-widest mt-1">
                    Sức chứa: {items.length} / ∞
                </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/50 text-[var(--text-soft)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors shadow-sm"><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-60">
                    <i className="fa-solid fa-box-open text-6xl mb-4 animate-float"></i>
                    <p className="text-xs font-black uppercase tracking-widest">Túi đồ trống rỗng</p>
                    <p className="text-[10px] mt-1">Hãy ghé Cửa hàng để mua sắm thêm nhé</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {filteredItems.map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setSelectedItem(item)}
                                className="bg-white/60 p-3 rounded-2xl border border-white hover:border-indigo-300 hover:shadow-lg transition-all active:scale-95 flex flex-col items-center relative group text-center"
                            >
                                <div className="mb-2 group-hover:scale-110 transition-transform drop-shadow-sm h-12 flex items-center justify-center">
                                  {renderIcon(item.icon)}
                                </div>
                                <h4 className="text-[11px] font-black text-slate-700 uppercase line-clamp-1 w-full">{item.name}</h4>
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border mt-1 ${getRarityColor(item.rarity)}`}>
                                    {item.rarity || 'Thường'}
                                </span>
                                {item.quantity && item.quantity > 1 && (
                                    <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                        x{item.quantity}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Item Detail Popup */}
        {selectedItem && (
            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in">
                <div className="w-full bg-white/90 backdrop-blur-xl rounded-t-[2.5rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300 border-t border-white/50">
                    <div className="flex gap-5">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-white rounded-3xl flex items-center justify-center text-6xl shadow-inner border border-white shrink-0">
                            {renderIcon(selectedItem.icon, 'text-6xl')}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-800 uppercase leading-tight mb-1">{selectedItem.name}</h3>
                            <div className="flex gap-2 mb-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${getRarityColor(selectedItem.rarity)}`}>{selectedItem.rarity || 'Thường'}</span>
                                {selectedItem.affinityBonus && <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">+{selectedItem.affinityBonus} Hảo cảm</span>}
                            </div>
                            <p className="text-[11px] text-slate-500 italic leading-relaxed">"{selectedItem.description}"</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setSelectedItem(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Đóng</button>
                        {onDeleteItem && (
                            <button onClick={() => handleDeleteItem(selectedItem)} className="flex-1 py-3 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-2">
                                <i className="fa-solid fa-trash"></i> Xóa
                            </button>
                        )}
                        {onGiftItem && (
                            <button onClick={() => handleGiftItem(selectedItem)} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                                <i className="fa-solid fa-gift"></i> Tặng
                            </button>
                        )}
                        <button onClick={() => handleUseItem(selectedItem)} className="flex-[2] py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-wand-magic-sparkles"></i> Sử dụng ngay
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default InventoryView;
