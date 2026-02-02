
import React from 'react';
import clsx from 'clsx';
import { Loader2, X, AlertTriangle } from 'lucide-react';

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx("bg-white rounded-[2rem] border border-slate-200 shadow-sm", className)}>
    {children}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'outline' }>(
  ({ className, isLoading, variant = 'primary', children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-100 active:scale-95",
      secondary: "bg-slate-900 text-white hover:bg-black focus:ring-slate-700 shadow-lg shadow-slate-100 active:scale-95",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-100 active:scale-95",
      outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-500 active:scale-95"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center px-6 py-3 text-sm font-black uppercase tracking-widest rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }>(
  ({ className, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          "w-full px-5 py-3.5 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all bg-slate-100/50 font-medium placeholder:text-slate-300",
          error ? "border-red-300 bg-red-50/50" : "border-slate-100",
          className
        )}
        {...props}
      />
      {error && <p className="mt-2 text-[10px] text-red-600 font-black uppercase tracking-tighter">{error}</p>}
    </div>
  )
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(
  ({ className, label, children, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          "w-full px-5 py-3.5 border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all bg-slate-100/50 cursor-pointer font-medium appearance-none",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
);

export const Badge = ({ children, color = 'blue', className }: { children?: React.ReactNode, color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray', className?: string }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-slate-100 text-slate-700"
  };
  return (
    <span className={clsx("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", colors[color], className)}>
      {children}
    </span>
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 bg-white border-0">
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-red-50 rounded-[2rem] text-red-600 mb-6 shadow-inner">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tighter">{title}</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">{message}</p>
          <div className="flex gap-4 w-full">
            <Button 
              variant="danger" 
              className="flex-1 rounded-2xl" 
              onClick={onConfirm} 
              isLoading={isLoading}
            >
              Confirm
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl border-slate-100 text-slate-400" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
