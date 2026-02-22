import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { presentationService, slideService, Presentation, Slide } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SlideEditor from './SlideEditor';

export default function PresentationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

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
        
        // Check edit permissions
        const hasEditPermission = await presentationService.canEditPresentation(id);
        setCanEdit(hasEditPermission);
        
        const slidesData = await slideService.getSlides(id);
        setSlides(slidesData || []);
      } else {
        console.error('Presentation not found');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading presentation:', error);
      navigate('/dashboard');
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
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    if (presentation) {
      const timer = setTimeout(autoSave, 10000); // Auto-save after 10 seconds of inactivity
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
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

  const updateSlide = async (slideId: string, updates: Partial<Slide>) => {
    try {
      const updatedSlide = await slideService.updateSlide(slideId, updates);
      setSlides(prev => prev.map(slide => 
        slide.id === slideId ? updatedSlide : slide
      ));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating slide:', error);
    }
  };

  const addSlide = async () => {
    if (!presentation) {
      console.error('No presentation available for adding slide');
      return;
    }
    
    console.log('Adding slide to presentation:', presentation.id, 'Current slides:', slides.length);
    
    try {
      const newSlide = await slideService.createSlide(presentation.id, `Slide ${slides.length + 1}`);
      console.log('New slide created:', newSlide);
      
      setSlides(prev => {
        const updated = [...prev, newSlide];
        console.log('Updated slides array:', updated);
        return updated;
      });
      
      console.log('Slide added successfully');
    } catch (error) {
      console.error('Error adding slide:', error);
      // Show user-friendly error
      alert('Error al crear la slide. Por favor, inténtalo de nuevo.');
    }
  };

  const deleteSlide = async (slideId: string) => {
    if (slides.length <= 1) {
      console.log('Cannot delete last slide');
      return; // Don't delete the last slide
    }
    
    console.log('Deleting slide:', slideId);
    
    try {
      await slideService.deleteSlide(slideId);
      setSlides(prev => {
        const updated = prev.filter(slide => slide.id !== slideId);
        console.log('Updated slides after deletion:', updated);
        return updated;
      });
      console.log('Slide deleted successfully');
    } catch (error) {
      console.error('Error deleting slide:', error);
      alert('Error al eliminar la slide. Por favor, inténtalo de nuevo.');
    }
  };

  const updatePresentationInfo = (updates: Partial<Presentation>) => {
    if (presentation) {
      setPresentation({ ...presentation, ...updates });
    }
  };

  const reorderSlides = async (reorderedSlides: any[]) => {
    // Store original slides for rollback
    const originalSlides = [...slides];
    
    try {
      console.log('Reordering slides:', reorderedSlides.map(s => ({ id: s.id, title: s.title, order: s.slide_order })));
      
      // Update local state immediately for better UX
      setSlides(reorderedSlides);
      
      // Prepare data for backend update - only update the order, not the content
      const slideUpdates = reorderedSlides.map((slide, index) => ({
        id: slide.id,
        slide_order: index
      }));
      
      console.log('Updating slide orders:', slideUpdates);
      
      // Update slide order in database
      await slideService.reorderSlides(slideUpdates);
      
      // Reload slides from database to ensure consistency
      if (id) {
        const updatedSlides = await slideService.getSlides(id);
        console.log('Reloaded slides after reorder:', updatedSlides.map(s => ({ id: s.id, title: s.title, order: s.slide_order })));
        setSlides(updatedSlides || []);
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error reordering slides:', error);
      // Revert to original state on error
      setSlides(originalSlides);
      alert('Error al reordenar las slides. Se ha revertido el cambio.');
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

  // Convert our Slide type to the legacy format expected by SlideEditor
  const legacySlides = slides.map(slide => ({
    id: slide.id,
    title: slide.title,
    htmlContent: slide.html_content || ''
  }));
  
  console.log('Rendering with slides:', legacySlides.length, legacySlides);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Volver
              </button>
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
                        <span>💾</span>
                        <span>Guardar</span>
                      </>
                    )}
                  </button>
                  {lastSaved && !saving && (
                    <span className="text-sm text-gray-500">
                      Guardado {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                </>
              )}
              {!canEdit && (
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  👁️ Solo lectura
                </span>
              )}
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Slide Editor */}
      {legacySlides.length > 0 ? (
        <SlideEditor
          slides={legacySlides}
          onSlideUpdate={canEdit ? (id, updates) => {
            console.log('Updating slide:', id, updates);
            // Convert back to our format
            updateSlide(id, {
              title: updates.title,
              html_content: updates.htmlContent
            });
          } : undefined}
          onAddSlide={canEdit ? addSlide : undefined}
          onDeleteSlide={canEdit ? deleteSlide : undefined}
          onReorderSlides={canEdit ? reorderSlides : undefined}
          readOnly={!canEdit}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No hay slides</h3>
            <p className="text-sm text-gray-500 mb-4">Crea tu primera slide para comenzar</p>
            {canEdit && (
              <button
                onClick={addSlide}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Crear primera slide
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
