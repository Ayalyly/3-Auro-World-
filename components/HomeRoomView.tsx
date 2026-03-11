
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Character, UserProfile, InventoryItem, PlacedFurniture, Message, AppSettings } from '../types';
import { GeminiService } from '../services/geminiService';
import { HomeAIService } from '../services/homeAIService';
import FurnitureShopModal from './FurnitureShopView';

interface HomeRoomViewProps {
  character: Character;
  user: UserProfile;
  onClose: () => void;
  onUpdateCharacter: (character: Character) => void;
  onUpdateUser: (user: UserProfile) => void;
  messages: Message[];
  geminiService: GeminiService;
  addCharacterMessageToChat: (text: string) => void;
  onRedeemGiftCode: (code: string) => Promise<{ success: boolean; message: string; reward?: { coins?: number; item?: InventoryItem } }>;
  shopItems: InventoryItem[];
  settings: AppSettings;
}

// --- UTILS: SMART BACKGROUND REMOVAL & RESIZE ---
const removeBackgroundAuto = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            // Resize image to a maximum dimension to speed up processing and save space
            const MAX_SIZE = 512;
            let width = img.width;
            let height = img.height;

            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height = Math.round((height * MAX_SIZE) / width);
                    width = MAX_SIZE;
                } else {
                    width = Math.round((width * MAX_SIZE) / height);
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            
            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Process pixels
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];
            
            const threshold = 60; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
                if (diff < threshold) {
                    data[i + 3] = 0; 
                }
            }
            ctx.putImageData(imgData, 0, 0);
            
            // Return compressed webp to save even more space
            resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = () => resolve(base64);
    });
};

// --- PIXEL COMPONENTS ---

const PixelCharacter = ({ 
    avatarUrl, 
    characterName, 
    moodIcon,
    isMainChar = false,
    scale = 1,
    onClick,
    pixelated = true,
    showName = true,
    walkSpeed = 0.5,
    isThinking = false
}: { 
    avatarUrl: string, 
    characterName: string, 
    characterDesc?: string,
    moodIcon?: string | null,
    isMainChar?: boolean,
    scale?: number,
    onClick?: () => void,
    pixelated?: boolean,
    showName?: boolean,
    walkSpeed?: number,
    isThinking?: boolean
}) => {
    // Randomize initial position
    const getRandomPos = () => ({
        x: 15 + Math.random() * 70,
        y: 45 + Math.random() * 45
    });

    const [pos, setPos] = useState(getRandomPos());
    const [target, setTarget] = useState(getRandomPos());
    const [isMoving, setIsMoving] = useState(false); 
    const [isResting, setIsResting] = useState(true);
    const [facing, setFacing] = useState<'left' | 'right'>(Math.random() > 0.5 ? 'right' : 'left');

    // AI Wandering Logic
    useEffect(() => {
        const pickTarget = () => {
            if (isResting) return;
            const newX = 15 + Math.random() * 70;
            const newY = 45 + Math.random() * 45; 
            setTarget({ x: newX, y: newY });
            setFacing(newX > pos.x ? 'right' : 'left');
            setIsMoving(true);
        };

        const logicInterval = setInterval(() => {
            if (!isMoving) {
                if (isResting) {
                    // Chance to wake up
                    if (Math.random() > 0.6) {
                        setIsResting(false);
                        pickTarget();
                    }
                } else {
                    // Chance to rest
                    if (Math.random() > 0.7) {
                        setIsResting(true);
                    } else {
                        pickTarget();
                    }
                }
            }
        }, 3000);

        return () => clearInterval(logicInterval);
    }, [isMoving, isResting, pos.x]);

    // Movement Loop
    useEffect(() => {
        let frameId: number;
        const speed = walkSpeed; 

        const animate = () => {
            setPos(prev => {
                const dx = target.x - prev.x;
                const dy = target.y - prev.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < speed) {
                    setIsMoving(false);
                    // Small chance to immediately rest after reaching target
                    if (Math.random() > 0.5) setIsResting(true);
                    return target;
                }

                return {
                    x: prev.x + (dx / dist) * speed,
                    y: prev.y + (dy / dist) * speed
                };
            });
            frameId = requestAnimationFrame(animate);
        };

        if (isMoving && !isResting) animate();
        return () => cancelAnimationFrame(frameId);
    }, [isMoving, isResting, target, walkSpeed]);

    return (
        <div 
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick();
                }
            }}
            className={`absolute transition-transform duration-75 will-change-transform flex flex-col items-center ${onClick ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`}
            style={{ 
                left: `${pos.x}%`, 
                top: `${pos.y}%`, 
                transform: `translate(-50%, -90%) scale(${scale})`, // Pivot at feet + scale
                zIndex: Math.floor(pos.y) // Depth Sort based on Y
            }}
        >
            {/* Mood Icon Bubble */}
            {(moodIcon || isThinking) && (
                <div className="absolute -top-14 bg-white border-2 border-[#8d6e63] px-2 py-1.5 rounded-xl shadow-lg animate-in zoom-in duration-200 z-[100]">
                    {isThinking ? (
                        <div className="flex gap-1 px-1 py-1 items-center justify-center min-w-[24px] h-5">
                            <div className="w-1 h-1 bg-[#8d6e63] rounded-full animate-bounce [animation-duration:0.8s]"></div>
                            <div className="w-1 h-1 bg-[#8d6e63] rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></div>
                            <div className="w-1 h-1 bg-[#8d6e63] rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></div>
                        </div>
                    ) : (
                        <span className="text-xl animate-bounce inline-block">{moodIcon}</span>
                    )}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r-2 border-b-2 border-[#8d6e63] rotate-45"></div>
                </div>
            )}

            {/* Name Tag */}
            {showName && (
                <div className="bg-white/90 text-[#5d4037] text-[9px] px-3 py-1 rounded-full mb-1.5 backdrop-blur-sm whitespace-nowrap font-black border border-[#d7ccc8] shadow-sm tracking-wide uppercase">
                    {characterName}
                </div>
            )}
            
            {/* Character Sprite */}
            <div className={`w-20 h-20 ${isMoving && !isResting ? 'animate-bounce-pixel' : ''} relative transition-all duration-300 filter drop-shadow-md`}>
                <img 
                    src={avatarUrl} 
                    className={`w-full h-full object-contain ${facing === 'left' ? 'scale-x-[-1]' : ''} relative z-10 ${isResting ? 'opacity-90' : ''}`}
                    style={{ 
                        imageRendering: pixelated ? 'pixelated' : 'auto',
                        transform: isResting ? 'scale(0.98)' : 'none'
                    }}
                />
                {isResting && (
                    <div className="absolute -top-2 -right-2 text-[10px] animate-pulse opacity-60">💤</div>
                )}
            </div>
        </div>
    );
};

