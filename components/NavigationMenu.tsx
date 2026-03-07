import React, { forwardRef } from 'react';
import { AppView } from '../types';

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onFeedback?: () => void;
  activeView?: string;
}

const NavigationMenu = forwardRef<HTMLDivElement, NavigationMenuProps>(
  ({ isOpen, onClose, onNavigate, onFeedback }, ref) => {
    if (!isOpen) return null;

    const menuItems: { label: string; iconClass: string; view: AppView; color: string; action?: () => void }[] = [
      { label: 'Hồ sơ', iconClass: 'fa-solid fa-user', view: 'profile', color: 'bg-indigo-50 text-indigo-500' },
      { label: 'Túi đồ', iconClass: 'fa-solid fa-backpack', view: 'inventory', color: 'bg-amber-50 text-amber-500' },
      { label: 'Cửa hàng', iconClass: 'fa-solid fa-store', view: 'shop', color: 'bg-emerald-50 text-emerald-500' },
      { label: 'Ký ức', iconClass: 'fa-solid fa-book-journal-whills', view: 'memories', color: 'bg-rose-50 text-rose-500' },
      { label: 'Auronet', iconClass: 'fa-solid fa-globe', view: 'phone', color: 'bg-sky-50 text-sky-500' },
      { label: 'Điện thoại', iconClass: 'fa-solid fa-mobile-screen-button', view: 'phone', color: 'bg-pink-50 text-pink-500' },
      { label: 'Tổ ấm', iconClass: 'fa-solid fa-house-chimney', view: 'home', color: 'bg-orange-50 text-orange-500' },
      { label: 'Nhiệm vụ', iconClass: 'fa-solid fa-scroll', view: 'quests', color: 'bg-emerald-50 text-emerald-500' },
      { label: 'Timeline', iconClass: 'fa-solid fa-timeline', view: 'timeline', color: 'bg-indigo-50 text-indigo-500' },
      { label: 'Cài đặt', iconClass: 'fa-solid fa-gear', view: 'settings', color: 'bg-slate-100 text-slate-500' },
      { 
        label: 'Góp ý', 
        iconClass: 'fa-solid fa-bug', 
        view: 'settings', 
        color: 'bg-purple-50 text-purple-500',
        action: onFeedback 
      },
    ];

    return (
      <div className="absolute bottom-full left-0 right-0 p-4 animate-in fade-in zoom-in-95 duration-100 z-50">
        <div 
          ref={ref}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 grid grid-cols-4 gap-4"
        >
          {menuItems.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  onNavigate(item.view);
                }
                onClose();
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
            >
              <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
                <i className={item.iconClass}></i>
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;
