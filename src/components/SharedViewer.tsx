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

    const sanitize = (html: string): string =>
      html
        .replace(/\s*contenteditable="[^"]*"/gi, '')
        .replace(/\s*data-visual-edit(="[^"]*")?/gi, '');

    const printDoc = printWindow.document;
    printDoc.open();
    printDoc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
    printDoc.close();
    printDoc.title = `${presentation?.title || 'Presentación'} — PDF`;

    const style = printDoc.createElement('style');
    style.textContent = `
      @page { size: 297mm 210mm; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .slide-wrapper {
        width: 297mm;
        height: 210mm;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        background: #fff;
      }
      .slide-wrapper:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .slide-wrapper iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
      .slide-label {
        position: absolute;
        bottom: 3mm;
        right: 5mm;
        font-size: 7px;
        color: #aaa;
        font-family: system-ui, sans-serif;
        z-index: 10;
      }
      .loading-msg {
        position: fixed;
        top: 0; left: 0; right: 0;
        background: #4f46e5;
        color: white;
        text-align: center;
        padding: 12px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        z-index: 1000;
      }
      @media screen {
        body { background: #1a1a2e; padding: 20px; }
        .slide-wrapper {
          margin: 0 auto 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          border-radius: 6px;
        }
      }
      @media print {
        .loading-msg { display: none !important; }
      }
    `;
    printDoc.head.appendChild(style);

    // Loading indicator
    const loadingMsg = printDoc.createElement('div');
    loadingMsg.className = 'loading-msg';
    loadingMsg.textContent = `Preparando ${slides.length} slides para PDF...`;
    printDoc.body.appendChild(loadingMsg);

    let readyCount = 0;
    const totalSlides = slides.length;
    const iframes: HTMLIFrameElement[] = [];

    // After ALL iframes loaded + scripts ran, inject zoom inside each iframe
    const applyZoomAndPrint = () => {
      loadingMsg.textContent = 'Ajustando slides al tamaño de pagina...';

      iframes.forEach((iframe) => {
        try {
          const iDoc = iframe.contentDocument;
          if (!iDoc || !iDoc.body) return;

          // Measure real content height inside the iframe
          const scrollH = Math.max(
            iDoc.documentElement.scrollHeight,
            iDoc.body.scrollHeight
          );
          const scrollW = Math.max(
            iDoc.documentElement.scrollWidth,
            iDoc.body.scrollWidth
          );

          // iframe visible area (matches wrapper: 297mm x 210mm)
          const viewH = iframe.clientHeight || 793;
          const viewW = iframe.clientWidth || 1122;

          // Only zoom if content overflows
          if (scrollH > viewH || scrollW > viewW) {
            const zoomX = viewW / scrollW;
            const zoomY = viewH / scrollH;
            const zoom = Math.min(zoomX, zoomY, 1);

            // Inject zoom CSS directly into the iframe's document
            const zoomStyle = iDoc.createElement('style');
            zoomStyle.setAttribute('id', 'pdf-fit-zoom');
            zoomStyle.textContent = `
              html {
                zoom: ${zoom} !important;
                overflow: hidden !important;
              }
            `;
            iDoc.head.appendChild(zoomStyle);
          }
        } catch (e) {
          // Cross-origin or other error, skip this iframe
        }
      });

      // Wait for zoom reflow, then print
      loadingMsg.textContent = 'Listo. Abriendo dialogo de impresion...';
      setTimeout(() => {
        loadingMsg.style.display = 'none';
        printWindow.print();
      }, 1000);
    };

    // Create one iframe per slide
    slides.forEach((s, i) => {
      const wrapper = printDoc.createElement('div');
      wrapper.className = 'slide-wrapper';

      const label = printDoc.createElement('div');
      label.className = 'slide-label';
      label.textContent = `${i + 1} / ${totalSlides}`;
      wrapper.appendChild(label);

      const iframe = printDoc.createElement('iframe') as HTMLIFrameElement;
      iframes.push(iframe);

      iframe.addEventListener('load', () => {
        // Wait for Tailwind CDN + Chart.js + fonts to fully process
        setTimeout(() => {
          readyCount++;
          loadingMsg.textContent = `Cargando slides: ${readyCount} / ${totalSlides}...`;
          if (readyCount >= totalSlides) {
            applyZoomAndPrint();
          }
        }, 3000);
      });

      wrapper.appendChild(iframe);
      printDoc.body.appendChild(wrapper);

      // srcdoc renders the complete slide HTML with all its own scripts
      iframe.srcdoc = sanitize(s.htmlContent || '<p>Slide vacia</p>');
    });

    // Safety timeout: if something hangs, print what we have after 25s
    setTimeout(() => {
      if (readyCount < totalSlides) {
        readyCount = totalSlides;
        applyZoomAndPrint();
      }
    }, 25000);
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
