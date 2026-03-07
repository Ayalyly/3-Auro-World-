import React, { useRef, useEffect, useState } from 'react';
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
  onSendMessage: (text: string, image?: string) => void;
  onRegenerate: (id: string) => void;
  onVersionChange: (id: string, direction: 'prev' | 'next') => void;
  onFork: (id: string) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onImportData: (data: any, options: any) => void;
  onUpdateCharacter: (char: Character) => void;
  onSaveMemory: (message: Message) => void;
  onHome?: () => void;
  onDashboard?: () => void;
  lastAffectionChange?: number | null;
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
  onHome,
  onDashboard,
  lastAffectionChange
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [productProposal, setProductProposal] = useState<InventoryItem | null>(null);
  const [isProcessingProposal, setIsProcessingProposal] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  // New handler for sending messages that also checks for product proposals
  const handleSendMessage = async (text: string, image?: string) => {
    onSendMessage(text, image);
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
      className="flex flex-col h-[100dvh] w-full overflow-hidden relative"
      style={{
        background:
          'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #f3e8ff 100%)',
        fontFamily: settings.theme.fontFamily || 'inherit'
      }}
    >
      <div id="animated-bg" className="absolute inset-0 opacity-20">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

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
      />

      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        {displayedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <i className="fa-solid fa-wind text-4xl text-slate-300 mb-2"></i>
            <p className="text-xs text-slate-400">Bắt đầu câu chuyện...</p>
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
  );
};

export default MainChatView;
