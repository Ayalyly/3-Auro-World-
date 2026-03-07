
import { initializeApp, FirebaseApp, deleteApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  query,
  orderBy,
  limit,
  getCountFromServer,
  collectionGroup,
  getDocFromCache,
  getDocsFromCache,
  writeBatch
} from "firebase/firestore";
import {
  SaveSlot,
  Character,
  UserProfile,
  Message,
  FirebaseConfig,
  AuroCardData,
  AppSettings
} from "../types";
import { saveSocialPosts, loadSocialPosts } from "./socialService";
import { sanitizePayload, compressBase64 } from "./utils";

// Registry Auro Card công khai (không phải save thế giới chính)
const REGISTRY_CONFIG = {
  apiKey: "AIzaSyCUGJGot0JSmLLe3DhlfHDwRnLgPwKKmcM",
  authDomain: "auro-card-public-library.firebaseapp.com",
  projectId: "auro-card-public-library",
  storageBucket: "auro-card-public-library.firebasestorage.app",
  messagingSenderId: "228225418821",
  appId: "1:228225418821:web:bdd9a4c557fdd5d4fd852c"
};

const DEFAULT_WORLD_CONTEXT = {
  currency: "Xu",
  shopNPCs: [],
  shopItems: []
};

const CHUNK_SIZE = 200;

export class FirebaseService {
  private app: FirebaseApp | undefined;
  private auth: Auth | undefined;
  private db: Firestore | undefined;

  private registryApp: FirebaseApp | undefined;
  private registryDb: Firestore | undefined;

  private currentUser: User | null = null;
  private currentWorldId: string | null = null;
  private isInitialized: boolean = false;
  private serverName: string = "Offline";

  constructor() {}

  // ==========================
  // INIT & REGISTRY
  // ==========================
  public async initialize(config: FirebaseConfig, serverName: string) {
    if (this.isInitialized && this.serverName === serverName && this.app) return;

    if (this.app) {
      try {
        await deleteApp(this.app);
        this.isInitialized = false;
        this.currentUser = null;
      } catch (e) {
        console.warn("Error deleting old app:", e);
      }
    }

    try {
      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = initializeFirestore(this.app, {
        localCache: persistentLocalCache(),
        // experimentalForceLongPolling: true // DISABLED to save quota
      });
      this.isInitialized = true;
      this.serverName = serverName;

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        if (user) console.log(`[Firebase] Auth: ${user.uid}`);
      });

