
import React, { useState, useEffect, useRef } from 'react';
import { Character, Relation, SocialPost, SocialComment, UserProfile, Notification, Message, AppSettings } from '../types';
import { GeminiService } from '../services/geminiService';

interface SocialAppViewProps {
  character: Character;
  user: UserProfile;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character) => void;
  onGenerateSocialComments?: (postId: string, text: string, isNewPost?: boolean, image?: string) => void;
  messages: Message[];
  t: (key: string) => string;
  settings: AppSettings;
  geminiService?: GeminiService;
}

const LikeButton = ({ likes, onClick }: { likes: number, onClick: () => void }) => {
    const [popped, setPopped] = useState(false);
    const handleClick = () => { setPopped(true); onClick(); setTimeout(() => setPopped(false), 500); };
    return (
        <button onClick={handleClick} className="flex items-center gap-2 text-[11px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-full transition-all active:scale-95 group">
            <i className={`fa-solid fa-heart transition-transform ${popped ? 'scale-150 text-rose-600' : ''}`}></i>
            <span>{likes}</span>
        </button>
    );
};

const SocialAppView: React.FC<SocialAppViewProps> = ({ 
  character, user, onClose, onUpdateCharacter, onGenerateSocialComments, messages, t,
  settings, geminiService
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'notifs' | 'profile'>('feed');
  const [newPostContent, setNewPostContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null); // State ảnh preview
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [typingPostId, setTypingPostId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const geminiRef = useRef(new GeminiService());
  const gemini = geminiService || geminiRef.current;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QUAN TRỌNG: Dùng Ref để luôn lấy được dữ liệu character mới nhất trong các hàm async
  const characterRef = useRef(character);
  useEffect(() => { characterRef.current = character; }, [character]);

  useEffect(() => {
    if (settings?.apiConfigs) {
      const geminiConfig = settings.apiConfigs.find((c: any) => c.provider === 'gemini');
      if (geminiConfig && geminiConfig.keys) {
        const keys = geminiConfig.keys
          .filter((k: any) => k.isActive && k.value)
          .map((k: any) => k.value);
        geminiRef.current.updateKeys(keys);
      }
    }
  }, [settings?.apiConfigs]);

  const posts = [...(character.socialPosts || [])].sort((a, b) => b.timestamp - a.timestamp);
  const notifications = [...(character.notifications || [])].sort((a, b) => b.timestamp - a.timestamp);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Xử lý chọn ảnh
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setImagePreview(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleRefresh = async () => {
      setIsRefreshing(true);
      try {
          const currentChar = characterRef.current; // Use Ref
          const socialModel = settings.socialModel || settings.model;
          const newAIPost = await gemini.generateRandomPost(currentChar, currentChar.relations || [], messages, socialModel, settings.language || 'vi');
          if (newAIPost && newAIPost.content) {
              const author = [currentChar, ...(currentChar.relations || [])].find(m => m.name === newAIPost.authorName);
              const post: SocialPost = {
                  id: 'post-ai-' + Date.now() + Math.random().toString().slice(2, 5),
                  authorId: 'AI',
                  authorName: newAIPost.authorName,
                  avatar: author?.avatar || currentChar.avatar,
                  content: newAIPost.content,
                  likes: Math.floor(Math.random() * 20),
                  comments: [],
                  timestamp: Date.now()
              };
              onUpdateCharacter({ ...currentChar, socialPosts: [post, ...currentChar.socialPosts] });
          }
      } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
  };

  const handlePost = async () => {
      if (!newPostContent.trim() && !imagePreview) return;
      
      const uniqueId = 'post-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      
      const newPost: SocialPost = {
          id: uniqueId,
          authorId: 'USER',
          authorName: user.name,
          avatar: user.avatar,
          content: newPostContent,
          image: imagePreview || undefined, // Lưu ảnh vào bài đăng
          likes: 50 + Math.floor(Math.random() * 450),
          comments: [],
          timestamp: Date.now()
      };

      // 1. Cập nhật ngay lập tức để User thấy bài đăng
      // Lưu ý: Dùng characterRef.current để đảm bảo lấy state mới nhất nếu có thay đổi khác
      let updatedChar = { ...characterRef.current, socialPosts: [newPost, ...(characterRef.current.socialPosts || [])] };
      onUpdateCharacter(updatedChar);
      
      // Reset UI
      setNewPostContent('');
      setImagePreview(null);
      
      // 2. Gọi AI (NPC tương tác) - Chạy ngầm
      const shouldAutoComment = settings.behavior?.npcAutoComment ?? true; // Mặc định là true nếu chưa config
      if (shouldAutoComment && onGenerateSocialComments) {
          setIsGenerating(true);
          onGenerateSocialComments(uniqueId, newPostContent || "[Hình ảnh]", true, imagePreview || undefined);
          // Since it's running in the background, we can stop the loading indicator here.
          // The comments will appear as they are generated.
          setIsGenerating(false);
      }
  };

  const handleComment = async (postId: string) => {
      const text = commentInput[postId];
      if (!text || !text.trim()) return;
      
      const userCmt: SocialComment = {
          id: 'cmt-' + Date.now() + Math.random().toString(36).substr(2, 5),
          authorName: user.name,
          avatar: user.avatar,
          content: text,
          timestamp: Date.now(),
          isUser: true
      };

      // 1. Cập nhật comment của User
      let currentChar = characterRef.current;
      const targetPost = currentChar.socialPosts.find(p => p.id === postId);
      const updatedPostsWithUserCmt = currentChar.socialPosts.map(p => p.id === postId ? { ...p, comments: [...p.comments, userCmt] } : p);
      
      // Cập nhật State & Ref
      const charAfterUserCmt = { ...currentChar, socialPosts: updatedPostsWithUserCmt };
      onUpdateCharacter(charAfterUserCmt);
      setCommentInput({ ...commentInput, [postId]: '' });

      // 2. AI Phản hồi comment (Drama) - Run in background
      const shouldAutoComment = settings.behavior?.npcAutoComment ?? true;
      if (shouldAutoComment && onGenerateSocialComments) {
          setTypingPostId(postId);
          onGenerateSocialComments(postId, text, false); // Fire and forget
          setTimeout(() => setTypingPostId(null), 1500); // Clear typing indicator after a bit
      }
  };

  const handleReplyTo = (postId: string, authorName: string) => {
      setCommentInput({ ...commentInput, [postId]: `@${authorName} ` });
  };

  const handleLike = (postId: string) => {
      const currentChar = characterRef.current;
      const updatedPosts = currentChar.socialPosts.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p);
      onUpdateCharacter({ ...currentChar, socialPosts: updatedPosts });
  };

  const getAvatar = (authorName: string, savedAvatar: string) => {
      if (authorName === character.name) return character.avatar;
      if (authorName === user.name) return user.avatar;
      const npc = character.relations?.find(r => r.name === authorName);
      if (npc) return npc.avatar;
      return savedAvatar;
  };

  return (
    <div className="h-full flex flex-col bg-[#F0F2F5] relative overflow-hidden">
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 italic tracking-tighter">AuroNet</h2>
                <button onClick={handleRefresh} disabled={isRefreshing} className={`w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-500 transition-all flex items-center justify-center ${isRefreshing ? 'animate-spin' : 'active:scale-90'}`}><i className="fa-solid fa-arrows-rotate text-xs"></i></button>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'feed' && (
                <div className="p-4 space-y-4 max-w-lg mx-auto">
                    
                    {/* WRITE POST BOX */}
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-white">
                        <div className="flex gap-4 mb-4">
                            <img src={user.avatar} className="w-11 h-11 rounded-full object-cover border-2 border-indigo-50 shadow-sm" />
                            <div className="flex-1">
                                <textarea 
                                    className="w-full bg-slate-50 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none h-20 placeholder:text-slate-400 transition-all mb-2" 
                                    placeholder={`Bạn đang nghĩ gì, ${user.name}?`} 
                                    value={newPostContent} 
                                    onChange={e => setNewPostContent(e.target.value)} 
                                />
                                {/* Image Preview Area */}
                                {imagePreview && (
                                    <div className="relative inline-block">
                                        <img src={imagePreview} className="h-20 w-auto rounded-xl border border-slate-200 shadow-sm" />
                                        <button 
                                            onClick={() => setImagePreview(null)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                                        >
                                            <i className="fa-solid fa-xmark text-[10px]"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                             <div className="flex gap-2">
                                 {/* IMAGE UPLOAD BUTTON */}
                                 <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
                                 <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-colors text-xs font-bold uppercase flex items-center gap-2 hover:text-emerald-500"
                                    title="Thêm ảnh"
                                 >
                                     <i className="fa-regular fa-image text-lg"></i>
                                 </button>
                                 <button className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-colors text-xs font-bold uppercase flex items-center gap-2 hover:text-blue-500">
                                     <i className="fa-solid fa-user-tag"></i>
                                 </button>
                             </div>
                             <button 
                                 onClick={handlePost} 
                                 disabled={(!newPostContent.trim() && !imagePreview) || isGenerating} 
                                 className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                             >
                                 {isGenerating ? <><i className="fa-solid fa-circle-notch fa-spin"></i> ĐANG GỬI...</> : "ĐĂNG BÀI"}
                             </button>
                        </div>
                    </div>

                    {posts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <i className="fa-solid fa-newspaper text-6xl mb-4"></i>
                            <p className="text-sm font-bold uppercase tracking-widest">Chưa có bài đăng nào</p>
                        </div>
                    )}

                    {posts.map(post => (
                        <div key={post.id} className="bg-white rounded-[2rem] border border-white shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-150">
                            <div className="p-4 flex items-center gap-3">
                                <img src={getAvatar(post.authorName, post.avatar)} className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm" />
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm">{post.authorName}</h4>
                                    <p className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">
                                        {new Date(post.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                            <div className="px-5 pb-4">
                                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                                    {post.content.split(/(@\w+)/g).map((part, i) => 
                                        part.startsWith('@') ? 
                                            <span key={i} className="text-blue-600 font-bold hover:underline cursor-pointer">{part}</span> : 
                                            part
                                    )}
                                </p>
                                {/* Display Post Image */}
                                {post.image && (
                                    <img src={post.image} className="w-full h-auto rounded-2xl border border-slate-100 shadow-sm object-cover max-h-96" loading="lazy" />
                                )}
                            </div>
                            <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <LikeButton likes={post.likes || 0} onClick={() => handleLike(post.id)} />
                                <div className="text-[10px] font-bold text-slate-400">
                                    <i className="fa-regular fa-comment mr-1"></i> {post.comments.length} thảo luận
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50/50 space-y-3">
                                {post.comments.map(cmt => (
                                    <div key={cmt.id} className="flex gap-3 items-start group">
                                        <img src={getAvatar(cmt.authorName, cmt.avatar)} className="w-8 h-8 rounded-full object-cover mt-1 border border-white shadow-sm" />
                                        <div className="flex-1">
                                            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm inline-block max-w-full">
                                                <p className="text-[10px] font-black text-slate-800 mb-0.5">{cmt.authorName}</p>
                                                <p className="text-[12px] text-slate-600 leading-snug">
                                                    {cmt.content.split(/(@\w+)/g).map((part, i) => 
                                                        part.startsWith('@') ? 
                                                            <span key={i} className="text-blue-600 font-bold">{part}</span> : 
                                                            part
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-4 mt-1 ml-1">
                                                <button 
                                                    onClick={() => handleReplyTo(post.id, cmt.authorName)} 
                                                    className="text-[9px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-tighter"
                                                >
                                                    Trả lời
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {typingPostId === post.id && (
                                    <div className="flex gap-3 items-center animate-pulse">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                            <i className="fa-solid fa-ellipsis text-slate-400"></i>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ai đó đang bình luận...</span>
                                    </div>
                                )}

                                <div className="flex gap-3 items-center mt-4">
                                    <img src={user.avatar} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" />
                                    <div className="flex-1 relative">
                                        <input 
                                            className="w-full bg-white border border-slate-200 rounded-full px-4 py-2.5 text-xs outline-none focus:border-indigo-300 transition-all pr-10" 
                                            placeholder="Viết bình luận..." 
                                            value={commentInput[post.id] || ''} 
                                            onChange={e => setCommentInput({ ...commentInput, [post.id]: e.target.value })} 
                                            onKeyDown={e => e.key === 'Enter' && handleComment(post.id)} 
                                        />
                                        <button 
                                            onClick={() => handleComment(post.id)} 
                                            className="absolute right-1 top-1 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 active:scale-90 transition-all"
                                        >
                                            <i className="fa-solid fa-paper-plane text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'notifs' && (
                <div className="p-4 space-y-3 max-w-lg mx-auto">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={() => {
                                    const currentChar = characterRef.current;
                                    const updatedNotifs = currentChar.notifications.map(n => ({ ...n, isRead: true }));
                                    onUpdateCharacter({ ...currentChar, notifications: updatedNotifs });
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                                Đánh dấu đã đọc tất cả
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <i className="fa-solid fa-bell-slash text-6xl mb-4"></i>
                            <p className="text-sm font-bold uppercase tracking-widest">Chưa có thông báo</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                onClick={() => {
                                    if (!notif.isRead) {
                                        const currentChar = characterRef.current;
                                        const updatedNotifs = currentChar.notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n);
                                        onUpdateCharacter({ ...currentChar, notifications: updatedNotifs });
                                    }
                                    setActiveTab('feed');
                                }}
                                className={`p-4 rounded-2xl border flex gap-4 items-start transition-all cursor-pointer ${notif.isRead ? 'bg-white border-slate-100' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}
                            >
                                <img src={notif.actorAvatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-700 leading-snug">
                                        <span className="font-black text-slate-900">{notif.actorName}</span>
                                        {notif.type === 'COMMENT' ? ' đã bình luận về bài viết của bạn: ' : ' đã nhắc đến bạn: '}
                                        <span className="italic text-slate-500">"{notif.content.substring(0, 50)}..."</span>
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase">
                                        {new Date(notif.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                {!notif.isRead && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>}
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="p-4 max-w-lg mx-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-white p-8 text-center">
                        <div className="relative inline-block mb-4">
                            <img src={user.avatar} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white shadow-xl" />
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                                <i className="fa-solid fa-check"></i>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-1">{user.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Người du hành</p>
                        
                        <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                            <div>
                                <p className="text-lg font-black text-slate-800">{posts.filter(p => p.authorId === 'USER').length}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bài đăng</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-slate-800">{Math.floor(Math.random() * 1000)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Followers</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-slate-800">{Math.floor(Math.random() * 500)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Following</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="bg-white border-t border-slate-200 p-3 flex justify-around items-center safe-pb shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <button 
                onClick={() => setActiveTab('feed')} 
                className={`flex flex-col items-center gap-1.5 transition-all w-16 py-2 rounded-2xl ${activeTab === 'feed' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <i className="fa-solid fa-house-chimney text-xl"></i>
            </button>
            <button 
                onClick={() => setActiveTab('notifs')} 
                className={`flex flex-col items-center gap-1.5 transition-all w-16 py-2 rounded-2xl relative ${activeTab === 'notifs' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <i className="fa-solid fa-bell text-xl"></i>
                {unreadCount > 0 && <span className="absolute top-2 right-4 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse shadow-sm"></span>}
            </button>
            <button 
                onClick={() => setActiveTab('profile')} 
                className={`flex flex-col items-center gap-1.5 transition-all w-16 py-2 rounded-2xl ${activeTab === 'profile' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <i className="fa-solid fa-id-badge text-xl"></i>
            </button>
        </div>
    </div>
  );
};

export default SocialAppView;
// 📦 Generated by Skill Creator Ultra v1.0
