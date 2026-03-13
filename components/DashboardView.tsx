import React, { useState, useRef, useEffect } from 'react';
import { SaveSlot, AppSettings, PromptPreset, UserProfile, InventoryItem } from '../types';
import { GeminiService } from '../services/geminiService';
import { GiftCodeService } from '../services/giftCodeService';

interface DashboardViewProps {
  slots: SaveSlot[];
  user: UserProfile;
  appMode: 'offline' | 'online';
  serverName: string;
  settings: AppSettings;
  geminiService: GeminiService;
  giftCodeService: GiftCodeService;
  onLoadCharacter: (slotId: string) => void;
  onNewCharacter: () => void;
  onDeleteCharacter: (slotId: string) => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onLogout: () => void;
  onLoadAllCharacters?: () => void;
  onLoadLocalCharacters?: () => void;
  onSyncLocalToCloud?: () => void;
  syncProgress?: { current: number; total: number } | null;
  t: (key: string) => string;
  onUpdateUser?: (user: UserProfile) => void;
  shopItems?: InventoryItem[];
}

import { PROXY_PRESETS } from '../constants';

const DashboardView: React.FC<DashboardViewProps> = ({
  slots,
  user,
  appMode,
  serverName,
  settings,
  geminiService,
  giftCodeService,
  onLoadCharacter,
  onNewCharacter,
  onDeleteCharacter,
  onUpdateSettings,
  onLogout,
  onLoadAllCharacters,
  onLoadLocalCharacters,
  onSyncLocalToCloud,
  syncProgress,
  t,
  onUpdateUser,
  shopItems = []
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'rules' | 'apikeys' | 'welfare'>('characters');
  const [ruleTab, setRuleTab] = useState<'system' | 'prefix'>('system');
  
  // Rule State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleContent, setNewRuleContent] = useState('');
  const [editingRule, setEditingRule] = useState<PromptPreset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // API Key State
  const [newKey, setNewKey] = useState('');
  const [newGroqKey, setNewGroqKey] = useState('');
  const [showKeyGuide, setShowKeyGuide] = useState(false);
  const [showGroqKeyGuide, setShowGroqKeyGuide] = useState(false);

  // Proxy API State
  const [newProxyBaseUrl, setNewProxyBaseUrl] = useState('');
  const [newProxyKey, setNewProxyKey] = useState('');
  const [newProxyModel, setNewProxyModel] = useState('');
  const [showProxyGuide, setShowProxyGuide] = useState(false);

  const handleApplyProxyPreset = (preset: typeof PROXY_PRESETS[0]) => {
      setNewProxyBaseUrl(preset.baseUrl);
      setNewProxyModel(preset.model);
  };
  
  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteKeyConfirm, setDeleteKeyConfirm] = useState<{ val: string, provider: string } | null>(null);
  
  // Popup States
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Donation State
  const [donationAmount, setDonationAmount] = useState('111');
  const [donationStep, setDonationStep] = useState<'input' | 'code' | 'verify'>('input');
  const [donationCode, setDonationCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [donationProof, setDonationProof] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const donationFileInputRef = useRef<HTMLInputElement>(null);

  // Gift Code State
  const [giftCode, setGiftCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [giftResult, setGiftResult] = useState<{ success: boolean; message: string; reward?: { coins?: number; item?: InventoryItem } } | null>(null);

  // Distribution State
  const [distributeTarget, setDistributeTarget] = useState<SaveSlot | null>(null);
  const [distributeAmount, setDistributeAmount] = useState<number>(0);
  const [selectedDistributeItems, setSelectedDistributeItems] = useState<string[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);

  // Auto-show Disclaimer for new users
  useEffect(() => {
    const hasSeen = localStorage.getItem('auro_disclaimer_accepted');
    if (!hasSeen && slots.length === 0) {
      setShowDisclaimer(true);
    }
  }, [slots.length]);

  // Auto-load characters if list is empty and in online mode
  useEffect(() => {
    if (appMode === 'online' && slots.length === 0 && activeTab === 'characters' && onLoadAllCharacters) {
      onLoadAllCharacters();
    }
  }, [appMode, activeTab]); // Only run when entering characters tab in online mode

  // Countdown Timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (targetTime: number) => {
    const diff = targetTime - now;
    if (diff <= 0) return 'Sẵn sàng';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // --- ACTIONS ---
  const handleSaveRule = () => {
    if (!newRuleName.trim() || !newRuleContent.trim()) return;
    
    const field = ruleTab === 'system' ? 'systemPrompts' : 'prefixes';
    const currentList = settings[field] || [];
    
    const newRule: PromptPreset = {
      id: Date.now().toString(),
      name: newRuleName,
      content: newRuleContent,
      isActive: false
    };
    onUpdateSettings({ ...settings, [field]: [...currentList, newRule] });
    
    setNewRuleName('');
    setNewRuleContent('');
  };

  const handleOpenEditPopup = (rule: PromptPreset) => {
    setEditingRule(rule);
    setNewRuleName(rule.name);
    setNewRuleContent(rule.content);
    setShowEditPopup(true);
  };

  const handleSaveEdit = () => {
    if (!editingRule || !newRuleName.trim() || !newRuleContent.trim()) return;
    
    const field = ruleTab === 'system' ? 'systemPrompts' : 'prefixes';
    const currentList = settings[field] || [];
    const updatedList = currentList.map(r => 
      r.id === editingRule.id 
        ? { ...r, name: newRuleName, content: newRuleContent }
        : r
    );
    onUpdateSettings({ ...settings, [field]: updatedList });
    
    setShowEditPopup(false);
    setEditingRule(null);
    setNewRuleName('');
    setNewRuleContent('');
  };

  const handleDeleteRule = (id: string) => {
    const field = ruleTab === 'system' ? 'systemPrompts' : 'prefixes';
    const currentList = settings[field] || [];
    onUpdateSettings({ ...settings, [field]: currentList.filter(item => item.id !== id) });
  };

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    const newConfigs = [...(settings.apiConfigs || [])];
    let gIndex = newConfigs.findIndex(c => c.provider === 'gemini');
    
    if (gIndex === -1) {
      newConfigs.push({ 
        provider: 'gemini', 
        keys: [], 
        activeModel: 'gemini-3.1-flash-lite-preview', 
        isEnabled: true 
      });
      gIndex = newConfigs.length - 1;
    }

    // Check duplicate
    if (newConfigs[gIndex].keys.some(k => k.value === newKey.trim())) {
      alert('Key này đã tồn tại!');
      return;
    }

    newConfigs[gIndex].keys.push({ value: newKey.trim(), isActive: true });
    onUpdateSettings({ ...settings, apiConfigs: newConfigs });
    setNewKey('');
  };

  const handleAddGroqKey = () => {
    if (!newGroqKey.trim()) return;
    const newConfigs = [...(settings.apiConfigs || [])];
    let gIndex = newConfigs.findIndex(c => c.provider === 'groq');
    
    if (gIndex === -1) {
      newConfigs.push({ 
        provider: 'groq', 
        keys: [], 
        activeModel: 'llama-3.3-70b-versatile', 
        isEnabled: true 
      });
      gIndex = newConfigs.length - 1;
    }

    // Check duplicate
    if (newConfigs[gIndex].keys.some(k => k.value === newGroqKey.trim())) {
      alert('Key này đã tồn tại!');
      return;
    }

    newConfigs[gIndex].keys.push({ value: newGroqKey.trim(), isActive: true });
    onUpdateSettings({ ...settings, apiConfigs: newConfigs });
    setNewGroqKey('');
  };

  const handleAddProxyConfig = () => {
    if (!newProxyBaseUrl || !newProxyModel) {
        alert('Vui lòng nhập Base URL và Model Name!');
        return;
    }
    
    const newConfigs = [...(settings.apiConfigs || [])];
    let proxyIndex = newConfigs.findIndex(c => c.provider === 'proxy');
    
    if (proxyIndex === -1) {
        newConfigs.push({
            provider: 'proxy',
            keys: [],
            activeModel: newProxyModel,
            isEnabled: true,
            baseUrl: newProxyBaseUrl
        });
        proxyIndex = newConfigs.length - 1;
    } else {
        newConfigs[proxyIndex] = {
            ...newConfigs[proxyIndex],
            baseUrl: newProxyBaseUrl,
            activeModel: newProxyModel
        };
    }
    
    if (newProxyKey) {
        if (!newConfigs[proxyIndex].keys.some(k => k.value === newProxyKey)) {
             newConfigs[proxyIndex].keys.push({ value: newProxyKey, isActive: true });
        }
    }
    
    onUpdateSettings({ ...settings, apiConfigs: newConfigs });
    alert('Đã lưu cấu hình Proxy!');
  };

  const handleDeleteProxyKey = (keyVal: string) => {
      setDeleteKeyConfirm({ val: keyVal, provider: 'proxy' });
  };

  const handleDeleteKey = (val: string, provider: 'gemini' | 'groq' = 'gemini') => {
    setDeleteKeyConfirm({ val, provider });
  };

  const executeDeleteKey = () => {
    if (!deleteKeyConfirm) return;
    const { val, provider } = deleteKeyConfirm;
    const newConfigs = [...(settings.apiConfigs || [])];
    const gIndex = newConfigs.findIndex(c => c.provider === provider);
    
    if (gIndex > -1) {
      const updatedConfig = { ...newConfigs[gIndex] };
      updatedConfig.keys = updatedConfig.keys.filter(k => k.value !== val);
      newConfigs[gIndex] = updatedConfig;
      onUpdateSettings({ ...settings, apiConfigs: newConfigs });
    }
    setDeleteKeyConfirm(null);
  };

  const handlePauseKey = (index: number, provider: 'gemini' | 'groq' = 'gemini') => {
    const newConfigs = [...(settings.apiConfigs || [])];
    const gIndex = newConfigs.findIndex(c => c.provider === provider);
    
    if (gIndex > -1) {
      const config = { ...newConfigs[gIndex] };
      config.keys = [...config.keys];
      const key = { ...config.keys[index] };
      
      // Toggle pause
      if (key.pausedUntil && key.pausedUntil > Date.now()) {
        // Unpause
        key.pausedUntil = undefined;
      } else {
        // Pause until 3 PM VN (or 3 PM next day)
        const now = new Date();
        // 3 PM VN is 8 AM UTC
        const target = new Date();
        target.setUTCHours(8, 0, 0, 0);
        
        if (target.getTime() <= now.getTime()) {
           // If already past 3 PM today, set for tomorrow
           target.setDate(target.getDate() + 1);
        }
        key.pausedUntil = target.getTime();
      }
      
      config.keys[index] = key;
      newConfigs[gIndex] = config;
      
      onUpdateSettings({ ...settings, apiConfigs: newConfigs });
    }
  };

  const currentRules = ruleTab === 'system' ? (settings.systemPrompts || []) : (settings.prefixes || []);
  const currentKeys = settings.apiConfigs?.find(c => c.provider === 'gemini')?.keys || [];
  const currentGroqKeys = settings.apiConfigs?.find(c => c.provider === 'groq')?.keys || [];

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteCharacter(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleGenerateDonationCode = async () => {
    const amount = parseInt(donationAmount, 10);
    if (isNaN(amount) || amount < 111) {
        alert('Số tiền không hợp lệ.');
        return;
    }

    setIsGeneratingCode(true);
    try {
        // Generate a random 6-digit number
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const code = `Auro World hi -${randomNum}`;
        
        // Simulate a slight delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setDonationCode(code);
        setDonationStep('code');
    } catch (error) {
        console.error('Lỗi tạo mã ủng hộ:', error);
        alert('Đã xảy ra lỗi khi tạo mã ủng hộ. Vui lòng thử lại.');
    } finally {
        setIsGeneratingCode(false);
    }
  };

  const handleVerifyDonation = async () => {
    if (!donationProof) {
        alert('Vui lòng tải lên ảnh chụp màn hình giao dịch.');
        return;
    }
    if (!geminiService) {
        alert('Lỗi: Dịch vụ AI chưa được khởi tạo.');
        return;
    }

    setIsVerifying(true);
    try {
        const amount = parseInt(donationAmount, 10);
        const result = await geminiService.verifyDonation(donationProof, amount, donationCode);
        
        if (result.success) {
            alert(`Xác minh thành công! Bạn đã nhận được ${amount} Auro Coin.`);
            if (onUpdateUser) {
                onUpdateUser({
                    ...user,
                    auroCoins: (user.auroCoins || 0) + amount
                });
            }
            // Đặt lại trạng thái
            setDonationStep('input');
            setDonationAmount('111');
            setDonationCode('');
            setDonationProof(null);
        } else {
            alert(`Xác minh thất bại: ${result.message}`);
        }
    } catch (error) {
        console.error('Lỗi xác minh giao dịch:', error);
        alert('Đã xảy ra lỗi trong quá trình xác minh. Vui lòng thử lại.');
    } finally {
        setIsVerifying(false);
    }
  };

  const handleRedeemGiftCode = async () => {
    if (!giftCode.trim()) return;
    if (!giftCodeService) {
      alert('Dịch vụ Gift Code chưa được thiết lập.');
      return;
    }

    setIsRedeeming(true);
    try {
      const codes = await giftCodeService.getGiftCodes();
      const matchingRewards = codes.filter(c => c.code.toLowerCase() === giftCode.trim().toLowerCase());

      if (matchingRewards.length === 0) {
        setGiftResult({ success: false, message: 'Mã Gift Code không hợp lệ hoặc đã hết hạn.' });
        setIsRedeeming(false);
        return;
      }

      // Check if already used (we can store used codes in settings too for global tracking)
      // Since all rewards share the same code, we only need to check the first one
      const codeKey = matchingRewards[0].code;
      if (settings.usedGiftCodes?.includes(codeKey)) {
        setGiftResult({ success: false, message: 'Bạn đã sử dụng mã này rồi.' });
        setIsRedeeming(false);
        return;
      }

      // Grant rewards to UNALLOCATED pool
      let updatedSettings = { ...settings };
      if (!updatedSettings.usedGiftCodes) updatedSettings.usedGiftCodes = [];
      updatedSettings.usedGiftCodes.push(codeKey);

      let totalCoins = 0;
      let newItems: InventoryItem[] = [];

      matchingRewards.forEach(reward => {
          if (reward.type === 'COIN') {
            const amount = parseInt(reward.value as string, 10) || 0;
            totalCoins += amount;
          } else if (reward.type === 'ITEM' || reward.type === 'SKIN' || reward.type === 'NOITHAT' || reward.type === 'FURNITURE') {
            const shopItem = shopItems.find(i => i.id === reward.value);
            if (shopItem) {
              newItems.push({
                ...shopItem,
                id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                description: `Phần quà từ mã: ${reward.code}`,
                quantity: 1
              });
            } else {
              const isFurniture = reward.type === 'NOITHAT' || reward.type === 'FURNITURE';
              const newItem: InventoryItem = {
                id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: reward.description,
                icon: reward.type === 'SKIN' ? 'fa-solid fa-shirt' : (isFurniture ? 'fa-solid fa-couch' : 'fa-solid fa-gift'),
                description: `Phần quà từ mã: ${reward.code}`,
                value: 0,
                affinityBonus: 5,
                category: reward.type === 'SKIN' ? 'Skin' : (isFurniture ? 'Nội thất' : 'Gift'),
                quantity: 1,
                isFurniture: isFurniture
              };
              newItems.push(newItem);
            }
          }
      });

      updatedSettings.unallocatedAuroCoins = (updatedSettings.unallocatedAuroCoins || 0) + totalCoins;
      updatedSettings.unallocatedItems = [...(updatedSettings.unallocatedItems || []), ...newItems];

      onUpdateSettings(updatedSettings);
      setGiftCode('');
      
      // Construct success message
      let msg = 'Nhận quà thành công!';
      if (totalCoins > 0) msg += ` +${totalCoins} Xu`;
      if (newItems.length > 0) msg += ` và ${newItems.length} vật phẩm`;

      setGiftResult({ 
          success: true, 
          message: msg, 
          reward: { coins: totalCoins, item: newItems.length > 0 ? newItems[0] : undefined } 
      });
    } catch (error) {
      console.error('Lỗi nhận Gift Code:', error);
      setGiftResult({ success: false, message: 'Đã xảy ra lỗi khi kiểm tra mã. Vui lòng thử lại.' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleDistributeToSlot = (slot: SaveSlot) => {
    setDistributeTarget(slot);
    setDistributeAmount(settings.unallocatedAuroCoins || 0);
    setSelectedDistributeItems((settings.unallocatedItems || []).map(i => i.id));
  };

  const handleConfirmDistribute = async () => {
    if (!distributeTarget) return;

    setIsDistributing(true);
    try {
      if ((window as any).onDistributeRewards) {
        const itemsToDistribute = (settings.unallocatedItems || []).filter(i => selectedDistributeItems.includes(i.id));
        
        await (window as any).onDistributeRewards(distributeTarget.id, distributeAmount, itemsToDistribute);
        
        // Update unallocated pool
        const remainingItems = (settings.unallocatedItems || []).filter(i => !selectedDistributeItems.includes(i.id));
        onUpdateSettings({
          ...settings,
          unallocatedAuroCoins: (settings.unallocatedAuroCoins || 0) - distributeAmount,
          unallocatedItems: remainingItems
        });
        
        setGiftResult({ 
            success: true, 
            message: `Đã chuyển ${distributeAmount.toLocaleString()} Auro Coin và ${itemsToDistribute.length} vật phẩm cho ${distributeTarget.charName}!` 
        });
      } else {
        alert('Lỗi: Tính năng phân phối chưa sẵn sàng.');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi phân phối.');
    } finally {
      setIsDistributing(false);
      setDistributeTarget(null);
    }
  };

  // Filter rules by search
  const filteredRules = currentRules.filter(rule => 
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    rule.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[100dvh] w-full bg-white flex flex-col font-sans relative">
      
      {/* --- DISCLAIMER POPUP --- */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <i className="fa-solid fa-scale-balanced text-3xl text-amber-400"></i>
                <h3 className="text-xl font-black uppercase tracking-wider">LEGAL & DISCLAIMER</h3>
              </div>
              <p className="text-[10px] opacity-70 font-mono">AURO WORLD • TERMS OF USE</p>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50">
                <div className="prose prose-sm max-w-none text-slate-600">
                    
                    {/* Vietnamese Section */}
                    <div className="mb-8 border-b border-slate-200 pb-6">
                        <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-2xl">🇻🇳</span> Tiếng Việt
                        </h4>
                        <p className="mb-2"><strong>Auro World</strong> là ứng dụng nhập vai và sáng tạo câu chuyện hư cấu bằng AI, phục vụ mục đích <strong>giải trí và sáng tạo</strong>.</p>
                        <p className="mb-2">Tất cả nhân vật, sự kiện, địa điểm và nội dung trong ứng dụng đều là <strong>hư cấu</strong> và không liên quan đến người thật hoặc tổ chức ngoài đời thực.</p>
                        
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4 rounded-r-xl">
                            <p className="font-bold text-amber-800 mb-1">⚠️ Lưu ý quan trọng:</p>
                            <p className="text-amber-900 text-xs">Nội dung do AI tạo ra không phải là lời khuyên chuyên môn (y tế, pháp lý, tài chính hay tâm lý). Người dùng tự chịu trách nhiệm khi sử dụng nội dung trong ứng dụng.</p>
                        </div>

                        <p className="mb-2">Nhà phát triển không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ việc sử dụng ứng dụng sai mục đích.</p>
                        <p className="mb-2">Các tình huống drama, xung đột, đánh nhau hoặc nội dung nhạy cảm chỉ tồn tại trong <strong>bối cảnh nhập vai hư cấu</strong>, không nhằm khuyến khích hành vi nguy hiểm ngoài đời thực.</p>
                        <p className="mb-2">Ứng dụng có thể lưu dữ liệu trò chơi (nhân vật, hội thoại, cài đặt) để phục vụ trải nghiệm người dùng. Dữ liệu này không được sử dụng cho mục đích thương mại.</p>
                        <p className="italic text-slate-500">Nếu bạn không thoải mái với nội dung trong ứng dụng, vui lòng ngừng sử dụng.</p>
                    </div>

                    {/* English Section */}
                    <div>
                        <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-2xl">🇺🇸</span> English Version
                        </h4>
                        <p className="mb-2"><strong>Auro World</strong> is an AI-powered roleplay and fictional storytelling application for <strong>entertainment and creative purposes only</strong>.</p>
                        <p className="mb-2">All characters, events, locations, and content are entirely <strong>fictional</strong> and do not represent real people or organizations.</p>
                        
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4 rounded-r-xl">
                            <p className="font-bold text-blue-800 mb-1">⚠️ Important Note:</p>
                            <p className="text-blue-900 text-xs">AI-generated content does not constitute professional advice (medical, legal, financial, or psychological). Users are responsible for how they use and interpret the content.</p>
                        </div>

                        <p className="mb-2">The developer is not liable for any damages resulting from misuse of the application.</p>
                        <p className="mb-2">Any drama, conflict, violence, or sensitive scenarios exist only within a <strong>fictional roleplay context</strong> and are not intended to promote harmful real-world behavior.</p>
                        <p className="mb-2">The app may store gameplay data (characters, conversations, settings) to improve user experience. This data is not used for commercial purposes.</p>
                        <p className="italic text-slate-500">If you feel uncomfortable with any content, please stop using the application.</p>
                    </div>

                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-3 shrink-0">
                <div className="text-center text-[10px] text-slate-400 mb-2">
                    By using Auro World, you agree to this disclaimer.<br/>
                    Sử dụng Auro World đồng nghĩa với việc bạn chấp nhận các điều khoản trên.
                </div>
                <button 
                onClick={() => {
                    setShowDisclaimer(false);
                    localStorage.setItem('auro_disclaimer_accepted', 'true');
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-[0.98]"
              >
                Đồng Ý & Tiếp Tục / Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT RULE POPUP --- */}
      {showEditPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 pb-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-pen-to-square"></i>
                  Chỉnh sửa {ruleTab === 'system' ? 'Quy tắc' : 'Tiền tố'}
                </h3>
                <p className="text-[9px] opacity-80 mt-1">Thay đổi nội dung và nhấn Lưu</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditPopup(false);
                  setEditingRule(null);
                  setNewRuleName('');
                  setNewRuleContent('');
                }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  <i className="fa-solid fa-tag mr-1"></i> Tên gợi nhớ
                </label>
                <input 
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-2 border-transparent focus:bg-white focus:border-amber-300 outline-none transition-all"
                  placeholder="VD: Nghiêm túc, Hài hước..."
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  <i className="fa-solid fa-file-lines mr-1"></i> Nội dung
                </label>
                <textarea 
                  className="w-full p-3 bg-slate-50 rounded-xl text-xs border-2 border-transparent focus:bg-white focus:border-amber-300 outline-none transition-all resize-none leading-relaxed"
                  placeholder={ruleTab === 'system' ? "Nhập Prompt hệ thống..." : "Nhập đoạn text mở đầu..."}
                  value={newRuleContent}
                  onChange={e => setNewRuleContent(e.target.value)}
                  rows={12}
                />
                <p className="text-[9px] text-slate-400 mt-2 italic">
                  {newRuleContent.length} ký tự
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => {
                  setShowEditPopup(false);
                  setEditingRule(null);
                  setNewRuleName('');
                  setNewRuleContent('');
                }}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 transition-all"
              >
                <i className="fa-solid fa-floppy-disk mr-1"></i> Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM POPUP --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#1a1a2e] w-full max-w-xs rounded-[2rem] p-6 text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] border border-red-900/50 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                <i className="fa-solid fa-skull text-4xl text-red-500 animate-pulse"></i>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-3">HÓA KIẾP?</h3>
              <p className="text-[11px] text-slate-400 mb-8 leading-relaxed font-medium">
                Dữ liệu linh hồn này sẽ tan biến vào hư vô vĩnh viễn. Bạn có chắc chắn muốn thực hiện nghi lễ này không?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)} 
                  className="flex-1 py-3.5 bg-white/5 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
                >
                  Giữ lại
                </button>
                <button 
                  onClick={handleConfirmDelete} 
                  className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:from-red-700 hover:to-orange-700 shadow-lg shadow-red-900/50 transition-colors border border-red-500/50 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-skull"></i> Hóa kiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- API KEY GUIDE POPUP --- */}
      {showKeyGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                  <i className="fa-solid fa-key text-blue-500 mr-2"></i>Cách lấy API Key
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">Hoàn toàn miễn phí từ Google</p>
              </div>
              <button 
                onClick={() => setShowKeyGuide(false)} 
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shadow-sm border border-slate-100"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-[11px] text-slate-600 font-medium leading-relaxed bg-white">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100">1</div>
                <div>
                  <p className="mb-1 text-slate-800 font-bold">Truy cập Google AI Studio</p>
                  <p>Sử dụng tài khoản Google cá nhân của bạn để đăng nhập.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100">2</div>
                <div>
                  <p className="mb-1 text-slate-800 font-bold">Tạo Key Mới</p>
                  <p>Nhấn vào nút <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold border border-slate-200">Get API key</span> ở menu bên trái, sau đó chọn <span className="text-blue-600 font-bold">Create API key in new project</span>.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100">3</div>
                <div>
                  <p className="mb-1 text-slate-800 font-bold">Sao chép & Dán</p>
                  <p>Copy đoạn mã bắt đầu bằng <code className="bg-slate-100 px-1 rounded text-rose-500 font-mono">AIzaSy...</code> và dán vào ô nhập liệu của ứng dụng.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                onClick={() => setShowKeyGuide(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                Mở trang lấy Key ngay <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- GROQ KEY GUIDE POPUP --- */}
      {showGroqKeyGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50">
              <div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                  <i className="fa-solid fa-key text-red-500 mr-2"></i>Cách lấy Groq API Key
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">Miễn phí & Reset mỗi ngày</p>
              </div>
              <button 
                onClick={() => setShowGroqKeyGuide(false)} 
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shadow-sm border border-slate-100"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-[11px] text-slate-600 font-medium leading-relaxed bg-white">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-xs shrink-0 border border-red-100">1</div>
                <div>
                  <p className="mb-1 text-slate-800 font-bold">Truy cập Groq Console</p>
                  <p>Truy cập <a href="https://console.groq.com/keys" target="_blank" className="text-blue-500 hover:underline">console.groq.com</a> và đăng nhập.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-xs shrink-0 border border-red-100">2</div>
                <div>
                  <p className="mb-1 text-slate-800 font-bold">Đăng nhập Google</p>
                  <p>Chọn đăng nhập bằng tài khoản Google. <strong className="text-emerald-600">Không cần thẻ tín dụng</strong>.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-xs shrink-0 border border-red-100">3</div>
                <div>
                  <p className="mb-1 text-slate-800 font-bold">Tạo & Copy Key</p>
                  <p>Nhấn <strong>Create API Key</strong>, đặt tên và copy mã bắt đầu bằng <code className="bg-slate-100 px-1 rounded text-rose-500 font-mono">gsk_...</code></p>
                </div>
              </div>
               <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-[10px] text-amber-800">
                  <i className="fa-solid fa-circle-info mr-1"></i> <strong>Lưu ý:</strong> Groq miễn phí có giới hạn số lượng token mỗi ngày. Nếu hết, hãy chờ qua ngày hôm sau hoặc dùng nhiều acc/key khác nhau.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                onClick={() => setShowGroqKeyGuide(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:from-red-600 hover:to-orange-700 transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                Mở Groq Console ngay <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* --- DONATION MODAL --- */}
      {donationStep !== 'input' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {donationStep === 'code' && (
                <div>
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6 text-white">
                        <h3 className="text-xl font-black uppercase tracking-wider">Mã ủng hộ của bạn</h3>
                        <p className="text-xs opacity-90 mt-1">Sử dụng mã này trong nội dung chuyển khoản MoMo.</p>
                    </div>
                    <div className="p-6 text-center">
                        <div className="bg-emerald-50 rounded-xl p-4 mb-6 border border-emerald-100 text-left">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Thông tin chuyển khoản</p>
                            <div className="space-y-1 text-sm text-slate-700">
                                <p><span className="text-slate-500">Ngân hàng:</span> <strong>MoMo</strong></p>
                                <p><span className="text-slate-500">Chủ tài khoản:</span> <strong>Dương Thùy Trang</strong></p>
                                <p className="flex items-center justify-between">
                                    <span><span className="text-slate-500">Số tài khoản:</span> <strong>0335402990</strong></span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText('0335402990');
                                            alert('Đã sao chép số tài khoản!');
                                        }}
                                        className="text-emerald-500 hover:text-emerald-600 text-xs"
                                    >
                                        <i className="fa-solid fa-copy"></i> Copy
                                    </button>
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">Số tiền:</p>
                        <p className="text-3xl font-black text-slate-800 mb-6">
                            {parseInt(donationAmount).toLocaleString()} VNĐ
                        </p>
                        <p className="text-sm text-slate-500 mb-2">Nội dung chuyển khoản:</p>
                        <div className="bg-slate-100 rounded-xl p-4 mb-4 border border-slate-200">
                            <p className="font-mono text-lg font-bold text-slate-700 break-all">{donationCode}</p>
                        </div>
                        <button
                            onClick={() => {
                              navigator.clipboard.writeText(donationCode);
                              alert('Đã sao chép mã!');
                            }}
                            className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all mb-4 active:scale-95"
                        >
                            <i className="fa-solid fa-copy mr-2"></i> Sao chép mã
                        </button>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Sau khi chuyển khoản thành công, vui lòng chụp lại màn hình giao dịch và nhấn "Tiếp tục" để hoàn tất.
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex gap-3">
                        <button
                            onClick={() => setDonationStep('input')}
                            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => setDonationStep('verify')}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
                        >
                            Tiếp tục <i className="fa-solid fa-arrow-right ml-1"></i>
                        </button>
                    </div>
                </div>
            )}
            {donationStep === 'verify' && (
                <div>
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
                        <h3 className="text-xl font-black uppercase tracking-wider">Xác minh giao dịch</h3>
                        <p className="text-xs opacity-90 mt-1">Tải lên ảnh chụp màn hình giao dịch thành công.</p>
                    </div>
                    <div className="p-6 text-center">
                        <input
                            type="file"
                            ref={donationFileInputRef}
                            onChange={(e) => setDonationProof(e.target.files ? e.target.files[0] : null)}
                            className="hidden"
                            accept="image/*"
                        />
                        <button
                            onClick={() => donationFileInputRef.current?.click()}
                            className="w-full py-10 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-all mb-4"
                        >
                            {donationProof ? (
                                <div className="text-sm font-bold text-emerald-600">
                                    <i className="fa-solid fa-check-circle mr-2"></i>
                                    {donationProof.name}
                                </div>
                            ) : (
                                <div className="text-sm font-bold">
                                    <i className="fa-solid fa-upload mr-2"></i>
                                    Nhấn để chọn ảnh
                                </div>
                            )}
                        </button>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            AI sẽ kiểm tra mã và số tiền trong ảnh. Quá trình này có thể mất vài phút.
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex gap-3">
                        <button
                            onClick={() => setDonationStep('code')}
                            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Quay lại
                        </button>
                        <button
                            onClick={handleVerifyDonation}
                            disabled={!donationProof || isVerifying}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                            {isVerifying ? (
                                <><i className="fa-solid fa-spinner fa-spin"></i> Đang xác minh...</>
                            ) : (
                                <>Gửi xác minh</>
                            )}
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 overflow-hidden border border-slate-100">
            <img src="https://i.ibb.co/k6KC8zyN/media-1769361739.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">WORLD DASHBOARD</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${appMode === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                {serverName}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDisclaimer(true)}
            className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-500 hover:text-amber-600 transition-colors flex items-center justify-center border border-amber-100"
            title="Miễn trách nhiệm"
          >
            <i className="fa-solid fa-circle-info text-sm"></i>
          </button>
          <button 
            onClick={onLogout} 
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center border border-slate-100"
            title="Ngắt kết nối"
          >
            <i className="fa-solid fa-power-off text-sm"></i>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="px-6 border-b border-slate-100 flex gap-8 overflow-x-auto custom-scrollbar sticky top-[80px] bg-white z-20">
        {[
          { id: 'characters', label: 'NHÂN VẬT', icon: 'fa-users' },
          { id: 'rules', label: 'LUẬT LỆ', icon: 'fa-scale-balanced' },
          { id: 'apikeys', label: 'API KEYS', icon: 'fa-key' },
          { id: 'welfare', label: 'PHÚC LỢI', icon: 'fa-gift' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-300 hover:text-slate-500'}`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 pb-32">
        
        {/* VIEW: CHARACTERS */}
        {activeTab === 'characters' && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden group hover:border-blue-200 transition-all">
                <button 
                  onClick={onNewCharacter}
                  className="w-full py-4 flex flex-col items-center justify-center gap-2 text-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all active:scale-[0.99]"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center shadow-sm text-blue-600 group-hover:scale-110 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-300 border border-blue-100">
                    <i className="fa-solid fa-plus text-sm"></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 group-hover:text-blue-700 text-center px-2">Tạo nhân vật</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden group hover:border-indigo-200 transition-all">
                <a 
                  href="https://discord.gg/QCCjEw49C"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 flex flex-col items-center justify-center gap-2 text-indigo-500 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all active:scale-[0.99]"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center shadow-sm text-indigo-600 group-hover:scale-110 group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white transition-all duration-300 border border-indigo-100">
                    <i className="fa-brands fa-discord text-sm"></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 group-hover:text-indigo-700 text-center px-2">Discord</span>
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-3 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DANH SÁCH ({slots.length}) CƯ DÂN</p>
                
                <div className="flex flex-wrap gap-2">
                  {appMode === 'online' && onLoadLocalCharacters && (
                    <button 
                      onClick={onLoadLocalCharacters} 
                      className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-600 text-[9px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-amber-100 active:scale-95 group"
                    >
                      <i className="fa-solid fa-laptop-code group-hover:animate-pulse"></i> TẢI DỮ LIỆU TRÌNH DUYỆT
                    </button>
                  )}
                  {appMode === 'online' && onSyncLocalToCloud && (
                    <button 
                      onClick={onSyncLocalToCloud} 
                      className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-600 text-[9px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-emerald-100 active:scale-95 group"
                    >
                      <i className="fa-solid fa-cloud-arrow-up group-hover:animate-bounce"></i> ĐỒNG BỘ LÊN SERVER
                    </button>
                  )}
                  {appMode === 'online' && onLoadAllCharacters && (
                    <button 
                      onClick={onLoadAllCharacters} 
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-600 text-[9px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-blue-100 active:scale-95 group"
                    >
                      <i className="fa-solid fa-cloud-arrow-down group-hover:animate-bounce"></i> LOAD ALL
                    </button>
                  )}
                </div>
              </div>

              {syncProgress && (
                <div className="px-2 py-3 bg-white/50 rounded-2xl border border-emerald-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      Đang đồng bộ cư dân...
                    </span>
                    <span className="text-[10px] font-black text-emerald-500">
                      {syncProgress.current} / {syncProgress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                      style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {slots.map(slot => (
                <div 
                  key={slot.id} 
                  onClick={() => slot.id && onLoadCharacter(slot.id)}
                  className="bg-white p-3 pr-5 rounded-[1.5rem] shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center gap-4 group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="relative shrink-0">
                    <div className="absolute -inset-[2px] bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 rounded-[1.3rem] opacity-70 blur-[1px]"></div>
                    <div className="w-16 h-16 rounded-[1.2rem] overflow-hidden relative bg-white border-2 border-white">
                      <img 
                        src={slot.charAvatar} 
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/notionists/svg?seed=Error')} 
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-black text-slate-700 uppercase truncate">{slot.charName}</h3>
                      {slot.isLocalOnly && (
                        <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">
                          <i className="fa-solid fa-hard-drive mr-1"></i> Máy
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                      <i className="fa-solid fa-user text-[8px] opacity-70"></i> {slot.userName}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center gap-2 pl-2 border-l border-slate-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(slot.id); }}
                      className="w-8 h-8 rounded-full bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center"
                      title="Hóa kiếp"
                    >
                      <i className="fa-solid fa-skull text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}

              {slots.length === 0 && (
                <div className="text-center py-12 px-6 animate-in fade-in zoom-in duration-500">
                  <div className="text-slate-200 text-7xl mb-6 opacity-50">
                    <i className="fa-solid fa-ghost"></i>
                  </div>
                  <h3 className="text-slate-400 font-black uppercase tracking-widest text-sm mb-6">
                    Chưa có nhân vật nào
                  </h3>
                  <div className="text-slate-400 text-[11px] space-y-4 max-w-xs mx-auto leading-relaxed opacity-70 font-medium">
                    <p className="bg-slate-100/50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 block mb-1">BƯỚC 1</span>
                      Nhập Key API MIỄN PHÍ tại tab <button onClick={() => setActiveTab('apikeys')} className="font-bold text-blue-500 hover:underline">API KEYS</button>.
                    </p>
                    <div className="w-0.5 h-4 bg-slate-200 mx-auto"></div>
                    <p className="bg-slate-100/50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 block mb-1">BƯỚC 2</span>
                      Nhấn nút <span className="font-bold text-blue-500">TẠO NHÂN VẬT MỚI</span> ở trên. Bạn có thể tự tạo hoặc nhập thẻ triệu hồi Auro Card.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button 
                onClick={() => setRuleTab('system')} 
                className={`flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${ruleTab === 'system' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-robot"></i>
                System Prompts
              </button>
              <button 
                onClick={() => setRuleTab('prefix')} 
                className={`flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${ruleTab === 'prefix' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-message"></i>
                Chat Prefixes
              </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-3 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-transparent focus-within:bg-white focus-within:border-amber-300 transition-all">
                <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                <input 
                  className="flex-1 bg-transparent text-xs outline-none"
                  placeholder="Tìm kiếm theo tên hoặc nội dung..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Add Rule Form */}
              <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black text-slate-700 uppercase mb-1 ml-1 flex items-center gap-2">
                  <i className="fa-solid fa-plus-circle text-amber-500"></i>
                  {ruleTab === 'system' ? 'Luật thế giới (System Prompt)' : 'Tiền tố (Prefix)'}
                </h3>
                <p className="text-[10px] text-slate-500 italic mb-4 ml-1 leading-relaxed">
                  {ruleTab === 'system' 
                    ? 'Luật chung bắt buộc AI phải tuân thủ (VD: bối cảnh thế giới, cách xưng hô, tính cách cốt lõi). AI sẽ đọc luật này trước khi phản hồi.' 
                    : 'Đoạn text sẽ được tự động chèn vào trước mỗi tin nhắn của bạn (VD: cấm tả nội tâm, bắt buộc dùng ngôi thứ 3) để ép AI làm theo.'}
                </p>
                <div className="space-y-3">
                  <input 
                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border border-transparent focus:bg-white focus:border-amber-300 outline-none transition-all"
                    placeholder="Tên gợi nhớ (VD: Nghiêm túc, Hài hước...)"
                    value={newRuleName}
                    onChange={e => setNewRuleName(e.target.value)}
                  />
                  <textarea 
                    className="w-full p-3 bg-slate-50 rounded-xl text-xs border border-transparent focus:bg-white focus:border-amber-300 outline-none transition-all h-24 resize-none leading-relaxed"
                    placeholder={ruleTab === 'system' ? "Nhập Prompt hệ thống..." : "Nhập đoạn text mở đầu..."}
                    value={newRuleContent}
                    onChange={e => setNewRuleContent(e.target.value)}
                  />
                  <button 
                    onClick={handleSaveRule} 
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 transition-all active:scale-95"
                  >
                    <i className="fa-solid fa-plus mr-1"></i> Lưu
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {filteredRules.length > 0 && searchQuery && (
                <div className="text-[10px] text-slate-500 font-bold px-2 flex items-center gap-2">
                  <i className="fa-solid fa-filter"></i>
                  Tìm thấy {filteredRules.length} kết quả
                </div>
              )}
              
              {/* Empty State */}
              {currentRules.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic text-[11px]">
                  <i className="fa-solid fa-inbox text-4xl mb-4 opacity-20"></i>
                  <p className="font-bold mb-2">Chưa có thiết lập nào.</p>
                  <p className="text-[10px]">Hãy tạo {ruleTab === 'system' ? 'quy tắc' : 'tiền tố'} đầu tiên!</p>
                </div>
              )}

              {/* List Rules */}
              <div className="space-y-3">
                {filteredRules.map(rule => (
                  <div key={rule.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm group hover:border-amber-100 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase flex-1 flex items-center gap-2">
                        <i className="fa-solid fa-file-lines text-amber-500 text-[10px]"></i>
                        {rule.name}
                      </h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEditPopup(rule)}
                          className="text-slate-300 hover:text-amber-500 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteRule(rule.id)} 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <i className="fa-solid fa-skull"></i>
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">
                        {rule.content}
                      </p>
                    </div>
                  </div>
                ))}
                
                {filteredRules.length === 0 && searchQuery && (
                  <div className="text-center py-12 text-slate-400 italic text-[10px]">
                    <i className="fa-solid fa-search text-3xl mb-3 opacity-20"></i>
                    <p>Không tìm thấy kết quả phù hợp với "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: API KEYS */}
        {activeTab === 'apikeys' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 rounded-[1.5rem] text-white shadow-lg shadow-blue-200 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 text-6xl -mr-4 -mt-2"><i className="fa-solid fa-key"></i></div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-1">Gemini API Keys</h3>
              <p className="text-[10px] opacity-80 mb-4 pr-10">Quản lý danh sách Key để đảm bảo AI luôn hoạt động. Hệ thống sẽ tự động xoay vòng Key.</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setShowKeyGuide(true)} 
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2"
                >
                  <i className="fa-regular fa-circle-question"></i> Hướng dẫn lấy Key
                </button>
                <div className="bg-amber-400/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold uppercase border border-amber-400/30 flex items-center gap-2">
                  <i className="fa-solid fa-lightbulb"></i> Khuyên dùng: Ít nhất 3 Key
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex gap-2">
                <input 
                  className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-mono border border-transparent focus:bg-white focus:border-blue-300 outline-none transition-all tracking-wide"
                  placeholder="AIzaSy..."
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                />
                <button 
                  onClick={handleAddKey} 
                  className="w-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {currentKeys.map((k, idx) => {
                const isPaused = k.pausedUntil && k.pausedUntil > Date.now();
                return (
                  <div key={idx} className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${k.isActive ? (isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-slate-300'}`} title={isPaused ? 'Đang tạm dừng' : 'Đang hoạt động'}></div>
                      <span className="text-[10px] font-mono text-slate-600 truncate select-all">
                        {k.value.length > 12 ? `${k.value.substring(0, 8)}...${k.value.substring(k.value.length - 6)}` : k.value}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {/* Pause Button */}
                       {k.isActive && (
                           <button 
                             onClick={() => handlePauseKey(idx)}
                             className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-colors ${isPaused ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500'}`}
                           >
                             {isPaused ? 
                               `Mở lại sau: ${formatCountdown(k.pausedUntil!)}` : 
                               'Tạm dừng'}
                           </button>
                        )}

                      <button 
                        onClick={() => handleDeleteKey(k.value)} 
                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center"
                      >
                        <i className="fa-solid fa-skull text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
              {currentKeys.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-[10px]">
                  <i className="fa-solid fa-key text-3xl mb-3 opacity-20"></i>
                  <p>Chưa có API Key nào.</p>
                </div>
              )}
            </div>

            {/* GROQ KEYS */}
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-5 rounded-[1.5rem] text-white shadow-lg shadow-red-200 relative overflow-hidden mt-8">
              <div className="absolute right-0 top-0 opacity-10 text-6xl -mr-4 -mt-2"><i className="fa-solid fa-key"></i></div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-1">Groq API Keys</h3>
              <p className="text-[10px] opacity-80 mb-4 pr-10">Quản lý danh sách Key Groq. Hệ thống sẽ tự động xoay vòng Key.</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setShowGroqKeyGuide(true)} 
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2"
                >
                  <i className="fa-regular fa-circle-question"></i> Hướng dẫn lấy Key Groq
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex gap-2">
                <input 
                  className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-mono border border-transparent focus:bg-white focus:border-blue-300 outline-none transition-all tracking-wide"
                  placeholder="gsk_..."
                  value={newGroqKey}
                  onChange={e => setNewGroqKey(e.target.value)}
                />
                <button 
                  onClick={handleAddGroqKey} 
                  className="w-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {currentGroqKeys.map((k, idx) => {
                const isPaused = k.pausedUntil && k.pausedUntil > Date.now();
                return (
                  <div key={idx} className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${k.isActive ? (isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-slate-300'}`} title={isPaused ? 'Đang tạm dừng' : 'Đang hoạt động'}></div>
                      <span className="text-[10px] font-mono text-slate-600 truncate select-all">
                        {k.value.length > 12 ? `${k.value.substring(0, 8)}...${k.value.substring(k.value.length - 6)}` : k.value}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {/* Pause Button */}
                       {k.isActive && (
                           <button 
                             onClick={() => handlePauseKey(idx, 'groq')}
                             className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-colors ${isPaused ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500'}`}
                           >
                             {isPaused ? 
                               `Mở lại sau: ${formatCountdown(k.pausedUntil!)}` : 
                               'Tạm dừng'}
                           </button>
                        )}

                      <button 
                        onClick={() => handleDeleteKey(k.value, 'groq')} 
                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center"
                      >
                        <i className="fa-solid fa-skull text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
              {currentGroqKeys.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-[10px]">
                  <i className="fa-solid fa-key text-3xl mb-3 opacity-20"></i>
                  <p>Chưa có Groq API Key nào.</p>
                </div>
              )}
            </div>

            {/* PROXY KEYS */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-5 rounded-[1.5rem] text-white shadow-lg shadow-purple-200 relative overflow-hidden mt-8">
              <div className="absolute right-0 top-0 opacity-10 text-6xl -mr-4 -mt-2"><i className="fa-solid fa-network-wired"></i></div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-1">Custom OpenAI / Proxy</h3>
              <p className="text-[10px] opacity-80 mb-4 pr-10">Kết nối với các dịch vụ tương thích OpenAI (Pawan, OpenRouter, LocalAI...)</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
               {PROXY_PRESETS.map((preset, idx) => (
                 <button 
                   key={idx}
                   onClick={() => handleApplyProxyPreset(preset)}
                   className="whitespace-nowrap px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl text-[10px] font-bold text-purple-700 transition-colors flex items-center gap-2"
                 >
                   <i className="fa-solid fa-bolt"></i>
                   {preset.name}
                 </button>
               ))}
            </div>

            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm space-y-3">
              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Base URL</label>
                  <input 
                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-mono border border-transparent focus:bg-white focus:border-purple-300 outline-none transition-all tracking-wide"
                    placeholder="https://api.pawan.krd/cosmosrp/v1"
                    value={newProxyBaseUrl}
                    onChange={e => setNewProxyBaseUrl(e.target.value)}
                  />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Model Name</label>
                  <input 
                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-mono border border-transparent focus:bg-white focus:border-purple-300 outline-none transition-all tracking-wide"
                    placeholder="cosmosrp-2.5"
                    value={newProxyModel}
                    onChange={e => setNewProxyModel(e.target.value)}
                  />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">API Key (Optional)</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-mono border border-transparent focus:bg-white focus:border-purple-300 outline-none transition-all tracking-wide"
                      placeholder="pk-..."
                      value={newProxyKey}
                      onChange={e => setNewProxyKey(e.target.value)}
                    />
                    <button 
                      onClick={handleAddProxyConfig} 
                      className="w-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center"
                    >
                      <i className="fa-solid fa-save"></i>
                    </button>
                  </div>
              </div>
            </div>

            <div className="space-y-3">
               {settings.apiConfigs?.find(c => c.provider === 'proxy')?.keys.map((k, idx) => (
                  <div key={idx} className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${k.isActive ? 'bg-purple-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-slate-700 truncate">
                            {settings.apiConfigs?.find(c => c.provider === 'proxy')?.activeModel}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 truncate select-all">
                            {settings.apiConfigs?.find(c => c.provider === 'proxy')?.baseUrl}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 truncate select-all">
                            Key: {k.value.length > 8 ? `${k.value.substring(0, 4)}...${k.value.substring(k.value.length - 4)}` : k.value}
                          </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteProxyKey(k.value)} 
                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center"
                      >
                        <i className="fa-solid fa-skull text-[10px]"></i>
                      </button>
                    </div>
                  </div>
               ))}
               
               {(!settings.apiConfigs?.find(c => c.provider === 'proxy') || settings.apiConfigs?.find(c => c.provider === 'proxy')?.keys.length === 0) && (
                 <div className="text-center py-8 text-slate-400 italic text-[10px]">
                   <i className="fa-solid fa-network-wired text-3xl mb-3 opacity-20"></i>
                   <p>Chưa có cấu hình Proxy nào.</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* VIEW: WELFARE */}
        {activeTab === 'welfare' && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Auro Coin Explanation */}
            <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                  <i className="fa-solid fa-coins text-xl text-amber-500"></i>
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Auro Coin</h4>
                  <p className="text-[9px] text-slate-400 font-bold">Đơn vị tiền tệ chung của các thế giới</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Auro Coin là loại tiền tệ cao cấp nhất, có thể dùng để mua <strong className="text-slate-600">nội thất đặc biệt</strong>, <strong className="text-slate-600">đổi sang tiền tệ</strong> trong thế giới hiện tại, hoặc kiếm được thông qua <strong className="text-slate-600">nhiệm vụ và các tính năng khác</strong>.
              </p>
            </div>

            {/* UNALLOCATED REWARDS SECTION */}
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100/50 p-6">
              <h3 className="text-sm font-black text-slate-700 uppercase mb-3 ml-1 flex items-center gap-2">
                <i className="fa-solid fa-box-open text-indigo-500"></i>
                Phần thưởng chưa phân phối
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-center">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Auro Coin</p>
                  <p className="text-xl font-black text-indigo-600">{(settings.unallocatedAuroCoins || 0).toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
                  <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">Vật phẩm</p>
                  <p className="text-xl font-black text-purple-600">{(settings.unallocatedItems || []).length}</p>
                </div>
              </div>

              {((settings.unallocatedAuroCoins || 0) > 0 || (settings.unallocatedItems || []).length > 0) && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phân phối vào thế giới:</p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                    {slots.map(slot => (
                      <button 
                        key={slot.id}
                        onClick={() => handleDistributeToSlot(slot)}
                        disabled={isDistributing}
                        className="w-full p-3 bg-slate-50 hover:bg-white hover:border-indigo-300 border border-transparent rounded-xl flex items-center gap-3 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                          <img src={slot.charAvatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[10px] font-black text-slate-700 uppercase truncate">{slot.charName}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">{slot.userName}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
                      </button>
                    ))}
                    {slots.length === 0 && (
                      <p className="text-center py-4 text-[10px] text-slate-400 italic">Chưa có nhân vật nào để phân phối.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* GIFT CODE SECTION */}
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100/50 p-6">
              <h3 className="text-sm font-black text-slate-700 uppercase mb-3 ml-1 flex items-center gap-2">
                <i className="fa-solid fa-ticket text-amber-500"></i>
                Nhập Gift Code
              </h3>
              <div className="flex gap-2">
                <input 
                  className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:bg-white focus:border-amber-300 outline-none transition-all"
                  placeholder="Nhập mã quà tặng của bạn..."
                  value={giftCode}
                  onChange={e => setGiftCode(e.target.value)}
                />
                <button 
                  onClick={handleRedeemGiftCode}
                  disabled={isRedeeming || !giftCode.trim()}
                  className="px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRedeeming ? <i className="fa-solid fa-spinner fa-spin"></i> : 'NHẬN'}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 ml-1 italic">* Mỗi mã chỉ có thể sử dụng một lần duy nhất.</p>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100/50 p-6">
              <h3 className="text-sm font-black text-slate-700 uppercase mb-3 ml-1 flex items-center gap-2">
                <i className="fa-solid fa-heart text-red-500"></i>
                Ủng hộ & Phúc lợi
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">Nếu bạn yêu thích dự án, bạn có thể ủng hộ tác giả. Mỗi lượt ủng hộ sẽ nhận được Auro Coin như một lời cảm ơn để sử dụng các tính năng đặc biệt.</p>
              </div>

              <div className="mt-6">
                <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-lg shadow-emerald-100 p-5 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl"></div>
                  
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Nhập số tiền ủng hộ</p>
                  <div className="relative mt-2 mb-2">
                      <input
                          type="number"
                          value={donationAmount}
                          onChange={(e) => {
                              const value = e.target.value;
                              setDonationAmount(value);
                          }}
                          onBlur={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (isNaN(value) || value < 111) {
                                setDonationAmount('111');
                            }
                          }}
                          className="w-full bg-slate-100 rounded-lg p-3 pr-16 text-right font-black text-2xl text-slate-800 border-2 border-transparent focus:bg-white focus:border-emerald-300 outline-none"
                          placeholder="Tối thiểu 111"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">VNĐ</span>
                  </div>
                  <p className="text-center text-xs font-bold text-slate-500">Bạn sẽ nhận được <span className="text-emerald-500">{(parseInt(donationAmount || '0')).toLocaleString()} Auro Coin</span></p>
                  
                  <button 
                      onClick={handleGenerateDonationCode}
                      disabled={isGeneratingCode || parseInt(donationAmount || '0') < 111}
                      className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      {isGeneratingCode ? (
                          <><i className="fa-solid fa-spinner fa-spin"></i> Đang tạo mã...</>
                      ) : (
                          <>Lấy mã ủng hộ</>
                      )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      {/* --- GIFT RESULT POPUP --- */}
      {giftResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`p-6 text-center ${giftResult.success ? 'bg-gradient-to-br from-emerald-50 to-green-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg ${giftResult.success ? 'bg-emerald-100 text-emerald-500 shadow-emerald-200' : 'bg-red-100 text-red-500 shadow-red-200'}`}>
                <i className={`fa-solid ${giftResult.success ? 'fa-gift text-4xl animate-bounce' : 'fa-circle-exclamation text-3xl'}`}></i>
              </div>
              <h3 className={`text-lg font-black uppercase tracking-wider mb-2 ${giftResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                {giftResult.success ? 'Thành Công!' : 'Thất Bại'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                {giftResult.message}
              </p>
              
              {giftResult.success && giftResult.reward && (
                  <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Phần thưởng nhận được</p>
                      {giftResult.reward.coins && (
                          <div className="flex items-center justify-center gap-2 text-amber-500 font-black text-xl mb-1">
                              <i className="fa-solid fa-coins"></i> +{giftResult.reward.coins.toLocaleString()}
                          </div>
                      )}
                      {giftResult.reward.item && (
                          <div className="flex items-center justify-center gap-2 text-purple-600 font-bold text-sm">
                              <i className={`${giftResult.reward.item.icon}`}></i> {giftResult.reward.item.name}
                          </div>
                      )}
                      <p className="text-[9px] text-slate-400 mt-2 italic">(Đã thêm vào kho chưa phân phối)</p>
                  </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-center">
              <button 
                onClick={() => setGiftResult(null)}
                className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DISTRIBUTE MODAL --- */}
      {distributeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white shrink-0">
              <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-heart"></i> Phân Phối Tài Sản
              </h3>
              <p className="text-[10px] opacity-90 mt-1">Chuyển tài sản chưa phân phối cho nhân vật</p>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                {/* Target Info */}
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={distributeTarget.charAvatar} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Người nhận</p>
                        <h4 className="font-black text-slate-700 uppercase">{distributeTarget.charName}</h4>
                    </div>
                </div>

                {/* Coins Input */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <i className="fa-solid fa-coins text-amber-500 mr-1"></i> Auro Coin
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">
                            Tối đa: {(settings.unallocatedAuroCoins || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="relative">
                        <input 
                            type="range" 
                            min="0" 
                            max={settings.unallocatedAuroCoins || 0} 
                            value={distributeAmount} 
                            onChange={(e) => setDistributeAmount(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-3"
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={distributeAmount}
                                onChange={(e) => {
                                    let val = parseInt(e.target.value);
                                    if (isNaN(val)) val = 0;
                                    if (val > (settings.unallocatedAuroCoins || 0)) val = (settings.unallocatedAuroCoins || 0);
                                    if (val < 0) val = 0;
                                    setDistributeAmount(val);
                                }}
                                className="flex-1 p-3 bg-slate-50 rounded-xl text-sm font-black text-slate-700 border-2 border-transparent focus:bg-white focus:border-indigo-300 outline-none transition-all text-center"
                            />
                            <button 
                                onClick={() => setDistributeAmount(settings.unallocatedAuroCoins || 0)}
                                className="px-4 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-100 transition-colors"
                            >
                                TẤT CẢ
                            </button>
                        </div>
                    </div>
                </div>

                {/* Items Selection */}
                {(settings.unallocatedItems || []).length > 0 && (
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <i className="fa-solid fa-box text-purple-500 mr-1"></i> Vật phẩm ({selectedDistributeItems.length}/{(settings.unallocatedItems || []).length})
                            </label>
                            <button 
                                onClick={() => {
                                    if (selectedDistributeItems.length === (settings.unallocatedItems || []).length) {
                                        setSelectedDistributeItems([]);
                                    } else {
                                        setSelectedDistributeItems((settings.unallocatedItems || []).map(i => i.id));
                                    }
                                }}
                                className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 uppercase"
                            >
                                {selectedDistributeItems.length === (settings.unallocatedItems || []).length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                            {(settings.unallocatedItems || []).map((item, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => {
                                        if (selectedDistributeItems.includes(item.id)) {
                                            setSelectedDistributeItems(prev => prev.filter(id => id !== item.id));
                                        } else {
                                            setSelectedDistributeItems(prev => [...prev, item.id]);
                                        }
                                    }}
                                    className={`p-2 rounded-xl border-2 cursor-pointer flex items-center gap-2 transition-all ${selectedDistributeItems.includes(item.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedDistributeItems.includes(item.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                        <i className="fa-solid fa-check text-[8px]"></i>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-700 truncate">{item.name}</p>
                                        <p className="text-[8px] text-slate-400 truncate">{item.category}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-3 shrink-0">
              <button 
                onClick={() => setDistributeTarget(null)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleConfirmDistribute}
                disabled={isDistributing || (distributeAmount === 0 && selectedDistributeItems.length === 0)}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all"
              >
                {isDistributing ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: DELETE KEY CONFIRMATION */}
      {deleteKeyConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
                <i className="fa-solid fa-skull text-3xl text-red-500 animate-pulse"></i>
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Hóa kiếp Key?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Bạn có chắc muốn xóa Key này không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setDeleteKeyConfirm(null)}
                className="flex-1 py-4 bg-white hover:bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200"
              >
                Hủy
              </button>
              <button 
                onClick={executeDeleteKey}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 transition-all"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardView;
