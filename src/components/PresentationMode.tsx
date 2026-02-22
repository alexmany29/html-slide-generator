import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Slide } from '../types';
import SlideViewer from './SlideViewer';

interface PresentationModeProps {
  slides: Slide[];
  currentSlideIndex: number;
  onClose: () => void;
  onSlideChange: (index: number) => void;
}

export default function PresentationMode({ slides, currentSlideIndex, onClose, onSlideChange }: PresentationModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Función para cerrar la presentación
  const handleClose = useCallback(async () => {
    if (isClosing) return;
    setIsClosing(true);
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    } finally {
      onClose();
    }
  }, [onClose, isClosing]);

  // Función para pantalla completa
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Entrar en pantalla completa
        const docEl = document.documentElement;
        
        // Intentar diferentes métodos según el navegador
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if ((docEl as any).webkitRequestFullscreen) {
          // Safari
          await (docEl as any).webkitRequestFullscreen();
        } else if ((docEl as any).mozRequestFullScreen) {
          // Firefox
          await (docEl as any).mozRequestFullScreen();
        } else if ((docEl as any).msRequestFullscreen) {
          // IE/Edge
          await (docEl as any).msRequestFullscreen();
        } else {
          console.warn('Fullscreen API no soportada en este navegador');
          return;
        }
        
      } else {
        // Salir de pantalla completa
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      // Si hay error, intentar detectar el estado actual
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    }
  }, []);

  // Navegación
  const goToPrevious = useCallback(() => {
    if (currentSlideIndex > 0) {
      onSlideChange(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, onSlideChange]);

  const goToNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      onSlideChange(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides.length, onSlideChange]);

  // Detectar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);
      
      setIsFullscreen(isCurrentlyFullscreen);
    };

    // Agregar listeners para todos los navegadores
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo manejar eventos si no estamos en un input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goToNext();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, goToPrevious, goToNext, toggleFullscreen]);

  // Validaciones de seguridad
  if (!slides || slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No hay slides para mostrar</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (currentSlideIndex < 0 || currentSlideIndex >= slides.length) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Índice de slide inválido</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const progress = ((currentSlideIndex + 1) / slides.length) * 100;

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900/80 backdrop-blur-sm text-white px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-400 tabular-nums">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-[200px]">{currentSlide.title}</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={goToPrevious}
            disabled={currentSlideIndex === 0}
            className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-auto bg-white">
        <SlideViewer
          slide={currentSlide}
          onSlideUpdate={() => {}}
          isPresentation={true}
        />
      </div>

      {/* Keyboard hints */}
      <div className="bg-gray-900/80 backdrop-blur-sm px-4 py-1.5 flex justify-center space-x-6">
        <span className="text-[11px] text-gray-500"><kbd className="text-gray-400">← →</kbd> Navegar</span>
        <span className="text-[11px] text-gray-500"><kbd className="text-gray-400">F</kbd> Pantalla completa</span>
        <span className="text-[11px] text-gray-500"><kbd className="text-gray-400">Esc</kbd> Salir</span>
      </div>
    </div>
  );
}