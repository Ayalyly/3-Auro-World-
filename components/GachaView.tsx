import React, { useState } from 'react';
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

const GACHA_COST = 3000;

const GachaView: React.FC<GachaViewProps> = ({
  user,
  character,
  geminiService,
  onUpdateUser,
  onUpdateCharacter,
  onAddMessage,
  onBack
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<GachaReward | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSpin = async () => {
    if (user.auroCoins < GACHA_COST) {
      setError('Bạn không đủ Auro Coin!');
      return;
    }

    setIsSpinning(true);
    setReward(null);
    setError(null);

    onUpdateUser({ auroCoins: user.auroCoins - GACHA_COST });

    try {
      const types: GachaRewardType[] = ['furniture', 'item', 'story', 'memory', 'situation'];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const result = await geminiService.generateGachaReward(character, selectedType);
      
      await new Promise(resolve => setTimeout(resolve, 3500)); // Longer spin for atmosphere

      setReward(result);

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
    } catch (err) {
      console.error("Gacha Error:", err);
      setError('Có lỗi xảy ra. Vui lòng thử lại!');
      onUpdateUser({ auroCoins: user.auroCoins });
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/30 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/30 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="absolute top-8 left-8 z-20">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
          <i className="fa-solid fa-chevron-left text-2xl"></i>
        </button>
      </div>

      <div className="absolute top-8 right-8 z-20 flex items-center gap-3 bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
        <img src="https://i.ibb.co/k6KC8zyN/media-1769361739.png" className="w-6 h-6" alt="Coin" />
        <span className="text-xl font-light tracking-widest">{user.auroCoins.toLocaleString()}</span>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-6xl font-thin tracking-tighter mb-16 text-white/90">Auro Portal</h1>

        {/* The Machine (SVG) */}
        <div className="relative w-64 h-80">
          <svg viewBox="0 0 200 250" className="w-full h-full drop-shadow-2xl">
            <defs>
              <radialGradient id="domeGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{stopColor: '#ffffff', stopOpacity: 0.3}} />
                <stop offset="100%" style={{stopColor: '#ffffff', stopOpacity: 0}} />
              </radialGradient>
              <linearGradient id="baseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: '#ef4444', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#b91c1c', stopOpacity: 1}} />
              </linearGradient>
            </defs>
            
            {/* Top Dome */}
            <path d="M30 100 A 70 70 0 1 1 170 100 L 170 120 L 30 120 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            <path d="M40 100 A 60 60 0 1 1 160 100 L 160 115 L 40 115 Z" fill="url(#domeGrad)" />
            
            {/* Base */}
            <rect x="30" y="120" width="140" height="100" rx="15" fill="url(#baseGrad)" stroke="#991b1b" strokeWidth="2" />
            
            {/* Dispenser Hole */}
            <rect x="70" y="170" width="60" height="40" rx="5" fill="#7f1d1d" />
            <rect x="75" y="175" width="50" height="30" rx="3" fill="#fef3c7" />
            
            {/* Handle Base */}
            <circle cx="100" cy="150" r="20" fill="#991b1b" stroke="#7f1d1d" strokeWidth="2" />
            
            {/* Handle (Rotating Part) */}
            <motion.g
              animate={isSpinning ? { rotate: 720 } : { rotate: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              style={{ originX: '100px', originY: '150px' }}
            >
              <rect x="90" y="145" width="20" height="10" rx="2" fill="#fef3c7" />
              <rect x="95" y="140" width="10" height="20" rx="2" fill="#fef3c7" />
            </motion.g>
          </svg>

          {/* Balls inside the dome */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-24 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={isSpinning ? { 
                  x: [0, Math.random() * 40 - 20, 0],
                  y: [0, Math.random() * 40 - 20, 0],
                  rotate: [0, 360]
                } : {}}
                transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
                className={`absolute w-6 h-6 rounded-full border-2 border-white/20 shadow-inner`}
                style={{
                  backgroundColor: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 5],
                  left: `${(i % 4) * 25 + 10}%`,
                  top: `${Math.floor(i / 4) * 25 + 10}%`,
                }}
              />
            ))}
          </div>

          {/* Result Ball Animation */}
          <AnimatePresence>
            {isSpinning && (
              <motion.div
                initial={{ scale: 0, y: 150, x: 100 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  y: [150, 195],
                  x: 100
                }}
                transition={{ delay: 2.5, duration: 0.5 }}
                className="absolute w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20"
                style={{ left: 'calc(50% - 20px)', top: '0' }}
              >
                <i className="fa-solid fa-star text-white text-xs animate-spin"></i>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spin Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className="mt-12 px-12 py-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="text-sm font-medium tracking-[0.2em] uppercase text-white/80">
            {isSpinning ? '...' : 'Vặn ngay'}
          </span>
        </button>

        <p className="mt-12 text-white/40 text-sm tracking-widest uppercase">Chi phí: 3,000 Auro Coin</p>
        {error && <p className="mt-4 text-rose-400 text-sm">{error}</p>}
      </div>

      {/* Reward Popup */}
      <AnimatePresence>
        {reward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 w-full max-w-sm text-center"
            >
              <div className="text-7xl mb-8">{reward.icon}</div>
              <h2 className="text-3xl font-light mb-4">{reward.name}</h2>
              <p className="text-white/60 mb-8 italic leading-relaxed">"{reward.description}"</p>
              <button
                onClick={() => setReward(null)}
                className="w-full py-4 rounded-full border border-white/20 hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
              >
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GachaView;
