
import React, { useState, useRef, useEffect } from 'react';
import { Character, InventoryItem, Relation, ShopNPC, UserProfile, Property, AuroCardData, Mood, AppSettings } from '../types';
import { GeminiService } from '../services/geminiService';
import { SecurityOverlay } from './SecurityOverlay';
import jsQR from 'jsqr';
import ModelSelectorModal from './ModelSelectorModal';

interface SetupScreenProps {
  onComplete: (
    character: Character, 
    userProfile: Partial<UserProfile>,
    userInventory: InventoryItem[], 
    userProperties: Property[],
    currencyName: string
  ) => void;
  initialData?: any; 
  t: (key: string) => string;
  currentLang?: 'vi' | 'en';
  onCheckPublicCard: (token: string) => Promise<AuroCardData | null>;
  onBack: () => void;
  geminiService?: GeminiService; 
  onNotification?: (notif: { title: string, message: string }) => void;
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
}

const TIPS = [
    "🧠 Đang phân tích cốt truyện của bạn để dệt nên định mệnh...",
    "🏰 Đang xây dựng cấu trúc thế giới dựa trên mô tả của bạn.",
    "🎭 Đang vẽ chân dung và tạo ký ức riêng cho 3 NPC quan trọng...",
    "💰 Đang thiết lập hệ thống kinh tế và cửa hàng đặc thù.",
    "🎒 Đang chuẩn bị hành trang khởi đầu cho bạn."
];

const DEFAULT_WORLD_CONTEXT = {
  currency: "Xu",
  shopNPCs: [],
  shopItems: []
};

