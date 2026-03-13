import React, { useState } from 'react';
import { FirebaseConfig } from '../types';
import { PRESET_SERVERS } from '../constants/servers';

interface MigrateTabProps {
    firebaseService: any;
    onSuccess: (serverKey: string, configInput: string, worldId: string, pinCode: string) => void;
}

export const MigrateTab: React.FC<MigrateTabProps> = ({ firebaseService, onSuccess }) => {
    const [migrateSourceServerKey, setMigrateSourceServerKey] = useState<string>('current_cache');
    const [migrateSourceConfigInput, setMigrateSourceConfigInput] = useState('');
    const [migrateSourceWorldId, setMigrateSourceWorldId] = useState('');
    const [migrateSourcePinCode, setMigrateSourcePinCode] = useState('');
    
    const [migrateDestServerKey, setMigrateDestServerKey] = useState<string>('');
    const [migrateDestConfigInput, setMigrateDestConfigInput] = useState('');
    const [migrateDestWorldId, setMigrateDestWorldId] = useState('');
    const [migrateDestPinCode, setMigrateDestPinCode] = useState('');

    const [migratePhase, setMigratePhase] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
    const [migrateProgress, setMigrateProgress] = useState('');
    const [migrateNumericProgress, setMigrateNumericProgress] = useState<{ current: number; total: number } | null>(null);
    const [migrateError, setMigrateError] = useState('');

    const parseFirebaseConfig = (input: string): FirebaseConfig | null => {
        try {
            const cleanInput = input.trim().replace(/^(const|let|var)\s+\w+\s*=\s*/, '').replace(/;$/, '');
            const objStr = cleanInput.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
            return JSON.parse(objStr) as FirebaseConfig;
        } catch (e) {
            return null;
        }
    };

    const handleMigrate = async () => {
        if (!migrateSourceWorldId.trim()) { setMigrateError("Vui lòng nhập Tên Tài Khoản NGUỒN."); return; }
        if (migrateSourceServerKey !== 'current_cache' && (!migrateSourcePinCode.trim() || migrateSourcePinCode.length !== 4)) { setMigrateError("Vui lòng nhập Mật Khẩu NGUỒN (4 số)."); return; }
        if (!migrateDestWorldId.trim()) { setMigrateError("Vui lòng nhập Tên Tài Khoản ĐÍCH."); return; }
        if (!migrateDestPinCode.trim() || migrateDestPinCode.length !== 4) { setMigrateError("Vui lòng nhập Mật Khẩu ĐÍCH (4 số)."); return; }
        
        // 1. Get Source Config
        let sourceConf: FirebaseConfig | null = null;
        let sourceName = "";
        if (migrateSourceServerKey !== 'current_cache') {
            if (migrateSourceServerKey === 'custom') {
                sourceConf = parseFirebaseConfig(migrateSourceConfigInput);
                sourceName = "Server Riêng (Nguồn)";
            } else {
                sourceConf = PRESET_SERVERS[migrateSourceServerKey].config;
                sourceName = PRESET_SERVERS[migrateSourceServerKey].name;
            }
            if (!sourceConf) { setMigrateError("Vui lòng chọn máy chủ nguồn hợp lệ."); return; }
        }

        // 2. Get Dest Config
        let destConf: FirebaseConfig | null = null;
        let destName = "";
        if (migrateDestServerKey === 'custom') {
            destConf = parseFirebaseConfig(migrateDestConfigInput);
            destName = "Server Riêng (Đích)";
        } else {
            destConf = PRESET_SERVERS[migrateDestServerKey].config;
            destName = PRESET_SERVERS[migrateDestServerKey].name;
        }
        if (!destConf) { setMigrateError("Vui lòng chọn máy chủ đích hợp lệ."); return; }

        // 3. Check if same
        if (migrateSourceServerKey !== 'current_cache' && JSON.stringify(sourceConf) === JSON.stringify(destConf) && migrateSourceWorldId === migrateDestWorldId) {
            setMigrateError("Không thể đồng bộ vào chính nó (Cùng Server & Cùng ID).");
            return;
        }

        setMigratePhase('migrating');
        setMigrateError('');
        setMigrateProgress('Bắt đầu quá trình đồng bộ...');
        setMigrateNumericProgress(null);

        try {
            if (migrateSourceServerKey === 'current_cache') {
                await firebaseService.migrateFromLocal(
                    destConf,
                    migrateSourceWorldId,
                    migrateDestWorldId,
                    migrateDestPinCode,
                    (msg: string, current?: number, total?: number) => {
                        setMigrateProgress(msg);
                        if (current !== undefined && total !== undefined) {
                            setMigrateNumericProgress({ current, total });
                        }
                    }
                );
            } else {
                await firebaseService.migrateWorld(
                    sourceConf!,
                    sourceName,
                    destConf,
                    migrateSourceWorldId,
                    migrateSourcePinCode,
                    migrateDestWorldId,
                    migrateDestPinCode,
                    (msg: string, current?: number, total?: number) => {
                        setMigrateProgress(msg);
                        if (current !== undefined && total !== undefined) {
                            setMigrateNumericProgress({ current, total });
                        }
                    }
                );
            }
            setMigratePhase('success');
            onSuccess(migrateDestServerKey, migrateDestConfigInput, migrateDestWorldId, migrateDestPinCode);
        } catch (e: any) {
            setMigratePhase('error');
            setMigrateError(e.message || "Lỗi đồng bộ không xác định.");
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 space-y-4 py-2">
            <div className="text-center mb-2">
                <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest bg-blue-50 inline-block px-3 py-1 rounded-full border border-blue-100">Đồng Bộ Dữ Liệu</h3>
            </div>
            <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200">
                <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                    <i className="fa-solid fa-circle-info mr-1 text-blue-500"></i>
                    Chuyển toàn bộ nhân vật và tin nhắn từ máy chủ cũ sang Server Riêng của bạn.
                </p>
            </div>

            {migratePhase === 'idle' || migratePhase === 'error' ? (
                <div className="space-y-4">
                    <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200">
                        <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                            <i className="fa-solid fa-circle-info mr-1 text-blue-500"></i>
                            Lưu ý: Dữ liệu ở máy chủ cũ sẽ được <span className="text-blue-600 font-black underline">GIỮ NGUYÊN</span>. Quá trình này chỉ sao chép toàn bộ cư dân sang máy chủ mới.
                        </p>
                    </div>

                    {/* Source Section */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 relative">
                        <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Nguồn Dữ Liệu</div>
                        <div className="space-y-3 mt-2">
                            <select 
                                value={migrateSourceServerKey} 
                                onChange={(e) => setMigrateSourceServerKey(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                            >
                                <option value="current_cache">Dữ liệu hiện tại (Trình duyệt)</option>
                                <option value="custom">Server Riêng (Nhập Code)</option>
                                {Object.entries(PRESET_SERVERS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.name}</option>
                                ))}
                            </select>

                            {migrateSourceServerKey === 'custom' && (
                                <textarea 
                                    value={migrateSourceConfigInput}
                                    onChange={(e) => setMigrateSourceConfigInput(e.target.value)}
                                    placeholder="Dán mã firebaseConfig của NGUỒN vào đây..."
                                    className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 text-xs rounded-xl p-3 font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all h-24 resize-none"
                                />
                            )}

                            <input 
                                type="text" 
                                value={migrateSourceWorldId}
                                onChange={(e) => setMigrateSourceWorldId(e.target.value)}
                                placeholder="Tên Tài Khoản NGUỒN" 
                                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                            {migrateSourceServerKey !== 'current_cache' && (
                                <input 
                                    type="password" 
                                    value={migrateSourcePinCode}
                                    onChange={(e) => setMigrateSourcePinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="Mật Khẩu NGUỒN (4 số)" 
                                    className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-center tracking-[0.5em]"
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="w-8 h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center border-4 border-[#F4F6FF] shadow-sm">
                            <i className="fa-solid fa-arrow-down"></i>
                        </div>
                    </div>

                    {/* Dest Section */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 relative shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]">
                        <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">2. Máy Chủ Đích</div>
                        <div className="space-y-3 mt-2">
                            <select 
                                value={migrateDestServerKey} 
                                onChange={(e) => setMigrateDestServerKey(e.target.value)}
                                className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                            >
                                <option value="" disabled>-- Chọn Máy Chủ Đích --</option>
                                <option value="custom">Server Riêng (Nhập Code)</option>
                                {Object.entries(PRESET_SERVERS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.name}</option>
                                ))}
                            </select>

                            {migrateDestServerKey === 'custom' && (
                                <textarea 
                                    value={migrateDestConfigInput}
                                    onChange={(e) => setMigrateDestConfigInput(e.target.value)}
                                    placeholder="Dán mã firebaseConfig của ĐÍCH vào đây..."
                                    className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 text-xs rounded-xl p-3 font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all h-24 resize-none"
                                />
                            )}

                            <input 
                                type="text" 
                                value={migrateDestWorldId}
                                onChange={(e) => setMigrateDestWorldId(e.target.value)}
                                placeholder="Tên Tài Khoản ĐÍCH (Mới)" 
                                className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                            <input 
                                type="password" 
                                value={migrateDestPinCode}
                                onChange={(e) => setMigrateDestPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="Mật Khẩu ĐÍCH (4 số)" 
                                className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-center tracking-[0.5em]"
                            />
                        </div>
                    </div>

                    {migrateError && (
                        <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[10px] font-bold border border-rose-200 flex items-start gap-2 animate-in slide-in-from-top-2">
                            <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                            <p>{migrateError}</p>
                        </div>
                    )}

                    <button onClick={handleMigrate} disabled={!migrateSourceWorldId.trim() || !migrateDestWorldId.trim() || migrateDestPinCode.length !== 4 || (migrateSourceServerKey === 'custom' && !migrateSourceConfigInput.trim()) || (migrateDestServerKey === 'custom' && !migrateDestConfigInput.trim())} className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2">
                        <i className="fa-solid fa-bolt"></i> Bắt Đầu Đồng Bộ
                    </button>
                </div>
            ) : migratePhase === 'migrating' ? (
                <div className="py-10 flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                            <i className="fa-solid fa-cloud-arrow-up text-xl animate-pulse"></i>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Đang đồng bộ dữ liệu</p>
                        <p className="text-[10px] text-slate-500 font-medium mb-3">{migrateProgress}</p>
                        
                        {migrateNumericProgress && (
                            <div className="w-48 mx-auto">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Tiến độ</span>
                                    <span className="text-[9px] font-bold text-blue-500">{migrateNumericProgress.current}/{migrateNumericProgress.total}</span>
                                </div>
                                <div className="h-1.5 bg-blue-50 rounded-full overflow-hidden border border-blue-100">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-300"
                                        style={{ width: `${(migrateNumericProgress.current / migrateNumericProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-[9px] text-rose-500 font-bold italic mt-4">Vui lòng không đóng cửa sổ này!</p>
                </div>
            ) : (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-3xl shadow-inner">
                        <i className="fa-solid fa-check"></i>
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Đồng bộ thành công!</p>
                        <p className="text-[10px] text-slate-500 font-medium">Toàn bộ dữ liệu đã được chuyển sang Server Riêng.</p>
                    </div>
                    <button onClick={() => { setMigratePhase('idle'); onSuccess(migrateDestServerKey, migrateDestConfigInput, migrateDestWorldId, migrateDestPinCode); }} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors mt-4">
                        Quay lại Đăng Nhập
                    </button>
                </div>
            )}
        </div>
    );
};
