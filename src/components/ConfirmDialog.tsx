import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variants = {
    danger: {
      icon: <Trash2 size={22} className="text-red-500" />,
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: <AlertTriangle size={22} className="text-amber-500" />,
      iconBg: 'bg-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    default: {
      icon: <AlertTriangle size={22} className="text-indigo-500" />,
      iconBg: 'bg-indigo-100',
      button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    },
  };

  const v = variants[variant];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-in">
        <div className="p-6 text-center">
          <div className={`w-12 h-12 ${v.iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
            {v.icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex space-x-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${v.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
