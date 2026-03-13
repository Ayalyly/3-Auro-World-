import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Character, InventoryItem, AppView, Message, Sender, DiaryEntry, Memory } from '../types';
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

const BAG_COST = 2000;

const GachaView: React.FC<GachaViewProps> = ({
  user,
  character,
  geminiService,
  onUpdateUser,
  onUpdateCharacter,
  onAddMessage,
  onBack
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [reward, setReward] = useState<GachaReward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wish, setWish] = useState<GachaRewardType | null>(null);
  const [recentRewards, setRecentRewards] = useState<GachaReward[]>([]);
  const [bagsLeft, setBagsLeft] = useState(0);
  const [isTearing, setIsTearing] = useState(false);
  const [showWishModal, setShowWishModal] = useState(true);
  const [comboCount, setComboCount] = useState(0);

  const rewardTypes: { type: GachaRewardType; label: string; icon: string }[] = [
    { type: 'furniture', label: 'Nội thất', icon: '🪑' },
    { type: 'item', label: 'Vật phẩm', icon: '🎁' },
    { type: 'story', label: 'Cốt truyện', icon: '📖' },
    { type: 'memory', label: 'Kỷ niệm', icon: '💭' },
    { type: 'situation', label: 'Tình huống', icon: '🎭' },
  ];

  const handleStartGame = (selectedWish: GachaRewardType) => {
    if (user.auroCoins < BAG_COST) {
      setError('Bạn không đủ Auro Coin!');
      return;
    }
    setWish(selectedWish);
    setBagsLeft(1);
    setShowWishModal(false);
    onUpdateUser({ auroCoins: user.auroCoins - BAG_COST });
  };

  const processReward = (result: GachaReward) => {
    if (result.type === 'item' || result.type === 'furniture') {
      const newItem: InventoryItem = {
        id: `gacha_${Date.now()}`,
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
    } else if (result.type === 'memory') {
      const newMemory: Memory = {
        id: `mem_${Date.now()}`,
        type: 'note',
        title: result.name,
        content: result.description,
        timestamp: Date.now()
      };
      onUpdateCharacter(character.id!, { memories: [...(character.memories || []), newMemory] });
    } else if (result.type === 'story') {
      const newEntry: DiaryEntry = {
        date: Date.now(),
        content: `[Cột truyện mới: ${result.name}] ${result.description}`,
        mood: 'Hạnh phúc'
      };
      onUpdateCharacter(character.id!, { diary: [...(character.diary || []), newEntry] });
    } else if (result.type === 'situation') {
      onAddMessage({
        id: `sys_${Date.now()}`,
        text: `[TÌNH HUỐNG MỚI]: ${result.description}`,
        sender: Sender.SYSTEM,
        timestamp: Date.now()
      });
    }
  };

  const handleOpenBag = async () => {
    if (isOpening || bagsLeft <= 0) return;

    setIsOpening(true);
    setIsTearing(true);
    setError(null);

    try {
      // Logic xé túi mù
      const selectedType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)].type;
      const result = await geminiService.generateGachaReward(character, selectedType);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Animation tear
      setIsTearing(false);
      await new Promise(resolve => setTimeout(resolve, 500)); // Reveal

      setReward(result);
      processReward(result);

      let extraBags = 0;
      let comboMsg = "";

      // Check Nguyện vọng (Wish match)
      if (result.type === wish) {
        extraBags += 1;
        comboMsg = "✨ Trúng nguyện vọng! Tặng thêm 1 túi!";
      }

      // Check Gắp cặp (Pair match)
      const lastReward = recentRewards[recentRewards.length - 1];
      if (lastReward && lastReward.type === result.type) {
        extraBags += 1;
        comboMsg += " 👯 Gắp được cặp! Tặng thêm 1 túi!";
      }

      if (extraBags > 0) {
        setComboCount(prev => prev + extraBags);
        setBagsLeft(prev => prev + extraBags - 1);
      } else {
        setBagsLeft(prev => prev - 1);
      }

      setRecentRewards(prev => [...prev, result]);

    } catch (err) {
      console.error("Gacha Error:", err);
      setError('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a1a1a] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent"></div>
        <div className="grid grid-cols-8 gap-4 p-4">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="text-4xl opacity-10 grayscale">🛍️</div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-8 left-8 z-20">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      </div>

      <div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
          <img src="https://i.ibb.co/k6KC8zyN/media-1769361739.png" className="w-6 h-6" alt="Coin" />
          <span className="text-xl font-black tracking-tight">{user.auroCoins.toLocaleString()}</span>
        </div>
        {bagsLeft > 0 && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="bg-yellow-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg"
          >
            Còn {bagsLeft} túi mù
          </motion.div>
        )}
      </div>

      {/* Wish Selection Modal */}
      <AnimatePresence>
        {showWishModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="bg-[#2a2a2a] w-full max-w-md rounded-[3rem] p-8 border border-white/10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 text-yellow-500">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Chọn Nguyện Vọng</h2>
              <p className="text-xs text-white/50 mb-8 uppercase tracking-widest">Nếu xé trúng loại này, bạn sẽ được tặng thêm túi!</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                {rewardTypes.map((rt) => (
                  <button
                    key={rt.type}
                    onClick={() => handleStartGame(rt.type)}
                    className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-yellow-500 hover:text-black transition-all group"
                  >
                    <span className="text-3xl group-hover:scale-125 transition-transform">{rt.icon}</span>
                    <span className="text-[10px] font-black uppercase">{rt.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Chi phí: {BAG_COST.toLocaleString()} Xu / Lượt</p>
                
                <button 
                  onClick={onBack}
                  className="mt-4 py-3 px-6 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 hover:text-white transition-all"
                >
                  <i className="fa-solid fa-house mr-2"></i> Về trang chủ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-12 text-center">
          <span className="text-yellow-500">Xé Túi Mù</span> <br/>
          <span className="text-sm font-normal text-white/40 tracking-[0.3em]">Blind Bag Opening</span>
        </h1>

        <div className="relative w-full aspect-square flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!reward && !isOpening && bagsLeft > 0 && (
              <motion.div
                key="bag"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                onClick={handleOpenBag}
                className="cursor-pointer group relative"
              >
                <div className="w-64 h-80 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 border-4 border-yellow-300 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,_transparent,_transparent_10px,_rgba(255,255,255,0.2)_10px,_rgba(255,255,255,0.2)_20px)]"></div>
                  <div className="text-8xl mb-4 drop-shadow-lg">🛍️</div>
                  <div className="bg-black/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Mystery Bag</div>
                  
                  {/* Tear line */}
                  <div className="absolute top-12 left-0 right-0 h-1 border-t-2 border-dashed border-white/40"></div>
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-black px-6 py-2 rounded-full text-xs font-black uppercase shadow-xl group-hover:scale-110 transition-transform">
                  Chạm để xé!
                </div>
              </motion.div>
            )}

            {isTearing && (
              <motion.div
                key="tearing"
                className="relative w-64 h-80"
              >
                <motion.div 
                  animate={{ y: -100, rotate: -10, opacity: 0 }}
                  className="absolute top-0 left-0 right-0 h-20 bg-yellow-400 rounded-t-[2rem] border-4 border-yellow-300 z-20"
                />
                <div className="w-64 h-80 bg-yellow-500 rounded-[2rem] border-4 border-yellow-300 flex items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="text-6xl">✨</motion.div>
                </div>
              </motion.div>
            )}

            {reward && !isOpening && (
              <motion.div
                key="reward"
                initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-64 h-64 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/20 flex items-center justify-center text-9xl shadow-2xl mb-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent rounded-[3rem]"></div>
                  {reward.icon}
                  
                  {reward.type === wish && (
                    <div className="absolute -top-4 -right-4 bg-yellow-500 text-black w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-[#1a1a1a] animate-bounce">
                      <i className="fa-solid fa-star"></i>
                    </div>
                  )}
                </div>
                
                <h2 className="text-3xl font-black uppercase tracking-tighter text-center mb-2">{reward.name}</h2>
                <p className="text-white/50 text-center text-sm italic max-w-xs mb-8">"{reward.description}"</p>
                
                <div className="flex gap-4">
                  {bagsLeft > 0 ? (
                    <button
                      onClick={() => setReward(null)}
                      className="px-10 py-4 rounded-full bg-yellow-500 text-black font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform"
                    >
                      Tiếp tục xé ({bagsLeft})
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setReward(null);
                        setShowWishModal(true);
                        setRecentRewards([]);
                      }}
                      className="px-10 py-4 rounded-full bg-white text-black font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform"
                    >
                      Chơi lượt mới
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Rewards Tray */}
        <div className="mt-12 w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-3 justify-center min-w-max px-4">
            {recentRewards.map((r, i) => (
              <div key={i} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl border border-white/5">
                {r.icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-12 bg-rose-500 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default GachaView;

