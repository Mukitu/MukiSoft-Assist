import { createContext, useContext, useState, ReactNode, createElement } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 4500;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  return createElement(
    NotificationContext.Provider,
    {
      value: { toasts, showToast, removeToast },
    },
    children,
    createElement(
      'div',
      {
        className: 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none',
        role: 'region',
        'aria-live': 'polite',
      },
      toasts.map((toast) =>
        createElement(
          'div',
          {
            key: toast.id,
            className: `pointer-events-auto p-4 rounded-lg border text-sm shadow-md transition-all flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-800'
                : toast.type === 'error'
                ? 'bg-white border-rose-200 text-slate-800'
                : toast.type === 'warning'
                ? 'bg-white border-amber-200 text-slate-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`,
          },
            createElement('div', { className: 'flex-1' },
            createElement(
              'div',
              { className: 'font-semibold text-xs tracking-wide text-slate-500 mb-0.5' },
              toast.type === 'success'
                ? 'সফলতা'
                : toast.type === 'error'
                ? 'সতর্কতা'
                : toast.type === 'warning'
                ? 'মনোযোগ দিন'
                : 'বিজ্ঞপ্তি'
            ),
            createElement('div', { className: 'font-medium text-slate-900' }, toast.title),
            toast.message && createElement('div', { className: 'text-xs text-slate-600 mt-1' }, toast.message)
          ),
          createElement(
            'button',
            {
              onClick: () => removeToast(toast.id),
              className: 'text-slate-400 hover:text-slate-600 text-xs px-1',
              'aria-label': 'Close notification',
            },
            '×'
          )
        )
      )
    )
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
