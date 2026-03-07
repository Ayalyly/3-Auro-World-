import React, { useState } from 'react';
import { InventoryItem } from '../types';

const getCategoryIcon = (category: string) => {
    const map: Record<string, string> = {
        'Furniture': 'fa-chair',
        'Bàn Ghế': 'fa-chair',
        'Decoration': 'fa-palette',
        'Trang Trí': 'fa-palette',
        'Trang trí': 'fa-palette',
        'Bed': 'fa-bed',
        'Giường': 'fa-bed',
        'Electronics': 'fa-tv',
        'Điện Tử': 'fa-tv',
        'Plant': 'fa-seedling',
        'Cây Cảnh': 'fa-seedling',
        'Rug': 'fa-rug',
        'Thảm': 'fa-rug',
        'Wall': 'fa-square',
        'Tường': 'fa-square',
        'Floor': 'fa-layer-group',
        'Sàn': 'fa-layer-group',
        'Sàn nhà': 'fa-layer-group',
        'Custom': 'fa-hammer',
        'Ghế': 'fa-chair',
        'Bàn': 'fa-table',
        'Tủ': 'fa-door-closed',
        'Kệ': 'fa-layer-group',
        'Bếp': 'fa-kitchen-set',
        'Cửa sổ': 'fa-window-maximize',
        'Rèm': 'fa-bars',
        'Cửa ra vào': 'fa-door-open',
        'Đèn': 'fa-lightbulb'
    };
    return map[category] || 'fa-box';
};

interface FurnitureShopModalProps {
    onClose: () => void;
    onBuy: (item: InventoryItem, quantity: number) => void;
    items: InventoryItem[];
    userInventory: InventoryItem[];
    user: any; // Add user prop
    onUpdateUser: (user: any) => void; // Add onUpdateUser prop
    onPlaceItem: (item: InventoryItem) => void; // Add onPlaceItem prop
    shopItems: InventoryItem[]; // Add shopItems prop
}

const FurnitureShopModal: React.FC<FurnitureShopModalProps> = ({ onClose, onBuy, items, userInventory }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantityToBuy, setQuantityToBuy] = useState(1);

    const safeItems = items || [];
    
    // Extract unique categories
    const categories = Array.from(new Set(safeItems.map(item => item.category || 'Other'))).filter(Boolean);
    const allCategories = ['all', ...categories];

    const filteredItems = activeCategory === 'all' 
        ? safeItems.filter(item => item.shopType === 'Furniture' || item.isFurniture)
        : safeItems.filter(item => (item.category || 'Other') === activeCategory && (item.shopType === 'Furniture' || item.isFurniture));

    const getItemQuantityInInventory = (itemId: string) => {
        const item = userInventory.find(invItem => invItem.id === itemId);
        return item ? (item.quantity || 0) : 0;
    };

    const handleBuyClick = () => {
        if (selectedItem) {
            onBuy(selectedItem, quantityToBuy);
            setSelectedItem(null); // Close detail view after purchase
            setQuantityToBuy(1); // Reset quantity
        }
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-[#f5e6d3] p-4 rounded-2xl border-4 border-[#8d6e63] shadow-2xl w-full max-w-md relative max-h-[80vh] flex flex-col">
                <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg z-10"><i className="fa-solid fa-xmark"></i></button>
                <h3 className="text-center font-black text-[#5d4037] uppercase tracking-widest text-lg mb-4 border-b-2 border-[#8d6e63]/20 pb-2 flex-shrink-0">Cửa Hàng Nội Thất</h3>
                
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar flex-shrink-0">
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap border-2 transition-all flex items-center gap-1.5 ${
                                activeCategory === cat 
                                ? 'bg-[#8d6e63] text-white border-[#5d4037]' 
                                : 'bg-white text-[#8d6e63] border-[#d7ccc8] hover:border-[#8d6e63]'
                            }`}
                        >
                            <i className={`fa-solid ${cat === 'all' ? 'fa-border-all' : getCategoryIcon(cat)}`}></i> {cat === 'all' ? 'Tất cả' : cat}
                        </button>
                    ))}
                </div>

                {selectedItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 animate-in fade-in">
                        <div className="w-32 h-32 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden relative mb-4 border-2 border-[#d7ccc8]">
                            <img src={selectedItem.pixelImage} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}} />
                            {selectedItem.isInteractive && (
                                <i className="fa-solid fa-star absolute top-1 right-1 text-yellow-400 text-sm drop-shadow-md"></i>
                            )}
                        </div>
                        <h4 className="text-lg font-black text-[#5d4037] uppercase mb-1 text-center">{selectedItem.name}</h4>
                        <p className="text-xs text-[#8d6e63] font-semibold mb-2 text-center">{selectedItem.description}</p>
                        <p className="text-sm text-[#5d4037] font-bold mb-4">Giá: {selectedItem.value} Xu</p>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setQuantityToBuy(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><i className="fa-solid fa-minus"></i></button>
                            <span className="text-xl font-bold text-[#5d4037]">{quantityToBuy}</span>
                            <button onClick={() => setQuantityToBuy(q => q + 1)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><i className="fa-solid fa-plus"></i></button>
                        </div>

                        <p className="text-xs text-[#8d6e63] font-semibold mb-4">Tổng cộng: <span className="font-bold text-[#5d4037]">{selectedItem.value * quantityToBuy} Xu</span></p>
                        <p className="text-xs text-[#8d6e63] font-semibold mb-4">Bạn sở hữu: <span className="font-bold text-[#5d4037]">{getItemQuantityInInventory(selectedItem.id)}</span></p>

                        <div className="flex gap-2 w-full">
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="flex-1 py-2 bg-slate-300 text-slate-700 text-sm font-bold uppercase rounded-lg shadow-md active:scale-95 hover:bg-slate-400"
                            >
                                Quay Lại
                            </button>
                            <button 
                                onClick={handleBuyClick}
                                className="flex-1 py-2 bg-[#8d6e63] text-white text-sm font-bold uppercase rounded-lg shadow-md active:scale-95 hover:bg-[#795548]"
                            >
                                Mua ({quantityToBuy})
                            </button>
                        </div>

                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar p-1">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white p-2 rounded-xl border-2 border-[#d7ccc8] flex flex-col items-center gap-2 shadow-sm hover:border-[#8d6e63] transition-colors group">
                                <div className="w-20 h-20 flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden relative">
                                    <img src={item.pixelImage} className="w-full h-full object-contain group-hover:scale-110 transition-transform" style={{imageRendering: 'pixelated'}} />
                                    {item.isInteractive && (
                                        <i className="fa-solid fa-star absolute top-1 right-1 text-yellow-400 text-sm drop-shadow-md"></i>
                                    )}
                                    {(getItemQuantityInInventory(item.id) || 0) > 0 && (
                                        <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[8px] font-bold px-1 rounded-full leading-none">x{getItemQuantityInInventory(item.id)}</span>
                                    )}
                                </div>
                                <div className="text-center w-full">
                                    <h4 className="text-[10px] font-black text-[#5d4037] uppercase truncate">{item.name}</h4>
                                    <p className="text-[9px] text-[#8d6e63] font-bold">{item.value} Xu</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedItem(item)}
                                    className="w-full py-1.5 bg-[#8d6e63] text-white text-[9px] font-bold uppercase rounded-lg shadow-md active:scale-95 hover:bg-[#795548]"
                                >
                                    Chi Tiết
                                </button>
                            </div>
                        ))}
                        {filteredItems.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-[#8d6e63]/50 text-xs italic">
                                Chưa có sản phẩm trong mục này.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FurnitureShopModal;
