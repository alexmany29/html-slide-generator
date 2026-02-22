import { useState, useEffect } from 'react';
import { Presentation, presentationService } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Calendar, Eye, Pencil, Share2 } from 'lucide-react';

interface PresentationCardProps {
  presentation: Presentation;
  onDelete?: (id: string) => void;
  onShare?: (presentation: Presentation) => void;
  canEdit?: boolean;
}

export default function PresentationCard({ presentation, onDelete, onShare, canEdit = false }: PresentationCardProps) {
  const navigate = useNavigate();
  const [canEditPresentation, setCanEditPresentation] = useState(canEdit);

  useEffect(() => {
    // If canEdit is explicitly set (for owned presentations), use that
    if (canEdit) {
      setCanEditPresentation(true);
      return;
    }

    // Otherwise, check if user has edit permissions for shared presentations
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

  const handleEdit = () => {
    navigate(`/presentation/${presentation.id}`);
  };

  const handleView = () => {
    navigate(`/presentation/${presentation.id}/view`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {presentation.title}
            </h3>
            {presentation.description && (
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {presentation.description}
              </p>
            )}
          </div>
          {canEdit && onDelete && (
            <button
              onClick={() => onDelete(presentation.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all ml-2"
              title="Eliminar presentación"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5"><Calendar size={14} /><span>{formatDate(presentation.updated_at)}</span></span>
            {presentation.is_public && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                Público
              </span>
            )}
            
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleView}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <Eye size={15} className="mr-1.5" /> Ver
          </button>
          {canEditPresentation && (
            <>
              <button
                onClick={handleEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Pencil size={15} className="mr-1.5" /> Editar
              </button>
              {onShare && (
                <button
                  onClick={() => onShare(presentation)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  title="Compartir presentación"
                >
                  <Share2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
