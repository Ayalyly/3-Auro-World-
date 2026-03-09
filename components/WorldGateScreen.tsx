import React, { useState, useRef, useEffect } from 'react';
import { FirebaseConfig } from '../types';
import ServerSelectorModal from './ServerSelectorModal';

interface WorldGateScreenProps { 
    onJoin: (id: string, mode: 'offline') => void; 
    onPreloadOnlineWorld: (id: string, config: FirebaseConfig, serverName: string, pin: string, bypassPin?: boolean) => Promise<{success: boolean, count: number, exists?: boolean, error?: string}>;
    onEnterOnlineWorld: () => void;
    onImport: (file: File) => void;
    isLoading: boolean; 
    status: string;
    t: (key: string) => string;
    currentLang: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
    firebaseService: any;
}

const PRESET_SERVERS: Record<string, {name: string, config: FirebaseConfig}> = {
    "server1": {
        name: "Auro AI 1",
        config: {
            apiKey: "AIzaSyBJw02FDNmnlDBoPjh7CljX3E8KMzhXL44",
            authDomain: "auro-ai-1-c3710.firebaseapp.com",
            projectId: "auro-ai-1-c3710",
            storageBucket: "auro-ai-1-c3710.firebasestorage.app",
            messagingSenderId: "515585589603",
            appId: "1:515585589603:web:c94581ab6908feed5c5356"
        }
    },
    "server2": {
        name: "Auro AI 2",
        config: {
            apiKey: "AIzaSyD2lO56x11tsGS-acOSRe94eiGerjDH8hY",
            authDomain: "auro-thu.firebaseapp.com",
            projectId: "auro-thu",
            storageBucket: "auro-thu.firebasestorage.app",
            messagingSenderId: "864522597969",
            appId: "1:864522597969:web:76710d8711dbfd1a1d2a70"
        }
    },
    "server3": {
        name: "Auro AI 3",
        config: {
            apiKey: "AIzaSyA_hWmYdBhQhHSm4YwV5LiCET0gFUVgwvs",
            authDomain: "aurokho-moi.firebaseapp.com",
            projectId: "aurokho-moi",
            storageBucket: "aurokho-moi.firebasestorage.app",
            messagingSenderId: "598836069316",
            appId: "1:598836069316:web:6aa350d0a9c0183b625a91"
        }
    },
    "server4": {
        name: "Auro AI 4",
        config: {
            apiKey: "AIzaSyCE-xyy9oaEJBZjxr-kJispt9pdXMZ26iU",
            authDomain: "auro5-43d51.firebaseapp.com",
            projectId: "auro5-43d51",
            storageBucket: "auro5-43d51.firebasestorage.app",
            messagingSenderId: "982047260647",
            appId: "1:982047260647:web:67cd30cd58f0ff1bb30742"
        }
    },
    "server5": {
        name: "Auro AI 5",
        config: {
            apiKey: "AIzaSyDoQuI_Lsu1swcdbHuzPUu5NYlvkWbxz9M",
            authDomain: "auro-vicgo.firebaseapp.com",
            projectId: "auro-vicgo",
            storageBucket: "auro-vicgo.firebasestorage.app",
            messagingSenderId: "676346190015",
            appId: "1:676346190015:web:b529c9eb6d219a89c7ce0a"
        }
    }
};