      console.log(`[Firebase] Connected: ${serverName}`);
    } catch (e) {
      console.error("Firebase Init Failed:", e);
      this.isInitialized = false;
      throw new Error("Cấu hình Firebase không hợp lệ hoặc server từ chối kết nối.");
    }
  }

  private initRegistry() {
    if (this.registryDb) return;
    try {
      const existingApps = getApps();
      const found = existingApps.find((a) => a.name === "AuroRegistry");
      if (found) this.registryApp = found;
      else this.registryApp = initializeApp(REGISTRY_CONFIG, "AuroRegistry");
      this.registryDb = getFirestore(this.registryApp);
      console.log("[Firebase] Registry initialized successfully");
    } catch (e) {
      console.error("Registry Init Failed:", e);
    }
  }

  public getServerName(): string {
    return this.serverName;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  private normalizeId(id: string): string {
    if (!id) return "";
    return id
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  // ==========================
  // SESSION LOCAL (AUTO RESUME)
  // ==========================
  public saveLastSession(data: {
    slotId: string | null;
    worldId: string | null;
    appMode: "offline" | "online";
    serverName: string;
    firebaseConfig?: FirebaseConfig;
    pinCode?: string;
    currentView?: string;
  }) {
    try {
      localStorage.setItem("auro_last_session", JSON.stringify(data));
    } catch (e) {
      console.warn("saveLastSession failed:", e);
    }
  }

  public loadLastSession():
    | {
        slotId: string;
        worldId: string | null;
        appMode: "offline" | "online";
        serverName: string;
        firebaseConfig?: FirebaseConfig;
        pinCode?: string;
        currentView?: string;
      }
    | null {
    try {
      const saved = localStorage.getItem("auro_last_session");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("loadLastSession failed:", e);
    }
    return null;
  }

  public updateLastSessionView(view: string) {
    try {
      const saved = localStorage.getItem("auro_last_session");
      if (saved) {
        const data = JSON.parse(saved);
        data.currentView = view;
        localStorage.setItem("auro_last_session", JSON.stringify(data));
      }
    } catch (e) {
      console.warn("updateLastSessionView failed:", e);
    }
  }

  public clearLastSession() {
    localStorage.removeItem("auro_last_session");
  }

  // ==========================
  // SANITIZE
  // ==========================
  private sanitizePayload(data: any): any {
    return sanitizePayload(data);
  }

  private async compressBase64(base64: string, maxWidth = 1200, quality = 0.9): Promise<string> {
    return compressBase64(base64, maxWidth, quality);
  }

  // ==========================
  // UTILS
  // ==========================
  private async withTimeout<T>(promise: Promise<T>, ms: number = 10000, errorMsg: string = "Kết nối quá hạn (Timeout). Vui lòng thử lại."): Promise<T> {
      let timer: any;
      const timeoutPromise = new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(errorMsg)), ms);
      });
      try {
          const result = await Promise.race([promise, timeoutPromise]);
          clearTimeout(timer);
          return result;
      } catch (e) {
          clearTimeout(timer);
          throw e;
      }
  }

  // ==========================
  // ĐỒNG BỘ / CHUYỂN SERVER (MIGRATE)
  // ==========================
  async migrateWorld(
    oldConfig: FirebaseConfig,
    oldServerName: string,
    newConfig: FirebaseConfig,
    sourceWorldId: string,
    sourcePin: string,
    destWorldId: string,
    destPin: string,
    onProgress: (msg: string) => void
  ): Promise<void> {
    const normalizedSourceId = this.normalizeId(sourceWorldId);
    const normalizedDestId = this.normalizeId(destWorldId);
    
    try {
        // 1. Connect to old server (READ ONLY)
        onProgress("Đang kết nối máy chủ cũ...");
        await this.initialize(oldConfig, oldServerName);
        await this.connectWorld(normalizedSourceId, sourcePin, true, true); // bypassPin=true, readOnly=true

        // 2. Download data
        onProgress("Đang tải dữ liệu từ máy chủ cũ...");
        const worldRef = doc(this.db!, "auro_worlds", normalizedSourceId);
        const worldSnap = await this.withTimeout(getDoc(worldRef), 10000, "Lỗi tải thế giới");
        const worldData = worldSnap.exists() ? worldSnap.data() : { pin: sourcePin };
        
        // Use destination pin for the new world
        const newWorldData = { ...worldData, pin: destPin };

        const charsRef = collection(this.db!, "auro_worlds", normalizedSourceId, "characters");
        const charsSnap = await this.withTimeout(getDocs(charsRef), 15000, "Lỗi tải danh sách nhân vật");
        
        const allChars = [];
        let loadedChars = 0;
        for (const charDoc of charsSnap.docs) {
          const charData = charDoc.data();
          const totalChunks = charData.totalChunks || 0;
          const chunks = [];
          for (let i = 0; i < totalChunks; i++) {
            const chunkRef = doc(this.db!, "auro_worlds", normalizedSourceId, "characters", charDoc.id, "message_chunks", i.toString());
            const chunkSnap = await this.withTimeout(getDoc(chunkRef), 10000, `Lỗi tải tin nhắn phần ${i}`);
            if (chunkSnap.exists()) {
              chunks.push({ id: i.toString(), data: chunkSnap.data() });
            }
          }
          allChars.push({ id: charDoc.id, data: charData, chunks });
          loadedChars++;
          onProgress(`Đã tải ${loadedChars}/${charsSnap.docs.length} nhân vật...`);
        }

        // 3. Connect to new server
        onProgress("Đang kết nối máy chủ mới...");
        await this.initialize(newConfig, "Server Riêng");
        
        // Ensure anonymous auth
        if (!this.currentUser && this.auth) {
            const userCred = await this.withTimeout(signInAnonymously(this.auth), 10000, "Lỗi đăng nhập ẩn danh");
            this.currentUser = userCred.user;
        }

        // 4. Upload data
        onProgress("Đang đồng bộ dữ liệu lên máy chủ mới...");
        const newWorldRef = doc(this.db!, "auro_worlds", normalizedDestId);
        await this.withTimeout(setDoc(newWorldRef, newWorldData, { merge: true }), 10000, "Lỗi tạo thế giới mới");

        let savedChars = 0;
        for (const char of allChars) {
          const newCharRef = doc(this.db!, "auro_worlds", normalizedDestId, "characters", char.id);
          await this.withTimeout(setDoc(newCharRef, char.data), 10000, "Lỗi lưu nhân vật");
          
          for (const chunk of char.chunks) {
            const newChunkRef = doc(this.db!, "auro_worlds", normalizedDestId, "characters", char.id, "message_chunks", chunk.id);
            await this.withTimeout(setDoc(newChunkRef, chunk.data), 10000, "Lỗi lưu tin nhắn");
          }
          savedChars++;
          onProgress(`Đã đồng bộ ${savedChars}/${allChars.length} nhân vật...`);
        }
        
        // Set current world ID so it's ready
        this.currentWorldId = normalizedDestId;
        onProgress("Đồng bộ hoàn tất!");
    } catch (error: any) {
        if (error.code === "resource-exhausted" || error.message?.includes("resource-exhausted") || error.message?.includes("Quota")) {
            throw new Error("Máy chủ hiện đang quá tải (hết băng thông). Vui lòng thử đồng bộ lại sau.");
        }
        if (error.code === "permission-denied" || error.message?.includes("permission")) {
            throw new Error("Lỗi phân quyền: Không thể truy cập dữ liệu. Có thể do máy chủ đang quá tải nên không thể xác thực.");
        }
        if (error.message?.includes("offline") || error.code === "unavailable") {
            throw new Error("Lỗi mạng: Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.");
        }
        throw new Error(`Lỗi đồng bộ: ${error.message || "Không xác định"}`);
    }
  }

  async migrateFromLocal(
    newConfig: FirebaseConfig,
    sourceWorldId: string,
    destWorldId: string,
    destPin: string,
    onProgress: (msg: string) => void
  ): Promise<void> {
    const normalizedSourceId = this.normalizeId(sourceWorldId);
    const normalizedDestId = this.normalizeId(destWorldId);
    
    try {
        onProgress("Đang đọc dữ liệu từ trình duyệt...");
        const allChars = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('save_')) {
                const dataStr = localStorage.getItem(key);
                if (dataStr) {
                    try {
                        const data = JSON.parse(dataStr);
                        // Only migrate characters for this world
                        if (data.worldId === normalizedSourceId || !data.worldId) {
                            if (data.character && data.user) {
                                allChars.push({
                                    id: key.replace('save_', ''),
                                    char: data.character,
                                    user: data.user,
                                    msgs: data.messages || []
                                });
                            }
                        }
                    } catch (e) { console.warn("Parse error", e); }
                }
            }
        }

        if (allChars.length === 0) {
            throw new Error("Không tìm thấy dữ liệu nào trên trình duyệt cho thế giới này.");
        }

        onProgress("Đang kết nối máy chủ mới...");
        await this.initialize(newConfig, "Server Riêng");
        
        if (!this.currentUser && this.auth) {
            const userCred = await this.withTimeout(signInAnonymously(this.auth), 10000, "Lỗi đăng nhập ẩn danh");
            this.currentUser = userCred.user;
        }

        onProgress("Đang đồng bộ dữ liệu lên máy chủ mới...");
        const newWorldRef = doc(this.db!, "auro_worlds", normalizedDestId);
        await this.withTimeout(setDoc(newWorldRef, { pin: destPin, createdAt: Date.now() }, { merge: true }), 10000, "Lỗi tạo thế giới mới");

        let savedChars = 0;
        for (const charData of allChars) {
            this.currentWorldId = normalizedDestId; 
            await this.saveCharacterToWorld(charData.id, charData.char, charData.user, charData.msgs);
            savedChars++;
            onProgress(`Đã đồng bộ ${savedChars}/${allChars.length} nhân vật...`);
        }
        
        onProgress("Đồng bộ hoàn tất!");
    } catch (error: any) {
        if (error.code === "resource-exhausted" || error.message?.includes("resource-exhausted") || error.message?.includes("Quota")) {
            throw new Error("Máy chủ mới hiện đang quá tải (hết băng thông). Vui lòng thử đồng bộ lại sau.");
        }
        if (error.code === "permission-denied" || error.message?.includes("permission")) {
            throw new Error("Lỗi phân quyền: Không thể lưu dữ liệu lên máy chủ mới.");
        }
        if (error.message?.includes("offline") || error.code === "unavailable") {
            throw new Error("Lỗi mạng: Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.");
        }
        throw new Error(`Lỗi đồng bộ: ${error.message || "Không xác định"}`);
    }
  }

  // ==========================
  // KẾT NỐI WORLD (ID HỘ CHIẾU Auro World)
  // ==========================
  async connectWorld(
    rawWorldId: string,
    pinCode: string,
    bypassPin: boolean = false,
    readOnly: boolean = false
  ): Promise<{ normalizedId: string; message: string; exists: boolean; count: number; error?: string }> {
    if (!this.isInitialized) throw new Error("Chưa khởi tạo kết nối Server (Config Error)");
    try {
      if (!rawWorldId || rawWorldId.trim().length === 0) throw new Error("ID Aura không được để trống");
      if (!bypassPin && (!pinCode || pinCode.trim().length !== 4 || isNaN(Number(pinCode)))) throw new Error("Mã PIN phải là 4 chữ số");

      const normalizedId = this.normalizeId(rawWorldId);
      this.currentWorldId = normalizedId;

      if (!this.currentUser && this.auth) {
        try {
          console.log("[Firebase] No user, attempting anonymous sign-in...");
          // Shorter timeout for auth
          const userCred = await this.withTimeout(signInAnonymously(this.auth), 5000, "Timeout");
          this.currentUser = userCred.user;
          console.log("[Firebase] Anonymous sign-in successful:", this.currentUser.uid);
        } catch (authError: any) {
          console.error("Lỗi xác thực Firebase:", authError);
          // If auth fails due to quota/timeout, we proceed anyway and try cache
          if (authError.code !== 'resource-exhausted' && !authError.message?.includes('resource-exhausted') && !authError.message?.includes('Timeout')) {
              throw new Error(`Lỗi xác thực: ${authError.message}`);
          }
        }
      }

      const worldRef = doc(this.db!, "auro_worlds", normalizedId);
      let worldExists = false;
      let charCount = 0;
      let isOffline = false;
      let docSnap;

      try {
        // Shorter timeout for world check
        docSnap = await this.withTimeout(getDoc(worldRef), 6000, "Timeout");
      } catch (readErr: any) {
        const isQuotaOrTimeout = 
            readErr.code === "resource-exhausted" || 
            readErr.message?.includes("resource-exhausted") || 
            readErr.message?.includes("Timeout") ||
            readErr.code === "unavailable";

        if (isQuotaOrTimeout) {
            console.warn("Server unreachable or quota exceeded, attempting cache...", readErr.message);
            isOffline = true;
            try {
                docSnap = await getDocFromCache(worldRef);
            } catch (cacheErr) {
                // Last resort: check if this world was used in the last session
                const lastSessionStr = localStorage.getItem('auro_last_session');
                let wasLastUsed = false;
                if (lastSessionStr) {
                    try {
                        const ls = JSON.parse(lastSessionStr);
                        if (ls.worldId === normalizedId) wasLastUsed = true;
                    } catch(e){}
                }

                if (wasLastUsed) {
                    return { 
                        normalizedId, 
                        message: "Máy chủ gián đoạn. Đang vào bằng dữ liệu lưu trên máy.", 
                        exists: true, 
                        count: 1, 
                        error: "QUOTA_EXCEEDED_CACHE_MISS" 
                    };
                }

                return { 
                    normalizedId, 
                    message: "Máy chủ quá tải & Không có dữ liệu cũ trên máy này.", 
                    exists: false, 
                    count: 0, 
                    error: "QUOTA_EXCEEDED_CACHE_MISS" 
                };
            }
        } else {
            if (readErr.code === "permission-denied") throw new Error("Lỗi: Không có quyền ĐỌC World ID này (Permission Denied).");
            throw readErr;
        }
      }

      if (docSnap) {
          worldExists = docSnap.exists();

          if (worldExists) {
              const worldData = docSnap.data();
              if (!bypassPin && worldData.pin && worldData.pin !== pinCode) {
                  throw new Error("Mã PIN không chính xác!");
              }
              if (!bypassPin && !worldData.pin && !isOffline && !readOnly) {
                   await setDoc(worldRef, { pin: pinCode }, { merge: true });
              }
          } else {
              // New world, set the PIN
              if (!bypassPin && !isOffline && !readOnly) {
                  await setDoc(worldRef, { pin: pinCode, createdAt: Date.now() }, { merge: true });
              }
          }
      }

      try {
        const charsCol = collection(this.db!, "auro_worlds", normalizedId, "characters");
        const countSnap = await this.withTimeout(getCountFromServer(charsCol), 10000, "Lỗi đếm cư dân (Timeout)");
        charCount = countSnap.data().count;
      } catch (countErr: any) {
         console.warn("Count error:", countErr);
         if (worldExists) {
             charCount = 0; // Fallback
         } else {
             // Ignore if offline
             if (!isOffline) throw countErr;
         }
      }

      if ((worldExists || charCount > 0) && !isOffline && !readOnly) {
        worldExists = true;
        try {
          await setDoc(worldRef, { lastAccess: Date.now() }, { merge: true });
        } catch (writeErr: any) {
          console.warn("Không thể cập nhật lastAccess:", writeErr);
        }
      }

      return {
        normalizedId,
        message: isOffline ? "Đang dùng dữ liệu ngoại tuyến do máy chủ quá tải." : (worldExists ? `Đã có ${charCount} cư dân.` : "Thế giới chưa tồn tại."),
        exists: worldExists,
        count: charCount,
        error: isOffline ? "QUOTA_EXCEEDED_CACHE_MISS" : undefined
      };
    } catch (error: any) {
      console.error("Connect World Error:", error);
      if (error.code === "resource-exhausted" || error.message?.includes("resource-exhausted") || error.message?.includes("Quota")) {
          return { normalizedId: this.normalizeId(rawWorldId), message: "Máy chủ quá tải. Đang vào bằng chế độ hạn chế.", exists: true, count: 0, error: "QUOTA_EXCEEDED_CACHE_MISS" };
      }
      if (error.code === "permission-denied" || error.message?.includes("permission")) {
          throw new Error("Lỗi phân quyền: Không thể truy cập dữ liệu. Vui lòng kiểm tra lại cấu hình Firebase.");
      }
      if (error.message?.includes("offline") || error.code === "unavailable") {
          throw new Error("Lỗi mạng: Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.");
      }
      throw new Error(`Lỗi kết nối: ${error.message || "Không xác định"}`);
    }
  }

  async getRecoveryCharacters(rawWorldId: string): Promise<{id: string, avatar: string, name: string, isCorrect: boolean}[]> {
    if (!this.isInitialized) throw new Error("Chưa khởi tạo kết nối Server");
    const normalizedId = this.normalizeId(rawWorldId);

    if (!this.currentUser && this.auth) {
        try {
            const userCred = await this.withTimeout(signInAnonymously(this.auth), 10000, "Lỗi đăng nhập ẩn danh (Timeout)");
            this.currentUser = userCred.user;
        } catch (e) {
            console.error(e);
        }
    }

    // 1. Get 1 character from the current world
    const currentWorldCharsRef = collection(this.db!, "auro_worlds", normalizedId, "characters");
    const currentWorldCharsSnap = await this.withTimeout(getDocs(query(currentWorldCharsRef, limit(10))), 10000, "Lỗi tải cư dân (Timeout)");
    
    if (currentWorldCharsSnap.empty) {
        throw new Error("Thế giới này chưa có cư dân nào để nhận diện.");
    }
    
    const correctDocs = currentWorldCharsSnap.docs;
    const correctDoc = correctDocs[Math.floor(Math.random() * correctDocs.length)];
    const correctCharData = correctDoc.data().char || {};
    const correctChar = {
        id: correctDoc.id,
        avatar: correctCharData.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=fallback',
        name: correctCharData.name || 'Unknown',
        isCorrect: true
    };

    // 2. Get 2 characters from OTHER worlds
    const allCharsRef = collectionGroup(this.db!, "characters");
    const allCharsSnap = await this.withTimeout(getDocs(query(allCharsRef, limit(50))), 10000, "Lỗi tải dữ liệu nhận diện (Timeout)");
    
    const wrongChars: any[] = [];
    allCharsSnap.forEach(doc => {
        if (!doc.ref.path.includes(`auro_worlds/${normalizedId}/`)) {
            const charData = doc.data().char || {};
            wrongChars.push({
                id: doc.id,
                avatar: charData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${doc.id}`,
                name: charData.name || 'Unknown',
                isCorrect: false
            });
        }
    });

    wrongChars.sort(() => 0.5 - Math.random());
    const selectedWrongChars = wrongChars.slice(0, 2);

    const fakeNames = ["Yuki", "Haru", "Akira", "Ren", "Shiro", "Kuro", "Sora", "Riku", "Kael", "Elara", "Lumina", "Zane", "Nova", "Ash", "Rin", "Luna", "Stella", "Noctis"];
    
    while (selectedWrongChars.length < 2) {
        const randomName = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        selectedWrongChars.push({
            id: `fake_${Math.random()}`,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomName}${Math.random()}`,
            name: randomName,
            isCorrect: false
        });
    }

    const finalChars = [correctChar, ...selectedWrongChars];
    finalChars.sort(() => 0.5 - Math.random());

    return finalChars;
  }

  async getWorldPin(rawWorldId: string): Promise<string | null> {
    if (!this.isInitialized) throw new Error("Chưa khởi tạo kết nối Server");
    const normalizedId = this.normalizeId(rawWorldId);
    const worldRef = doc(this.db!, "auro_worlds", normalizedId);
    const docSnap = await this.withTimeout(getDoc(worldRef), 10000, "Lỗi lấy mật khẩu (Timeout)");
    if (docSnap.exists()) {
        return docSnap.data().pin || null;
    }
    return null;
  }

  // ==========================
  // LOAD DANH SÁCH NHÂN VẬT
  // ==========================
  async loadWorldCharacters(targetWorldId?: string, limitCount?: number): Promise<SaveSlot[]> {
    const worldId = targetWorldId || this.currentWorldId;
    if (!worldId || !this.isInitialized || !this.db) return [];

    const slotMap = new Map<string, SaveSlot>();
    try {
      const charsRef = collection(this.db, "auro_worlds", worldId, "characters");
      let q = query(charsRef, orderBy("updatedAt", "desc"));
      if (limitCount) {
        q = query(charsRef, orderBy("updatedAt", "desc"), limit(limitCount));
      }
      
      let charSnapshot;
      try {
          charSnapshot = await this.withTimeout(getDocs(q), 10000, "Lỗi tải danh sách nhân vật (Timeout)");
      } catch (e: any) {
          if (e.code === 'resource-exhausted' || e.message?.includes('resource-exhausted')) {
              console.warn("Quota exceeded, falling back to cache for loadWorldCharacters");
              try {
                  charSnapshot = await getDocsFromCache(q);
              } catch (cacheErr) {
                  return [];
              }
          } else {
              throw e;
          }
      }

      charSnapshot.forEach((docSnap: any) => {
        const docData = docSnap.data();
        if (docData && docData.char) {
          slotMap.set(docSnap.id, {
            id: docSnap.id,
            charName: docData.char.name || "Unknown",
            charAvatar: docData.char.avatar || "",
            userName: docData.user?.name || "Unknown",
            lastPlayed: docData.updatedAt || Date.now(),
            level: docData.char.relationshipScore ? Math.floor(docData.char.relationshipScore / 100) + 1 : 1
          });
        }
      });
    } catch (e: any) {
      console.warn("Lỗi load characters:", e);
      return [];
    }
    return Array.from(slotMap.values()).sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  // ==========================
  // SETTINGS APP (FIREBASE + LOCAL)
  // ==========================
  async saveAppSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem("auro_settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("localStorage save failed:", e);
    }

    if (!this.currentUser || !this.db) return;
    try {
      const settingsRef = doc(this.db, "users", this.currentUser.uid, "configs", "app_settings");
      await setDoc(settingsRef, this.sanitizePayload(settings));
    } catch (e) {
      console.error("Lỗi lưu Settings lên Firebase:", e);
    }
  }

  async loadAppSettings(): Promise<AppSettings | null> {
    if (this.currentUser && this.db) {
      try {
        const settingsRef = doc(this.db, "users", this.currentUser.uid, "configs", "app_settings");
        const snap = await this.withTimeout(getDoc(settingsRef), 5000, "Lỗi tải cài đặt (Timeout)");
        if (snap.exists()) return snap.data() as AppSettings;
      } catch (e) {
        console.warn("Firebase settings load failed:", e);
      }
    }

    try {
      const saved = localStorage.getItem("auro_settings");
      if (saved) return JSON.parse(saved) as AppSettings;
    } catch (e) {
      console.warn("localStorage settings load failed:", e);
    }

    return null;
  }


  // ==========================
  // SAVE CHARACTER + USER + MESSAGES (ONLINE MODE)
  // ==========================
  async saveCharacterToWorld(slotId: string, char: Character, user: UserProfile, msgs: Message[]): Promise<void> {
    if (!this.currentWorldId || !this.db) {
      console.warn("[Firebase] Save skipped: Missing worldId or DB not ready.", { worldId: this.currentWorldId, db: !!this.db });
      return;
    }
    try {
        console.log(`[Firebase] Starting save for ${char.name} in world ${this.currentWorldId}...`);
        
        // --- 1. DATA SEPARATION ---
        const charSubDataKeys: (keyof Character)[] = [
            'relations', 'diary', 'inventory', 'properties', 'transactions',
            // 'socialPosts', // REMOVED: Saved separately to 'social_posts' collection
            // 'notifications', // REMOVED: Saved separately to 'notifications_list' collection
            'incomeStreams', 'expenses',
            'roomLayout', 'pixelRoomLayout'
        ];
        const userSubDataKeys: (keyof UserProfile)[] = [
            'inventory', 'properties', 'transactions', 'purchaseHistory',
            'activeJobs', 'sideHustles'
        ];

        const coreChar: Partial<Character> = { ...char };
        const charSubData: { [key: string]: any } = {};
        
        // Extract socialPosts separately
        const socialPosts = (coreChar as any).socialPosts || [];
        delete (coreChar as any).socialPosts;

        // Extract notifications separately
        const notifications = (coreChar as any).notifications || [];
        delete (coreChar as any).notifications;

        for (const key of charSubDataKeys) {
            if ((coreChar as any)[key]) {
                charSubData[key] = (coreChar as any)[key];
                delete (coreChar as any)[key];
            }
        }

        const coreUser: Partial<UserProfile> = { ...user };
        const userSubData: { [key: string]: any } = {};
        for (const key of userSubDataKeys) {
            if ((coreUser as any)[key]) {
                userSubData[`user_${key}`] = (coreUser as any)[key]; // Prefix to avoid collision
                delete (coreUser as any)[key];
            }
        }

        // --- 2. DATA TRIMMING & COMPRESSION ---
        if (charSubData.diary?.length > 30) charSubData.diary = charSubData.diary.slice(-30);
        if (charSubData.transactions?.length > 50) charSubData.transactions = charSubData.transactions.slice(-50);
        // socialPosts handled separately
        // notifications handled separately
        if (userSubData.user_transactions?.length > 50) userSubData.user_transactions = userSubData.user_transactions.slice(-50);
        if (userSubData.user_purchaseHistory?.length > 30) userSubData.user_purchaseHistory = userSubData.user_purchaseHistory.slice(-30);

        if (coreChar.avatar && coreChar.avatar.startsWith("data:image")) {
            coreChar.avatar = await this.compressBase64(coreChar.avatar, 1000, 0.8);
        }
        if (charSubData.relations) {
            charSubData.relations = await Promise.all(
                charSubData.relations.map(async (r: any) => ({
                    ...r,
                    avatar: r.avatar && r.avatar.startsWith("data:image") ? await this.compressBase64(r.avatar, 300, 0.7) : r.avatar
                }))
            );
        }

        // --- BATCH SETUP ---
        let currentBatch = writeBatch(this.db);
        let opCount = 0;
        const MAX_BATCH_SIZE = 100; // Reduced from 400 to 100 to prevent write exhaustion

        const commitBatch = async () => {
            if (opCount > 0) {
                await currentBatch.commit();
                currentBatch = writeBatch(this.db!);
                opCount = 0;
                // Add a small delay to let the backend breathe
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        };

        const addToBatch = async (ref: any, data: any, isDelete: boolean = false) => {
            if (isDelete) {
                currentBatch.delete(ref);
            } else {
                currentBatch.set(ref, data);
            }
            opCount++;
            if (opCount >= MAX_BATCH_SIZE) {
                await commitBatch();
            }
        };

        // --- 3. SAVE MESSAGE CHUNKS ---
        const recentMsgs = msgs.slice(-300);
        const processedMsgs = await this.processMessagesForStorage(recentMsgs);
        const totalChunks = Math.ceil(processedMsgs.length / CHUNK_SIZE) || 0;
        const charDocRef = doc(this.db, "auro_worlds", this.currentWorldId, "characters", slotId);

        for (let i = 0; i < totalChunks; i++) {
            const chunkMsgs = processedMsgs.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const chunkRef = doc(charDocRef, "message_chunks", i.toString());
            await addToBatch(chunkRef, this.sanitizePayload({ messages: chunkMsgs }));
        }

        // --- 4. SAVE MAIN DOCUMENT & SUB-DATA ---
        const mainPayload = {
            char: this.sanitizePayload(coreChar),
            user: this.sanitizePayload(coreUser),
            totalChunks: totalChunks,
            messageCount: processedMsgs.length,
            updatedAt: Date.now(),
            ownerId: this.currentUser?.uid || "anonymous"
        };
        await addToBatch(charDocRef, mainPayload);

        const subDataCollectionRef = collection(charDocRef, 'sub_data');
        const allSubData = { ...charSubData, ...userSubData };
        for (const key in allSubData) {
            await addToBatch(doc(subDataCollectionRef, key), { data: this.sanitizePayload(allSubData[key]) });
        }
        
        // Clean up old socialPosts and notifications in sub_data if they exist
        await addToBatch(doc(subDataCollectionRef, 'socialPosts'), null, true);
        await addToBatch(doc(subDataCollectionRef, 'notifications'), null, true);

        // --- 5. SAVE SOCIAL POSTS (Individual Documents) ---
        await saveSocialPosts(this.db!, this.currentWorldId!, slotId, socialPosts, async (ref, data) => {
            await addToBatch(ref, data);
        });

        // --- 6. SAVE NOTIFICATIONS (Individual Documents) ---
        const notificationsCollectionRef = collection(charDocRef, 'notifications_list');
        const notificationsToSave = notifications.slice(0, 50); // Save top 50
        
        for (const notif of notificationsToSave) {
            if (!notif.id) continue;
            await addToBatch(doc(notificationsCollectionRef, notif.id), this.sanitizePayload(notif));
        }
        
        // Commit any remaining operations
        await commitBatch();

        console.log(`[Firebase] Saved ${coreChar.name} (batched + social + notifs)`);

    } catch (e: any) {
        if (e.code === 'resource-exhausted' || e.message?.includes('resource-exhausted')) {
            console.error("🔥 FIREBASE QUOTA EXCEEDED (Write).");
            throw new Error("resource-exhausted");
        }
        console.error("Cloud save error (split model):", e);
        throw new Error("Lỗi lưu Cloud (new): " + e.message);
    }
  }

  // ==========================
  // XOÁ CHARACTER + CHUNKS
  // ==========================
  async deleteCharacter(slotId: string): Promise<void> {
    if (!this.currentWorldId || !this.isInitialized || !this.db)
      throw new Error("Chưa kết nối Online Mode");
    try {
      const charRef = doc(this.db, "auro_worlds", this.currentWorldId, "characters", slotId);
      const snap = await this.withTimeout(getDoc(charRef), 10000, "Lỗi kiểm tra nhân vật (Timeout)");
      if (snap.exists()) {
        const snapData = snap.data();
        const totalChunks = snapData.totalChunks || 0;
        const chunkDeletions = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkRef = doc(
            this.db,
            "auro_worlds",
            this.currentWorldId!,
            "characters",
            slotId,
            "message_chunks",
            i.toString()
          );
          chunkDeletions.push(deleteDoc(chunkRef));
        }
        await this.withTimeout(Promise.all(chunkDeletions), 15000, "Lỗi xóa tin nhắn (Timeout)");
        await this.withTimeout(deleteDoc(charRef), 10000, "Lỗi xóa nhân vật (Timeout)");
      }
    } catch (e: any) {
      throw new Error("Không thể xoá nhân vật: " + e.message);
    }
  }

  // ==========================
  // LOAD CHI TIẾT CHARACTER (ONLINE MODE)
  // ==========================
  async loadCharacterDetail(
    slotId: string,
    messageLimit: number = 10 // Default to loading 10 message chunks
  ): Promise<{ char: Character; user: UserProfile; msgs: Message[] } | null> {
    if (!this.currentWorldId || !this.isInitialized || !this.db) return null;
    try {
        // --- 1. LOAD MAIN DOCUMENT ---
        const charRef = doc(this.db, "auro_worlds", this.currentWorldId, "characters", slotId);
        let charSnap;
        try {
            charSnap = await this.withTimeout(getDoc(charRef), 10000, "Lỗi tải nhân vật (Timeout)");
        } catch (e: any) {
            if (e.code === 'resource-exhausted' || e.message?.includes('resource-exhausted')) {
                console.warn("Quota exceeded, falling back to cache for loadCharacterDetail");
                try {
                    charSnap = await getDocFromCache(charRef);
                } catch (cacheErr) {
                    return null;
                }
            } else {
                throw e;
            }
        }

        if (!charSnap.exists()) return null;
        const snapData = charSnap.data();

        let char = snapData.char || {};
        let user = snapData.user || {};

        // --- 2. LOAD SUB-DATA & MESSAGES CONCURRENTLY ---
        const subDataCollectionRef = collection(charRef, 'sub_data');
        const messageChunksCollectionRef = collection(charRef, 'message_chunks');
        
        let subDataSnap;
        try {
            subDataSnap = await this.withTimeout(getDocs(subDataCollectionRef), 10000, "Lỗi tải dữ liệu phụ (Timeout)");
        } catch (e: any) {
            if (e.code === 'resource-exhausted' || e.message?.includes('resource-exhausted')) {
                try {
                    subDataSnap = await getDocsFromCache(subDataCollectionRef);
                } catch (cacheErr) {
                    subDataSnap = { forEach: () => {} }; // Mock empty snapshot
                }
            } else {
                throw e;
            }
        }
        
        const chunkPromises = [];
        const totalChunks = snapData.totalChunks || 0;
        // Load only up to messageLimit chunks, starting from the most recent
        const startChunk = Math.max(0, totalChunks - messageLimit);
        for (let i = startChunk; i < totalChunks; i++) {
            const chunkRef = doc(messageChunksCollectionRef, i.toString());
            const p = this.withTimeout(getDoc(chunkRef), 10000, `Lỗi tải tin nhắn phần ${i} (Timeout)`)
                .catch(async (e: any) => {
                    if (e.code === 'resource-exhausted' || e.message?.includes('resource-exhausted')) {
                        return getDocFromCache(chunkRef).catch(() => ({ exists: () => false, data: () => ({}) }));
                    }
                    throw e;
                });
            chunkPromises.push(p);
        }

        const messageChunkSnaps = await Promise.all(chunkPromises);

        // --- 3. RE-ASSEMBLE DATA ---
        subDataSnap.forEach((docSnap: any) => {
            const docId = docSnap.id;
            const docData = docSnap.data().data;
            if (docId.startsWith('user_')) {
                const key = docId.replace('user_', '');
                (user as any)[key] = docData;
            } else {
                (char as any)[docId] = docData;
            }
        });

        // --- 3.1 LOAD SOCIAL POSTS (From Sub-Collection) ---
        const loadedPosts = await loadSocialPosts(this.db!, this.currentWorldId!, slotId, 30);
        if (loadedPosts.length > 0) {
            (char as any).socialPosts = loadedPosts;
        }

        // --- 3.2 LOAD NOTIFICATIONS (From Sub-Collection) ---
        const notificationsCollectionRef = collection(charRef, 'notifications_list');
        try {
            // Notifications usually don't have a timestamp field at root level in all schemas, 
            // but let's assume they might or just load them. 
            // If no timestamp, just load limit 50.
            // Ideally they should be ordered by time. Assuming 'timestamp' exists or just load all (limit 50).
            const q = query(notificationsCollectionRef, limit(50)); 
            const notifSnap = await this.withTimeout(getDocs(q), 8000, "Lỗi tải thông báo (Timeout)");
            const loadedNotifs: any[] = [];
            notifSnap.forEach(doc => {
                loadedNotifs.push(doc.data());
            });
            
            // Sort by timestamp desc if possible
            loadedNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            if (loadedNotifs.length > 0) {
                (char as any).notifications = loadedNotifs;
            }
        } catch (e) {
            console.warn("Error loading notifications_list collection:", e);
        }

        let allMessages: Message[] = [];
        messageChunkSnaps.forEach((snap: any) => {
            if (snap.exists()) {
                const chunkData = snap.data();
                if (chunkData.messages && Array.isArray(chunkData.messages)) {
                    allMessages = allMessages.concat(chunkData.messages);
                }
            }
        });

        // --- 4. NORMALIZE & RETURN ---
        const ensureArray = (val: any, fallback: any[] = []): any[] => Array.isArray(val) ? val : fallback;
        
        const finalChar: Character = {
            ...char,
            relations: ensureArray(char.relations),
            inventory: ensureArray(char.inventory),
            diary: ensureArray(char.diary),
            socialPosts: ensureArray(char.socialPosts),
            notifications: ensureArray(char.notifications),
            transactions: ensureArray(char.transactions),
            branches: ensureArray(char.branches, [{ id: "main", name: "Nhánh chính", createdAt: Date.now() }]),
            world: char.world || DEFAULT_WORLD_CONTEXT,
            incomeStreams: ensureArray(char.incomeStreams),
            expenses: ensureArray(char.expenses)
        } as Character;

        const finalUser: UserProfile = {
            ...user,
            inventory: ensureArray(user.inventory),
            properties: ensureArray(user.properties),
            transactions: ensureArray(user.transactions),
            purchaseHistory: ensureArray(user.purchaseHistory),
            activeJobs: ensureArray(user.activeJobs),
            sideHustles: ensureArray(user.sideHustles)
        } as UserProfile;

        return { char: finalChar, user: finalUser, msgs: allMessages };
    } catch (e) {
        console.error("Lỗi load character detail (split model):", e);
        return null;
    }
  }

  // ==========================
  // XỬ LÝ MESSAGE TRƯỚC KHI LƯU
  // ==========================
  private async processMessagesForStorage(messages: Message[]): Promise<Message[]> {
    const recentMsgs = messages.slice(-500);
    return await Promise.all(
      recentMsgs.map(async (msg) => {
        let newImage = msg.image;
        if (newImage && typeof newImage === "string" && newImage.length > 200000) {
          newImage = await this.compressBase64(newImage, 600, 0.7);
        }
        return { ...msg, image: newImage };
      })
    );
  }

  // ==========================
  // REGISTRY Auro Card (PUBLIC)
  // ==========================
  async publishCharacterCard(character: Character, config?: any, existingToken?: string): Promise<{ token: string; isOnline: boolean }> {
    this.initRegistry();
    if (!this.registryDb || !this.registryApp) {
        console.warn("Registry DB Disconnected - Using offline token");
        const token = existingToken || (Math.random().toString(36).substr(2, 6) + Date.now().toString(36).substr(-4));
        return { token, isOnline: false };
    }

    // Ensure Auth for Registry
    try {
        const regAuth = getAuth(this.registryApp);
        if (!regAuth.currentUser) {
            await signInAnonymously(regAuth);
        }
    } catch (e) {
        console.warn("Registry Auth Failed (Write):", e);
    }

    const token = existingToken || (Math.random().toString(36).substr(2, 6) + Date.now().toString(36).substr(-4));

    try {
      const hqAvatar =
        character.avatar &&
        typeof character.avatar === "string" &&
        character.avatar.startsWith("data:image")
          ? await this.compressBase64(character.avatar, 1500, 0.95)
          : character.avatar;
      
      const privacy = config?.privacy || { backstory: false, personality: false, greeting: false, appearance: false, npcRelations: false };
      const includedFields = config?.includedFields || ['backstory', 'personality', 'greeting', 'appearance', 'npcRelations'];

      // Safe encode helper
      const safeEncode = (str: string | undefined) => {
          if (!str || typeof str !== 'string') return '';
          try {
              return btoa(unescape(encodeURIComponent(str)));
          } catch (e) {
              return '';
          }
      };

      // Prepare data with privacy locks and inclusion filters
      const protectedData: any = {
          name: character.name,
          avatar: character.avatar,
          world: character.world,
          status: character.status,
          mood: character.mood,
          // Include other fields only if they are in includedFields
      };

      if (includedFields.includes('backstory')) {
          protectedData.description = privacy.backstory ? 'LOCKED' : safeEncode(character.description);
      }
      if (includedFields.includes('personality')) {
          protectedData.prompt = privacy.personality ? 'LOCKED' : (character.prompt ? safeEncode(character.prompt) : undefined);
          protectedData.behavior = privacy.personality ? 'LOCKED' : character.behavior;
      }
      if (includedFields.includes('appearance')) {
          protectedData.appearance = privacy.appearance ? 'LOCKED' : character.appearance;
      }
      if (includedFields.includes('greeting')) {
          protectedData.openingMessage = privacy.greeting ? 'LOCKED' : character.openingMessage;
      }
      if (includedFields.includes('npcRelations')) {
          protectedData.relations = privacy.npcRelations ? 'LOCKED' : character.relations;
      }

      // Add any other fields from character that aren't explicitly handled above
      Object.keys(character).forEach(key => {
          if (!['name', 'avatar', 'world', 'status', 'mood', 'description', 'prompt', 'behavior', 'appearance', 'openingMessage', 'relations'].includes(key)) {
              protectedData[key] = (character as any)[key];
          }
      });

      const publicEntry = {
        character_public_id: token,
        name: character.name,
        short_description: (character.description || "").substring(0, 300),
        role: character.status || "Wanderer",
        world_context: character.world?.genre || "Auro World",
        avatar_url: hqAvatar,
        created_at: Date.now(),
        version: "1.2", // Bump version
        // Full character "soul" data
        data: this.sanitizePayload(protectedData)
      };
      
      const cardRef = doc(this.registryDb, "registry_entries", token);
      await setDoc(cardRef, this.sanitizePayload(publicEntry));
      return { token, isOnline: true };
    } catch (e: any) {
      console.warn("Lỗi khi đăng ký Thẻ bài (Fallback to offline mode):", e);
      return { token, isOnline: false }; 
    }
  }

  async getPublicCard(token: string): Promise<AuroCardData | null> {
    this.initRegistry();
    if (!this.registryDb || !this.registryApp) return null;

    // Ensure Auth for Registry
    try {
        const regAuth = getAuth(this.registryApp);
        if (!regAuth.currentUser) {
            await signInAnonymously(regAuth);
        }
    } catch (e) {
        console.warn("Registry Auth Failed (Read):", e);
    }

    try {
      const cardRef = doc(this.registryDb, "registry_entries", token);
      const snap = await this.withTimeout(getDoc(cardRef), 10000, "Lỗi tải thẻ bài (Timeout)");
      if (snap.exists()) {
        const d = snap.data();
        const charData = d.data || {};
        
        // Safe decode helper
        const safeDecode = (str: string | undefined, fallback: string = '') => {
            if (str === 'LOCKED') return 'LOCKED';
            if (!str) return fallback;
            try {
                return decodeURIComponent(escape(atob(str)));
            } catch (e) {
                return fallback;
            }
        };

        const freshCharStub: Character = {
          // Default values
          relationshipScore: 0,
          maxScore: 100,
          hearts: 5,
          money: 100,
          inventory: [],
          properties: [],
          transactions: [],
          socialPosts: [],
          notifications: [],
          diary: [],
          relations: [],
          world: { ...DEFAULT_WORLD_CONTEXT },
          behavior: {
            jealousy: 2,
            possessiveness: 2,
            initiative: 4,
            lying: 1,
            sarcasm: 1,
            romantic: 3,
            stoic: 3
          },
          // Spread imported data to override defaults and include extra fields
          ...charData,
          // Explicitly handle encoded fields
          description: safeDecode(charData.description, d.short_description || ''),
          prompt: charData.prompt ? safeDecode(charData.prompt, 'LOCKED') : undefined,
          // Ensure critical fields are present
          name: charData.name || d.name,
          avatar: charData.avatar || d.avatar_url,
          status: charData.status || d.role,
          openingMessage: charData.openingMessage || `*${d.name} đã được triệu hồi từ thư viện*`,
        };

        return {
          publicId: d.character_public_id,
          name: d.name,
          avatar: d.avatar_url,
          role: d.role,
          shortDesc: d.short_description,
          context: d.world_context,
          createdAt: d.created_at,
          fullCharacterData: freshCharStub
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
