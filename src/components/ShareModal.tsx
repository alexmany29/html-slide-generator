import { useState } from 'react';
import { X, Share2, Copy, Mail, Globe, Lock, Eye, Pencil } from 'lucide-react';
import { presentationService, supabase } from '../lib/supabase';

interface ShareModalProps {
  presentationId: string;
  presentationTitle: string;
  isPublic: boolean;
  onClose: () => void;
  onUpdate: (isPublic: boolean) => void;
}

export default function ShareModal({ 
  presentationId, 
  presentationTitle, 
  isPublic, 
  onClose, 
  onUpdate 
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit'>('view');

  const shareUrl = `${window.location.origin}/presentation/${presentationId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleTogglePublic = async () => {
    try {
      setSharing(true);
      const { error } = await supabase
        .from('presentations')
        .update({ is_public: !isPublic })
        .eq('id', presentationId);

      if (error) throw error;
      
      onUpdate(!isPublic);
      setMessage(!isPublic ? 'Presentación ahora es pública' : 'Presentación ahora es privada');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating presentation:', error);
      setMessage('Error al actualizar la presentación');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSharing(false);
    }
  };

  const handleShareByEmail = async () => {
    if (!email.trim()) return;

    setSharing(true);
    setMessage('');

    try {
      const { sharedWith, notFound } = await presentationService.sharePresentation(presentationId, [email], permissionLevel);

      if (sharedWith.length > 0) {
        setMessage(`Presentación compartida con ${sharedWith.join(', ')}`);
        setEmail('');
      } else if (notFound.length > 0) {
        setMessage(`Usuario no encontrado: ${notFound.join(', ')}`);
      } else {
        // This case should ideally not be hit if email is not empty, but as a fallback
        setMessage('No se pudo procesar la solicitud.');
      }
      
    } catch (error) {
      console.error('Error sharing presentation:', error);
      const err = error as Error;
      setMessage(`Error al compartir: ${err.message}`);
    } finally {
      setSharing(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Share2 size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compartir</h2>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{presentationTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              {isPublic ? <Globe size={18} className="text-emerald-600" /> : <Lock size={18} className="text-gray-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isPublic ? 'Publica' : 'Privada'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPublic ? 'Cualquiera con el enlace puede verla' : 'Solo tu y usuarios compartidos'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              disabled={sharing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? 'bg-emerald-500' : 'bg-gray-300'
              } ${sharing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Copy Link */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Enlace</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  copied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Copy size={15} />
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-600 mt-1">Enlace copiado</p>}
          </div>

          {/* Share by Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Compartir por email</label>
            <div className="space-y-2.5">
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleShareByEmail()}
                />
                <button
                  onClick={handleShareByEmail}
                  disabled={!email.trim() || sharing}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Mail size={15} />
                </button>
              </div>

              {/* Permission Level */}
              <div className="flex space-x-3">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="permission" value="view" checked={permissionLevel === 'view'}
                    onChange={(e) => setPermissionLevel(e.target.value as 'view' | 'edit')}
                    className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="flex items-center space-x-1 text-xs text-gray-600"><Eye size={12} /><span>Solo ver</span></span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="permission" value="edit" checked={permissionLevel === 'edit'}
                    onChange={(e) => setPermissionLevel(e.target.value as 'view' | 'edit')}
                    className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="flex items-center space-x-1 text-xs text-gray-600"><Pencil size={12} /><span>Puede editar</span></span>
                </label>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-2.5 rounded-xl text-xs ${
              message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
