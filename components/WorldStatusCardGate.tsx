import React, { useEffect, useState, useRef } from 'react';
import { IDB } from '../services/idbService';

interface WorldStatusCardGateProps {
  firebaseService: any;
  selectedServerKey: string;
  serverName: string;
}

interface WorldStats {
  characterCount: number;
  messageCount: number;
  totalSizeKB: number;
  loading: boolean;
}

const WorldStatusCardGate: React.FC<WorldStatusCardGateProps> = ({
  firebaseService,
  selectedServerKey,
  serverName,
}) => {
  const [stats, setStats] = useState<WorldStats>({
    characterCount: 0,
    messageCount: 0,
    totalSizeKB: 0,
    loading: true,
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    calculateLocalStats();
  }, [selectedServerKey]);

  const calculateLocalStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));

    try {
      const allKeys = await IDB.getAllKeys();

      let characterCount = 0;
      let messageCount = 0;
      let totalBytes = 0;
      
      // Giới hạn cứng của 1 document Firestore
      const MAX_DOC_SIZE = 1048576; // 1MB

      for (const key of allKeys) {
        const value = await IDB.getItem(key);
        if (!value) continue;
        
        // Tính dung lượng JSON thô
        const rawSize = new Blob([JSON.stringify(value)]).size;
        
        // Capping: Nếu file > 1MB (ảnh nặng), Firestore sẽ từ chối hoặc cần nén.
        // Ta dùng con số đã bị Cap này để ước lượng "Dung lượng hợp lệ trên Cloud"
        const effectiveSize = Math.min(rawSize, MAX_DOC_SIZE);
        totalBytes += effectiveSize;

        if (key.includes('character') || key.includes('char_')) {
          characterCount++;
        } else if (key.includes('message') || key.includes('chat_') || key.includes('msg_')) {
          messageCount++;
        }
      }

      const totalSizeKB = Math.round(totalBytes / 1024);

      if (isMounted.current) {
        setStats({
          characterCount,
          messageCount,
          totalSizeKB,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error calculating local stats:', error);
      if (isMounted.current) setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // --- LIMIT LOGIC: FIREBASE FREE TIER (1GB) ---
  const FIREBASE_FREE_LIMIT_KB = 1024 * 1024; // 1 GB
  const usagePercent = (stats.totalSizeKB / FIREBASE_FREE_LIMIT_KB) * 100;

  const getStatus = () => {
    if (usagePercent < 10) {
      return {
        text: 'Rất Mượt',
        emoji: '🚀',
        color: '#10b981',
        bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      };
    } else if (usagePercent < 50) {
      return {
        text: 'Ổn định',
        emoji: '👌',
        color: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      };
    } else if (usagePercent < 90) {
      return {
        text: 'Nặng',
        emoji: '😰',
        color: '#f97316',
        bgGradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
      };
    } else {
      return {
        text: 'Sắp đầy',
        emoji: '😱',
        color: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
      };
    }
  };

  const status = getStatus();

  const formatSize = (kb: number) => {
      if (kb < 1024) return `${kb} KB`;
      return `${(kb / 1024).toFixed(2)} MB`;
  };

  if (stats.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Đang tính toán dữ liệu world...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.serverIcon}>💾</span>
          <div>
            <h3 style={styles.title}>Dữ Liệu Của Bạn</h3>
            <p style={styles.serverName}>World Local Cache</p>
          </div>
        </div>
        <div style={{ ...styles.badge, background: status.bgGradient }}>
          <span style={styles.badgeText}>{status.text}</span>
          <span style={styles.badgeEmoji}>{status.emoji}</span>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <span style={styles.statIcon}>👥</span>
          <div>
            <p style={styles.statLabel}>Nhân vật</p>
            <p style={styles.statValue}>{stats.characterCount}</p>
          </div>
        </div>

        <div style={styles.statBox}>
          <span style={styles.statIcon}>💬</span>
          <div>
            <p style={styles.statLabel}>Tin nhắn</p>
            <p style={styles.statValue}>{stats.messageCount}</p>
          </div>
        </div>
      </div>

      <div style={styles.storageContainer}>
        <div style={styles.storageHeader}>
          <span style={styles.storageIcon}>☁️</span>
          <span style={styles.storageLabel}>Dung lượng ước tính theo Cloud giới hạn</span>
        </div>
        <div style={styles.progressBg}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.max(usagePercent, 1)}%`,
              background: status.bgGradient,
            }}
          />
        </div>
        <div style={styles.storageInfo}>
          <span style={styles.storageCurrent}>
            {formatSize(stats.totalSizeKB)}
          </span>
          <span style={styles.storageMax}>/ 1 GB (Gói Free)</span>
        </div>
      </div>

      {usagePercent > 80 && (
        <div style={styles.warning}>
          <span style={styles.warningIcon}>⚠️</span>
          <span style={styles.warningText}>
            Dung lượng sắp đạt giới hạn 1GB. Hãy dọn dẹp bớt ảnh hoặc tin nhắn cũ.
          </span>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(to bottom, #ffffff, #f8f9ff)',
    borderRadius: '20px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.1)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(99, 102, 241, 0.1)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  serverIcon: {
    fontSize: '32px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  serverName: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#6b7280',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '600',
    fontSize: '13px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
  },
  badgeText: {
    fontSize: '13px',
  },
  badgeEmoji: {
    fontSize: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  statIcon: {
    fontSize: '24px',
  },
  statLabel: {
    margin: 0,
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    margin: '2px 0 0 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  storageContainer: {
    padding: '16px',
    background: 'rgba(99, 102, 241, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(99, 102, 241, 0.1)',
  },
  storageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  storageIcon: {
    fontSize: '18px',
  },
  storageLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  progressBg: {
    width: '100%',
    height: '10px',
    background: 'rgba(0, 0, 0, 0.08)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.5s ease-in-out',
  },
  storageInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  storageCurrent: {
    fontWeight: '700',
    color: '#1f2937',
  },
  storageMax: {
    color: '#6b7280',
  },
  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  warningIcon: {
    fontSize: '16px',
  },
  warningText: {
    fontSize: '12px',
    color: '#92400e',
    fontWeight: '600',
  },
};

export default WorldStatusCardGate;