import React from 'react';
import { UserProfile, UserNPCRelation, Character } from '../types';

interface UserPhoneProps {
  user?: UserProfile;
  onUpdateUser?: (newUser: UserProfile) => void;
  onClose: () => void;
  currentTime: Date;
  setPhoneMode: (mode: 'npc' | 'user') => void;
  onSendMessageToNPC?: (npcId: string, text: string, relation: string) => Promise<string>;
  character: Character;
  onUpdateCharacter?: (newChar: Character) => void;
  setNpcTab?: (tab: any) => void;
  t: (key: string) => string;
}

const UserPhoneView: React.FC<UserPhoneProps> = ({ user, onUpdateUser, onClose, currentTime, setPhoneMode, onSendMessageToNPC, character, onUpdateCharacter, setNpcTab, t }) => {
  const [userTab, setUserTab] = React.useState<'home' | 'contacts' | 'messages' | 'settings' | 'contactDetail' | 'chatDetail' | 'userCall' | 'voiceSettings' | 'call'>('home');
  const [userSelectedContact, setUserSelectedContact] = React.useState<UserNPCRelation | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editType, setEditType] = React.useState('');
  const [editStatus, setEditStatus] = React.useState('');
  const [editAffinity, setEditAffinity] = React.useState(50);
  const [editNotes, setEditNotes] = React.useState('');
  const [isEditingContact, setIsEditingContact] = React.useState(false);
  const [isSavingContact, setIsSavingContact] = React.useState(false);
  const [userMessageInput, setUserMessageInput] = React.useState('');
  const [isUserSending, setIsUserSending] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const userMessagesEndRef = React.useRef<HTMLDivElement>(null);

  const [voiceSettings, setVoiceSettings] = React.useState(() => {
    const saved = localStorage.getItem('auro_user_voice_settings');
    const defaultSettings = { 
        pitch: 1, 
        rate: 1, 
        voiceURI: '', 
        youtubeLinks: ['https://www.youtube.com/watch?v=jfKfPfyJRdk'],
        selectedYoutubeLink: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        videoScale: 1.5,
        youtubeNotes: {} as Record<string, string>
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [newYoutubeLink, setNewYoutubeLink] = React.useState('');
  const [newYoutubeNote, setNewYoutubeNote] = React.useState('');
  const [availableVoices, setAvailableVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [isCalling, setIsCalling] = React.useState(false);
  const [callStatus, setCallStatus] = React.useState('Ready');
  const synthesisRef = React.useRef<SpeechSynthesis>(window.speechSynthesis);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (character.youtubeLink) {
      setVoiceSettings(prev => {
        const currentLinks = prev.youtubeLinks || [];
        const newLinks = currentLinks.includes(character.youtubeLink!) 
          ? currentLinks 
          : [...currentLinks, character.youtubeLink!];
        
        return {
          ...prev,
          youtubeLinks: newLinks,
          selectedYoutubeLink: character.youtubeLink!
        };
      });
    }
  }, [character.id, character.youtubeLink]);

  React.useEffect(() => {
    localStorage.setItem('auro_user_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  React.useEffect(() => {
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
      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCallStatus('Speaking...');
        try { recognitionRef.current?.stop(); } catch(e) {}
        
        if (onSendMessageToNPC && user) {
            const rel = user.npcRelations?.find(r => r.npcId === character.id);
            const relation = rel ? rel.relationship : 'Người quen';
            try {
                const response = await onSendMessageToNPC(character.id, transcript, relation);
                if (response) {
                    speakWithBrowser(response);
                } else {
                    speakWithBrowser("Xin lỗi, tôi không nghe rõ.");
                }
            } catch (e) {
                speakWithBrowser("Có lỗi xảy ra khi kết nối.");
            }
        }
      };
      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech' && isCalling) {
          try { recognitionRef.current?.start(); } catch(e) {}
        }
      };
    }
    return () => {
      try { recognitionRef.current?.stop(); } catch(e) {}
      synthesisRef.current.cancel();
    };
  }, [isCalling, callStatus, onSendMessageToNPC, user, character.id, voiceSettings, availableVoices]);

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
  };

  const handleStopListening = () => {
    try {
        recognitionRef.current?.stop();
    } catch (e) {
        console.error("Stop error", e);
    }
  };

  React.useEffect(() => {
    const loadVoices = () => {
      const voices = synthesisRef.current.getVoices();
      setAvailableVoices(voices);
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

  const testVoice = async () => {
    const utterance = new SpeechSynthesisUtterance("Alo, em nghe nè. Giọng này ổn không anh?");
    const voice = availableVoices.find(v => v.voiceURI === voiceSettings.voiceURI);
    if (voice) utterance.voice = voice;
    utterance.pitch = voiceSettings.pitch;
    utterance.rate = voiceSettings.rate;
    synthesisRef.current.speak(utterance);
  };

  const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  React.useEffect(() => {
    if (userMessagesEndRef.current) {
        userMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [userSelectedContact?.history]);

  const handleOpenUserContactDetail = (rel: UserNPCRelation) => {
      setUserSelectedContact(rel);
      setEditName(rel.npcName || '');
      setEditType(rel.relationship || '');
      setEditStatus(rel.relationshipStatus || 'Bình thường');
      setEditAffinity(rel.affinity || 50);
      setEditNotes(rel.personalNotes || '');
      setIsEditingContact(false);
      setUserTab('contactDetail');
  };

  const handleOpenUserChat = (rel: UserNPCRelation) => {
      setUserSelectedContact(rel);
      setUserTab('chatDetail');
  };

  const handleSendMessage = async () => {
      if (!userMessageInput.trim() || !userSelectedContact || !onSendMessageToNPC || !user || !onUpdateUser) return;
      
      const text = userMessageInput.trim();
      setUserMessageInput('');
      setIsUserSending(true);

      // Add user message to history
      const userMsg = { sender: 'USER' as const, text, timestamp: Date.now() };
      const updatedHistory = [...(userSelectedContact.history || []), userMsg];
      
      const updatedRelations = (user.npcRelations || []).map(r => 
          r.npcId === userSelectedContact.npcId ? { ...r, history: updatedHistory, lastInteraction: Date.now() } : r
      );
      
      onUpdateUser({ ...user, npcRelations: updatedRelations });
      setUserSelectedContact({ ...userSelectedContact, history: updatedHistory });

      try {
          const response = await onSendMessageToNPC(userSelectedContact.npcId, text, userSelectedContact.relationship);
          if (response) {
              const npcMsg = { sender: 'NPC' as const, text: response, timestamp: Date.now() };
              const finalHistory = [...updatedHistory, npcMsg];
              const finalRelations = (user.npcRelations || []).map(r => 
                  r.npcId === userSelectedContact.npcId ? { ...r, history: finalHistory, lastInteraction: Date.now() } : r
              );
              onUpdateUser({ ...user, npcRelations: finalRelations });
              setUserSelectedContact(prev => prev ? { ...prev, history: finalHistory } : null);
          }
      } catch (error) {
          console.error("Error sending message to NPC:", error);
      } finally {
          setIsUserSending(false);
      }
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
      setEditName('');
      setEditType('');
      setEditStatus('Bình thường');
      setEditAffinity(50);
      setEditNotes('');
      setIsEditingContact(true);
      setUserTab('contactDetail');
  };

  const saveUserContactChanges = () => {
      if (!user || !onUpdateUser || !userSelectedContact) return;
      setIsSavingContact(true);      
      
      let updatedRelations = [...(user.npcRelations || [])];
      
      if (userSelectedContact.npcId.startsWith('new-')) {
          const newRel: UserNPCRelation = {
              ...userSelectedContact,
              npcId: 'npc-' + Date.now(),
              npcName: editName,
              relationship: editType,
              relationshipStatus: editStatus,
              affinity: editAffinity,
              personalNotes: editNotes,
              npcAvatar: userSelectedContact.npcAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${editName}`,
              lastInteraction: Date.now()
          };
          updatedRelations.push(newRel);
      } else {
          updatedRelations = updatedRelations.map(r => 
              r.npcId === userSelectedContact.npcId ? { 
                  ...r, 
                  npcName: editName,
                  relationship: editType,
                  relationshipStatus: editStatus,
                  affinity: editAffinity,
                  personalNotes: editNotes 
              } : r
          );
      }
      
      onUpdateUser({ ...user, npcRelations: updatedRelations });
      setTimeout(() => {
          setIsSavingContact(false);
          setUserTab('contacts');
      }, 500);
  };

  const handleDeleteUserContact = () => {
      if (!user || !onUpdateUser || !userSelectedContact || userSelectedContact.npcId.startsWith('new-')) return;
      if (!window.confirm(`Bạn có chắc muốn xóa NPC ${userSelectedContact.npcName}?`)) return;
      
      const updatedRelations = (user.npcRelations || []).filter(r => r.npcId !== userSelectedContact.npcId);
      onUpdateUser({ ...user, npcRelations: updatedRelations });
      setUserTab('contacts');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden relative animate-in fade-in duration-300">
        {userTab === 'home' && (
            <div className="flex-1 flex flex-col justify-between p-6">
                <div className="flex justify-between items-start mt-8">
                    <div 
                        onClick={() => setPhoneMode('npc')}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md p-2 pr-4 rounded-2xl shadow-lg hover:bg-white/10 transition-all cursor-pointer active:scale-95 group"
                    >
                        <img src={user?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name}`} className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-sm group-hover:scale-105 transition-transform" />
                        <div>
                            <h2 className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-indigo-300 transition-colors">{user?.name || 'USER'}</h2>
                            <p className="text-[9px] text-blue-400 font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                                ONLINE
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center my-auto">
                    <h1 className="text-6xl font-thin text-white tracking-tighter opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        {currentTime.getHours()}:{currentTime.getMinutes() < 10 ? '0'+currentTime.getMinutes() : currentTime.getMinutes()}
                    </h1>
                    <p className="text-[10px] text-indigo-200/60 uppercase tracking-[0.4em] mt-2 font-light">
                        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10">
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { id: 'contacts', icon: 'fa-address-book', color: 'text-emerald-400', label: t('phone.app.contacts'), bg: 'from-emerald-500/20 to-emerald-900/20' },
                            { id: 'messages', icon: 'fa-comments', color: 'text-indigo-400', label: t('phone.app.messages'), bg: 'from-indigo-500/20 to-indigo-900/20' },
                            { id: 'call', icon: 'fa-phone', color: 'text-rose-400', label: t('phone.app.call'), bg: 'from-rose-500/20 to-rose-900/20' },
                            { id: 'userCall', icon: 'fa-video', color: 'text-sky-400', label: 'VIDEO CALL', bg: 'from-sky-500/20 to-sky-900/20' },
                            { id: 'voiceSettings', icon: 'fa-sliders', color: 'text-amber-400', label: 'CÀI ĐẶT', bg: 'from-amber-500/20 to-amber-900/20' },
                        ].map((app) => (
                            <button key={app.id} onClick={() => {
                                if (app.id === 'contacts') setUserTab('contacts');
                                else if (app.id === 'messages') setUserTab('messages');
                                else if (app.id === 'userCall') setUserTab('userCall');
                                else if (app.id === 'voiceSettings') setUserTab('voiceSettings');
                                else if (app.id === 'call') setUserTab('call');
                                else if (setNpcTab) setNpcTab(app.id);
                            }} className="flex flex-col items-center gap-2 group">
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

        {/* USER CALL INTERFACE */}
        {/* REGULAR CALL APP */}
        {userTab === 'call' && (
            <div className="absolute inset-0 bg-[#0F0F1A] z-50 flex flex-col items-center justify-between py-12 animate-in fade-in duration-300">
                {/* Header Info */}
                <div className="flex flex-col items-center gap-6 mt-12">
                    <div className="relative">
                        <img 
                            src={userSelectedContact?.npcAvatar || character.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Auro'} 
                            className="w-40 h-40 rounded-full object-cover border-4 border-white/10 shadow-2xl animate-pulse" 
                            style={{ animationDuration: isCalling ? '2s' : '0s' }}
                        />
                        {isCalling && (
                            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/50 animate-ping"></div>
                        )}
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-tight">{userSelectedContact?.npcName || character.name || 'Unknown'}</h2>
                        <p className="text-indigo-400 font-mono text-sm uppercase tracking-widest animate-pulse">{callStatus}</p>
                    </div>
                </div>

                {/* Waveform Visualization (Fake) */}
                <div className="flex items-center justify-center gap-1.5 h-24 w-full px-12 opacity-80">
                     {isCalling && Array.from({ length: 15 }).map((_, i) => (
                        <div 
                            key={i} 
                            className="w-1.5 bg-indigo-500 rounded-full animate-pulse"
                            style={{ 
                                height: `${30 + Math.random() * 70}%`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '0.8s'
                            }}
                        ></div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-8 mb-12">
                     <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all active:scale-95 ${isMuted ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'}`}
                    >
                        <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-2xl`}></i>
                    </button>

                    {isCalling && callStatus === 'Listening...' && (
                        <button 
                            onClick={handleStopListening}
                            className="w-20 h-20 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.6)] border-4 border-indigo-400/30 transition-all active:scale-90 z-50"
                        >
                            <i className="fa-solid fa-check text-3xl"></i>
                        </button>
                    )}

                    <button 
                        onClick={isCalling ? endCall : startCall}
                        className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${isCalling ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                        <i className={`fa-solid ${isCalling ? 'fa-phone-slash' : 'fa-phone'} text-4xl text-white`}></i>
                    </button>

                     <button 
                        onClick={() => {
                            endCall();
                            setUserTab('home');
                        }}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95"
                    >
                        <i className="fa-solid fa-xmark text-2xl"></i>
                    </button>
                </div>
            </div>
        )}

        {/* USER VIDEO CALL */}
        {userTab === 'userCall' && (
             <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white overflow-hidden">
                {/* Video Background */}
                {voiceSettings.selectedYoutubeLink && getYoutubeVideoId(voiceSettings.selectedYoutubeLink) ? (
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <iframe 
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${isCalling ? 'opacity-100' : 'opacity-30 blur-sm'}`}
                            style={{ width: `${(voiceSettings.videoScale || 1.5) * 100}%`, height: `${(voiceSettings.videoScale || 1.5) * 100}%` }}
                            src={`https://www.youtube.com/embed/${getYoutubeVideoId(voiceSettings.selectedYoutubeLink)}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&playlist=${
                                (() => {
                                    const currentId = getYoutubeVideoId(voiceSettings.selectedYoutubeLink);
                                    const allIds = (voiceSettings.youtubeLinks || [])
                                        .map(link => getYoutubeVideoId(link))
                                        .filter(id => id !== null) as string[];
                                    
                                    // If we have multiple links, play them in sequence
                                    if (allIds.length > 1) {
                                        // Ensure current ID is first if possible, or just play the list
                                        return allIds.join(',');
                                    }
                                    
                                    // If single video (or empty list but selected exists), repeat it 10 times for smoother looping
                                    // This tricks YouTube into preloading the "next" video (which is the same one)
                                    return Array(10).fill(currentId).join(',');
                                })()
                            }`}
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen
                        ></iframe>
                        {!isCalling && <div className="absolute inset-0 bg-black/40"></div>}
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 to-black z-0">
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                    </div>
                )}
                
                {/* Call Info (Avatar + Name) - Only show when NOT calling or if no video */}
                {(!isCalling || !voiceSettings.selectedYoutubeLink) && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10 w-full mb-10 animate-in fade-in zoom-in duration-300">
                       <div className="relative">
                           <div className={`absolute -inset-6 bg-emerald-500/20 rounded-full blur-xl animate-pulse`}></div>
                           <img src={character.avatar} className="w-32 h-32 rounded-full border-4 border-[#09090b] shadow-2xl relative z-10 object-cover bg-slate-800" />
                       </div>
                       <div className="text-center">
                          <h3 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{character.name}</h3>
                          <p className="text-emerald-400 font-mono text-[10px] uppercase tracking-[0.4em] mt-3 animate-pulse">{callStatus}</p>
                       </div>
                    </div>
                )}

                {/* Active Call UI (Video Call Style) */}
                {isCalling && voiceSettings.selectedYoutubeLink && (
                    <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pointer-events-none">
                        {/* Top Bar */}
                        <div className="flex justify-between items-start">
                             <div className="bg-black/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/10 shadow-lg">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-mono tracking-widest text-white/90">{callStatus}</span>
                             </div>
                             
                             {/* Self View (User Avatar) */}
                             <div className="w-24 h-32 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden shadow-2xl pointer-events-auto cursor-move hover:scale-105 transition-transform">
                                <img src={user?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name}`} className="w-full h-full object-cover opacity-90" />
                             </div>
                        </div>
                    </div>
                )}

                {/* Controls Container */}
                <div className={`w-full z-20 pb-8 transition-all duration-500 ${isCalling ? 'absolute bottom-0 px-8 bg-gradient-to-t from-black/80 to-transparent pt-20' : 'space-y-8 relative'}`}>
                    {!isCalling ? (
                        <div className="flex justify-center">
                            <button onClick={startCall} className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-90 transition-all z-10 hover:bg-emerald-600 animate-bounce">
                                <i className="fa-solid fa-phone text-2xl"></i>
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center gap-6 items-center">
                            <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95">
                                <i className="fa-solid fa-microphone-slash"></i>
                            </button>

                            {callStatus === 'Listening...' && (
                                <button 
                                    onClick={handleStopListening}
                                    className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-500 border-2 border-indigo-400/30 transition-all active:scale-95 z-50"
                                >
                                    <i className="fa-solid fa-check text-xl"></i>
                                </button>
                            )}

                            <button onClick={endCall} className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.5)] active:scale-90 transition-all hover:bg-rose-700">
                                <i className="fa-solid fa-phone-slash text-2xl"></i>
                            </button>
                             <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95">
                                <i className="fa-solid fa-video"></i>
                            </button>
                        </div>
                    )}
                    
                    {!isCalling && (
                        <button onClick={() => setUserTab('home')} className="absolute top-4 left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                    )}
                </div>
             </div>
        )}

        {/* VOICE SETTINGS INTERFACE */}
        {userTab === 'voiceSettings' && (
             <div className="absolute inset-0 z-[100] flex flex-col bg-[#1a1a1a] text-white p-6 animate-in slide-in-from-bottom duration-300 overflow-hidden rounded-[2.5rem]">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setUserTab('home')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 className="text-lg font-black uppercase tracking-widest">Cài đặt</h2>
                </div>

                <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-10">
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

        {/* HEADER FOR APPS */}
        {userTab !== 'home' && userTab !== 'userCall' && userTab !== 'voiceSettings' && (
            <div className="h-14 px-5 flex items-center gap-4 shrink-0 border-b border-white/5 bg-[#0F0F1A]/90 backdrop-blur-xl z-30 shadow-sm">
                <button onClick={() => {
                    if (userTab === 'contactDetail') setUserTab('contacts');
                    else if (userTab === 'chatDetail') setUserTab('messages');
                    else setUserTab('home');
                }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-colors border border-white/10 active:scale-90">
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex-1 text-center truncate">
                    {userTab === 'contacts' ? t('phone.contacts.title') : 
                     userTab === 'messages' ? t('phone.messages.title') :
                     userTab === 'contactDetail' ? 'Thông tin Contact' :
                     userSelectedContact?.npcName}
                </span>
                <div className="w-8"></div>
            </div>
        )}

        {/* USER CONTACTS */}
        {userTab === 'contacts' && (
            <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-5 space-y-3 overflow-y-auto custom-scrollbar">
                    {(user?.npcRelations || []).map(rel => (
                        <div key={rel.npcId} onClick={() => handleOpenUserContactDetail(rel)} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer active:scale-95">
                            <div className="relative">
                                <img src={rel.npcAvatar} className="w-12 h-12 rounded-2xl object-cover border border-white/10 bg-slate-800 shadow-sm" />
                                {(rel.affinity || 0) > 80 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#0F0F1A] flex items-center justify-center"><i className="fa-solid fa-heart text-[6px] text-white"></i></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-200 uppercase truncate group-hover:text-white transition-colors">{rel.npcName}</p>
                                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">{rel.relationship || 'Người quen'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${rel.relationshipStatus === 'Thân thiết' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                    {rel.relationshipStatus || 'Bình thường'}
                                </div>
                                <div className="text-[9px] font-mono font-bold text-emerald-400">{rel.affinity || 50}%</div>
                            </div>
                        </div>
                    ))}
                    {(!user?.npcRelations || user.npcRelations.length === 0) && (
                        <div className="text-center py-20 text-slate-500 italic text-[10px]">{t('phone.contacts.empty')}</div>
                    )}
                    {(user?.npcRelations || []).length < 10 && (
                        <button onClick={handleAddNewUserContact} className="w-full py-3 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-bold text-slate-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                            <i className="fa-solid fa-plus"></i> Thêm NPC Mới ({(user?.npcRelations || []).length}/10)
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* USER MESSAGES LIST */}
        {userTab === 'messages' && (
            <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                    {(user?.npcRelations || []).length > 0 ? (user?.npcRelations || []).map(rel => (
                        <button key={rel.npcId} onClick={() => handleOpenUserChat(rel)} className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-all border-b border-white/5 text-left active:bg-white/10 group">
                            <div className="relative">
                                <img src={rel.npcAvatar} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-slate-800 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all" />
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-[#0F0F1A] rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs font-black text-slate-200 uppercase group-hover:text-white transition-colors">{rel.npcName}</p>
                                    <span className="text-[9px] text-slate-600 font-mono group-hover:text-slate-400">
                                        {rel.lastInteraction ? new Date(rel.lastInteraction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity font-medium">
                                    {rel.history && rel.history.length > 0 ? rel.history[rel.history.length - 1].text : 'Bắt đầu trò chuyện...'}
                                </p>
                            </div>
                        </button>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50 py-20">
                            <i className="fa-solid fa-comments text-4xl"></i>
                            <span className="text-xs uppercase tracking-widest">Không có tin nhắn</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* USER CHAT DETAIL */}
        {userTab === 'chatDetail' && userSelectedContact && (
            <div className="flex-1 flex flex-col bg-[#0F0F1A] animate-in slide-in-from-right duration-300">
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col">
                    {userSelectedContact.history && userSelectedContact.history.length > 0 ? (
                        userSelectedContact.history.map((msg, idx) => {
                            const isFromNPC = msg.sender === 'NPC';
                            return (
                                <div key={idx} className={`flex ${isFromNPC ? 'justify-start' : 'justify-end'} mb-4`}>
                                    {isFromNPC && (
                                        <img src={userSelectedContact.npcAvatar} className="w-8 h-8 rounded-full mr-2 self-end border border-white/10" />
                                    )}
                                    <div className={`max-w-[75%] p-3 px-4 rounded-2xl text-[11px] ${
                                        isFromNPC 
                                            ? 'bg-slate-800 text-slate-200 rounded-bl-none' 
                                            : 'bg-indigo-600 text-white rounded-br-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 text-slate-600 italic text-[9px]">Chưa có tin nhắn nào.</div>
                    )}
                    {isUserSending && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-2xl rounded-bl-none self-start w-fit animate-pulse mt-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    )}
                    <div ref={userMessagesEndRef} />
                </div>
                
                <div className="p-3 bg-[#131320] border-t border-white/5 flex gap-2 items-center safe-pb">
                    <input 
                        type="text"
                        value={userMessageInput}
                        onChange={(e) => setUserMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                        }}
                        placeholder="Nhắn tin..."
                        className="flex-1 h-10 bg-white/5 rounded-full border border-white/5 px-4 text-[11px] text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!userMessageInput.trim() || isUserSending}
                        className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>
        )}

        {/* USER CONTACT DETAIL */}
        {userTab === 'contactDetail' && userSelectedContact && (
            <div className="flex-1 flex flex-col bg-[#0F0F1A] overflow-hidden animate-in slide-in-from-bottom duration-400">
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('user-npc-avatar-up')?.click()}>
                            <img src={userSelectedContact.npcAvatar || 'https://via.placeholder.com/150'} className="w-24 h-24 rounded-3xl object-cover border-2 border-white/10 shadow-2xl" />
                            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <i className="fa-solid fa-camera text-white"></i>
                            </div>
                            <input type="file" id="user-npc-avatar-up" className="hidden" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && userSelectedContact && onUpdateUser) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        const base64String = reader.result as string;
                                        setUserSelectedContact({ ...userSelectedContact, npcAvatar: base64String });
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase">Nhấn vào ảnh để thay đổi</p>
                        <div className="text-center w-full px-4">
                            {isEditingContact ? (
                                <div className="space-y-2">
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-center text-sm font-bold text-white outline-none focus:border-indigo-500/50" placeholder="Tên NPC" />
                                    <input type="text" value={editType} onChange={e => setEditType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-center text-xs text-indigo-300 outline-none focus:border-indigo-500/50" placeholder="Mối quan hệ (VD: Crush)" />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{userSelectedContact.npcName || 'NPC Mới'}</h3>
                                    <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.2em]">{userSelectedContact.relationship || 'Chưa rõ'}</p>
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
                                <span className="text-xs font-bold text-white">{userSelectedContact.relationshipStatus || 'Bình thường'}</span>
                            )}
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Thân thiết</span>
                            {isEditingContact ? (
                                <div className="flex items-center gap-2">
                                    <input type="range" min="0" max="100" value={editAffinity} onChange={e => setEditAffinity(parseInt(e.target.value))} className="flex-1 accent-emerald-500" />
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{editAffinity}%</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${userSelectedContact.affinity || 50}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{userSelectedContact.affinity || 50}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-black text-rose-400 uppercase flex items-center gap-2">
                                <i className="fa-solid fa-brain"></i> Ghi chú riêng của {user?.name || 'User'}
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
                        {!userSelectedContact.npcId.startsWith('new-') && (
                            <button 
                                onClick={() => setIsEditingContact(!isEditingContact)}
                                className="w-12 py-4 bg-white/5 border border-white/10 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <i className={`fa-solid ${isEditingContact ? 'fa-xmark' : 'fa-pen'}`}></i>
                            </button>
                        )}
                        <button 
                            onClick={saveUserContactChanges}
                            disabled={isSavingContact || (isEditingContact && !editName.trim())}
                            className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSavingContact ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                            LƯU THAY ĐỔI VẬN MỆNH
                        </button>
                        {isEditingContact && !userSelectedContact.npcId.startsWith('new-') && (
                            <button 
                                onClick={handleDeleteUserContact}
                                className="w-12 py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                            >
                                <i className="fa-solid fa-trash"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserPhoneView;
