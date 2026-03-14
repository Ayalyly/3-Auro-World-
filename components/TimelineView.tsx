import React, { useState, useMemo, useCallback } from 'react';
import { Character, Branch, Message } from '../types';
import { customConfirm } from './CustomDialog';

interface TimelineViewProps {
  character: Character;
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onUpdateBranches: (branches: Branch[]) => void;
  onClose: () => void;
  messages: Message[];
}

const MAIN_BRANCH: Branch = {
  id: 'main',
  name: 'Nhánh chính (Gốc)',
  createdAt: 0,
  note: 'Khởi nguyên của mọi câu chuyện #origin',
  isPinned: true
};

const TimelineView: React.FC<TimelineViewProps> = ({
  character,
  currentBranchId,
  onSwitchBranch,
  onUpdateBranches,
  onClose,
  messages
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');

  // ✅ Tìm snippet đúng branchId
  const getMatchingSnippet = useCallback((branchId: string): string | null => {
    if (!searchQuery.trim() || searchQuery.startsWith('#')) return null;
    const q = searchQuery.toLowerCase();

    const match = messages.find(m =>
      (m.branchId === branchId || (!m.branchId && branchId === 'main')) &&
      m.text.toLowerCase().includes(q)
    );

    if (!match) return null;

    const index = match.text.toLowerCase().indexOf(q);
    const start = Math.max(0, index - 20);
    const end = Math.min(match.text.length, index + q.length + 40);
    return `...${match.text.substring(start, end)}...`;
  }, [searchQuery, messages]);

  // ✅ Branch list
  const branches = useMemo(() => {
    const raw =
      character.branches && character.branches.length > 0
        ? character.branches
        : [MAIN_BRANCH];

    return [...raw].sort((a, b) =>
      a.isPinned === b.isPinned
        ? b.createdAt - a.createdAt
        : a.isPinned ? -1 : 1
    );
  }, [character.branches]);

  // ✅ Filter theo name / note / tag / message
  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return branches;

    if (q.startsWith('#')) {
      const tag = q.substring(1);
      return branches.filter(b =>
        (b.note || '').toLowerCase().includes(`#${tag}`)
      );
    }

    return branches.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.note || '').toLowerCase().includes(q) ||
      messages.some(m =>
        (m.branchId === b.id || (!m.branchId && b.id === 'main')) &&
        m.text.toLowerCase().includes(q)
      )
    );
  }, [branches, searchQuery, messages]);

  // ✅ Render tag
  const renderNoteWithTags = (note: string) => {
    const parts = note.split(/(#[\w\u00C0-\u017F]+)/g);
    return parts.map((part, i) =>
      part.startsWith('#')
        ? <span key={i} className="inline-block bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold mr-1">{part}</span>
        : part
    );
  };

  // ✅ Save edit
  const saveEdit = () => {
    if (!editingBranch) return;
    const updated = branches.map(b =>
      b.id === editingBranch.id
        ? { ...b, name: editName, note: editNote }
        : b
    );
    onUpdateBranches(updated);
    setEditingBranch(null);
  };

  const deleteBranch = async () => {
    if (!editingBranch || editingBranch.id === 'main') return;
    if (await customConfirm(`Xóa nhánh "${editingBranch.name}"?`)) {
      const updated = branches.filter(b => b.id !== editingBranch.id);
      onUpdateBranches(updated);
      if (currentBranchId === editingBranch.id) onSwitchBranch('main');
      setEditingBranch(null);
    }
  };

  const togglePin = (id: string) => {
    onUpdateBranches(
      branches.map(b =>
        b.id === id ? { ...b, isPinned: !b.isPinned } : b
      )
    );
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50/95 overflow-hidden animate-in fade-in duration-150">

      {/* HEADER */}
      <div className="p-6 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-code-branch text-lg"></i>
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight">Timeline</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dòng thời gian</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, ghi chú, #tag hoặc nội dung chat..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none transition-all text-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

        {filteredBranches.map((branch, index) => {
          const isActive = branch.id === currentBranchId;
          const snippet = getMatchingSnippet(branch.id);

          return (
            <div key={branch.id} className="relative animate-in slide-in-from-bottom-4 duration-150" style={{ animationDelay: `${index * 50}ms` }}>

              <div
                onClick={() => onSwitchBranch(branch.id)}
                className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all group ${
                  isActive ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-3">

                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-black text-sm uppercase tracking-wide ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {branch.name}
                      </h3>
                      {isActive && (
                        <span className="bg-indigo-100 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-200">
                          Đang chọn
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1">
                      <i className="fa-regular fa-clock text-[8px]"></i>
                      {branch.id === 'main' ? 'Original' : new Date(branch.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  {/* ✅ NÚT LUÔN HIỆN */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(branch.id); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        branch.isPinned ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                      }`}
                      title={branch.isPinned ? "Bỏ ghim" : "Ghim nhánh"}
                    >
                      <i className="fa-solid fa-thumbtack text-xs"></i>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBranch(branch);
                        setEditName(branch.name);
                        setEditNote(branch.note || '');
                      }}
                      className="w-8 h-8 bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 rounded-full flex items-center justify-center transition-colors"
                      title="Chỉnh sửa"
                    >
                      <i className="fa-solid fa-pen text-xs"></i>
                    </button>
                  </div>

                </div>

                <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                  {renderNoteWithTags(branch.note || 'Không có ghi chú')}
                </div>

                {snippet && (
                  <div className="mt-3 bg-amber-50/50 p-3 rounded-xl text-[10px] text-amber-800 border border-amber-100/50">
                    <b className="text-amber-600 mr-1 uppercase tracking-wider text-[9px]"><i className="fa-solid fa-quote-left mr-1"></i>Đoạn chat khớp:</b> 
                    <span className="italic">"{snippet}"</span>
                  </div>
                )}

              </div>
            </div>
          );
        })}
        
        {filteredBranches.length === 0 && (
          <div className="text-center py-12 text-slate-400 italic text-[11px]">
            <i className="fa-solid fa-code-branch text-4xl mb-4 opacity-20"></i>
            <p className="font-bold mb-2">Không tìm thấy nhánh nào.</p>
            <p className="text-[10px]">Thử thay đổi từ khóa tìm kiếm.</p>
          </div>
        )}

      </div>

      {/* EDIT MODAL */}
      {editingBranch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-[2rem] w-full max-w-sm space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Chỉnh sửa nhánh</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{editingBranch.id === 'main' ? 'Nhánh gốc' : 'Nhánh phụ'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tên nhánh</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-300 p-3 rounded-xl outline-none transition-all text-sm font-bold text-slate-700"
                  placeholder="Nhập tên nhánh..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Ghi chú & #Tag</label>
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  className="w-full border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-300 p-3 rounded-xl outline-none transition-all text-xs resize-none h-24 leading-relaxed text-slate-600"
                  placeholder="Thêm ghi chú và các #tag để dễ tìm kiếm..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {editingBranch.id !== 'main' && (
                <button 
                  onClick={deleteBranch} 
                  className="w-12 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors"
                  title="Xóa nhánh"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              )}
              <button 
                onClick={() => setEditingBranch(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={saveEdit} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TimelineView;