export default function SetupScreen({ 
  onComplete, 
  initialData, 
  t, 
  currentLang = 'vi', 
  onCheckPublicCard, 
  onBack, 
  geminiService, 
  onNotification,
  settings,
  onUpdateSettings
}: SetupScreenProps) {
  const showAlert = (title: string, message: string) => {
    if (onNotification) {
      onNotification({ title, message });
    } else {
      alert(`${title}\n\n${message}`);
    }
  };
  const [activeTab, setActiveTab] = useState<'char' | 'user'>('char');
  const [charName, setCharName] = useState('');
  const [charOpening, setCharOpening] = useState('');
  const [charPrompt, setCharPrompt] = useState('');
  const [charDesc, setCharDesc] = useState('');
  const [charAppearance, setCharAppearance] = useState('');
  const [charAvatar, setCharAvatar] = useState(`https://api.dicebear.com/7.x/notionists/svg?seed=${Math.random()}`);
  const [initialAffinity, setInitialAffinity] = useState(10);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [worldContext, setWorldContext] = useState('');
  const [userName, setUserName] = useState('User');
  const [userDesc, setUserDesc] = useState('Người du hành bí ẩn.');
  const [userAvatar, setUserAvatar] = useState(`https://api.dicebear.com/7.x/notionists/svg?seed=${Math.random()}`);
  const [userAppearance, setUserAppearance] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [npcProgress, setNpcProgress] = useState<string>('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [showCardImport, setShowCardImport] = useState(false);
  const [cardToken, setCardToken] = useState('');
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [analyzingTarget, setAnalyzingTarget] = useState<'char' | 'user' | null>(null);
  const [worldModel, setWorldModel] = useState('gemini-3.1-flash-lite-preview');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isReadingDoc, setIsReadingDoc] = useState(false);
  const [importedChar, setImportedChar] = useState<Character | null>(null);
  const charFileInputRef = useRef<HTMLInputElement>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null); 
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const geminiRef = useRef(geminiService || new GeminiService());

  // Load Draft on Mount
  useEffect(() => {
    const draft = localStorage.getItem('auro_setup_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.charName) setCharName(parsed.charName);
        if (parsed.charOpening) setCharOpening(parsed.charOpening);
        if (parsed.charPrompt) setCharPrompt(parsed.charPrompt);
        if (parsed.charDesc) setCharDesc(parsed.charDesc);
        if (parsed.charAppearance) setCharAppearance(parsed.charAppearance);
        if (parsed.charAvatar) setCharAvatar(parsed.charAvatar);
        if (parsed.initialAffinity) setInitialAffinity(parsed.initialAffinity);
        if (parsed.youtubeLink) setYoutubeLink(parsed.youtubeLink);
        if (parsed.worldContext) setWorldContext(parsed.worldContext);
        if (parsed.userName) setUserName(parsed.userName);
        if (parsed.userDesc) setUserDesc(parsed.userDesc);
        if (parsed.userAvatar) setUserAvatar(parsed.userAvatar);
        if (parsed.userAppearance) setUserAppearance(parsed.userAppearance);
        if (parsed.worldModel) setWorldModel(parsed.worldModel);
        onNotification?.({ title: "Đã khôi phục", message: "Đã tải bản nháp gần nhất!" });
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  const cleanupDraft = () => {
    localStorage.removeItem('auro_setup_draft');
  };

  const handleSaveDraft = () => {
    const draftData = {
        charName, 
        charOpening: charOpening === 'LOCKED' ? 'LOCKED' : charOpening, 
        charPrompt, 
        charDesc: charDesc === 'LOCKED' ? 'LOCKED' : charDesc, 
        charAppearance, 
        charAvatar,
        initialAffinity, youtubeLink, worldContext, userName, userDesc, userAvatar, userAppearance, worldModel,
        timestamp: Date.now()
    };
    localStorage.setItem('auro_setup_draft', JSON.stringify(draftData));
    onNotification?.({ title: "Thành công", message: "Đã lưu bản nháp thành công!" });
  };

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
        if (charName.trim() || charDesc.trim() || userName.trim()) {
            const draftData = {
                charName, charOpening, charPrompt, charDesc, charAppearance, charAvatar,
                initialAffinity, youtubeLink, worldContext, userName, userDesc, userAvatar, userAppearance, worldModel,
                timestamp: Date.now()
            };
            localStorage.setItem('auro_setup_draft', JSON.stringify(draftData));
            console.log("💾 Auto-saved draft");
        }
    }, 30000);
    return () => clearInterval(timer);
  }, [charName, charDesc, charOpening, charAppearance, charAvatar, charPrompt, userName, userDesc, userAppearance, userAvatar, initialAffinity, youtubeLink, worldContext, worldModel]);

  useEffect(() => {
      let interval: any;
      if (isGenerating) { interval = setInterval(() => { setCurrentTipIndex(prev => (prev + 1) % TIPS.length); }, 3000); }
      return () => clearInterval(interval);
  }, [isGenerating]);

  const handleCardImport = async (tokenOverride?: string) => {
      const token = tokenOverride || cardToken;
      if (!token.trim()) return;
      setIsScanningQR(true);
      try {
          const cardData = await onCheckPublicCard(token);
          if (cardData && cardData.fullCharacterData) {
              const c = cardData.fullCharacterData;
              setImportedChar(c);
              
              // Only set fields if they are NOT locked
              setCharName(c.name); 
              setCharAvatar(c.avatar);
              
              if (c.description !== 'LOCKED') setCharDesc(c.description || '');
              else setCharDesc('LOCKED'); 

              if (c.openingMessage !== 'LOCKED') setCharOpening(c.openingMessage || '');
              else setCharOpening('LOCKED');

              if (c.appearance !== 'LOCKED') setCharAppearance(c.appearance || '');
              else setCharAppearance('LOCKED');

              if (c.initialAffinity !== undefined) setInitialAffinity(c.initialAffinity);
              if (c.youtubeLink) setYoutubeLink(c.youtubeLink);

              if (c.prompt && c.prompt !== 'LOCKED') setCharPrompt(c.prompt);
              else if (c.prompt === 'LOCKED') setCharPrompt('LOCKED');
              else setCharPrompt('');

              if (c.world?.worldDetail) setWorldContext(c.world.worldDetail);
              
              setShowCardImport(false);
              setCardToken('');
              showAlert("Thành công", `Đã triệu hồi ${c.name}! Bạn có thể chỉnh sửa thêm hoặc nhấn BẮT ĐẦU ngay.`);
          } else { showAlert("Lỗi", "Thẻ bài không tồn tại."); }
      } catch (e) { showAlert("Lỗi", "Lỗi kết nối thư viện thẻ."); } finally { setIsScanningQR(false); }
  };

  const handleQRImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setCardToken(code.data);
          handleCardImport(code.data);
        } else {
          showAlert("Lỗi", "Không tìm thấy mã QR trong ảnh này.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileImport = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType === 'json') {
          const reader = new FileReader();
          reader.onload = (ev) => {
              try {
                  const json = JSON.parse(ev.target?.result as string);
                  const charData = json.character || json; 
                  if (charData.name) {
                      setCharName(charData.name); setCharDesc(charData.description || ''); setCharOpening(charData.openingMessage || ''); setCharAvatar(charData.avatar || '');
                      if (json.user) { setUserName(json.user.name || ''); setUserDesc(json.user.description || ''); setUserAvatar(json.user.avatar || ''); }
                  }
              } catch (err) { showAlert("Lỗi", "Lỗi đọc file JSON."); }
          };
          reader.readAsText(file);
      } else {
          setIsReadingDoc(true);
          try {
              const mammoth = (window as any).mammoth;
              if (!mammoth) {
                showAlert("Lỗi", "Ứng dụng chưa hỗ trợ đọc file DOCX. Vui lòng dùng JSON hoặc dán văn bản.");
                setIsReadingDoc(false);
                return;
              }
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.extractRawText({ arrayBuffer });
              await processRawText(result.value);
          } catch (err) { showAlert("Lỗi", "Lỗi đọc file."); } finally { setIsReadingDoc(false); }
      }
  };

  const handlePasteAnalysis = async () => {
      if (!pastedText.trim()) return;
      setIsReadingDoc(true);
      try { await processRawText(pastedText); setShowPasteModal(false); setPastedText(''); } catch (e) { showAlert("Lỗi", "Lỗi phân tích."); } finally { setIsReadingDoc(false); }
  };

  const processRawText = async (text: string) => {
      const data = await geminiRef.current.parseCharacterDocument(text, currentLang);
      if (data && !(data as any).text?.includes('❌')) { 
        setCharName(data.name || ''); 
        setCharDesc(data.description || ''); 
        setCharOpening(data.openingMessage || ''); 
        setCharAppearance(data.appearance || ''); 
      } else {
        showAlert("Lỗi", (data as any)?.text || "Không thể phân tích văn bản. Kiểm tra API Key.");
      }
  };

  const handleAnalyzeAvatar = async (type: 'char' | 'user') => {
      const img = type === 'char' ? charAvatar : userAvatar;
      if (!img || !img.startsWith('data:')) { 
        showAlert("Thông báo", "⚠️ Chỉ phân tích ảnh đã chọn từ máy.\n\n👉 Nhấp vào avatar để chọn ảnh JPG/PNG từ thiết bị của bạn."); 
        return; 
      }
      if (img.length < 100) {
        showAlert("Lỗi", "⚠️ Ảnh quá nhỏ hoặc không hợp lệ. Vui lòng chọn ảnh khác.");
        return;
      }
      setAnalyzingTarget(type);
      try {
          const desc = await geminiRef.current.analyzeImage(img, type === 'char' ? 'Character' : 'User');
          if (desc && !desc.includes('❌')) {
            if (type === 'char') setCharAppearance(desc); else setUserAppearance(desc);
          } else {
            showAlert("Lỗi", desc || "Không thể phân tích ảnh. Thử ảnh JPG/PNG khác.");
          }
      } catch (e: any) { 
          showAlert("Lỗi", `Lỗi phân tích ảnh: ${e.message || "Không xác định"}. Vui lòng thử lại với ảnh khác hoặc nhập mô tả bằng tay.`); 
      } finally { 
          setAnalyzingTarget(null); 
      }
  };

    const handleSubmit = async () => {
    if (!charName.trim()) { showAlert("Cảnh báo", "⚠️ Vui lòng nhập TÊN NHÂN VẬT!"); return; }
    if (!charDesc.trim()) { showAlert("Cảnh báo", "⚠️ Vui lòng nhập CỐT TRUYỆN & TÍNH CÁCH!"); return; }
    
    if (!geminiRef.current.apiKeys || geminiRef.current.apiKeys.length === 0) {
      showAlert("Cảnh báo", `❌ CHƯA CẤU HÌNH API KEY GOOGLE AI!\n\n💡 Hướng dẫn:\n1. Vào https://aistudio.google.com/app/apikey\n2. Tạo key mới (miễn phí)\n3. Vào Cài đặt > Google AI trong app\n4. Dán key và lưu\n\n🔗 Link nhanh: https://aistudio.google.com/app/apikey`);
      return;
    }

    console.log("🚀 =================== BẮT ĐẦU TẠO THẾ GIỚI ===================");
    console.log("🔑 Số API key khả dụng:", geminiRef.current.apiKeys.length);
    console.log("🤖 Model đang dùng:", worldModel);
    console.log("👤 Nhân vật:", charName);
    console.log("📝 Cốt truyện (preview):", charDesc.substring(0, 50) + "...");

    setIsGenerating(true);
    setNpcProgress('🔍 Kiểm tra kết nối AI...');

    try {
      let finalChar: Character;

      if (importedChar) {
        setNpcProgress('✨ Đang chuẩn bị thế giới từ thẻ triệu hồi...');
        // Use imported data but allow overrides from UI
        finalChar = {
          ...importedChar,
          name: charName,
          avatar: charAvatar,
          description: charDesc,
          prompt: charPrompt || importedChar.prompt,
          appearance: charAppearance,
          openingMessage: charOpening.replace(/{{user}}/g, userName).replace(/{{char}}/g, charName),
          relationshipScore: initialAffinity,
          initialAffinity: initialAffinity,
          youtubeLink: youtubeLink,
          status: initialAffinity >= 80 ? 'Tri kỷ' : initialAffinity >= 40 ? 'Thân thiết' : initialAffinity >= 0 ? 'Người quen' : initialAffinity >= -40 ? 'Căng thẳng' : 'Kẻ thù',
          hearts: Math.max(1, Math.floor((initialAffinity + 100) / 40)),
          // Keep relations and world from imported char
          relations: importedChar.relations || [],
          world: importedChar.world || { ...DEFAULT_WORLD_CONTEXT },
          cardConfig: importedChar.cardConfig ? { ...importedChar.cardConfig, token: undefined } : undefined,
          branches: [{ id: 'main', name: 'Nhánh chính (Gốc)', createdAt: Date.now() }]
        };
        
        // If world context was edited in UI, update it
        if (worldContext && worldContext !== importedChar.world?.worldDetail) {
          finalChar.world = {
            ...finalChar.world,
            worldDetail: worldContext
          };
        }

        // Removed artificial delay
        
        // Ensure locked fields remain locked
        if (charDesc === 'LOCKED') finalChar.description = importedChar.description || '';
        if (charOpening === 'LOCKED') finalChar.openingMessage = importedChar.openingMessage || '';

        cleanupDraft();
        onComplete(
          finalChar, 
          { 
            name: userName, 
            description: userDesc, 
            avatar: userAvatar, 
            appearance: userAppearance, 
            money: 500 
          }, 
          [], 
          [], 
          finalChar.world.currency || 'Xu'
        );
      } else {
        const modelLabel = worldModel.includes('pro') ? 'Pro Engine' : 'Flash Engine';
        setNpcProgress(`🚀 Đang khởi tạo vũ trụ ảo (${modelLabel})...`);
        console.log(`⏳ Bước 1: World Context (${worldModel})...`);
        
        const generatedWorld = await geminiRef.current.generateWorldContext(
          charName, charDesc, userName, userDesc, worldContext || "Dựa theo cốt truyện", worldModel
        );
        
        if (generatedWorld.error) throw new Error(generatedWorld.error);

        setNpcProgress('👥 Đang tuyển NPC & Xây dựng Kinh tế...');
        console.log(`⏳ Bước 2: Social & Economy (${worldModel})...`);
        
        const socialEco = await geminiRef.current.generateSocialAndEconomy(
          charName, userName, generatedWorld, worldModel
        );

        if (socialEco.error) throw new Error(socialEco.error);

        // Enrich NPCs (local only, no API call - Instant)
        const dnaRefs: string[] = [];
        if (charAvatar.startsWith('data:')) dnaRefs.push(charAvatar);
        
        const enrichedRelations = await Promise.all((socialEco.relations || []).map(async (npc: any) => {
            return await geminiRef.current.enrichNPC(charName, npc, dnaRefs);
        }));

        setNpcProgress('📱 Đang hoàn tất hồ sơ...');
        console.log(`⏳ Bước 3: Legacy Content (${worldModel})...`);
        
        const legacyData = await geminiRef.current.generateLegacyContent(
          charName, enrichedRelations, generatedWorld, generatedWorld, worldModel
        );
        console.log("✅ Legacy Content OK");

        const mapAssetsToItems = (assets: string[]): InventoryItem[] => {
          return (assets || []).map((assetName, idx) => ({
            id: `init-${idx}-${Date.now()}`,
            name: assetName,
            icon: "📦",
            description: `Một vật phẩm quý giá: ${assetName}`,
            value: 100,
            affinityBonus: 2,
            category: "Vật phẩm",
            quantity: 1,
            rarity: "Thường"
          }));
        };

        const getFinalValue = (current: string, original: string | undefined) => {
            return current === 'LOCKED' ? (original || '') : current;
        };

        finalChar = {
            name: charName, avatar: charAvatar,
            description: `${getFinalValue(charDesc, importedChar?.description)}\n\n[NGOẠI HÌNH: ${getFinalValue(charAppearance, importedChar?.appearance)}]\n\n[LUẬT: ${generatedWorld.worldRules}]\n\n[BỐI CẢNH: ${generatedWorld.worldDetail}]`,
            prompt: getFinalValue(charPrompt, importedChar?.prompt),
            openingMessage: getFinalValue(charOpening, importedChar?.openingMessage).replace(/{{user}}/g, userName).replace(/{{char}}/g, charName), 
            relationshipScore: initialAffinity, 
            initialAffinity: initialAffinity,
            youtubeLink: youtubeLink,
            maxScore: 100, 
            status: initialAffinity >= 80 ? 'Tri kỷ' : initialAffinity >= 40 ? 'Thân thiết' : initialAffinity >= 0 ? 'Người quen' : initialAffinity >= -40 ? 'Căng thẳng' : 'Kẻ thù', 
            hearts: Math.max(1, Math.floor((initialAffinity + 100) / 40)), 
            money: Number(socialEco.charMoney) || 1000,
            inventory: mapAssetsToItems(socialEco.charAssets), properties: [], transactions: [],
            socialPosts: (legacyData?.legacySocialPosts || []).map((p: any) => ({
                ...p, id: 'post-' + Math.random().toString(36).substring(2, 9),
                avatar: enrichedRelations.find((r: Relation) => r.name === p.authorName)?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${p.authorName}`,
                timestamp: Date.now() - Math.random() * 10000000, comments: []
            })),
            notifications: [], mood: 'Hạnh phúc', behavior: { jealousy: 3, possessiveness: 3, initiative: 5, lying: 1, sarcasm: 2, romantic: 4, stoic: 3 },
            diary: [], relations: enrichedRelations, 
            world: { currency: socialEco.currencyName || 'Xu', shopNPCs: socialEco.shopNPCs || [], shopItems: [] },
            branches: [{ id: 'main', name: 'Nhánh chính (Gốc)', createdAt: Date.now() }]
        };

        cleanupDraft();
        onComplete(
          finalChar, 
          { 
            name: userName, 
            description: userDesc, 
            avatar: userAvatar, 
            appearance: userAppearance, 
            money: Number(socialEco.userMoney) || 500 
          }, 
          mapAssetsToItems(socialEco.userAssets), 
          [], 
          socialEco.currencyName || 'Xu'
        );
      }

      setNpcProgress('');
      setIsGenerating(false);
      localStorage.removeItem('auro_setup_draft');
      
    } catch (error: any) {
      console.error("💥 =================== LỖI TẠO THẾ GIỚI ===================");
      console.error("💥 LỖI CHI TIẾT:", error);
      console.error("💥 STACK TRACE:", error.stack);
      console.error("💥 =================== HẾT LỖI ===================");
      
      setIsGenerating(false);
      setNpcProgress('');
      
      let errorMsg = "Lỗi không xác định khi tạo thế giới.";
      if (error.message?.includes("API Key") || error.message?.includes("API_KEY_INVALID")) {
        errorMsg = "🔑 API Key Google AI không hợp lệ hoặc đã hết hạn.\n\n💡 Vào Cài đặt > Google AI để cập nhật key mới.\n\n🔗 Lấy key miễn phí: aistudio.google.com/app/apikey";
      } else if (error.message?.includes("timeout")) {
        errorMsg = "⏰ Kết nối với Google AI quá chậm.\n\n💡 Kiểm tra mạng Internet hoặc thử lại sau.";
      } else if (error.message?.includes("quota") || error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "⚡ API Key của bạn đã hết lượt sử dụng (Quota Exceeded).\n\n💡 Giải pháp:\n1. Đợi vài phút rồi thử lại.\n2. Lấy API Key mới tại aistudio.google.com/app/apikey\n3. Vào Cài đặt > Google AI để thay key mới.";
      } else if (error.message?.includes("MIME type")) {
        errorMsg = "🖼️ Định dạng ảnh không hỗ trợ.\n\n💡 Chỉ dùng ảnh JPG/PNG.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      showAlert("Lỗi", `❌ TẠO THẾ GIỚI THẤT BẠI\n\n${errorMsg}`);
    }
  };

  if (isGenerating) {
      return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center bg-[#09090b] overflow-y-auto">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
              <div className="relative w-80 h-80 mb-12">
                  <div className="summon-circle w-full h-full summon-spin-slow opacity-30 border-indigo-500"></div>
                  <div className="summon-circle w-[75%] h-[75%] summon-spin-fast border-purple-500 opacity-60"></div>
                  <div className="summon-circle w-[50%] h-[50%] summon-pulse border-white opacity-80"></div>
                  <div className="summon-rays"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl rotate-12 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.8)] animate-float">
                          <i className="fa-solid fa-wand-magic-sparkles text-4xl text-white"></i>
                      </div>
                  </div>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-2 text-center px-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">GENESIS ENGINE</h2>
              <div className="h-1 w-24 bg-indigo-500 rounded-full mb-8 shadow-[0_0_15px_rgba(99,102,241,1)]"></div>
              {npcProgress && (
                  <div className="mb-8 bg-indigo-900/30 px-6 py-3 rounded-2xl border border-indigo-500/30 animate-pulse backdrop-blur-sm">
                      <span className="text-xs text-indigo-200 font-mono uppercase tracking-widest flex items-center gap-2">
                          <i className="fa-solid fa-microchip"></i> {npcProgress}
                      </span>
                  </div>
              )}
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 w-full max-w-[340px] animate-in fade-in duration-1000">
                  <p className="text-xs text-indigo-100 text-center italic font-medium leading-relaxed opacity-80">"{TIPS[currentTipIndex % TIPS.length]}"</p>
              </div>
          </div>
      );
  }

  return (
<div className="h-[100dvh] w-full flex flex-col items-center pt-6 pb-32 p-4 bg-slate-50 overflow-y-auto custom-scrollbar relative">
      {showCardImport && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl relative">
                  <button onClick={() => setShowCardImport(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-xmark"></i></button>
                  <h3 className="text-center font-black text-slate-800 uppercase tracking-widest mb-6">Nhập mã Triệu Hồi</h3>
                  <div className="space-y-4">
                      <div 
                        onClick={() => qrFileInputRef.current?.click()}
                        className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center h-32 text-slate-300 hover:border-indigo-400 hover:text-indigo-500 transition-all cursor-pointer group"
                      >
                        <i className="fa-solid fa-qrcode text-5xl group-hover:scale-110 transition-transform"></i>
                        <span className="text-[8px] font-black uppercase mt-2">Tải ảnh QR lên</span>
                      </div>
                      <input type="file" ref={qrFileInputRef} className="hidden" accept="image/*" onChange={handleQRImageUpload} />
                      <input className="w-full p-4 bg-slate-100 rounded-2xl text-center text-xs font-mono font-bold outline-none border border-transparent focus:border-indigo-500 transition-all uppercase tracking-widest" placeholder="PASTE TOKEN HERE" value={cardToken} onChange={e => setCardToken(e.target.value)} />
                      <button 
                        onClick={() => handleCardImport()} 
                        disabled={isScanningQR || !cardToken.trim()}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isScanningQR ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : null}
                        {isScanningQR ? 'ĐANG KÍCH HOẠT...' : 'KÍCH HOẠT'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {showPasteModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative flex flex-col h-[70vh]">
                  <button onClick={() => setShowPasteModal(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-xmark"></i></button>
                  <h3 className="text-center font-black text-slate-800 uppercase tracking-widest mb-2 mt-2"><i className="fa-solid fa-paste mr-2 text-indigo-500"></i> Nạp Cốt Truyện</h3>
                  <textarea className="flex-1 bg-slate-50 rounded-[1.5rem] p-5 text-xs text-slate-700 outline-none border border-transparent focus:border-indigo-200 resize-none custom-scrollbar leading-relaxed font-medium" placeholder="Paste text here..." value={pastedText} onChange={e => setPastedText(e.target.value)} />
                  <button onClick={handlePasteAnalysis} disabled={!pastedText.trim()} className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">PHÂN TÍCH NGAY</button>
              </div>
          </div>
      )}
      {isReadingDoc && <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div><h3 className="font-black text-indigo-600 uppercase tracking-widest text-xs">Đang đọc Thiên Thư...</h3></div>}
      <div className="w-full max-w-[380px] space-y-6">
        <div className="flex justify-center gap-3">
            <button onClick={() => docInputRef.current?.click()} className="bg-white border border-slate-100 text-indigo-600 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-indigo-50 hover:border-indigo-100 transition-all shadow-sm active:scale-95"><i className="fa-solid fa-file-code"></i> JSON</button>
            <input type="file" ref={docInputRef} className="hidden" accept=".docx,.json" onChange={handleFileImport} />
            <button onClick={() => docInputRef.current?.click()} className="bg-white border border-slate-100 text-blue-600 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm active:scale-95"><i className="fa-solid fa-file-word"></i> DOCX</button>
            <button onClick={() => setShowPasteModal(true)} className="bg-white border border-slate-100 text-emerald-600 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-sm active:scale-95"><i className="fa-solid fa-align-left"></i> TEXT</button>
        </div>
        <button onClick={() => setShowCardImport(true)} className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"><i className="fa-solid fa-id-card text-lg"></i> QUÉT THẺ TRIỆU HỒI</button>
        <div className="bg-white p-1.5 rounded-[1.2rem] flex shadow-sm border border-slate-100">
            <button onClick={() => setActiveTab('char')} className={`flex-1 py-3 rounded-[0.9rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'char' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><i className="fa-solid fa-user-astronaut"></i> NHÂN VẬT (AI)</button>
            <button onClick={() => setActiveTab('user')} className={`flex-1 py-3 rounded-[0.9rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'user' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><i className="fa-solid fa-user"></i> BẠN (PLAYER)</button>
        </div>
        <div className="flex justify-center">
            <button onClick={handleSaveDraft} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95">
                <i className="fa-solid fa-floppy-disk"></i> Lưu bản nháp hiện tại
            </button>
        </div>
        <div className="flex justify-center py-2 animate-in zoom-in duration-300">
            <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => (activeTab === 'char' ? charFileInputRef : userFileInputRef).current?.click()}>
                <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500"></div>
                <img src={activeTab === 'char' ? charAvatar : userAvatar} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl bg-white relative z-10" />
                <div className="absolute bottom-0 right-0 z-20 bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-slate-100 group-hover:scale-110 transition-transform"><i className="fa-solid fa-camera text-sm"></i></div>
                <input type="file" ref={activeTab === 'char' ? charFileInputRef : userFileInputRef} className="hidden" accept="image/*" onChange={(e: any) => { 
                  const file = e.target.files[0]; 
                  if (file) { 
                    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                    if (!validTypes.includes(file.type)) {
                      showAlert("Cảnh báo", "⚠️ Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      showAlert("Cảnh báo", "⚠️ Ảnh quá lớn (tối đa 5MB)");
                      return;
                    }
                    const reader = new FileReader(); 
                    reader.onloadend = () => {
                      const base64 = reader.result as string;
                      if (base64.startsWith('data:')) {
                        (activeTab === 'char' ? setCharAvatar : setUserAvatar)(base64);
                      } else {
                        showAlert("Lỗi", "⚠️ Lỗi chuyển đổi ảnh. Vui lòng chọn ảnh khác.");
                      }
                    }; 
                    reader.readAsDataURL(file); 
                  } 
                }} />
            </div>
        </div>
        <div className="space-y-5 pb-8 animate-in slide-in-from-bottom-8 duration-500">
            {activeTab === 'char' && (
                <>
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NGOẠI HÌNH</label>
                            <div className="flex gap-1 items-center">
                                {charAppearance === 'LOCKED' && (
                                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold border border-slate-200 flex items-center gap-1">
                                        <i className="fa-solid fa-lock text-[7px]"></i> BẢO VỆ
                                    </span>
                                )}
                                <button onClick={() => handleAnalyzeAvatar('char')} disabled={analyzingTarget === 'char' || charAppearance === 'LOCKED'} className="text-[9px] font-bold text-indigo-500 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">{analyzingTarget === 'char' ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}{analyzingTarget === 'char' ? 'ĐANG NHÌN...' : 'PHÂN TÍCH ẢNH'}</button>
                            </div>
                        </div>
                        <div className="relative group">
                            <textarea 
                                className={`w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 outline-none text-xs text-slate-700 font-medium resize-none h-24 leading-relaxed placeholder:text-slate-300 transition-all shadow-sm ${charAppearance === 'LOCKED' ? 'select-none pointer-events-none' : ''}`} 
                                value={charAppearance === 'LOCKED' ? 'NỘI DUNG ĐÃ ĐƯỢC BẢO VỆ' : charAppearance} 
                                onChange={e => setCharAppearance(e.target.value)} 
                                placeholder="AI sẽ tự điền khi phân tích ảnh, hoặc bạn nhập mô tả..." 
                            />
                            <SecurityOverlay 
                                isLocked={charAppearance === 'LOCKED'} 
                                onOverwrite={() => setCharAppearance('')}
                                label="Bảo mật"
                            />
                        </div>
                    </div>
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DANH XƯNG</label><span className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded text-[8px] font-bold border border-indigo-100">BẮT BUỘC</span></div>
                        <input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 outline-none text-sm font-black text-slate-800 shadow-sm transition-all" value={charName} onChange={e => setCharName(e.target.value)} placeholder="Tên nhân vật..." />
                    </div>
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CỐT TRUYỆN & TÍNH CÁCH</label>
                            <div className="flex gap-1">
                                {charDesc === 'LOCKED' && (
                                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold border border-slate-200 flex items-center gap-1">
                                        <i className="fa-solid fa-lock text-[7px]"></i> BẢO VỆ
                                    </span>
                                )}
                                <span className="bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded text-[8px] font-bold border border-rose-100">QUAN TRỌNG NHẤT</span>
                            </div>
                        </div>
                        <div className="relative group">
                            <textarea 
                                className={`w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 outline-none text-xs text-slate-700 font-medium resize-none h-40 leading-relaxed custom-scrollbar transition-all shadow-sm ${charDesc === 'LOCKED' ? 'select-none pointer-events-none' : ''}`} 
                                value={charDesc === 'LOCKED' ? 'NỘI DUNG ĐÃ ĐƯỢC BẢO VỆ BỞI CHỦ SỞ HỮU' : charDesc} 
                                onChange={e => setCharDesc(e.target.value)} 
                                placeholder="Mô tả càng chi tiết, AI càng thông minh..." 
                            />
                            <SecurityOverlay 
                                isLocked={charDesc === 'LOCKED'} 
                                onOverwrite={() => setCharDesc('')}
                            />
                        </div>
                    </div>

                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HẢO CẢM BAN ĐẦU</label>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${initialAffinity >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {initialAffinity > 0 ? '+' : ''}{initialAffinity}
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="-100" 
                            max="100" 
                            step="1" 
                            value={initialAffinity} 
                            onChange={(e) => setInitialAffinity(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-2"
                        />
                        <div className="flex justify-between px-1">
                            <span className="text-[7px] font-bold text-rose-400 uppercase">Kẻ thù (-100)</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">Người lạ (0)</span>
                            <span className="text-[7px] font-bold text-emerald-400 uppercase">Tri kỷ (100)</span>
                        </div>
                        <p className="text-[8px] text-slate-400 mt-2 italic px-1">* Thiết lập này sẽ định hình thái độ ban đầu của nhân vật đối với bạn.</p>
                    </div>

                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LINK YOUTUBE (THEME SONG)</label>
                        </div>
                        <input 
                            className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 outline-none text-xs text-slate-700 font-medium shadow-sm transition-all" 
                            value={youtubeLink} 
                            onChange={e => setYoutubeLink(e.target.value)} 
                            placeholder="https://www.youtube.com/watch?v=..." 
                        />
                        <p className="text-[8px] text-slate-400 mt-2 italic px-1">* Link này sẽ được dùng làm nhạc nền/video nền khi gọi điện cho nhân vật.</p>
                    </div>

                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">BỐI CẢNH THẾ GIỚI</label></div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {['Hiện đại', 'Cổ đại', 'Tiên hiệp', 'Huyền huyễn', 'Mạt thế', 'Cyberpunk', 'Hào môn', 'Thanh xuân', 'Cưới trước yêu sau', 'Ngược tâm', 'Sủng ngọt', 'ABO', 'Điền văn', 'Trinh thám', 'Kinh dị'].map(tag => (
                                <button 
                                    key={tag}
                                    onClick={() => setWorldContext(prev => prev ? `${prev}, ${tag}` : tag)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-[10px] font-bold border border-slate-200 hover:border-indigo-200 transition-all"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                        <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 outline-none text-xs text-slate-700 font-medium resize-none h-24 leading-relaxed custom-scrollbar transition-all shadow-sm" value={worldContext} onChange={e => setWorldContext(e.target.value)} placeholder="Chọn tag ở trên hoặc tự nhập..." />
                    </div>
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LỜI CHÀO ĐẦU TIÊN</label>
                            {charOpening === 'LOCKED' && (
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold border border-slate-200 flex items-center gap-1">
                                    <i className="fa-solid fa-lock text-[7px]"></i> BẢO VỆ
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <textarea 
                                className={`w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 outline-none text-xs text-slate-700 font-medium resize-none h-24 leading-relaxed custom-scrollbar transition-all shadow-sm italic ${charOpening === 'LOCKED' ? 'select-none pointer-events-none' : ''}`} 
                                value={charOpening === 'LOCKED' ? 'NỘI DUNG ĐÃ ĐƯỢC BẢO VỆ' : charOpening} 
                                onChange={e => setCharOpening(e.target.value)} 
                                placeholder="Câu đầu tiên nhân vật nói với bạn..." 
                            />
                            <SecurityOverlay 
                                isLocked={charOpening === 'LOCKED'} 
                                onOverwrite={() => setCharOpening('')}
                                label="Bảo mật"
                            />
                        </div>
                    </div>
                </>
            )}
            {activeTab === 'user' && (
                <>
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NGOẠI HÌNH CỦA BẠN</label>
                            <button onClick={() => handleAnalyzeAvatar('user')} disabled={analyzingTarget === 'user'} className="text-[9px] font-bold text-pink-500 hover:bg-pink-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">{analyzingTarget === 'user' ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}{analyzingTarget === 'user' ? 'ĐANG NHÌN...' : 'PHÂN TÍCH ẢNH'}</button>
                        </div>
                        <textarea className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-pink-100 outline-none text-xs text-slate-700 font-medium resize-none h-24 leading-relaxed placeholder:text-slate-300 transition-all shadow-sm" value={userAppearance} onChange={e => setUserAppearance(e.target.value)} placeholder="Để nhân vật biết bạn trông như thế nào..." />
                    </div>
                    <div className="group"><div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TÊN CỦA BẠN</label></div><input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-pink-100 outline-none text-sm font-black text-slate-800 shadow-sm transition-all" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Bạn muốn được gọi là gì?" /></div>
                    <div className="group"><div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VAI TRÒ & THÂN PHẬN</label></div><textarea className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-pink-100 outline-none text-xs text-slate-700 font-medium resize-none h-40 leading-relaxed custom-scrollbar transition-all shadow-sm" value={userDesc} onChange={e => setUserDesc(e.target.value)} placeholder="Bạn là ai? Quan hệ gì với nhân vật?" /></div>
                    
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MODEL TẠO THẾ GIỚI <span className="ml-2 text-pink-500 animate-pulse">NEW</span></label>
                        </div>
                        <div 
                          onClick={() => setShowModelSelector(true)}
                          className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-pink-100 outline-none text-sm font-bold text-slate-700 shadow-sm transition-all flex justify-between items-center cursor-pointer hover:border-pink-200"
                        >
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-microchip text-pink-500"></i>
                            <span>{worldModel}</span>
                          </div>
                          <i className="fa-solid fa-chevron-right text-slate-400"></i>
                        </div>
                        <p className="mt-2 px-2 text-[10px] text-slate-400 italic font-medium leading-relaxed">
                            * Model này sẽ được dùng để "dệt" nên bối cảnh, NPC và kinh tế. Nếu model bị lỗi, hệ thống sẽ tự động đổi model khác để hoàn thành.
                        </p>
                    </div>

                    {showModelSelector && settings && onUpdateSettings && (
                        <ModelSelectorModal 
                            settings={{ ...settings, worldModel: worldModel }}
                            targetField="worldModel"
                            title="Chọn Model Tạo Thế Giới"
                            onSaveSettings={(newSettings) => {
                                if (newSettings.worldModel) {
                                    setWorldModel(newSettings.worldModel);
                                }
                                onUpdateSettings(newSettings);
                            }}
                            onClose={() => setShowModelSelector(false)}
                        />
                    )}
                </>
            )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex gap-3 justify-center z-40 max-w-[420px] mx-auto rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"><i className="fa-solid fa-arrow-left"></i></button>
            <button onClick={handleSaveDraft} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-2"><i className="fa-solid fa-floppy-disk"></i> LƯU NHÁP</button>
            <button onClick={handleSubmit} className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">KHỞI TẠO <i className="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>
    </div>
  );
}
