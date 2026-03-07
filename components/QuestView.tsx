import React, { useState, useEffect } from 'react';
import { UserProfile, Quest, InventoryItem } from '../types';
import { checkDailyQuestAvailability, formatTimeRemaining } from '../services/questService';

interface QuestViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onClose: () => void;
  quests: Quest[];
}

const SHOPEE_LINKS = [
  "https://s.shopee.vn/1481J2kcQ",
  "https://s.shopee.vn/4q9dI5Ey94",
  "https://s.shopee.vn/9UvUFTrg4O",
  "https://s.shopee.vn/AKV62c4RAe",
  "https://s.shopee.vn/8pgUvel12e",
  "https://s.shopee.vn/LhYg46ZNW"
];

const QuestView: React.FC<QuestViewProps> = ({ user, onUpdateUser, onClose, quests }) => {
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isDailyAvailable, setIsDailyAvailable] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
        const { available, nextClaimTime } = checkDailyQuestAvailability(user);
        setIsDailyAvailable(available);
        if (!available && nextClaimTime) {
            const remaining = nextClaimTime - Date.now();
            if (remaining > 0) {
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            } else {
                setIsDailyAvailable(true);
                setTimeLeft('');
            }
        } else {
            setTimeLeft('');
        }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user.lastDailyQuestClaim]);

  const handleClaimReward = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.status !== 'completed') return;

    let updatedUser = { ...user };
    let rewardText = [];

    if (quest.reward.auroCoins) {
      updatedUser.auroCoins = (updatedUser.auroCoins || 0) + quest.reward.auroCoins;
      rewardText.push(`${quest.reward.auroCoins} Xu Auro`);
    }

    if (quest.reward.items) {
      updatedUser.inventory = [...(updatedUser.inventory || []), ...quest.reward.items];
      rewardText.push(...quest.reward.items.map(item => item.name));
    }

    if (quest.id === 'daily-checkin') {
        updatedUser.lastDailyQuestClaim = Date.now();
    }

    updatedUser.quests = quests.map(q =>
      q.id === questId ? { ...q, status: 'claimed' } : q
    );

    onUpdateUser(updatedUser);
    alert(`Đã nhận phần thưởng: ${rewardText.join(', ')}!`);
  };

  const handleDoDailyQuest = () => {
    if (!isDailyAvailable) {
        alert("Bạn đã điểm danh hôm nay rồi. Hãy quay lại sau 24h nhé!");
        return;
    }

    // Open random Shopee link
    const randomLink = SHOPEE_LINKS[Math.floor(Math.random() * SHOPEE_LINKS.length)];
    window.open(randomLink, '_blank');

    // Update quest to completed
    const updatedUser = {
        ...user,
        quests: quests.map(q => 
            q.id === 'daily-checkin' ? { ...q, status: 'completed' as const, progress: 1 } : q
        )
    };
    onUpdateUser(updatedUser);
  };

  const handleWatchAd = () => {
    // Show AdSense ad logic could be implemented here if we had a specific ad component
    // For now, we simulate watching an ad and completing the quest
    alert("Đang tải quảng cáo...");
    
    setTimeout(() => {
        const updatedUser = {
            ...user,
            quests: quests.map(q => 
                q.id === 'watch-ad' ? { ...q, status: 'completed' as const, progress: 1 } : q
            )
        };
        onUpdateUser(updatedUser);
        alert("Đã xem xong quảng cáo! Bạn có thể nhận thưởng.");
    }, 2000);
  };

  const getQuestStatusPill = (status: Quest['status']) => {
    switch (status) {
      case 'active':
        return <span className="text-xs font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-full">Đang làm</span>;
      case 'completed':
        return <span className="text-xs font-bold text-green-500 bg-green-100 px-2 py-1 rounded-full">Hoàn thành</span>;
      case 'claimed':
        return <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Đã nhận</span>;
      case 'locked':
        return <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full">Đã khóa</span>;
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col">
      <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <h1 className="text-lg font-black text-slate-700">Nhiệm Vụ</h1>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition-colors">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {quests.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
                <i className="fa-solid fa-scroll text-4xl mb-2"></i>
                <p>Hiện chưa có nhiệm vụ chính tuyến nào.</p>
            </div>
        ) : (
            quests.map(quest => (
              <div key={quest.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{quest.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{quest.description}</p>
                  </div>
                  {getQuestStatusPill(quest.status)}
                </div>
                
                {quest.progress !== undefined && quest.progressMax !== undefined && (
                  <div className="my-3">
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: `${(quest.progress / quest.progressMax) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-right text-xs text-slate-400 mt-1">{quest.progress} / {quest.progressMax}</p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    <span className="font-bold">Phần thưởng:</span> 
                    {quest.reward.auroCoins && ` ${quest.reward.auroCoins} Xu Auro`}
                    {quest.reward.items && quest.reward.items.map(i => ` + ${i.name}`)}
                  </div>
                  <div className="flex gap-2">
                    {quest.status === 'active' && quest.id === 'daily-checkin' && (
                        isDailyAvailable ? (
                            <button 
                                onClick={handleDoDailyQuest}
                                className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-amber-600 transition-colors"
                            >
                                Thực hiện
                            </button>
                        ) : (
                            <button 
                                disabled
                                className="px-4 py-2 bg-slate-300 text-slate-500 text-xs font-bold rounded-lg shadow-none cursor-not-allowed flex items-center gap-1"
                            >
                                <i className="fa-regular fa-clock"></i> {timeLeft}
                            </button>
                        )
                    )}
                    {quest.status === 'active' && quest.id === 'watch-ad' && (
                        <button 
                            onClick={handleWatchAd}
                            className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-play"></i> Xem
                        </button>
                    )}
                    {quest.id === 'share-post' ? (
                        <button 
                            onClick={() => setShowTallyModal(true)}
                            className="px-4 py-2 bg-teal-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-teal-600 transition-colors"
                        >
                            Điền Form
                        </button>
                    ) : (
                        quest.id !== 'daily-checkin' && quest.id !== 'watch-ad' && (
                            <button 
                                onClick={() => handleClaimReward(quest.id)}
                                disabled={quest.status !== 'completed'}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                            >
                                Nhận
                            </button>
                        )
                    )}
                    
                    {/* Claim button for daily/ad quests specifically when completed */}
                    {(quest.id === 'daily-checkin' || quest.id === 'watch-ad') && quest.status === 'completed' && (
                         <button 
                            onClick={() => handleClaimReward(quest.id)}
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors animate-pulse"
                        >
                            Nhận Thưởng
                        </button>
                    )}
                  </div>
                </div>
              </div>
            ))
        )}
      </main>

      {/* TALLY FORM MODAL */}
      {showTallyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-700">Nhiệm vụ chia sẻ</h3>
              <button onClick={() => setShowTallyModal(false)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <iframe
              src="https://tally.so/embed/687gYN?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              className="w-full flex-1 border-0"
              title="Auro World - Nhiệm vụ chia sẻ"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestView;
