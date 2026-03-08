import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Character, AuroCardData, CardPrivacySettings } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { GeminiService } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

interface AuroCardViewProps {
  character: Character;
  onClose: () => void;
  onSave?: (config: any) => void;
  firebaseService: FirebaseService;
}

// --- TYPES ---
type CardType = 'template';

interface CardStyle {
    id: string;
    type: CardType;
    name: string;
    icon: string;
    templateId?: string; // Only for Templates
}

// 1. STYLES CONFIGURATION (TEMPLATES ONLY)
const CARD_STYLES: CardStyle[] = [
    // --- TEMPLATES (INSTANT - CSS BASED) ---
    {
        id: 'tpl_trading',
        type: 'template',
        name: 'Trading Card',
        icon: 'fa-bolt',
        templateId: 'trading'
    },
    {
        id: 'tpl_polaroid',
        type: 'template',
        name: 'Polaroid',
        icon: 'fa-image',
        templateId: 'polaroid'
    },
    {
        id: 'tpl_ssr',
        type: 'template',
        name: 'SSR Game',
        icon: 'fa-dragon',
        templateId: 'ssr'
    },
    {
        id: 'tpl_ticket',
        type: 'template',
        name: 'Event Ticket',
        icon: 'fa-ticket',
        templateId: 'ticket'
    }
];

