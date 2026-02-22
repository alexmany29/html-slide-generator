import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { shareLinkService, Presentation } from '../lib/supabase';
import { dbSlideToUi } from '../types';
import type { Slide as UiSlide } from '../types';
import { Layers, ChevronLeft, ChevronRight, Maximize, Minimize, FileText, AlertTriangle, Download } from 'lucide-react';
import SlideViewer from './SlideViewer';

export default function SharedViewer() {
  const { token } = useParams<{ token: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [slides, setSlides] = useState<UiSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSingleSlide, setIsSingleSlide] = useState(false);

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

  const downloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const parser = new DOMParser();

    // Sanitize: strip contenteditable artifacts
    const sanitize = (html: string): string =>
      html
        .replace(/\s*contenteditable="[^"]*"/gi, '')
        .replace(/\s*data-visual-edit(="[^"]*")?/gi, '');

    // Collect unique styles from ALL slides, and extract body content
    const stylesSeen = new Set<string>();
    let allStyles = '';

    const slidePages = slides.map((s, i) => {
      const clean = sanitize(s.htmlContent || '');
      const doc = parser.parseFromString(clean, 'text/html');

      // Gather <style> and <link rel="stylesheet"> from every slide's <head>
      doc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
        const key = el.outerHTML;
        if (!stylesSeen.has(key)) {
          stylesSeen.add(key);
          allStyles += key + '\n';
        }
      });

      // Body content (DOMParser always produces a valid body)
      const bodyHtml = doc.body ? doc.body.innerHTML : clean;

      return `<div class="slide-page"><div class="slide-number">${i + 1} / ${slides.length}</div><div class="slide-content">${bodyHtml}</div></div>`;
    });

    // Build the print-ready document using DOM to avoid template literal issues
    const printDoc = printWindow.document;
    printDoc.open();
    printDoc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
    printDoc.close();

    // Set title
    printDoc.title = `${presentation?.title || 'Presentación'} — PDF`;

    // Add collected styles from slides
    const stylesContainer = printDoc.createElement('div');
    stylesContainer.innerHTML = allStyles;
    while (stylesContainer.firstChild) {
      printDoc.head.appendChild(stylesContainer.firstChild);
    }

    // Add our print layout styles
    const layoutStyle = printDoc.createElement('style');
    layoutStyle.textContent = `
      @page { size: 297mm 210mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        margin: 0; padding: 0;
        font-family: system-ui, -apple-system, sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .slide-page {
        width: 297mm; height: 210mm;
        position: relative; background: #fff;
        overflow: hidden;
        page-break-after: always; break-after: page;
        page-break-inside: avoid; break-inside: avoid;
      }
      .slide-page:last-child {
        page-break-after: auto; break-after: auto;
      }
      .slide-content {
        width: 297mm; height: 210mm;
        padding: 10mm;
        transform-origin: top left;
        overflow: visible;
      }
      .slide-number {
        position: absolute; bottom: 4mm; right: 6mm;
        font-size: 8px; color: #d1d5db; z-index: 10;
      }
      img { max-width: 100%; height: auto; }
      @media screen {
        body { background: #f3f4f6; padding: 20px; }
        .slide-page {
          margin: 0 auto 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          border-radius: 4px;
        }
      }
    `;
    printDoc.head.appendChild(layoutStyle);

    // Insert all slide pages into body
    const container = printDoc.createElement('div');
    container.innerHTML = slidePages.join('');
    while (container.firstChild) {
      printDoc.body.appendChild(container.firstChild);
    }

    // Auto-scale each slide to fit within the page, then trigger print
    const scaleScript = printDoc.createElement('script');
    scaleScript.textContent = `
      (function() {
        function doScale() {
          var pages = document.querySelectorAll('.slide-page');
          var mmToPx = (function() {
            var el = document.createElement('div');
            el.style.width = '297mm';
            el.style.position = 'absolute';
            el.style.visibility = 'hidden';
            document.body.appendChild(el);
            var px = el.offsetWidth;
            document.body.removeChild(el);
            return px / 297;
          })();
          var pageW = 297 * mmToPx;
          var pageH = 210 * mmToPx;
          var pad = 10 * mmToPx;
          var availW = pageW - pad * 2;
          var availH = pageH - pad * 2;

          pages.forEach(function(page) {
            var content = page.querySelector('.slide-content');
            if (!content) return;
            page.style.overflow = 'visible';
            content.style.overflow = 'visible';
            content.style.width = 'auto';
            content.style.height = 'auto';
            var cw = content.scrollWidth;
            var ch = content.scrollHeight;
            var sx = cw > availW ? availW / cw : 1;
            var sy = ch > availH ? availH / ch : 1;
            var scale = Math.min(sx, sy, 1);
            if (scale < 1) {
              content.style.transform = 'scale(' + scale + ')';
            }
            content.style.width = ''; content.style.height = '';
            content.style.overflow = '';
            page.style.overflow = 'hidden';
          });
        }

        // Wait for fonts/images to load before scaling + printing
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function() {
            setTimeout(function() { doScale(); setTimeout(function(){ window.print(); }, 300); }, 300);
          });
        } else {
          window.onload = function() {
            setTimeout(function() { doScale(); setTimeout(function(){ window.print(); }, 300); }, 500);
          };
        }
      })();
    `;
    printDoc.body.appendChild(scaleScript);
  };

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
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            title="Descargar como PDF"
          >
            <Download size={16} />
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
