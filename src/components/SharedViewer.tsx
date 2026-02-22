import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { shareLinkService, Presentation } from '../lib/supabase';
import { dbSlideToUi } from '../types';
import type { Slide as UiSlide } from '../types';
import { Layers, ChevronLeft, ChevronRight, Maximize, Minimize, FileText, AlertTriangle, Download, Loader2 } from 'lucide-react';
import SlideViewer from './SlideViewer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function SharedViewer() {
  const { token } = useParams<{ token: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [slides, setSlides] = useState<UiSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSingleSlide, setIsSingleSlide] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadSharedContent();
  }, [token]);

  const loadSharedContent = async () => {
    try {
      setLoading(true);
      const result = await shareLinkService.resolveShareLink(token!);
      if (!result) {
        setError('Este enlace no es valido, ha expirado o ha sido desactivado.');
        return;
      }

      setPresentation(result.presentation);
      setSlides(result.slides.map(dbSlideToUi));
      setIsSingleSlide(!!result.shareLink.slide_id);
    } catch (err) {
      console.error('Error loading shared content:', err);
      setError('Error al cargar el contenido compartido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSingleSlide) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isSingleSlide]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const downloadPdf = useCallback(async () => {
    if (downloading || slides.length === 0) return;
    setDownloading(true);

    const sanitize = (html: string): string =>
      html
        .replace(/\s*contenteditable="[^"]*"/gi, '')
        .replace(/\s*data-visual-edit(="[^"]*")?/gi, '');

    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const PAGE_W = 297;
      const PAGE_H = 210;

      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage();

        // Create hidden iframe to render the slide with all its scripts
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;border:none;opacity:0;pointer-events:none;z-index:-1;';
        document.body.appendChild(iframe);

        // Load slide HTML and wait for full render (Tailwind CDN, Chart.js, fonts)
        await new Promise<void>((resolve) => {
          iframe.addEventListener('load', () => setTimeout(resolve, 3500), { once: true });
          iframe.srcdoc = sanitize(slides[i].htmlContent || '<html><body><p>Slide vacia</p></body></html>');
        });

        // Capture the rendered slide
        const iDoc = iframe.contentDocument;
        if (iDoc && iDoc.body) {
          // Measure full content dimensions
          const fullW = Math.max(iDoc.documentElement.scrollWidth, iDoc.body.scrollWidth, 1280);
          const fullH = Math.max(iDoc.documentElement.scrollHeight, iDoc.body.scrollHeight, 720);

          // Resize iframe to show ALL content
          iframe.style.width = fullW + 'px';
          iframe.style.height = fullH + 'px';
          await new Promise(r => setTimeout(r, 300));

          const canvas = await html2canvas(iDoc.body, {
            width: fullW,
            height: fullH,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.92);

          // Fit image into A4 landscape, centered
          const imgAspect = fullW / fullH;
          const pageAspect = PAGE_W / PAGE_H;
          let drawW: number, drawH: number, drawX: number, drawY: number;

          if (imgAspect > pageAspect) {
            drawW = PAGE_W;
            drawH = PAGE_W / imgAspect;
            drawX = 0;
            drawY = (PAGE_H - drawH) / 2;
          } else {
            drawH = PAGE_H;
            drawW = PAGE_H * imgAspect;
            drawX = (PAGE_W - drawW) / 2;
            drawY = 0;
          }

          pdf.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH);
        }

        document.body.removeChild(iframe);
      }

      pdf.save(`${presentation?.title || 'Presentacion'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloading(false);
    }
  }, [downloading, slides, presentation]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Cargando contenido...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !presentation || slides.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            {error ? <AlertTriangle size={28} className="text-amber-400" /> : <FileText size={28} className="text-gray-500" />}
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {error ? 'Enlace no disponible' : 'Sin contenido'}
          </h2>
          <p className="text-gray-400 text-sm">
            {error || 'Esta presentacion no tiene slides.'}
          </p>
          <div className="mt-8 flex items-center justify-center space-x-2 text-gray-600 text-xs">
            <Layers size={14} />
            <span>SlideForge</span>
          </div>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar - minimal */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-gray-400">
            <Layers size={16} />
            <span className="text-xs font-medium">SlideForge</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <h1 className="text-sm font-medium text-white truncate max-w-[300px]">
            {presentation.title}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {!isSingleSlide && slides.length > 1 && (
            <span className="text-xs text-gray-400 tabular-nums">
              {currentIndex + 1} / {slides.length}
            </span>
          )}
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
            title="Descargar como PDF"
          >
            {downloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Generando...</span>
              </>
            ) : (
              <Download size={16} />
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* Slide content */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* Navigation arrows */}
        {!isSingleSlide && slides.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="absolute left-4 z-10 p-2.5 bg-gray-800/70 hover:bg-gray-700 text-white rounded-full transition-all disabled:opacity-20 disabled:cursor-default backdrop-blur-sm"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1))}
              disabled={currentIndex === slides.length - 1}
              className="absolute right-4 z-10 p-2.5 bg-gray-800/70 hover:bg-gray-700 text-white rounded-full transition-all disabled:opacity-20 disabled:cursor-default backdrop-blur-sm"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Slide viewer */}
        <div className="shared-slide-viewer w-full max-w-5xl aspect-video bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/30">
          {currentSlide && (
            <SlideViewer
              key={currentSlide.id}
              slide={currentSlide}
              isPresentation={true}
              readOnly={true}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isSingleSlide && slides.length > 1 && (
        <div className="px-4 pb-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex space-x-1">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-1 rounded-full flex-1 transition-all ${
                    index === currentIndex
                      ? 'bg-indigo-500'
                      : index < currentIndex
                        ? 'bg-indigo-500/40'
                        : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
