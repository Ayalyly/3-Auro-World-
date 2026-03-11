
import React, { useState, useEffect, useRef } from 'react';
import { Character, Relation, Transaction, AppSettings, IncomeStream, Expense, Message, Sender, UserProfile, UserNPCRelation } from '../types';
import { GeminiService } from '../services/geminiService';

interface PhoneViewProps {
  character: Character;
  user?: UserProfile;
  onClose: () => void;
  onUpdateCharacter?: (newChar: Character) => void;
  onUpdateUser?: (newUser: UserProfile) => void;
  onSendMessageToNPC?: (npcId: string, text: string, relation: string) => Promise<string>;
  t: (key: string) => string;
  settings: AppSettings;
  geminiService?: GeminiService;
  onSendMessage?: (text: string) => void;
  messages?: Message[];
}

import UserPhoneView from './UserPhoneView';

const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const RealisticPhoneView: React.FC<PhoneViewProps> = ({ 
  character, user, onClose, onUpdateCharacter, onUpdateUser, onSendMessageToNPC, t,
  settings, geminiService, onSendMessage, messages
}) => {
  const [phoneMode, setPhoneMode] = useState<'npc' | 'user'>('npc');
  // NPC Phone State
  const [tab, setTab] = useState<'home' | 'assets' | 'diary' | 'contacts' | 'internalChat' | 'call' | 'chatDetail' | 'contactDetail' | 'userCall' | 'voiceSettings' | 'userMessages' | 'callApp'>('home');
  
  // User Phone State
  const [userTab, setUserTab] = useState<'home' | 'contacts' | 'messages' | 'settings' | 'contactDetail'>('home');
  const [userActiveContactId, setUserActiveContactId] = useState<string | null>(null);
  const [userSelectedContact, setUserSelectedContact] = useState<UserNPCRelation | null>(null);
  const [userMessageInput, setUserMessageInput] = useState('');
  const [isUserSending, setIsUserSending] = useState(false);
  const userMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // --- USER PHONE HELPERS ---
  const handleOpenUserContactDetail = (rel: UserNPCRelation) => {
      setUserSelectedContact(rel);
      setUserTab('contactDetail');
  };

  const handleAddNewUserContact = () => {
      const newRel: UserNPCRelation = {
          npcId: 'new-' + Date.now(),
          npcName: '',
          npcAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${Date.now()}`,
          relationship: '',
          relationshipStatus: 'Bình thường',
          affinity: 50,
          personalNotes: '',
          history: [],
          lastInteraction: Date.now()
      };
      setUserSelectedContact(newRel);
      setUserTab('contactDetail');
  };
  const [selectedRelation, setSelectedRelation] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
  // Tự động cuộn xuống khi có tin nhắn mới trong chatDetail
  useEffect(() => {
    if (tab === 'chatDetail' && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedRelation?.history, tab]);

  // Tự động cuộn xuống khi có tin nhắn mới trong userMessages
  useEffect(() => {
    if (tab === 'userMessages' && userMessagesEndRef.current) {
      userMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, tab]);
  const [assetTab, setAssetTab] = useState<'overview' | 'cashflow' | 'properties'>('overview');
  const [isAutoReplying, setIsAutoReplying] = useState(settings.behavior?.npcAutoReply || false);
  const [editNotes, setEditNotes] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAffinity, setEditAffinity] = useState(50);
  const geminiRef = useRef(new GeminiService());
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Voice Settings State
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('auro_voice_settings');
    const defaultSettings = { 
        pitch: 1, 
        rate: 1, 
        voiceURI: '', 
        useGeminiTTS: false, 
        geminiVoice: 'Kore', 
        provider: 'gemini',
        youtubeLinks: ['https://www.youtube.com/watch?v=jfKfPfyJRdk'],
        selectedYoutubeLink: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        videoScale: 1.5,
        youtubeNotes: {} as Record<string, string>
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [newYoutubeLink, setNewYoutubeLink] = useState('');
  const [newYoutubeNote, setNewYoutubeNote] = useState('');

  useEffect(() => {
    localStorage.setItem('auro_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  // Sync character youtube link
  useEffect(() => {
      if (character.youtubeLink) {
          setVoiceSettings(prev => {
              const currentLinks = prev.youtubeLinks || [];
              // Only add if not exists
              const newLinks = currentLinks.includes(character.youtubeLink!) 
                  ? currentLinks 
                  : [...currentLinks, character.youtubeLink!];
              
              // Auto select if it's the character's link (optional: or just add it)
              // Let's auto select it to give the "theme" feel
              return {
                  ...prev,
                  youtubeLinks: newLinks,
                  selectedYoutubeLink: character.youtubeLink!
              };
          });
      }
  }, [character.id, character.youtubeLink]);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('Ready');
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const lastSpokenId = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // QUAN TRỌNG: Dùng Ref để luôn lấy được dữ liệu character mới nhất trong các hàm async
  const characterRef = useRef(character);
  useEffect(() => { characterRef.current = character; }, [character]);

  const gemini = geminiService || geminiRef.current;

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthesisRef.current.getVoices();
      setAvailableVoices(voices);
      // Try to find a Vietnamese voice or fallback
      const viVoice = voices.find(v => v.lang.includes('vi'));
      if (viVoice && !voiceSettings.voiceURI) {
        setVoiceSettings(prev => ({ ...prev, voiceURI: viVoice.voiceURI }));
      }
    };
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'vi-VN';

      recognitionRef.current.onstart = () => setCallStatus('Listening...');
      recognitionRef.current.onend = () => {
        if (isCalling && callStatus !== 'Speaking...') setCallStatus('Processing...');
      };
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && onSendMessage) {
          onSendMessage(transcript);
          setCallStatus('Thinking...');
        }
      };
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setCallStatus('Error: ' + event.error);
        // Don't stop calling on error, just retry listening if needed or wait for user
        if (event.error === 'no-speech') {
             try { recognitionRef.current?.stop(); } catch(e){}
             setTimeout(() => {
                 if(isCalling && callStatus !== 'Speaking...') {
                     try { recognitionRef.current?.start(); } catch(e){}
                 }
             }, 1000);
        }
      };
    }
  }, [onSendMessage, isCalling, callStatus]);

  const playAudio = async (base64Data: string) => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      
      try {
          // Ensure base64 string is clean
          const cleanBase64 = base64Data.replace(/\s/g, '');
          
          // Detect MIME type based on header
          let mimeType = 'audio/mp3';
          if (cleanBase64.startsWith('UklGR')) {
              mimeType = 'audio/wav';
          } else if (cleanBase64.startsWith('OggS')) {
              mimeType = 'audio/ogg';
          }
          
          // Convert base64 to Blob
          const binaryString = window.atob(cleanBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(blob);
          
          const audio = new Audio(url);
          audioRef.current = audio;
          
          audio.onended = () => {
              setCallStatus('Listening...');
              URL.revokeObjectURL(url); // Cleanup
              try {
                  recognitionRef.current?.start();
              } catch (e) {
                  // Ignore
              }
          };
          
          audio.onerror = (e) => {
              console.error("Audio playback error", e);
              setCallStatus('Audio Error');
              URL.revokeObjectURL(url);
          };

          await audio.play();
      } catch (e) {
          console.error("Audio setup/play error", e);
          setCallStatus('Audio Error');
      }
  };

  // Watch for new AI messages to speak
  useEffect(() => {
    if (isCalling && messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === Sender.AI && !lastMsg.isThinking && lastMsg.id !== lastSpokenId.current) {
        lastSpokenId.current = lastMsg.id;
        setCallStatus('Speaking...');
        
        // Stop recognition while speaking
        try { recognitionRef.current?.stop(); } catch(e) {}

        if (voiceSettings.useGeminiTTS) {
            speakWithGemini(lastMsg.text);
        } else {
            speakWithBrowser(lastMsg.text);
        }
      }
    }
  }, [messages, isCalling, voiceSettings, availableVoices]);

  const speakWithGemini = async (text: string) => {
      setCallStatus('Speaking...');
      try {
          const base64Audio = await gemini.generateTTS(text, voiceSettings.geminiVoice);
          if (base64Audio) {
              await playAudio(base64Audio);
          } else {
              speakWithBrowser(text);
          }
      } catch (e) {
          console.error("Gemini TTS error", e);
          speakWithBrowser(text);
      }
  };

  const speakWithBrowser = (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = availableVoices.find(v => v.voiceURI === voiceSettings.voiceURI);
      if (voice) utterance.voice = voice;
      utterance.pitch = voiceSettings.pitch;
      utterance.rate = voiceSettings.rate;
      utterance.onend = () => {
           setCallStatus('Listening...');
           try {
              recognitionRef.current?.start();
           } catch (e) {
              // Ignore if already started
           }
      };
      synthesisRef.current.speak(utterance);
  };

  const startCall = () => {
    setIsCalling(true);
    setCallStatus('Listening...');
    if (messages && messages.length > 0) {
        lastSpokenId.current = messages[messages.length - 1].id;
    }
    try {
        recognitionRef.current?.start();
    } catch (e) {
        console.error("Start error", e);
    }
  };

  const endCall = () => {
    setIsCalling(false);
    setCallStatus('Ended');
    recognitionRef.current?.stop();
    synthesisRef.current.cancel();
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
  };

  const testVoice = async () => {
    if (voiceSettings.useGeminiTTS) {
        speakWithGemini("Alo, em nghe nè. Giọng này ổn không anh?");
        return;
    }
    const utterance = new SpeechSynthesisUtterance("Alo, em nghe nè. Giọng này ổn không anh?");
    const voice = availableVoices.find(v => v.voiceURI === voiceSettings.voiceURI);
    if (voice) utterance.voice = voice;
    utterance.pitch = voiceSettings.pitch;
    utterance.rate = voiceSettings.rate;
    synthesisRef.current.speak(utterance);
  };

  useEffect(() => {
    if (settings?.apiConfigs) {
        const geminiConfig = settings.apiConfigs.find(c => c.provider === 'gemini');
        if (geminiConfig && geminiConfig.keys) {
            const keys = geminiConfig.keys
                .filter(k => k.isActive && k.value);
            geminiRef.current.updateKeys(keys);
        }
    }
  }, [settings?.apiConfigs]);

  // Sync with settings changes
  useEffect(() => {
    setIsAutoReplying(settings.behavior?.npcAutoReply || false);
  }, [settings.behavior?.npcAutoReply]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredRelations = character.relations?.filter(r => r.name !== character.name) || [];

  useEffect(() => {
     const triggerRandomMessage = async () => {         
         if (!settings.behavior?.npcAutoReply || filteredRelations.length === 0 || !onUpdateCharacter) return;         
         if (sessionStorage.getItem('phone_event_triggered')) return;
         if (Math.random() < 0.3) {
             const randomRel = filteredRelations[Math.floor(Math.random() * filteredRelations.length)];
             sessionStorage.setItem('phone_event_triggered', 'true');
             try {
                const history = await gemini.generateSocialChat(
                    characterRef.current.name, 
                    characterRef.current.description, 
                    randomRel.name, 
                    randomRel.type,
                    randomRel.affinityWithChar || 50,
                    randomRel.personalNotes || ''
                );
                const oldHistory = randomRel.history || [];
                const newHistory = [...oldHistory, ...history];
                const updatedRelations = characterRef.current.relations.map(r => 
                  r.id === randomRel.id ? { ...r, history: newHistory, lastMessage: history[history.length-1]?.text || '' } : r
                );
                onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
             } catch (e) { console.error(e); }
         }
     };
     triggerRandomMessage();
  }, []);

  useEffect(() => {
    let timeout: any;
    const simulateChat = async () => {
        if (!isAutoReplying || !selectedRelation || tab !== 'chatDetail' || !onUpdateCharacter) return;
        setIsLoadingChat(true); 
        const nextMsg = await gemini.generateNextSocialTurn(
            characterRef.current.name,
            characterRef.current.description,
            selectedRelation.name,
            selectedRelation.type,
            selectedRelation.history || [],
            selectedRelation.affinityWithChar || 50,
            selectedRelation.personalNotes || '',
            'vi',
            characterRef.current.relations || []
        );
        if (nextMsg) {
             const newMsg = { ...nextMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
             const updatedHistory = [...(selectedRelation.history || []), newMsg];
             setSelectedRelation(prev => prev ? ({ ...prev, history: updatedHistory, lastMessage: newMsg.text }) : null);
             const updatedRelations = characterRef.current.relations.map(r => r.id === selectedRelation.id ? { ...r, history: updatedHistory, lastMessage: newMsg.text } : r);
             onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
        }
        setIsLoadingChat(false);
    };    
    if (isAutoReplying && tab === 'chatDetail' && !isLoadingChat) { 
        timeout = setTimeout(simulateChat, 4000 + Math.random() * 3000); 
    }
    return () => clearTimeout(timeout);  
  }, [isAutoReplying, tab, selectedRelation?.id, selectedRelation?.history?.length, isLoadingChat]); 
  
  const handleOpenChat = async (rel: Relation) => {
    setSelectedRelation(rel);
    setTab('chatDetail');
    // Don't force disable auto-reply if it's already enabled globally, 
    // but the user's code had setIsAutoReplying(false). 
    // Let's keep it as is from user's request.
    setIsAutoReplying(false); 
    if ((!rel.history || rel.history.length === 0) && onUpdateCharacter) {
      setIsLoadingChat(true);
      try {
        let history = await gemini.generateSocialChat(
            characterRef.current.name, 
            characterRef.current.description, 
            rel.name, 
            rel.type,
            rel.affinityWithChar || 50,
            rel.personalNotes || ''
        );
        if (!history || history.length === 0) {
            history = [{ sender: 'NPC', text: 'Xin chào...', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }];
        }
        const updatedRelations = characterRef.current.relations.map(r => r.id === rel.id ? { ...r, history: history } : r);
        onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
        setSelectedRelation({ ...rel, history: history });
      } catch (error) { console.error(error); } finally { setIsLoadingChat(false); }
    }
  };

  // ✅ HÀM CHO VỢ TỰ THAY ẢNH NPC
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedRelation && onUpdateCharacter) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const updatedRelations = characterRef.current.relations.map(r => 
          r.id === selectedRelation.id ? { ...r, avatar: base64String } : r
        );
        onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
        setSelectedRelation({ ...selectedRelation, avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenContactDetail = (rel: Relation) => {
      setSelectedRelation(rel);
      setEditName(rel.name || '');
      setEditType(rel.type || '');
      setEditStatus(rel.relationshipStatus || 'Bình thường');
      setEditAffinity(rel.affinityWithChar || 50);
      setEditNotes(rel.personalNotes || '');
      setIsEditingContact(false);
      setTab('contactDetail');
  };

  const saveContactChanges = () => {
      if (!selectedRelation || !onUpdateCharacter) return;
      setIsSavingContact(true);      
      
      let updatedRelations = [...(characterRef.current.relations || [])];
      
      if (selectedRelation.id === 'new') {
          const newRel: any = {
              id: 'npc-' + Date.now(),
              name: editName,
              type: editType,
              relationshipStatus: editStatus,
              affinityWithChar: editAffinity,
              personalNotes: editNotes,
              avatar: selectedRelation.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${editName}`,
              description: '',
              relationshipLevel: editAffinity
          };
          updatedRelations.push(newRel);
      } else {
          updatedRelations = updatedRelations.map(r => 
              r.id === selectedRelation.id ? { 
                  ...r, 
                  name: editName,
                  type: editType,
                  relationshipStatus: editStatus,
                  affinityWithChar: editAffinity,
                  personalNotes: editNotes 
              } : r
          );
      }
      
      onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
      setTimeout(() => {
          setIsSavingContact(false);
          setTab('contacts');
      }, 500);
  };

  const handleDeleteContact = () => {
      if (!selectedRelation || !onUpdateCharacter || selectedRelation.id === 'new') return;
      if (!confirm(`Bạn có chắc muốn xóa NPC ${selectedRelation.name}?`)) return;
      
      const updatedRelations = characterRef.current.relations?.filter(r => r.id !== selectedRelation.id) || [];
      onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
      setTab('contacts');
  };

  const handleAddNewContact = () => {
      const newRel: any = {
          id: 'new',
          name: '',
          type: '',
          relationshipStatus: 'Bình thường',
          affinityWithChar: 50,
          personalNotes: '',
          avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${Date.now()}`
      };
      setSelectedRelation(newRel);
      setEditName('');
      setEditType('');
      setEditStatus('Bình thường');
      setEditAffinity(50);
      setEditNotes('');
      setIsEditingContact(true);
      setTab('contactDetail');
  };

  const currency = character.world?.currency || character.world?.currencyName || "Vàng";
  const totalAssetValue = (character.money ?? 0) + (character.properties?.reduce((sum, p) => sum + (p.value ?? 0), 0) || 0);
  const transactions = [...(character.transactions || [])].sort((a, b) => b.date - a.date);
  const diary = character.diary || [];
  
  return (
    <div className="h-full w-full p-2 sm:p-4 flex flex-col relative animate-in fade-in zoom-in-95 duration-500 items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className={`relative w-full max-w-[360px] h-full max-h-[850px] ${phoneMode === 'user' ? 'bg-[#1a1a1a]' : 'bg-[#09090b]'} rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[8px] border-[#1a1a2e] overflow-hidden flex flex-col ring-4 ring-[#2A2A40]/50 transition-colors duration-500`}>
        <div className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none z-50 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"></div>
        <div className={`absolute inset-0 bg-gradient-to-b ${phoneMode === 'user' ? 'from-[#2d3748] via-[#1a202c] to-[#000000]' : 'from-[#1E1E2E] via-[#13132B] to-[#0A0A12]'} z-0 transition-colors duration-500`}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0 pointer-events-none mix-blend-overlay"></div>
        
        <div className="h-10 w-full flex justify-between items-center px-6 pt-3 text-white/90 z-20 font-bold text-[10px] select-none">
          <span className="tracking-widest">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex gap-2 items-center">
              <i className="fa-solid fa-signal text-[9px]"></i>
              <i className="fa-solid fa-wifi text-[9px]"></i>
              <div className="w-5 h-2.5 border border-white/40 rounded-[2px] flex items-center p-[1px]">
                  <div className="h-full w-[80%] bg-white"></div>
              </div>
          </div>
        </div>

        <div className="flex-1 z-10 flex flex-col overflow-hidden relative">
          {tab === 'home' && phoneMode === 'npc' && (
            <div className="flex-1 flex flex-col justify-between p-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-start mt-8">
                  <div 
                    onClick={() => setPhoneMode('user')}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md p-2 pr-4 rounded-2xl shadow-lg hover:bg-white/10 transition-all cursor-pointer active:scale-95 group"
                  >
                      <img src={character.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-sm group-hover:scale-105 transition-transform" />
                      <div>
                          <h2 className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-indigo-300 transition-colors">{character.name}</h2>
                          <p className="text-[9px] text-indigo-300 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                              ONLINE
                          </p>
                      </div>
                  </div>
              </div>
              <div className="text-center my-auto">
                  <h1 className="text-6xl font-thin text-white tracking-tighter opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      {currentTime.getHours()}:{currentTime.getMinutes() < 10 ? '0'+currentTime.getMinutes() : currentTime.getMinutes()}                  </h1>
                  <p className="text-[10px] text-indigo-200/60 uppercase tracking-[0.4em] mt-2 font-light">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10">
                  <div className="grid grid-cols-4 gap-4">
                     {[
                        { id: 'assets', icon: 'fa-wallet', color: 'text-amber-400', label: t('phone.app.assets'), bg: 'from-amber-500/20 to-amber-900/20' },                        { id: 'diary', icon: 'fa-book-journal-whills', color: 'text-emerald-400', label: t('phone.app.diary'), bg: 'from-emerald-500/20 to-emerald-900/20' },
                        { id: 'contacts', icon: 'fa-address-book', color: 'text-blue-400', label: t('phone.app.contacts'), bg: 'from-blue-500/20 to-blue-900/20' },
                        { id: 'internalChat', icon: 'fa-comments', color: 'text-indigo-400', label: t('phone.app.messages'), bg: 'from-indigo-500/20 to-indigo-900/20' },
                        { id: 'callApp', icon: 'fa-phone', color: 'text-rose-400', label: t('phone.app.call'), bg: 'from-rose-500/20 to-rose-900/20' },
                     ].map((app) => (
                         <button key={app.id} onClick={() => setTab(app.id as any)} className="flex flex-col items-center gap-2 group">
                            <div className={`w-14 h-14 rounded-[1.2rem] bg-gradient-to-br ${app.bg} border border-white/10 backdrop-blur-md flex items-center justify-center shadow-lg group-active:scale-95 transition-all group-hover:border-white/30 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <i className={`fa-solid ${app.icon} text-xl ${app.color} drop-shadow-sm`}></i>
                            </div>
                            <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-white transition-colors">{app.label}</span>
                         </button>
                     ))}
                     <button onClick={onClose} className="flex flex-col items-center gap-2 group opacity-70 hover:opacity-100">
                        <div className="w-14 h-14 rounded-[1.2rem] bg-slate-800/50 border border-white/10 flex items-center justify-center group-active:scale-95 transition-all shadow-inner">
                            <i className="fa-solid fa-power-off text-lg text-slate-500"></i>
                        </div>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wide">EXIT</span>
                     </button>
                  </div>
              </div>
            </div>
          )}

          {/* USER PHONE HOME */}
          {phoneMode === 'user' && (
             <UserPhoneView 
                user={user} 
                onUpdateUser={onUpdateUser} 
                onClose={onClose} 
                currentTime={currentTime} 
                setPhoneMode={setPhoneMode}
                onSendMessageToNPC={onSendMessageToNPC}
                character={character}
                onUpdateCharacter={onUpdateCharacter}
                setNpcTab={setTab}
                t={t}
                geminiService={gemini}
             />
          )}

          {/* USER CALL INTERFACE */}
          {tab === 'userCall' && (
             <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950 to-black text-white p-8 animate-in fade-in duration-500 overflow-hidden rounded-[2.5rem]">
                {isCalling && voiceSettings.selectedYoutubeLink && getYoutubeVideoId(voiceSettings.selectedYoutubeLink) ? (
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                        <iframe 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60 transition-all duration-500"
                            style={{ width: `${(voiceSettings.videoScale || 1.5) * 100}%`, height: `${(voiceSettings.videoScale || 1.5) * 100}%` }}
                            src={`https://www.youtube.com/embed/${getYoutubeVideoId(voiceSettings.selectedYoutubeLink)}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=${getYoutubeVideoId(voiceSettings.selectedYoutubeLink)}`}
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen
                        ></iframe>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20"></div>
                    </div>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse z-0"></div>
                        <div className="absolute w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse duration-[3000ms] z-0"></div>
                    </>
                )}
                
                <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10 w-full mb-10">
                   <div className="relative">
                       <div className={`absolute -inset-6 bg-emerald-500/20 rounded-full blur-xl ${isCalling ? 'animate-pulse' : ''}`}></div>
                       <img src={character.avatar} className="w-32 h-32 rounded-full border-4 border-[#09090b] shadow-2xl relative z-10 object-cover bg-slate-800" />
                   </div>
                   <div className="text-center">
                      <h3 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{character.name}</h3>
                      <p className="text-emerald-400 font-mono text-[10px] uppercase tracking-[0.4em] mt-3 animate-pulse">{callStatus}</p>
                   </div>
                </div>

                <div className="w-full space-y-8 z-10 pb-8">
                    {!isCalling ? (
                        <div className="flex justify-center">
                            <button onClick={startCall} className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-90 transition-all z-10 hover:bg-emerald-600 animate-bounce">
                                <i className="fa-solid fa-phone text-2xl"></i>
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center gap-6">
                            <button onClick={endCall} className="w-20 h-20 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.5)] active:scale-90 transition-all z-10 hover:bg-rose-600">
                                <i className="fa-solid fa-phone-slash text-2xl"></i>
                            </button>
                        </div>
                    )}
                    <button onClick={() => { setTab('home'); setUserTab('home'); }} className="absolute top-4 left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                </div>
             </div>
          )}

          {/* VOICE SETTINGS INTERFACE */}
          {tab === 'voiceSettings' && (
             <div className="flex-1 flex flex-col bg-[#1a1a1a] text-white p-6 animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => { setTab('home'); setUserTab('home'); }} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 className="text-lg font-black uppercase tracking-widest">Cài đặt</h2>
                </div>

                <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* Toggle Gemini TTS */}
                    <div className="space-y-4 mb-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhà cung cấp AI</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setVoiceSettings(prev => ({ ...prev, provider: 'gemini' }))}
                                className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                    voiceSettings.provider === 'gemini' 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                Gemini
                            </button>
                            <button
                                onClick={() => setVoiceSettings(prev => ({ ...prev, provider: 'groq' }))}
                                className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                    voiceSettings.provider === 'groq' 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                Groq
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Giọng AI Cao Cấp</span>
                            <span className="text-[8px] text-slate-400">Sử dụng Gemini TTS (Tự nhiên hơn)</span>
                        </div>
                        <button 
                            onClick={() => setVoiceSettings(prev => ({ ...prev, useGeminiTTS: !prev.useGeminiTTS }))}
                            className={`w-10 h-5 rounded-full relative transition-colors ${voiceSettings.useGeminiTTS ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${voiceSettings.useGeminiTTS ? 'left-6' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {voiceSettings.useGeminiTTS ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn giọng Gemini</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(voice => (
                                    <button
                                        key={voice}
                                        onClick={() => setVoiceSettings(prev => ({ ...prev, geminiVoice: voice }))}
                                        className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                            voiceSettings.geminiVoice === voice 
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {voice}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-500 italic mt-2 text-center">
                                * Giọng AI cần kết nối mạng để hoạt động.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn giọng trình duyệt</label>
                                <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-emerald-500/50 transition-colors"
                                    value={voiceSettings.voiceURI}
                                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, voiceURI: e.target.value }))}
                                >
                                    {availableVoices.map((v, index) => (
                                        <option key={`${v.voiceURI}-${index}`} value={v.voiceURI} className="text-black">
                                            {v.name} ({v.lang})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cao độ (Pitch)</label>
                                    <span className="text-[10px] font-mono text-emerald-400">{voiceSettings.pitch}</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="2" step="0.1"
                                    value={voiceSettings.pitch}
                                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                                    className="w-full accent-emerald-500"
                                />
                            </div>

                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tốc độ (Rate)</label>
                                    <span className="text-[10px] font-mono text-emerald-400">{voiceSettings.rate}</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="2" step="0.1"
                                    value={voiceSettings.rate}
                                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                                    className="w-full accent-emerald-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Độ phóng to Video</label>
                            <span className="text-[10px] font-mono text-emerald-400">{Math.round((voiceSettings.videoScale || 1.5) * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="1" max="3" step="0.1"
                            value={voiceSettings.videoScale || 1.5}
                            onChange={(e) => setVoiceSettings(prev => ({ ...prev, videoScale: parseFloat(e.target.value) }))}
                            className="w-full accent-emerald-500"
                        />
                    </div>

                    <button 
                        onClick={testVoice}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-play"></i> Nghe thử giọng
                    </button>

                    <div className="space-y-4 mt-6 pt-6 border-t border-white/10">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Video Nền Cuộc Gọi (YouTube)</label>
                        
                        <div className="flex flex-col gap-2">
                            <input 
                                type="text"
                                value={newYoutubeLink}
                                onChange={(e) => setNewYoutubeLink(e.target.value)}
                                placeholder="Nhập link YouTube (VD: https://youtu.be/...)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50 transition-colors"
                            />
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newYoutubeNote}
                                    onChange={(e) => setNewYoutubeNote(e.target.value)}
                                    placeholder="Ghi chú (VD: vui, buồn...)"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50 transition-colors"
                                />
                                <button 
                                    onClick={() => {
                                        if (newYoutubeLink.trim() && !voiceSettings.youtubeLinks?.includes(newYoutubeLink.trim())) {
                                            setVoiceSettings(prev => ({
                                                ...prev,
                                                youtubeLinks: [...(prev.youtubeLinks || []), newYoutubeLink.trim()],
                                                selectedYoutubeLink: newYoutubeLink.trim(),
                                                youtubeNotes: { ...(prev.youtubeNotes || {}), [newYoutubeLink.trim()]: newYoutubeNote.trim() }
                                            }));
                                            setNewYoutubeLink('');
                                            setNewYoutubeNote('');
                                        }
                                    }}
                                    className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-500/30 transition-colors shrink-0"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {(voiceSettings.youtubeLinks || []).map((link: string, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                                        voiceSettings.selectedYoutubeLink === link 
                                        ? 'bg-emerald-500/20 border-emerald-500/50' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                                    }`}
                                    onClick={() => setVoiceSettings(prev => ({ ...prev, selectedYoutubeLink: link }))}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                                        <i className={`fa-brands fa-youtube text-lg shrink-0 ${voiceSettings.selectedYoutubeLink === link ? 'text-emerald-400' : 'text-slate-400'}`}></i>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className={`text-xs font-bold truncate ${voiceSettings.selectedYoutubeLink === link ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                {voiceSettings.youtubeNotes?.[link] || 'Video'}
                                            </span>
                                            <span className={`text-[10px] truncate opacity-70 ${voiceSettings.selectedYoutubeLink === link ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                {link}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setVoiceSettings(prev => {
                                                const newLinks = (prev.youtubeLinks || []).filter(l => l !== link);
                                                const newNotes = { ...prev.youtubeNotes };
                                                delete newNotes[link];
                                                return {
                                                    ...prev,
                                                    youtubeLinks: newLinks,
                                                    youtubeNotes: newNotes,
                                                    selectedYoutubeLink: prev.selectedYoutubeLink === link ? (newLinks[0] || '') : prev.selectedYoutubeLink
                                                };
                                            });
                                        }}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0"
                                    >
                                        <i className="fa-solid fa-trash text-[10px]"></i>
                                    </button>
                                </div>
                            ))}
                            {(!voiceSettings.youtubeLinks || voiceSettings.youtubeLinks.length === 0) && (
                                <div className="text-center py-4 text-slate-500 italic text-[10px]">
                                    Chưa có video nền nào.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             </div>
          )}

          {tab === 'userMessages' && (
             <div className="flex-1 flex flex-col bg-[#0F0F1A] animate-in slide-in-from-right duration-300 z-50 absolute inset-0">
                <div className="h-14 px-5 flex items-center gap-4 shrink-0 border-b border-white/5 bg-[#0F0F1A]/90 backdrop-blur-xl z-30 shadow-sm">
                    <button onClick={() => { setTab('home'); setUserTab('home'); }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-colors border border-white/10 active:scale-90">
                        <i className="fa-solid fa-chevron-left text-xs"></i>
                    </button>
                    <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex-1 text-center truncate">
                        {character.name}
                    </span>
                    <div className="w-8"></div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
                  {messages && messages.length > 0 ? (
                    messages.filter(m => m.sender === 'USER' || m.sender === 'AI').map((msg, idx) => {
                      const isFromNPC = msg.sender === 'AI';
                      return (
                        <div key={msg.id || idx} className={`flex ${isFromNPC ? 'justify-start' : 'justify-end'} mb-4 shrink-0`}>
                          {isFromNPC && (
                            <img src={character.avatar} className="w-8 h-8 rounded-full mr-2 self-end border border-white/10" />
                          )}
                          <div className={`max-w-[75%] p-3 px-4 rounded-2xl text-[11px] shadow-sm ${
                            isFromNPC 
                              ? 'bg-slate-800 text-slate-200 rounded-bl-none' 
                              : 'bg-emerald-600 text-white rounded-br-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 text-slate-600 italic text-[9px]">{t('phone.chat.empty')}</div>
                  )}
                  <div ref={userMessagesEndRef} />
                </div>
                
                <div className="p-3 bg-[#131320] border-t border-white/5 flex gap-2 items-center shrink-0 mb-2">
                  <input 
                    type="text"
                    value={userMessageInput}
                    onChange={(e) => setUserMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && userMessageInput.trim() && onSendMessage) {
                            onSendMessage(userMessageInput);
                            setUserMessageInput('');
                        }
                    }}
                    placeholder="Nhắn tin..."
                    className="flex-1 h-10 bg-white/5 rounded-full border border-white/5 px-4 text-[11px] text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <button 
                    onClick={() => {
                        if (userMessageInput.trim() && onSendMessage) {
                            onSendMessage(userMessageInput);
                            setUserMessageInput('');
                        }
                    }}
                    disabled={!userMessageInput.trim()}
                    className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                  </button>
                </div>
             </div>
          )}

          {tab !== 'home' && tab !== 'call' && tab !== 'userCall' && tab !== 'voiceSettings' && tab !== 'userMessages' && (
              <div className="h-14 px-5 flex items-center gap-4 shrink-0 border-b border-white/5 bg-[#0F0F1A]/90 backdrop-blur-xl z-30 shadow-sm">
                  <button onClick={() => {
                      if (tab === 'contactDetail') setTab('contacts');
                      else setTab('home');
                  }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-colors border border-white/10 active:scale-90">
                      <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex-1 text-center truncate">
                      {tab === 'assets' ? t('phone.assets.title') : 
                       tab === 'diary' ? t('phone.diary.title') :
                       tab === 'contacts' ? t('phone.contacts.title') :
                       tab === 'internalChat' ? t('phone.messages.title') :
                       tab === 'callApp' ? t('phone.app.call') :
                       tab === 'contactDetail' ? 'Thông tin Contact' :
                       selectedRelation?.name}
                  </span>
                  <div className="w-8"></div>
              </div>          )}


          {tab === 'contacts' && (
             <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-5 space-y-3 overflow-y-auto custom-scrollbar">
                   {filteredRelations.map(rel => (
                      <div key={rel.id} onClick={() => handleOpenContactDetail(rel)} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer active:scale-95">
                         <div className="relative">                            <img src={rel.avatar} className="w-12 h-12 rounded-2xl object-cover border border-white/10 bg-slate-800 shadow-sm" />
                            {rel.affinityWithChar > 80 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#0F0F1A] flex items-center justify-center"><i className="fa-solid fa-heart text-[6px] text-white"></i></div>}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-200 uppercase truncate group-hover:text-white transition-colors">{rel.name}</p>
                            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">{rel.type}</p>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                             <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${rel.relationshipStatus === 'Thân thiết' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                {rel.relationshipStatus || 'Bình thường'}
                             </div>
                             <div className="text-[9px] font-mono font-bold text-emerald-400">{rel.affinityWithChar || 50}%</div>
                         </div>
                      </div>
                   ))}
                   {filteredRelations.length === 0 && <div className="text-center py-20 text-slate-500 italic text-[10px]">{t('phone.contacts.empty')}</div>}
                   {filteredRelations.length < 6 && (
                       <button onClick={handleAddNewContact} className="w-full py-3 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-bold text-slate-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                           <i className="fa-solid fa-plus"></i> Thêm NPC Mới ({filteredRelations.length}/6)
                       </button>
                   )}
                </div>
             </div>
          )}

          {tab === 'contactDetail' && selectedRelation && (
              <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-bottom duration-400">
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="flex flex-col items-center gap-4 py-4">
                          <div className="relative group cursor-pointer" onClick={() => document.getElementById('npc-avatar-up')?.click()}>
                              <img src={selectedRelation.avatar || 'https://via.placeholder.com/150'} className="w-24 h-24 rounded-3xl object-cover border-2 border-white/10 shadow-2xl" />
                              <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <i className="fa-solid fa-camera text-white"></i>
                              </div>
                              <input type="file" id="npc-avatar-up" className="hidden" accept="image/*" onChange={handleFileChange} />
                          </div>
                          <p className="text-[9px] text-slate-500 uppercase">Nhấn vào ảnh để thay đổi</p>
                          <div className="text-center w-full px-4">
                              {isEditingContact ? (
                                  <div className="space-y-2">
                                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-center text-sm font-bold text-white outline-none focus:border-indigo-500/50" placeholder="Tên NPC" />
                                      <input type="text" value={editType} onChange={e => setEditType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-center text-xs text-indigo-300 outline-none focus:border-indigo-500/50" placeholder="Vai trò (VD: Bạn thân)" />
                                  </div>
                              ) : (
                                  <>
                                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedRelation.name || 'NPC Mới'}</h3>
                                      <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.2em]">{selectedRelation.type || 'Chưa rõ'}</p>
                                  </>
                              )}
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Trạng thái</span>
                              {isEditingContact ? (
                                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-transparent border-b border-white/20 text-xs font-bold text-white outline-none pb-1">
                                      <option value="Thân thiết" className="text-black">Thân thiết</option>
                                      <option value="Bình thường" className="text-black">Bình thường</option>
                                      <option value="Căng thẳng" className="text-black">Căng thẳng</option>
                                      <option value="Xa cách" className="text-black">Xa cách</option>
                                  </select>
                              ) : (
                                  <span className="text-xs font-bold text-white">{selectedRelation.relationshipStatus || 'Bình thường'}</span>
                              )}
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Thân thiết</span>
                              {isEditingContact ? (
                                  <div className="flex items-center gap-2">
                                      <input type="range" min="0" max="100" value={editAffinity} onChange={e => setEditAffinity(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{editAffinity}%</span>
                                  </div>
                              ) : (
                                  <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                          <div className="h-full bg-emerald-500" style={{ width: `${selectedRelation.affinityWithChar || 50}%` }}></div>
                                      </div>
                                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{selectedRelation.affinityWithChar || 50}%</span>
                                  </div>
                              )}
                          </div>
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">                              <span className="text-[9px] font-black text-rose-400 uppercase flex items-center gap-2">
                                  <i className="fa-solid fa-brain"></i> Ghi chú riêng của {character.name}
                              </span>
                              <span className="text-[8px] text-slate-500 italic">NPC không thể thấy</span>
                          </div>
                          <div className="relative group">
                              <textarea 
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                className="w-full h-32 bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-4 text-xs text-slate-300 outline-none focus:border-indigo-500/50 transition-all custom-scrollbar leading-relaxed font-medium"
                                placeholder="Ghi chú về tính cách thực, điểm yếu hoặc bí mật của NPC này..."
                              />
                          </div>
                      </div>
                      <div className="flex gap-2">
                          {selectedRelation.id !== 'new' && (
                              <button 
                                onClick={() => setIsEditingContact(!isEditingContact)}
                                className="w-12 py-4 bg-white/5 border border-white/10 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
                              >
                                  <i className={`fa-solid ${isEditingContact ? 'fa-xmark' : 'fa-pen'}`}></i>
                              </button>
                          )}
                          <button 
                            onClick={saveContactChanges}
                            disabled={isSavingContact || (isEditingContact && !editName.trim())}
                            className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                              {isSavingContact ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                              LƯU THAY ĐỔI VẬN MỆNH
                          </button>
                          {isEditingContact && selectedRelation.id !== 'new' && (
                              <button 
                                onClick={handleDeleteContact}
                                className="w-12 py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                              >
                                  <i className="fa-solid fa-trash"></i>
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* ✅ GIAO DIỆN TÀI CHÍNH "PRO PLUS" */}
          {tab === 'assets' && (
            <div className="flex-1 flex flex-col bg-[#0F0F1A] text-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
               <div className="p-5 pb-2">
                   <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform"><i className="fa-solid fa-chart-pie text-5xl text-white"></i></div>
                       <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1 opacity-80">{t('phone.assets.net_worth')}</p>
                       <h2 className="text-3xl font-black text-white tracking-tight">{(totalAssetValue ?? 0).toLocaleString()} <span className="text-sm opacity-80 font-medium">{currency}</span></h2>
                   </div>
                   <div className="flex gap-2 mt-5 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                       <button onClick={() => setAssetTab('overview')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${assetTab === 'overview' ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>{t('phone.assets.overview')}</button>
                       <button onClick={() => setAssetTab('cashflow')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${assetTab === 'cashflow' ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>Dòng tiền</button>
                       <button onClick={() => setAssetTab('properties')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${assetTab === 'properties' ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>{t('phone.assets.properties')}</button>
                   </div>               </div>
               <div className="flex-1 overflow-y-auto p-5 pt-2">
                   {assetTab === 'overview' && (
                       <div className="space-y-3">
                           <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 text-lg"><i className="fa-solid fa-wallet"></i></div>
                                   <span className="text-xs font-bold uppercase text-slate-300">{t('phone.assets.cash')}</span>
                               </div>
                               <div className="flex items-center gap-3">
                                   <span className="text-sm font-mono font-bold text-white tracking-wide">{(character.money ?? 0).toLocaleString()}</span>
                                   <button onClick={() => setShowTransferModal(true)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                                       <i className="fa-solid fa-paper-plane mr-1"></i> Nạp
                                   </button>
                               </div>
                           </div>
                           <div className="flex items-center gap-2 mt-6 mb-3">
                               <div className="h-[1px] bg-white/10 flex-1"></div>
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('phone.assets.history')}</p>
                               <div className="h-[1px] bg-white/10 flex-1"></div>
                           </div>
                           {transactions.length > 0 ? transactions.slice(0, 5).map(tx => (
                               <div key={tx.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                   <div className="flex items-center gap-3">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] ${tx.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30'}`}>
                                           <i className={`fa-solid ${tx.type === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                                       </div>
                                       <div>
                                           <p className="text-[10px] font-bold text-slate-200 line-clamp-1">{tx.description}</p>
                                           <p className="text-[8px] text-slate-500 font-mono mt-0.5">{new Date(tx.date).toLocaleDateString()}</p>
                                       </div>
                                   </div>
                                   <span className={`text-[10px] font-mono font-bold ${tx.type === 'IN' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                       {tx.type === 'IN' ? '+' : '-'}{(tx.amount ?? 0).toLocaleString()}
                                   </span>
                               </div>
                           )) : (
                               <div className="text-center py-10 opacity-30 text-[9px] uppercase tracking-widest font-bold border-2 border-dashed border-white/10 rounded-2xl">NO DATA</div>
                           )}
                       </div>
                   )}
                   
                   {/* ✅ TAB DÒNG TIỀN MỚI */}
                   {assetTab === 'cashflow' && (
                     <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-3">
                         <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-900/20 p-4 rounded-2xl border border-emerald-500/20">
                           <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Thu nhập tháng</p>
                           <p className="text-xl font-black text-white">
                             {character.incomeStreams?.reduce((sum, inc) => sum + inc.amount, 0)?.toLocaleString() || 0}
                           </p>
                         </div>
                         <div className="bg-gradient-to-r from-rose-500/20 to-rose-900/20 p-4 rounded-2xl border border-rose-500/20">
                           <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Chi phí tháng</p>
                           <p className="text-xl font-black text-white">
                             {character.expenses?.reduce((sum, exp) => sum + exp.amount, 0)?.toLocaleString() || 0}                           </p>
                         </div>
                       </div>

                       <h4 className="text-xs font-black text-slate-300 mt-4 mb-2">Nguồn thu nhập</h4>
                       {character.incomeStreams && character.incomeStreams.length > 0 ? (
                         character.incomeStreams.map(stream => (
                           <div key={stream.id} className="flex justify-between text-[10px] p-3 bg-white/5 rounded-xl">
                             <span>{stream.name}</span>                             <span className="text-emerald-400">+{stream.amount.toLocaleString()}/tháng</span>
                           </div>
                         ))
                       ) : (
                         <p className="text-[10px] text-slate-500 italic">Chưa có nguồn thu</p>
                       )}

                       <h4 className="text-xs font-black text-slate-300 mt-4 mb-2">Chi phí định kỳ</h4>
                       {character.expenses && character.expenses.length > 0 ? (
                         character.expenses.map(expense => (
                           <div key={expense.id} className="flex justify-between text-[10px] p-3 bg-white/5 rounded-xl">
                             <span>{expense.name}</span>
                             <span className="text-rose-400">-{expense.amount.toLocaleString()}/tháng</span>
                           </div>
                         ))
                       ) : (
                         <p className="text-[10px] text-slate-500 italic">Không có chi phí</p>
                       )}
                     </div>
                   )}
                   
                   {assetTab === 'properties' && (
                       <div className="space-y-4">
                           {character.properties?.map((prop, idx) => (
                               <div key={idx} className="bg-slate-800/50 rounded-3xl overflow-hidden border border-white/10 group shadow-lg">
                                   <div className="h-28 bg-slate-900 relative overflow-hidden">
                                       {(prop.image && typeof prop.image === 'string' && prop.image.startsWith('http')) ? <img src={prop.image} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30 animate-pulse">{prop.image || '🏠'}</div>}
                                       <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black uppercase text-white border border-white/10 shadow-sm">{prop.type}</span>
                                   </div>
                                   <div className="p-4">
                                       <h4 className="font-black text-white text-xs uppercase mb-1 tracking-wide">{prop.name}</h4>
                                       <div className="flex justify-between items-center mt-3">
                                           <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-indigo-500"></i> {prop.location}</span>
                                           <span className="text-amber-400 font-mono font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{(prop.value ?? 0).toLocaleString()}</span>
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
            </div>          )}
          
          {tab === 'diary' && (
             <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5">
                   {diary.map((entry, idx) => (
                      <div key={idx} className="bg-[#1E1E2E] p-5 rounded-2xl border-l-4 border-indigo-500 relative shadow-md group hover:bg-[#252538] transition-colors">
                         <div className="flex justify-between items-center mb-3">                             <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest font-mono">{new Date(entry.date).toLocaleDateString('vi-VN')}</p>
                             <i className="fa-solid fa-feather text-white/10 text-sm group-hover:text-indigo-500/50 transition-colors"></i>
                         </div>
                         <p className="text-xs text-slate-300 italic leading-relaxed font-serif opacity-90">"{entry.content}"</p>
                      </div>
                   ))}
                </div>
             </div>
          )}
          
          {tab === 'internalChat' && (
             <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                   {filteredRelations.length > 0 ? filteredRelations.map(rel => (
                      <button key={rel.id} onClick={() => handleOpenChat(rel)} className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-all border-b border-white/5 text-left active:bg-white/10 group">
                         <div className="relative">
                             <img src={rel.avatar} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-slate-800 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all" />
                             <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-[#0F0F1A] rounded-full"></div>
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                               <p className="text-xs font-black text-slate-200 uppercase group-hover:text-white transition-colors">{rel.name}</p>
                               <span className="text-[9px] text-slate-600 font-mono group-hover:text-slate-400">Now</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity font-medium">{rel.lastMessage || '...'}</p>
                         </div>
                      </button>
                   )) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50 py-20">
                          <i className="fa-solid fa-address-book text-4xl"></i>
                          <span className="text-xs uppercase tracking-widest">Không có liên hệ</span>
                      </div>
                   )}
                </div>
             </div>
          )}
          
          {tab === 'callApp' && (
             <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                   {filteredRelations.length > 0 ? filteredRelations.map(rel => (
                      <button key={rel.id} onClick={() => { setSelectedRelation(rel); setTab('call'); }} className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-all border-b border-white/5 text-left active:bg-white/10 group">
                         <div className="relative">
                             <img src={rel.avatar} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-slate-800 ring-2 ring-transparent group-hover:ring-rose-500/50 transition-all" />
                             <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-[#0F0F1A] rounded-full"></div>
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                               <p className="text-xs font-black text-slate-200 uppercase group-hover:text-white transition-colors">{rel.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity font-medium">{rel.type || 'Liên hệ'}</p>
                         </div>
                         <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                             <i className="fa-solid fa-phone"></i>
                         </div>
                      </button>
                   )) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50 py-20">
                          <i className="fa-solid fa-address-book text-4xl"></i>
                          <span className="text-xs uppercase tracking-widest">Không có liên hệ</span>
                      </div>
                   )}
                </div>
             </div>
          )}
          
          {/* ✅ KHU VỰC CHAT ĐÃ SỬA - CUỘN MƯỢT & CỐ ĐỊNH INPUT */}
          {tab === 'chatDetail' && selectedRelation && (
             <div className="flex-1 flex flex-col bg-[#0F0F1A] animate-in slide-in-from-right duration-300 overflow-hidden h-full max-h-full">
                {/* ✅ ĐẢM BẢO CUỘN ĐƯỢC */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
                  {Array.isArray(selectedRelation.history) && selectedRelation.history.length > 0 ? (
                    // ✅ HIỂN THỊ THEO THỨ TỰ TỰ NHIÊN - CHIA 2 BÊN
                    selectedRelation.history.map((msg, idx) => {
                      if (!msg) return null;
                      // NPC gửi thì bên TRÁI, Character gửi thì bên PHẢI
                      const isFromNPC = msg.sender === 'NPC' || msg.sender === selectedRelation.name;
                      const isFromChar = msg.sender === 'CHAR' || msg.sender === character.name;
                      
                      // Mặc định nếu không xác định được thì NPC bên trái, Char bên phải
                      const alignLeft = isFromNPC || (!isFromChar && msg.sender !== 'USER');
                      
                      return (
                        <div key={idx} className={`flex ${alignLeft ? 'justify-start' : 'justify-end'} mb-4 shrink-0`}>
                          {alignLeft && (
                            <img src={selectedRelation.avatar} className="w-8 h-8 rounded-full mr-2 self-end border border-white/10" />
                          )}
                          <div className={`max-w-[75%] p-3 px-4 rounded-2xl text-[11px] shadow-sm ${
                            alignLeft 
                              ? 'bg-slate-800 text-slate-200 rounded-bl-none' 
                              : 'bg-indigo-600 text-white rounded-br-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    !isLoadingChat && <div className="text-center py-20 text-slate-600 italic text-[9px]">{t('phone.chat.empty')}</div>
                  )}
                  
                  {isLoadingChat && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-2xl rounded-bl-none self-start w-fit animate-pulse mt-2 shrink-0">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>
                
                {/* KHU VỰC NHẬP LIỆU - CỐ ĐỊNH DƯỚI CÙNG */}
                <div className="p-3 bg-[#131320] border-t border-white/5 flex gap-2 items-center shrink-0 mb-2">
                  <button 
                    onClick={() => setIsAutoReplying(!isAutoReplying)} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                      isAutoReplying 
                        ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                        : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                    }`} 
                    title="Auto Reply"
                  >
                    <i className="fa-solid fa-robot text-sm"></i>
                  </button>
                  <div className="flex-1 h-10 bg-white/5 rounded-full border border-white/5 flex items-center px-4 text-[10px] text-slate-500 italic truncate">
                    {t('phone.chat.spy')}
                  </div>
                  <button 
                    onClick={async () => {
                      if (!selectedRelation || !onUpdateCharacter || isLoadingChat) return;
                      setIsLoadingChat(true);
                      const nextMsg = await gemini.generateNextSocialTurn(
                          characterRef.current.name,
                          characterRef.current.description,
                          selectedRelation.name,
                          selectedRelation.type,
                          selectedRelation.history || [],
                          selectedRelation.affinityWithChar || 50,
                          selectedRelation.personalNotes || '',
                          'vi',
                          characterRef.current.relations || [],
                          characterRef.current.diary || [],
                          { 
                            name: user?.name || 'Người dùng', 
                            description: user?.description || '', 
                            relationshipScore: characterRef.current.relationshipScore || 50 
                          }
                      );
                      if (nextMsg) {
                           const newMsg = { ...nextMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
                           const updatedHistory = [...(selectedRelation.history || []), newMsg];
                           setSelectedRelation(prev => prev ? ({ ...prev, history: updatedHistory, lastMessage: newMsg.text }) : null);
                           const updatedRelations = characterRef.current.relations.map(r => r.id === selectedRelation.id ? { ...r, history: updatedHistory, lastMessage: newMsg.text } : r);
                           onUpdateCharacter({ ...characterRef.current, relations: updatedRelations });
                      }
                      setIsLoadingChat(false);
                    }}
                    disabled={isLoadingChat}
                    className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                  >
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                  </button>
                </div>
             </div>
          )}
                    {tab === 'call' && (
             <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 to-black text-white p-8 animate-in fade-in duration-500 overflow-hidden rounded-[2.5rem]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                <div className="absolute w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse duration-[3000ms]"></div>
                <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10 w-full mb-10">
                   <div className="relative">
                       <div className="absolute -inset-6 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>                       <img src={selectedRelation?.avatar || character.avatar} className="w-32 h-32 rounded-full border-4 border-[#09090b] shadow-2xl relative z-10 object-cover bg-slate-800" />
                   </div>
                   <div className="text-center">
                      <h3 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{selectedRelation?.name || 'Unknown'}</h3>
                      <p className="text-indigo-400 font-mono text-[10px] uppercase tracking-[0.4em] mt-3 animate-pulse">{t('phone.call.calling')}</p>
                   </div>
                </div>
                <div className="w-full space-y-8 z-10 pb-8">
                    <div className="grid grid-cols-3 gap-6 w-full px-4">
                       <div className="flex flex-col items-center gap-2 opacity-50"><div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/5"><i className="fa-solid fa-microphone-slash text-xl"></i></div></div>
                       <div className="flex flex-col items-center gap-2 opacity-50"><div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/5"><i className="fa-solid fa-video text-xl"></i></div></div>
                       <div className="flex flex-col items-center gap-2 opacity-50"><div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/5"><i className="fa-solid fa-volume-high text-xl"></i></div></div>
                    </div>
                    <div className="flex justify-center">
                        <button onClick={() => setTab('home')} className="w-20 h-20 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.5)] active:scale-90 transition-all z-10 hover:bg-rose-600 animate-bounce">
                            <i className="fa-solid fa-phone-slash text-2xl"></i>
                        </button>
                    </div>
                </div>
             </div>
          )}
        </div>
        <div className="h-6 w-full flex justify-center items-center shrink-0 z-20 pb-2">
            <div className="w-32 h-1.5 bg-white/20 rounded-full backdrop-blur-sm shadow-sm"></div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200 rounded-[3rem]">
            <div className="bg-[#1E1E2E] w-full max-w-xs rounded-3xl p-6 border border-white/10 shadow-2xl relative">
                <button onClick={() => setShowTransferModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
                
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mb-4 mx-auto border border-emerald-500/20">
                    <i className="fa-solid fa-paper-plane"></i>
                </div>
                
                <h3 className="text-center text-white font-bold text-lg mb-1">Chuyển khoản</h3>
                <p className="text-center text-slate-400 text-xs mb-6">Gửi tiền cho {character.name}</p>
                
                <div className="bg-black/20 rounded-xl p-3 mb-4 border border-white/5 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Số dư hiện tại:</span>
                    <span className="text-emerald-400 font-mono font-bold">{(user?.money || 0).toLocaleString()} {currency}</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block ml-1">Số tiền</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                placeholder="0"
                                className={`w-full bg-black/30 border rounded-xl py-3 pl-4 pr-12 text-white font-mono font-bold focus:outline-none transition-colors ${
                                    parseInt(transferAmount || '0') > (user?.money || 0) 
                                    ? 'border-rose-500/50 focus:border-rose-500' 
                                    : 'border-white/10 focus:border-emerald-500/50'
                                }`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{currency}</span>
                        </div>
                        {parseInt(transferAmount || '0') > (user?.money || 0) && (
                            <p className="text-[10px] text-rose-400 mt-1 ml-1">* Số dư không đủ</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block ml-1">Lời nhắn (tùy chọn)</label>
                        <input 
                            type="text" 
                            value={transferNote}
                            onChange={(e) => setTransferNote(e.target.value)}
                            placeholder="Mua gì ngon nhé..."
                            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                    
                    <button 
                        onClick={() => {
                            if (!transferAmount || isNaN(parseInt(transferAmount))) return;
                            const amount = parseInt(transferAmount);
                            
                            if (user && amount > user.money) return; // Prevent if insufficient funds

                            const note = transferNote.trim() ? ` ${transferNote}` : '';
                            
                            // 1. Update User Balance & Transaction
                            if (user && onUpdateUser) {
                                const userTransaction: Transaction = {
                                    id: `tx-user-${Date.now()}`,
                                    type: 'OUT',
                                    amount: amount,
                                    description: `Chuyển tiền cho ${character.name}${note ? ': ' + note : ''}`,
                                    date: Date.now()
                                };
                                onUpdateUser({
                                    ...user,
                                    money: user.money - amount,
                                    transactions: [userTransaction, ...(user.transactions || [])]
                                });
                            }

                            // 2. Update Character Balance & Transaction
                            if (onUpdateCharacter) {
                                const charTransaction: Transaction = {
                                    id: `tx-char-${Date.now()}`,
                                    type: 'IN',
                                    amount: amount,
                                    description: `Nhận tiền từ ${user?.name || 'User'}${note ? ': ' + note : ''}`,
                                    date: Date.now()
                                };
                                onUpdateCharacter({
                                    ...character,
                                    money: character.money + amount,
                                    transactions: [charTransaction, ...(character.transactions || [])]
                                });
                            }

                            // 3. Send Message
                            if (onSendMessage) {
                                onSendMessage(`[CHUYỂN_KHOẢN: ${amount}]${note}`);
                                setShowTransferModal(false);
                                setTransferAmount('');
                                setTransferNote('');
                            }
                        }}
                        disabled={!transferAmount || (user ? parseInt(transferAmount || '0') > user.money : false)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] mt-2 shadow-lg shadow-emerald-500/20"
                    >
                        Xác nhận chuyển
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default RealisticPhoneView;
