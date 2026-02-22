import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { presentationService, slideService, Presentation, Slide } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { dbSlideToUi, uiSlideToDbUpdates } from '../types';
import type { Slide as UiSlide } from '../types';
import { ArrowLeft, Save, Eye, FileText, Plus, Link2 } from 'lucide-react';
import { useToast } from './Toast';
import SlideEditor from './SlideEditor';
import ShareLinkModal from './ShareLinkModal';

export default function PresentationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<{id: string; title: string} | null>(null);

  useEffect(() => {
    if (id) {
      loadPresentation();
    }
  }, [id]);

  const loadPresentation = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const presentationData = await presentationService.getPresentationById(id);
      if (presentationData) {
        setPresentation(presentationData);
        
        const hasEditPermission = await presentationService.canEditPresentation(id);
        setCanEdit(hasEditPermission);
        
        const slidesData = await slideService.getSlides(id);
        setSlides(slidesData || []);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading presentation:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!presentation || saving) return;
    
    try {
      setSaving(true);
      // Save presentation title if changed
      await presentationService.updatePresentation(presentation.id, {
        title: presentation.title,
        description: presentation.description
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSaving(false);
    }
  }, [presentation, saving]);

  // Trigger auto-save when presentation changes
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (presentation) {
      autoSaveTimerRef.current = setTimeout(autoSave, 10000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [presentation, autoSave]);

  // Manual save function
  const savePresentation = useCallback(async () => {
    if (!presentation || saving) return;
    
    try {
      setSaving(true);
      // Save presentation title and description
      await presentationService.updatePresentation(presentation.id, {
        title: presentation.title,
        description: presentation.description
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }, [presentation, saving]);

  const updateSlideFromUi = async (slideId: string, uiUpdates: Partial<UiSlide>) => {
    try {
      const dbUpdates = uiSlideToDbUpdates(uiUpdates);
      const updatedSlide = await slideService.updateSlide(slideId, dbUpdates);
      setSlides(prev => prev.map(slide => 
        slide.id === slideId ? updatedSlide : slide
      ));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating slide:', error);
    }
  };

  const addSlide = async () => {
    if (!presentation) return;
    
    try {
      const newSlide = await slideService.createSlide(presentation.id, `Slide ${slides.length + 1}`);
      setSlides(prev => [...prev, newSlide]);
    } catch (error) {
      console.error('Error adding slide:', error);
      toast.error('Error al crear la slide');
    }
  };

  const deleteSlide = async (slideId: string) => {
    if (slides.length <= 1) return;
    
    try {
      await slideService.deleteSlide(slideId);
      setSlides(prev => prev.filter(slide => slide.id !== slideId));
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast.error('Error al eliminar la slide');
    }
  };

  const updatePresentationInfo = (updates: Partial<Presentation>) => {
    if (presentation) {
      setPresentation({ ...presentation, ...updates });
    }
  };

  const reorderSlides = async (reorderedSlides: any[]) => {
    const originalSlides = [...slides];
    
    try {
      setSlides(reorderedSlides);
      
      const slideUpdates = reorderedSlides.map((slide, index) => ({
        id: slide.id,
        slide_order: index
      }));
      
      await slideService.reorderSlides(slideUpdates);
      
      if (id) {
        const updatedSlides = await slideService.getSlides(id);
        setSlides(updatedSlides || []);
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error reordering slides:', error);
      setSlides(originalSlides);
      toast.error('Error al reordenar. Cambio revertido.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando presentación...</p>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Presentación no encontrada</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  // Convert DB slides to UI format for SlideEditor
  const uiSlides = slides.map(dbSlideToUi);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-full px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <div>
                {canEdit ? (
                  <input
                    type="text"
                    value={presentation.title}
                    onChange={(e) => updatePresentationInfo({ title: e.target.value })}
                    className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-gray-900 px-2 py-1">{presentation.title}</h1>
                )}
                {presentation.description !== undefined && (
                  canEdit ? (
                    <input
                      type="text"
                      value={presentation.description || ''}
                      onChange={(e) => updatePresentationInfo({ description: e.target.value })}
                      placeholder="Descripción..."
                      className="block text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 mt-1"
                    />
                  ) : (
                    <p className="block text-sm text-gray-600 px-2 py-1 mt-1">{presentation.description || ''}</p>
                  )
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {canEdit && (
                <>
                  <button
                    onClick={savePresentation}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>
                  {lastSaved && !saving && (
                    <span className="text-sm text-gray-500">
                      Guardado {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => setShowShareLinkModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    <Link2 size={15} />
                    <span>Compartir enlace</span>
                  </button>
                </>
              )}
              {!canEdit && (
                <span className="flex items-center space-x-1.5 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                  <Eye size={14} />
                  <span>Solo lectura</span>
                </span>
              )}
              <span className="text-xs text-gray-400 hidden md:block">
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Slide Editor */}
      {uiSlides.length > 0 ? (
        <SlideEditor
          slides={uiSlides}
          onSlideUpdate={canEdit ? (slideId, updates) => {
            updateSlideFromUi(slideId, updates);
          } : undefined}
          onAddSlide={canEdit ? addSlide : undefined}
          onDeleteSlide={canEdit ? deleteSlide : undefined}
          onReorderSlides={canEdit ? reorderSlides : undefined}
          onCurrentSlideChange={(slide) => setCurrentSlide({ id: slide.id, title: slide.title })}
          readOnly={!canEdit}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileText size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay slides</h3>
            <p className="text-sm text-gray-500 mb-4">Crea tu primera slide para comenzar</p>
            {canEdit && (
              <button
                onClick={addSlide}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                <span>Crear primera slide</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareLinkModal && presentation && (
        <ShareLinkModal
          presentationId={presentation.id}
          presentationTitle={presentation.title}
          currentSlideId={currentSlide?.id}
          currentSlideTitle={currentSlide?.title}
          onClose={() => setShowShareLinkModal(false)}
        />
      )}
    </div>
  );
}
