
import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, UserProfile, OrderHistory, ShopNPC, Message, Sender, Character, Transaction, AppSettings } from '../types';
import { ShopService } from '../services/shopService';
import Modal from './Modal'; // Import the new Modal component

const PRESET_FURNITURE: InventoryItem[] = [
    {
        id: 'bed-pink-1',
        name: 'Giường Mây Hồng',
        icon: '🛏️',
        description: 'Một chiếc giường êm ái với khung mây và nệm hồng, mang lại giấc ngủ ngọt ngào.',
        value: 300,
        rarity: 'Hiếm',
        isFurniture: true,
        furnitureType: 'floor',
        pixelImage: '/furniture/pixel_bed_pink_dream.png',
        category: 'Nội thất',
        affinityBonus: 5,
    },
    {
        id: 'bed-pink-2',
        name: 'Giường Công Chúa Hồng',
        icon: '👑',
        description: 'Chiếc giường lộng lẫy như trong truyện cổ tích, dành cho những nàng công chúa.',
        value: 450,
        rarity: 'Cực hiếm',
        isFurniture: true,
        furnitureType: 'floor',
        pixelImage: '/furniture/pixel_bed_pink_princess.png',
        category: 'Nội thất',
        affinityBonus: 10,
    },
    {
        id: 'sofa-cloud',
        name: 'Sofa Đám Mây',
        icon: '☁️',
        description: 'Chiếc sofa mềm mại như đang ngồi trên mây.',
        value: 200,
        rarity: 'Thường',
        isFurniture: true,
        furnitureType: 'floor',
        category: 'Nội thất',
        affinityBonus: 3,
    },
    {
        id: 'lamp-star',
        name: 'Đèn Ngôi Sao',
        icon: '⭐',
        description: 'Ánh sáng lấp lánh từ những vì sao cho căn phòng thêm ấm cúng.',
        value: 100,
        rarity: 'Thường',
        isFurniture: true,
        furnitureType: 'decor',
        category: 'Nội thất',
        affinityBonus: 2,
    }
];

interface ShopViewProps {
  user: UserProfile;
  character: Character;
  setUser: (user: UserProfile) => void;
  onUpdateCharacter: (char: Character) => void;
  onClose: () => void;
  t: (key: string) => string;
  shopService: ShopService;
  shopItems?: InventoryItem[];
  settings: AppSettings;
}

