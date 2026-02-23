import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { shareLinkService, Presentation } from '../lib/supabase';
import { dbSlideToUi } from '../types';
import type { Slide as UiSlide } from '../types';
import { Layers, ChevronLeft, ChevronRight, Maximize, Minimize, FileText, AlertTriangle, Download, Loader2 } from 'lucide-react';
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

  // ── PDF: continuous flow — no fixed pages, no overflow:hidden, just all content ──
  const downloadPdf = useCallback(() => {
    if (downloading || slides.length === 0) return;
    setDownloading(true);

    const parser = new DOMParser();
    const presTitle = presentation?.title || 'Presentacion';

    // Strip editing artifacts
    const sanitize = (html: string): string =>
      html
        .replace(/\s*contenteditable="[^"]*"/gi, '')
        .replace(/\s*data-visual-edit(="[^"]*")?/gi, '');

    // Transform CSS for print: remove anything that constrains/hides content
    const transformCss = (css: string): string =>
      css
        .replace(/100vh/g, 'auto')
        .replace(/100vw/g, '100%')
        .replace(/overflow\s*:\s*hidden/gi, 'overflow: visible')
        .replace(/height\s*:\s*100%/g, 'height: auto')
        .replace(/min-height\s*:\s*100vh/g, 'min-height: auto')
        .replace(/max-height\s*:\s*100vh/g, 'max-height: none');

    // Collect styles + build slide sections
    const stylesSeen = new Set<string>();
    const stylesList: string[] = [];

    const sections = slides.map((s, i) => {
      const clean = sanitize(s.htmlContent || '');
      const doc = parser.parseFromString(clean, 'text/html');

      doc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
        if (el.tagName === 'STYLE') {
          const transformed = transformCss(el.textContent || '');
          if (!stylesSeen.has(transformed)) {
            stylesSeen.add(transformed);
            stylesList.push(`<style>${transformed}</style>`);
          }
        } else {
          const key = el.outerHTML;
          if (!stylesSeen.has(key)) {
            stylesSeen.add(key);
            stylesList.push(key);
          }
        }
      });

      let bodyHtml = doc.body ? doc.body.innerHTML : clean;
      bodyHtml = bodyHtml
        .replace(/100vh/g, 'auto')
        .replace(/100vw/g, '100%')
        .replace(/overflow:\s*hidden/g, 'overflow: visible');

      const slideTitle = doc.querySelector('title')?.textContent?.trim() || `Slide ${i + 1}`;

      return `
        <section class="slide-section">
          <div class="slide-header">
            <span class="slide-num">${i + 1}</span>
            <span class="slide-title">${slideTitle}</span>
          </div>
          <div class="slide-body">${bodyHtml}</div>
        </section>
      `;
    });

    // Open print window
    const pw = window.open('', '_blank');
    if (!pw) { setDownloading(false); return; }

    const pd = pw.document;
    pd.open();
    pd.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
    pd.close();
    pd.title = presTitle + ' — PDF';

    // Tailwind CDN + Google Fonts
    const tw = pd.createElement('script');
    tw.src = 'https://cdn.tailwindcss.com';
    pd.head.appendChild(tw);

    ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach(href => {
      const link = pd.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      if (href.includes('gstatic')) link.crossOrigin = '';
      pd.head.appendChild(link);
    });

    const gf = pd.createElement('link');
    gf.rel = 'stylesheet';
    gf.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap';
    pd.head.appendChild(gf);

    // Slide styles
    const sd = pd.createElement('div');
    sd.innerHTML = stylesList.join('\n');
    while (sd.firstChild) pd.head.appendChild(sd.firstChild);

    // Layout CSS — continuous flow, no fixed dimensions
    const style = pd.createElement('style');
    style.textContent = `
      @page { margin: 10mm 12mm; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0 !important; padding: 0 !important;
        height: auto !important;
        overflow: visible !important;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .slide-section {
        width: 100%;
        overflow: visible !important;
        margin-bottom: 16px;
        page-break-inside: avoid;
      }
      .slide-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: linear-gradient(135deg, #4338ca, #6366f1);
        color: #fff;
        border-radius: 8px 8px 0 0;
        font-family: 'Inter', sans-serif;
      }
      .slide-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px; height: 28px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
      }
      .slide-title {
        font-weight: 600;
        font-size: 15px;
      }
      .slide-body {
        overflow: visible !important;
        padding: 0;
        border: 1px solid #e5e7eb;
        border-top: none;
        border-radius: 0 0 8px 8px;
        background: #fff;
      }
      .slide-body > * {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      /* Override any grid/flex that uses 100vh */
      .main-grid, [class*="grid"] {
        height: auto !important;
        min-height: 0 !important;
      }
      /* Make sure scrollable areas show all content */
      [style*="overflow"], .overflow-y-auto, .overflow-auto, .overflow-hidden, .overflow-x-auto {
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
      }
      img { max-width: 100%; height: auto; }
      /* Separator between slides */
      .slide-section + .slide-section { margin-top: 24px; }
      /* Screen preview */
      @media screen {
        html { background: #f1f5f9; }
        body { background: #f1f5f9; padding: 24px; max-width: 1100px; margin: 0 auto; }
        .pdf-loading {
          position: fixed; inset: 0; background: rgba(30,27,75,0.95);
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 12px; z-index: 99999;
          color: #fff; font-family: 'Inter', sans-serif;
        }
        .pdf-loading .spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(255,255,255,0.15);
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pdf-loading p { font-size: 14px; color: #c7d2fe; margin: 0; }
        .pdf-loading small { font-size: 11px; color: #818cf8; }
      }
    `;
    pd.head.appendChild(style);

    // Loading overlay
    const lo = pd.createElement('div');
    lo.className = 'pdf-loading';
    lo.innerHTML = '<div class="spinner"></div><p>Preparando PDF...</p><small>Se abrira el dialogo de impresion. Selecciona "Guardar como PDF".</small>';
    pd.body.appendChild(lo);

    // Insert all slide sections
    const c = pd.createElement('div');
    c.innerHTML = sections.join('');
    while (c.firstChild) pd.body.appendChild(c.firstChild);

    // Wait for Tailwind + fonts, then print
    const sc = pd.createElement('script');
    sc.textContent = `
      (function() {
        function doPrint() {
          // Force all elements to be visible
          document.querySelectorAll('*').forEach(function(el) {
            var s = getComputedStyle(el);
            if (s.overflow === 'hidden' || s.overflowY === 'hidden') {
              el.style.setProperty('overflow', 'visible', 'important');
            }
            if (s.height && s.height.includes('vh')) {
              el.style.setProperty('height', 'auto', 'important');
            }
            if (s.maxHeight !== 'none' && s.maxHeight !== '') {
              el.style.setProperty('max-height', 'none', 'important');
            }
          });
          // Remove loading
          var lo = document.querySelector('.pdf-loading');
          if (lo) lo.remove();
          setTimeout(function() { window.print(); }, 300);
        }
        var attempts = 0;
        var check = setInterval(function() {
          attempts++;
          if (attempts > 40 || (document.querySelector('style') && attempts > 8)) {
            clearInterval(check);
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() { setTimeout(doPrint, 600); });
            } else {
              setTimeout(doPrint, 1500);
            }
          }
        }, 200);
      })();
    `;
    pd.body.appendChild(sc);

    setTimeout(() => setDownloading(false), 6000);
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
