import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InventoryItem } from '../types';

interface BlindBagGameProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBag: () => InventoryItem;
  currencySymbol: string;
}

const BlindBagGame: React.FC<BlindBagGameProps> = ({ isOpen, onClose, onOpenBag, currencySymbol }) => {
  const [step, setStep] = useState<'idle' | 'shaking' | 'tearing' | 'revealing' | 'result'>('idle');
  const [resultItem, setResultItem] = useState<InventoryItem | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep('idle');
      setResultItem(null);
      setShakeCount(0);
    }
  }, [isOpen]);

  const handleShake = () => {
    if (step !== 'idle' && step !== 'shaking') return;
    
    setStep('shaking');
    setShakeCount(prev => prev + 1);
    
    if (shakeCount >= 3) {
      handleTear();
    }
  };

  const handleTear = () => {
    setStep('tearing');
    // Simulate tearing process
    setTimeout(() => {
      const item = onOpenBag();
      setResultItem(item);
      setStep('revealing');
      
      setTimeout(() => {
        setStep('result');
      }, 1000);
    }, 800);
  };

  if (!isOpen) return null;

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return 'text-amber-500';
      case 'epic': return 'text-purple-500';
      case 'rare': return 'text-blue-500';
      default: return 'text-slate-500';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return 'from-amber-400 to-yellow-600';
      case 'epic': return 'from-purple-400 to-indigo-600';
      case 'rare': return 'from-blue-400 to-cyan-600';
      default: return 'from-slate-400 to-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md aspect-[3/4] flex flex-col items-center justify-center">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-50"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <AnimatePresence mode="wait">
          {(step === 'idle' || step === 'shaking' || step === 'tearing') && (
            <motion.div
              key="bag"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: step === 'shaking' ? [0, -10, 10, -10, 10, 0] : 0,
                rotate: step === 'shaking' ? [0, -5, 5, -5, 5, 0] : 0
              }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ 
                type: 'spring', 
                duration: step === 'shaking' ? 0.2 : 0.5 
              }}
              className="relative w-64 h-80 cursor-pointer group"
              onClick={handleShake}
            >
              {/* SVG Blind Bag */}
              <svg viewBox="0 0 200 250" className="w-full h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <defs>
                  <linearGradient id="bagGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff4e50" />
                    <stop offset="100%" stopColor="#f9d423" />
                  </linearGradient>
                  <clipPath id="tearClipTop">
                    <rect x="0" y="0" width="200" height={step === 'tearing' ? 50 : 250} />
                  </clipPath>
                  <clipPath id="tearClipBottom">
                    <rect x="0" y={step === 'tearing' ? 50 : 0} width="200" height="250" />
                  </clipPath>
                </defs>

                {/* Bag Body */}
                <motion.g
                  animate={step === 'tearing' ? { y: -50, rotate: -5, opacity: 0 } : {}}
                >
                   <path 
                    d="M30,20 L170,20 L180,230 L20,230 Z" 
                    fill="url(#bagGradient)" 
                    stroke="#fff" 
                    strokeWidth="4"
                  />
                  {/* Zigzag edges top */}
                  <path d="M30,20 L40,10 L50,20 L60,10 L70,20 L80,10 L90,20 L100,10 L110,20 L120,10 L130,20 L140,10 L150,20 L160,10 L170,20" fill="none" stroke="#fff" strokeWidth="4" />
                  {/* Zigzag edges bottom */}
                  <path d="M20,230 L30,240 L40,230 L50,240 L60,230 L70,240 L80,230 L90,240 L100,230 L110,240 L120,230 L130,240 L140,230 L150,240 L160,230 L170,240 L180,230" fill="none" stroke="#fff" strokeWidth="4" />
                  
                  {/* Logo/Text */}
                  <text x="100" y="100" textAnchor="middle" fill="#fff" className="text-2xl font-black italic uppercase tracking-tighter" style={{ fontSize: '24px' }}>AURO</text>
                  <text x="100" y="130" textAnchor="middle" fill="#fff" className="text-xl font-bold uppercase" style={{ fontSize: '18px' }}>BLIND BAG</text>
                  <circle cx="100" cy="170" r="30" fill="rgba(255,255,255,0.2)" />
                  <text x="100" y="180" textAnchor="middle" fill="#fff" className="text-3xl" style={{ fontSize: '30px' }}>?</text>
                </motion.g>

                {/* Tearing Effect Overlay */}
                {step === 'tearing' && (
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    d="M20,60 Q100,40 180,60" 
                    fill="none" 
                    stroke="#fff" 
                    strokeWidth="8" 
                    strokeDasharray="10 5"
                  />
                )}
              </svg>

              {/* Hint Text */}
              <div className="absolute -bottom-12 left-0 right-0 text-center">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest animate-pulse">
                  {step === 'idle' ? 'Chạm để lắc túi' : step === 'shaking' ? 'Lắc mạnh lên!' : 'Đang xé...'}
                </p>
              </div>
            </motion.div>
          )}

          {step === 'revealing' && (
            <motion.div
              key="reveal"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-bounce">
                ✨
              </div>
            </motion.div>
          )}

          {step === 'result' && resultItem && (
            <motion.div
              key="result"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
              {/* Light Rays Background */}
              <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
                <div className="w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute w-full h-full animate-[spin_10s_linear_infinite] opacity-20">
                   {[...Array(12)].map((_, i) => (
                     <div 
                      key={i} 
                      className="absolute top-1/2 left-1/2 w-[1000px] h-8 bg-gradient-to-r from-white to-transparent origin-left"
                      style={{ transform: `rotate(${i * 30}deg) translateY(-50%)` }}
                     ></div>
                   ))}
                </div>
              </div>

              {/* Item Card */}
              <div className="relative z-10 bg-white rounded-3xl p-8 shadow-2xl border-4 border-white/20 flex flex-col items-center gap-6 max-w-[280px]">
                <div className={`text-7xl p-6 rounded-2xl bg-gradient-to-br ${getRarityBg(resultItem.rarity || 'common')} shadow-xl`}>
                  {resultItem.icon}
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                    {resultItem.name}
                  </h3>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${getRarityColor(resultItem.rarity || 'common')}`}>
                    {resultItem.rarity || 'Common'} Item
                  </p>
                </div>

                <p className="text-slate-500 text-xs font-medium italic">
                  "{resultItem.description}"
                </p>

                <div className="w-full h-[1px] bg-slate-100"></div>

                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-black text-lg">{resultItem.value} {currencySymbol}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Giá trị ước tính</span>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                >
                  Tuyệt vời!
                </button>
              </div>

              {/* Confetti Effect (Simplified) */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0,
                      rotate: 0 
                    }}
                    animate={{ 
                      x: (Math.random() - 0.5) * 400, 
                      y: (Math.random() - 0.5) * 400, 
                      scale: [0, 1, 0],
                      rotate: 360 
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                    className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-sm ${['bg-yellow-400', 'bg-rose-400', 'bg-blue-400', 'bg-emerald-400'][Math.floor(Math.random() * 4)]}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default BlindBagGame;