const ShopView: React.FC<ShopViewProps> = ({ user, character, setUser, onUpdateCharacter, onClose, t, shopService, shopItems = [], settings }) => {
  const [currentNPC, setCurrentNPC] = useState<ShopNPC | null>(null);
  const [shopTab, setShopTab] = useState<'browse' | 'general' | 'consult' | 'cart' | 'invoice' | 'history'>('browse');
  const [cart, setCart] = useState<(InventoryItem & { payWithAuro?: boolean })[]>([]);
  const [shopMessages, setShopMessages] = useState<Message[]>([]);
  const [npcProposals, setNpcProposals] = useState<InventoryItem[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lastOrder, setLastOrder] = useState<OrderHistory | null>(null);
  
  // NEW STATE: Detail Popup & Stock Loading
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [isStocking, setIsStocking] = useState(false);
  const [displayItems, setDisplayItems] = useState<InventoryItem[]>([]);
  const [payWithAuro, setPayWithAuro] = useState(false);

  // NEW STATE: Exchange Modal
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState('');
  
  // NEW STATE: Create Shop Modal
  const [isCreateShopModalOpen, setIsCreateShopModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopOwner, setNewShopOwner] = useState('');
  const [newShopDesc, setNewShopDesc] = useState('');
  const [isCreatingShop, setIsCreatingShop] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const currency = character.world?.currency || user.currencyName || 'Xu';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [shopMessages, npcProposals]);

  useEffect(() => {
    if (selectedDetailItem) {
        setDetailQuantity(1);
        setPayWithAuro(false);
    }
  }, [selectedDetailItem]);

  // --- LOGIC: JUST-IN-TIME STOCKING ---
  useEffect(() => {
      const loadShopItems = async () => {
          if (shopTab === 'general') {
              // Filter for General items from the sheet
              const generalItems = shopItems.filter(i => i.shopType === 'General' || (!i.isFurniture && i.shopType !== 'Furniture'));
              setDisplayItems(generalItems);
              return;
          }

          if (currentNPC && shopTab === 'browse') {
              setIsStocking(true);
              try {
                  const items = await shopService.generateShopStock(currentNPC, currency, settings.shopModel || settings.model);
                  setDisplayItems(items);
              } catch (e) {
                  console.error(e);
                  setDisplayItems([]);
              } finally {
                  setIsStocking(false);
              }
          }
      };

      loadShopItems();
  }, [currentNPC, shopTab, shopService, currency, shopItems, settings.model, settings.shopModel]);

  const renderIcon = (iconStr: string, sizeClass = "text-5xl") => {
     if (!iconStr || typeof iconStr !== 'string') return <div className={sizeClass}>📦</div>;
     if (iconStr.startsWith('http') || iconStr.startsWith('data:')) {
        return <img src={iconStr} className={`object-cover rounded-md ${sizeClass.replace('text-', 'w-').replace('xl', '16 h-16')}`} alt="item" />;
     }
     return <div className={sizeClass}>{iconStr}</div>;
  };

  const handleConsultNPC = async () => {
    if (!inputValue.trim() || !currentNPC || isThinking) return;
    
    const userMsg: Message = { id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5), sender: Sender.USER, text: inputValue, timestamp: Date.now() };
    setShopMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await shopService.chatWithShopkeeper(currentNPC, shopMessages, inputValue, user, settings.shopModel || settings.model);
      const npcMsg: Message = { id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5), sender: Sender.SHOPKEEPER, text: response.text, timestamp: Date.now() };
      setShopMessages(prev => [...prev, npcMsg]);
      
      if (response.proposals && response.proposals.length > 0) {
        setNpcProposals(response.proposals);
      }
    } catch (e) {
      console.error("Shop Error:", e);
      setShopMessages(prev => [...prev, { id: 'err-' + Date.now(), sender: Sender.SHOPKEEPER, text: "Tôi hơi bận chút, bạn nói lại món bạn cần nhé?", timestamp: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  };

  const addToCart = (item: InventoryItem, qty: number = 1, useAuro: boolean = false) => {
    const existing = cart.find(i => i.name === item.name && i.payWithAuro === useAuro);
    if (existing) {
      setCart(cart.map(i => (i.name === item.name && i.payWithAuro === useAuro) ? { ...i, quantity: (i.quantity || 1) + qty } : i));
    } else {
      setCart([...cart, { ...item, quantity: qty, id: 'd-' + Math.random().toString(36).substr(2, 5), payWithAuro: useAuro }]);
    }
    // Close detail if open
    setSelectedDetailItem(null);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index] = { ...item, quantity: newQty };
    }
    setCart(newCart);
  };

  const handleExchangeAuro = () => {
      const amount = parseInt(exchangeAmount, 10);
      if (!isNaN(amount) && amount > 0) {
          if ((user.auroCoins || 0) < amount) {
              alert("Bạn không đủ Auro Coin!");
              return;
          }
          const worldMoney = amount * 1000;
          setUser({
              ...user,
              auroCoins: (user.auroCoins || 0) - amount,
              money: user.money + worldMoney,
              transactions: [
                  {
                      id: 'ex-' + Date.now(),
                      type: 'IN',
                      amount: worldMoney,
                      description: `Đổi ${amount} Auro Coin sang tiền thế giới`,
                      date: Date.now()
                  },
                  ...(user.transactions || [])
              ]
          });
          setIsExchangeModalOpen(false);
          setExchangeAmount('');
      }
  };

  const handleCreateShop = async () => {
    if (!newShopName.trim() || !newShopOwner.trim() || !newShopDesc.trim()) {
      alert("Vui lòng nhập đầy đủ thông tin cửa hàng!");
      return;
    }
    
    setIsCreatingShop(true);
    try {
      const newShop = await shopService.createCustomShop(newShopName, newShopOwner, newShopDesc, settings.shopModel || settings.model);
      
      const updatedWorld = {
        ...character.world,
        shopNPCs: [...(character.world?.shopNPCs || []), newShop]
      };
      
      onUpdateCharacter({
        ...character,
        world: updatedWorld as any
      });
      
      setIsCreateShopModalOpen(false);
      setNewShopName('');
      setNewShopOwner('');
      setNewShopDesc('');
      alert("Tạo cửa hàng thành công!");
    } catch (error: any) {
      alert(error.message || "Có lỗi xảy ra khi tạo cửa hàng.");
    } finally {
      setIsCreatingShop(false);
    }
  };

  const handleCheckout = () => {
    let totalMoney = 0;
    let totalAuro = 0;

    cart.forEach(item => {
        if (item.payWithAuro) {
            totalAuro += (item.quantity || 1); // 1 Auro Coin per item as requested
        } else {
            totalMoney += (item.value ?? 0) * (item.quantity || 1);
        }
    });

    if (user.money < totalMoney) return alert(`Bạn không đủ ${currency} để mua hàng!`);
    if ((user.auroCoins || 0) < totalAuro) return alert(`Bạn không đủ Auro Coin để mua hàng!`);

    const order: OrderHistory = {
      id: "ORD-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      date: Date.now(),
      items: [...cart],
      total: totalMoney,
      shopkeeper: currentNPC?.name || 'Auro Shop'
    };

    const newInventory = [...user.inventory];
    cart.forEach(cItem => {
      const idx = newInventory.findIndex(i => i.name === cItem.name);
      if (idx > -1) newInventory[idx].quantity = (newInventory[idx].quantity || 0) + (cItem.quantity || 1);
      else newInventory.push({ ...cItem });
    });

    const transaction: Transaction = {
        id: 'tx-' + Date.now(),
        type: 'OUT',
        amount: totalMoney,
        description: `Mua sắm tại ${currentNPC?.name || 'Shop'}`,
        date: Date.now(),
        relatedItem: cart.length > 1 ? `${cart[0].name} +${cart.length-1}` : cart[0].name
    };

    setUser({
      ...user,
      money: user.money - totalMoney,
      auroCoins: (user.auroCoins || 0) - totalAuro,
      inventory: newInventory,
      purchaseHistory: [order, ...(user.purchaseHistory || [])],
      transactions: [transaction, ...(user.transactions || [])]
    });

    setLastOrder(order);
    setCart([]);
    setShopTab('invoice');
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      
      {/* Exchange Auro Modal */}
      <Modal 
        isOpen={isExchangeModalOpen} 
        onClose={() => setIsExchangeModalOpen(false)}
        title="Đổi Auro Coin"
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsExchangeModalOpen(false)} 
              className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors"
            >
              Huỷ
            </button>
            <button 
              onClick={handleExchangeAuro} 
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Xác nhận đổi
            </button>
          </div>
        }
      >
        <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-indigo-50 rounded-full flex items-center justify-center border-4 border-indigo-100 mb-4">
                <i className="fa-solid fa-right-left text-2xl text-indigo-500"></i>
            </div>
            <p className="text-sm text-slate-600 mb-2">Nhập số Auro Coin bạn muốn đổi sang <span className="font-bold">{currency}</span>.</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tỷ giá: 1 Auro = 1,000 {currency}</p>
            
            <input 
              type="number"
              value={exchangeAmount}
              onChange={(e) => setExchangeAmount(e.target.value)}
              placeholder="Ví dụ: 10"
              className="w-full text-center text-2xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />

            {exchangeAmount && parseInt(exchangeAmount) > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700 text-sm animate-in fade-in">
                    Bạn sẽ nhận được: <span className="font-black text-emerald-600">{(parseInt(exchangeAmount) * 1000).toLocaleString()} {currency}</span>
                </div>
            )}
        </div>
      </Modal>

      {/* Create Shop Modal */}
      <Modal 
        isOpen={isCreateShopModalOpen} 
        onClose={() => !isCreatingShop && setIsCreateShopModalOpen(false)}
        title="Mở Cửa Hàng Mới"
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsCreateShopModalOpen(false)} 
              disabled={isCreatingShop}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Huỷ
            </button>
            <button 
              onClick={handleCreateShop} 
              disabled={isCreatingShop}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
            >
              {isCreatingShop ? <><i className="fa-solid fa-spinner fa-spin"></i> Đang tạo...</> : 'Tạo Cửa Hàng'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Tên cửa hàng</label>
                <input 
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="VD: Tiệm Tạp Hóa Cô Ba"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Tên chủ shop</label>
                <input 
                  type="text"
                  value={newShopOwner}
                  onChange={(e) => setNewShopOwner(e.target.value)}
                  placeholder="VD: Cô Ba"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Mô tả ngắn</label>
                <textarea 
                  value={newShopDesc}
                  onChange={(e) => setNewShopDesc(e.target.value)}
                  placeholder="VD: Bán đủ thứ đồ lặt vặt, từ bánh kẹo đến đồ gia dụng. Chủ shop hơi khó tính nhưng bán đồ rẻ."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none h-24"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">AI sẽ dựa vào mô tả này để tạo tính cách và mặt hàng cho shop.</p>
            </div>
        </div>
      </Modal>

      {/* DETAIL POPUP OVERLAY */}
      {selectedDetailItem && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-6">
              <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-white/60 relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setSelectedDetailItem(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                      <i className="fa-solid fa-xmark"></i>
                  </button>
                  
                  <div className="flex flex-col items-center text-center">
                      <div className="w-28 h-28 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl flex items-center justify-center mb-4 shadow-inner border border-slate-200">
                          {renderIcon(selectedDetailItem.icon, "text-7xl")}
                      </div>
                      
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">{selectedDetailItem.name}</h3>
                      
                      {selectedDetailItem.category === 'Nội thất' ? (
                          <div className="flex flex-col items-center gap-2 mb-4">
                              <div className="flex items-center gap-4">
                                  <button 
                                      onClick={() => setPayWithAuro(false)}
                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!payWithAuro ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                  >
                                      {selectedDetailItem.value} {currency}
                                  </button>
                                  <button 
                                      onClick={() => setPayWithAuro(true)}
                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${payWithAuro ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                  >
                                      1 Auro Coin
                                  </button>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Chọn phương thức thanh toán</p>
                          </div>
                      ) : (
                          <div className="inline-block px-3 py-1 bg-amber-50 rounded-lg border border-amber-100 mb-4">
                              <span className="text-amber-500 font-black text-lg">{selectedDetailItem.value} {currency}</span>
                          </div>
                      )}
                      
                      <p className="text-xs text-slate-500 leading-relaxed font-medium italic mb-6">
                          "{selectedDetailItem.description}"
                      </p>
                      
                      <div className="flex items-center gap-4 mb-6">
                          <button 
                            onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                              <i className="fa-solid fa-minus"></i>
                          </button>
                          <span className="text-lg font-black text-slate-800 w-8">{detailQuantity}</span>
                          <button 
                            onClick={() => setDetailQuantity(detailQuantity + 1)}
                            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                              <i className="fa-solid fa-plus"></i>
                          </button>
                      </div>
                      
                      <button 
                          onClick={() => addToCart(selectedDetailItem, detailQuantity, payWithAuro)} 
                          className={`w-full py-3.5 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${payWithAuro ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                      >
                          <i className="fa-solid fa-cart-plus"></i> THÊM VÀO GIỎ ({payWithAuro ? `${detailQuantity} Auro` : `${(selectedDetailItem.value ?? 0) * detailQuantity} ${currency}`})
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
         <div className="flex items-center gap-3">
             {currentNPC && <button onClick={() => setCurrentNPC(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-chevron-left"></i></button>}
             <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{t('shop.title')}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentNPC ? currentNPC.name : t('shop.default_npc')}</p>
             </div>
         </div>
         <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <div className="bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-2 mb-1">
                    <span className="text-amber-500 font-bold text-xs">{(user.money ?? 0).toLocaleString()}</span>
                    <span className="text-[9px] font-black text-amber-400 uppercase">{currency}</span>
                </div>
                <div onClick={() => setIsExchangeModalOpen(true)} className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-2 cursor-pointer hover:bg-indigo-100 transition-colors">
                    <span className="text-indigo-500 font-bold text-xs">{(user.auroCoins ?? 0).toLocaleString()}</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase">Auro</span>
                    <i className="fa-solid fa-right-left text-[8px] text-indigo-300"></i>
                </div>
             </div>
             <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors shadow-sm"><i className="fa-solid fa-xmark"></i></button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative">
          {!currentNPC ? (
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-4 custom-scrollbar">
                  <div className="flex justify-end mb-2">
                      <button 
                          onClick={() => setIsCreateShopModalOpen(true)}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-100 transition-colors flex items-center gap-2"
                      >
                          <i className="fa-solid fa-plus"></i> Tạo cửa hàng mới
                      </button>
                  </div>
                  {character.world?.shopNPCs.length === 0 && <div className="text-center text-slate-400 py-10">{t('shop.empty_street')}</div>}
                  {character.world?.shopNPCs.map((npc, idx) => (
                      <div key={`shop-npc-${npc.id || idx}`} onClick={() => { setCurrentNPC(npc); setShopTab('browse'); }} className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center gap-4 group">
                          <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                              <i className="fa-solid fa-store text-slate-300"></i>
                          </div>
                          <div className="flex-1">
                              <h3 className="font-black text-slate-800 text-sm uppercase">{npc.name}</h3>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">{npc.specialty}</p>
                              <p className="text-[11px] text-slate-500 italic line-clamp-2">"{npc.greeting}"</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                              <i className="fa-solid fa-arrow-right"></i>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <>
                  <div className="flex px-6 pt-2 bg-slate-50 border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
                      {[
                          {id: 'browse', icon: 'fa-bag-shopping', label: t('shop.tab.browse')},
                          {id: 'consult', icon: 'fa-comments', label: t('shop.tab.consult')},
                          {id: 'cart', icon: 'fa-cart-shopping', label: t('shop.tab.cart')},
                          {id: 'history', icon: 'fa-clock-rotate-left', label: t('shop.tab.history')}
                      ].map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => setShopTab(t.id as any)}
                            className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 ${shopTab === t.id ? 'border-indigo-500 text-indigo-600 bg-white rounded-t-xl' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                          >
                              <div className="relative">
                                  <i className={`fa-solid ${t.icon}`}></i>
                                  {t.id === 'cart' && cart.length > 0 && (
                                      <span className="absolute -top-2 -right-3 bg-rose-500 text-white text-[8px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in">
                                          {cart.reduce((a,b)=>a+(b.quantity||1),0)}
                                      </span>
                                  )}
                              </div>
                              <span className="hidden sm:inline">{t.label}</span>
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                      {shopTab === 'browse' && (
                          isStocking ? (
                              <div className="flex flex-col items-center justify-center h-full opacity-60">
                                  <i className="fa-solid fa-box-open fa-bounce text-4xl text-indigo-300 mb-3"></i>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang nhập hàng mới...</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 gap-4">
                                  {displayItems.length === 0 && <div className="col-span-2 text-center py-10 text-slate-400 italic text-xs">Hết hàng. Hãy quay lại sau.</div>}
                                  {displayItems.map((item, idx) => (
                                      <div key={`${item.id}-${idx}`} onClick={() => setSelectedDetailItem(item)} className="bg-white p-4 rounded-3xl border border-slate-100 hover:border-indigo-300 hover:shadow-lg transition-all group flex flex-col cursor-pointer active:scale-95">
                                          <div className="h-24 flex items-center justify-center mb-2 bg-slate-50 rounded-2xl group-hover:scale-105 transition-transform">{renderIcon(item.icon)}</div>
                                          <h4 className="font-black text-slate-700 text-xs uppercase line-clamp-1">{item.name}</h4>
                                          <p className="text-[9px] text-slate-400 italic line-clamp-2 min-h-[2.5em] mb-2">{item.description}</p>
                                          <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-50">
                                              <span className="font-black text-amber-500 text-xs">{(item.value ?? 0).toLocaleString()}</span>
                                              <button className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-500 hover:text-white transition-colors flex items-center justify-center shadow-sm">
                                                  <i className="fa-solid fa-eye"></i>
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )
                      )}

                      {shopTab === 'consult' && (
                          <div className="flex flex-col h-full">
                              <div className="flex-1 space-y-4 mb-4">
                                  {shopMessages.length === 0 && (
                                      <div className="text-center py-10 opacity-50">
                                          <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto mb-3 flex items-center justify-center text-slate-300">
                                              <i className="fa-solid fa-user-tie text-2xl"></i>
                                          </div>
                                          <p className="text-[10px] font-bold uppercase text-slate-400">{t('shop.empty_chat')}</p>
                                      </div>
                                  )}
                                  {shopMessages.map(msg => (
                                      <div key={msg.id} className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] ${msg.sender === Sender.USER ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                              {msg.text}
                                          </div>
                                      </div>
                                  ))}
                                  {isThinking && <div className="flex justify-start"><div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-bl-none shadow-sm"><i className="fa-solid fa-ellipsis fa-bounce text-slate-400"></i></div></div>}
                                  
                                  {npcProposals.length > 0 && (
                                      <div className="my-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-3">{t('shop.proposal')}</p>
                                          <div className="space-y-2">
                                              {npcProposals.map((prop, idx) => (
                                                  <div key={`prop-${prop.id || idx}`} onClick={() => setSelectedDetailItem(prop)} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-50 cursor-pointer hover:shadow-md transition-all active:scale-95">
                                                      <div className="text-2xl">{prop.icon}</div>
                                                      <div className="flex-1">
                                                          <p className="text-[10px] font-bold text-slate-700">{prop.name}</p>
                                                          <p className="text-[9px] text-amber-500 font-bold">{(prop.value ?? 0).toLocaleString()} {currency}</p>
                                                      </div>
                                                      <button className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg"><i className="fa-solid fa-magnifying-glass"></i></button>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                                  <div ref={chatEndRef} />
                              </div>
                              <div className="relative">
                                  <input 
                                    className="w-full bg-white border border-slate-200 rounded-full pl-4 pr-12 py-3 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                                    placeholder={t('shop.consult_placeholder')}
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleConsultNPC()}
                                    disabled={isThinking}
                                  />
                                  <button onClick={handleConsultNPC} disabled={isThinking || !inputValue.trim()} className="absolute right-1 top-1 w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                                      <i className="fa-solid fa-paper-plane text-xs"></i>
                                  </button>
                              </div>
                          </div>
                      )}

                      {shopTab === 'cart' && (
                          <div className="h-full flex flex-col">
                              {cart.length === 0 ? (
                                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                      <i className="fa-solid fa-cart-shopping text-4xl mb-3"></i>
                                      <p className="text-[10px] font-bold uppercase">{t('shop.cart_empty')}</p>
                                  </div>
                              ) : (
                                  <div className="flex-1 space-y-3">
                                      {cart.map((item, idx) => (
                                          <div key={`cart-${idx}`} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl">{item.icon}</div>
                                              <div className="flex-1">
                                                  <h4 className="text-[11px] font-bold text-slate-700 uppercase">{item.name}</h4>
                                                  <p className="text-[10px] text-amber-500 font-bold">
                                                      {item.payWithAuro ? `${item.quantity || 1} Auro` : `${((item.value ?? 0) * (item.quantity || 1)).toLocaleString()} ${currency}`}
                                                  </p>
                                              </div>
                                              <div className="flex items-center gap-2 bg-slate-50 rounded-full px-2 py-1">
                                                  <button onClick={() => updateCartQuantity(idx, -1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-slate-600 shadow-sm"><i className="fa-solid fa-minus"></i></button>
                                                  <span className="text-xs font-black text-slate-800 w-4 text-center">{item.quantity || 1}</span>
                                                  <button onClick={() => updateCartQuantity(idx, 1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-slate-600 shadow-sm"><i className="fa-solid fa-plus"></i></button>
                                              </div>
                                              <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500 ml-2"><i className="fa-solid fa-trash"></i></button>
                                          </div>
                                      ))}
                                  </div>
                              )}
                              
                              {cart.length > 0 && (
                                  <div className="mt-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-lg">
                                      <div className="flex justify-between items-center mb-4">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('shop.total')}</span>
                                          <div className="flex flex-col items-end">
                                              <span className="text-xl font-black text-slate-800">
                                                  {(cart.filter(i => !i.payWithAuro).reduce((a,b)=>a+(b.value ?? 0)*(b.quantity||1),0) ?? 0).toLocaleString()} <span className="text-xs text-amber-500">{currency}</span>
                                              </span>
                                              {cart.some(i => i.payWithAuro) && (
                                                  <span className="text-sm font-black text-indigo-500">
                                                      {cart.filter(i => i.payWithAuro).reduce((a,b)=>a+(b.quantity||1),0)} <span className="text-[10px] uppercase">Auro</span>
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                      <button onClick={handleCheckout} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-md">
                                          {t('shop.checkout')} <i className="fa-solid fa-check ml-1"></i>
                                      </button>
                                  </div>
                              )}
                          </div>
                      )}

                      {shopTab === 'invoice' && lastOrder && (
                          <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95">
                              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl shadow-lg mb-6 animate-pop">
                                  <i className="fa-solid fa-check"></i>
                              </div>
                              <h3 className="text-xl font-black text-slate-800 uppercase mb-1">{t('shop.success')}</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">{t('shop.order_id')}: {lastOrder.id}</p>
                              
                              <div className="w-full bg-white p-6 rounded-3xl border border-dashed border-slate-300 relative">
                                  <div className="absolute -left-3 top-1/2 w-6 h-6 bg-slate-50 rounded-full"></div>
                                  <div className="absolute -right-3 top-1/2 w-6 h-6 bg-slate-50 rounded-full"></div>
                                  
                                  <div className="space-y-2 mb-4 border-b border-slate-100 pb-4">
                                      {lastOrder.items.map((i, idx) => (
                                          <div key={`ord-item-${i.id}-${idx}`} className="flex justify-between text-[11px]">
                                              <span className="text-slate-600">{i.name} x{i.quantity||1}</span>
                                              <span className="font-bold text-slate-800">{((i.value ?? 0) * (i.quantity||1)).toLocaleString()}</span>
                                          </div>
                                      ))}
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="font-black text-slate-400 text-[10px] uppercase">{t('shop.total')}</span>
                                      <span className="font-black text-emerald-500 text-lg">{(lastOrder.total ?? 0).toLocaleString()}</span>
                                  </div>
                              </div>
                              
                              <button onClick={() => setShopTab('browse')} className="mt-8 px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors">{t('shop.continue')}</button>
                          </div>
                      )}

                      {shopTab === 'history' && (
                          <div className="space-y-4">
                              {(user.purchaseHistory || []).length === 0 && <div className="text-center py-10 text-slate-400 italic text-xs">{t('shop.history_empty')}</div>}
                              {(user.purchaseHistory || []).map(order => (
                                  <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                      <div className="flex justify-between items-center mb-2">
                                          <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase tracking-wider">{order.id}</span>
                                          <span className="text-[9px] text-slate-400">{new Date(order.date).toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                                          {order.items.map((i, idx) => (
                                              <div key={`history-item-${order.id}-${idx}`} className="w-10 h-10 bg-slate-50 rounded-lg flex-shrink-0 flex items-center justify-center text-lg border border-slate-100" title={i.name}>
                                                  {i.icon}
                                              </div>
                                          ))}
                                      </div>
                                      <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">{order.shopkeeper}</span>
                                          <span className="text-[11px] font-black text-slate-800">{(order.total ?? 0).toLocaleString()} {currency}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </>
          )}
      </div>
    </div>
  );
};

export default ShopView;
