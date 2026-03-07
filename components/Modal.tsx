import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shadow-sm border border-slate-100"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>

        {footer && (
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
