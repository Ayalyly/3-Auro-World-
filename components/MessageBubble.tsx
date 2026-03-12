
import React, { useState } from 'react';
import { Message, Sender, Character, ThemeConfig } from '../types';
import Markdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
  character: Character;
  userAvatar: string;
  userName?: string; // Add userName prop
  theme: ThemeConfig;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onRegenerate?: (messageId: string) => void;
  onVersionChange?: (messageId: string, direction: 'prev' | 'next') => void;
  onFork?: (messageId: string) => void;
  onSaveMemory?: (message: Message) => void;
  onToggleCover?: (id: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, character, userAvatar, userName = 'Bạn', theme, onDelete, onEdit, onRegenerate, onVersionChange, onFork, onSaveMemory, onToggleCover }) => {
  const isAi = message.sender === Sender.AI;
  const isSystem = message.sender === Sender.SYSTEM;
  const isUser = message.sender === Sender.USER;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Replace placeholders
  const displayText = (message.text || '')
    .replace(/{{user}}/g, userName)
    .replace(/{{char}}/g, character.name);

  // --- THINKING STATE ---
  if (message.isThinking) {
      return (
          <div className="flex w-full mb-3 justify-start animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex w-full pr-4 items-end gap-2 flex-row">
                  <span className="text-[10px] text-slate-400 ml-1 mb-1 font-bold absolute -top-5 left-12">{character.name}</span>
                  <div className="flex flex-col items-start">
                       <div className="px-5 py-4 bg-white/60 backdrop-blur-sm rounded-[20px_20px_20px_4px] border border-white/50 shadow-sm flex items-center gap-1.5 min-w-[60px] justify-center">
                           <div className="typing-dot"></div>
                           <div className="typing-dot"></div>
                           <div className="typing-dot"></div>
                       </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- BILL / TRANSFER RENDERING LOGIC ---
  const isTransferCommand = /\[(?:CHUYỂN_KHOẢN|TRANSFER):/i.test(displayText);
  const transferMatch = displayText.match(/\[(?:CHUYỂN_KHOẢN|TRANSFER):\s*([\d,.\s]+)/i);

  // FIX: Separate rendering logic. Don't return early if text exists alongside Bill.
  const renderBill = () => {
      if (!transferMatch) return null;
      
      const amountStr = transferMatch[1];
      const displayAmount = amountStr.trim();
      const currencyMatch = displayText.match(/(?:Xu|VND|Gold|Coin|\$|Linh Thạch|Tệ|Yên)/i);
      const currency = currencyMatch ? currencyMatch[0] : (character.world?.currency || 'Xu');
      const isIncoming = (isSystem && message.text.includes(character.name)) || message.sender === Sender.AI;

      return (
          <div className={`flex w-full mb-4 px-0 justify-center animate-pop`}>
              <div className={`relative overflow-hidden rounded-[2rem] p-0 shadow-lg border w-64 ${isIncoming ? 'bg-white border-emerald-100' : 'bg-white border-blue-100'}`}>
                  {/* Header Strip */}
                  <div className={`h-2 w-full bg-gradient-to-r ${isIncoming ? 'from-emerald-400 to-teal-500' : 'from-blue-500 to-indigo-600'}`}></div>
                  
                  <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${isIncoming ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                              <i className={`fa-solid ${isIncoming ? 'fa-arrow-down' : 'fa-paper-plane'} text-lg`}></i>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isIncoming ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {isIncoming ? 'BILL NHẬN' : 'BILL CHUYỂN'}
                          </span>
                      </div>

                      <div className="text-center mb-5">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Số tiền giao dịch</p>
                          <h3 className={`text-3xl font-black tracking-tighter ${isIncoming ? 'text-emerald-500' : 'text-slate-800'}`}>
                              {isIncoming ? '+' : '-'}{displayAmount}
                          </h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase">{currency}</p>
                      </div>

                      <div className="border-t border-slate-50 pt-4 space-y-2">
                          <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Người gửi</span>
                              <span className="font-bold text-slate-700">{isIncoming ? character.name : 'Bạn (User)'}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Người nhận</span>
                              <span className="font-bold text-slate-700">{isIncoming ? 'Bạn (User)' : character.name}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Thời gian</span>
                              <span className="font-bold text-slate-700">{new Date(message.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                      </div>
                  </div>
                  
                  {/* Footer Decoration */}
                  <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                      <p className="text-[8px] text-slate-300 font-mono uppercase tracking-[0.2em]">Transaction ID: {message.id.slice(-6)}</p>
                  </div>
              </div>
          </div>
      );
  };

  if (isSystem) {
    return (
      <div className="flex flex-col justify-center my-6 px-4">
        {/* Render Bill if System triggers it (e.g. transfer command from User) */}
        {transferMatch && renderBill()}
        
        {/* Clean text excluding the command for system message display */}
        {displayText.replace(/\[(?:CHUYỂN_KHOẢN|TRANSFER):.*?\]/i, '').trim() && (
            <div className="bg-slate-50/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-100 shadow-sm animate-in zoom-in duration-300 mx-auto">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                    <i className="fa-solid fa-sparkles text-amber-400"></i> 
                    {displayText.replace(/\[(?:CHUYỂN_KHOẢN|TRANSFER):.*?\]/i, '').trim()}
                </span>
            </div>
        )}
      </div>
    );
  }

  // Safe rendering function
  const renderContent = (text: string) => {
    if (!text) return null;
    
    // Strip Transfer Command for Text Rendering (Bill is rendered separately above/below)
    const textWithoutTransfer = displayText.replace(/\[(?:CHUYỂN_KHOẢN|TRANSFER):.*?\]/gi, '').trim();
    // Strip System tags
    const textWithoutSystem = textWithoutTransfer.replace(/<system>[\s\S]*?<\/system>/gi, '').trim();

    // Check gift syntax
    const giftMatch = textWithoutSystem.match(/\[TẶNG:\s*(.*?)\s+(.*?)\]/);
    if (giftMatch) {
       const icon = giftMatch[1];
       const name = giftMatch[2];
       const remainingText = textWithoutSystem.replace(/\[TẶNG:.*?\]/g, '').trim();
       
       return (
         <div className="flex flex-col gap-2">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 backdrop-blur p-3 rounded-xl border border-rose-100 flex items-center gap-3 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-12 h-12 bg-rose-400/10 rounded-bl-full -mr-4 -mt-4"></div>
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-inner">{icon}</div>
               <div className="flex-1 z-10">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Đã tặng món quà</p>
                  <p className="text-[11px] font-bold text-slate-800">{name}</p>
               </div>
            </div>
            {remainingText && (
              <div 
                className="markdown-body leading-relaxed mt-1"
                style={{ fontSize: theme.fontSize ? `${theme.fontSize - 1}px` : '13px' }}
              >
                <Markdown>{remainingText}</Markdown>
              </div>
            )}
         </div>
       );
    }
    
    // Check usage syntax
    const useMatch = textWithoutSystem.match(/\[SỬ_DỤNG:\s*(.*?)\s+(.*?)\]/);
    if (useMatch) {
       const icon = useMatch[1];
       const name = useMatch[2];
       const remainingText = textWithoutSystem.replace(/\[SỬ_DỤNG:.*?\]/g, '').trim();
       
       return (
         <div className="flex flex-col gap-2">
            <div className="bg-slate-50 backdrop-blur p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm relative overflow-hidden opacity-90">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-inner grayscale-[30%]">{icon}</div>
               <div className="flex-1 z-10">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sử dụng / Khoe</p>
                  <p className="text-[11px] font-bold text-slate-700">{name}</p>
               </div>
            </div>
            {remainingText && (
              <div 
                className="markdown-body leading-relaxed mt-1"
                style={{ fontSize: theme.fontSize ? `${theme.fontSize - 1}px` : '13px' }}
              >
                <Markdown>{remainingText}</Markdown>
              </div>
            )}
         </div>
       );
    }

    if (!textWithoutSystem) return null;

    return (
      <div 
        className="markdown-body leading-relaxed"
        style={{ fontSize: theme.fontSize ? `${theme.fontSize}px` : '14px' }}
      >
        <Markdown>{textWithoutSystem}</Markdown>
        {message.isEdited && <span className="text-[9px] text-slate-400/80 italic ml-1 select-none">(đã chỉnh sửa)</span>}
      </div>
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayText);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    } else {
        const utterance = new SpeechSynthesisUtterance(displayText);
        utterance.lang = 'vi-VN'; // Set language to Vietnamese
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }
  };

  const hasVersions = message.versions && message.versions.length > 1;
  const currentVer = (message.currentVersionIndex || 0) + 1;
  const totalVer = message.versions?.length || 1;

  // Determine if we should show the bubble container (if there is text content or an image)
  // Even if text is stripped (for bill), we might still want the bubble for image
  const shouldShowBubble = message.image || displayText.replace(/\[(?:CHUYỂN_KHOẢN|TRANSFER):.*?\]/gi, '').trim().length > 0;

  return (
    <div 
      className={`flex w-full mb-3 group transition-all ${isAi ? 'justify-start' : 'justify-end'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered(!isHovered)} // Toggle on click for mobile
    >
      <div className={`flex ${isAi ? 'w-full pr-4' : 'max-w-[85%]'} items-end gap-2 relative ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {!isAi && (
            <div className="shrink-0 mb-1">
                <img src={userAvatar} className="w-9 h-9 rounded-full object-cover border border-white shadow-sm" alt="avatar" />
            </div>
        )}
        
        <div className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} w-full relative`}>
          {isAi && <span className="text-[10px] text-slate-400 ml-1 mb-1 font-bold">{character.name}</span>}

          {/* RENDER BILL SEPARATELY OUTSIDE THE BUBBLE (OR INSIDE IF YOU PREFER, BUT OUTSIDE IS CLEANER FOR HUGE CARD) */}
          {/* ACTUALLY, USER WANTS THE BUBBLE TO NOT BE SWALLOWED. LET'S RENDER BILL FIRST, THEN BUBBLE IF TEXT EXISTS */}
          {transferMatch && renderBill()}

          {/* Only render bubble if there is something else to show */}
          {shouldShowBubble && (
              <div 
                className={`px-5 py-3.5 relative transition-all w-full shadow-sm ${
                  theme.chatLayoutStyle === 'immersive-short'
                    ? (isAi ? 'bg-white/40 backdrop-blur-md rounded-[20px_20px_20px_4px] border border-white/30 text-slate-900' : 'bg-black/40 backdrop-blur-md rounded-[20px_20px_4px_20px] border border-white/20 text-white')
                    : theme.chatLayoutStyle === 'immersive'
                      ? (isAi ? 'bg-white/90 backdrop-blur-md rounded-[20px_20px_20px_4px] border border-white/50 text-slate-800' : 'bg-black/80 backdrop-blur-md rounded-[20px_20px_4px_20px] border border-white/20 text-white')
                      : (isAi ? 'chat-bubble-ai' : 'chat-bubble-user')
                }`}
                style={{ 
                  fontFamily: theme.fontFamily || 'inherit',
                  fontSize: theme.fontSize ? `${theme.fontSize}px` : 'inherit',
                  color: (theme.chatLayoutStyle === 'immersive' || theme.chatLayoutStyle === 'immersive-short') ? undefined : (isAi ? (theme.textColor || '#334155') : 'inherit')
                }}
              >
                {/* Single Image (Legacy) */}
                {message.image && !message.images && message.image !== "GENERATING" && (
                  <div className="relative group/img mb-2">
                    <img 
                      src={message.image} 
                      className={`rounded-lg max-w-full h-auto border border-white/20 transition-all duration-500 ${message.isCovered ? 'blur-2xl scale-95 opacity-50' : ''}`} 
                      alt="attachment" 
                    />
                    {message.isCovered && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                          <i className="fa-solid fa-eye-slash text-white text-xs"></i>
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Đã che bảo mật</span>
                        </div>
                      </div>
                    )}
                    {isUser && onToggleCover && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleCover(message.id); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg border border-white/20 hover:bg-black/70 active:scale-90"
                        title={message.isCovered ? "Hiện hình ảnh" : "Che bảo mật"}
                      >
                        <i className={`fa-solid ${message.isCovered ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                      </button>
                    )}
                  </div>
                )}

                {/* Multiple Images */}
                {message.images && message.images.length > 0 && (
                  <div className="relative group/img mb-2">
                    <div className={`grid gap-1 ${
                      message.images.length === 1 ? 'grid-cols-1' : 
                      message.images.length === 2 ? 'grid-cols-2' : 
                      message.images.length === 3 ? 'grid-cols-2' : 
                      'grid-cols-2'
                    } transition-all duration-500 ${message.isCovered ? 'blur-2xl scale-95 opacity-50' : ''}`}>
                      {message.images.map((img, idx) => (
                        <div key={idx} className={`${message.images!.length === 3 && idx === 0 ? 'col-span-2' : ''}`}>
                          <img 
                            src={img} 
                            className="rounded-lg w-full h-auto object-cover border border-white/20 shadow-sm max-h-[300px]" 
                            alt={`attachment-${idx}`} 
                          />
                        </div>
                      ))}
                    </div>
                    {message.isCovered && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                          <i className="fa-solid fa-eye-slash text-white text-xs"></i>
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Đã che bảo mật</span>
                        </div>
                      </div>
                    )}
                    {isUser && onToggleCover && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleCover(message.id); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg border border-white/20 hover:bg-black/70 active:scale-90"
                        title={message.isCovered ? "Hiện hình ảnh" : "Che bảo mật"}
                      >
                        <i className={`fa-solid ${message.isCovered ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                      </button>
                    )}
                  </div>
                )}

                {message.image === "GENERATING" && (
                  <div className="w-40 h-40 bg-slate-50 animate-pulse rounded-lg flex items-center justify-center mb-2 border border-dashed border-slate-200"><i className="fa-solid fa-paintbrush text-slate-300"></i></div>
                )}
                {isEditing ? (
                  <div className="flex flex-col gap-2 min-w-[280px] w-full">
                    <textarea 
                      className="bg-white/80 p-3 text-slate-800 rounded-xl outline-none border border-slate-300 w-full text-sm focus:bg-white focus:shadow-md transition-all resize-y min-h-[120px]"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={6}
                      autoFocus
                      placeholder="Nhập nội dung tin nhắn..."
                    />
                    <div className="flex justify-end gap-3 mt-1">
                      <button 
                        onClick={() => setIsEditing(false)} 
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors"
                      >
                        Huỷ
                      </button>
                      <button 
                        onClick={() => { onEdit(message.id, editText); setIsEditing(false); }} 
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase hover:bg-indigo-700 shadow-sm transition-colors"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  renderContent(displayText)
                )}
              </div>
          )}
          
          {/* VERSION NAVIGATION - ENABLED FOR BOTH AI AND USER */}
          {hasVersions && !isEditing && (
              <div className="flex items-center gap-2 mt-1 px-1 text-slate-500 select-none">
                  <button 
                    onClick={() => onVersionChange?.(message.id, 'prev')}
                    disabled={currentVer <= 1}
                    className="hover:text-slate-800 disabled:opacity-30 transition-colors"
                  >
                      <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  </button>
                  <span className="text-[9px] font-bold">{currentVer} / {totalVer}</span>
                  <button 
                    onClick={() => onVersionChange?.(message.id, 'next')}
                    disabled={currentVer >= totalVer}
                    className="hover:text-slate-800 disabled:opacity-30 transition-colors"
                  >
                      <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
              </div>
          )}

          {/* ACTION TOOLBAR - DARKER ICONS */}
          <div className={`flex gap-3 mt-1 px-1 transition-opacity ${isHovered && !isEditing ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <button onClick={() => onDelete(message.id)} className="text-slate-900 hover:text-rose-500 transition-colors text-[10px]" title="Xoá"><i className="fa-solid fa-trash"></i></button>
            <button onClick={() => setIsEditing(true)} className="text-slate-900 hover:text-blue-500 transition-colors text-[10px]" title="Chỉnh sửa"><i className="fa-solid fa-pen"></i></button>
            <button onClick={copyToClipboard} className="text-slate-900 hover:text-emerald-500 transition-colors text-[10px]" title="Copy"><i className="fa-solid fa-copy"></i></button>
            
            <button onClick={handleSpeak} className={`text-[10px] transition-colors ${isSpeaking ? 'text-indigo-600 animate-pulse' : 'text-slate-900 hover:text-indigo-500'}`} title="Đọc">
                <i className={`fa-solid ${isSpeaking ? 'fa-volume-high' : 'fa-volume-low'}`}></i>
            </button>
            
            {/* BRANCH FORK BUTTON */}
            {onFork && (
                <button onClick={() => onFork(message.id)} className="text-slate-900 hover:text-purple-500 transition-colors text-[10px]" title="Rẽ nhánh từ đây">
                    <i className="fa-solid fa-code-branch"></i>
                </button>
            )}

            {isAi && onSaveMemory && (
              <button onClick={() => onSaveMemory(message)} className="text-slate-900 hover:text-rose-500 transition-colors text-[10px]" title="Lưu vào Kỷ niệm"><i className="fa-solid fa-heart"></i></button>
            )}
            {isAi && onRegenerate && (
              <button onClick={() => onRegenerate(message.id)} className="text-slate-900 hover:text-amber-500 transition-colors text-[10px]" title="Tạo lại câu trả lời"><i className="fa-solid fa-rotate-right"></i></button>
            )}
            <span className="text-[9px] text-slate-400 ml-auto">{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
