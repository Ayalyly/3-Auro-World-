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
  setNpcTab?: (tab: any) => void;
  t: (key: string) => string;
}

const UserPhoneView: React.FC<UserPhoneProps> = ({ user, onUpdateUser, onClose, currentTime, setPhoneMode, onSendMessageToNPC, character, setNpcTab, t }) => {
  const [userTab, setUserTab] = React.useState<'home' | 'contacts' | 'messages' | 'settings' | 'contactDetail' | 'chatDetail'>('home');
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
  const userMessagesEndRef = React.useRef<HTMLDivElement>(null);

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
                            { id: 'userCall', icon: 'fa-phone', color: 'text-rose-400', label: t('phone.app.call'), bg: 'from-rose-500/20 to-rose-900/20' },
                            { id: 'voiceSettings', icon: 'fa-sliders', color: 'text-amber-400', label: 'CÀI ĐẶT', bg: 'from-amber-500/20 to-amber-900/20' },
                        ].map((app) => (
                            <button key={app.id} onClick={() => {
                                if (app.id === 'contacts') setUserTab('contacts');
                                else if (app.id === 'messages') setUserTab('messages');
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

        {/* HEADER FOR APPS */}
        {userTab !== 'home' && (
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
