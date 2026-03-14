import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { UserProfile, Character, InventoryItem, AppView, Message, Memory } from '../types';
import { GeminiService } from '../services/geminiService';

interface GachaViewProps {
  user: UserProfile;
  character: Character;
  geminiService: GeminiService;
  onUpdateUser: (user: Partial<UserProfile>) => void;
  onUpdateCharacter: (id: string, char: Partial<Character>) => void;
  onAddMessage: (msg: Message) => void;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

type GachaRewardType = 'furniture' | 'item' | 'story' | 'memory' | 'situation';

interface GachaReward {
  type: GachaRewardType;
  name: string;
  description: string;
  icon: string;
  data?: any;
}

const BAG_COST = 500;

const GachaView: React.FC<GachaViewProps> = ({
  user,
  character,
  geminiService,
  onUpdateUser,
  onUpdateCharacter,
  onBack
}) => {
  const [phase, setPhase] = useState<'wish' | 'play'>('wish');
  const [wish, setWish] = useState<GachaRewardType | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [bagsLeft, setBagsLeft] = useState(0);
  const [recentRewards, setRecentRewards] = useState<GachaReward[]>([]);
  const [currentReward, setCurrentReward] = useState<GachaReward | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isOpeningAll, setIsOpeningAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comboMessage, setComboMessage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const tearAudioRef = useRef<HTMLAudioElement | null>(null);

  // Framer Motion Hooks (Must be at top level)
  const dragX = useMotionValue(0);
  const tearWidth = useTransform(dragX, [0, 200], ["0%", "100%"]);
  const bagOpacity = useTransform(dragX, [150, 200], [1, 0]);

  useEffect(() => {
    tearAudioRef.current = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_7385566065.mp3'); // Tearing sound
    if (tearAudioRef.current) {
      tearAudioRef.current.volume = 0.5;
    }
  }, []);

  const playTearSound = () => {
    if (tearAudioRef.current) {
      tearAudioRef.current.currentTime = 0;
      tearAudioRef.current.play().catch(() => {});
    }
  };

  const rewardTypes: { type: GachaRewardType; label: string; icon: string; color: string }[] = [
    { type: 'furniture', label: 'Nội thất', icon: '🪑', color: 'bg-[#4a4a4a]' },
    { type: 'item', label: 'Vật phẩm', icon: '🎁', color: 'bg-[#4a4a4a]' },
    { type: 'story', label: 'Cốt truyện', icon: '📖', color: 'bg-[#facc15]' },
    { type: 'memory', label: 'Kỷ niệm', icon: '💭', color: 'bg-[#4a4a4a]' },
    { type: 'situation', label: 'Tình huống', icon: '🎭', color: 'bg-[#4a4a4a]' },
  ];

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const handleStartGame = () => {
    if (!wish) {
      showError('Vui lòng chọn 1 nguyện vọng!');
      return;
    }
    const totalCost = BAG_COST * amount;
    if (user.auroCoins < totalCost) {
      showError('Bạn không đủ Auro Coin!');
      return;
    }
    
    onUpdateUser({ auroCoins: user.auroCoins - totalCost });
    setBagsLeft(amount);
    setRecentRewards([]);
    setCurrentReward(null);
    setComboMessage(null);
    setPhase('play');
  };

  const processReward = (result: GachaReward) => {
    if (result.type === 'item' || result.type === 'furniture') {
      const newItem: InventoryItem = {
        id: `gacha_${Date.now()}_${Math.random()}`,
        name: result.name,
        description: result.description,
        icon: result.icon || '🎁',
        value: 1000,
        affinityBonus: 5,
        category: 'Gacha',
        quantity: 1,
        isFurniture: result.type === 'furniture',
        furnitureType: 'decor'
      };
      onUpdateUser({ inventory: [...(user.inventory || []), newItem] });
    } else if (result.type === 'memory' || result.type === 'story' || result.type === 'situation') {
      const newMemory: Memory = {
        id: `mem_${Date.now()}_${Math.random()}`,
        type: 'note',
        category: result.type,
        title: result.name,
        content: result.description,
        timestamp: Date.now()
      };
      onUpdateCharacter(character.id!, { memories: [...(character.memories || []), newMemory] });
    }
  };

  const openSingleBag = async (): Promise<GachaReward | null> => {
    try {
      const selectedType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)].type;
      const result = await geminiService.generateGachaReward(character, selectedType);
      processReward(result);
      return result;
    } catch (err) {
      console.error("Gacha Error:", err);
      return null;
    }
  };

  const handleOpenBag = async () => {
    if (isOpening || bagsLeft <= 0) return;

    setIsOpening(true);
    setTearProgress(0); // Reset tear progress
    setCurrentReward(null);
    setComboMessage(null);

    const result = await openSingleBag();
    
    if (result) {
      // Fake delay for animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setCurrentReward(result);

      let extraBags = 0;
      let comboMsg = "";

      if (result.type === wish) {
        extraBags += 1;
        comboMsg = "✨ Trúng nguyện vọng! +1 túi";
      }

      const lastReward = recentRewards[recentRewards.length - 1];
      if (lastReward && lastReward.type === result.type) {
        extraBags += 1;
        comboMsg += (comboMsg ? "\n" : "") + "👯 Ghép cặp! +1 túi";
      }

      if (extraBags > 0) {
        setBagsLeft(prev => prev - 1 + extraBags);
        setComboMessage(comboMsg);
      } else {
        setBagsLeft(prev => prev - 1);
      }

      setRecentRewards(prev => [result, ...prev]);
    } else {
      showError('Có lỗi xảy ra. Vui lòng thử lại!');
    }
    
    setIsOpening(false);
  };

  const handleOpenAll = async () => {
    if (isOpening || bagsLeft <= 0 || isOpeningAll) return;
    
    setIsOpeningAll(true);
    setIsOpening(true);
    setCurrentReward(null);
    setComboMessage(null);

    let currentBagsLeft = bagsLeft;
    let currentRecentRewards = [...recentRewards];
    let totalExtraBags = 0;

    while (currentBagsLeft > 0) {
      const result = await openSingleBag();
      
      if (result) {
        let extraBags = 0;
        if (result.type === wish) extraBags += 1;
        
        const lastReward = currentRecentRewards[0]; // We prepend now
        if (lastReward && lastReward.type === result.type) extraBags += 1;

        totalExtraBags += extraBags;
        currentBagsLeft = currentBagsLeft - 1 + extraBags;
        currentRecentRewards = [result, ...currentRecentRewards];
        
        setRecentRewards([...currentRecentRewards]);
        setBagsLeft(currentBagsLeft);
        setCurrentReward(result);
        
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        showError('Lỗi khi mở. Đã dừng lại.');
        break;
      }
    }

    if (totalExtraBags > 0) {
      setComboMessage(`🎉 Đã mở hết! Nhận thêm ${totalExtraBags} túi!`);
    }

    setIsOpeningAll(false);
    setIsOpening(false);
  };

  // Render Wish Selection Phase
  if (phase === 'wish') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#222222] flex flex-col items-center p-6 text-white font-sans overflow-y-auto">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-8 mt-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
            <img src="https://i.ibb.co/k6KC8zyN/media-1769361739.png" className="w-5 h-5" alt="Coin" />
            <span className="font-bold">{user.auroCoins.toLocaleString()}</span>
          </div>
        </div>

        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center text-4xl mb-6 text-yellow-500">
          <i className="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2 text-center">Chọn Nguyện Vọng</h1>
        <p className="text-xs text-white/50 mb-8 text-center uppercase tracking-widest px-4">
          Nếu xé trúng loại này, bạn sẽ được tặng thêm túi!
        </p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
          {rewardTypes.map((rt) => {
            const isSelected = wish === rt.type;
            return (
              <button
                key={rt.type}
                onClick={() => setWish(rt.type)}
                className={`flex flex-col items-center justify-center p-6 rounded-3xl transition-all border-2 ${
                  isSelected 
                    ? 'bg-[#facc15] border-[#facc15] text-black scale-105 shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                    : 'bg-[#333333] border-transparent text-white hover:bg-[#444444]'
                }`}
              >
                <span className="text-4xl mb-3">{rt.icon}</span>
                <span className="text-xs font-black uppercase">{rt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Amount Selection */}
        <div className="w-full max-w-sm bg-[#333333] rounded-3xl p-5 mb-8">
          <p className="text-center text-xs text-white/50 uppercase tracking-widest mb-4">Số lượng túi mù</p>
          <div className="flex justify-center gap-4">
            {[1, 5, 10].map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${
                  amount === amt
                    ? 'bg-white text-black shadow-lg scale-110'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-bold mt-5 text-yellow-500">
            Chi phí: {(BAG_COST * amount).toLocaleString()} Xu
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3 mt-auto pb-6">
          <button 
            onClick={handleStartGame}
            className="w-full py-4 rounded-full bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg"
          >
            Bắt đầu chơi
          </button>
          <button 
            onClick={() => setShowInstructions(true)}
            className="w-full py-3 rounded-full bg-transparent text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white transition-all"
          >
            <i className="fa-solid fa-circle-info mr-2"></i> Hướng dẫn
          </button>
        </div>

        {/* Instructions Modal */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6"
            >
              <div className="bg-[#222] w-full max-w-sm rounded-[2rem] p-6 border border-white/10 relative">
                <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-xmark"></i>
                </button>
                <h2 className="text-xl font-black uppercase mb-6 text-center text-yellow-500">Luật Chơi</h2>
                <ul className="space-y-4 text-sm text-white/80">
                  <li><strong className="text-white">1. Nguyện vọng:</strong> Chọn 1 loại trước khi xé. Trúng loại đó = +1 túi.</li>
                  <li><strong className="text-white">2. Ghép cặp:</strong> Xé ra 2 món liên tiếp cùng loại = +1 túi.</li>
                  <li><strong className="text-white">3. Mở hết:</strong> Tự động xé toàn bộ túi đang có.</li>
                </ul>
                <button onClick={() => setShowInstructions(false)} className="w-full mt-8 py-3 bg-white text-black rounded-full font-bold uppercase">Đã hiểu</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-10 z-[150] bg-rose-500 text-white px-6 py-3 rounded-full text-xs font-black uppercase shadow-2xl">
            {error}
          </motion.div>
        )}
      </div>
    );
  }

  // Render Play Phase
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-[#fdf8e7] font-sans overflow-hidden"
         style={{ 
           backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.03) 40px, rgba(0,0,0,0.03) 80px)'
         }}>
      
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center p-4 z-20">
        <button onClick={() => setPhase('wish')} className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center shadow-sm text-[#5a4d41]">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm text-[#5a4d41]">
          <img src="https://i.ibb.co/k6KC8zyN/media-1769361739.png" className="w-5 h-5" alt="Coin" />
          <span className="font-bold">{user.auroCoins.toLocaleString()}</span>
        </div>
      </div>

      {/* Wish Badge */}
      <div className="mt-2 z-20 flex flex-col items-center">
        <div className="bg-white border-2 border-[#e5dcd0] rounded-2xl px-6 py-2 shadow-sm flex flex-col items-center relative">
          <div className="absolute -top-3 bg-[#facc15] text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm">
            Muốn
          </div>
          <span className="text-4xl mt-2">{rewardTypes.find(r => r.type === wish)?.icon}</span>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
        
        {comboMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 z-30">
            <div className="bg-yellow-400 text-black px-4 py-2 rounded-full text-xs font-black uppercase shadow-md text-center whitespace-pre-line">
              {comboMessage}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!currentReward && bagsLeft > 0 && !isOpeningAll ? (
            <motion.div
              key="bag"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative flex flex-col items-center"
            >
              {!isOpening && (
                <motion.div 
                  animate={{ y: [0, -10, 0] }} 
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-16 z-30 flex flex-col items-center pointer-events-none"
                >
                  <span className="text-[10px] font-black text-white bg-rose-500 px-3 py-1 rounded-full uppercase mb-1 shadow-lg">Quẹt để xé!</span>
                  <i className="fa-solid fa-hand-pointer text-rose-500 animate-bounce"></i>
                </motion.div>
              )}

              <div className="relative w-64 h-48">
                {/* Torn Part (Left) */}
                <motion.div
                  style={{ x: useTransform(dragX, [0, 200], [0, -50]) }}
                  className={`absolute inset-0 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl shadow-xl flex items-center justify-center border-4 border-pink-300 z-10 overflow-hidden ${isOpening ? 'pointer-events-none' : ''}`}
                >
                   {/* Heart Center */}
                   <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-6xl text-pink-500 font-black">?</span>
                  </div>
                  
                  {/* Tear Progress Overlay */}
                  <motion.div 
                    style={{ width: tearWidth }}
                    className="absolute right-0 top-0 bottom-0 bg-white/20 backdrop-blur-[2px] z-20"
                  />
                </motion.div>

                {/* Tear Handle / Interaction Area */}
                {!isOpening && (
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 200 }}
                    style={{ x: dragX }}
                    onDragStart={() => playTearSound()}
                    onDrag={(e, info) => {
                      // Optional: play sound repeatedly or adjust volume based on speed
                    }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 150) {
                        handleOpenBag();
                        dragX.set(0);
                      } else {
                        dragX.set(0);
                      }
                    }}
                    className="absolute right-0 top-0 bottom-0 w-16 z-30 cursor-grab active:cursor-grabbing flex items-center justify-center"
                  >
                    <div className="w-2 h-full flex flex-col justify-evenly py-2 bg-white/30 rounded-full border border-white/20 backdrop-blur-sm">
                      {Array.from({length: 8}).map((_, i) => <div key={i} className="w-1 h-2 bg-white/60 rounded-full mx-auto"></div>)}
                    </div>
                    <div className="absolute -right-2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-pink-300">
                      <i className="fa-solid fa-scissors text-[10px] text-pink-500"></i>
                    </div>
                  </motion.div>
                )}

                {/* Opening Animation Overlay */}
                {isOpening && (
                  <motion.div 
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 0], rotate: [0, 5, -5, 10, -10, 0] }}
                    className="absolute inset-0 bg-pink-500 rounded-xl z-40 flex items-center justify-center"
                  >
                    <div className="text-white text-4xl animate-ping">✨</div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : currentReward && !isOpeningAll ? (
            <motion.div
              key="reward"
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-40 h-40 bg-white rounded-full shadow-[0_0_40px_rgba(250,204,21,0.6)] flex items-center justify-center text-7xl mb-4 border-4 border-yellow-400 relative z-20">
                {currentReward.icon}
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="absolute inset-[-15px] border-2 border-dashed border-yellow-400 rounded-full opacity-50" />
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl shadow-md text-center border border-[#e5dcd0] z-20">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">
                  {rewardTypes.find(r => r.type === currentReward.type)?.label}
                </span>
                <h3 className="text-lg font-black text-[#5a4d41]">{currentReward.name}</h3>
              </div>
              
              <div className="mt-8 flex gap-3 z-20">
                {bagsLeft > 0 ? (
                  <button onClick={() => { setCurrentReward(null); setComboMessage(null); }} className="px-8 py-3 bg-yellow-400 text-black rounded-full font-black uppercase text-xs shadow-md">
                    Tiếp tục xé
                  </button>
                ) : (
                  <button onClick={() => setPhase('wish')} className="px-8 py-3 bg-white text-black rounded-full font-black uppercase text-xs shadow-md border border-gray-200">
                    Chơi lượt mới
                  </button>
                )}
              </div>
            </motion.div>
          ) : isOpeningAll ? (
            <motion.div key="opening-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-black uppercase text-pink-600 tracking-widest">Đang xé túi...</p>
            </motion.div>
          ) : bagsLeft <= 0 && !currentReward ? (
             <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl shadow-md mb-4 text-gray-400">
                  <i className="fa-solid fa-box-open"></i>
                </div>
                <p className="font-bold text-[#5a4d41] mb-6">Đã hết túi mù!</p>
                <button onClick={() => setPhase('wish')} className="px-8 py-3 bg-yellow-400 text-black rounded-full font-black uppercase text-xs shadow-md">
                  Mua thêm túi
                </button>
             </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Bottom Controls & Tray */}
      <div className="w-full mt-auto z-20">
        {/* Controls */}
        {!currentReward && bagsLeft > 0 && !isOpeningAll && (
          <div className="flex justify-between items-end px-6 mb-4">
            <div className="relative">
              <div className="w-20 h-16 bg-[#8ba6d4] rounded-xl border-4 border-[#6b8ac0] flex items-center justify-center shadow-inner relative">
                <div className="flex gap-[-10px]">
                  <div className="w-8 h-8 bg-pink-400 rounded-sm transform -rotate-12 border border-pink-300"></div>
                  <div className="w-8 h-8 bg-pink-400 rounded-sm transform rotate-6 -ml-4 border border-pink-300"></div>
                  <div className="w-8 h-8 bg-pink-400 rounded-sm transform -rotate-6 -ml-4 border border-pink-300"></div>
                </div>
                <div className="absolute -top-3 -right-3 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md border-2 border-white">
                  {bagsLeft}
                </div>
              </div>
            </div>
            <button
              onClick={handleOpenAll}
              className="px-6 py-3 bg-[#4ade80] text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#16a34a] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Mở Hết
            </button>
          </div>
        )}

        {/* Wooden Tray */}
        <div className="w-full bg-[#d28c5a] border-t-8 border-[#b06b3d] p-4 min-h-[140px] shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)]">
          <div className="w-full h-4 bg-[#b06b3d]/30 rounded-full mb-4"></div>
          <div className="flex flex-wrap gap-3 justify-center">
            {recentRewards.map((r, i) => (
              <motion.div 
                initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }}
                key={i} 
                className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-md border-b-4 border-gray-200 relative group"
              >
                {r.icon}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {r.name}
                </div>
              </motion.div>
            ))}
            {recentRewards.length === 0 && (
              <div className="w-full text-center text-[#8c5a3d] text-sm font-bold opacity-50 mt-2">
                Đồ đã mở sẽ nằm ở đây
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-10 z-[150] bg-rose-500 text-white px-6 py-3 rounded-full text-xs font-black uppercase shadow-2xl">
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default GachaView;
