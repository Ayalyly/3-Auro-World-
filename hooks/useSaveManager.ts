import { useRef, useState, useEffect } from 'react';
import { Character, UserProfile, Message, FirebaseConfig, SaveSlot, AuraExportData, InventoryItem, Property, Sender } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { DistributionService } from '../services/distributionService';
import { PRESET_QUESTS, migrateUserQuests } from '../services/questService';

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

export function useSaveManager(
  firebaseRef: React.MutableRefObject<FirebaseService>,
  worldId: string | null,
  appMode: 'offline' | 'online',
  serverName: string,
  currentFirebaseConfig: FirebaseConfig | null,
  currentPinCode: string,
  isOfflineMode: boolean,
  setIsOfflineMode: (v: boolean) => void,
  setSlots: React.Dispatch<React.SetStateAction<SaveSlot[]>>,
  setTotalServerCount: React.Dispatch<React.SetStateAction<number>>,
  setIsLoading: (v: boolean) => void,
  setNotification: (notif: { title: string; message: string; type?: 'info' | 'warning' | 'success' | 'error' } | null) => void,
  setView: (view: any) => void,
  isAppInitializing: boolean,
  handleUpdateSettings: (s: any) => void
) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [messages, setMessages] = useState<Message[]>([]);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const distributionServiceRef = useRef<DistributionService>(new DistributionService(firebaseRef.current));

  useEffect(() => {
    distributionServiceRef.current = new DistributionService(firebaseRef.current);
  }, [firebaseRef.current]);

  const syncToFirebase = (char: Character, userObj: UserProfile, msgs: Message[]): Promise<void> => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    return new Promise((resolve) => {
      syncTimeoutRef.current = setTimeout(async () => {
        if (isSyncingRef.current) {
          // If already syncing, reschedule
          syncToFirebase(char, userObj, msgs);
          resolve();
          return;
        }

        try {
          isSyncingRef.current = true;
          const slotId = (window as any).currentSlotId as string | undefined;
          if (!slotId) {
            resolve();
            return;
          }

          const saveData = { character: char, user: userObj, messages: msgs, worldId: worldId };
          try {
            localStorage.setItem(`save_${slotId}`, JSON.stringify(saveData));
          } catch (e) {
            console.warn("Local backup save failed:", e);
          }

          // Filter out temporary thinking messages before saving to cloud
          const msgsToSave = msgs.filter(m => !m.isThinking);

          if (appMode === 'online' && worldId && firebaseRef.current.isReady() && !isOfflineMode) {
            try {
              await firebaseRef.current.saveCharacterToWorld(slotId, char, userObj, msgsToSave);
            } catch (e: any) {
              if (e.message && e.message.includes("resource-exhausted")) {
                  console.error("🔥 FIREBASE QUOTA EXCEEDED. Pausing cloud sync.");
                  setIsOfflineMode(true);
                  setNotification({
                      title: "Máy chủ quá tải",
                      message: "Server đang quá tải. Game đã tự chuyển sang chế độ ngoại tuyến để bảo vệ dữ liệu của bạn.",
                      type: "warning"
                  });
              } else {
                  console.warn("Cloud sync failed (non-critical):", e);
              }
            }
          }
        } catch (e) {
          console.error("Sync error:", e);
        } finally {
          isSyncingRef.current = false;
          resolve();
        }
      }, 10000);
    });
  };

  useEffect(() => {
    const slotId = (window as any).currentSlotId;
    if (!isAppInitializing && character && user && slotId) {
      syncToFirebase(character, user, messages);
    }
  }, [messages, character, user, isAppInitializing]);

  const handleUpdateCharacter = (newChar: Character) => {
    setCharacter(newChar);
    syncToFirebase(newChar, user, messages);
  };

  const handleLoadCharacter = async (slotId: string) => {
    if (!slotId) return;
    setIsLoading(true);
    try {
      let charLoaded: Character | null = null;
      let userLoaded: UserProfile | null = null;
      let msgs: Message[] = [];

      if (appMode === 'online') {
        const data = await firebaseRef.current.loadCharacterDetail(slotId, 5);
        if (data?.char) {
          charLoaded = data.char;
          userLoaded = data.user;
          msgs = data.msgs || [];
        } else {
          const s = localStorage.getItem(`save_${slotId}`);
          if (s) {
            try {
              const d = JSON.parse(s);
              charLoaded = d.character;
              userLoaded = d.user;
              msgs = d.messages || [];
              setIsOfflineMode(true);
              setNotification({
                title: 'Chế độ ngoại tuyến',
                message: 'Không thể tải từ Cloud. Đang dùng dữ liệu lưu trên máy.',
                type: 'warning'
              });
            } catch (e) {}
          }
        }
      } else {
        const s = localStorage.getItem(`save_${slotId}`);
        if (s) {
          try {
            const d = JSON.parse(s);
            charLoaded = d.character;
            userLoaded = d.user;
            msgs = d.messages || [];
          } catch (e) {
            console.warn("Parse error:", e);
          }
        }
      }

      if (charLoaded) {
        setCharacter(charLoaded);
        setUser(migrateUserQuests(userLoaded || DEFAULT_USER));
        setMessages(msgs);
        setView('chat');
        (window as any).currentSlotId = slotId;

        firebaseRef.current.saveLastSession({
          slotId,
          worldId,
          appMode,
          serverName,
          firebaseConfig: appMode === 'online' ? currentFirebaseConfig || undefined : undefined,
          pinCode: currentPinCode,
          currentView: 'chat'
        });
      } else {
        setNotification({ title: 'Lỗi', message: "Không tìm thấy dữ liệu nhân vật." });
      }
    } catch (e) {
      console.error("Lỗi tải nhân vật:", e);
      setNotification({ title: 'Lỗi', message: "Lỗi tải nhân vật. Vui lòng kiểm tra kết nối mạng." });
    } finally {
      setIsLoading(false);
    }
  };

  const executeDeleteCharacter = async (slotId: string) => {
    setIsLoading(true);
    try {
      if (appMode === 'online' && worldId) await firebaseRef.current.deleteCharacter(slotId);
      else localStorage.removeItem(`save_${slotId}`);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      setTotalServerCount((prev) => Math.max(0, prev - 1));
      if ((window as any).currentSlotId === slotId) {
        firebaseRef.current.clearLastSession();
        (window as any).currentSlotId = null;
      }
    } catch (e: any) {
      setNotification({ title: 'Lỗi', message: "Lỗi xoá: " + e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributeRewards = async (slotId: string, coins: number, items: InventoryItem[]) => {
    try {
      await distributionServiceRef.current.distributeRewards(slotId, coins, items, appMode);
      
      if ((window as any).currentSlotId === slotId) {
        const furniture = items.filter(i => i.isFurniture);
        const regular = items.filter(i => !i.isFurniture);

        setUser(prev => ({
          ...prev,
          auroCoins: (prev.auroCoins || 0) + coins,
          inventory: [...(prev.inventory || []), ...regular],
          furnitureInventory: [...(prev.furnitureInventory || []), ...furniture]
        }));
      }
    } catch (e) {
      console.error("Distribute error:", e);
      throw e;
    }
  };

  const handleSetupComplete = async (
    newChar: Character,
    newUser: Partial<UserProfile>,
    inv: InventoryItem[],
    props: Property[],
    curr: string
  ) => {
    setIsLoading(true);

    const initialUser = {
      ...DEFAULT_USER,
      ...newUser,
      inventory: inv.filter(i => !i.isFurniture),
      furnitureInventory: inv.filter(i => i.isFurniture),
      properties: props,
      currencyName: curr,
      quests: PRESET_QUESTS.map(q => ({ ...q, progress: 0 }))
    } as UserProfile;

    const initialMessages: Message[] = [
      {
        id: 'msg-0',
        sender: Sender.AI,
        text: newChar.openingMessage,
        timestamp: Date.now(),
        branchId: 'main'
      }
    ];
    
    const charWithBranch: Character = {
      ...newChar,
      branches: [{ id: 'main', name: 'Nhánh chính (Gốc)', createdAt: Date.now() }]
    };

    setCharacter(charWithBranch);
    setUser(initialUser);
    setMessages(initialMessages);

    const slotId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    (window as any).currentSlotId = slotId;

    syncToFirebase(charWithBranch, initialUser, initialMessages);

    setSlots((prev) => [
      ...prev,
      {
        id: slotId,
        charName: charWithBranch.name,
        charAvatar: charWithBranch.avatar,
        userName: initialUser.name,
        lastPlayed: Date.now(),
        level: 1
      }
    ]);
    
    if (appMode === 'online') setTotalServerCount((prev) => prev + 1);

    firebaseRef.current.saveLastSession({
      slotId,
      worldId,
      appMode,
      serverName,
      firebaseConfig: appMode === 'online' ? currentFirebaseConfig || undefined : undefined,
      pinCode: currentPinCode,
      currentView: 'chat'
    });
    
    setIsLoading(false);
    setView('chat');
  };

  const handleImportData = async (exportData: AuraExportData, options: any) => {
    setIsLoading(true);
    try {
      if (options.importChar && exportData.character) setCharacter(exportData.character);
      if (options.importUser && exportData.user) setUser(migrateUserQuests(exportData.user));
      if (options.importChat && exportData.messages) setMessages(exportData.messages);
      if (options.importSettings && exportData.settings) handleUpdateSettings(exportData.settings);
      
      if (exportData.character) {
        let slotId = (window as any).currentSlotId;
        
        if (!slotId || options.importMode === 'new_slot') {
          slotId = `import_${Date.now()}`;
          (window as any).currentSlotId = slotId;
        }
        
        localStorage.setItem(`save_${slotId}`, JSON.stringify({
          character: exportData.character,
          user: exportData.user || user || DEFAULT_USER,
          messages: exportData.messages || messages || []
        }));

        firebaseRef.current.saveLastSession({
          slotId,
          worldId: null,
          appMode: 'offline',
          serverName: options.importMode === 'new_slot' ? 'Imported' : (character?.name || 'Imported'),
          pinCode: '',
          currentView: 'chat'
        });
      }

      setView('chat');
    } catch (e) {
      console.error("Import failed:", e);
      setNotification({ title: 'Lỗi', message: "Lỗi khi nhập dữ liệu." });
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
}
