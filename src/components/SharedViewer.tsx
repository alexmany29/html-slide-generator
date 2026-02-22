import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { shareLinkService, Presentation } from '../lib/supabase';
import { dbSlideToUi } from '../types';
import type { Slide as UiSlide } from '../types';
import { Layers, ChevronLeft, ChevronRight, Maximize, Minimize, FileText, AlertTriangle, Download, Loader2 } from 'lucide-react';
import SlideViewer from './SlideViewer';
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

  // Capture a single slide by rendering it in a hidden iframe, then running
  // html2canvas INSIDE the iframe (same document context = all Tailwind/Chart.js
  // styles are available). Result sent back via postMessage.
  const captureSlide = useCallback((html: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        'position:fixed;left:0;top:0;width:1280px;height:960px;border:none;opacity:0;pointer-events:none;z-index:-1;';
      document.body.appendChild(iframe);

      let settled = false;
      const cleanup = () => {
        window.removeEventListener('message', onMsg);
        if (iframe.parentNode) document.body.removeChild(iframe);
      };

      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === 'pdf-slide-capture' && e.source === iframe.contentWindow) {
          settled = true;
          cleanup();
          resolve(e.data.dataUrl || '');
        }
      };
      window.addEventListener('message', onMsg);

      iframe.addEventListener('load', () => {
        // Wait for Tailwind CDN + Chart.js + Google Fonts to fully process
        setTimeout(() => {
          try {
            const iDoc = iframe.contentDocument;
            if (!iDoc) { cleanup(); reject(new Error('No document')); return; }

            // Measure full content, then resize iframe before capture
            const fullW = Math.max(iDoc.documentElement.scrollWidth, iDoc.body.scrollWidth, 1280);
            const fullH = Math.max(iDoc.documentElement.scrollHeight, iDoc.body.scrollHeight, 960);
            iframe.style.width = fullW + 'px';
            iframe.style.height = fullH + 'px';

            // Inject html2canvas from CDN and run capture inside the iframe
            const script = iDoc.createElement('script');
            script.textContent = `
              (function(){
                var s=document.createElement('script');
                s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                s.onload=function(){
                  var w=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth,1280);
                  var h=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,960);
                  html2canvas(document.body,{
                    width:w,height:h,scale:2,
                    useCORS:true,allowTaint:true,
                    backgroundColor:'#ffffff',logging:false
                  }).then(function(c){
                    window.parent.postMessage({type:'pdf-slide-capture',dataUrl:c.toDataURL('image/jpeg',0.92)},'*');
                  }).catch(function(){
                    window.parent.postMessage({type:'pdf-slide-capture',dataUrl:''},'*');
                  });
                };
                s.onerror=function(){
                  window.parent.postMessage({type:'pdf-slide-capture',dataUrl:''},'*');
                };
                document.head.appendChild(s);
              })();
            `;
            iDoc.body.appendChild(script);
          } catch (e) {
            cleanup();
            reject(e);
          }
        }, 3500);
      }, { once: true });

      iframe.srcdoc = html;

      // Safety timeout — 20s per slide max
      setTimeout(() => {
        if (!settled) { cleanup(); reject(new Error('Timeout')); }
      }, 20000);
    });
  }, []);

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

        const dataUrl = await captureSlide(
          sanitize(slides[i].htmlContent || '<html><body><p>Slide</p></body></html>')
        );

        if (dataUrl) {
          // Decode image dimensions to calculate aspect ratio
          const img = new Image();
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error('img load fail'));
            img.src = dataUrl;
          });

          const imgAspect = img.width / img.height;
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

          pdf.addImage(dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
        }
      }

      pdf.save(`${presentation?.title || 'Presentacion'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloading(false);
    }
  }, [downloading, slides, presentation, captureSlide]);

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
      <div className="flex-1 relative flex">
        {/* Navigation arrows */}
        {!isSingleSlide && slides.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-gray-800/70 hover:bg-gray-700 text-white rounded-full transition-all disabled:opacity-20 disabled:cursor-default backdrop-blur-sm"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1))}
              disabled={currentIndex === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-gray-800/70 hover:bg-gray-700 text-white rounded-full transition-all disabled:opacity-20 disabled:cursor-default backdrop-blur-sm"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Slide viewer — fills all available space */}
        <div className="shared-slide-viewer flex-1 bg-white overflow-hidden">
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
