import { useState, useEffect } from 'react';

type DialogType = 'alert' | 'confirm';

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  message: string;
  resolve?: (value: boolean) => void;
}

let setDialogStateGlobal: (state: DialogState) => void = () => {};

export const customAlert = (message: string): Promise<void> => {
  return new Promise((resolve) => {
    setDialogStateGlobal({
      isOpen: true,
      type: 'alert',
      message,
      resolve: () => resolve(),
    });
  });
};

export const customConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setDialogStateGlobal({
      isOpen: true,
      type: 'confirm',
      message,
      resolve,
    });
  });
};

// Override global window methods
window.alert = (message?: any) => {
  customAlert(String(message));
};

window.confirm = (message?: string): boolean => {
  console.warn("Synchronous window.confirm is not supported. Use customConfirm instead.");
  customConfirm(String(message));
  return false; // This will break synchronous code, so we must replace all confirm() calls.
};

export const CustomDialogProvider = () => {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    message: '',
  });

  useEffect(() => {
    setDialogStateGlobal = setState;
  }, []);

  if (!state.isOpen) return null;

  const handleClose = (result: boolean) => {
    setState({ ...state, isOpen: false });
    if (state.resolve) {
      state.resolve(result);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner ${
            state.type === 'alert' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'
          }`}>
            <i className={`fa-solid ${state.type === 'alert' ? 'fa-bell' : 'fa-circle-question'}`}></i>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">
              {state.type === 'alert' ? 'Thông báo' : 'Xác nhận'}
            </h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">{state.message}</p>
          </div>
          <div className="flex w-full gap-3 mt-4">
            {state.type === 'confirm' && (
              <button
                onClick={() => handleClose(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
              >
                Hủy
              </button>
            )}
            <button
              onClick={() => handleClose(true)}
              className={`flex-1 py-3 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all ${
                state.type === 'alert' ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700' : 'bg-amber-500 shadow-amber-200 hover:bg-amber-600'
              }`}
            >
              {state.type === 'alert' ? 'Đóng' : 'Đồng ý'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
