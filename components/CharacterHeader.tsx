
import React, { useState } from 'react';
import { Character, Mood, SaveStatus, Branch, AppSettings } from '../types';
import BranchList from './BranchList';
import YoutubePlayerModal from './YoutubePlayerModal';

interface CharacterHeaderProps {
  character: Character;
  onBack: () => void;
  onSettings: () => void;
  onHome?: () => void;
  onDashboard?: () => void;
  localStatus?: SaveStatus;
  cloudStatus?: SaveStatus;
  serverName?: string | null;
  // NEW PROPS
  currentBranchId?: string;
  onSwitchBranch?: (id: string) => void;
  // NEW PROP FOR CHAR CARD
  onOpenProfile?: () => void;
  lastAffectionChange?: number | null;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  playingVideoId?: string | null;
  setPlayingVideoId?: (id: string | null) => void;
}

const getLevelConfig = (level: number) => {
  if (level <= -1) return { label: 'Kẻ thù', color: 'from-rose-600 to-rose-700' };
  if (level === 0) return { label: 'Căng thẳng', color: 'from-orange-400 to-orange-500' };
  if (level === 1) return { label: 'Sơ khai', color: 'from-slate-400 to-slate-500' };
  if (level <= 5) return { label: 'Thân thiết', color: 'from-[var(--accent)] to-[var(--secondary)]' };
  if (level <= 10) return { label: 'Tri kỷ', color: 'from-[var(--secondary)] to-[var(--primary-soft)]' };
  if (level <= 20) return { label: 'Ái Tình', color: 'from-[var(--primary-soft)] to-[var(--primary)]' };
  return { label: 'Vĩnh Cửu', color: 'from-[var(--primary)] to-rose-500' }; 
};

const renderStatusIcon = (type: 'local' | 'cloud', status: string | SaveStatus) => {
    const isLocal = type === 'local';
    const label = isLocal ? 'Disk' : 'Cloud';
    const baseIcon = isLocal ? 'fa-floppy-disk' : 'fa-cloud';

    // Placeholder for grid stability if disabled
    if (status === 'disabled') {
        return (
            <div title={`${label}: Disabled`} className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 border border-transparent opacity-30 text-slate-300 text-[10px]">
                <i className={`fa-solid ${baseIcon}`}></i>
            </div>
        );
    }

    let colorClass = '';
    let iconClass = baseIcon;
    let animation = '';

    switch (status) {
        case 'saving':
            colorClass = 'text-amber-500 bg-amber-50 border-amber-100';
            animation = 'animate-spin';
            iconClass = 'fa-circle-notch';
            break;
        case 'saved':
            colorClass = isLocal ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-blue-500 bg-blue-50 border-blue-100';
            iconClass = isLocal ? 'fa-check' : 'fa-cloud-arrow-up';
            break;
        case 'error':
            colorClass = 'text-rose-500 bg-rose-50 border-rose-100';
            iconClass = 'fa-triangle-exclamation';
            animation = 'animate-pulse';
            break;
        default:
            colorClass = 'text-slate-400 bg-slate-50 border-slate-100';
    }

    return (
        <div title={label} className={`flex items-center justify-center w-7 h-7 rounded-lg border shadow-sm ${colorClass} text-[10px]`}>
            <i className={`fa-solid ${iconClass} ${animation}`}></i>
        </div>
    );
};

