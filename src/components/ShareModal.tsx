import { useState } from 'react';
import { X, Share2, Copy, Mail, Globe, Lock } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Share2 className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Compartir presentación</h2>
              <p className="text-sm text-gray-600">{presentationTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {isPublic ? <Globe className="text-green-600" size={20} /> : <Lock className="text-gray-600" size={20} />}
              <div>
                <p className="font-medium text-gray-900">
                  {isPublic ? 'Presentación pública' : 'Presentación privada'}
                </p>
                <p className="text-sm text-gray-600">
                  {isPublic ? 'Cualquiera con el enlace puede verla' : 'Solo tú y usuarios compartidos pueden verla'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              disabled={sharing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? 'bg-green-600' : 'bg-gray-300'
              } ${sharing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Copy Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enlace de la presentación
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Copy size={16} />
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-1">¡Enlace copiado!</p>
            )}
          </div>

          {/* Share by Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compartir con usuario específico
            </label>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleShareByEmail()}
                />
                <button
                  onClick={handleShareByEmail}
                  disabled={!email.trim() || sharing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
                >
                  <Mail size={16} />
                </button>
              </div>
              
              {/* Permission Level Selector */}
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="permission"
                    value="view"
                    checked={permissionLevel === 'view'}
                    onChange={(e) => setPermissionLevel(e.target.value as 'view' | 'edit')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">👁️ Solo ver</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="permission"
                    value="edit"
                    checked={permissionLevel === 'edit'}
                    onChange={(e) => setPermissionLevel(e.target.value as 'view' | 'edit')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">✏️ Puede editar</span>
                </label>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-all duration-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
