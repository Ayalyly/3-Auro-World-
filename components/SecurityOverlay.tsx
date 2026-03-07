import React from 'react';

interface SecurityOverlayProps {
    isLocked: boolean;
    onOverwrite?: () => void;
    label?: string;
    overwriteLabel?: string;
    borderRadius?: string;
    compact?: boolean;
}

/**
 * SecurityOverlay component to provide a robust blur mask for protected content.
 * This is isolated to prevent accidental modification during large file edits.
 */
export const SecurityOverlay: React.FC<SecurityOverlayProps> = ({
    isLocked,
    onOverwrite,
    label = "Nội dung bảo mật",
    overwriteLabel = "Ghi đè nội dung mới",
    borderRadius = "rounded-[1.5rem]",
    compact = false
}) => {
    if (!isLocked) return null;

    return (
        <div className={`absolute inset-0 ${borderRadius} overflow-hidden z-10`}>
            <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-2xl flex items-center justify-center">
                <div className={`bg-white/90 border border-slate-200 shadow-xl flex flex-col items-center scale-110 transition-all ${compact ? 'px-4 py-2 rounded-full gap-2' : 'px-5 py-4 rounded-3xl gap-3'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} bg-indigo-100 rounded-full flex items-center justify-center`}>
                            <i className={`fa-solid fa-lock text-indigo-600 ${compact ? 'text-[10px]' : 'text-sm'}`}></i>
                        </div>
                        <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-black text-slate-700 uppercase tracking-widest`}>
                            {label}
                        </span>
                    </div>
                    
                    {onOverwrite && (
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onOverwrite();
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-wider shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            {overwriteLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
