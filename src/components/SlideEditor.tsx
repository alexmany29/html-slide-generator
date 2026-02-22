import { useState, useEffect, useRef } from 'react';
import { Slide } from '../types';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import SlideViewer from './SlideViewer';
import HTMLEditor from './HTMLEditor';
import PresentationMode from './PresentationMode';
import EditableText from './EditableText';

interface SlideEditorProps {
  slides: Slide[];
  onSlideUpdate?: (id: string, updates: Partial<Slide>) => void;
  onAddSlide?: () => void;
  onDeleteSlide?: (id: string) => void;
  onReorderSlides?: (slides: Slide[]) => void;
  onCurrentSlideChange?: (slide: Slide) => void;
  readOnly?: boolean;
}

export default function SlideEditor({ slides, onSlideUpdate, onAddSlide, onDeleteSlide, onReorderSlides, onCurrentSlideChange, readOnly = false }: SlideEditorProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showHTMLEditor, setShowHTMLEditor] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [pendingDuplication, setPendingDuplication] = useState<{slideData: Slide, originalLength: number} | null>(null);
  const previousSlidesLength = useRef(slides.length);

  // Ajustar el índice actual si está fuera de rango después de borrar slides
  const safeCurrentIndex = Math.min(currentSlideIndex, slides.length - 1);
  const currentSlide = slides[safeCurrentIndex] || null;
  
  // Actualizar el índice si cambió
  if (safeCurrentIndex !== currentSlideIndex && slides.length > 0) {
    setCurrentSlideIndex(safeCurrentIndex);
  }

  // Notify parent of current slide changes
  useEffect(() => {
    if (currentSlide && onCurrentSlideChange) {
      onCurrentSlideChange(currentSlide);
    }
  }, [currentSlide?.id]);

  const handleSlideUpdate = (updates: Partial<Slide>) => {
    if (currentSlide && onSlideUpdate && !readOnly) {
      onSlideUpdate(currentSlide.id, updates);
    }
  };

  const handleSave = () => {
    // Trigger save notification
    // Save handled by auto-save in PresentationEditor
  };

  const changeSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
    }
  };
  
  const handleDeleteSlide = (slideId: string) => {
    if (readOnly || !onDeleteSlide) return;
    
    // Si estamos borrando la slide actual y no es la última
    const slideIndex = slides.findIndex(s => s.id === slideId);
    
    onDeleteSlide(slideId);
    
    // Ajustar el índice después de borrar
    if (slideIndex === currentSlideIndex) {
      // Si borramos la slide actual
      if (currentSlideIndex >= slides.length - 1) {
        // Si era la última slide, ir a la anterior
        setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
      }
      // Si no era la última, el índice se mantiene (la siguiente slide tomará su lugar)
    } else if (slideIndex < currentSlideIndex) {
      // Si borramos una slide anterior, ajustar el índice
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  // Efecto para manejar la duplicación cuando se agrega una nueva slide
  useEffect(() => {
    if (pendingDuplication && slides.length > pendingDuplication.originalLength) {
      // Se agregó una nueva slide, duplicar el contenido
      const newSlideIndex = slides.length - 1;
      const newSlide = slides[newSlideIndex];
      
      if (newSlide && onSlideUpdate) {
        onSlideUpdate(newSlide.id, {
          title: `${pendingDuplication.slideData.title} (copia)`,
          htmlContent: pendingDuplication.slideData.htmlContent
        });
        // Cambiar a la nueva slide
        setCurrentSlideIndex(newSlideIndex);
      }
      
      // Limpiar el estado de duplicación pendiente
      setPendingDuplication(null);
    }
    
    // Actualizar la referencia de longitud anterior
    previousSlidesLength.current = slides.length;
  }, [slides.length, pendingDuplication]);

  const duplicateSlide = () => {
    if (currentSlide && onAddSlide && !readOnly) {
      // Guardar los datos de la slide a duplicar
      setPendingDuplication({
        slideData: { ...currentSlide },
        originalLength: slides.length
      });
      // Crear una nueva slide básica
      onAddSlide();
    }
  };

  if (!currentSlide) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Toolbar + slide title */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-2 border-b border-gray-100">
          <EditableText
            content={currentSlide.title}
            onChange={(title) => handleSlideUpdate({ title })}
            className="font-medium text-gray-700 text-sm"
            placeholder="Titulo de la slide"
          />
        </div>

        <Toolbar
          onAddSlide={readOnly ? undefined : onAddSlide}
          onDuplicateSlide={readOnly ? undefined : duplicateSlide}
          onDeleteSlide={readOnly ? undefined : () => handleDeleteSlide(currentSlide.id)}
          onEditHTML={readOnly ? undefined : () => setShowHTMLEditor(true)}
          onPresentationMode={() => setShowPresentation(true)}
          onSave={readOnly ? undefined : handleSave}
          canDelete={slides.length > 1 && !readOnly}
          readOnly={readOnly}
          onToggleVisualEdit={readOnly ? undefined : () => setIsVisualEditMode(!isVisualEditMode)}
          isVisualEditMode={isVisualEditMode}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          slides={slides.map(slide => ({
            ...slide,
            createdAt: new Date(),
            updatedAt: new Date()
          }))}
          currentSlideIndex={currentSlideIndex}
          onSlideSelect={changeSlide}
          onReorderSlides={readOnly ? undefined : onReorderSlides}
          readOnly={readOnly}
        />

        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <SlideViewer
              slide={{
                ...currentSlide,
                createdAt: new Date(),
                updatedAt: new Date()
              }}
              onSlideUpdate={readOnly ? undefined : handleSlideUpdate}
              readOnly={readOnly}
              enableVisualEditing={true}
              isVisualEditMode={isVisualEditMode}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showHTMLEditor && !readOnly && (
        <HTMLEditor
          content={currentSlide.htmlContent}
          onChange={(htmlContent) => handleSlideUpdate({ htmlContent })}
          onClose={() => setShowHTMLEditor(false)}
        />
      )}

      {showPresentation && (
        <PresentationMode
          slides={slides.map(slide => ({
            ...slide,
            createdAt: new Date(),
            updatedAt: new Date()
          }))}
          currentSlideIndex={currentSlideIndex}
          onClose={() => setShowPresentation(false)}
          onSlideChange={changeSlide}
        />
      )}
    </div>
  );
}