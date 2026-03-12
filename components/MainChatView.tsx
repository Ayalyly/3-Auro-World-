import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';
import { Character, UserProfile, Message, AppSettings, AppView, Sender, InventoryItem } from '../types';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import CharacterHeader from './CharacterHeader';
import SettingsModal from './SettingsModal';
import { GeminiService } from '../services/geminiService'; // Import GeminiService

interface MainChatViewProps {
  character: Character;
  user: UserProfile;
  messages: Message[];
  displayedMessages: Message[];
  settings: AppSettings;
  isApiKeyMissing: boolean;
  serverName: string;
  currentBranchId: string;
  appMode: 'offline' | 'online';
  showSettingsModal: boolean;
  geminiService: GeminiService; // Add geminiService to props
  setShowSettingsModal: (show: boolean) => void;
  setView: (view: AppView) => void;
  setCurrentBranchId: (id: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onSendMessage: (text: string, images?: string[]) => void | Promise<void>;
  onRegenerate: (id: string) => void;
  onVersionChange: (id: string, direction: 'prev' | 'next') => void;
  onFork: (id: string) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onImportData: (data: any, options: any) => void;
  onUpdateCharacter: (char: Character) => void;
  onSaveMemory: (message: Message) => void;
  onToggleCover: (id: string) => void;
  onHome?: () => void;
  onDashboard?: () => void;
  lastAffectionChange?: number | null;
  isGenerating?: boolean;
  onStop?: () => void;
  playingVideoId: string | null;
  setPlayingVideoId: (id: string | null) => void;
}

const MainChatView: React.FC<MainChatViewProps> = ({
  character,
  user,
  messages,
  displayedMessages,
  settings,
  isApiKeyMissing,
  serverName,
  currentBranchId,
  appMode,
  showSettingsModal,
  geminiService, // Destructure geminiService
  setShowSettingsModal,
  setView,
  setCurrentBranchId,
  setMessages,
  onSendMessage,
  onRegenerate,
  onVersionChange,
  onFork,
  onSaveSettings,
  onImportData,
  onUpdateCharacter,
  onSaveMemory,
  onToggleCover,
  onHome,
  onDashboard,
  lastAffectionChange,
  isGenerating,
  onStop,
  playingVideoId,
  setPlayingVideoId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [productProposal, setProductProposal] = useState<InventoryItem | null>(null);
  const [isProcessingProposal, setIsProcessingProposal] = useState(false);
  
  // Player state
  const [playerWidth, setPlayerWidth] = useState(220);
  const [playerHeight, setPlayerHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const bgType = settings.theme.chatBgType || 'color';
  const bgValue = settings.theme.chatBg || 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #f3e8ff 100%)';
  const bgImage = settings.theme.chatBgImage;
  const bgYoutubeId = getYoutubeId(settings.theme.chatBgYoutubeUrl || '');

  // New handler for sending messages that also checks for product proposals
  const handleSendMessage = async (text: string, images?: string[]) => {
    onSendMessage(text, images);
    setProductProposal(null); // Clear old proposals
    setIsProcessingProposal(true);
    try {
      const proposal = await geminiService.proposeProductFromChat(text, character.world?.currency || 'Xu');
      if (proposal) {
        setProductProposal(proposal);
      }
    } catch (error) {
      console.error("Error proposing product:", error);
    } finally {
      setIsProcessingProposal(false);
    }
  };

  const handleAddProposalToCart = () => {
    if (productProposal) {
      // This is a simplified way. A more robust solution would involve a shared state/context.
      // For now, we can use localStorage as a temporary bridge.
      const cart = JSON.parse(localStorage.getItem('shop_cart') || '[]');
      cart.push(productProposal);
      localStorage.setItem('shop_cart', JSON.stringify(cart));
      setProductProposal(null);
      setView('shop'); // Navigate to shop to show the item in cart
    }
  };


  return (
    <div
      ref={containerRef}
      className="flex flex-col h-[100dvh] w-full overflow-hidden relative"
      style={{
        background: bgType === 'color' ? bgValue : bgType === 'image' && bgImage ? `url(${bgImage}) center/cover no-repeat` : '#000',
        fontFamily: settings.theme.fontFamily || 'inherit'
      }}
    >
      {bgType === 'youtube' && bgYoutubeId && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <YouTube
            videoId={bgYoutubeId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                loop: 1,
                playlist: bgYoutubeId,
                modestbranding: 1,
                mute: 1,
                playsinline: 1
              }
            }}
            className="w-[150vw] h-[150vh] -ml-[25vw] -mt-[25vh]" // Scale up to hide black bars and fill screen
            iframeClassName="w-full h-full object-cover"
          />
        </div>
      )}

      {bgType === 'color' && (
        <div id="animated-bg" className="absolute inset-0 opacity-20 z-0">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
      )}

      {/* Overlay for better readability if using image or video */}
      {(bgType === 'image' || bgType === 'youtube') && (
        <div className="absolute inset-0 bg-black/30 z-0 pointer-events-none"></div>
      )}

      <div className="relative z-10 flex flex-col h-full w-full">
        <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSaveSettings={onSaveSettings}
        gameData={{ character, user, messages }}
        onImport={(data) =>
          onImportData(data, {
            importChar: true,
            importUser: true,
            importChat: true,
            importSettings: true
          })
        }
        onTestModel={(model) => geminiService.testModelConnection(model)}
      />

      <CharacterHeader
        character={character}
        onBack={() => {}}
        onSettings={() => setShowSettingsModal(true)}
        localStatus={'saved'}
        cloudStatus={appMode === 'online' ? 'saved' : 'disabled'}
        serverName={serverName}
        currentBranchId={currentBranchId}
        onSwitchBranch={(id) => setCurrentBranchId(id)}
        onOpenProfile={() => setView('char_card')}
        onHome={onHome}
        onDashboard={onDashboard}
        lastAffectionChange={lastAffectionChange}
        settings={settings}
        onSaveSettings={onSaveSettings}
        playingVideoId={playingVideoId}
        setPlayingVideoId={setPlayingVideoId}
      />

      <div className="flex flex-col w-full flex-1 overflow-hidden">
        {settings.theme.chatLayoutStyle === 'immersive-short' && (
          <div className="h-[55vh] shrink-0 pointer-events-none"></div>
        )}
        <div 
          className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar flex flex-col"
          style={{
            maskImage: settings.theme.chatLayoutStyle === 'immersive-short' ? 'linear-gradient(to bottom, transparent, black 10%, black)' : undefined,
            WebkitMaskImage: settings.theme.chatLayoutStyle === 'immersive-short' ? 'linear-gradient(to bottom, transparent, black 10%, black)' : undefined
          }}
        >
          <AnimatePresence>
          {playingVideoId && (
            <motion.div 
              drag={!isResizing}
              dragMomentum={false}
              dragConstraints={containerRef}
              initial={{ x: 96, y: 12, opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                width: isMinimized ? 120 : playerWidth,
                height: isMinimized ? 40 : playerHeight
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed z-[100] bg-black rounded-2xl shadow-2xl overflow-hidden border-2 border-white/20 group cursor-move"
            >
              {/* Header / Drag Handle */}
              <div className={`absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center px-3 z-10 transition-opacity ${isMinimized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="flex items-center gap-2">
                  <i className="fa-brands fa-youtube text-rose-500 text-xs"></i>
                  {!isMinimized && <span className="text-[10px] text-white font-bold uppercase tracking-wider">YouTube Player</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <i className={`fa-solid ${isMinimized ? 'fa-expand' : 'fa-compress'} text-[10px]`}></i>
                  </button>
                  <button 
                    onClick={() => setPlayingVideoId(null)}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-[10px]"></i>
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  <YouTube
                    videoId={playingVideoId}
                    opts={{ 
                      width: playerWidth.toString(), 
                      height: playerHeight.toString(), 
                      playerVars: { 
                        autoplay: 1,
                        modestbranding: 1,
                        rel: 0
                      } 
                    }}
                    onEnd={() => setPlayingVideoId(null)}
                    className="w-full h-full"
                  />

                  {/* Resize Handle */}
                  <motion.div
                    drag
                    dragMomentum={false}
                    dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
                    onDragStart={() => setIsResizing(true)}
                    onDragEnd={() => setIsResizing(false)}
                    onDrag={(e, info) => {
                      setPlayerWidth(prev => Math.max(160, prev + info.delta.x));
                      setPlayerHeight(prev => Math.max(90, prev + info.delta.y));
                    }}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-4 h-4 bg-white/20 rounded-tl-lg border-r-2 border-b-2 border-white/40"></div>
                  </motion.div>
                </>
              )}
              
              {isMinimized && (
                <div className="w-full h-full flex items-center justify-center bg-rose-600/20">
                   <span className="text-[8px] text-white font-black uppercase">Đang phát...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {settings.theme.chatLayoutStyle === 'immersive' && (
          <div className="flex-1"></div>
        )}

        {displayedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <i className={`fa-solid fa-wind text-4xl mb-2 ${(settings.theme.chatLayoutStyle === 'immersive' || settings.theme.chatLayoutStyle === 'immersive-short') ? 'text-white/50' : 'text-slate-300'}`}></i>
            <p className={`text-xs ${(settings.theme.chatLayoutStyle === 'immersive' || settings.theme.chatLayoutStyle === 'immersive-short') ? 'text-white/50' : 'text-slate-400'}`}>Bắt đầu câu chuyện...</p>
          </div>
        )}
        {displayedMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            character={character}
            userAvatar={user.avatar}
            userName={user.name}
            theme={settings.theme}
            onDelete={(id) =>
              setMessages((prev) => prev.filter((m) => m.id !== id))
            }
            onEdit={(id, t2) =>
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, text: t2, isEdited: true } : m
                )
              )
            }
            onRegenerate={onRegenerate}
            onVersionChange={onVersionChange}
            onFork={onFork}
            onSaveMemory={onSaveMemory}
            onToggleCover={onToggleCover}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Product Proposal UI */}
      {productProposal && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/50 flex items-center gap-4 relative">
                <button 
                    onClick={() => setProductProposal(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-colors z-10"
                >
                    <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl border border-indigo-200">
                    {productProposal.icon || '🎁'}
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Gợi ý vật phẩm</p>
                    <h4 className="font-bold text-slate-700 text-sm">{productProposal.name}</h4>
                    <p className="text-xs text-slate-500">Có vẻ bạn muốn thứ này? AI có thể tạo nó cho bạn.</p>
                </div>
                <button 
                    onClick={handleAddProposalToCart}
                    className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl hover:bg-emerald-600 transition-all active:scale-90 shadow-lg shadow-emerald-200">
                    <i className="fa-solid fa-plus"></i>
                </button>
            </div>
        </div>
      )}

      <InputBar
        onSend={handleSendMessage} // Use the new handler
        onStop={onStop}
        isGenerating={isGenerating}
        user={user}
        onNavigate={(v) => {
            if (v === 'settings') {
              setShowSettingsModal(true);
            } else {
              setView(v);
            }
          }}
        theme={settings.theme}
        isApiKeyMissing={isApiKeyMissing}
      />
      {isApiKeyMissing && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-xl animate-in slide-in-from-bottom-2 duration-300 z-[60] flex items-center gap-2 border border-white/20">
          <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
          <span>Chưa nhập API Key</span>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default MainChatView;
