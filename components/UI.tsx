
import React from 'react';
import clsx from 'clsx';
import { Loader2, X, AlertTriangle } from 'lucide-react';

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>
    {children}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'outline' }>(
  ({ className, isLoading, variant = 'primary', children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      secondary: "bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-700",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-500"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
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
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          "w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-400 transition-all bg-[#F8FAFC]",
          error ? "border-red-300 bg-red-50/50" : "border-slate-200",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  )
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(
  ({ className, label, children, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          "w-full px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-400 transition-all bg-[#F8FAFC] cursor-pointer",
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
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors[color], className)}>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 border-t-4 border-red-500">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-full text-red-600 flex-shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <Button 
                variant="danger" 
                className="flex-1" 
                onClick={onConfirm} 
                isLoading={isLoading}
              >
                Yes, Delete
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={onClose}
                disabled={isLoading}
              >
                No, Cancel
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
