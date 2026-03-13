import { useState } from 'react';
import { FirebaseConfig, SaveSlot } from '../types';
import { FirebaseService } from '../services/firebaseService';

export function useWorldManager(
  firebaseRef: React.MutableRefObject<FirebaseService>,
  setNotification: (notif: { title: string; message: string; type?: 'info' | 'warning' | 'success' | 'error' } | null) => void,
  setView: (view: any) => void,
  setSettings: (settings: any) => void,
  settings: any
) {
  const [worldId, setWorldId] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<'offline' | 'online'>('offline');
  const [serverName, setServerName] = useState("Offline");
  const [totalServerCount, setTotalServerCount] = useState(0);
  const [currentPinCode, setCurrentPinCode] = useState<string>("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentFirebaseConfig, setCurrentFirebaseConfig] = useState<FirebaseConfig | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  const handleJoinWorld = async (id: string, mode: 'offline' | 'online') => {
    setWorldId(id);
    setAppMode(mode);
    setView('saves');
    
    firebaseRef.current.saveLastSession({
      slotId: null,
      worldId: id,
      appMode: mode,
      serverName: mode === 'offline' ? 'Cục bộ' : serverName,
      currentView: 'saves'
    });
  };

  const handlePreloadOnline = async (
    id: string,
    config: FirebaseConfig,
    name: string,
    pinCode: string,
    bypassPin: boolean = false
  ) => {
    try {
      await firebaseRef.current.initialize(config, name);
      setCurrentFirebaseConfig(config);
      const result = await firebaseRef.current.connectWorld(id, pinCode, bypassPin);
      setServerName(name);
      setWorldId(result.normalizedId);
      setTotalServerCount(result.count);
      setCurrentPinCode(pinCode);
      
      firebaseRef.current.saveLastSession({
        slotId: null,
        worldId: result.normalizedId,
        appMode: 'online',
        serverName: name,
        firebaseConfig: config,
        pinCode: pinCode,
        currentView: 'saves'
      });
      
      if (result.error === 'QUOTA_EXCEEDED_CACHE_MISS') {
          setIsOfflineMode(true);
          setNotification({ 
              title: 'Chế độ ngoại tuyến', 
              message: 'Máy chủ đang quá tải. Bạn đang dùng dữ liệu lưu trên máy. Game sẽ tự đồng bộ khi có mạng lại.',
              type: 'warning' 
          });
      } else {
          setIsOfflineMode(false);
      }
      
      return { success: true, count: result.count, exists: result.exists, error: result.error };
    } catch (e: any) {
      return { success: false, count: 0, exists: false, error: e.message };
    }
  };

  const getLocalSlotsForWorld = (wId: string): SaveSlot[] => {
    const localSlots: SaveSlot[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('save_')) {
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
            const data = JSON.parse(dataStr);
            const matchesWorld = !data.worldId || data.worldId === wId;
            
            if (data.character && data.user && matchesWorld) {
              localSlots.push({
                id: key.replace('save_', ''),
                charName: data.character.name,
                charAvatar: data.character.avatar,
                userName: data.user.name,
                lastPlayed: data.character.updatedAt || Date.now(),
                level: data.character.relationshipScore ? Math.floor(data.character.relationshipScore / 100) + 1 : 1,
                isLocalOnly: true
              });
            }
          }
        }
      }
    } catch (e) { console.warn("Error reading local slots:", e); }
    return localSlots;
  };

  const handleEnterOnline = async () => {
    if (!worldId) return;
    setIsLoading(true);
    setAppMode('online');
    try {
      const fbSettings = await firebaseRef.current.loadAppSettings();
      if (fbSettings) {
        const mergedSettings = { ...settings, ...fbSettings };
        setSettings(mergedSettings);
        localStorage.setItem('auro_settings', JSON.stringify(mergedSettings));
      }
      
      // Try loading only user's characters first (prioritize)
      let onlineSlots = await firebaseRef.current.loadWorldCharacters(worldId, 50, true);
      
      // If no characters found for user, or if we want to show others too, load more
      if (onlineSlots.length === 0) {
        onlineSlots = await firebaseRef.current.loadWorldCharacters(worldId, 500, false);
      }

      setSlots(onlineSlots.sort((a, b) => b.lastPlayed - a.lastPlayed));
      setView('saves');
    } catch (e) {
      const localSlots = getLocalSlotsForWorld(worldId);
      if (localSlots.length > 0) {
        setSlots(localSlots);
        setView('saves');
        setNotification({ title: 'Chế độ ngoại tuyến', message: "Máy chủ đang bận. Đang hiển thị dữ liệu lưu trên máy.", type: 'warning' });
      } else {
        setNotification({ title: 'Lỗi', message: "Không thể tải dữ liệu." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAllCharacters = async () => {
    if (!worldId) return;
    setIsLoadingMore(true);
    try {
      const onlineSlots = await firebaseRef.current.loadWorldCharacters(worldId, 500);
      setSlots(prevSlots => {
        const localSlotsInState = prevSlots.filter(s => s.isLocalOnly);
        const mergedSlots = [...onlineSlots];
        localSlotsInState.forEach(ls => {
          if (!mergedSlots.find(os => os.id === ls.id)) {
            mergedSlots.push(ls);
          }
        });
        return mergedSlots.sort((a, b) => b.lastPlayed - a.lastPlayed);
      });
    } catch (e) {
      setNotification({ title: 'Lỗi', message: "Lỗi tải danh sách." });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadLocalCharacters = () => {
    if (!worldId) return;
    const localSlots = getLocalSlotsForWorld(worldId);
    setSlots(prevSlots => {
      const mergedSlots = [...prevSlots];
      localSlots.forEach(ls => {
        if (!mergedSlots.find(os => os.id === ls.id)) {
          mergedSlots.push({ ...ls, isLocalOnly: true });
        }
      });
      return mergedSlots.sort((a, b) => b.lastPlayed - a.lastPlayed);
    });
    setNotification({ title: 'Thành công', message: "Đã tải dữ liệu trình duyệt.", type: 'success' });
  };

  const handleSyncLocalToCloud = async () => {
    if (!worldId || !firebaseRef.current.isReady()) {
      setNotification({ title: 'Lỗi', message: "Vui lòng kết nối máy chủ trước khi đồng bộ.", type: 'error' });
      return;
    }
    
    setIsLoading(true);
    setSyncProgress({ current: 0, total: 0 });
    try {
      const localSlots = getLocalSlotsForWorld(worldId);
      if (localSlots.length === 0) {
        setNotification({ title: 'Thông báo', message: "Không tìm thấy dữ liệu trình duyệt để đồng bộ.", type: 'info' });
        setIsLoading(false);
        setSyncProgress(null);
        return;
      }

      setSyncProgress({ current: 0, total: localSlots.length });
      let successCount = 0;
      for (const slot of localSlots) {
        const dataStr = localStorage.getItem(`save_${slot.id}`);
        if (dataStr) {
          const data = JSON.parse(dataStr);
          if (data.character && data.user) {
            await firebaseRef.current.saveCharacterToWorld(
              slot.id,
              data.character,
              data.user,
              data.messages || []
            );
            localStorage.removeItem(`save_${slot.id}`);
            successCount++;
            setSyncProgress({ current: successCount, total: localSlots.length });
            // Add a delay between slots to prevent write stream exhaustion
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      setNotification({ 
        title: 'Thành công', 
        message: `Đã đồng bộ ${successCount} cư dân lên máy chủ.`, 
        type: 'success' 
      });
      
      // Refresh list
      handleEnterOnline();
    } catch (e: any) {
      setNotification({ title: 'Lỗi đồng bộ', message: e.message || "Có lỗi xảy ra khi đồng bộ.", type: 'error' });
    } finally {
      setIsLoading(false);
      setSyncProgress(null);
    }
  };

  return {
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
    syncProgress,
    handleJoinWorld,
    handlePreloadOnline,
    handleEnterOnline,
    handleLoadAllCharacters,
    handleLoadLocalCharacters,
    handleSyncLocalToCloud,
    getLocalSlotsForWorld
  };
}