const WorldGateScreen: React.FC<WorldGateScreenProps> = ({ 
    onJoin, onPreloadOnlineWorld, onEnterOnlineWorld, onImport, isLoading, status, t, currentLang, setLanguage, firebaseService 
}) => {
    const [activeTab, setActiveTab] = useState<'offline' | 'online' | 'backup' | 'migrate'>('online');
    const [offlineId, setOfflineId] = useState('');
    const [selectedServerKey, setSelectedServerKey] = useState<string>('');
    const [showServerModal, setShowServerModal] = useState(false);
    const [onlineWorldId, setOnlineWorldId] = useState('');
    const [pinCode, setPinCode] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [configInput, setConfigInput] = useState('');
    const [checkPhase, setCheckPhase] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle');
    const [foundCount, setFoundCount] = useState(0);
    const [worldExists, setWorldExists] = useState(false); 
    const [onlineError, setOnlineError] = useState('');
    const [onlineWarning, setOnlineWarning] = useState('');
    const [showForceEnter, setShowForceEnter] = useState(false);
    
    // Recovery States
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [recoveryChars, setRecoveryChars] = useState<any[]>([]);
    const [recoveryPhase, setRecoveryPhase] = useState<'idle' | 'loading' | 'ready' | 'error' | 'success'>('idle');
    const [recoveryError, setRecoveryError] = useState('');
    const [recoveredPin, setRecoveredPin] = useState('');

    // Migrate States
    const [migrateSourceServerKey, setMigrateSourceServerKey] = useState<string>('current_cache');
    const [migrateSourceConfigInput, setMigrateSourceConfigInput] = useState('');
    const [migrateDestServerKey, setMigrateDestServerKey] = useState<string>('custom');
    const [migrateDestConfigInput, setMigrateDestConfigInput] = useState('');
    const [showSourceServerModal, setShowSourceServerModal] = useState(false);
    const [showDestServerModal, setShowDestServerModal] = useState(false);
    const [migrateSourceWorldId, setMigrateSourceWorldId] = useState('');
    const [migrateSourcePinCode, setMigrateSourcePinCode] = useState('');
    const [migrateDestWorldId, setMigrateDestWorldId] = useState('');
    const [migrateDestPinCode, setMigrateDestPinCode] = useState('');
    const [migratePhase, setMigratePhase] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
    const [migrateProgress, setMigrateProgress] = useState('');
    const [migrateError, setMigrateError] = useState('');
    const [showMigrateTips, setShowMigrateTips] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [lastSession, setLastSession] = useState<any>(null);

    useEffect(() => {
        let localId = localStorage.getItem('aura_local_device_id');
        if (!localId) {
            localId = 'local-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('aura_local_device_id', localId);
        }
        setOfflineId(localId);

        const saved = localStorage.getItem('auro_last_session');
        if (saved) {
            try {
                setLastSession(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    const parseFirebaseConfig = (input: string): FirebaseConfig | null => {
        const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const config: any = {};
        let foundAny = false;
        keys.forEach(key => {
            const regex = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
            const match = input.match(regex);
            if (match) {
                config[key] = match[1];
                foundAny = true;
            }
        });
        if (foundAny && config.apiKey && config.projectId) return config as FirebaseConfig;
        return null;
    };

    const getConfig = (): { conf: FirebaseConfig, name: string } | null => {
        if (selectedServerKey === 'custom') {
            const parsed = parseFirebaseConfig(configInput);
            if (!parsed) return null;
            return { conf: parsed, name: 'Server Riêng (Khuyên dùng)' };
        }
        return { conf: PRESET_SERVERS[selectedServerKey].config, name: PRESET_SERVERS[selectedServerKey].name };
    };

    const handleIdChange = (val: string) => {
        setOnlineWorldId(val);
        setCheckPhase('idle');
        setOnlineError('');
        setOnlineWarning('');
        setWorldExists(false);
    };

    const handleCheckAndLoad = async () => {
        const data = getConfig();
        if (!data) { setOnlineError("Vui lòng dán đoạn mã firebaseConfig hợp lệ."); return; }
        if (!onlineWorldId.trim()) { setOnlineError("Vui lòng nhập Tên Tài Khoản."); return; }
        if (!pinCode.trim() || pinCode.length !== 4 || isNaN(Number(pinCode))) { setOnlineError("Vui lòng nhập Mật Khẩu 4 số."); return; }
        
        setCheckPhase('checking');
        setOnlineError('');
        setOnlineWarning('');
        setShowForceEnter(false);

        const forceEnterTimer = setTimeout(() => {
            setShowForceEnter(true);
        }, 4000); // Show after 4s

        try {
            const result = await onPreloadOnlineWorld(onlineWorldId, data.conf, data.name, pinCode);
            clearTimeout(forceEnterTimer);
            if (result.success) { 
                setFoundCount(result.count);
                setWorldExists(result.exists || false);
                setCheckPhase('ready'); 
                if (result.error === 'QUOTA_EXCEEDED_CACHE_MISS') {
                    setOnlineWarning('Máy chủ đang quá tải. Bạn đang truy cập bằng dữ liệu ngoại tuyến (nếu có).');
                }
            } else { 
                setCheckPhase('error'); 
                setOnlineError(result.error || "Lỗi tải dữ liệu."); 
            }
        } catch (e: any) { 
            clearTimeout(forceEnterTimer);
            setCheckPhase('error'); 
            setOnlineError("Lỗi không xác định: " + e.message); 
        }
    };

    const handleForgotPin = async () => {
        const data = getConfig();
        if (!data) { setOnlineError("Vui lòng dán đoạn mã firebaseConfig hợp lệ."); return; }
        if (!onlineWorldId.trim()) { setOnlineError("Vui lòng nhập Tên Tài Khoản trước khi khôi phục."); return; }

        setRecoveryPhase('loading');
        setShowRecoveryModal(true);
        setRecoveryError('');

        try {
            await firebaseService.initialize(data.conf, data.name);
            const chars = await firebaseService.getRecoveryCharacters(onlineWorldId);
            setRecoveryChars(chars);
            setRecoveryPhase('ready');
        } catch (e: any) {
            setRecoveryPhase('error');
            setRecoveryError(e.message || "Lỗi khi tải dữ liệu khôi phục.");
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

        try {
            if (migrateSourceServerKey === 'current_cache') {
                await firebaseService.migrateFromLocal(
                    destConf,
                    migrateSourceWorldId,
                    migrateDestWorldId,
                    migrateDestPinCode,
                    (msg: string) => setMigrateProgress(msg)
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
                    (msg: string) => setMigrateProgress(msg)
                );
            }
            setMigratePhase('success');
            // Sau khi thành công, tự động điền thông tin vào tab Online
            setSelectedServerKey(migrateDestServerKey);
            if (migrateDestServerKey === 'custom') {
                setConfigInput(migrateDestConfigInput);
            }
            setOnlineWorldId(migrateDestWorldId);
            setPinCode(migrateDestPinCode);
        } catch (e: any) {
            setMigratePhase('error');
            setMigrateError(e.message || "Lỗi đồng bộ không xác định.");
        }
    };

    const handleSelectRecoveryChar = async (char: any) => {
        if (char.isCorrect) {
            setRecoveryPhase('loading');
            try {
                const pin = await firebaseService.getWorldPin(onlineWorldId);
                setRecoveredPin(pin || '0000');
                setRecoveryPhase('success');
            } catch (e: any) {
                setRecoveryPhase('error');
                setRecoveryError("Lỗi khi lấy mật khẩu.");
            }
        } else {
            setRecoveryPhase('error');
            setRecoveryError("Sai rồi! Đây không phải là cư dân của thế giới này.");
        }
    };

    const handleJoinOffline = () => { onJoin(offlineId, 'offline'); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) { onImport(e.target.files[0]); e.target.value = ''; } };

    return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-start pt-12 md:pt-20 p-6 pb-20 bg-[#F4F6FF] relative overflow-y-auto custom-scrollbar">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>
            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <img src="https://i.ibb.co/HpkTpSrn/media-1769408050.png" alt="Auro World Banner" className="w-full max-w-[320px] mx-auto h-auto object-contain drop-shadow-xl mb-4 rounded-xl" />
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-1 uppercase">{t('gate.title') || "Auro World"}</h1>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-[1px] w-8 bg-indigo-300/50"></div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">{t('gate.subtitle') || "Celestial Gate"}</p>
                        <div className="h-[1px] w-8 bg-indigo-300/50"></div>
                    </div>
                </div>

                {/* Removed auto-resume button as requested */}
                <div className="glass-panel p-1 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-white/60 bg-white/40 backdrop-blur-xl relative overflow-hidden">
                    <div className="flex bg-white/60 p-1.5 rounded-[2rem] m-4 mb-2 shadow-inner border border-white/50">
                        <button onClick={() => setActiveTab('online')} className={`flex-1 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${activeTab === 'online' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/30'}`}>
                            <i className="fa-solid fa-cloud"></i> {t('gate.tab.online')}
                        </button>
                        <button onClick={() => setActiveTab('offline')} className={`flex-1 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${activeTab === 'offline' ? 'bg-white shadow-md text-rose-500 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/30'}`}>
                            <i className="fa-solid fa-hard-drive"></i> {t('gate.tab.offline')}
                        </button>
                        <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${activeTab === 'backup' ? 'bg-white shadow-md text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/30'}`}>
                            <i className="fa-solid fa-suitcase-rolling"></i> {t('gate.tab.backup')}
                        </button>
                        <button onClick={() => setActiveTab('migrate')} className={`flex-1 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${activeTab === 'migrate' ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/30'}`}>
                            <i className="fa-solid fa-right-left"></i> Chuyển
                        </button>
                    </div>
                    <div className="p-6 pt-2">
                        {activeTab === 'online' && (
                            <div className="animate-in fade-in slide-in-from-right-4 space-y-5">
                                <div className="text-center mb-2">
                                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 inline-block px-3 py-1 rounded-full border border-indigo-100">{t('gate.online.title')}</h3>
                                </div>
                                
                                <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 animate-in slide-in-from-top-2 duration-500">
                                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                                        <i className="fa-solid fa-circle-info mr-1 text-amber-500"></i>
                                        Lưu ý: Hãy tự đặt <span className="text-amber-600 font-black">Tên Tài Khoản</span> và <span className="text-amber-600 font-black">Mật Khẩu (4 số)</span> bất kỳ để tạo thế giới mới. Hãy ghi nhớ chúng để đăng nhập lại lần sau!
                                    </p>
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group" onClick={() => setShowServerModal(true)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                {!selectedServerKey ? '📡' : (selectedServerKey === 'custom' ? '🛡️' : '☁️')}
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Chọn máy chủ</p>
                                                <p className="text-xs font-black text-slate-800 uppercase">
                                                    {!selectedServerKey ? 'VUI LÒNG CHỌN MÁY CHỦ' : (selectedServerKey === 'custom' ? 'Server Riêng' : PRESET_SERVERS[selectedServerKey]?.name || 'Unknown')}
                                                </p>
                                            </div>
                                        </div>
                                        <i className="fa-solid fa-chevron-down text-slate-300 group-hover:text-indigo-400"></i>
                                    </div>
                                </div>
                                <ServerSelectorModal
                                    isOpen={showServerModal}
                                    onClose={() => setShowServerModal(false)}
                                    servers={Object.entries(PRESET_SERVERS).map(([key, val]) => ({
                                        key, name: val.name, emoji: '🌟', config: val.config,
                                    }))}
                                    selectedServerKey={selectedServerKey}
                                    onSelectServer={(key) => {
                                        setSelectedServerKey(key);
                                        setCheckPhase('idle');
                                        setOnlineError('');
                                    }}
                                    firebaseService={firebaseService}
                                />
                                {selectedServerKey === 'custom' && (
                                    <div className="space-y-3 animate-in slide-in-from-bottom-2">
                                        <textarea 
                                            className="w-full h-24 bg-[#1e1e2e] text-emerald-400 font-mono text-[9px] p-3 rounded-xl border border-slate-300 focus:border-indigo-500 outline-none resize-none custom-scrollbar leading-relaxed shadow-inner placeholder:text-slate-600"
                                            placeholder={`Paste firebaseConfig object here...`}
                                            value={configInput}
                                            onChange={e => setConfigInput(e.target.value)}
                                            spellCheck={false}
                                        />
                                        <div className="bg-white p-2 rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                                                <i className="fa-brands fa-youtube text-rose-500"></i> Hướng dẫn tạo Server Riêng
                                            </p>
                                            <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                                                <iframe 
                                                    width="100%" 
                                                    height="100%" 
                                                    src="https://www.youtube.com/embed/hZ58jlO6HHY" 
                                                    title="YouTube video player" 
                                                    frameBorder="0" 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                                    referrerPolicy="strict-origin-when-cross-origin" 
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
                                        <div className="relative bg-white rounded-2xl flex items-center p-1 border border-slate-200">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                                <i className="fa-solid fa-user text-xl"></i>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={onlineWorldId} 
                                                onChange={(e) => handleIdChange(e.target.value)} 
                                                placeholder="TÊN TÀI KHOẢN (TỰ ĐẶT)" 
                                                disabled={checkPhase === 'checking'} 
                                                className="w-full h-full px-3 outline-none text-sm font-black text-slate-700 bg-transparent placeholder:text-slate-300 placeholder:font-normal uppercase tracking-widest disabled:opacity-50" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
                                            <div className="relative bg-white rounded-2xl flex items-center p-1 border border-slate-200">
                                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                                    <i className="fa-solid fa-key text-xl"></i>
                                                </div>
                                                <input 
                                                    type={showPin ? "text" : "password"} 
                                                    value={pinCode} 
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                                        setPinCode(val);
                                                        setCheckPhase('idle');
                                                    }} 
                                                    placeholder="MẬT KHẨU (4 SỐ)" 
                                                    disabled={checkPhase === 'checking'} 
                                                    className="w-full h-full px-3 outline-none text-sm font-black text-slate-700 bg-transparent placeholder:text-slate-300 placeholder:font-normal uppercase tracking-widest disabled:opacity-50" 
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPin(!showPin)}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <i className={`fa-solid ${showPin ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                </button>
                                                <div className="pr-3">
                                                    {checkPhase === 'checking' && <i className="fa-solid fa-circle-notch fa-spin text-indigo-400"></i>}
                                                    {checkPhase === 'ready' && <i className="fa-solid fa-check-circle text-emerald-500 text-lg animate-pop"></i>}
                                                    {checkPhase === 'error' && <i className="fa-solid fa-circle-exclamation text-rose-500 text-lg animate-pulse"></i>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <button 
                                                onClick={handleForgotPin}
                                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                                            >
                                                Quên mật khẩu?
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                 {checkPhase !== 'ready' ? (
                                    <>
                                        {onlineError && (
                                            <div className="text-[10px] text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 flex gap-2 items-start animate-in fade-in">
                                                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                                <span>{onlineError}</span>
                                            </div>
                                        )}
                                        {showForceEnter && checkPhase === 'checking' && (
                                            <div className="animate-in fade-in zoom-in duration-300 space-y-2">
                                                <button 
                                                    onClick={() => {
                                                        setCheckPhase('ready');
                                                        setWorldExists(true);
                                                        setFoundCount(1);
                                                        setOnlineWarning("Kết nối chậm. Đang vào bằng chế độ ngoại tuyến...");
                                                    }}
                                                    className="w-full py-3 bg-amber-100 text-amber-700 border border-amber-200 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-200 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <i className="fa-solid fa-bolt"></i> VÀO NGAY (OFFLINE)
                                                </button>
                                                <p className="text-[9px] text-slate-400 italic text-center">Máy chủ phản hồi chậm, bạn có thể vào bằng dữ liệu trên máy.</p>
                                            </div>
                                        )}
                                        <button onClick={handleCheckAndLoad} disabled={checkPhase === 'checking' || !onlineWorldId.trim() || pinCode.length !== 4 || !selectedServerKey} className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2">
                                            {checkPhase === 'checking' ? (<><i className="fa-solid fa-circle-notch fa-spin"></i><span>{status || "ĐANG KIỂM TRA..."}</span></>) : (<><i className="fa-solid fa-magnifying-glass"></i> {t('gate.btn.check_id')}</>)}
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-3 animate-in zoom-in">
                                        {onlineWarning && (
                                            <div className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2 items-start animate-in fade-in">
                                                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                                <span>{onlineWarning}</span>
                                            </div>
                                        )}
                                        {(foundCount > 0 || worldExists) ? (
                                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl shadow-sm relative overflow-hidden">
                                                <div className="absolute right-0 top-0 text-6xl opacity-10 text-amber-500 -mr-4 -mt-2"><i className="fa-solid fa-users"></i></div>
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-black text-amber-700 uppercase mb-1 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> CẢNH BÁO</p>
                                                    <p className="text-[11px] text-amber-900 font-bold">Thế giới này đã tồn tại.</p>
                                                    <p className="text-[10px] text-amber-800">Đã có {foundCount} cư dân.</p>
                                                    <p className="text-[9px] text-amber-700/80 mt-1 italic">"Nếu đây không phải tài khoản của bạn, hãy quay lại chọn tên khác."</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl shadow-sm relative overflow-hidden">
                                                <div className="absolute right-0 top-0 text-6xl opacity-10 text-emerald-500 -mr-4 -mt-2"><i className="fa-solid fa-leaf"></i></div>
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-black text-emerald-700 uppercase mb-1 flex items-center gap-2"><i className="fa-solid fa-sparkles"></i> THẾ GIỚI MỚI</p>
                                                    <p className="text-[11px] text-emerald-900 font-bold">Tài khoản chưa tồn tại. Bạn là người kiến tạo đầu tiên.</p>
                                                </div>
                                            </div>
                                        )}
                                        <button onClick={onEnterOnlineWorld} className={`w-full py-4 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 ${foundCount > 0 || worldExists ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-200' : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-200'}`}>
                                            {(foundCount > 0 || worldExists) ? (<><i className="fa-solid fa-right-to-bracket"></i> {t('gate.btn.access')}</>) : (<><i className="fa-solid fa-rocket"></i> {t('gate.btn.connect')}</>)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'offline' && (
                            <div className="animate-in fade-in slide-in-from-right-4 text-center space-y-6 py-4">
                                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500 border-2 border-rose-100 shadow-sm">
                                        <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
                                    </div>
                                    <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest">{t('gate.offline.title')}</h3>
                                    <p className="text-[10px] text-rose-600/80 mt-2 leading-relaxed px-2 font-medium">{t('gate.offline.desc')}</p>
                                </div>
                                <button onClick={handleJoinOffline} disabled={isLoading} className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-xl text-slate-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-play"></i> {t('gate.btn.start')}</>}
                                </button>
                            </div>
                        )}
                        {activeTab === 'backup' && (
                            <div className="animate-in fade-in slide-in-from-right-4 py-4">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500 border border-emerald-100">
                                        <i className="fa-solid fa-suitcase-medical text-3xl"></i>
                                    </div>
                                    <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest">{t('gate.backup.title')}</h3>
                                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed px-4">{t('gate.backup.desc')}</p>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-3xl flex flex-col items-center justify-center gap-2 text-emerald-600 hover:bg-emerald-50 transition-colors active:scale-95 group cursor-pointer">
                                    <i className="fa-solid fa-file-arrow-up text-3xl group-hover:scale-110 transition-transform"></i>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('gate.btn.select_file')}</span>
                                </button>
                            </div>
                        )}
                        {activeTab === 'migrate' && (
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

                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">1. Chọn máy chủ NGUỒN (Cũ)</p>
                                            <div className="bg-white p-3 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all group" onClick={() => setShowSourceServerModal(true)}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                            {migrateSourceServerKey === 'current_cache' ? '💾' : (migrateSourceServerKey === 'custom' ? '🛡️' : '☁️')}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 uppercase">
                                                                {migrateSourceServerKey === 'current_cache' ? 'Dữ liệu hiện tại (Trình duyệt)' : (migrateSourceServerKey === 'custom' ? 'Server Riêng' : PRESET_SERVERS[migrateSourceServerKey]?.name || 'Unknown')}
                                                            </p>
                                                            {migrateSourceServerKey === 'current_cache' && (
                                                                <p className="text-[9px] text-emerald-600 font-bold italic">Lấy dữ liệu đang lưu tạm trong máy bạn</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <i className="fa-solid fa-chevron-down text-slate-300 group-hover:text-blue-400"></i>
                                                </div>
                                            </div>
                                            {migrateSourceServerKey === 'custom' && (
                                                <textarea 
                                                    className="w-full h-20 bg-[#1e1e2e] text-emerald-400 font-mono text-[9px] p-3 rounded-xl border border-slate-300 focus:border-blue-500 outline-none resize-none custom-scrollbar leading-relaxed shadow-inner placeholder:text-slate-600"
                                                    placeholder={`Dán firebaseConfig của máy chủ NGUỒN vào đây...`}
                                                    value={migrateSourceConfigInput}
                                                    onChange={e => setMigrateSourceConfigInput(e.target.value)}
                                                    spellCheck={false}
                                                />
                                            )}
                                        </div>

                                        <div className="flex justify-center py-1">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 shadow-sm border border-blue-200">
                                                <i className="fa-solid fa-arrow-down"></i>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">2. Chọn máy chủ ĐÍCH (Mới)</p>
                                            <div className="bg-white p-3 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all group" onClick={() => setShowDestServerModal(true)}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                            {migrateDestServerKey === 'custom' ? '🛡️' : '☁️'}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 uppercase">
                                                                {migrateDestServerKey === 'custom' ? 'Server Riêng' : PRESET_SERVERS[migrateDestServerKey]?.name || 'Unknown'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <i className="fa-solid fa-chevron-down text-slate-300 group-hover:text-blue-400"></i>
                                                </div>
                                            </div>
                                            {migrateDestServerKey === 'custom' && (
                                                <textarea 
                                                    className="w-full h-20 bg-[#1e1e2e] text-emerald-400 font-mono text-[9px] p-3 rounded-xl border border-slate-300 focus:border-blue-500 outline-none resize-none custom-scrollbar leading-relaxed shadow-inner placeholder:text-slate-600"
                                                    placeholder={`Dán firebaseConfig của máy chủ ĐÍCH vào đây...`}
                                                    value={migrateDestConfigInput}
                                                    onChange={e => setMigrateDestConfigInput(e.target.value)}
                                                    spellCheck={false}
                                                />
                                            )}
                                        </div>

                                        <ServerSelectorModal
                                            isOpen={showSourceServerModal}
                                            onClose={() => setShowSourceServerModal(false)}
                                            servers={[
                                                { key: 'current_cache', name: 'Dữ liệu hiện tại (Trình duyệt)', emoji: '💾', config: {} as any },
                                                ...Object.entries(PRESET_SERVERS).map(([key, val]) => ({
                                                    key, name: val.name, emoji: '☁️', config: val.config,
                                                }))
                                            ]}
                                            selectedServerKey={migrateSourceServerKey}
                                            onSelectServer={(key) => {
                                                setMigrateSourceServerKey(key);
                                                setShowSourceServerModal(false);
                                            }}
                                            firebaseService={firebaseService}
                                        />

                                        <ServerSelectorModal
                                            isOpen={showDestServerModal}
                                            onClose={() => setShowDestServerModal(false)}
                                            servers={Object.entries(PRESET_SERVERS).map(([key, val]) => ({
                                                key, name: val.name, emoji: '☁️', config: val.config,
                                            }))}
                                            selectedServerKey={migrateDestServerKey}
                                            onSelectServer={(key) => {
                                                setMigrateDestServerKey(key);
                                                setShowDestServerModal(false);
                                            }}
                                            firebaseService={firebaseService}
                                        />

                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[8px] text-slate-500">1</span>
                                                    Tài khoản Nguồn (Cũ)
                                                </p>
                                                <div className="space-y-2">
                                                    <div className="relative group">
                                                        <div className="relative bg-white rounded-xl flex items-center p-1 border border-slate-200">
                                                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                                <i className="fa-solid fa-user text-sm"></i>
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={migrateSourceWorldId} 
                                                                onChange={(e) => setMigrateSourceWorldId(e.target.value)} 
                                                                placeholder="Tên tài khoản cũ" 
                                                                className="w-full h-full px-3 outline-none text-[11px] font-black text-slate-700 bg-transparent placeholder:text-slate-300 placeholder:font-normal uppercase tracking-widest" 
                                                            />
                                                        </div>
                                                    </div>
                                                    {migrateSourceServerKey !== 'current_cache' && (
                                                        <div className="relative group">
                                                            <div className="relative bg-white rounded-xl flex items-center p-1 border border-slate-200">
                                                                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                                    <i className="fa-solid fa-lock text-sm"></i>
                                                                </div>
                                                                <input 
                                                                    type={showPin ? "text" : "password"} 
                                                                    value={migrateSourcePinCode} 
                                                                    onChange={(e) => setMigrateSourcePinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                                                                    placeholder="Mật khẩu cũ (4 số)" 
                                                                    className="w-full h-full px-3 outline-none text-[11px] font-black text-slate-700 bg-transparent placeholder:text-slate-300 placeholder:font-normal tracking-[0.3em]" 
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-center -my-2 relative z-10">
                                                <div className="w-8 h-8 bg-white rounded-full border border-slate-200 flex items-center justify-center text-indigo-500 shadow-sm">
                                                    <i className="fa-solid fa-arrow-down"></i>
                                                </div>
                                            </div>

                                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[8px] text-indigo-500">2</span>
                                                    Tài khoản Đích (Mới)
                                                </p>
                                                <div className="space-y-2">
                                                    <div className="relative group">
                                                        <div className="relative bg-white rounded-xl flex items-center p-1 border border-slate-200">
                                                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                                <i className="fa-solid fa-user-plus text-sm"></i>
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={migrateDestWorldId} 
                                                                onChange={(e) => setMigrateDestWorldId(e.target.value)} 
                                                                placeholder="Tên tài khoản mới" 
                                                                className="w-full h-full px-3 outline-none text-[11px] font-black text-slate-700 bg-transparent placeholder:text-slate-300 placeholder:font-normal uppercase tracking-widest" 
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="relative bg-white rounded-xl flex items-center p-1 border border-slate-200">
                                                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                                <i className="fa-solid fa-key text-sm"></i>
                                                            </div>
                                                            <input 
                                                                type={showPin ? "text" : "password"} 
                                                                value={migrateDestPinCode} 
                                                                onChange={(e) => setMigrateDestPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                                                                placeholder="Mật khẩu mới (4 số)" 
                                                                className="w-full h-full px-3 outline-none text-[11px] font-black text-slate-700 bg-transparent placeholder:text-slate-300 placeholder:font-normal tracking-[0.3em]" 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {migrateError && (
                                            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[10px] font-medium border border-rose-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                                                <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                                                <span>{migrateError}</span>
                                            </div>
                                        )}

                                        <button onClick={handleMigrate} disabled={!migrateSourceWorldId.trim() || !migrateDestWorldId.trim() || migrateDestPinCode.length !== 4 || (migrateSourceServerKey === 'custom' && !migrateSourceConfigInput.trim()) || (migrateDestServerKey === 'custom' && !migrateDestConfigInput.trim())} className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2">
                                            <i className="fa-solid fa-cloud-arrow-up"></i> Bắt đầu đồng bộ
                                        </button>

                                        <div className="mt-6 border-t border-slate-200 pt-4">
                                            <button 
                                                onClick={() => setShowMigrateTips(!showMigrateTips)}
                                                className="w-full flex items-center justify-between group"
                                            >
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">💡 Mẹo & Trường hợp sử dụng</p>
                                                <i className={`fa-solid fa-chevron-${showMigrateTips ? 'up' : 'down'} text-[10px] text-slate-300 group-hover:text-indigo-400 transition-all`}></i>
                                            </button>
                                            
                                            {showMigrateTips && (
                                                <div className="grid grid-cols-1 gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="bg-white/50 p-3 rounded-xl border border-slate-200">
                                                        <p className="text-[10px] font-bold text-slate-700 mb-1">🚀 Giải cứu khi Server kẹt (Quota Exceeded)</p>
                                                        <p className="text-[9px] text-slate-500 leading-relaxed">Nếu máy chủ cũ bị báo "Quá tải", hãy chọn nguồn là máy chủ đó. Hệ thống sẽ tự động dùng dữ liệu đã lưu trong trình duyệt của bạn để chuyển sang máy chủ mới mà không cần chờ máy chủ cũ hồi phục.</p>
                                                    </div>
                                                    <div className="bg-white/50 p-3 rounded-xl border border-slate-200">
                                                        <p className="text-[10px] font-bold text-slate-700 mb-1">💾 Đồng bộ dữ liệu Offline lên Online</p>
                                                        <p className="text-[9px] text-slate-500 leading-relaxed">Chọn nguồn là "Dữ liệu hiện tại" để đẩy toàn bộ tiến trình bạn vừa chơi (đang lưu tạm trong máy) lên một máy chủ mới để lưu trữ vĩnh viễn.</p>
                                                    </div>
                                                    <div className="bg-white/50 p-3 rounded-xl border border-slate-200">
                                                        <p className="text-[10px] font-bold text-slate-700 mb-1">💾 Khi nào dùng "Dữ liệu trình duyệt"?</p>
                                                        <p className="text-[9px] text-slate-500 leading-relaxed">Dùng khi bạn đang chơi ở tab Online nhưng máy chủ bị kẹt. Chọn nguồn này để app lấy mớ dữ liệu "đang chơi dở" trong máy bạn và đẩy sang nhà mới.</p>
                                                    </div>
                                                    <div className="bg-white/50 p-3 rounded-xl border border-slate-200">
                                                        <p className="text-[10px] font-bold text-slate-700 mb-1">🛡️ Di cư sang Server Riêng</p>
                                                        <p className="text-[9px] text-slate-500 leading-relaxed">Dùng khi bạn muốn bảo mật tuyệt đối hoặc không muốn phụ thuộc vào máy chủ công cộng. Dữ liệu sẽ được sao chép y hệt sang Firebase cá nhân của bạn.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                                            <p className="text-[10px] text-slate-500 font-medium">{migrateProgress}</p>
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
                                        <button onClick={() => { setMigratePhase('idle'); setActiveTab('online'); }} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors mt-4">
                                            Quay lại Đăng Nhập
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-center mt-8 opacity-40">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Celestial System v2.0</p>
                </div>
            </div>
            {/* Recovery Modal */}
            {showRecoveryModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-3xl border-4 border-indigo-500 shadow-2xl w-full max-w-sm relative flex flex-col items-center">
                        <button onClick={() => setShowRecoveryModal(false)} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        <h3 className="text-center font-black text-indigo-600 uppercase tracking-widest text-lg mb-2">Khôi Phục Mật Khẩu</h3>
                        
                        {recoveryPhase === 'loading' && (
                            <div className="py-10 flex flex-col items-center">
                                <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-400 mb-4"></i>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đang tìm kiếm cư dân...</p>
                            </div>
                        )}

                        {recoveryPhase === 'error' && (
                            <div className="py-6 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-4">
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-700 mb-2">Không thể khôi phục</p>
                                <p className="text-xs text-slate-500">{recoveryError}</p>
                            </div>
                        )}

                        {recoveryPhase === 'ready' && (
                            <div className="w-full flex flex-col items-center">
                                <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
                                    Để xác minh bạn là chủ nhân của thế giới này, hãy chọn đúng <strong className="text-indigo-500">cư dân</strong> đang sinh sống tại đây:
                                </p>
                                <div className="grid grid-cols-3 gap-3 w-full mb-4">
                                    {recoveryChars.map((char, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSelectRecoveryChar(char)}
                                            className="flex flex-col items-center p-2 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group active:scale-95"
                                        >
                                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm overflow-hidden mb-2 border border-slate-100 group-hover:shadow-md transition-shadow">
                                                <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-600 text-center line-clamp-1 w-full">{char.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {recoveryPhase === 'success' && (
                            <div className="w-full flex flex-col items-center text-center animate-in zoom-in">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner border border-emerald-200">
                                    <i className="fa-solid fa-unlock-keyhole"></i>
                                </div>
                                <p className="text-sm font-black text-slate-800 mb-1 uppercase tracking-widest">Chính xác!</p>
                                <p className="text-[10px] text-slate-500 mb-6">Chào mừng chủ nhân quay trở lại.</p>
                                
                                <div className="bg-indigo-50 px-8 py-4 rounded-2xl border-2 border-indigo-100 mb-6 w-full relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Mật khẩu của bạn là</p>
                                    <span className="text-3xl font-black text-indigo-600 tracking-[0.2em]">{recoveredPin}</span>
                                </div>
                                
                                <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl border border-rose-100 mb-6 w-full flex items-start gap-3 text-left">
                                    <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                    <p className="text-[10px] font-bold leading-relaxed">Hãy ghi nhớ kỹ mật khẩu này hoặc chụp màn hình lại nhé! Bạn sẽ cần nó cho những lần đăng nhập sau.</p>
                                </div>

                                <button 
                                    onClick={() => {
                                        setShowRecoveryModal(false);
                                        setPinCode(recoveredPin);
                                        setCheckPhase('idle');
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-right-to-bracket"></i> Đăng nhập ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default WorldGateScreen;