// 2. TEXT COLORS
const TEXT_COLORS = [
    { id: 'white', bg: 'bg-white', text: 'text-white', label: 'Trắng' },
    { id: 'black', bg: 'bg-slate-900', text: 'text-slate-900', label: 'Đen' },
    { id: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-600', label: 'Indigo' },
    { id: 'rose', bg: 'bg-rose-500', text: 'text-rose-500', label: 'Rose' },
    { id: 'amber', bg: 'bg-amber-400', text: 'text-amber-500', label: 'Gold' },
];

const AuroCardView: React.FC<AuroCardViewProps> = ({ character, onClose, onSave, firebaseService }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  
  // Design State
  const [selectedStyleId, setSelectedStyleId] = useState('tpl_ticket');
  const [colorId, setColorId] = useState('white');
  
  // Designer Config
  const [config, setConfig] = useState(character.cardConfig || {
    privacy: { backstory: false, personality: false, greeting: false, appearance: false, npcRelations: false },
    rules: '',
    prefix: '',
    includedFields: ['backstory', 'personality', 'greeting', 'appearance', 'npcRelations'] as (keyof CardPrivacySettings)[]
  });

  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  
  // State
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef<GeminiService | null>(null);
  if (!geminiRef.current) geminiRef.current = new GeminiService();

  // Safe Base64 for UTF-8
  const toBase64 = (str: string) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      console.error("Base64 encoding failed", e);
      return "ERROR_ENCODING";
    }
  };

  useEffect(() => {
    // Sync personality privacy with backstory privacy to avoid inconsistencies
    if (config.privacy.personality !== config.privacy.backstory) {
      setConfig(prev => ({
        ...prev,
        privacy: { ...prev.privacy, personality: prev.privacy.backstory }
      }));
    }
  }, [config.privacy.backstory]);

  useEffect(() => {
    const exportData: any = {};
    if (config.includedFields.includes('backstory')) {
        exportData.backstory = config.privacy.backstory ? 'LOCKED' : character.description;
    }
    if (config.includedFields.includes('personality')) {
        exportData.personality = config.privacy.personality ? 'LOCKED' : (character.behavior ? JSON.stringify(character.behavior) : '');
    }
    if (config.includedFields.includes('greeting')) {
        exportData.greeting = config.privacy.greeting ? 'LOCKED' : character.openingMessage;
    }
    if (config.includedFields.includes('appearance')) {
        exportData.appearance = config.privacy.appearance ? 'LOCKED' : character.appearance;
    }
    if (config.includedFields.includes('npcRelations')) {
        exportData.npcRelations = config.privacy.npcRelations ? 'LOCKED' : (character.relations ? JSON.stringify(character.relations) : '');
    }

    const dataToExport = {
      name: character.name,
      config: config,
      data: exportData
    };
    setGeneratedCode(toBase64(JSON.stringify(dataToExport)));
  }, [config, character]);

  const toggleField = (field: keyof CardPrivacySettings) => {
    setConfig(prev => ({
      ...prev,
      includedFields: prev.includedFields.includes(field)
        ? prev.includedFields.filter(f => f !== field)
        : [...prev.includedFields, field]
    }));
  };

  const togglePrivacy = (field: keyof CardPrivacySettings) => {
    setConfig(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [field]: !prev.privacy[field] }
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fieldLabels: Record<keyof CardPrivacySettings, string> = {
    backstory: 'Cốt truyện & Tính cách',
    personality: 'Tính cách', // Hidden in UI but kept for logic
    greeting: 'Lời mở đầu',
    appearance: 'Ngoại hình',
    npcRelations: 'Mối quan hệ NPC'
  };

  useEffect(() => {
    const initCard = async () => {
        try {
            const result = await firebaseService.publishCharacterCard(character, config);
            setToken(result.token);
            setIsOnline(result.isOnline);
        } catch (e) {
            console.error(e);
            alert("Lỗi tạo thẻ bài. Vui lòng thử lại.");
            onClose();
        } finally {
            setIsLoadingToken(false);
        }
    };
    initCard();
  }, []);

  const currentStyle = CARD_STYLES.find(s => s.id === selectedStyleId) || CARD_STYLES[0];
  const currentColor = TEXT_COLORS.find(c => c.id === colorId) || TEXT_COLORS[0];

  const handleDownload = async () => {
      if (!cardRef.current || isCapturing) return;
      setIsCapturing(true);
      try {
          const html2canvas = (window as any).html2canvas;
          if (!html2canvas) { alert("Lỗi thư viện."); return; }

          const canvas = await html2canvas(cardRef.current, {
              scale: 4, 
              useCORS: true, 
              allowTaint: true, 
              backgroundColor: null,
              logging: false
          });

          const link = document.createElement('a');
          link.download = `AuroCard_${character.name.replace(/\s+/g,'_')}_${selectedStyleId}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
      } catch (e) {
          console.error(e);
          alert("Lỗi khi lưu ảnh.");
      } finally {
          setIsCapturing(false);
      }
  };

  // --- BRAND LOGO (Gradient & Glass) ---
  // Removed watermark as requested

  // --- RENDER: TEMPLATE - TRADING CARD (Modern, Neon) ---
  const renderTemplateTrading = () => (
      <div className="w-full h-full relative bg-slate-900 overflow-hidden flex flex-col">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
              <img src={character.avatar} className="w-full h-full object-cover" crossOrigin="anonymous" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/30"></div>
          </div>
          
          {/* Top Bar */}
          <div className="relative z-10 p-4 flex justify-between items-start">
              <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest border border-white/20 shadow-lg">
                  COLLECTABLE
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-black/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                  <span className="text-amber-400 font-black text-xs">Lv.{Math.floor(character.relationshipScore/100)+1}</span>
              </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-auto relative z-10 p-5 pb-6">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg mb-1 leading-none">{character.name}</h2>
              <div className="h-1 w-16 bg-indigo-500 mb-2 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
              
              <div className="flex items-end gap-3">
                  <div className="flex-1 bg-black/40 backdrop-blur-md p-3 rounded-xl border-l-2 border-indigo-500">
                      <div className="relative mb-1 flex items-center gap-2">
                          <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest">
                              {character.status}
                          </p>
                          {character.youtubeLink && (
                              <i className="fa-brands fa-youtube text-rose-500 text-[10px]" title="Có nhạc nền"></i>
                          )}
                      </div>
                      <div className="relative">
                          <p className={`text-[10px] text-white/90 line-clamp-2 italic ${config.privacy.backstory ? 'blur-[8px] select-none opacity-40' : ''}`}>
                              "{character.description.substring(0,100)}..."
                          </p>
                          {config.privacy.backstory && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-lg border border-white/10 shadow-2xl">
                                  <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-500/50 flex items-center gap-2 shadow-xl transform scale-105">
                                      <i className="fa-solid fa-lock text-rose-500 animate-pulse"></i>
                                      <span className="text-rose-100">BẢO MẬT</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="bg-white p-1 rounded-lg shrink-0 shadow-lg flex items-center justify-center">
                      {token ? (
                        <QRCodeSVG 
                          value={token} 
                          size={56} 
                          level="H" 
                          includeMargin={false}
                          fgColor="#2f2f4f"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-slate-200 animate-pulse"></div>
                      )}
                  </div>
              </div>
          </div>
          
          {/* Border Overlay */}
          <div className="absolute inset-0 border-[6px] border-slate-800/30 z-20 pointer-events-none rounded-[2rem]"></div>
      </div>
  );

  // --- RENDER: TEMPLATE - POLAROID (Vintage, Sticker) ---
  const renderTemplatePolaroid = () => (
      <div className="w-full h-full bg-[#f0f0f0] relative flex flex-col p-6 shadow-[inset_0_0_60px_rgba(0,0,0,0.05)] justify-center items-center">
          
          {/* Photo Area */}
          <div className="bg-white p-3 pb-14 shadow-2xl rotate-[-2deg] relative z-10 border border-slate-200 w-full max-w-[340px] flex flex-col">
              <div className="w-full aspect-square bg-slate-100 overflow-hidden relative border border-slate-100 mb-4 grayscale-[10%] contrast-110">
                  <img src={character.avatar} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] pointer-events-none"></div>
              </div>
              
              {/* Handwritten Text Area */}
              <div className="text-center px-2">
                  <h2 className={`text-3xl font-black text-slate-800 uppercase tracking-tighter ${currentColor.text} whitespace-pre-wrap`}>{character.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{token || 'TOKEN'}</p>
                      {character.youtubeLink && <i className="fa-brands fa-youtube text-rose-500 text-[10px]" title="Có nhạc nền"></i>}
                  </div>
              </div>
          </div>

          {/* Bottom Sticker/QR */}
          <div className="absolute bottom-8 right-8 z-30 bg-white p-1.5 rounded-lg shadow-xl rotate-[5deg] border border-slate-100 flex items-center justify-center">
               {token ? (
                 <QRCodeSVG 
                    value={token} 
                    size={56} 
                    level="H" 
                    includeMargin={false}
                    fgColor="#2f2f4f"
                 />
               ) : (
                 <div className="w-14 h-14 bg-slate-200 animate-pulse"></div>
               )}
          </div>
      </div>
  );

  // --- RENDER: TEMPLATE - SSR GAME (Fantasy, Glow) ---
  const renderTemplateSSR = () => (
      <div className="w-full h-full relative bg-black overflow-hidden flex flex-col">
          <img src={character.avatar} className="absolute inset-0 w-full h-full object-cover opacity-90" crossOrigin="anonymous" />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-transparent to-indigo-900/40 mix-blend-hard-light"></div>
          
          {/* Particles (Static CSS) */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40"></div>

          {/* SSR Badge */}
          <div className="absolute top-6 left-6 z-20">
              <div className="text-5xl font-black text-amber-400 italic pr-2">
                  SSR
              </div>
          </div>

          {/* Content */}
          <div className="mt-auto relative z-20 p-6">
              <div className="flex items-end justify-between mb-3">
                  <div>
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter whitespace-pre-wrap">
                          {character.name}
                      </h2>
                  </div>
              </div>

              {/* Stats / Token Box */}
              <div className="bg-black/70 backdrop-blur-md border border-amber-500/30 p-3 rounded-xl flex flex-col gap-3 shadow-2xl">
                  <div className="flex items-center gap-3">
                      <div className="bg-white p-1 rounded shadow-inner shrink-0 flex items-center justify-center">
                          {token ? (
                            <QRCodeSVG 
                              value={token} 
                              size={48} 
                              level="H" 
                              includeMargin={false}
                              fgColor="#2f2f4f"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-200 animate-pulse"></div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-amber-300 uppercase tracking-widest mb-1">Summon Token</p>
                          <div className="bg-white/10 px-2 py-1.5 rounded-lg border border-white/10 flex items-center justify-between">
                              <p className="text-[10px] font-mono text-white truncate tracking-wider">{token}</p>
                              <button onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(token || '');
                                  alert("Đã copy mã triệu hồi!");
                              }} className="text-white/40 hover:text-white ml-2">
                                  <i className="fa-solid fa-copy text-[8px]"></i>
                              </button>
                          </div>
                      </div>
                  </div>
                  
                  {/* Blurred Description for SSR */}
                  <div className="relative border-t border-white/5 pt-2">
                      <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-bold uppercase rounded border border-indigo-400">
                              {character.status}
                          </span>
                          {character.youtubeLink && (
                              <span className="px-2 py-0.5 bg-rose-600 text-white text-[8px] font-bold uppercase rounded border border-rose-400 flex items-center gap-1">
                                  <i className="fa-brands fa-youtube"></i> OST
                              </span>
                          )}
                      </div>
                      <p className={`text-[9px] text-white/60 line-clamp-2 leading-relaxed ${config.privacy.backstory ? 'blur-[8px] select-none opacity-40' : ''}`}>
                          {character.description}
                      </p>
                      {config.privacy.backstory && (
                          <div className="absolute inset-0 flex items-center justify-center pt-2 bg-slate-900 rounded-lg border border-white/10 shadow-2xl">
                              <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-500/50 flex items-center gap-2 shadow-xl transform scale-105">
                                  <i className="fa-solid fa-lock text-amber-500"></i>
                                  <span className="text-amber-100">BẢO MẬT</span>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );

  // --- RENDER: TEMPLATE - TICKET (Event Ticket) ---
  const renderTemplateTicket = () => (
      <div className="w-full h-full relative bg-white overflow-hidden flex flex-col border-[12px] border-black">
          {/* Top Section: Event Info */}
          <div className="bg-black text-white p-4 flex justify-between items-center shrink-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em]">ADMIT ONE</div>
              <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-white/30"></div>
                  ))}
              </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 relative flex flex-col p-6">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

              <div className="flex gap-4 mb-4 relative z-10">
                  <div className="w-24 h-24 bg-black shrink-0 overflow-hidden border-2 border-black shadow-lg rotate-[-3deg]">
                      <img src={character.avatar} className="w-full h-full object-cover grayscale contrast-125" crossOrigin="anonymous" />
                  </div>
                  <div className="flex-1 min-w-0 pt-2">
                      <h2 className="text-xl font-black text-black uppercase tracking-tighter leading-none mb-1 line-clamp-2">{character.name}</h2>
                      <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest border-b-2 border-black/10 pb-2 mb-2">
                          {character.status || 'SPECIAL GUEST'}
                      </p>
                      <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-black text-white text-[8px] font-bold uppercase tracking-wider">VIP</span>
                          {character.youtubeLink && <span className="px-2 py-0.5 bg-rose-600 text-white text-[8px] font-bold uppercase tracking-wider"><i className="fa-brands fa-youtube"></i></span>}
                          <span className="px-2 py-0.5 border border-black text-black text-[8px] font-bold uppercase tracking-wider">NO.{token?.substring(0,6) || '000000'}</span>
                      </div>
                  </div>
              </div>

              {/* Description */}
              <div className="relative z-10 mb-auto">
                  <p className={`text-[10px] font-mono text-black/70 leading-relaxed text-justify line-clamp-6 ${config.privacy.backstory ? 'blur-[4px] select-none opacity-40' : ''}`}>
                      {character.openingMessage || character.description}
                  </p>
                  {config.privacy.backstory && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <i className="fa-solid fa-lock text-black/20 text-2xl"></i>
                      </div>
                  )}
              </div>

              {/* Bottom Barcode Section */}
              <div className="mt-4 pt-4 border-t-2 border-dashed border-black/20 flex justify-between items-end relative z-10">
                  <div className="flex flex-col gap-1">
                      <div className="text-[8px] font-black uppercase tracking-widest text-black/40">SCAN FOR ENTRY</div>
                      <div className="h-8 w-32 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAYAAAD5PA/NAAAAFklEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')] bg-repeat-x opacity-80"></div>
                  </div>
                  <div className="bg-white p-1 border-2 border-black">
                      {token ? (
                        <QRCodeSVG 
                          value={token} 
                          size={48} 
                          level="M" 
                          includeMargin={false}
                          fgColor="#000000"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 animate-pulse"></div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl overflow-y-auto overflow-x-hidden custom-scrollbar">
       
       <div className="min-h-full flex flex-col items-center p-4 py-6 relative z-10">
           
           <div className="text-center text-white/80 animate-in slide-in-from-top-4 mb-4 shrink-0">
               <h2 className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Thẻ Triệu Hồi</h2>
               <div className="flex items-center justify-center gap-2 mt-1">
                   <p className="text-[10px] opacity-70">Studio thiết kế thẻ bài (1:1)</p>
                   {!isLoadingToken && (
                       <div className="flex flex-col items-center">
                           <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isOnline ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}>
                               {isOnline ? 'ONLINE' : 'OFFLINE'}
                           </span>
                           {!isOnline && (
                               <p className="text-[8px] text-rose-400 mt-1 max-w-[200px] leading-tight bg-black/40 px-2 py-1 rounded">
                                   *Mã này chỉ hiển thị, chưa được lưu lên thư viện.
                               </p>
                           )}
                       </div>
                   )}
               </div>
           </div>

           {/* --- MAIN CARD WRAPPER (SQUARE 1:1) --- */}
           <div className="relative shrink-0 my-2 transition-transform duration-300 scale-[0.85] xs:scale-[0.9] sm:scale-100 origin-top">
               <div className="relative shadow-[0_20px_60px_rgba(0,0,0,0.5)] group rounded-[2rem]">
                   {/* FIXED SIZE 420x420 for 1:1 Ratio */}
                   <div ref={cardRef} className="relative w-[420px] h-[420px] overflow-hidden bg-white select-none rounded-[2rem] shadow-2xl">
                       
                       {/* RENDER CONTENT BASED ON TYPE */}
                       {currentStyle.templateId === 'trading' && renderTemplateTrading()}
                       {currentStyle.templateId === 'polaroid' && renderTemplatePolaroid()}
                       {currentStyle.templateId === 'ssr' && renderTemplateSSR()}
                       {currentStyle.templateId === 'ticket' && renderTemplateTicket()}

                       {/* BRAND LOGO (Always visible unless Polaroid covers it severely, though polaroid has space) */}
                       {/* Removed watermark as requested */}
                   </div>
                   
                   {/* Loader */}
                   {isLoadingToken && (
                       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-[2rem]">
                           <div className="flex flex-col items-center p-6 text-center">
                               <div className="w-14 h-14 relative mb-4">
                                   <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-ping opacity-20"></div>
                                   <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin"></div>
                               </div>
                               <h3 className="text-white font-black uppercase text-xs tracking-widest mb-1">
                                   Đang khởi tạo...
                               </h3>
                           </div>
                       </div>
                   )}
               </div>
           </div>

           {/* --- DESIGN CONTROLS SECTION --- */}
           <div className="w-full max-w-[420px] mb-6 relative z-20 space-y-6 bg-slate-800/50 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
               
               {/* 1. STYLE SELECTOR */}
               <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-4 block ml-1"><i className="fa-solid fa-layer-group mr-2 text-indigo-400"></i> 1. Chọn Mẫu Thẻ</label>
                   <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                       {CARD_STYLES.map(s => (
                           <button 
                               key={s.id}
                               onClick={() => setSelectedStyleId(s.id)}
                               className={`flex flex-col items-center gap-2 min-w-[85px] p-4 rounded-2xl border transition-all group ${selectedStyleId === s.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-105' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'}`}
                           >
                               <div className="text-xl relative">
                                   <i className={`fa-solid ${s.icon}`}></i>
                               </div>
                               <span className="text-[9px] font-bold uppercase text-center leading-tight tracking-wider">{s.name}</span>
                            </button>
                       ))}
                   </div>
               </div>

               {/* 2. PRIVACY & FIELDS */}
               <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-4 block ml-1"><i className="fa-solid fa-shield-halved mr-2 text-emerald-400"></i> 2. Cấu hình Dữ liệu</label>
                   <div className="grid grid-cols-1 gap-3">
                       {(['backstory', 'greeting', 'appearance', 'npcRelations'] as (keyof CardPrivacySettings)[]).map(field => (
                           <div key={field} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${config.includedFields.includes(field) ? 'bg-white/5 border-white/10' : 'bg-black/20 border-transparent opacity-40'}`}>
                               <div className="flex items-center gap-3">
                                   <input 
                                       type="checkbox" 
                                       id={`field-${field}`}
                                       checked={config.includedFields.includes(field)} 
                                       onChange={() => {
                                           toggleField(field);
                                           if (field === 'backstory') toggleField('personality');
                                       }}
                                       className="w-5 h-5 rounded-lg border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                   />
                                   <label htmlFor={`field-${field}`} className="text-[11px] font-black uppercase tracking-wider cursor-pointer text-white/80">{fieldLabels[field]}</label>
                               </div>
                               {field === 'backstory' && (
                                   <button 
                                       onClick={() => {
                                           togglePrivacy(field);
                                           if (field === 'backstory') togglePrivacy('personality');
                                       }} 
                                       className={`h-8 px-3 rounded-xl flex items-center gap-2 transition-all font-black text-[9px] uppercase tracking-widest ${config.privacy[field] ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                                   >
                                       <i className={`fa-solid ${config.privacy[field] ? 'fa-lock' : 'fa-lock-open'}`}></i>
                                       {config.privacy[field] ? 'Đã khóa' : 'Công khai'}
                                   </button>
                               )}
                           </div>
                       ))}
                   </div>
               </div>

               {/* 3. RULES & PREFIX */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                       <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Luật đi kèm</label>
                       <input 
                           type="text" 
                           placeholder="Ví dụ: Không được yêu..." 
                           value={config.rules} 
                           onChange={e => setConfig({...config, rules: e.target.value})} 
                           className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[11px] font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-white/20" 
                       />
                   </div>
                   <div className="space-y-2">
                       <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Tiền tố (Prefix)</label>
                       <input 
                           type="text" 
                           placeholder="Ví dụ: [Auro]..." 
                           value={config.prefix} 
                           onChange={e => setConfig({...config, prefix: e.target.value})} 
                           className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[11px] font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-white/20" 
                       />
                   </div>
               </div>

               {/* 4. SHARE CODE */}
               <div className="space-y-3 pt-2">
                   <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Mã triệu hồi (Summon Token)</label>
                   <div className="relative group">
                       <div className="w-full bg-black/80 border border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 shadow-inner">
                           <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">Mã của bạn</span>
                           <div className="text-3xl font-mono tracking-[0.3em] text-emerald-400 font-black drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                               {token || '---'}
                           </div>
                       </div>
                       <button 
                           onClick={() => {
                               if (!token) return;
                               navigator.clipboard.writeText(token);
                               setCopied(true);
                               setTimeout(() => setCopied(false), 2000);
                           }}
                           className={`absolute top-4 right-4 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}
                       >
                           {copied ? <><i className="fa-solid fa-check mr-2"></i> Copied</> : <><i className="fa-solid fa-copy mr-2"></i> Copy</>}
                       </button>
                   </div>
                   <p className="text-[9px] text-white/30 italic text-center mt-2">Dùng mã ngắn này để triệu hồi nhân vật nhanh chóng.</p>
               </div>

               {/* 5. COLORS (POLAROID ONLY) */}
               {selectedStyleId === 'tpl_polaroid' && (
                   <div className="pt-2">
                       <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3 block ml-1"><i className="fa-solid fa-palette mr-2 text-amber-400"></i> Màu Chữ (Polaroid)</label>
                       <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-1 px-1">
                           {TEXT_COLORS.map(c => (
                               <button 
                                   key={c.id}
                                   onClick={() => setColorId(c.id)}
                                   className={`w-10 h-10 rounded-full border-2 transition-all shadow-lg ${c.bg} ${colorId === c.id ? 'border-white scale-110 ring-4 ring-white/20' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                                   title={c.label}
                               ></button>
                           ))}
                       </div>
                   </div>
               )}

           </div>

           {/* --- ACTION BUTTONS --- */}
           <div className="w-full max-w-[420px] relative z-20 mb-10">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <button 
                        onClick={async () => {
                            setIsSavingConfig(true);
                            try {
                                // Re-publish with current config to update cloud version
                                const result = await firebaseService.publishCharacterCard(character, config, token || undefined);
                                if (result.token) setToken(result.token);
                                
                                onSave?.({ ...config, token: result.token });
                                alert("Đã lưu cấu hình & cập nhật thẻ bài!");
                            } catch (e) {
                                console.error(e);
                                alert("Lỗi khi lưu cấu hình.");
                            } finally {
                                setIsSavingConfig(false);
                            }
                        }} 
                        disabled={isSavingConfig}
                        className="py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSavingConfig ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-floppy-disk mr-2"></i>}
                        Lưu Cấu Hình
                    </button>
                    <button onClick={onClose} className="py-3 bg-white/5 text-white border border-white/10 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all active:scale-95">
                        Đóng
                    </button>
                </div>
               <button 
                   onClick={handleDownload} 
                   disabled={isLoadingToken || isCapturing}
                   className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 border border-white/10 active:scale-95"
               >
                   {isCapturing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                   TẢI ẢNH THẺ
               </button>
           </div>
           
       </div>
    </div>
  );
};

export default AuroCardView;
