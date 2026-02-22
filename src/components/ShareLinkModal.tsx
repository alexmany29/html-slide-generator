import { useState, useEffect } from 'react';
import { shareLinkService, ShareLink } from '../lib/supabase';
import { X, Link2, Copy, Check, Trash2, ToggleLeft, ToggleRight, ExternalLink, Eye, Presentation, Clock } from 'lucide-react';

interface ShareLinkModalProps {
  presentationId: string;
  presentationTitle: string;
  currentSlideId?: string;
  currentSlideTitle?: string;
  onClose: () => void;
}

export default function ShareLinkModal({
  presentationId,
  presentationTitle,
  currentSlideId,
  currentSlideTitle,
  onClose,
}: ShareLinkModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareType, setShareType] = useState<'presentation' | 'slide'>('presentation');
  const [linkTitle, setLinkTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState<string>('never');

  useEffect(() => {
    loadLinks();
  }, [presentationId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await shareLinkService.getShareLinks(presentationId);
      setLinks(data);
    } catch (err) {
      console.error('Error loading share links:', err);
    } finally {
      setLoading(false);
    }
  };

  const createLink = async () => {
    try {
      setCreating(true);
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const date = new Date();
        if (expiresIn === '1h') date.setHours(date.getHours() + 1);
        if (expiresIn === '24h') date.setHours(date.getHours() + 24);
        if (expiresIn === '7d') date.setDate(date.getDate() + 7);
        if (expiresIn === '30d') date.setDate(date.getDate() + 30);
        expiresAt = date.toISOString();
      }

      const slideId = shareType === 'slide' ? currentSlideId : undefined;
      const title = linkTitle.trim() || (shareType === 'slide' ? currentSlideTitle : presentationTitle);

      await shareLinkService.createShareLink(presentationId, slideId, title, expiresAt);
      setLinkTitle('');
      setExpiresIn('never');
      await loadLinks();
    } catch (err) {
      console.error('Error creating share link:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleLink = async (link: ShareLink) => {
    try {
      await shareLinkService.toggleShareLink(link.id, !link.is_active);
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
    } catch (err) {
      console.error('Error toggling link:', err);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      await shareLinkService.deleteShareLink(id);
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  const copyLink = (link: ShareLink) => {
    const url = `${window.location.origin}/s/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const isExpired = (link: ShareLink): boolean => {
    return !!link.expires_at && new Date(link.expires_at) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Link2 size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compartir por enlace</h2>
              <p className="text-xs text-gray-500">{presentationTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Create new link */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setShareType('presentation')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                shareType === 'presentation'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Presentation size={14} />
              <span>Toda la presentacion</span>
            </button>
            {currentSlideId && (
              <button
                onClick={() => setShareType('slide')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  shareType === 'slide'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Eye size={14} />
                <span>Solo esta slide</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Nombre del enlace (opcional)"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="never">Sin caducidad</option>
              <option value="1h">1 hora</option>
              <option value="24h">24 horas</option>
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
            </select>
          </div>

          <button
            onClick={createLink}
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Link2 size={16} />
                <span>Generar enlace {shareType === 'slide' ? 'de slide' : 'de presentacion'}</span>
              </>
            )}
          </button>
        </div>

        {/* Links list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Cargando enlaces...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Link2 size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No hay enlaces creados</p>
              <p className="text-xs text-gray-400 mt-1">Genera un enlace para compartir con tus alumnos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const expired = isExpired(link);
                const inactive = !link.is_active || expired;
                return (
                  <div
                    key={link.id}
                    className={`p-3 rounded-xl border transition-all ${
                      inactive
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                            link.slide_id
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {link.slide_id ? 'Slide' : 'Completa'}
                          </span>
                          {expired && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                              Expirado
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-1 truncate">
                          {link.title || 'Enlace sin nombre'}
                        </p>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Eye size={11} />
                            <span>{link.view_count} visitas</span>
                          </span>
                          {link.expires_at && (
                            <span className="flex items-center space-x-1">
                              <Clock size={11} />
                              <span>{formatDate(link.expires_at)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => copyLink(link)}
                        disabled={inactive}
                        className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all disabled:opacity-50"
                      >
                        {copiedId === link.id ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                        <span>{copiedId === link.id ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <a
                        href={`/s/${link.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                      >
                        <ExternalLink size={13} />
                        <span>Abrir</span>
                      </a>
                      <button
                        onClick={() => toggleLink(link)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
                        title={link.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {link.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                        title="Eliminar enlace"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
