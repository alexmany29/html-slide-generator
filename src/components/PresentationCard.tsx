import { useState, useEffect } from 'react';
import { Presentation, presentationService } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Calendar, Eye, Pencil, Share2, Copy, Globe, MoreHorizontal } from 'lucide-react';

interface PresentationCardProps {
  presentation: Presentation;
  onDelete?: (id: string) => void;
  onShare?: (presentation: Presentation) => void;
  onDuplicate?: (presentation: Presentation) => void;
  canEdit?: boolean;
  viewMode?: 'grid' | 'list';
}

export default function PresentationCard({ presentation, onDelete, onShare, onDuplicate, canEdit = false, viewMode = 'grid' }: PresentationCardProps) {
  const navigate = useNavigate();
  const [canEditPresentation, setCanEditPresentation] = useState(canEdit);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (canEdit) {
      setCanEditPresentation(true);
      return;
    }
    const checkEditPermissions = async () => {
      try {
        const hasEditPermission = await presentationService.canEditPresentation(presentation.id);
        setCanEditPresentation(hasEditPermission);
      } catch (error) {
        console.error('Error checking edit permissions:', error);
        setCanEditPresentation(false);
      }
    };
    checkEditPermissions();
  }, [presentation.id, canEdit]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showMenu]);

  const handleEdit = () => navigate(`/presentation/${presentation.id}`);
  const handleView = () => navigate(`/presentation/${presentation.id}/view`);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all p-4 flex items-center gap-4 group">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-600 font-bold text-sm">{presentation.title.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{presentation.title}</h3>
          <div className="flex items-center space-x-3 mt-0.5">
            <span className="text-xs text-gray-400 flex items-center space-x-1">
              <Calendar size={11} />
              <span>{formatDate(presentation.updated_at)}</span>
            </span>
            {presentation.is_public && (
              <span className="text-xs text-emerald-600 flex items-center space-x-1">
                <Globe size={11} />
                <span>Publico</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleView} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-1">
            <Eye size={13} /><span>Ver</span>
          </button>
          {canEditPresentation && (
            <button onClick={handleEdit} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center space-x-1">
              <Pencil size={13} /><span>Editar</span>
            </button>
          )}
          {canEdit && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <MoreHorizontal size={15} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-40 z-20 animate-in">
                  {onShare && <button onClick={() => onShare(presentation)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"><Share2 size={14} /><span>Compartir</span></button>}
                  {onDuplicate && <button onClick={() => onDuplicate(presentation)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"><Copy size={14} /><span>Duplicar</span></button>}
                  {onDelete && <button onClick={() => onDelete(presentation.id)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"><Trash2 size={14} /><span>Eliminar</span></button>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group animate-slide-up">
      {/* Card header with gradient accent */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-t-xl" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-gray-900 truncate mb-1">
              {presentation.title}
            </h3>
            {presentation.description && (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {presentation.description}
              </p>
            )}
          </div>
          {canEdit && (
            <div className="relative ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-40 z-20 animate-in">
                  {onShare && <button onClick={() => onShare(presentation)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"><Share2 size={14} /><span>Compartir</span></button>}
                  {onDuplicate && <button onClick={() => onDuplicate(presentation)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"><Copy size={14} /><span>Duplicar</span></button>}
                  {onDelete && (
                    <>
                      <div className="h-px bg-gray-100 my-1" />
                      <button onClick={() => onDelete(presentation.id)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"><Trash2 size={14} /><span>Eliminar</span></button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center space-x-1"><Calendar size={12} /><span>{formatDate(presentation.updated_at)}</span></span>
          {presentation.is_public && (
            <span className="flex items-center space-x-1 text-emerald-500">
              <Globe size={12} /><span>Publico</span>
            </span>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleView}
            className="flex-1 flex items-center justify-center space-x-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <Eye size={14} /><span>Ver</span>
          </button>
          {canEditPresentation && (
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              <Pencil size={14} /><span>Editar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