const CharacterHeader: React.FC<CharacterHeaderProps> = ({ 
  character, 
  onSettings, 
  onHome, 
  onDashboard, 
  localStatus = 'idle', 
  cloudStatus = 'disabled', 
  serverName, 
  currentBranchId = 'main', 
  onSwitchBranch, 
  onOpenProfile, 
  lastAffectionChange,
  settings,
  onSaveSettings,
  playingVideoId,
  setPlayingVideoId
}) => {
  const level = Math.floor(character.relationshipScore / 100) + 1;
  const currentProgress = character.relationshipScore % 100;
  const levelConf = getLevelConfig(level);
  
  const [showBranches, setShowBranches] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  
  const currentBranchName = character.branches?.find(b => b.id === currentBranchId)?.name || (currentBranchId === 'main' ? "Nhánh chính" : "Nhánh ẩn");
  const isImmersive = settings.theme?.chatLayoutStyle === 'immersive' || settings.theme?.chatLayoutStyle === 'immersive-short';

  return (
    // GLASS HEADER - Taller for bigger avatar
    <div className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 py-3 shadow-sm animate-in slide-in-from-top-4 duration-500 ${
      settings.theme?.chatLayoutStyle === 'immersive-short'
        ? 'bg-gradient-to-b from-black/40 to-transparent border-white/5'
        : settings.theme?.chatLayoutStyle === 'immersive'
          ? 'bg-gradient-to-b from-black/60 to-black/40 border-white/10' 
          : 'bg-gradient-to-b from-white/95 to-blue-50/90 border-white/50'
    }`}>
      
      {showYoutubeModal && setPlayingVideoId && (
        <YoutubePlayerModal
          isOpen={showYoutubeModal}
          onClose={() => setShowYoutubeModal(false)}
          playingVideoId={playingVideoId || null}
          setPlayingVideoId={setPlayingVideoId}
        />
      )}
      
      {/* Show BranchList even if branches is undefined (it will fallback to just Main) */}
      {showBranches && onSwitchBranch && (
          <BranchList 
            branches={character.branches || []} 
            currentBranchId={currentBranchId} 
            onSwitchBranch={onSwitchBranch} 
            onClose={() => setShowBranches(false)} 
          />
      )}
      
      <div className="flex items-center gap-4 relative z-10 w-full">
          {/* BIG AVATAR - TRIGGER PROFILE VIEW */}
          <div 
            className="relative shrink-0 group cursor-pointer active:scale-95 transition-transform"
            onClick={onOpenProfile}
            title="Xem hồ sơ nhân vật"
          >
            <div className={`rounded-[1.2rem] p-[3px] bg-gradient-to-tr ${levelConf.color} shadow-lg`}>
                <div className="bg-white/80 backdrop-blur-sm p-0.5 rounded-[1rem]">
                    <img 
                    src={character.avatar} 
                    className="w-16 h-16 rounded-[0.9rem] object-cover bg-slate-50" 
                    alt={character.name} 
                    />
                </div>
            </div>
            {/* Status Dot */}
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                <div className={`w-3 h-3 rounded-full ${cloudStatus !== 'disabled' ? 'bg-emerald-400' : 'bg-slate-300'} animate-pulse border-2 border-white`}></div>
            </div>
          </div>

          {/* INFO AREA - TRIGGER PROFILE VIEW */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            {/* Tên nhân vật - Clickable */}
            <h1 
                className={`font-black text-xl leading-tight truncate drop-shadow-sm pb-0.5 cursor-pointer transition-colors ${
                  isImmersive ? 'text-white hover:text-white/80' : 'text-[var(--text-main)] hover:text-indigo-600'
                }`}
                onClick={onOpenProfile}
                title="Xem hồ sơ nhân vật"
            >
                {character.name}
            </h1>
            
            {/* EXP BAR - Hidden as per user request */}
            {/* ... level bar code ... */}

            {/* Branch Indicator - Small, below name */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowBranches(!showBranches)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-colors w-fit ${
                      isImmersive
                        ? 'bg-black/40 border border-white/10 text-white/80 hover:bg-black/60 hover:text-white'
                        : 'bg-indigo-50 border border-indigo-100 text-indigo-500 hover:bg-indigo-100'
                    }`}
                >
                    <i className="fa-solid fa-code-branch"></i>
                    <span className="truncate max-w-[60px]">{currentBranchName}</span>
                </button>

                {/* AFFECTION CHANGE INDICATOR - The red box area */}
                {lastAffectionChange !== undefined && lastAffectionChange !== null && (
                    <div 
                        key={Date.now()} // Force re-animation on change
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest animate-in zoom-in slide-in-from-left-2 duration-300 ${lastAffectionChange > 0 ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}
                    >
                        <i className={`fa-solid ${lastAffectionChange > 0 ? 'fa-heart animate-pulse' : 'fa-heart-crack'}`}></i>
                        {lastAffectionChange > 0 ? '+' : ''}{lastAffectionChange}
                    </div>
                )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 h-fit">
              {/* Youtube Player Button */}
              <button 
                onClick={() => setShowYoutubeModal(true)}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 ${
                  isImmersive 
                    ? 'bg-black/40 border border-white/10 hover:bg-black/60 hover:border-white/30 text-white/80 hover:text-white' 
                    : 'bg-white/60 border border-slate-200 hover:border-rose-200 hover:shadow-sm text-slate-500 hover:text-rose-500'
                } ${playingVideoId ? (isImmersive ? 'text-rose-400 animate-pulse' : 'text-rose-500 animate-pulse') : ''}`}
                title="Phát nhạc YouTube"
              >
                <i className="fa-solid fa-music text-sm"></i>
              </button>

              {/* Dashboard Button */}
              <button 
                onClick={onDashboard} 
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 ${
                  isImmersive
                    ? 'bg-black/40 border border-white/10 hover:bg-black/60 hover:border-white/30 text-white/80 hover:text-white'
                    : 'bg-white/60 border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-100 hover:shadow-sm'
                }`}
                title="Trung tâm điều hành"
              >
                  <i className="fa-solid fa-folder-open text-sm"></i>
              </button>
          </div>

      </div>
    </div>
  );
};

export default CharacterHeader;