const PixelRoomView = ({ 
    items, 
    character, 
    user, 
    messages, 
    onUpdateItems, 
    onGenerateChar, 
    onGenerateUser, 
    onUploadFurniture, 
    gemini, 
    onClose,
    thought,
    moodIcon,
    handleCharClick,
    isThinking,
    floorStyle,
    roomRef,
    isEditMode,
    handleSave,
    onDeleteItem,
    shopItems,
    showNames = true,
    zoomLevel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
}: any) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragItem, setDragItem] = useState<string | null>(null);

    // Bỏ chọn item khi thoát chế độ chỉnh sửa
    useEffect(() => {
        if (!isEditMode) {
            setSelectedId(null);
            setDragItem(null);
        }
    }, [isEditMode]);

    const TILE_FLOOR_STYLE = {
        backgroundImage: `
            linear-gradient(#ffe0b2 1px, transparent 1px),
            linear-gradient(90deg, #ffe0b2 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        backgroundColor: '#fff8e1'
    };

    const WOOD_FLOOR_STYLE = {
        backgroundImage: `url('https://i.ibb.co/g63SYC6/3d-rendering-of-an-empty-room-with-a-wooden-floor-and-a-white-wall-removebg-preview.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundColor: '#fff8e1'
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        if (!isEditMode) return;
        setDragItem(id);
        setSelectedId(id);
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragItem || !roomRef.current) return;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = roomRef.current.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        // Clamp values
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        onUpdateItems(items.map((i: any) => i.id === dragItem ? { ...i, x: clampedX, y: clampedY } : i));
    };

    const handleDragEnd = () => {
        setDragItem(null);
    };

    const deleteItem = (id: string) => {
        if (onDeleteItem) {
            onDeleteItem(id);
        } else {
            onUpdateItems(items.filter((i: any) => i.id !== id));
        }
        setSelectedId(null);
    };

    const updateScale = (e: React.MouseEvent, id: string, delta: number) => {
        e.stopPropagation();
        onUpdateItems(items.map((i: any) => {
            if (i.id === id) {
                const newScale = Math.max(0.2, (i.scale || 1) + delta);
                return { ...i, scale: newScale };
            }
            return i;
        }));
    };

    const updateRotation = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onUpdateItems(items.map((i: any) => {
            if (i.id === id) {
                return { ...i, rotation: ((i.rotation || 0) + 90) % 360 };
            }
            return i;
        }));
    };

    const toggleFlip = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onUpdateItems(items.map((i: any) => {
            if (i.id === id) {
                return { ...i, isFlipped: !i.isFlipped };
            }
            return i;
        }));
    };

    const updateLayer = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
        e.stopPropagation();
        // Manual zIndex adjustment
        onUpdateItems(items.map((i: any) => {
            if (i.id === id) {
                const currentZ = i.zIndex || 0;
                return { ...i, zIndex: direction === 'up' ? currentZ + 1 : currentZ - 1 };
            }
            return i;
        }));
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex-1 flex flex-col items-center justify-start bg-[#fffbf0] p-4 pt-2 overflow-hidden relative select-none">
            
            {/* Header UI */}
            <div className="w-full flex justify-between items-center mb-4 z-40 pt-2 px-1">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="w-11 h-11 rounded-full bg-[#fdf6e3] hover:bg-[#fff3e0] flex items-center justify-center text-[#5d4037] border-2 border-[#ffe0b2] shadow-sm transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    {/* Coin Display */}
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border-2 border-amber-200 shadow-sm flex items-center gap-2 animate-in slide-in-from-left duration-500">
                        <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white text-[10px] shadow-inner border border-amber-500">
                            <i className="fa-solid fa-coins"></i>
                        </div>
                        <span className="font-black text-amber-700 text-sm tabular-nums">{user.auroCoins?.toLocaleString() || 0}</span>
                    </div>
                </div>

                {/* Character Status Card (Aligned with Header) */}
                <div onClick={handleCharClick} className="pointer-events-auto group cursor-pointer relative animate-in slide-in-from-right duration-500">
                    <div className="w-14 h-14 bg-[#fff3e0] rounded-2xl border-2 border-[#ffe0b2] p-1 shadow-lg relative overflow-hidden group-hover:scale-105 transition-transform active:scale-95">
                        <img src={character.avatar} className="w-full h-full object-contain" />
                        <div className="absolute bottom-0 left-0 right-0 bg-[#ffe0b2] text-[7px] font-black text-[#ef6c00] text-center py-0.5 uppercase tracking-tighter">CHAR</div>
                        {isThinking && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-white"></i></div>}
                    </div>
                </div>
            </div>


            
            {/* Retro Game Container */}
            <div className="relative bg-[#fdf6e3] p-3 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in zoom-in duration-300 border-8 border-[#ffe0b2] w-full max-w-md aspect-square mt-16 mx-auto overflow-hidden">
                
                {/* Game Screen */}
                <div 
                    ref={roomRef}
                    className="relative bg-[#fff8e1] overflow-hidden rounded-2xl shadow-inner border-4 border-[#ffcc80] w-full h-full cursor-pointer transition-transform duration-75 ease-out origin-center will-change-transform"
                    style={{
                        ...(floorStyle === 'tile' ? TILE_FLOOR_STYLE : WOOD_FLOOR_STYLE),
                        transform: `scale(${zoomLevel})`
                    }}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onTouchStart={(e) => {
                        if (e.touches.length === 2) handleTouchStart(e);
                        // Don't block drag logic if 1 finger
                    }}
                    onTouchMove={(e) => {
                        if (e.touches.length === 2) {
                            e.preventDefault(); // Prevent page scroll when zooming
                            handleTouchMove(e);
                        } else {
                            handleDragMove(e);
                        }
                    }}
                    onTouchEnd={(e) => {
                        handleTouchEnd();
                        handleDragEnd();
                    }}
                >
                    {/* Walls (Top Perspective) */}
                    <div className="absolute top-0 left-0 right-0 h-20 bg-[#fff3e0] border-b-4 border-[#ffe0b2] z-0 pointer-events-none shadow-sm">

                    </div>
                    
                    {/* Furniture Layer */}
                    {items.map((item: any) => {
                        const latestItemInfo = shopItems.find((s: any) => s.id === item.itemId) || item;
                        const isInteractive = latestItemInfo.isInteractive || item.isInteractive;
                        const interactiveImage = latestItemInfo.interactiveImage || item.interactiveImage;
                        const pixelImage = latestItemInfo.pixelImage || item.pixelImage;

                        return (
                        <div
                            key={item.id}
                            className={`absolute flex flex-col items-center justify-end group ${selectedId === item.id ? 'z-[100]' : ''}`}
                            style={{
                                left: `${item.x}%`,
                                top: `${item.y}%`, 
                                transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg) ${item.isFlipped ? 'scaleX(-1)' : ''}`,
                                width: `${20 * (item.scale || 1)}%`, // Base size
                                zIndex: selectedId === item.id ? 1000 : (item.zIndex || 0) + Math.floor(item.y) // Depth Sorting: Y + manual offset
                            }}
                            onMouseDown={(e) => handleDragStart(e, item.id)}
                            onTouchStart={(e) => handleDragStart(e, item.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isEditMode && isInteractive && interactiveImage) {
                                    onUpdateItems(items.map((i: any) => {
                                        if (i.id === item.id) {
                                            const isCurrentlyInteractive = i.currentImage === interactiveImage;
                                            return { ...i, currentImage: isCurrentlyInteractive ? pixelImage : interactiveImage };
                                        }
                                        return i;
                                    }));
                                } else if (isEditMode) {
                                    // In edit mode, clicking selects the item for controls
                                    setSelectedId(item.id);
                                }
                            }}
                        >
                            <div className="relative w-full">
                                {item.currentImage || pixelImage ? (
                                    <img 
                                        src={item.currentImage || pixelImage} 
                                        className={`w-full object-contain relative z-10 ${selectedId === item.id ? 'brightness-110 drop-shadow-[0_0_4px_rgba(255,200,100,0.8)]' : ''} ${isInteractive && !isEditMode ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`} 
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                ) : (
                                    <div className="text-3xl pointer-events-none">{item.icon}</div>
                                )}
                            </div>
                            

                        </div>
                    )})}

                    {/* Character Layer */}
                    {!isEditMode && (
                        <PixelCharacter 
                            avatarUrl={character.pixelAvatar || character.avatar} 
                            characterName={character.name}
                            characterDesc={character.description}
                            moodIcon={moodIcon}
                            isMainChar={true}
                            scale={character.scale || 1}
                            onClick={handleCharClick}
                            showName={showNames}
                            walkSpeed={character.pixelRoomSettings?.walkSpeed || 0.2}
                            isThinking={isThinking}
                        />
                    )}

                    {/* User Pixel Character (Optional) */}
                    {user.avatar && !isEditMode && (
                        <PixelCharacter 
                            avatarUrl={user.pixelAvatar || user.avatar} 
                            characterName={user.name} 
                            characterDesc={user.description || 'User'}
                            scale={user.scale || 1}
                            pixelated={false}
                            showName={showNames}
                            walkSpeed={character.pixelRoomSettings?.walkSpeed || 0.2}
                        />
                    )}
                </div>
            </div>

            {/* Furniture Controls - Moved below the room in Edit Mode */}
            {isEditMode && selectedId && (
                <div className="mt-4 flex flex-col gap-2 z-[101] animate-in slide-in-from-bottom-5 duration-300 w-max mx-auto furniture-controls-container">
                    <div className="flex gap-1.5 bg-white/90 backdrop-blur px-2 py-1.5 rounded-2xl border-2 border-[#8d6e63]/20 shadow-xl">
                        <button onClick={(e) => updateScale(e, selectedId, -0.1)} title="Thu nhỏ" className="bg-slate-100 text-slate-600 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs hover:bg-slate-200 transition-colors"><i className="fa-solid fa-minus"></i></button>
                        <button onClick={(e) => updateScale(e, selectedId, 0.1)} title="Phóng to" className="bg-slate-100 text-slate-600 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs hover:bg-slate-200 transition-colors"><i className="fa-solid fa-plus"></i></button>
                        <div className="w-px h-5 bg-slate-300 mx-0.5 self-center"></div>
                        <button onClick={(e) => updateRotation(e, selectedId)} title="Xoay" className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center text-xs hover:bg-indigo-100 transition-colors"><i className="fa-solid fa-rotate"></i></button>
                        <button onClick={(e) => toggleFlip(e, selectedId)} title="Lật" className="bg-blue-50 text-blue-600 w-8 h-8 rounded-xl flex items-center justify-center text-xs hover:bg-blue-100 transition-colors"><i className="fa-solid fa-repeat"></i></button>
                        <div className="w-px h-5 bg-slate-300 mx-0.5 self-center"></div>
                        <button onClick={(e) => updateLayer(e, selectedId, 'up')} title="Lên trên" className="bg-amber-50 text-amber-600 w-8 h-8 rounded-xl flex items-center justify-center text-xs hover:bg-amber-100 transition-colors"><i className="fa-solid fa-layer-group"></i></button>
                        <button onClick={(e) => updateLayer(e, selectedId, 'down')} title="Xuống dưới" className="bg-amber-50 text-amber-600 w-8 h-8 rounded-xl flex items-center justify-center text-xs hover:bg-amber-100 transition-colors rotate-180"><i className="fa-solid fa-layer-group"></i></button>
                    </div>
                    <div className="flex gap-1.5 justify-center">
                        <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="flex-1 py-1.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-check"></i> Xong
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteItem(selectedId); }} className="bg-rose-500 text-white w-8 h-8 rounded-xl flex items-center justify-center text-xs hover:bg-rose-600 transition-colors shadow-lg"><i className="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            )}
        </div>
    );
};



// --- GACHA ITEMS ---
// --- PRESET OUTFITS ---
const PRESET_OUTFITS = [
    { id: 'outfit-default', name: 'Mặc Định', image: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png' }, // Placeholder
    { id: 'outfit-casual-01', name: 'Dạo Phố', image: 'https://i.ibb.co/chvchRBY/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png' }, // Placeholder
    { id: 'outfit-formal-01', name: 'Lịch Lãm', image: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png' }, // Placeholder
    { id: 'outfit-pajamas-01', name: 'Đồ Ngủ', image: 'https://i.ibb.co/chvchRBY/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png' }, // Placeholder
];

const GACHA_ITEMS: InventoryItem[] = [
    {
        id: 'gacha-dragon-statue',
        name: 'Tượng Rồng Vàng',
        description: 'Một bức tượng rồng bằng vàng, biểu tượng của sự may mắn và quyền lực. (Hiếm)',
        icon: '🐉',
        value: 1000, // Giá trị bán lại
        category: 'Decoration',
        pixelImage: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png', // Placeholder
        interactiveImage: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview-interactive.png', // Placeholder for interactive image
        isInteractive: true,
        affinityBonus: 25,
        rarity: 'Huyền thoại'
    },
    {
        id: 'gacha-sakura-tree',
        name: 'Cây Anh Đào Mini',
        description: 'Mang cả mùa xuân vào căn phòng của bạn. (Hiếm)',
        icon: '🌸',
        value: 500,
        category: 'Plant',
        pixelImage: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png', // Placeholder
        affinityBonus: 15,
        rarity: 'Hiếm'
    },
    {
        id: 'gacha-cloud-rug',
        name: 'Thảm Mây Bồng Bềnh',
        description: 'Đi trên những đám mây. (Hiếm)',
        icon: '☁️',
        value: 400,
        category: 'Rug',
        pixelImage: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png', // Placeholder
        affinityBonus: 12,
        rarity: 'Hiếm'
    },
    {
        id: 'gacha-koi-lantern',
        name: 'Đèn Lồng Cá Chép',
        description: 'Chiếc đèn lồng mang lại sự bình yên. (Không phổ biến)',
        icon: '🏮',
        value: 200,
        category: 'Decoration',
        pixelImage: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png', // Placeholder
        affinityBonus: 8,
        rarity: 'Cực hiếm'
    },
    {
        id: 'gacha-lavender',
        name: 'Bó Hoa Oải Hương',
        description: 'Hương thơm thư giãn cho căn phòng. (Phổ biến)',
        icon: '💐',
        value: 100,
        category: 'Plant',
        pixelImage: 'https://i.ibb.co/yFRnFK94/flux-2-max-20251222-a-cute-chibi-pixel-art-removebg-preview.png', // Placeholder
        affinityBonus: 5,
        rarity: 'Thường'
    }
];

// --- GACHA MODAL ---
const GachaModal = ({ onClose, onPull, userCoins }: { onClose: () => void, onPull: () => Promise<InventoryItem | null>, userCoins: number }) => {
    const [isPulling, setIsPulling] = useState(false);
    const [wonItem, setWonItem] = useState<InventoryItem | null>(null);
    const GACHA_COST = 100;

    const handlePull = async () => {
        if (userCoins < GACHA_COST) {
            alert("Không đủ Xu Auro!");
            return;
        }
        setIsPulling(true);
        const item = await onPull();
        setWonItem(item);
        setIsPulling(false);
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-gradient-to-br from-purple-300 to-indigo-400 p-4 rounded-2xl border-4 border-yellow-300 shadow-2xl w-full max-w-sm relative text-center">
                <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg z-10"><i className="fa-solid fa-xmark"></i></button>
                <h3 className="text-center font-black text-white uppercase tracking-widest text-lg mb-2 text-shadow-lg">Máy Gacha Kỳ Diệu</h3>
                
                <div className="bg-white/20 rounded-xl p-4 my-4">
                    <img src="https://i.ibb.co/8DLQ7Bdt/gacha-machine.png" alt="Gacha Machine" className="w-48 h-auto mx-auto drop-shadow-xl" />
                </div>

                {wonItem ? (
                    <div className="flex flex-col items-center gap-2 animate-in zoom-in">
                         <p className="text-xs font-bold text-white/80">Bạn đã nhận được:</p>
                        <div className="bg-white p-2 rounded-xl border-2 border-yellow-400 flex flex-col items-center gap-2 shadow-lg">
                            <div className="w-20 h-20 flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden relative">
                                <img src={wonItem.pixelImage} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}} />
                            </div>
                            <h4 className="text-xs font-black text-[#5d4037] uppercase truncate">{wonItem.name}</h4>
                        </div>
                        <button onClick={() => setWonItem(null)} className="mt-2 w-full py-2 bg-yellow-400 text-purple-900 text-sm font-bold uppercase rounded-lg shadow-md active:scale-95 hover:bg-yellow-300">Quay Tiếp!</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-xs font-bold text-white/80">Mỗi lượt quay tốn 100 Xu. Thử vận may của bạn!</p>
                        <button 
                            onClick={handlePull}
                            disabled={isPulling || userCoins < GACHA_COST}
                            className="w-full py-3 bg-yellow-400 text-purple-900 text-lg font-black uppercase rounded-lg shadow-lg active:scale-95 hover:bg-yellow-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPulling ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-star"></i> Quay Ngay!</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- TUTORIAL MODAL ---
const TutorialModal = ({ onClose }: { onClose: () => void }) => {
    const tutorialSteps = [
        { icon: '🏠', title: 'Chào Mừng Tới Tổ Ấm!', description: 'Không gian sống ảo cực chill dành riêng cho bạn và người ấy. Hãy cùng nhau xây dựng một mái ấm thật ấm cúng nhé!' },
        { icon: '✏️', title: 'Chế Độ Chỉnh Sửa', description: 'Nhấn nút "Sửa" ngay menu chính để bắt đầu trang trí. Bạn có thể kéo thả, xoay, lật và thay đổi kích thước mọi món đồ!' },
        { icon: '🎒', title: 'Túi Đồ Nội Thất', description: 'Khi đang ở chế độ Sửa, hãy mở "Túi" để lấy những món đồ bạn đã mua hoặc chế tạo ra đặt vào phòng.' },
        { icon: '🔨', title: 'Xưởng Chế Tạo AI', description: 'Tự tay tạo ra nội thất độc bản! Chỉ cần tải ảnh lên, đặt tên, AI sẽ tự động tách nền và biến nó thành vật phẩm trong túi đồ của bạn.' },
        { icon: '🚶', title: 'Nhịp Sống Tự Nhiên', description: 'Các nhân vật giờ đây sẽ đi lại thong thả và biết dừng lại nghỉ ngơi. Bạn có thể chỉnh tốc độ đi trong phần Cài Đặt.' },
        { icon: '💬', title: 'Tương Tác Thân Mật', description: 'Nhấn vào nhân vật để lắng nghe những tâm sự ngọt ngào. Họ sẽ nhận biết được những món đồ bạn đặt trong phòng đấy!' },
        { icon: '💾', title: 'Lưu Giữ Kỷ Niệm', description: 'Đừng quên nhấn "Lưu" sau khi trang trí. Bạn cũng có thể chụp ảnh màn hình để khoe căn phòng của mình với bạn bè!' },
    ];
    const [currentStep, setCurrentStep] = useState(0);

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
            <div 
                className="bg-gradient-to-b from-[#f5e6d3] to-[#d7ccc8] p-6 rounded-2xl border-4 border-[#a1887f] shadow-2xl w-full max-w-md relative text-center flex flex-col justify-between min-h-[400px]"
            >
                <div className="absolute -top-4 -right-4">
                    <button onClick={onClose} className="w-10 h-10 bg-rose-500 text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg z-10 text-lg"><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center text-[#5d4037]">
                    <div className="text-6xl mb-4 animate-bounce">{tutorialSteps[currentStep].icon}</div>
                    <h3 className="font-black text-xl mb-3 uppercase tracking-wide">{tutorialSteps[currentStep].title}</h3>
                    <p className="text-sm font-semibold leading-relaxed bg-white/80 p-4 rounded-xl shadow-sm border border-[#d7ccc8]">{tutorialSteps[currentStep].description}</p>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button 
                        onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                        disabled={currentStep === 0}
                        className="px-4 py-2 bg-[#a1887f] text-white text-xs font-bold uppercase rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8d6e63] transition-colors"
                    >Trước</button>
                    <div className="flex gap-1">
                        {tutorialSteps.map((_, idx) => (
                            <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-[#5d4037]' : 'bg-[#d7ccc8]'}`}></div>
                        ))}
                    </div>
                    {currentStep < tutorialSteps.length - 1 ? (
                        <button 
                            onClick={() => setCurrentStep(s => Math.min(tutorialSteps.length - 1, s + 1))}
                            className="px-4 py-2 bg-[#8d6e63] text-white text-xs font-bold uppercase rounded-lg shadow-md hover:bg-[#6d4c41] transition-colors"
                        >Tiếp</button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg shadow-md hover:bg-emerald-600 transition-colors"
                        >Hoàn tất</button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- WARDROBE MODAL ---
const WardrobeModal = ({ 
    onClose, 
    character, 
    user, 
    onUpdateCharacter, 
    onUpdateUser 
}: { 
    onClose: () => void, 
    character: Character, 
    user: UserProfile, 
    onUpdateCharacter: (char: Character) => void, 
    onUpdateUser: (user: UserProfile) => void 
}) => {
    const [selectedTab, setSelectedTab] = useState<'char' | 'user'>('char');

    const handleSelectOutfit = (outfit: { id: string; name: string; image: string; }) => {
        if (selectedTab === 'char') {
            onUpdateCharacter({ ...character, pixelAvatar: outfit.image });
        }
        if (selectedTab === 'user') {
            onUpdateUser({ ...user, pixelAvatar: outfit.image });
        }
    };

    const currentTarget = selectedTab === 'char' ? character : user;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-[#f5e6d3] p-4 rounded-2xl border-4 border-[#8d6e63] shadow-2xl w-full max-w-md relative max-h-[80vh] flex flex-col">
                <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg z-10"><i className="fa-solid fa-xmark"></i></button>
                <h3 className="text-center font-black text-[#5d4037] uppercase tracking-widest text-lg mb-4 border-b-2 border-[#8d6e63]/20 pb-2">Tủ Đồ</h3>
                
                <div className="flex justify-center gap-2 mb-4 border-b-2 border-[#8d6e63]/20 pb-2">
                    <button onClick={() => setSelectedTab('char')} className={`px-4 py-2 rounded-lg font-bold text-sm ${selectedTab === 'char' ? 'bg-[#8d6e63] text-white' : 'bg-white/50'}`}>Nhân Vật</button>
                    <button onClick={() => setSelectedTab('user')} className={`px-4 py-2 rounded-lg font-bold text-sm ${selectedTab === 'user' ? 'bg-[#8d6e63] text-white' : 'bg-white/50'}`}>Bạn</button>
                </div>

                <div className="grid grid-cols-4 gap-3 overflow-y-auto custom-scrollbar p-1">
                    {(currentTarget.outfits || PRESET_OUTFITS).map(outfit => (
                        <div 
                            key={outfit.id} 
                            onClick={() => handleSelectOutfit(outfit)}
                            className={`p-2 rounded-xl border-2 flex flex-col items-center gap-2 shadow-sm cursor-pointer transition-all ${currentTarget.pixelAvatar === outfit.image ? 'border-emerald-500 bg-emerald-50' : 'border-[#d7ccc8] bg-white hover:border-[#8d6e63]'}`}>
                            <div className="w-16 h-16 flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden">
                                <img src={outfit.image} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}} />
                            </div>
                            <h4 className="text-[9px] font-bold text-[#5d4037] uppercase truncate text-center">{outfit.name}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- CRAFTING MODAL ---
const CraftingModal = ({ onClose, onUpload, userCoins }: { onClose: () => void, onUpload: () => void, userCoins: number }) => {
    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-3xl border-4 border-amber-500 shadow-2xl w-full max-w-md relative text-center">
                <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg"><i className="fa-solid fa-xmark"></i></button>
                <h3 className="font-black text-amber-600 uppercase tracking-widest text-xl mb-4">Xưởng Chế Tạo</h3>
                
                <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 mb-6 text-left">
                    <p className="font-bold text-amber-800 mb-2"><i className="fa-solid fa-triangle-exclamation"></i> Lưu ý quan trọng:</p>
                    <ul className="text-xs text-amber-900 space-y-1 list-disc pl-4">
                        <li>Hệ thống sẽ tự động tách nền trắng.</li>
                        <li><strong>Khuyến khích:</strong> Hãy tự tách nền ảnh trước khi tải lên để tránh việc nội thất màu trắng bị xóa mất (bị rỗng ruột).</li>
                        <li>Phí chế tạo: <strong>1,000 Xu Auro</strong> / lần.</li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <p className="text-sm font-bold text-slate-500">Số dư hiện tại: <span className="text-amber-500">{userCoins.toLocaleString()} Xu</span></p>
                    <button 
                        onClick={() => {
                            onUpload();
                            onClose();
                        }}
                        disabled={userCoins < 1000}
                        className="w-full py-3 bg-amber-500 text-white rounded-xl font-black uppercase shadow-lg hover:bg-amber-600 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {userCoins < 1000 ? 'Không đủ Xu' : <><i className="fa-solid fa-upload"></i> Tải Ảnh & Chế Tạo (-1000 Xu)</>}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---

const HomeRoomView: React.FC<HomeRoomViewProps> = ({ character, user, onClose, onUpdateCharacter, onUpdateUser, messages, geminiService, addCharacterMessageToChat, onRedeemGiftCode, shopItems, settings }) => {
  const [items, setItems] = useState<PlacedFurniture[]>(character.pixelRoomLayout || []);
  const [floorStyle, setFloorStyle] = useState<'tile' | 'wood'>('tile');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItem, setGeneratedItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [showFurnitureShop, setShowFurnitureShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [characterSpokenText, setCharacterSpokenText] = useState<string | null>(null);
  const [isCharacterSpeaking, setIsCharacterSpeaking] = useState(false);
  const [uploadWarningTarget, setUploadWarningTarget] = useState<'char' | 'user' | null>(null);
  const [autoRemoveBackground, setAutoRemoveBackground] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);

  const [thought, setThought] = useState<string>("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [moodIcon, setMoodIcon] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const [showNames, setShowNames] = useState(true);
  
  // Zoom Logic
  const [zoomLevel, setZoomLevel] = useState(1);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          setInitialDistance(dist);
          setInitialZoom(zoomLevel);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialDistance !== null) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          const delta = dist / initialDistance;
          setZoomLevel(Math.min(Math.max(initialZoom * delta, 0.5), 3));
      }
  };

  const handleTouchEnd = () => {
      setInitialDistance(null);
  };

  // Crafting Logic
  const [showCraftNameModal, setShowCraftNameModal] = useState(false);
  const [craftName, setCraftName] = useState("");
  const [pendingCraftImage, setPendingCraftImage] = useState<string | null>(null);

  // Random Mood Icon Effect
  useEffect(() => {
    const MOOD_ICONS = ['❤️', '🎵', '✨', '💤', '💭', '🌸', '⭐', '🔥'];
    const interval = setInterval(() => {
        if (Math.random() > 0.7) {
            const randomIcon = MOOD_ICONS[Math.floor(Math.random() * MOOD_ICONS.length)];
            setMoodIcon(randomIcon);
            setTimeout(() => setMoodIcon(null), 3000);
        }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const showSysMsg = (msg: string) => {
      setSystemMessage(msg);
      setTimeout(() => setSystemMessage(null), 3000);
  };

  const charInputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef<HTMLInputElement>(null);
  const furnInputRef = useRef<HTMLInputElement>(null);

  const geminiRef = useRef(new GeminiService());

  const handleCharacterClick = async () => {
    if (isCharacterSpeaking) return;
    setIsCharacterSpeaking(true);
    try {
      // Determine relationship status from character data
      const relationship = character.relations?.find(r => r.name === user.name)?.type || 'Bạn bè';
      
      const homeAIService = new HomeAIService(geminiService);
      const response = await homeAIService.generateResponse(
          character.name, 
          character.description, 
          messages,
          relationship,
          items.map((i: any) => i.name),
          character.openingMessage || "",
          character.diary || [],
          character.money || 0,
          character.world?.currencyName || "Xu"
      );
      setCharacterSpokenText(response);
      // Removed addCharacterMessageToChat(response) to prevent leakage to main chat
      
      setTimeout(() => setCharacterSpokenText(null), 8000); // Hide bubble after 8s
    } catch (error) {
      console.error("Error generating character response:", error);
      setCharacterSpokenText("...");
      setTimeout(() => setCharacterSpokenText(null), 3000);
    } finally {
      setIsCharacterSpeaking(false);
    }
  };
  const handleGachaPull = async (): Promise<InventoryItem | null> => {
      const GACHA_COST = 100;
      if ((user.auroCoins || 0) < GACHA_COST) {
          showSysMsg("Bạn không đủ Xu Auro để quay Gacha!");
          return null;
      }

      // Weighted random selection based on rarity
      const weightedList: InventoryItem[] = [];
      GACHA_ITEMS.forEach(item => {
          let weight = 10; // Thường
          if (item.rarity === 'Cực hiếm') weight = 5;
          if (item.rarity === 'Hiếm') weight = 2;
          if (item.rarity === 'Huyền thoại') weight = 1;
          for (let i = 0; i < weight; i++) {
              weightedList.push(item);
          }
      });

      const randomIndex = Math.floor(Math.random() * weightedList.length);
      const wonItem = weightedList[randomIndex];

      const updatedUser = {
          ...user,
          auroCoins: (user.auroCoins || 0) - GACHA_COST,
          furnitureInventory: [...(user.furnitureInventory || []), { ...wonItem, quantity: 1, isFurniture: true }]
      };
      onUpdateUser(updatedUser);
      
      // A little delay to build suspense
      await new Promise(res => setTimeout(res, 1500));

      showSysMsg(`Wow! Bạn đã quay ra ${wonItem.name}!`);
      handlePlaceItem({ ...wonItem, quantity: 1 }); // Automatically place the item
      return wonItem;
  };

  const toggleFloor = () => {
      setFloorStyle(prev => prev === 'tile' ? 'wood' : 'tile');
  };

  const handleScreenshot = () => {
      if (roomRef.current) {
          const controls = roomRef.current.querySelector('.furniture-controls-container');
          if (controls) (controls as HTMLElement).style.display = 'none';

          html2canvas(roomRef.current, {
              backgroundColor: '#fdf6e3',
              useCORS: true,
              onclone: (document) => {
                  const images = document.querySelectorAll('img');
                  images.forEach(img => {
                      img.style.imageRendering = 'pixelated';
                  });
              }
          }).then(canvas => {
              const link = document.createElement('a');
              link.download = `ToAm_${new Date().toISOString().slice(0,10)}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
              
              if (controls) (controls as HTMLElement).style.display = '';
          });
      }
  };

  // Initialize Auro Coins & Daily Check-in & First Time Tutorial
  useEffect(() => {
      const isFirstTime = !localStorage.getItem('hasSeenHomeroomTutorial');
      if (isFirstTime) {
          setShowTutorial(true);
          localStorage.setItem('hasSeenHomeroomTutorial', 'true');
      }

      let updatedUser = { ...user };
      let changed = false;

      if (updatedUser.auroCoins === undefined) {
          updatedUser.auroCoins = 1000;
          changed = true;
      }

      if (changed) {
          onUpdateUser(updatedUser);
      }
  }, []);

  const handleDailyCheckIn = () => {
      const now = Date.now();
      const lastCheckIn = user.lastCheckIn || 0;
      const oneDay = 24 * 60 * 60 * 1000;

      if (now - lastCheckIn > oneDay) {
          const reward = 100;
          const updatedUser = { 
              ...user, 
              auroCoins: (user.auroCoins || 0) + reward,
              lastCheckIn: now
          };
          onUpdateUser(updatedUser);
          showSysMsg(`Bạn đã điểm danh! Nhận được ${reward} Xu Auro ✨`);
      } else {
          const nextCheckIn = lastCheckIn + oneDay;
          const hoursLeft = Math.ceil((nextCheckIn - now) / (1000 * 60 * 60));
          showSysMsg(`Bạn đã điểm danh hôm nay rồi. Quay lại sau ${hoursLeft} giờ nhé!`);
      }
  };

  const handleCharClick = async () => {
      if (isThinking || !geminiRef.current) return;
      setIsThinking(true);
      setMoodIcon("💭");

      try {
          const result = await geminiRef.current.generateOnIdleThought(
            character, 
            messages, 
            settings,
            character.diary || []
          );
          setThought(result.text);

          let icon = "😐";
          if (result.mood === 'happy' || result.mood === 'love') icon = "❤️";
          else if (result.mood === 'angry') icon = "💢";
          else if (result.mood === 'sad') icon = "💧";
          else if (result.mood === 'excited') icon = "✨";
          else if (result.mood === 'confused') icon = "❓";
          else if (result.mood === 'surprised') icon = "❗";

          setMoodIcon(icon);
          setTimeout(() => setMoodIcon(null), 5000);
          setTimeout(() => setThought(""), 10000);
      } catch (e) {
          console.error(e);
          setThought("...");
          setMoodIcon(null);
          setTimeout(() => setThought(""), 3000);
      } finally {
          setIsThinking(false);
      }
  };

  const [isEditMode, setIsEditMode] = useState(false);

  const handleSave = () => {
      setIsSaving(true);
      const updatedChar = { ...character, pixelRoomLayout: items };
      onUpdateCharacter(updatedChar); 
      setIsEditMode(false); // Exit edit mode on save
      setTimeout(() => setIsSaving(false), 1000);
      showSysMsg("Đã lưu thay đổi!");
  };

  const toggleEditMode = () => {
      if (isEditMode) {
          handleSave(); // Auto-save when exiting edit mode
      }
      setIsEditMode(!isEditMode);
      if (!isEditMode) {
          showSysMsg("Đã vào chế độ chỉnh sửa. Bạn có thể di chuyển đồ đạc!");
      }
  };

  const handleOpenInventory = () => {
      if (!isEditMode) {
          showSysMsg("Vui lòng vào Chế độ Chỉnh sửa để lấy đồ!");
          return;
      }
      setShowInventory(true);
  };

  const handleUploadChar = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsGenerating(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          let finalImage = base64;
          
          if (autoRemoveBackground) {
              finalImage = await removeBackgroundAuto(base64);
          }
          
          // ONLY update pixelAvatar for the room puppet, keeping the main avatar original
          onUpdateCharacter({ ...character, pixelAvatar: finalImage });
          setIsGenerating(false);
      };
      reader.readAsDataURL(file);
  };

  const handleUploadUser = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsGenerating(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          let finalImage = base64;
          
          if (autoRemoveBackground) {
              finalImage = await removeBackgroundAuto(base64);
          }
          
          // ONLY update pixelAvatar for the room puppet
          onUpdateUser({ ...user, pixelAvatar: finalImage });
          setIsGenerating(false);
      };
      reader.readAsDataURL(file);
  };

  const handleUploadFurniture = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if ((user.auroCoins || 0) < 1000) {
          showSysMsg("Không đủ 1000 Xu để chế tạo!");
          return;
      }

      setIsGenerating(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          let cleanUrl = base64;
          
          if (autoRemoveBackground) {
              cleanUrl = await removeBackgroundAuto(base64); 
          }
          
          setPendingCraftImage(cleanUrl);
          setCraftName(file.name.split('.')[0] || 'Custom Item');
          setShowCraftNameModal(true);
          setIsGenerating(false);
      };
      reader.readAsDataURL(file);
  };

  const handleConfirmCraft = () => {
      if (!pendingCraftImage) return;

      const newItem: InventoryItem = {
          id: 'upload-' + Date.now(),
          name: craftName || 'Custom Item',
          icon: '🖼️',
          description: 'Đồ tự tải lên',
          value: 0,
          affinityBonus: 0,
          category: 'Custom',
          pixelImage: pendingCraftImage,
          isFurniture: true,
          quantity: 1
      };

      // Deduct coins
      const updatedUser = {
          ...user,
          auroCoins: (user.auroCoins || 0) - 1000,
          furnitureInventory: [...(user.furnitureInventory || []), newItem]
      };
      onUpdateUser(updatedUser);
      
      setShowCraftNameModal(false);
      setPendingCraftImage(null);
      setCraftName("");
      
      showSysMsg(`Đã chế tạo thành công ${newItem.name}! (-1000 Xu)`);
  };

  const handlePlaceItem = (invItem: InventoryItem) => {
      // Check if the item exists in the user's furniture inventory and has quantity > 0
      const itemInInventory = user.furnitureInventory?.find(i => i.id === invItem.id);
      if (!itemInInventory || (itemInInventory.quantity || 0) <= 0) {
          showSysMsg("Không có đủ số lượng trong kho!");
          return;
      }

      const latestItemInfo = shopItems.find((i: any) => i.id === invItem.id) || invItem;

      const newItem: PlacedFurniture = {
          id: 'p-' + Date.now(),
          itemId: invItem.id,
          name: invItem.name,
          icon: invItem.icon,
          x: 50, y: 50,
          rotation: 0, scale: 1,
          pixelImage: invItem.pixelImage,
          interactiveImage: latestItemInfo.interactiveImage || invItem.interactiveImage,
          isInteractive: latestItemInfo.isInteractive || invItem.isInteractive,
          currentImage: invItem.pixelImage // Initialize with the default image
      };
      setItems([...items, newItem]);
      setGeneratedItem(null);

      // Decrement quantity in user's furniture inventory
      const updatedInventory = user.furnitureInventory?.map(item => 
          item.id === invItem.id ? { ...item, quantity: (item.quantity || 0) - 1 } : item
      ) || [];

      onUpdateUser({ ...user, furnitureInventory: updatedInventory });
  };

  const handleDeleteItem = (id: string) => {
      const itemToRemove = items.find((i: any) => i.id === id);
      if (!itemToRemove) return;

      // Remove from room
      setItems(items.filter((i: any) => i.id !== id));

      // Add back to furniture inventory
      const existingItemIndex = user.furnitureInventory?.findIndex(invItem => invItem.id === itemToRemove.itemId);
      let updatedInventory;

      if (existingItemIndex !== undefined && existingItemIndex > -1 && user.furnitureInventory) {
          updatedInventory = user.furnitureInventory.map((invItem, index) => 
              index === existingItemIndex 
                  ? { ...invItem, quantity: (invItem.quantity || 0) + 1 } 
                  : invItem
          );
      } else {
          // Reconstruct basic inventory item
          const originalItem = shopItems.find((si: any) => si.id === itemToRemove.itemId) || {
              id: itemToRemove.itemId,
              name: itemToRemove.name,
              icon: itemToRemove.icon,
              pixelImage: itemToRemove.pixelImage,
              interactiveImage: itemToRemove.interactiveImage,
              isInteractive: itemToRemove.isInteractive,
              value: 0,
              category: 'Furniture',
              isFurniture: true
          };
          updatedInventory = [...(user.furnitureInventory || []), { ...originalItem, quantity: 1, isFurniture: true }];
      }

      onUpdateUser({ ...user, furnitureInventory: updatedInventory });
  };

  const coreMenuItems = [
      { label: isEditMode ? 'Xong' : 'Sửa', icon: isEditMode ? 'fa-check' : 'fa-pen-to-square', action: toggleEditMode, color: 'text-amber-500', bg: 'bg-amber-50' },
      { label: 'Shop', icon: 'fa-store', action: () => setShowFurnitureShop(true), color: 'text-indigo-500', bg: 'bg-indigo-50' },
      { label: 'Cài đặt', icon: 'fa-gear', action: () => setShowSettings(true), color: 'text-slate-500', bg: 'bg-slate-50' },
      { label: 'Chế Tạo', icon: 'fa-hammer', action: () => setShowCrafting(true), color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const extraMenuItems = [
      { label: 'Túi', icon: 'fa-briefcase', action: handleOpenInventory, color: 'text-blue-500', bg: 'bg-blue-50' },
      { label: 'Lưu Lại', icon: isSaving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk', action: handleSave, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { label: 'Tải Char', icon: 'fa-upload', action: () => setUploadWarningTarget('char'), color: 'text-purple-500', bg: 'bg-purple-50' },
      { label: 'Tải User', icon: 'fa-user-plus', action: () => setUploadWarningTarget('user'), color: 'text-pink-500', bg: 'bg-pink-50' },
      { label: 'Hướng Dẫn', icon: 'fa-circle-info', action: () => setShowTutorial(true), color: 'text-teal-500', bg: 'bg-teal-50' },
  ];

    return (
    <div className="h-full w-full relative bg-[#fffbf0] flex flex-col overflow-hidden font-sans">
        {/* System Message Toast */}
        {systemMessage && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold animate-in slide-in-from-top-4 fade-in duration-300">
                {systemMessage}
            </div>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
            <div className="absolute inset-0 z-[70] bg-[#fffbf0]/90 backdrop-blur-sm flex flex-col items-center justify-center text-[#5d4037]">
                <div className="w-16 h-16 border-4 border-t-[#ffa726] border-r-transparent border-b-[#ef6c00] border-l-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest animate-pulse">Đang Xử Lý & Tách Nền...</p>
                <p className="text-[10px] text-[#8d6e63] italic mt-2">Đang nắn nót từng pixel...</p>
            </div>
        )}

        {/* PIXEL VIEW */}
        <PixelRoomView 
            items={items} 
            character={character} 
            user={user}
            messages={messages}
            onUpdateItems={setItems}
            onGenerateChar={() => charInputRef.current?.click()}
            onGenerateUser={() => userInputRef.current?.click()}
            onUploadFurniture={handleUploadFurniture}
            gemini={geminiRef.current}
            onClose={onClose}
            thought={thought}
            moodIcon={moodIcon}
            handleCharClick={handleCharacterClick}
            isThinking={isThinking || isCharacterSpeaking}
            floorStyle={floorStyle}
            roomRef={roomRef}
            isEditMode={isEditMode}
            handleSave={handleSave}
            onDeleteItem={handleDeleteItem}
            shopItems={shopItems}
            showNames={showNames}
            zoomLevel={zoomLevel}
            handleTouchStart={handleTouchStart}
            handleTouchMove={handleTouchMove}
            handleTouchEnd={handleTouchEnd}
        />

        {/* SPOKEN TEXT DIALOGUE BOX (BOTTOM) */}
        {characterSpokenText && (
            <div className="absolute bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto flex justify-center">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border-2 border-[#8d6e63] shadow-xl relative w-auto max-w-lg min-w-[200px]">
                    <div className="absolute -top-3 left-6 bg-[#8d6e63] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {character.name}
                    </div>
                    <div className="pr-1">
                        <p className="text-sm font-medium text-[#5d4037] leading-relaxed text-center break-words">
                            "{characterSpokenText}"
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Inputs */}
        <input type="file" ref={charInputRef} className="hidden" accept="image/*" onChange={handleUploadChar} />
        <input type="file" ref={userInputRef} className="hidden" accept="image/*" onChange={handleUploadUser} />
        <input type="file" ref={furnInputRef} className="hidden" accept="image/*" onChange={handleUploadFurniture} />

        {/* INVENTORY / DOCK */}
        <div className="absolute bottom-4 left-4 right-4 z-40 pointer-events-auto">
            {generatedItem && (
                <div className="bg-white/95 backdrop-blur rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-10 border-2 border-[#ffcc80] shadow-2xl">
                    <div className="w-16 h-16 bg-[#fff8e1] rounded-xl border border-[#ffe0b2] flex items-center justify-center p-1 relative">
                        <img src={generatedItem.pixelImage} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-[#8d6e63] uppercase tracking-widest">Vừa chế tạo xong!</p>
                        <h4 className="font-black text-[#5d4037] uppercase">{generatedItem.name}</h4>
                    </div>
                    <button onClick={() => handlePlaceItem(generatedItem)} className="px-5 py-2.5 bg-[#ef6c00] text-white rounded-xl font-bold text-[10px] uppercase shadow-lg hover:bg-[#e65100] transition-colors">Lấy ra</button>
                </div>
            )}
        </div>

        {/* Bottom Menu Grid */}
        <div className={`bg-white transition-all duration-300 absolute bottom-0 left-0 right-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-[#f3e5f5] z-50 ${isMenuCollapsed ? 'h-14' : 'p-6 pt-8 pb-8 rounded-t-[2.5rem]'}`}>
            {/* Collapse Toggle */}
            <button 
                onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
                className="absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-10 bg-white rounded-t-2xl flex items-center justify-center text-[#8d6e63] shadow-[0_-4px_6px_rgba(0,0,0,0.02)] z-50 hover:text-[#5d4037] transition-colors"
            >
                <i className={`fa-solid ${isMenuCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
            </button>

            {!isMenuCollapsed && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Core Actions */}
                    <div className="grid grid-cols-4 gap-3">
                        <button 
                            onClick={toggleEditMode}
                            className={`flex flex-col items-center justify-center transition-all p-2 rounded-2xl group active:scale-95 hover:bg-slate-50 ${isEditMode ? 'bg-amber-50 ring-2 ring-amber-200' : ''}`}
                        >
                            <div className={`w-12 h-12 flex items-center justify-center text-xl mb-2 rounded-2xl ${isEditMode ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-500'} shadow-sm group-hover:scale-110 transition-transform border border-white`}>
                                <i className={`fa-solid ${isEditMode ? 'fa-check' : 'fa-pen-to-square'}`}></i>
                            </div>
                            <span className="text-[9px] font-bold text-[#5d4037] uppercase tracking-tight text-center line-clamp-1 group-hover:text-[#ef6c00] transition-colors">{isEditMode ? 'Xong' : 'Sửa'}</span>
                        </button>

                        <button 
                            onClick={handleOpenInventory}
                            className={`flex flex-col items-center justify-center transition-all p-2 rounded-2xl group active:scale-95 hover:bg-slate-50 ${!isEditMode ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className={`w-12 h-12 flex items-center justify-center text-xl mb-2 rounded-2xl bg-blue-50 text-blue-500 shadow-sm group-hover:scale-110 transition-transform border border-white`}>
                                <i className={`fa-solid fa-briefcase`}></i>
                            </div>
                            <span className="text-[9px] font-bold text-[#5d4037] uppercase tracking-tight text-center line-clamp-1 group-hover:text-[#ef6c00] transition-colors">Túi</span>
                        </button>

                        <button 
                            onClick={() => setShowFurnitureShop(true)}
                            className={`flex flex-col items-center justify-center transition-all p-2 rounded-2xl group active:scale-95 hover:bg-slate-50`}
                        >
                            <div className={`w-12 h-12 flex items-center justify-center text-xl mb-2 rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm group-hover:scale-110 transition-transform border border-white`}>
                                <i className={`fa-solid fa-store`}></i>
                            </div>
                            <span className="text-[9px] font-bold text-[#5d4037] uppercase tracking-tight text-center line-clamp-1 group-hover:text-[#ef6c00] transition-colors">Shop</span>
                        </button>

                        <button 
                            onClick={() => setShowSettings(true)}
                            className={`flex flex-col items-center justify-center transition-all p-2 rounded-2xl group active:scale-95 hover:bg-slate-50`}
                        >
                            <div className={`w-12 h-12 flex items-center justify-center text-xl mb-2 rounded-2xl bg-slate-50 text-slate-500 shadow-sm group-hover:scale-110 transition-transform border border-white`}>
                                <i className={`fa-solid fa-gear`}></i>
                            </div>
                            <span className="text-[9px] font-bold text-[#5d4037] uppercase tracking-tight text-center line-clamp-1 group-hover:text-[#ef6c00] transition-colors">Cài đặt</span>
                        </button>
                    </div>
                    
                    {/* Extra Actions - Scrollable */}
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Tính năng khác</p>
                        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar px-2">
                            {isEditMode && (
                                <button 
                                    onClick={handleSave}
                                    className="flex flex-col items-center justify-center min-w-[60px] group active:scale-95"
                                >
                                    <div className={`w-10 h-10 flex items-center justify-center text-sm mb-1.5 rounded-xl bg-emerald-50 text-emerald-500 shadow-sm group-hover:scale-110 transition-transform`}>
                                        <i className={`fa-solid ${isSaving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`}></i>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight text-center group-hover:text-slate-700">Lưu</span>
                                </button>
                            )}
                            
                            <button 
                                onClick={() => setShowCrafting(true)}
                                className="flex flex-col items-center justify-center min-w-[60px] group active:scale-95"
                            >
                                <div className={`w-10 h-10 flex items-center justify-center text-sm mb-1.5 rounded-xl bg-amber-50 text-amber-500 shadow-sm group-hover:scale-110 transition-transform`}>
                                    <i className={`fa-solid fa-hammer`}></i>
                                </div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight text-center group-hover:text-slate-700">Chế Tạo</span>
                            </button>

                            {extraMenuItems.slice(1).map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={item.action}
                                    className="flex flex-col items-center justify-center min-w-[60px] group active:scale-95"
                                >
                                    <div className={`w-10 h-10 flex items-center justify-center text-sm mb-1.5 rounded-xl ${item.bg} ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                        <i className={`fa-solid ${item.icon}`}></i>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight text-center group-hover:text-slate-700">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {isMenuCollapsed && (
                <div className="flex items-center justify-center h-full gap-6 px-4 overflow-x-auto no-scrollbar">
                    {coreMenuItems.map((item, idx) => (
                        <button key={idx} onClick={item.action} className={`${item.color} hover:scale-110 transition-transform p-2`}>
                            <i className={`fa-solid ${item.icon} text-lg`}></i>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* FURNITURE SHOP MODAL */}
        {showFurnitureShop && <FurnitureShopModal 
            items={shopItems} 
            userInventory={user.furnitureInventory || []} 
            onClose={() => setShowFurnitureShop(false)} 
            user={user}
            onUpdateUser={onUpdateUser}
            onPlaceItem={handlePlaceItem}
            shopItems={shopItems}
            onBuy={(item, quantityToBuy) => {
            const totalCost = item.value * quantityToBuy;
            if ((user.auroCoins || 0) < totalCost) {
                showSysMsg("Bạn không đủ Xu Auro để mua món đồ này!");
                return;
            }

            const existingItemIndex = user.furnitureInventory?.findIndex(invItem => invItem.id === item.id);
            let updatedInventory;

            if (existingItemIndex !== undefined && existingItemIndex > -1 && user.furnitureInventory) {
                // Update quantity of existing item
                updatedInventory = user.furnitureInventory.map((invItem, index) => 
                    index === existingItemIndex 
                        ? { ...invItem, quantity: (invItem.quantity || 0) + quantityToBuy } 
                        : invItem
                );
            } else {
                // Add new item with quantity
                updatedInventory = [...(user.furnitureInventory || []), { ...item, quantity: quantityToBuy, isFurniture: true }];
            }

            const updatedUser = {
                ...user,
                auroCoins: (user.auroCoins || 0) - totalCost,
                furnitureInventory: updatedInventory
            };
            onUpdateUser(updatedUser);
            // handlePlaceItem(item); // Don't auto-place from shop, let user place from inventory
            setShowFurnitureShop(false);
            showSysMsg(`Đã mua ${quantityToBuy} ${item.name}!`);
        }} />}

        {/* GACHA MODAL */}
        {showGacha && <GachaModal onClose={() => setShowGacha(false)} onPull={handleGachaPull} userCoins={user.auroCoins || 0} />}

        {/* TUTORIAL MODAL */}
        {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

        {/* WARDROBE MODAL */}
        {showWardrobe && <WardrobeModal onClose={() => setShowWardrobe(false)} character={character} user={user} onUpdateCharacter={onUpdateCharacter} onUpdateUser={onUpdateUser} />}

        {/* CRAFTING MODAL */}
        {showCrafting && <CraftingModal onClose={() => setShowCrafting(false)} onUpload={() => furnInputRef.current?.click()} userCoins={user.auroCoins || 0} />}

        {/* CRAFT NAME MODAL */}
        {showCraftNameModal && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border-4 border-[#ef6c00] shadow-2xl w-full max-w-sm relative">
                    <h3 className="text-center font-black text-[#ef6c00] uppercase tracking-widest text-lg mb-4">Đặt Tên Vật Phẩm</h3>
                    <div className="w-24 h-24 mx-auto bg-[#fff8e1] rounded-xl border border-[#ffe0b2] flex items-center justify-center p-2 mb-4">
                        {pendingCraftImage && <img src={pendingCraftImage} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}} />}
                    </div>
                    <input 
                        type="text" 
                        value={craftName}
                        onChange={(e) => setCraftName(e.target.value)}
                        placeholder="Nhập tên vật phẩm..."
                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 mb-4 focus:outline-none focus:border-[#ef6c00]"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setShowCraftNameModal(false);
                                setPendingCraftImage(null);
                            }}
                            className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-black uppercase hover:bg-slate-300 transition-colors"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={handleConfirmCraft}
                            className="flex-1 py-3 bg-[#ef6c00] text-white rounded-xl font-black uppercase hover:bg-[#e65100] transition-colors shadow-lg"
                        >
                            Xác Nhận
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border-4 border-[#8d6e63] shadow-2xl w-full max-w-sm relative">
                    <button onClick={() => setShowSettings(false)} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg"><i className="fa-solid fa-xmark"></i></button>
                    <h3 className="text-center font-black text-[#5d4037] uppercase tracking-widest text-lg mb-6">Cài Đặt Tổ Ấm</h3>
                    
                    <div className="space-y-6">
                        
                        {/* Auto Remove Background Toggle */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                                <p className="text-xs font-bold text-slate-700 uppercase">Tự động tách nền</p>
                                <p className="text-[10px] text-slate-500">Dùng AI xóa phông khi tải ảnh mới</p>
                            </div>
                            <button 
                                onClick={() => setAutoRemoveBackground(!autoRemoveBackground)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${autoRemoveBackground ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${autoRemoveBackground ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        {/* Show Names Toggle */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                                <p className="text-xs font-bold text-slate-700 uppercase">Hiển thị tên</p>
                                <p className="text-[10px] text-slate-500">Bật/tắt tên nhân vật</p>
                            </div>
                            <button 
                                onClick={() => setShowNames(!showNames)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${showNames ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${showNames ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tốc độ đi ({Math.round((character.pixelRoomSettings?.walkSpeed || 0.2) * 100)}%)</label>
                            <input 
                                type="range" min="0.05" max="1" step="0.05" 
                                value={character.pixelRoomSettings?.walkSpeed || 0.2} 
                                onChange={(e) => onUpdateCharacter({ 
                                    ...character, 
                                    pixelRoomSettings: { 
                                        ...(character.pixelRoomSettings || {}), 
                                        walkSpeed: parseFloat(e.target.value) 
                                    } 
                                })}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kích cỡ Nhân vật ({Math.round((character.scale || 1) * 100)}%)</label>
                            <input 
                                type="range" min="0.5" max="2" step="0.1" 
                                value={character.scale || 1} 
                                onChange={(e) => onUpdateCharacter({ ...character, scale: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#ef6c00]"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kích cỡ Bạn ({Math.round((user.scale || 1) * 100)}%)</label>
                            <input 
                                type="range" min="0.5" max="2" step="0.1" 
                                value={user.scale || 1} 
                                onChange={(e) => onUpdateUser({ ...user, scale: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2e7d32]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}



        {/* INVENTORY MODAL */}
        {showInventory && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border-4 border-[#8d6e63] shadow-2xl w-full max-w-md relative flex flex-col max-h-[80vh]">
                    <button onClick={() => setShowInventory(false)} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg"><i className="fa-solid fa-xmark"></i></button>
                    <h3 className="text-center font-black text-[#5d4037] uppercase tracking-widest text-lg mb-4">Kho Đồ Nội Thất</h3>
                    <div className="grid grid-cols-3 gap-3 overflow-y-auto custom-scrollbar p-1">
                        {user.furnitureInventory?.filter(i => (i.quantity || 0) > 0).map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => { handlePlaceItem(item); setShowInventory(false); }}
                                disabled={(item.quantity || 0) <= 0} // Disable if quantity is 0
                                className={`bg-slate-50 p-2 rounded-xl border-2 border-slate-100 flex flex-col items-center gap-1 transition-colors ${ (item.quantity || 0) <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#8d6e63]'}`}
                            >
                                <div className="w-12 h-12 flex items-center justify-center relative">
                                    {item.pixelImage ? <img src={item.pixelImage} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}} /> : <span className="text-2xl">{item.icon}</span>}
                                    {(item.quantity || 0) > 0 && (
                                        <span className="absolute bottom-0 right-0 bg-blue-500 text-white text-[8px] font-bold px-1 rounded-full leading-none">x{item.quantity}</span>
                                    )}
                                </div>
                                <span className="text-[8px] font-bold text-[#5d4037] uppercase truncate w-full text-center">{item.name}</span>
                            </button>
                        ))}
                        {(!user.furnitureInventory || user.furnitureInventory.filter(i => (i.quantity || 0) > 0).length === 0) && (
                            <div className="col-span-3 text-center py-12 text-slate-400 text-xs italic">
                                Kho đồ trống. Hãy mua đồ ở Shop nhé!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* UPLOAD WARNING POPUP */}
        {uploadWarningTarget && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border-4 border-rose-400 shadow-2xl w-full max-w-sm relative text-center">
                    <button onClick={() => setUploadWarningTarget(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-xmark"></i></button>
                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i className="fa-solid fa-image-portrait"></i>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-lg mb-2">Lưu Ý Quan Trọng</h3>
                    <p className="text-xs text-slate-600 mb-6 leading-relaxed font-medium">
                        Hệ thống <strong>KHÔNG</strong> tự động tách nền cho ảnh nhân vật/người dùng nữa để đảm bảo chất lượng tốt nhất.
                        <br/><br/>
                        Vui lòng sử dụng ảnh <strong>đã tách nền (PNG transparent)</strong> để hiển thị đẹp nhất trong Tổ Ấm.
                    </p>
                    <button 
                        onClick={() => {
                            if (uploadWarningTarget === 'char') charInputRef.current?.click();
                            else userInputRef.current?.click();
                            setUploadWarningTarget(null);
                        }}
                        className="w-full py-3 bg-rose-500 text-white rounded-xl font-black uppercase shadow-lg hover:bg-rose-600 active:scale-95 transition-all"
                    >
                        Đã Hiểu, Chọn Ảnh
                    </button>
                </div>
            </div>
        )}

        {/* ADD BOUNCE ANIMATION FOR PIXEL CHAR */}
        <style>{`
            @keyframes bounce-pixel {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
            }
            .animate-bounce-pixel {
                animation: bounce-pixel 0.4s infinite steps(2);
            }
            @keyframes shake {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                10% { transform: translate(-1px, -2px) rotate(-1deg); }
                20% { transform: translate(-3px, 0px) rotate(1deg); }
                30% { transform: translate(3px, 2px) rotate(0deg); }
                40% { transform: translate(1px, -1px) rotate(1deg); }
                50% { transform: translate(-1px, 2px) rotate(-1deg); }
                60% { transform: translate(-3px, 1px) rotate(0deg); }
                70% { transform: translate(3px, 1px) rotate(-1deg); }
                80% { transform: translate(-1px, -1px) rotate(1deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
                100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            .animate-shake {
                animation: shake 0.5s;
                animation-iteration-count: infinite; 
            }
        `}</style>
    </div>
  );
};

export default HomeRoomView;


