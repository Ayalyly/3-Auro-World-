
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Character, UserProfile, Message, AppSettings, AppView, SaveSlot,
  FirebaseConfig, InventoryItem, Property, Sender, PromptPreset, AuraExportData, Branch, Relation, Quest, Memory, SocialComment, DiaryEntry, Mood
} from './types';
import { AffectionManager } from './services/affectionService';
import { TransactionService } from './services/transactionService';
import { GeminiService } from './services/geminiService';
import { ShopService } from './services/shopService';
import { FirebaseService } from './services/firebaseService';
import { GoogleSheetService } from './services/googleSheetService';
import { GiftCodeService } from './services/giftCodeService';
import { translations } from './lang/translations';
import { useSettings } from './hooks/useSettings';
import { PRESET_QUESTS, migrateUserQuests } from './services/questService';
import { parseSystemTag } from './services/utils';

console.log("App Version: 1.2.5-stable");

import MessageBubble from './components/MessageBubble';
import InputBar from './components/InputBar';
import CharacterHeader from './components/CharacterHeader';
import SetupScreen from './components/SetupScreen';
import ShopView from './components/ShopView';
import RealisticPhoneView from './components/RealisticPhoneView';
import SocialAppView from './components/SocialAppView';
import InventoryView from './components/InventoryView';
import GachaView from './components/GachaView';
import CharacterCard from './components/CharacterCard';
import AuroCardView from './components/AuroCardView';
import WorldGateScreen from './components/WorldGateScreen';
import TimelineView from './components/TimelineView';
import SettingsModal from './components/SettingsModal';
import DashboardView from './components/DashboardView';
import UserProfileView from './components/UserProfileView';
import HomeRoomView from './components/HomeRoomView';
import MainChatView from './components/MainChatView';
import QuestView from './components/QuestView';
import MemoriesView from './components/MemoriesView';


const DEFAULT_USER: UserProfile = {
  name: 'Traveler',
  avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=User',
  description: 'A traveler from another world.',
  money: 1000,
  auroCoins: 1000,
  currencyName: 'Xu',
  inventory: [],
  furnitureInventory: [],
  properties: [],
  transactions: [],
  purchaseHistory: [],
  quests: PRESET_QUESTS.map(q => ({ ...q, progress: 0 }))
};


const OverlayWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 bg-slate-100 h-[100dvh] w-full overflow-hidden animate-in slide-in-from-bottom-2 duration-150">
    {children}
  </div>
);

import { useWorldManager } from './hooks/useWorldManager';
import { useSaveManager } from './hooks/useSaveManager';

