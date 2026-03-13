import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface YoutubePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playingVideoId: string | null;
  setPlayingVideoId: (id: string | null) => void;
}

const YoutubePlayerModal: React.FC<YoutubePlayerModalProps> = ({ isOpen, onClose, playingVideoId, setPlayingVideoId }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const extractVideoId = (link: string) => {
    if (!link) return null;
    if (link.includes('/shorts/')) {
        const parts = link.split('/shorts/');
        if (parts.length > 1) {
            const idPart = parts[1].split(/[?#&]/)[0];
            if (idPart.length === 11) return idPart;
        }
    }
    const match = link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  const handlePlay = () => {
    setError('');
    if (!url.trim()) {
      setError('Vui lòng nhập link YouTube');
      return;
    }
    const id = extractVideoId(url);
    if (id) {
      setPlayingVideoId(id);
      onClose();
    } else {
      setError('Link YouTube không hợp lệ');
    }
  };

  const handleStop = () => {
    setPlayingVideoId(null);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i className="fa-brands fa-youtube"></i> Phát Nhạc YouTube
        </h2>
        <input 
          type="text" 
          value={url} 
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
          }}
          placeholder="Nhập link YouTube (ví dụ: https://youtu.be/...)"
          className={`w-full p-3 bg-slate-50 border ${error ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-rose-500 mb-2`}
        />
        {error && <p className="text-[10px] text-rose-500 font-bold mb-4">{error}</p>}
        {!error && <div className="mb-4"></div>}
        <div className="flex justify-between items-center">
          {playingVideoId ? (
            <button onClick={handleStop} className="px-4 py-2 rounded-lg bg-rose-100 text-rose-600 text-xs font-black uppercase shadow-sm hover:bg-rose-200 transition-all flex items-center gap-2">
              <i className="fa-solid fa-stop"></i> Dừng Phát
            </button>
          ) : <div></div>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold uppercase text-slate-500 hover:bg-slate-50 transition-colors">
              Đóng
            </button>
            <button onClick={handlePlay} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-black uppercase shadow-lg hover:bg-rose-700 transition-all flex items-center gap-2">
              <i className="fa-solid fa-play"></i> Phát
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default YoutubePlayerModal;
