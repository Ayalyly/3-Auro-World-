
import React from 'react';
import { Branch } from '../types';

interface BranchListProps {
  branches: Branch[];
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onClose: () => void;
}

const BranchList: React.FC<BranchListProps> = ({ branches, currentBranchId, onSwitchBranch, onClose }) => {
  // Safe handling: Ensure 'main' exists in display list even if missing in data
  const safeBranches = branches ? [...branches] : [];
  if (!safeBranches.find(b => b.id === 'main')) {
      safeBranches.push({ id: 'main', name: 'Nhánh chính (Gốc)', createdAt: 0 });
  }

  // Sort branches: Main first, then by creation date descending
  const sortedBranches = safeBranches.sort((a, b) => {
    if (a.id === 'main') return -1;
    if (b.id === 'main') return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="absolute top-14 right-0 z-50 w-64 animate-in zoom-in-95 duration-200">
       <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 ring-1 ring-black/5">
           <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
               <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest"><i className="fa-solid fa-code-branch mr-1 text-indigo-500"></i> Dòng thời gian</h3>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"><i className="fa-solid fa-xmark text-[10px]"></i></button>
           </div>
           
           <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
               {sortedBranches.map(branch => {
                   const isActive = branch.id === currentBranchId;
                   const isMain = branch.id === 'main';
                   
                   return (
                       <button 
                         key={branch.id}
                         onClick={() => { onSwitchBranch(branch.id); onClose(); }}
                         className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-0.5 relative overflow-hidden group ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                       >
                           {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>}
                           
                           <div className="flex justify-between items-center pl-1.5">
                               <div className="flex items-center gap-2 overflow-hidden">
                                   <i className={`text-[9px] ${isMain ? 'fa-solid fa-star text-amber-400' : 'fa-solid fa-code-branch text-slate-300'}`}></i>
                                   <span className={`text-[10px] font-bold truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                                       {isMain ? 'Main Timeline' : branch.name}
                                   </span>
                               </div>
                               {isActive && <i className="fa-solid fa-check text-indigo-500 text-[10px] shrink-0"></i>}
                           </div>
                           
                           <div className="flex justify-between items-center pl-5">
                               <span className="text-[8px] text-slate-400 italic">
                                   {isMain ? 'Mạch truyện gốc' : `${new Date(branch.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}
                               </span>
                               {!isMain && branch.parentId && (
                                   <span className="text-[7px] bg-slate-100 text-slate-400 px-1 rounded uppercase tracking-wider font-bold">
                                       Rẽ nhánh
                                   </span>
                               )}
                           </div>
                       </button>
                   );
               })}
           </div>
           
           <div className="mt-2 pt-1.5 border-t border-slate-50 flex flex-col gap-2">
               <p className="text-[7px] text-slate-400 italic text-center">Bấm icon <i className="fa-solid fa-code-branch mx-0.5"></i> ở tin nhắn để rẽ nhánh mới.</p>
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    // We need a way to trigger setView('timeline') from here.
                    // Since onSwitchBranch now only switches ID, we might need a new prop.
                    if ((window as any).openTimeline) (window as any).openTimeline();
                 }}
                 className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider transition-colors border border-slate-100"
               >
                 <i className="fa-solid fa-gear mr-1"></i> Quản lý Timeline
               </button>
           </div>
       </div>
    </div>
  );
};

export default BranchList;
