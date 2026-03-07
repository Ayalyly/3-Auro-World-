import { Quest, UserProfile } from '../types';

export const PRESET_QUESTS: Quest[] = [
    {
        id: 'daily-checkin',
        title: 'Điểm Danh Hàng Ngày',
        description: 'Ghé thăm và nhận phần thưởng điểm danh hàng ngày của bạn. (Mỗi 24h)',
        reward: { auroCoins: 1000 },
        status: 'active',
        progress: 0,
        progressMax: 1,
        type: 'daily',
    },
    {
        id: 'watch-ad',
        title: 'Xem Quảng Cáo',
        description: 'Xem một quảng cáo ngắn để nhận ngay 500 Xu Auro.',
        reward: { auroCoins: 500 },
        status: 'active',
        progress: 0,
        progressMax: 1,
        type: 'daily',
    },
    {
        id: 'share-post',
        title: 'Sứ Giả Truyền Tin (Chia Sẻ)',
        description: 'Lan tỏa tình yêu! Đăng bài viết về Auro World ở bất cứ đâu (Facebook, TikTok, Threads...). Sau đó điền form để nhận Giftcode bí mật qua Email nhé!',
        reward: { auroCoins: 0 }, // Reward is given via email
        status: 'active',
        progress: 0,
        progressMax: 1,
        type: 'achievement',
    }
];

export const checkDailyQuestAvailability = (user: UserProfile): { available: boolean; nextClaimTime?: number } => {
    const lastClaim = user.lastDailyQuestClaim || 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - lastClaim >= oneDay) {
        return { available: true };
    } else {
        return { available: false, nextClaimTime: lastClaim + oneDay };
    }
};

export const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const migrateUserQuests = (user: UserProfile): UserProfile => {
    const currentQuestIds = PRESET_QUESTS.map(q => q.id);
    const userQuests = user.quests || [];
    
    // Keep existing quests that are still in PRESET_QUESTS
    const migratedQuests = userQuests.filter(q => currentQuestIds.includes(q.id));
    
    // Add new quests from PRESET_QUESTS that user doesn't have
    const existingQuestIds = migratedQuests.map(q => q.id);
    PRESET_QUESTS.forEach(pq => {
        if (!existingQuestIds.includes(pq.id)) {
            migratedQuests.push({ ...pq, progress: 0 });
        }
    });

    // Reset daily quests if available
    const { available } = checkDailyQuestAvailability(user);
    if (available) {
        const dailyQuestIndex = migratedQuests.findIndex(q => q.id === 'daily-checkin');
        if (dailyQuestIndex > -1) {
            migratedQuests[dailyQuestIndex] = {
                ...migratedQuests[dailyQuestIndex],
                status: 'active',
                progress: 0
            };
        }
    }

    return { ...user, quests: migratedQuests };
};
