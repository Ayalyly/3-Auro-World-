
import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, UserProfile, AppView, ThemeConfig } from '../types';
import MainMenu from './MainMenu'; // Import the new component
import ItemSummoner from './ItemSummoner';
import TransferModal from './TransferModal'; // Import TransferModal

interface InputBarProps {
  onSend: (text: string, images?: string[]) => void | Promise<void>;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  user?: UserProfile;
  onNavigate: (view: AppView) => void; // New prop for navigation
  theme?: ThemeConfig;
  isApiKeyMissing?: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSend, onStop, isGenerating, disabled, user, onNavigate, theme, isApiKeyMissing }) => {
  const [inputValue, setInputValue] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false); // Controls the main navigation menu
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false); // New state for Transfer Modal
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null); // NEW: Ref cho nút Menu

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isActuallyDisabled = disabled || isApiKeyMissing;

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSend = () => {
    if ((inputValue.trim() || imagePreviews.length > 0) && !isActuallyDisabled) {
      onSend(inputValue, imagePreviews.length > 0 ? imagePreviews : undefined);
      setInputValue('');
      setImagePreviews([]);
      setShowItemPicker(false);
      // Reset height
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // FIX: Kiểm tra xem click có nằm trong menu HOẶC nằm trong nút bấm không
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (inputValue.endsWith('#')) {
      setShowItemPicker(true);
    } else if (!inputValue.includes('#')) {
      setShowItemPicker(false);
    }
  }, [inputValue]);

  const insertActionTag = (action: 'GIFT' | 'USE') => {
    if (!selectedItemForAction) return;
    const tag = action === 'GIFT' 
      ? `[TẶNG: ${selectedItemForAction.icon} ${selectedItemForAction.name.toUpperCase()}] `
      : `[SỬ_DỤNG: ${selectedItemForAction.icon} ${selectedItemForAction.name.toUpperCase()}] `;
    
    const newVal = inputValue.slice(0, -1) + tag;
    setInputValue(newVal);
    setSelectedItemForAction(null);
    setShowItemPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 5 - imagePreviews.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
           setImagePreviews(prev => [...prev, reader.result as string].slice(0, 5));
        };
        reader.readAsDataURL(file);
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImagePreview = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const triggerTransfer = () => {
      setShowTransferModal(true);
      setShowItemPicker(false);
  };

  const handleTransferConfirm = (amount: number) => {
      const baseValue = inputValue.endsWith('#') ? inputValue.slice(0, -1) : inputValue;
      const prefix = baseValue.trim() ? baseValue.trim() + ' ' : '';
      setInputValue(prefix + `[CHUYỂN_KHOẢN: ${amount}]`);
      setShowTransferModal(false);
  };

  return (
    // UPDATED: Added 'relative' to ensure absolute menu positions correctly
    <div 
      className="w-full z-50 px-2 py-3 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] relative"
      style={{ fontFamily: theme?.fontFamily || 'inherit' }}
    >
      
      {/* MAIN NAVIGATION MENU OVERLAY - FASTER ANIMATION */}
      {showMenu && (
        <MainMenu 
          menuRef={menuRef}
          onClose={() => setShowMenu(false)}
          onNavigate={onNavigate}
          onShowFeedback={() => setShowFeedbackModal(true)}
        />
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && user && (
          <TransferModal 
              user={user}
              onConfirm={handleTransferConfirm}
              onCancel={() => setShowTransferModal(false)}
          />
      )}

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Góp ý & Báo lỗi</h3>
                    <button onClick={() => setShowFeedbackModal(false)} className="w-8 h-8 rounded-full bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex items-center justify-center shadow-sm border border-slate-200"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="flex-1 w-full bg-slate-50/50">
                    <iframe 
                        data-tally-src="https://tally.so/embed/rjPWQv?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" 
                        loading="lazy" 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        marginHeight={0} 
                        marginWidth={0} 
                        title="Góp ý"
                        src="https://tally.so/embed/rjPWQv?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
                    ></iframe>
                </div>
            </div>
        </div>
      )}

      {/* Refactored Item Summoner Logic */}
      {user && (
        <ItemSummoner 
          user={user}
          showItemPicker={showItemPicker}
          selectedItemForAction={selectedItemForAction}
          onClosePicker={() => setShowItemPicker(false)}
          onSelectItem={(item) => setSelectedItemForAction(item)}
          onCancelAction={() => setSelectedItemForAction(null)}
          onInsertActionTag={insertActionTag}
          onTriggerTransfer={triggerTransfer}
        />
      )}

      {/* Image Preview */}
      {imagePreviews.length > 0 && (
        <div className="absolute -top-28 left-4 flex gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-100 animate-in slide-in-from-bottom-2 duration-200 z-50 max-w-[90vw] overflow-x-auto custom-scrollbar">
          {imagePreviews.map((img, idx) => (
            <div key={idx} className="relative shrink-0 group">
              <img src={img} className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm" />
              <button 
                onClick={() => removeImagePreview(idx)} 
                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-md hover:bg-rose-600 transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
          {imagePreviews.length < 5 && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-slate-50/50"
            >
              <i className="fa-solid fa-plus text-lg mb-1"></i>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Thêm</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
        
        {/* NEW MENU BUTTON - SOLID WHITE - WITH REF */}
        <button 
           ref={buttonRef}
           onClick={() => setShowMenu(!showMenu)} 
           className={`w-10 h-10 mb-0.5 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 ${showMenu ? 'bg-indigo-600 text-white rotate-45' : 'bg-slate-200 text-slate-600 hover:text-indigo-600 border border-slate-300'}`}
        >
          <i className="fa-solid fa-plus text-sm"></i>
        </button>
        
        {/* Image Upload Button - HIGHER CONTRAST */}
        <button 
           type="button"
           onClick={() => fileInputRef.current?.click()} 
           className="w-10 h-10 mb-0.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all flex items-center justify-center active:scale-95 shrink-0"
        >
          <i className="fa-regular fa-image text-lg"></i>
        </button>
        
        {/* Input Text Area - FIXED STYLING */}
        <div className="flex-1 bg-slate-100 rounded-[1.5rem] focus-within:bg-white focus-within:shadow-[0_0_15px_rgba(139,147,255,0.15)] transition-all flex items-center px-4 py-2 min-h-[48px]">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isApiKeyMissing ? "⚠️ Vui lòng nhập API Key để chat..." : "Nhắn tin... (gõ # để chọn vật phẩm)"}
            disabled={isActuallyDisabled}
            rows={1}
            className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 text-sm text-slate-700 placeholder:text-slate-400 resize-none max-h-32 custom-scrollbar leading-6 py-1"
            style={{ 
              minHeight: '24px', 
              boxShadow: 'none',
              fontFamily: theme?.fontFamily || 'inherit',
              fontSize: theme?.fontSize ? `${theme.fontSize}px` : 'inherit'
            }}
          />
        </div>
        
        {/* Send/Stop Button */}
        <button 
          onClick={isGenerating ? onStop : handleSend}
          disabled={(!isGenerating && !inputValue.trim() && imagePreviews.length === 0) || (isActuallyDisabled && !isGenerating)}
          className={`w-12 h-10 mb-0.5 rounded-2xl text-white shadow-lg flex items-center justify-center disabled:opacity-50 disabled:shadow-none active:scale-90 transition-all shrink-0 hover:shadow-xl ${
            isGenerating 
              ? 'bg-rose-500 shadow-rose-200 hover:shadow-rose-300' 
              : 'bg-indigo-600 shadow-indigo-200 hover:shadow-indigo-300'
          }`}
        >
          {isGenerating ? (
            <i className="fa-solid fa-stop text-sm animate-pulse"></i>
          ) : (
            <i className="fa-solid fa-paper-plane text-sm"></i>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputBar;