export default function App() {
  const [view, setView] = useState<AppView>('setup');
  const { settings, setSettings, saveSettingsToStorage, handleUpdateRules, DEFAULT_SETTINGS } = useSettings();
  const [currentBranchId, setCurrentBranchId] = useState<string>('main');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [lastAffectionChange, setLastAffectionChange] = useState<number | null>(null);
  const [showAuroCard, setShowAuroCard] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [shopItems, setShopItems] = useState<InventoryItem[]>([]);
  const [notification, setNotification] = useState<{ title: string; message: string; type?: 'info' | 'warning' | 'success' | 'error' } | null>(null);
  const [dismissedOfflineWarning, setDismissedOfflineWarning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Fix for users stuck on 'user_phone' view after update
  useEffect(() => {
    if (view === 'user_phone' as any) {
      setView('phone');
    }
  }, [view]);

  const geminiRef = useRef(new GeminiService());
  const shopServiceRef = useRef(new ShopService(geminiRef.current));
  const firebaseRef = useRef(new FirebaseService());
  const googleSheetServiceRef = useRef(new GoogleSheetService('https://docs.google.com/spreadsheets/d/e/2PACX-1vSerLDs3kgEj05VtJKRk0hYL6BDY6woEqyECiKzerdz4jb7ZfgVmS-X7cbzSgA0t_fDoPE1bXAuJemr/pub?gid=0&single=true&output=csv'));
  const giftCodeServiceRef = useRef(new GiftCodeService(settings.giftCodeSheetUrl || ''));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const t = (key: string) => translations[key] || key;

  const {
    worldId, setWorldId,
    appMode, setAppMode,
    serverName, setServerName,
    totalServerCount, setTotalServerCount,
    currentPinCode, setCurrentPinCode,
    isOfflineMode, setIsOfflineMode,
    currentFirebaseConfig, setCurrentFirebaseConfig,
    slots, setSlots,
    isLoading, setIsLoading,
    isLoadingMore, setIsLoadingMore,
    handleJoinWorld,
    handlePreloadOnline,
    handleEnterOnline,
    handleLoadAllCharacters,
    handleLoadLocalCharacters,
    handleSyncLocalToCloud,
    getLocalSlotsForWorld
  } = useWorldManager(firebaseRef, setNotification, setView, setSettings, settings);

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    const oldLang = settings.language || 'vi';
    const newLang = newSettings.language || 'vi';

    setSettings(newSettings);
    saveSettingsToStorage(newSettings);
    if (appMode === 'online' && firebaseRef.current.isReady()) {
      firebaseRef.current.saveAppSettings(newSettings);
    }

    // Sync Gemini Keys
    const geminiConfig = newSettings.apiConfigs?.find(c => c.provider === 'gemini');
    if (geminiConfig && geminiConfig.keys) {
      geminiRef.current.updateKeys(geminiConfig.keys);
    }

    // Sync Groq Keys
    const groqConfig = newSettings.apiConfigs?.find(c => c.provider === 'groq');
    if (groqConfig && groqConfig.keys) {
      geminiRef.current.updateGroqKeys(groqConfig.keys);
    }

    // Update proxy settings
    const proxyConfig = newSettings.apiConfigs?.find(c => c.provider === 'proxy');
    if (proxyConfig) {
        geminiRef.current.updateProxySettings({
            baseUrl: proxyConfig.baseUrl || '',
            apiKey: proxyConfig.keys?.[0]?.value || '',
            modelName: proxyConfig.model || '',
            isActive: true
        });
    } else {
        geminiRef.current.updateProxySettings(null);
    }

    // Handle Language Change - Translate Opening Message
    if (oldLang !== newLang && character) {
      try {
        setNotification({ title: 'Đang chuyển ngôn ngữ...', message: `Đang dịch lời mở đầu sang ${newLang === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}...` });
        const translatedOpening = await geminiRef.current.translateText(character.openingMessage, newLang);
        
        const updatedChar = { ...character, openingMessage: translatedOpening };
        setCharacter(updatedChar);
        
        // Also update the first message if it's the opening message
        setMessages(prev => prev.map((msg, idx) => {
          if (idx === 0 && msg.sender === Sender.CHARACTER) {
            return { ...msg, text: translatedOpening };
          }
          return msg;
        }));

        if (appMode === 'online') {
          syncToFirebase(updatedChar, user, messages);
        }
        
        setNotification({ title: 'Thành công', message: `Đã chuyển sang ${newLang === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}` });
      } catch (error) {
        console.error("Failed to translate opening message:", error);
        setNotification({ title: 'Lỗi', message: 'Không thể dịch lời mở đầu. Vui lòng thử lại.' });
      }
    }
  };

  useEffect(() => {
    if (settings.apiConfigs) {
      // Sync Gemini Keys
      const geminiConfig = settings.apiConfigs.find(c => c.provider === 'gemini');
      if (geminiConfig && geminiConfig.keys) {
        geminiRef.current.updateKeys(geminiConfig.keys);
      }

      // Sync Groq Keys
      const groqConfig = settings.apiConfigs.find(c => c.provider === 'groq');
      if (groqConfig && groqConfig.keys) {
        geminiRef.current.updateGroqKeys(groqConfig.keys);
      }

      // Sync Proxy
      const proxyConfig = settings.apiConfigs.find(c => c.provider === 'proxy');
      if (proxyConfig) {
          geminiRef.current.updateProxySettings({
              baseUrl: proxyConfig.baseUrl || '',
              apiKey: proxyConfig.keys?.[0]?.value || '',
              modelName: proxyConfig.model || '',
              isActive: true
          });
      }
    }
  }, [settings.apiConfigs]);

  const {
    character, setCharacter,
    user, setUser,
    messages, setMessages,
    syncToFirebase,
    handleUpdateCharacter,
    handleLoadCharacter,
    executeDeleteCharacter,
    handleDistributeRewards,
    handleSetupComplete,
    handleImportData,
    DEFAULT_USER
  } = useSaveManager(
    firebaseRef, worldId, appMode, serverName, currentFirebaseConfig, currentPinCode,
    isOfflineMode, setIsOfflineMode, setSlots, setTotalServerCount, setIsLoading,
    setNotification, setView, isAppInitializing, handleUpdateSettings
  );

  useEffect(() => {
    (window as any).onDistributeRewards = handleDistributeRewards;
    return () => {
      delete (window as any).onDistributeRewards;
    };
  }, [handleDistributeRewards]);

  const characterRef = useRef<Character | null>(null);
  useEffect(() => { characterRef.current = character; }, [character]);

  const handleUpdateKeys = (newKeys: string[]) => {
    const uc = settings.apiConfigs?.map((c) =>
      c.provider === 'gemini'
        ? { ...c, keys: newKeys.map((v) => ({ value: v, isActive: true })) }
        : c
    );
    handleUpdateSettings({ ...settings, apiConfigs: uc });
    geminiRef.current.updateKeys(newKeys.filter((k) => k.trim()).map(k => ({ value: k, isActive: true })));
  };

  useEffect(() => {
    const fetchShopItems = async () => {
        try {
            const items = await googleSheetServiceRef.current.getShopItems();
            // Filter out the problematic "Thưởng" item if it exists
            const filteredItems = items.filter(i => i.name !== 'Thưởng' && i.name !== 'Reward');
            setShopItems(filteredItems);
        } catch (error) {
            console.error("Failed to fetch shop items:", error);
        }
    };
    fetchShopItems();
  }, []);

  useEffect(() => {
    if (settings.giftCodeSheetUrl) {
      giftCodeServiceRef.current = new GiftCodeService(settings.giftCodeSheetUrl);
    }
  }, [settings.giftCodeSheetUrl]);

  // ================================================================
  // SYNC TO FIREBASE — LUÔN BACKUP LOCAL, ONLINE THÌ ĐẨY LÊN CLOUD
  // ================================================================

  useEffect(() => {
    const fetchShopItems = async () => {
      if (!character) return;
      try {
        console.log("Fetching shop items from Google Sheet...");
        const items = await googleSheetServiceRef.current.getShopItems();
        console.log("Fetched items:", items);
        if (items.length > 0) {
          setCharacter(prevChar => {
            if (!prevChar) return null;
            // Only update if shopItems have actually changed to prevent infinite loops
            const currentItemsStr = JSON.stringify(prevChar.world?.shopItems || []);
            const newItemsStr = JSON.stringify(items);
            if (currentItemsStr === newItemsStr) return prevChar;
            
            const updatedChar = {
              ...prevChar,
              world: {
                ...(prevChar.world || {}),
                shopItems: items,
              },
            };
            return updatedChar;
          });
        }
      } catch (error) {
        console.error("Failed to fetch shop items from Google Sheet:", error);
      }
    };

    fetchShopItems();
  }, [character?.id]); // Rerun when character changes

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const displayedMessages = useMemo((): Message[] => {
    if (!character) return messages;

    const allBranches = character.branches && character.branches.length > 0 
        ? character.branches 
        : [{ id: 'main', name: 'Nhánh chính (Gốc)', createdAt: 0, isPinned: true }];
    const branchMap = new Map(allBranches.map(b => [b.id, b]));

    const getMessagesRecursive = (branchId: string): Message[] => {
        const branch = branchMap.get(branchId);
        if (!branch) return [];

        // Base case: main branch
        if (branch.id === 'main' || !branch.parentId) {
            return messages.filter(m => m.branchId === 'main' || !m.branchId);
        }

        // Recursive step: get parent messages
        const parentMessages = getMessagesRecursive(branch.parentId);

        // Find the fork point in the parent's message list
        let history = parentMessages;
        if (branch.forkMessageId) {
            const forkIndex = parentMessages.findIndex(m => m.id === branch.forkMessageId);
            if (forkIndex !== -1) {
                // Take history up to and including the fork message
                history = parentMessages.slice(0, forkIndex + 1);
            }
        }
        
        // Get messages specific to the current branch
        const currentBranchMessages = messages.filter(m => m.branchId === branchId);

        return [...history, ...currentBranchMessages];
    };

    const rawMessages = getMessagesRecursive(currentBranchId);
    const seen = new Set<string>();
    return rawMessages.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

  }, [character, messages, currentBranchId]);

  useEffect(() => {
    (window as any).openTimeline = () => setView('timeline');
    return () => { delete (window as any).openTimeline; };
  }, []);





  const handleRedeemGiftCode = async (code: string) => {
    try {
      const codes = await giftCodeServiceRef.current.getGiftCodes();
      const gift = codes.find(c => c.code === code);
      
      if (!gift) {
        return { success: false, message: "Mã không hợp lệ." };
      }

      if (user.usedGiftCodes?.includes(code)) {
        return { success: false, message: "Bạn đã dùng mã này rồi." };
      }

      let reward: { coins?: number; item?: InventoryItem } = {};
      let message = gift.description;

      if (gift.type === 'COIN') {
          const amount = typeof gift.value === 'string' ? parseInt(gift.value as string) : gift.value as number;
          reward.coins = amount;
          message = `Nhận được ${amount} Xu Auro!`;
          
          const updatedUser = {
              ...user,
              auroCoins: (user.auroCoins || 0) + amount,
              usedGiftCodes: [...(user.usedGiftCodes || []), code]
          };
          setUser(updatedUser);
          if (character) syncToFirebase(character, updatedUser, messages);
      } else if (gift.type === 'ITEM' || gift.type === 'SKIN' || gift.type === 'NOITHAT' || gift.type === 'FURNITURE') {
          let item = shopItems.find(i => i.id === gift.value);
          if (!item) {
              const isFurniture = gift.type === 'NOITHAT' || gift.type === 'FURNITURE';
              item = {
                id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: gift.description,
                icon: gift.type === 'SKIN' ? 'fa-solid fa-shirt' : (isFurniture ? 'fa-solid fa-couch' : 'fa-solid fa-gift'),
                description: `Phần quà từ mã: ${gift.code}`,
                value: 0,
                affinityBonus: 5,
                category: gift.type === 'SKIN' ? 'Skin' : (isFurniture ? 'Nội thất' : 'Gift'),
                quantity: 1,
                isFurniture: isFurniture
              };
          }
          
          reward.item = item;
          message = `Nhận được vật phẩm: ${item.name}!`;
          
          const isFurniture = item.isFurniture;
          const updatedUser = { ...user, usedGiftCodes: [...(user.usedGiftCodes || []), code] };
          
          if (isFurniture) {
              updatedUser.furnitureInventory = [...(user.furnitureInventory || []), item];
          } else {
              updatedUser.inventory = [...(user.inventory || []), item];
          }
          
          setUser(updatedUser);
          if (character) syncToFirebase(character, updatedUser, messages);
      }

      return { success: true, message, reward };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Lỗi khi nhập mã." };
    }
  };

  const handleSaveMemory = (message: Message) => {
    if (!character) return;
    const newMemory: Memory = {
      id: `mem_${message.id}`,
      type: 'message',
      content: message.text,
      messageId: message.id,
      timestamp: Date.now(),
    };
    const updatedMemories = [...(character.memories || []), newMemory];
    const updatedChar = { ...character, memories: updatedMemories };
    handleUpdateCharacter(updatedChar);
    // Optional: Add a visual confirmation/toast here
  };



  // ================================================================
  // SCHEDULED TRANSACTIONS
  // ================================================================
  const processScheduledTransactions = () => {
    if (!character) return;
    const now = Date.now();
    let uc = { ...character };
    let changed = false;

    if (character.incomeStreams) {
      uc.incomeStreams = character.incomeStreams.map((s) => {
        if (s.isActive && s.nextPayment <= now) {
          uc.money = (uc.money || 0) + s.amount;
          uc.transactions = [
            {
              id: `tx-${Date.now()}`,
              type: 'IN' as const,
              amount: s.amount,
              description: `Thu nhập: ${s.name}`,
              date: now
            },
            ...(uc.transactions || [])
          ];
          changed = true;
          const iv =
            s.frequency === 'hourly'
              ? 3600000
              : s.frequency === 'daily'
              ? 86400000
              : s.frequency === 'weekly'
              ? 604800000
              : 2592000000;
          return { ...s, nextPayment: now + iv };
        }
        return s;
      });
    }

    if (character.expenses) {
      uc.expenses = character.expenses.map((e) => {
        if (e.isActive && e.nextPayment <= now) {
          uc.money = Math.max(0, (uc.money || 0) - e.amount);
          uc.transactions = [
            {
              id: `tx-${Date.now()}`,
              type: 'OUT' as const,
              amount: e.amount,
              description: `Chi phí: ${e.name}`,
              date: now
            },
            ...(uc.transactions || [])
          ];
          changed = true;
          const iv =
            e.frequency === 'daily'
              ? 86400000
              : e.frequency === 'weekly'
              ? 604800000
              : 2592000000;
          return { ...e, nextPayment: now + iv };
        }
        return e;
      });
    }

    if (changed) {
      setCharacter(uc);
      handleUpdateCharacter(uc);
    }
  };

  useEffect(() => {
    const iv = setInterval(processScheduledTransactions, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [character]);

  // ================================================================
  // REGENERATE MESSAGE (VERSIONING)
  // ================================================================
  const handleRegenerate = async (messageId: string) => {
    if (!character) return;

    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = messages[msgIndex];
    if (targetMsg.sender !== Sender.AI) return;

    // History is everything before this message
    const history = messages.slice(0, msgIndex);
    
    // Find the last user message for context (the prompt)
    const lastUserMsg = history.slice().reverse().find(m => m.sender === Sender.USER);
    if (!lastUserMsg) return;

    const thinkingId = 'thinking-' + Date.now();

    // Show thinking state temporarily (optional, or just loading spinner on button)
    // For better UX, let's replace the content with thinking or show a global loader
    // But to keep it simple and robust, let's just set isThinking on the message itself temporarily?
    // No, that might flicker. Let's insert a thinking bubble AFTER the current one or just show loading.
    // Actually, the user expects the bubble to update.
    
    // Let's set a temporary "isRegenerating" state or just let the UI handle it?
    // We'll use the existing thinking bubble pattern but insert it after the target message temporarily?
    // No, let's just call API and update.
    
    try {
      // Create a temporary thinking message to show activity
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.splice(msgIndex + 1, 0, {
            id: thinkingId,
            sender: Sender.AI,
            text: '',
            timestamp: Date.now(),
            isThinking: true,
            branchId: currentBranchId
        });
        return newMsgs;
      });

      const response = await geminiRef.current.sendMessage(
        character,
        history, // Context up to this point
        lastUserMsg.text, // Re-use the last user prompt
        user,
        settings,
        lastUserMsg.images || (lastUserMsg.image ? [lastUserMsg.image] : undefined)
      );

      // Remove thinking bubble
      setMessages(prev => prev.filter(m => m.id !== thinkingId));

      // Update the target message with new version
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const newVersions = [...(m.versions || []), { text: response.text, timestamp: Date.now() }];
          // If it didn't have versions before, add the original text as the first version
          if (!m.versions || m.versions.length === 0) {
             newVersions.unshift({ text: m.text, timestamp: m.timestamp });
          }
          
          return {
            ...m,
            text: response.text,
            versions: newVersions,
            currentVersionIndex: newVersions.length - 1,
            isEdited: false // Reset edited flag if it was edited, or keep it? Usually regen resets.
          };
        }
        return m;
      }));

      // Handle side effects (money, gifts) - OPTIONAL: Might duplicate rewards if we are not careful.
      // Usually regen shouldn't grant rewards again, but for simplicity let's allow it or maybe skip it?
      // Let's skip side effects for regeneration to prevent farming.
      
    } catch (e: any) {
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
      console.error("Regenerate failed", e);
      // Optionally show error toast
    }
  };

  const handleVersionChange = (messageId: string, direction: 'prev' | 'next') => {
      setMessages(prev => prev.map(m => {
          if (m.id === messageId && m.versions) {
              let newIndex = (m.currentVersionIndex || 0) + (direction === 'next' ? 1 : -1);
              newIndex = Math.max(0, Math.min(newIndex, m.versions.length - 1));
              return {
                  ...m,
                  text: m.versions[newIndex].text,
                  currentVersionIndex: newIndex
              };
          }
          return m;
      }));
  };

  const addCharacterMessageToChat = (text: string) => {
    if (!character) return;
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: Sender.CHARACTER,
      text: text,
      timestamp: Date.now(),
      branchId: currentBranchId,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // ================================================================
  // SEND MESSAGE
  // ================================================================
  const handleSendMessage = async (text: string, images?: string[]) => {
    if (!character) return;
    if (isApiKeyMissing) {
      setShowSettingsModal(true);
      return;
    }

    // --- PROCESS USER TRANSACTIONS (GIFT/TRANSFER) ---
    let processedText = text;
    let transactionResult: { user: UserProfile; character: Character; success: boolean; message?: string } | undefined;

    // 1. Check Transfer
    const transferMatch = text.match(/(?:\[|\b)(?:CHUYỂN_KHOẢN|CK|TRANSFER|SEND):\s*(\d+)(?:\]|\b)/i);
    if (transferMatch) {
      const amount = parseInt(transferMatch[1]);
      transactionResult = TransactionService.processUserToChar(user, character, amount);
      if (!transactionResult.success) {
         processedText = processedText.replace(transferMatch[0], `[GIAO DỊCH THẤT BẠI: ${transactionResult.message}]`);
         setNotification({ title: 'Giao dịch thất bại', message: transactionResult.message || '' });
         transactionResult = undefined;
      }
    }

    // 2. Check Gift
    const giftMatch = text.match(/\[TẶNG:\s*(\S+)\s+(.*?)\]/i);
    if (giftMatch) {
      const itemName = giftMatch[2].trim().toUpperCase();
      const item = user.inventory.find(i => i.name.toUpperCase() === itemName);
      
      if (item) {
          const currentUser = transactionResult ? transactionResult.user : user;
          const currentChar = transactionResult ? transactionResult.character : character;
          
          const giftResult = TransactionService.processUserToChar(currentUser, currentChar, 0, item);
          if (giftResult.success) {
              transactionResult = giftResult;
          } else {
              processedText = processedText.replace(giftMatch[0], `[TẶNG THẤT BẠI: ${giftResult.message}]`);
              setNotification({ title: 'Tặng quà thất bại', message: giftResult.message || '' });
          }
      } else {
        processedText = processedText.replace(giftMatch[0], `[TẶNG THẤT BẠI: Không có vật phẩm ${itemName}]`);
        setNotification({ title: 'Tặng quà thất bại', message: `Bạn không có vật phẩm ${itemName} trong túi.` });
      }
    }

    // Apply Updates
    if (transactionResult) {
        setUser(transactionResult.user);
        setCharacter(transactionResult.character);
    }

    const userMsg: Message = {
      id: Date.now().toString() + Math.random().toString(),
      sender: Sender.USER,
      text: processedText,
      image: images?.[0], // Keep first image for backward compatibility
      images: images,
      timestamp: Date.now(),
      branchId: currentBranchId,
      versions: [{ text: processedText, timestamp: Date.now() }],
      currentVersionIndex: 0
    };
    setMessages((prev) => [...prev, userMsg]);

    const aiMsgId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    
    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Add initial AI message with thinking state
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: Sender.AI,
          text: '',
          timestamp: Date.now(),
          isThinking: true,
          branchId: currentBranchId,
          versions: [{ text: '', timestamp: Date.now() }],
          currentVersionIndex: 0
        }
      ]);

      let fullText = '';
      const stream = geminiRef.current.sendMessageStream(
        character,
        [...displayedMessages, userMsg],
        processedText,
        user,
        settings,
        images,
        abortController.signal
      );

      for await (const chunk of stream) {
        if (abortController.signal.aborted) {
            break;
        }
        fullText += chunk;
        setMessages((prev) => 
          prev.map((m) => 
            m.id === aiMsgId 
              ? { 
                  ...m, 
                  text: fullText, 
                  isThinking: false,
                  versions: [{ text: fullText, timestamp: m.timestamp }],
                } 
              : m
          )
        );
      }

      // --- POST-STREAM PROCESSING ---
      if (!abortController.signal.aborted) {
      
      // 1. Parse Tags
      const aiTransferMatch = fullText.match(/\[(?:CHUYỂN_KHOẢN|CK|TRANSFER|SEND):\s*(\d+)\]/i);
      const aiGiftMatch = fullText.match(/\[TẶNG:\s*(.*?)\s+(.*?)\]/i);
      const aiLUMMatch = fullText.match(/\[LỤM:\s*(.*?)\s+(.*?)\]/i);
      const aiYoutubeMatch = fullText.match(/\[YOUTUBE:\s*(.*?)\]/i);
      const affectionChange = AffectionManager.parseAffectionTag(fullText);

      if (aiYoutubeMatch && character.reactions) {
          const reaction = aiYoutubeMatch[1].trim();
          const videoId = character.reactions[reaction];
          if (videoId) {
              setPlayingVideoId(videoId);
          }
      }

      // 1. Parse System Tag
      const { cleanText: parsedCleanText, systemData: systemUpdate } = parseSystemTag(fullText);

      // 2. Clean Text
      let cleanText = AffectionManager.cleanAffectionTag(parsedCleanText);
      cleanText = cleanText.replace(/\[(?:CHUYỂN_KHOẢN|CK|TRANSFER|SEND):\s*\d+\]/gi, "");
      cleanText = cleanText.replace(/\[TẶNG:\s*.*?\s+.*?\]/gi, "");
      cleanText = cleanText.replace(/\[LỤM:\s*.*?\s+.*?\]/gi, "");
      cleanText = cleanText.replace(/\[YOUTUBE:\s*.*?\]/gi, "");

      // Update message with clean text
      setMessages((prev) => 
        prev.map((m) => 
          m.id === aiMsgId 
            ? { 
                ...m, 
                text: cleanText,
                versions: [{ text: cleanText, timestamp: m.timestamp }]
              } 
            : m
        )
      );

      // 3. Handle Affection
      let updatedChar = character;
      if (affectionChange && affectionChange !== 0) {
          updatedChar = AffectionManager.updateScore(updatedChar, affectionChange);
          setLastAffectionChange(affectionChange);
          setTimeout(() => setLastAffectionChange(null), 5000);
      }

      // 4. Handle AI Gifts/Transfers/LUM
      let finalChar = updatedChar;
      let finalUser = user;

      if (aiTransferMatch || aiGiftMatch || aiLUMMatch) {
          const transferAmount = aiTransferMatch ? parseInt(aiTransferMatch[1]) : 0;
          let giftItem: InventoryItem | undefined;
          
          if (aiGiftMatch || aiLUMMatch) {
            const match = aiGiftMatch || aiLUMMatch;
            giftItem = {
              id: "gift-" + Date.now(),
              icon: match![1].trim(),
              name: match![2].trim(),
              description: aiLUMMatch ? `Vật phẩm bạn nhặt được` : `Quà từ ${character.name}`,
              value: 0,
              affinityBonus: aiLUMMatch ? 5 : 10,
              category: aiLUMMatch ? "Found" : "Gift"
            };
          }

          const result = TransactionService.processCharToUser(finalUser, finalChar, transferAmount, giftItem);
          finalChar = result.character;
          finalUser = result.user;
          
          let notifMsg = "";
          const currencyName = finalUser.currencyName || 'tiền';
          if (transferAmount && giftItem) {
            notifMsg = `${character.name} đã chuyển cho bạn ${transferAmount} ${currencyName} và ${aiLUMMatch ? 'bạn đã nhặt được' : 'tặng bạn món quà'}: ${giftItem.icon} ${giftItem.name}`;
          } else if (transferAmount) {
            notifMsg = `${character.name} đã chuyển cho bạn ${transferAmount} ${currencyName}`;
          } else if (giftItem) {
            notifMsg = aiLUMMatch 
              ? `Bạn đã nhặt được: ${giftItem.icon} ${giftItem.name}`
              : `${character.name} đã tặng bạn món quà: ${giftItem.icon} ${giftItem.name}`;
          }
          
          if (notifMsg) {
            setNotification({ title: 'Bạn nhận được quà!', message: notifMsg });
          }
      }

      // 5. Handle System Update (Diary, Thoughts, Notes)
      let diaryContent = null;
      let diaryMood = null;

      if (systemUpdate) {
          if (systemUpdate.diary) {
              diaryContent = typeof systemUpdate.diary === 'string' ? systemUpdate.diary : (systemUpdate.diary.content || "");
              diaryMood = (systemUpdate.diary.mood || 'Hạnh phúc') as Mood;
          }
          if (systemUpdate.notes && Array.isArray(systemUpdate.notes)) {
              const newMemories: Memory[] = systemUpdate.notes.map((note: string) => ({
                  id: 'mem-' + Date.now() + Math.random().toString(36).substr(2, 5),
                  type: 'note',
                  content: note,
                  timestamp: Date.now()
              }));
              finalChar.memories = [...(finalChar.memories || []), ...newMemories];
          }
          if (systemUpdate.transaction) {
              const { amount, description } = systemUpdate.transaction;
              if (amount && description) {
                  finalChar = TransactionService.processCharTransaction(finalChar, amount, description);
              }
          }
      }

      // Fallback Diary (if not in system update and every 5 messages)
      if (!diaryContent && messages.length % 5 === 0) {
          try {
              const diary = await geminiRef.current.generateDiaryEntry(
                  finalChar,
                  [...messages, userMsg, { id: aiMsgId, sender: Sender.AI, text: cleanText, timestamp: Date.now(), branchId: currentBranchId }]
              );
              diaryContent = diary.content;
              diaryMood = diary.mood as Mood;
          } catch (e) {
              console.warn("Fallback diary failed", e);
          }
      }

      if (diaryContent) {
          const diaryEntry: DiaryEntry = {
              date: Date.now(),
              content: diaryContent,
              mood: (diaryMood || 'Hạnh phúc') as Mood,
          };
          finalChar.diary = [diaryEntry, ...(finalChar.diary || [])];
          finalChar.mood = diaryEntry.mood;
      }

      // Auto-Memory (Long Term) - Only run if NOT handled by system update
      if (!systemUpdate?.notes && messages.length % 10 === 0) {
          try {
              const existingMemories = (finalChar.memories || []).map(m => m.content);
              const newFacts = await geminiRef.current.autoSummarizeMemory(
                  [...messages, userMsg, { id: aiMsgId, sender: Sender.AI, text: cleanText, timestamp: Date.now(), branchId: currentBranchId }].slice(-20),
                  existingMemories
              );
              
              if (newFacts.length > 0) {
                  const newMemories: Memory[] = newFacts.map(fact => ({
                      id: 'mem-' + Date.now() + Math.random().toString(36).substr(2, 5),
                      type: 'note',
                      content: fact,
                      timestamp: Date.now()
                  }));
                  finalChar.memories = [...(finalChar.memories || []), ...newMemories];
              }
          } catch (e) {
              console.warn("Auto-memory failed", e);
          }
      }

      // 6. Final State Sync
      setUser(finalUser);
      setCharacter(finalChar);
      syncToFirebase(finalChar, finalUser, [...messages, userMsg, { id: aiMsgId, sender: Sender.AI, text: cleanText, timestamp: Date.now(), branchId: currentBranchId }]);
      } else {
          setMessages((prev) => 
            prev.map((m) => 
              m.id === aiMsgId 
                ? { 
                    ...m, 
                    isThinking: false,
                  } 
                : m
            )
          );
      }

    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: Sender.SYSTEM,
          text: `⚠️ ${error?.message || 'Hệ thống AI đang bận.'}`,
          timestamp: Date.now(),
          branchId: currentBranchId
        }
      ]);
    } finally {
        if (abortControllerRef.current === abortController) {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }
  };

  const handleToggleCover = (messageId: string) => {
    setMessages(prev => {
      const newMsgs = prev.map(m => m.id === messageId ? { ...m, isCovered: !m.isCovered } : m);
      if (character && user) {
        syncToFirebase(character, user, newMsgs);
      }
      return newMsgs;
    });
  };

  const handleForkMessage = (messageId: string) => {
    if (!character) return;
    const newBranchId = 'branch-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const uc: Character = {
      ...character,
      branches: [
        ...(character.branches || []),
        {
          id: newBranchId,
          name: `Nhánh ${(character.branches?.length || 0) + 1}`,
          createdAt: Date.now(),
          parentId: currentBranchId,
          forkMessageId: messageId
        }
      ]
    };
    setCharacter(uc);
    setCurrentBranchId(newBranchId);
    setView('timeline');
  };

  // ================================================================
  // SOCIAL APP BACKGROUND GENERATION
  // ================================================================
  const handleGenerateSocialComments = async (postId: string, text: string, isNewPost: boolean = false, image?: string) => {
      if (!character || !user) return;
      
      const shouldAutoComment = settings.behavior?.npcAutoComment ?? true;
      if (!shouldAutoComment) return;

      try {
          const currentChar = characterRef.current; // Use ref for latest data
          const targetPost = currentChar?.socialPosts?.find(p => p.id === postId);
          
          // If it's a new post, it might not be in the ref yet due to React state batching.
          // We can use the passed `text` as the post content.
          const postContent = isNewPost ? text : (targetPost?.content || "");
          const postImage = isNewPost ? image : (targetPost?.image || undefined);

          if (!isNewPost && !targetPost) return;
          
          const socialModel = settings.socialModel || settings.model;
          const stream = isNewPost 
              ? geminiRef.current.generateUserPostReactionsStream(
                  postContent, 
                  user, 
                  currentChar!, 
                  currentChar!.relations || [],
                  messages,
                  postImage,
                  socialModel
              )
              : geminiRef.current.generateMassReactionsToCommentStream(
                  postContent, 
                  text, 
                  user, 
                  currentChar!, 
                  currentChar!.relations || [],
                  messages,
                  socialModel
              );

          for await (const reaction of stream) {
              setCharacter(prevChar => {
                  if (!prevChar) return prevChar;
                  
                  const newAiComment: SocialComment = {
                      id: 'cmt-rep-' + Date.now() + Math.random().toString(36).substr(2, 5),
                      authorName: reaction.authorName,
                      avatar: [prevChar, ...(prevChar.relations || [])].find(rel => rel.name === reaction.authorName)?.avatar || prevChar.avatar,
                      content: reaction.content,
                      timestamp: Date.now(),
                      isUser: false
                  };

                  const finalPosts = prevChar.socialPosts.map(p => 
                      p.id === postId ? { ...p, comments: [...p.comments, newAiComment] } : p
                  );

                  const newNotifications = [...(prevChar.notifications || [])];
                  const isMentioned = newAiComment.content.includes(`@${user.name}`);
                  const isMyPost = prevChar.socialPosts.find(p => p.id === postId)?.authorId === 'USER';
                  
                  if (isMentioned || isMyPost) {
                      newNotifications.unshift({
                          id: `notif-${newAiComment.id}-${Date.now()}`,
                          type: 'COMMENT',
                          actorName: newAiComment.authorName,
                          actorAvatar: newAiComment.avatar,
                          content: newAiComment.content,
                          timestamp: Date.now(),
                          isRead: false
                      });
                  }

                  const updatedChar = { ...prevChar, socialPosts: finalPosts, notifications: newNotifications };
                  syncToFirebase(updatedChar, user, messagesRef.current);
                  return updatedChar;
              });
          }
      } catch (e) {
          console.error("Background comment generation failed:", e);
      }
  };



  // Background Sync Heartbeat
  useEffect(() => {
    if (appMode === 'online' && isOfflineMode && currentFirebaseConfig && worldId) {
      const interval = setInterval(async () => {
        try {
          console.log("[Sync] Heartbeat: Attempting to reconnect to server...");
          const result = await firebaseRef.current.connectWorld(worldId, currentPinCode, true);
          if (result.error !== 'QUOTA_EXCEEDED_CACHE_MISS') {
            console.log("[Sync] Server reconnected!");
            setIsOfflineMode(false);
            setNotification({ 
              title: 'Đã kết nối lại', 
              message: 'Máy chủ đã hoạt động bình thường. Dữ liệu sẽ được đồng bộ.',
              type: 'success' 
            });
          }
        } catch (e) {
          // Still offline
        }
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [appMode, isOfflineMode, currentFirebaseConfig, worldId, currentPinCode]);

  const handleCheckPublicCard = async (token: string) => {
    console.log("[App] Checking public card token:", token);
    try {
      const result = await firebaseRef.current.getPublicCard(token);
      console.log("[App] Public card result:", result ? "Found" : "Not Found");
      return result;
    } catch (e) {
      console.error("[App] Error checking public card:", e);
      return null;
    }
  };

  const handleUseItem = (item: InventoryItem) => {
      if (!item || !item.name) return; // Guard against undefined item or name

      // 1. Handle Gift Items
      if (item.category === 'Gift' || item.name.includes('Thưởng') || item.name.includes('Quà')) {
          const coins = 500 + Math.floor(Math.random() * 1000);
          const updatedUser = {
              ...user,
              auroCoins: (user.auroCoins || 0) + coins,
              inventory: user.inventory.filter(i => i.id !== item.id)
          };
          setUser(updatedUser);
          if (character) syncToFirebase(character, updatedUser, messages);
          setNotification({
              title: 'Mở Quà Thành Công!',
              message: `Bạn đã mở ${item.name} và nhận được ${coins} Xu Auro! ✨`
          });
          return;
      }

      // 2. Handle Furniture Items
      if (item.isFurniture || item.category === 'Furniture' || item.category === 'Nội thất') {
          // Move to furniture inventory
          const newFurnitureInventory = [...(user.furnitureInventory || []), item];
          const newMainInventory = user.inventory.filter(i => i.id !== item.id);
          
          const updatedUser = {
              ...user,
              inventory: newMainInventory,
              furnitureInventory: newFurnitureInventory
          };
          
          setUser(updatedUser);
          if (character) syncToFirebase(character, updatedUser, messages);
          
          setNotification({
              title: 'Đã Chuyển Kho',
              message: `Đã chuyển [${item.name}] vào Kho Nội Thất (Tổ Ấm)! 🏠`
          });
          return;
      }

      // 3. Handle Regular Items (Generic Feedback)
      setNotification({
          title: 'Sử Dụng Vật Phẩm',
          message: `Bạn đã sử dụng ${item.name}. Cảm giác thật tuyệt! ✨`
      });
  };

  const handleDeleteItem = (item: InventoryItem) => {
      const newInventory = [...user.inventory];
      const index = newInventory.findIndex(i => i.id === item.id);
      if (index > -1) {
          newInventory.splice(index, 1);
          const newUser = { ...user, inventory: newInventory };
          setUser(newUser);
          if (character) syncToFirebase(character, newUser, messages);
          setNotification({
              title: 'Đã Xóa',
              message: `Đã xóa ${item.name} khỏi túi đồ.`
          });
      }
  };

  // ================================================================
  // RENDERING
  // ================================================================
  // ================================================================
  // AUTO-RESUME — Mở app → vào thẳng chat đang chơi dở
  // ================================================================
  useEffect(() => {
    const tryAutoResume = async () => {
      setIsAppInitializing(true);
      // Load settings trước
      let loadedSettings = DEFAULT_SETTINGS;
      const saved = localStorage.getItem('auro_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          loadedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) { console.error(e); }
      }
      setSettings(loadedSettings);

      // Tự động khôi phục phiên làm việc cuối cùng
      const lastSession = firebaseRef.current.loadLastSession();
      if (!lastSession?.slotId && !lastSession?.worldId) {
        setIsAppInitializing(false);
        return;
      }

      setIsLoading(true);
      
      // Safety timeout
      const loadingTimeout = setTimeout(() => {
        if (isAppInitializing) {
           console.warn("Auto-resume timed out. Forcing Setup view.");
           setIsLoading(false);
           setIsAppInitializing(false);
           setView('setup');
        }
      }, 10000);

      try {
        const resumeMode = lastSession.appMode;
        const resumeWorldId = lastSession.worldId;

        if (resumeMode === 'online' && lastSession.firebaseConfig) {
          const initPromise = async () => {
             await firebaseRef.current.initialize(lastSession.firebaseConfig!, lastSession.serverName);
             setCurrentFirebaseConfig(lastSession.firebaseConfig!);
             if (resumeWorldId) await firebaseRef.current.connectWorld(resumeWorldId, lastSession.pinCode || "", true);
             
             const fbSettings = await firebaseRef.current.loadAppSettings();
             if (fbSettings) {
               const mergedSettings = { ...loadedSettings, ...fbSettings };
               setSettings(mergedSettings);
               localStorage.setItem('auro_settings', JSON.stringify(mergedSettings));
             }
          };
          
          await Promise.race([
            initPromise(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), 8000))
          ]);
        }

        setWorldId(resumeWorldId);
        setAppMode(resumeMode);
        setServerName(lastSession.serverName);
        setCurrentPinCode(lastSession.pinCode || "");

        if (!lastSession.slotId) {
          // Nếu chưa chọn nhân vật, vào màn hình danh sách nhân vật
          if (resumeMode === 'online' && resumeWorldId) {
            handleEnterOnline();
          } else {
            setView('saves');
          }
          return;
        }

        let charLoaded: Character | null = null;
        let userLoaded: UserProfile | null = null;
        let msgs: Message[] = [];

        if (resumeMode === 'online') {
          const data = await firebaseRef.current.loadCharacterDetail(lastSession.slotId);
          if (data?.char) {
            charLoaded = data.char;
            userLoaded = data.user;
            msgs = data.msgs || [];
          }
        } else {
          const savedDataStr = localStorage.getItem(`save_${lastSession.slotId}`);
          if (savedDataStr) {
            try {
              const sd = JSON.parse(savedDataStr);
              charLoaded = sd.character || null;
              userLoaded = sd.user || null;
              msgs = sd.messages || [];
            } catch (e) { console.warn(e); }
          }
        }

        if (charLoaded) {
          setCharacter(charLoaded);
          setUser(migrateUserQuests(userLoaded || DEFAULT_USER));
          setMessages(msgs);
          setView((lastSession.currentView as AppView) || 'chat');
          (window as any).currentSlotId = lastSession.slotId;
        } else {
          setView('setup');
        }
      } catch (e) {
        console.warn("Auto-resume failed:", e);
        setView('setup');
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        setIsAppInitializing(false);
      }
    };
    tryAutoResume();
  }, []);

  // Sync API keys khi settings đổi
  useEffect(() => {
    const envKey = process.env.GEMINI_API_KEY;
    let hasGeminiKey = false;
    
    if (settings?.apiConfigs) {
      const gc = settings.apiConfigs.find((c: any) => c.provider === 'gemini');
      if (gc?.keys) {
        // Pass full ApiKeyData objects to GeminiService
        const activeKeys = gc.keys.filter((k: any) => k.isActive && k.value);
        if (activeKeys.length > 0) {
          geminiRef.current.updateKeys(activeKeys);
          setIsApiKeyMissing(false);
          hasGeminiKey = true;
        }
      }

      const groqConfig = settings.apiConfigs.find((c: any) => c.provider === 'groq');
      if (groqConfig?.keys) {
        const activeGroqKeys = groqConfig.keys.filter((k: any) => k.isActive && k.value);
        if (activeGroqKeys.length > 0) {
          geminiRef.current.updateGroqKeys(activeGroqKeys);
        } else {
          geminiRef.current.updateGroqKeys([]);
        }
      } else {
        geminiRef.current.updateGroqKeys([]);
      }
    }
    
    // Fallback to env key
    if (!hasGeminiKey) {
      if (envKey) {
        geminiRef.current.updateKeys([{ value: envKey, isActive: true }]);
        setIsApiKeyMissing(false);
      } else {
        geminiRef.current.updateKeys([]);
        setIsApiKeyMissing(true);
      }
    }
  }, [settings?.apiConfigs]);

  // Update Favicon
  useEffect(() => {
    if (settings?.theme?.customIcon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = settings.theme.customIcon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = settings.theme.customIcon;
        document.head.appendChild(newLink);
      }
    }
  }, [settings?.theme?.customIcon]);

  // Lưu lại view hiện tại vào session để khi reload sẽ mở đúng chỗ
  useEffect(() => {
    if (character && view !== 'setup') {
      firebaseRef.current.updateLastSessionView(view);
    }
  }, [view, appMode, worldId, character]);

  const handleGiftItem = async (item: InventoryItem) => {
    if (!character || !user) return;

    const result = TransactionService.processUserToChar(user, character, 0, item);
    if (!result.success) {
        setNotification({
            title: 'Tặng quà thất bại',
            message: result.message || 'Có lỗi xảy ra'
        });
        return;
    }

    setUser(result.user);
    
    // 3. Update Affection
    const bonus = item.affinityBonus || 5;
    const updatedChar = AffectionManager.updateScore(result.character, bonus);
    
    setCharacter(updatedChar);
    handleUpdateCharacter(updatedChar);

    // 4. Notify & Send Message
    setLastAffectionChange(bonus);
    setTimeout(() => setLastAffectionChange(null), 5000);

    // Send a system-like message from user to trigger AI reaction
    await handleSendMessage(`[TẶNG: ${item.icon} ${item.name}] (Người dùng tặng bạn món quà này)`);
    
    // Close inventory
    setView('chat');
  };

  const handleSendMessageToNPC = async (npcId: string, text: string, relation: string) => {
    if (!character) return "...";
    
    // Find NPC info
    const npc = character.relations?.find(r => r.id === npcId) || { name: 'Unknown', description: 'NPC' };
    
    // Get chat history for context
    const rel = user.npcRelations?.find(r => r.npcId === npcId);
    const history = rel?.history || [];

    try {
        const response = await geminiRef.current.chatWithNPC(
            npc.name,
            npc.description || 'Một người quen trong thế giới này.',
            relation,
            user.name,
            history,
            text
        );
        return response;
    } catch (error) {
        console.error("NPC Chat Error:", error);
        return "Hệ thống bận, vui lòng thử lại sau.";
    }
  };

  const renderView = () => {
    if (isAppInitializing) {
      return (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fa-solid fa-wand-magic-sparkles text-2xl text-indigo-500 animate-pulse"></i>
            </div>
          </div>
          <p className="text-indigo-200 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Đang khởi động Auro...</p>
        </div>
      );
    }

    if (view === 'phone' && character)
      return (
        <OverlayWrapper>
          <RealisticPhoneView
            character={character}
            user={user}
            onClose={() => setView('chat')}
            onUpdateCharacter={handleUpdateCharacter}
            onUpdateUser={(u) => {
              setUser(u);
              if (character) syncToFirebase(character, u, messages);
            }}
            onSendMessageToNPC={handleSendMessageToNPC}
            t={t}
            settings={settings}
            geminiService={geminiRef.current}
            onSendMessage={handleSendMessage}
            messages={messages}
          />
        </OverlayWrapper>
      );

    if (view === 'saves')
      return (
        <DashboardView
          slots={slots}
          appMode={appMode}
          serverName={serverName}
          settings={settings}
          user={user}
          geminiService={geminiRef.current}
          giftCodeService={giftCodeServiceRef.current}
          shopItems={shopItems}
          onUpdateUser={(u) => {
            setUser(u);
            if (character) syncToFirebase(character, u, messages);
          }}
          onLoadCharacter={handleLoadCharacter}
          onNewCharacter={() => {
            setCharacter(null);
            setView('char_create');
          }}
          onDeleteCharacter={executeDeleteCharacter}
          onUpdateSettings={handleUpdateSettings}
          onLogout={() => {
            firebaseRef.current.clearLastSession();
            setView('setup');
          }}
          onLoadAllCharacters={handleLoadAllCharacters}
          onLoadLocalCharacters={handleLoadLocalCharacters}
          onSyncLocalToCloud={handleSyncLocalToCloud}
          t={t}
        />
      );

    if (view === 'setup')
      return (
        <WorldGateScreen
          onJoin={handleJoinWorld}
          onPreloadOnlineWorld={handlePreloadOnline}
          onEnterOnlineWorld={handleEnterOnline}
          onImport={(file) => {
            setIsLoading(true); // Start loading
            const r = new FileReader();
            r.onload = (e) => {
              try {
                handleImportData(
                  JSON.parse(e.target?.result as string),
                  {
                    importChar: true,
                    importUser: true,
                    importChat: true,
                    importSettings: true
                  }
                );
              } catch {
                setNotification({ title: 'Lỗi', message: "File không hợp lệ" });
                setIsLoading(false); // Turn off loading on error
              }
            };
            r.readAsText(file);
          }}
          isLoading={isLoading}
          status="Loading..."
          t={t}
          currentLang={settings.language || 'vi'}
          setLanguage={(l) => handleUpdateSettings({ ...settings, language: l })}
          firebaseService={firebaseRef.current}
        />
      );

    if (view === 'char_create')
      return (
        <OverlayWrapper>
          <SetupScreen
            t={t}
            currentLang={settings.language || 'vi'}
            onBack={() => setView('saves')}
            onComplete={handleSetupComplete}
            geminiService={geminiRef.current}
            onNotification={setNotification}
            onCheckPublicCard={handleCheckPublicCard}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        </OverlayWrapper>
      );

    if (view === 'chat' && character) {
      return (
        <MainChatView
          character={character}
          user={user}
          messages={messages}
          displayedMessages={displayedMessages}
          settings={settings}
          isApiKeyMissing={isApiKeyMissing}
          geminiService={geminiRef.current}
          serverName={serverName}
          currentBranchId={currentBranchId}
          appMode={appMode}
          showSettingsModal={showSettingsModal}
          setShowSettingsModal={setShowSettingsModal}
          setView={setView}
          setCurrentBranchId={setCurrentBranchId}
          setMessages={setMessages}
          onSendMessage={handleSendMessage}
          onRegenerate={handleRegenerate}
          onVersionChange={handleVersionChange}
          onFork={handleForkMessage}
          onSaveSettings={handleUpdateSettings}
          onImportData={handleImportData}
          onUpdateCharacter={handleUpdateCharacter}
          onSaveMemory={handleSaveMemory}
          onToggleCover={handleToggleCover}
          onHome={() => setView('home')}
          onDashboard={() => setView('saves')}
          lastAffectionChange={lastAffectionChange}
          isGenerating={isGenerating}
          onStop={handleStopGeneration}
          playingVideoId={playingVideoId}
          setPlayingVideoId={setPlayingVideoId}
        />
      );
    }

    if (view === 'timeline' && character)
      return (
        <OverlayWrapper>
          <TimelineView
            character={character}
            currentBranchId={currentBranchId}
            onSwitchBranch={(id) => {
              setCurrentBranchId(id);
              setView('chat');
            }}
            onUpdateBranches={(b) => {
              const uc = { ...character, branches: b };
              setCharacter(uc);
              handleUpdateCharacter(uc);
            }}
            onClose={() => setView('chat')}
            messages={messages}
          />
        </OverlayWrapper>
      );

    if (view === 'shop' && character)
      return (
        <OverlayWrapper>
          <ShopView
            character={character}
            user={user}
            setUser={setUser}
            onUpdateCharacter={handleUpdateCharacter}
            onClose={() => setView('chat')}
            t={t}
            shopService={shopServiceRef.current}
            shopItems={shopItems}
            settings={settings}
          />
        </OverlayWrapper>
      );

    if (view === 'inventory')
      return (
        <OverlayWrapper>
          <InventoryView
            user={user}
            onUseItem={handleUseItem}
            onDeleteItem={handleDeleteItem}
            onGiftItem={handleGiftItem}
            onClose={() => setView('chat')}
          />
        </OverlayWrapper>
      );

    if (view === 'gacha' && character)
      return (
        <OverlayWrapper>
          <GachaView
            user={user}
            character={character}
            geminiService={geminiRef.current}
            onUpdateUser={(u) => {
              const updatedUser = { ...user, ...u };
              setUser(updatedUser);
            }}
            onUpdateCharacter={(id, char) => {
              const updatedChar = { ...character, ...char };
              setCharacter(updatedChar);
            }}
            onAddMessage={(msg) => handleSendMessage(msg.text)}
            onBack={() => setView('chat')}
            onNavigate={setView}
          />
        </OverlayWrapper>
      );

    if (view === 'social' && character)
      return (
        <OverlayWrapper>
          <SocialAppView
            character={character}
            user={user}
            onClose={() => setView('chat')}
            onUpdateCharacter={handleUpdateCharacter}
            onGenerateSocialComments={handleGenerateSocialComments}
            messages={messages}
            t={t}
            settings={settings}
            geminiService={geminiRef.current}
          />
        </OverlayWrapper>
      );

    if (view === 'char_card' && character)
      return (
        <OverlayWrapper>
          {showAuroCard ? (
            <AuroCardView
              character={character}
              onClose={() => setShowAuroCard(false)}
              onSave={(config) => handleUpdateCharacter({ ...character, cardConfig: config })}
              firebaseService={firebaseRef.current}
            />
          ) : (
            <CharacterCard
              character={character}
              onSave={handleUpdateCharacter}
              onBack={() => setView('chat')}
              isOnline={appMode === 'online'}
              onShare={() => setShowAuroCard(true)}
            />
          )}
        </OverlayWrapper>
      );

    if (view === 'home' && character)
      return (
        <OverlayWrapper>
          <HomeRoomView
            character={character}
            user={user}
            onClose={() => setView('chat')}
            onUpdateCharacter={handleUpdateCharacter}
            onUpdateUser={(u) => {
              setUser(u);
              syncToFirebase(character, u, messages);
            }}
            geminiService={geminiRef.current}
            addCharacterMessageToChat={addCharacterMessageToChat}
            messages={messages}
            onRedeemGiftCode={handleRedeemGiftCode}
            shopItems={shopItems}
            settings={settings}
          />
        </OverlayWrapper>
      );

    if (view === 'profile')
      return (
        <OverlayWrapper>
          <UserProfileView
            user={user}
            onBack={() => setView('chat')}
            onUpdateUser={(u2) => {
              setUser(u2);
              if (character) syncToFirebase(character, u2, messages);
            }}
            isOnline={appMode === 'online'}
            serverName={serverName}
            joinedDate={character?.branches?.[0]?.createdAt || Date.now()}
          />
        </OverlayWrapper>
      );

    if (view === 'quests' && character)
      return (
        <OverlayWrapper>
          <QuestView 
            user={user}
            onClose={() => setView('chat')}
            quests={user.quests || []}
            onUpdateUser={(u) => {
              setUser(u);
              syncToFirebase(character, u, messages);
            }}
          />
        </OverlayWrapper>
      );

    if (view === 'memories' && character)
      return (
          <MemoriesView 
            memories={character.memories || []}
            onClose={() => setView('chat')}
            onDeleteMemory={(memoryId) => {
              if (!character) return;
              const updatedMemories = (character.memories || []).filter(m => m.id !== memoryId);
              const updatedChar = { ...character, memories: updatedMemories };
              handleUpdateCharacter(updatedChar);
            }}
            characterName={character.name}
            characterAvatar={character.avatar}
            userName={user.name}
          />
      );

    if (!character && view === 'chat')
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-100">
          <SetupScreen
            onComplete={handleSetupComplete}
            t={t}
            currentLang={settings.language || 'vi'}
            geminiService={geminiRef.current}
            onBack={() => setView('saves')}
            onNotification={setNotification}
            onCheckPublicCard={handleCheckPublicCard}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        </div>
      );

    return <div className="p-10 text-center">Loading Aura Celestial OS...</div>;
  };

  return (
    <div className="relative w-full h-full">
      {isOfflineMode && !dismissedOfflineWarning && (
        <div className="fixed top-0 left-0 right-0 z-[150] bg-amber-500 text-white text-[10px] font-black py-1 px-4 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
          <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
          <span>ĐANG Ở CHẾ ĐỘ NGOẠI TUYẾN - DỮ LIỆU SẼ ĐƯỢC ĐỒNG BỘ KHI CÓ MẠNG</span>
          <button 
            onClick={() => setDismissedOfflineWarning(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-600 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
      {renderView()}
      {notification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner ${
                notification.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                notification.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                notification.type === 'error' ? 'bg-rose-50 text-rose-500' :
                'bg-indigo-50 text-indigo-500'
              }`}>
                <i className={`fa-solid ${
                  notification.type === 'warning' ? 'fa-triangle-exclamation' :
                  notification.type === 'success' ? 'fa-circle-check' :
                  notification.type === 'error' ? 'fa-circle-xmark' :
                  'fa-bell animate-bounce'
                }`}></i>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">{notification.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{notification.message}</p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className={`w-full mt-2 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all ${
                  notification.type === 'warning' ? 'bg-amber-500 shadow-amber-200' :
                  notification.type === 'success' ? 'bg-emerald-500 shadow-emerald-200' :
                  notification.type === 'error' ? 'bg-rose-500 shadow-rose-200' :
                  'bg-indigo-600 shadow-indigo-200'
                }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
