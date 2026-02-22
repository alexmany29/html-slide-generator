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

  // ── PDF: extract structured text blocks from HTML ──
  const extractBlocks = useCallback((el: Element, indent = 0): Array<{type: string; text: string; level: number; indent: number}> => {
    const blocks: Array<{type: string; text: string; level: number; indent: number}> = [];

    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      const text = child.textContent?.trim();

      if (!text || ['script','style','svg','canvas','noscript','link','meta','img','video','audio','iframe'].includes(tag)) continue;

      if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
        blocks.push({ type: 'heading', text, level: parseInt(tag[1]), indent });
      } else if (['p','blockquote','figcaption','label','dt','dd','address','pre','code'].includes(tag)) {
        blocks.push({ type: 'text', text, level: 0, indent });
      } else if (tag === 'li') {
        blocks.push({ type: 'listItem', text, level: 0, indent });
      } else if (tag === 'ul' || tag === 'ol') {
        for (const li of Array.from(child.children)) {
          if (li.tagName.toLowerCase() === 'li') {
            const liText = li.textContent?.trim();
            if (liText) blocks.push({ type: 'listItem', text: liText, level: 0, indent: indent + 4 });
          }
        }
      } else if (tag === 'hr') {
        blocks.push({ type: 'divider', text: '', level: 0, indent: 0 });
      } else if (tag === 'a') {
        const href = (child as HTMLAnchorElement).getAttribute('href') || '';
        const linkText = href && href !== text ? `${text} (${href})` : text;
        blocks.push({ type: 'link', text: linkText, level: 0, indent });
      } else if (tag === 'table') {
        // Extract table rows as text
        child.querySelectorAll('tr').forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent?.trim()).filter(Boolean);
          if (cells.length > 0) blocks.push({ type: 'text', text: cells.join('  |  '), level: 0, indent });
        });
      } else {
        // Container elements — recurse
        if (child.children.length > 0) {
          blocks.push(...extractBlocks(child, indent));
        } else if (text) {
          blocks.push({ type: 'text', text, level: 0, indent });
        }
      }
    }
    return blocks;
  }, []);

  // ── PDF generation: pure text extraction + jsPDF ──
  const downloadPdf = useCallback(async () => {
    if (downloading || slides.length === 0) return;
    setDownloading(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210, PH = 297, M = 15, CW = PW - M * 2;
      const parser = new DOMParser();

      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage();

        const cleanHtml = (slides[i].htmlContent || '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        const doc = parser.parseFromString(cleanHtml, 'text/html');
        const title = doc.querySelector('title')?.textContent?.trim() || `Slide ${i + 1}`;

        let y = M;

        // ─ Slide badge ─
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(M, y, 32, 7, 1.5, 1.5, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Slide ${i + 1} / ${slides.length}`, M + 3, y + 5);
        y += 12;

        // ─ Title ─
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const titleLines = pdf.splitTextToSize(title, CW);
        pdf.text(titleLines, M, y);
        y += titleLines.length * 7 + 4;

        // ─ Divider ─
        pdf.setDrawColor(200, 210, 225);
        pdf.setLineWidth(0.4);
        pdf.line(M, y, M + CW, y);
        y += 6;

        // ─ Content blocks ─
        const blocks = extractBlocks(doc.body);

        for (const block of blocks) {
          const bIndent = block.indent || 0;

          switch (block.type) {
            case 'heading': {
              y += 3;
              const sz = block.level <= 1 ? 13 : block.level === 2 ? 11.5 : 10.5;
              pdf.setFontSize(sz);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(15, 23, 42);
              const lines = pdf.splitTextToSize(block.text, CW - bIndent);
              const lh = sz * 0.45;
              if (y + lines.length * lh > PH - M) { pdf.addPage(); y = M; }
              pdf.text(lines, M + bIndent, y);
              y += lines.length * lh + 2;
              break;
            }
            case 'text': {
              pdf.setFontSize(9.5);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(55, 65, 81);
              const lines = pdf.splitTextToSize(block.text, CW - bIndent);
              const lh = 4;
              if (y + lines.length * lh > PH - M) { pdf.addPage(); y = M; }
              pdf.text(lines, M + bIndent, y);
              y += lines.length * lh + 1.5;
              break;
            }
            case 'listItem': {
              pdf.setFontSize(9.5);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(55, 65, 81);
              const bx = M + bIndent;
              const lines = pdf.splitTextToSize(block.text, CW - bIndent - 5);
              const lh = 4;
              if (y + lines.length * lh > PH - M) { pdf.addPage(); y = M; }
              pdf.setFontSize(7);
              pdf.text('\u2022', bx, y);
              pdf.setFontSize(9.5);
              pdf.text(lines, bx + 4, y);
              y += lines.length * lh + 1;
              break;
            }
            case 'link': {
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(79, 70, 229);
              const lines = pdf.splitTextToSize(block.text, CW - bIndent);
              const lh = 3.8;
              if (y + lines.length * lh > PH - M) { pdf.addPage(); y = M; }
              pdf.text(lines, M + bIndent, y);
              y += lines.length * lh + 1.5;
              pdf.setTextColor(55, 65, 81);
              break;
            }
            case 'divider': {
              y += 2;
              pdf.setDrawColor(226, 232, 240);
              pdf.setLineWidth(0.2);
              pdf.line(M, y, M + CW, y);
              y += 4;
              break;
            }
          }
        }
      }

      // ─ Page footer on every page ─
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `${presentation?.title || 'Presentacion'} — Pag. ${p} / ${totalPages}`,
          M, PH - 8
        );
      }

      pdf.save(`${presentation?.title || 'Presentacion'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloading(false);
    }
  }, [downloading, slides, presentation, extractBlocks]);

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
