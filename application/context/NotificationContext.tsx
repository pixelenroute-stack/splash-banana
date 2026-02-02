
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = 'info', duration: number = 4000) => {
    const id = Date.now().toString() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-right-10 fade-in duration-300
              ${notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-100' :
                notification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-100' :
                notification.type === 'loading' ? 'bg-blue-500/10 border-blue-500/20 text-blue-100' :
                'bg-slate-800/90 border-slate-700 text-slate-100'}`}
          >
            <div className={`mt-0.5 ${
                notification.type === 'success' ? 'text-green-400' :
                notification.type === 'error' ? 'text-red-400' :
                notification.type === 'loading' ? 'text-blue-400' :
                'text-slate-400'
            }`}>
              {notification.type === 'success' && <CheckCircle size={18} />}
              {notification.type === 'error' && <AlertTriangle size={18} />}
              {notification.type === 'info' && <Info size={18} />}
              {notification.type === 'loading' && <Loader2 size={18} className="animate-spin" />}
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {notification.message}
            </div>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
