import { useState, useEffect } from 'react';
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { eventBus } from '../../services/eventBus';

export function showToast(message, type = 'success') {
  eventBus.publish('toast:show', { message, type }, { source: 'ToastHelper' });
}

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('toast:show', (payload) => {
      const { message, type } = payload;
      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-dismiss after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    });

    return () => unsubscribe();
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        
        let borderClass = 'border-white/10 bg-slate-900/90 text-slate-100';
        let Icon = Info;
        let iconColor = 'text-violet-400';

        if (isSuccess) {
          borderClass = 'border-emerald-500/20 bg-emerald-950/80 text-emerald-100';
          Icon = CheckCircle;
          iconColor = 'text-emerald-400';
        } else if (isError) {
          borderClass = 'border-rose-500/20 bg-rose-950/80 text-rose-100';
          Icon = AlertTriangle;
          iconColor = 'text-rose-400';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 animate-slide-up pointer-events-auto ${borderClass}`}
          >
            <Icon size={16} className={`${iconColor} shrink-0`} />
            <p className="text-xs font-medium flex-1 leading-relaxed">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-white transition-colors p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
