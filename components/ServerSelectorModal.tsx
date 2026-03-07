
import React, { useState } from 'react';
import { FirebaseConfig } from '../types';

interface Server {
  key: string;
  name: string;
  emoji: string;
  config: FirebaseConfig;
}

interface ServerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: Server[];
  selectedServerKey: string;
  onSelectServer: (serverKey: string) => void;
  firebaseService: any;
}

const ServerSelectorModal: React.FC<ServerSelectorModalProps> = ({
  isOpen,
  onClose,
  servers,
  selectedServerKey,
  onSelectServer,
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Logic tìm server mới nhất (dựa trên tên, ví dụ Auro AI 2 > Auro AI 1)
  const recommendedKey = servers
    .filter(s => s.key !== 'custom')
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0]?.key;

  if (!isOpen) return null;

  return (
    <>
      {/* Main Server Selector Overlay */}
      <div style={styles.overlay} onClick={onClose} />

      <div style={styles.bottomSheet}>
        <div style={styles.handleBar} />

        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📡 Chọn Máy Chủ</h2>
            <p style={styles.subtitle}>Chọn máy chủ có sẵn hoặc tự tạo riêng</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style={styles.serverList}>
          <div style={styles.gridContainer}>
            {servers.map((server) => {
              const isSelected = selectedServerKey === server.key;
              const isRecommended = server.key === recommendedKey;

              return (
                <div
                  key={server.key}
                  style={{
                    ...styles.serverCard,
                    borderColor: isSelected ? '#6366f1' : 'rgba(0,0,0,0.1)',
                    background: isSelected
                      ? 'linear-gradient(135deg, #f0f0ff 0%, #ffffff 100%)'
                      : 'white',
                  }}
                  onClick={() => onSelectServer(server.key)}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleRow}>
                      <span style={styles.serverEmoji}>{server.emoji}</span>
                      <span style={styles.serverName}>{server.name}</span>
                    </div>
                    {isSelected && <span style={styles.checkmark}>✓</span>}
                  </div>
                  {isRecommended && (
                      <div className="mt-1">
                          <span style={styles.newBadge}>✨ MỚI</span>
                      </div>
                  )}
                  {server.key === 'server2' && (
                      <div className="mt-1">
                          <span style={{...styles.newBadge, backgroundColor: '#fee2e2', color: '#dc2626'}}>🔥 ĐÔNG ĐÚC</span>
                      </div>
                  )}
                </div>
              );
            })}
          </div>

            {/* CUSTOM SERVER OPTION */}
          <div
            style={{
              ...styles.serverCard,
              marginTop: '8px',
              borderColor: selectedServerKey === 'custom' ? '#6366f1' : 'rgba(0,0,0,0.1)',
              background: selectedServerKey === 'custom'
                ? 'linear-gradient(135deg, #f0f0ff 0%, #ffffff 100%)'
                : 'white',
            }}
            onClick={() => onSelectServer('custom')}
          >
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <span style={styles.serverEmoji}>🛡️</span>
                <span style={styles.serverName}>Server Riêng</span>
                <span style={{...styles.newBadge, backgroundColor: '#dcfce7', color: '#16a34a'}}>✨ KHUYÊN DÙNG</span>
              </div>
              {selectedServerKey === 'custom' && (
                <span style={styles.checkmark}>✓</span>
              )}
            </div>

            {/* BUTTON TO OPEN GUIDE MODAL */}
            {selectedServerKey === 'custom' && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsGuideOpen(true); }}
                    className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-slate-200 hover:border-indigo-200"
                  >
                    <i className="fa-solid fa-book-open"></i>
                    Hướng dẫn tạo Server Riêng (Free)
                  </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- SEPARATE GUIDE MODAL (POPUP) --- */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden border border-white/20">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                    <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-list-check text-indigo-500 text-sm"></i> 
                        Quy trình tạo Server (6 Bước)
                    </h3>
                    <button 
                        onClick={() => setIsGuideOpen(false)} 
                        className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center shadow-sm"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-5 custom-scrollbar bg-slate-50/30">
                    {/* BƯỚC 1 */}
                    <div style={styles.stepBox}>
                        <div style={styles.stepTitle}>BƯỚC 1: TẠO PROJECT</div>
                        <div style={styles.stepContent}>
                            Truy cập <a href="https://console.firebase.google.com/" target="_blank" style={styles.link}>Firebase Console</a> → <b>Create Project</b>.
                            <br/><span style={styles.note}>Lưu ý: <b>KHÔNG</b> bật Google Analytics để thiết lập nhanh hơn.</span>
                        </div>
                    </div>

                    {/* BƯỚC 2 */}
                    <div style={styles.stepBox}>
                        <div style={styles.stepTitle}>BƯỚC 2: BẬT ANONYMOUS AUTH (BẮT BUỘC)</div>
                        <div style={styles.stepContent}>
                            Vào <b>Build</b> → <b>Authentication</b> → Tab <b>Sign-in method</b>.
                            <br/>Bật <b>Anonymous</b> → Save.
                            <br/><span style={styles.note}>Giúp Firebase cấp UID ẩn danh cho thiết bị để ghi dữ liệu an toàn.</span>
                        </div>
                    </div>

                    {/* BƯỚC 3 */}
                    <div style={styles.stepBox}>
                        <div style={styles.stepTitle}>BƯỚC 3: TẠO DATABASE & CHỌN REGION</div>
                        <div style={styles.stepContent}>
                            Vào <b>Build</b> → <b>Firestore Database</b> → <b>Create Database</b>.
                            <br/>Chọn Region: <span style={styles.highlight}>asia-southeast1 (Singapore)</span>.
                            <br/><span style={styles.note}>Quan trọng: Latency thấp nhất cho Việt Nam.</span>
                        </div>
                    </div>

                    {/* BƯỚC 4 & 5 */}
                    <div style={styles.stepBox}>
                        <div style={styles.stepTitle}>BƯỚC 4 & 5: LẤY CONFIG</div>
                        <div style={styles.stepContent}>
                            Vào <b>Project Settings (⚙️)</b> → <b>Add App</b> → Chọn icon <b>Web (&lt;/&gt;)</b>.
                            <br/>Copy object <code>const firebaseConfig = &#123; ... &#125;</code> để điền vào form bên ngoài.
                        </div>
                    </div>

                    {/* BƯỚC 6 */}
                    <div style={styles.stepBox}>
                        <div style={styles.stepTitle}>BƯỚC 6: CẤU HÌNH RULES</div>
                        <div style={styles.stepContent}>
                            Vào tab <b>Rules</b> trong Firestore và dán đoạn mã sau:
                        </div>
                        <div style={styles.codeBlock}>
                            <pre style={{margin: 0}}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
                            <button 
                            onClick={() => navigator.clipboard.writeText(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`)}
                            style={styles.copyBtn}
                            title="Copy Rules"
                            >
                                <i className="fa-regular fa-copy"></i>
                            </button>
                        </div>
                        <div style={styles.note}>
                            *Rule này dành cho cá nhân. Không dùng cho app thương mại.
                        </div>
                    </div>
                </div>
                
                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10">
                    <button 
                        onClick={() => setIsGuideOpen(false)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-200"
                    >
                        Đã Hiểu, Quay lại nhập Config
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    animation: 'fadeIn 0.2s ease-out',
  },
  bottomSheet: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85vh',
    background: 'white',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    zIndex: 1000,
    animation: 'slideUp 0.3s ease-out',
    overflowY: 'auto',
    paddingBottom: '20px',
  },
  handleBar: {
    width: '40px',
    height: '4px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '2px',
    margin: '12px auto',
  },
  header: {
    padding: '0 16px 12px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '500',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: '12px',
    transition: 'all 0.2s',
  },
  serverList: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  serverCard: {
    padding: '10px 12px',
    border: '2px solid',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  serverEmoji: {
    fontSize: '20px',
  },
  serverName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
  },
  newBadge: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  checkmark: {
    fontSize: '16px',
    color: '#6366f1',
    fontWeight: '700',
  },
  regionRow: {
    marginLeft: '34px',
  },
  regionText: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  guideContainer: {
      padding: '16px',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
  },
  guideHeader: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#334155',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
  },
  stepBox: {
      marginBottom: '12px',
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '12px',
      border: '1px solid #f1f5f9',
  },
  stepTitle: {
      fontSize: '11px',
      fontWeight: '800',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '6px',
  },
  stepContent: {
      fontSize: '12px',
      color: '#334155',
      lineHeight: '1.5',
  },
  highlight: {
      color: '#059669',
      fontWeight: '700',
  },
  note: {
      fontSize: '10px',
      color: '#94a3b8',
      fontStyle: 'italic',
      marginTop: '4px',
      display: 'block'
  },
  link: {
      color: '#3b82f6',
      fontWeight: '600',
      textDecoration: 'none',
  },
  codeBlock: {
      backgroundColor: '#1e293b',
      color: '#a5f3fc',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '10px',
      fontFamily: 'monospace',
      overflowX: 'auto',
      position: 'relative',
      marginTop: '6px',
  },
  copyBtn: {
      position: 'absolute',
      top: '6px',
      right: '6px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      width: '24px',
      height: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
  }
};

export default ServerSelectorModal;
