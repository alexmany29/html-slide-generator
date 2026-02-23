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

  // ── PDF: render actual slide HTML with full styling via print window ──
  const downloadPdf = useCallback(() => {
    if (downloading || slides.length === 0) return;
    setDownloading(true);

    const parser = new DOMParser();
    const presTitle = presentation?.title || 'Presentacion';

    // Sanitize: strip editing artifacts + fix viewport units for print
    const sanitize = (html: string): string =>
      html
        .replace(/\s*contenteditable="[^"]*"/gi, '')
        .replace(/\s*data-visual-edit(="[^"]*")?/gi, '')
        .replace(/<html[^>]*\s+style="[^"]*"/gi, (m) => m.replace(/\s+style="[^"]*"/, ''))
        .replace(/<body[^>]*\s+style="[^"]*"/gi, (m) => m.replace(/\s+style="[^"]*"/, ''));

    // Transform CSS: replace viewport units, strip html/body overflow:hidden
    const transformCss = (css: string): string =>
      css
        // Replace 100vh/100vw with A4 landscape dimensions
        .replace(/100vh/g, '210mm')
        .replace(/100vw/g, '297mm')
        // Remove overflow:hidden from html,body rules (kills multi-page)
        .replace(/(html|body)\s*,?\s*(html|body)?\s*\{[^}]*\}/gi, (block) =>
          block
            .replace(/overflow\s*:\s*hidden\s*;?/gi, '')
            .replace(/height\s*:\s*100%\s*;?/gi, '')
        );

    // Collect unique styles + fonts from ALL slides, extract body content
    const stylesSeen = new Set<string>();
    const stylesList: string[] = [];

    const slidePages = slides.map((s, i) => {
      const clean = sanitize(s.htmlContent || '');
      const doc = parser.parseFromString(clean, 'text/html');

      // Gather <style> and <link rel="stylesheet"> from each slide
      doc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
        if (el.tagName === 'STYLE') {
          // Transform CSS to fix viewport units and strip overflow:hidden
          const transformed = transformCss(el.textContent || '');
          const key = transformed;
          if (!stylesSeen.has(key)) {
            stylesSeen.add(key);
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

      // Also replace viewport units in inline styles within body HTML
      let bodyHtml = doc.body ? doc.body.innerHTML : clean;
      bodyHtml = bodyHtml.replace(/100vh/g, '210mm').replace(/100vw/g, '297mm');

      return `<div class="slide-page"><div class="slide-inner">${bodyHtml}</div><div class="slide-badge">${i + 1} / ${slides.length}</div></div>`;
    });

    // Open print window and build the document
    const pw = window.open('', '_blank');
    if (!pw) { setDownloading(false); return; }

    const pd = pw.document;
    pd.open();
    pd.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
    pd.close();

    pd.title = presTitle + ' — PDF';

    // ── Add Tailwind CDN + Google Fonts ──
    const tailwind = pd.createElement('script');
    tailwind.src = 'https://cdn.tailwindcss.com';
    pd.head.appendChild(tailwind);

    const gfPre1 = pd.createElement('link');
    gfPre1.rel = 'preconnect';
    gfPre1.href = 'https://fonts.googleapis.com';
    pd.head.appendChild(gfPre1);

    const gfPre2 = pd.createElement('link');
    gfPre2.rel = 'preconnect';
    gfPre2.href = 'https://fonts.gstatic.com';
    gfPre2.crossOrigin = '';
    pd.head.appendChild(gfPre2);

    const gfLink = pd.createElement('link');
    gfLink.rel = 'stylesheet';
    gfLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap';
    pd.head.appendChild(gfLink);

    // ── Add collected slide styles ──
    const stylesDiv = pd.createElement('div');
    stylesDiv.innerHTML = stylesList.join('\n');
    while (stylesDiv.firstChild) {
      pd.head.appendChild(stylesDiv.firstChild);
    }

    // ── Print layout CSS ──
    const layoutStyle = pd.createElement('style');
    layoutStyle.textContent = `
      @page { size: landscape; margin: 0; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0 !important; padding: 0 !important;
        height: auto !important;
        overflow: visible !important;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .slide-page {
        width: 297mm; height: 210mm;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
        background: #ffffff;
      }
      .slide-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .slide-inner {
        width: 297mm; height: 210mm;
        overflow: hidden;
        transform-origin: top left;
      }
      .slide-badge {
        position: absolute;
        bottom: 5mm; right: 6mm;
        font-size: 8px;
        color: rgba(0,0,0,0.25);
        font-family: 'Inter', sans-serif;
        z-index: 9999;
      }
      img { max-width: 100%; height: auto; }
      /* Screen preview styles */
      @media screen {
        html { background: #1e1b4b; }
        body { background: #1e1b4b; padding: 24px; }
        .slide-page {
          margin: 0 auto 24px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.4);
          border-radius: 8px;
        }
        /* Loading overlay */
        .pdf-loading {
          position: fixed; inset: 0;
          background: #1e1b4b;
          display: flex; align-items: center; justify-content: center;
          z-index: 99999;
          flex-direction: column; gap: 16px;
          color: white; font-family: 'Inter', sans-serif;
        }
        .pdf-loading .spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(255,255,255,0.15);
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pdf-loading p { font-size: 14px; color: #c7d2fe; }
        .pdf-loading small { font-size: 11px; color: #818cf8; }
      }
    `;
    pd.head.appendChild(layoutStyle);

    // ── Loading overlay ──
    const loadingDiv = pd.createElement('div');
    loadingDiv.className = 'pdf-loading';
    loadingDiv.innerHTML = '<div class="spinner"></div><p>Preparando PDF...</p><small>Se abrira el dialogo de impresion. Selecciona "Guardar como PDF".</small>';
    pd.body.appendChild(loadingDiv);

    // ── Insert slide pages ──
    const container = pd.createElement('div');
    container.innerHTML = slidePages.join('');
    while (container.firstChild) {
      pd.body.appendChild(container.firstChild);
    }

    // ── Wait for Tailwind CDN + fonts, then scale + print ──
    const printScript = pd.createElement('script');
    printScript.textContent = `
      (function() {
        function doScaleAndPrint() {
          var pages = document.querySelectorAll('.slide-page');
          // Measure mm-to-px
          var ruler = document.createElement('div');
          ruler.style.cssText = 'position:absolute;visibility:hidden;width:297mm;height:210mm;';
          document.body.appendChild(ruler);
          var pageW = ruler.offsetWidth;
          var pageH = ruler.offsetHeight;
          document.body.removeChild(ruler);

          pages.forEach(function(page) {
            var inner = page.querySelector('.slide-inner');
            if (!inner) return;
            // Temporarily let content expand to measure
            inner.style.width = pageW + 'px';
            inner.style.height = 'auto';
            inner.style.overflow = 'visible';
            var cw = Math.max(inner.scrollWidth, pageW);
            var ch = Math.max(inner.scrollHeight, pageH);
            var sx = pageW / cw;
            var sy = pageH / ch;
            var scale = Math.min(sx, sy, 1);
            if (scale < 0.99) {
              inner.style.transform = 'scale(' + scale + ')';
              inner.style.width = (pageW / scale) + 'px';
              inner.style.height = (pageH / scale) + 'px';
            } else {
              inner.style.width = pageW + 'px';
              inner.style.height = pageH + 'px';
            }
            inner.style.overflow = 'hidden';
          });

          // Remove loading overlay
          var lo = document.querySelector('.pdf-loading');
          if (lo) lo.remove();

          // Print
          setTimeout(function() { window.print(); }, 400);
        }

        // Wait for Tailwind CDN to finish processing
        var attempts = 0;
        var check = setInterval(function() {
          attempts++;
          var ready = !!document.querySelector('style') && attempts > 10;
          if (ready || attempts > 40) {
            clearInterval(check);
            // Extra wait for fonts + images
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(doScaleAndPrint, 800);
              });
            } else {
              setTimeout(doScaleAndPrint, 2000);
            }
          }
        }, 200);
      })();
    `;
    pd.body.appendChild(printScript);

    // Reset state after delay
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
