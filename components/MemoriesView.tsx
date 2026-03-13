import React, { useState } from 'react';
import { Memory } from '../types';

interface MemoriesViewProps {
  memories: Memory[];
  onClose: () => void;
  onDeleteMemory: (memoryId: string) => void;
  characterName: string;
  characterAvatar: string;
  userName: string;
}

const MemoriesView: React.FC<MemoriesViewProps> = ({ memories, onClose, onDeleteMemory, characterName, characterAvatar, userName }) => {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeTab, setActiveTab] = useState<'memory' | 'story' | 'situation'>('memory');
  const [copySuccess, setCopySuccess] = useState(false);

  const sortedMemories = [...memories].sort((a, b) => b.timestamp - a.timestamp);

  // Lọc các kỷ niệm bị trùng lặp để tránh lỗi key của React
  const uniqueSortedMemories = sortedMemories.filter((memory, index, self) =>
    index === self.findIndex((m) => m.id === memory.id)
  );

  const filteredMemories = uniqueSortedMemories.filter(memory => {
    const category = memory.category || 'memory';
    return category === activeTab;
  });

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getTabLabel = (tab: 'memory' | 'story' | 'situation') => {
    switch(tab) {
      case 'memory': return 'Kỷ niệm';
      case 'story': return 'Cốt truyện';
      case 'situation': return 'Tình huống';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in">
      
      {/* Close Button - Fixed outside the scrollable area */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-rose-500 transition-all active:scale-95 flex items-center justify-center z-50 backdrop-blur-md border border-white/20 shadow-xl"
      >
        <i className="fa-solid fa-xmark text-xl"></i>
      </button>

      {/* Scrollable Container for Envelopes */}
      <div className="w-full max-w-5xl h-full flex flex-col pt-10 px-4">
        
        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          {(['memory', 'story', 'situation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full font-playfair-display text-lg transition-all ${
                activeTab === tab 
                  ? 'bg-[#f4f1ea] text-[#5a4d41] shadow-lg scale-105' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
          {filteredMemories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMemories.map((memory) => (
                <div 
                  key={memory.id}
                  onClick={() => setSelectedMemory(memory)}
                  className="group relative cursor-pointer bg-[#f4f1ea] rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-[#dcd5c6] p-4 flex flex-col items-center justify-center aspect-[4/3]"
                  style={{
                      backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')",
                  }}
                >
                  {/* Envelope Icon / Graphic */}
                  <div className="w-16 h-12 bg-[#e6dfd1] border border-[#dcd5c6] relative mb-3 shadow-inner flex items-center justify-center overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full border-b-2 border-l-2 border-[#dcd5c6] transform rotate-45 origin-top-left scale-150 opacity-50"></div>
                      <i className={`fa-solid ${
                        activeTab === 'memory' ? 'fa-heart text-rose-400/50' :
                        activeTab === 'story' ? 'fa-book text-blue-400/50' :
                        'fa-masks-theater text-purple-400/50'
                      } text-xl`}></i>
                  </div>

                  <p className="font-playfair-display text-lg font-bold text-[#5a4d41] mb-1 text-center line-clamp-1">
                      {memory.title || new Date(memory.timestamp).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="font-cormorant-garamond text-sm text-[#8c7a6b] italic">
                      Gửi {userName}
                  </p>

                  {/* Wax Seal Effect */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-800 rounded-full shadow-md border-2 border-rose-900 flex items-center justify-center text-white text-[10px]">
                      <i className="fa-solid fa-star"></i>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/70">
              <div className="w-24 h-24 mb-6 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <i className="fa-solid fa-feather-pointed text-4xl text-white/50"></i>
              </div>
              <h3 className="font-playfair-display text-3xl font-bold text-white mb-4">Trang giấy trắng</h3>
              <p className="font-cormorant-garamond text-xl italic max-w-md">Chưa có {getTabLabel(activeTab).toLowerCase()} nào được lưu lại.</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Letter Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
            <div 
                className="relative w-full max-w-2xl bg-[#f4f1ea] shadow-2xl p-8 md:p-12 max-h-[90vh] overflow-y-auto custom-scrollbar rounded-sm"
                style={{
                    backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')",
                    boxShadow: "0 0 50px rgba(0,0,0,0.5)"
                }}
            >
                {/* Close Modal Button */}
                <button 
                    onClick={() => setSelectedMemory(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#e6dfd1] text-[#5a4d41] hover:bg-[#5a4d41] hover:text-white transition-colors flex items-center justify-center shadow-sm z-20"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>

                {/* Delete Button inside Modal */}
                <button 
                    onClick={() => {
                        onDeleteMemory(selectedMemory.id);
                        setSelectedMemory(null);
                    }}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-rose-100/50 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center shadow-sm z-20"
                    title="Xóa mục này"
                >
                    <i className="fa-solid fa-trash-can"></i>
                </button>

                {/* Copy Button inside Modal */}
                <button 
                    onClick={() => handleCopy(selectedMemory.content)}
                    className="absolute top-4 left-16 w-10 h-10 rounded-full bg-blue-100/50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center shadow-sm z-20"
                    title="Copy nội dung"
                >
                    <i className={`fa-solid ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                </button>

                {/* Decorative Border Lines */}
                <div className="absolute inset-4 border border-[#dcd5c6] pointer-events-none"></div>
                <div className="absolute inset-5 border border-[#dcd5c6] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start mt-6">
                    
                    {/* Polaroid Image */}
                    <div className="flex-shrink-0 relative w-40 h-48 bg-white p-3 shadow-lg border border-gray-200 z-20 mx-auto md:mx-0">
                        <div className="w-full h-36 overflow-hidden bg-gray-100">
                            <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-center text-[10px] text-gray-400 font-sans mt-2 tracking-widest uppercase">
                            {new Date(selectedMemory.timestamp).toLocaleDateString('vi-VN')}
                        </p>
                        {/* Tape */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/50 backdrop-blur-sm shadow-sm transform rotate-1"></div>
                    </div>

                    {/* Letter Content */}
                    <div className="flex-1 pt-2">
                        <h2 className="font-playfair-display text-2xl md:text-3xl font-bold text-[#5a4d41] mb-6 leading-tight">
                            {selectedMemory.title ? selectedMemory.title : `My Dearest\n${userName},`}
                        </h2>
                        
                        <div className="font-cormorant-garamond text-lg md:text-xl text-[#5a4d41] leading-relaxed whitespace-pre-wrap italic">
                            {selectedMemory.content}
                        </div>

                        <div className="mt-12 text-right">
                            <p className="font-cormorant-garamond text-lg text-[#8c7a6b] italic mb-1">Your Best Partner,</p>
                            <p className="font-playfair-display text-3xl font-bold text-[#b56b6b] inline-block">
                                {characterName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default MemoriesView;
