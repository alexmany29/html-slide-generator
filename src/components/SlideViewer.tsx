import { useRef, useEffect, useState, useCallback } from 'react';
import { FileText, Pencil, AlertTriangle } from 'lucide-react';
import { Slide } from '../types';

interface SlideViewerProps {
  slide: Slide;
  onSlideUpdate?: (updates: Partial<Slide>) => void;
  isPresentation?: boolean;
  readOnly?: boolean;
  enableVisualEditing?: boolean;
  isVisualEditMode?: boolean;
}

// Marker attribute so we know which elements WE made editable
const EDIT_MARKER = 'data-visual-edit';
// ID for our injected style tag
const EDIT_STYLE_ID = '__visual-edit-styles';

export default function SlideViewer({ slide, onSlideUpdate, isPresentation = false, readOnly = false, enableVisualEditing = false, isVisualEditMode: externalVisualEditMode }: SlideViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isVisualEditMode = externalVisualEditMode || false;

  // Refs so closures inside the iframe always see current values
  const visualEditRef = useRef(isVisualEditMode);
  const onSlideUpdateRef = useRef(onSlideUpdate);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeReadyRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { visualEditRef.current = isVisualEditMode; }, [isVisualEditMode]);
  useEffect(() => { onSlideUpdateRef.current = onSlideUpdate; }, [onSlideUpdate]);

  const isEmpty = !slide.htmlContent || slide.htmlContent.trim() === '';

  // ── Sanitize HTML: strip any leftover contenteditable / edit markers ──
  const sanitizeHtml = useCallback((html: string): string => {
    return html
      .replace(/\s*contenteditable="[^"]*"/gi, '')
      .replace(/\s*data-visual-edit(="[^"]*")?/gi, '')
      // Strip leaked configureIframe inline styles from <html> and <body> tags
      .replace(/(<html[^>]*)\s+style="[^"]*"/gi, '$1')
      .replace(/(<body[^>]*)\s+style="[^"]*"/gi, '$1');
  }, []);

  // ── Extract clean HTML from iframe (strips all our edit artifacts) ──
  const getCleanHtml = useCallback((iframeDoc: Document): string => {
    // Clone the document so we don't mutate the live DOM
    const clone = iframeDoc.documentElement.cloneNode(true) as HTMLElement;

    // Remove our injected style
    clone.querySelector(`#${EDIT_STYLE_ID}`)?.remove();

    // Remove contenteditable and our marker from all elements
    clone.querySelectorAll(`[${EDIT_MARKER}]`).forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute(EDIT_MARKER);
    });

    // Strip leaked configureIframe inline styles from html/body
    clone.removeAttribute('style');
    const bodyClone = clone.querySelector('body');
    if (bodyClone) bodyClone.removeAttribute('style');

    return clone.outerHTML;
  }, []);

  // ── Debounced save: waits 600ms after last edit ──
  const scheduleSave = useCallback((iframeDoc: Document) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!visualEditRef.current || !onSlideUpdateRef.current) return;
      const cleanHtml = getCleanHtml(iframeDoc);
      onSlideUpdateRef.current({ htmlContent: cleanHtml });
    }, 600);
  }, [getCleanHtml]);

  // ── Enable visual editing on the iframe document ──
  const enableEditMode = useCallback((iframeDoc: Document) => {
    // Prevent double-init
    if (iframeDoc.getElementById(EDIT_STYLE_ID)) return;

    // Inject edit styles (single style tag, easy to remove)
    const style = iframeDoc.createElement('style');
    style.id = EDIT_STYLE_ID;
    style.textContent = `
      [${EDIT_MARKER}] {
        outline: 1px dashed rgba(99,102,241,0.4) !important;
        outline-offset: 2px !important;
        cursor: text !important;
        transition: outline-color 0.15s, background-color 0.15s !important;
      }
      [${EDIT_MARKER}]:hover {
        outline-color: rgba(99,102,241,0.7) !important;
        background-color: rgba(99,102,241,0.04) !important;
      }
      [${EDIT_MARKER}]:focus {
        outline: 2px solid #6366f1 !important;
        outline-offset: 2px !important;
        background-color: rgba(99,102,241,0.06) !important;
      }
    `;
    iframeDoc.head?.appendChild(style);

    // Make leaf text elements editable
    const selector = 'p, h1, h2, h3, h4, h5, h6, li, td, th, figcaption, blockquote, label, summary';
    iframeDoc.querySelectorAll(selector).forEach(el => {
      const htmlEl = el as HTMLElement;
      // Only target elements that have direct text content (not wrapper divs)
      if (htmlEl.textContent?.trim()) {
        htmlEl.contentEditable = 'true';
        htmlEl.setAttribute(EDIT_MARKER, '');
      }
    });

    // Also make span/a that are leaf nodes (no child elements) editable
    iframeDoc.querySelectorAll('span, a').forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.children.length === 0 && htmlEl.textContent?.trim()) {
        htmlEl.contentEditable = 'true';
        htmlEl.setAttribute(EDIT_MARKER, '');
      }
    });

    // Single input handler on the document (uses event delegation)
    const handleInput = () => {
      if (visualEditRef.current) {
        scheduleSave(iframeDoc);
      }
    };

    // Store handler reference for cleanup
    (iframeDoc as any).__visualEditHandler = handleInput;
    iframeDoc.addEventListener('input', handleInput);
  }, [scheduleSave]);

  // ── Disable visual editing: reload iframe with clean content ──
  const disableEditMode = useCallback(() => {
    // Cancel any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    // Do a final save of any pending changes before disabling
    if (onSlideUpdateRef.current) {
      const cleanHtml = getCleanHtml(iframeDoc);
      onSlideUpdateRef.current({ htmlContent: cleanHtml });
    }

    // Remove the input handler
    const handler = (iframeDoc as any).__visualEditHandler;
    if (handler) {
      iframeDoc.removeEventListener('input', handler);
      delete (iframeDoc as any).__visualEditHandler;
    }

    // Remove our style tag
    iframeDoc.getElementById(EDIT_STYLE_ID)?.remove();

    // Remove contenteditable and marker from all elements
    iframeDoc.querySelectorAll(`[${EDIT_MARKER}]`).forEach(el => {
      (el as HTMLElement).contentEditable = 'inherit';
      el.removeAttribute('contenteditable');
      el.removeAttribute(EDIT_MARKER);
    });
  }, [getCleanHtml]);

  // ── Main iframe initialization ──
  useEffect(() => {
    if (!slide.htmlContent || !iframeRef.current) return;

    const iframe = iframeRef.current;
    iframeReadyRef.current = false;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    const initializeIframe = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('No se pudo acceder al documento del iframe.');
        }

        iframeDoc.open();
        iframeDoc.write(sanitizeHtml(slide.htmlContent));
        iframeDoc.close();

        const configureIframe = () => {
          try {
            const iframeBody = iframeDoc.body;
            if (iframeBody) {
              iframeBody.style.margin = '0';
              if (isPresentation) {
                // Presentation / shared view: respect the slide's own styles.
                // These are full web pages with Tailwind CDN, custom fonts,
                // grid layouts, overflow hidden, etc. Only set padding 0.
                iframeBody.style.padding = '0';
              } else {
                // Editor view: provide sensible defaults for simple slides
                iframeBody.style.padding = '20px';
                iframeBody.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                iframeBody.style.lineHeight = '1.6';
                iframeBody.style.color = '#374151';
                iframeBody.style.backgroundColor = '#ffffff';
                iframeBody.style.overflow = 'visible';
              }
            }

            const iframeHtml = iframeDoc.documentElement;
            if (iframeHtml) {
              if (isPresentation) {
                // Remove any leaked inline styles from previous editor saves
                iframeHtml.removeAttribute('style');
                iframeBody?.removeAttribute('style');
                // Re-apply only margin/padding 0
                if (iframeBody) {
                  iframeBody.style.margin = '0';
                  iframeBody.style.padding = '0';
                }
              } else {
                iframeHtml.style.height = 'auto';
                iframeHtml.style.overflow = 'visible';
              }
            }

            if (!iframeDoc.querySelector('meta[name="viewport"]')) {
              const viewport = iframeDoc.createElement('meta');
              viewport.name = 'viewport';
              viewport.content = 'width=device-width, initial-scale=1.0';
              iframeDoc.head?.appendChild(viewport);
            }

            // Execute scripts
            const executeScripts = async () => {
              const scripts = Array.from(iframeDoc.querySelectorAll('script'));

              if (scripts.length === 0) {
                setTimeout(() => setIsLoading(false), 300);
                iframeReadyRef.current = true;
                return;
              }

              const externalScripts = scripts.filter(s => s.src);
              const inlineScripts = scripts.filter(s => s.textContent && !s.src);

              for (const script of externalScripts) {
                try {
                  await new Promise((resolve) => {
                    const newScript = iframeDoc.createElement('script');
                    newScript.src = script.src;
                    newScript.async = false;
                    newScript.defer = false;
                    if (script.type) newScript.type = script.type;
                    if (script.crossOrigin) newScript.crossOrigin = script.crossOrigin;
                    if (script.integrity) newScript.integrity = script.integrity;
                    newScript.onload = () => resolve(true);
                    newScript.onerror = () => resolve(false);
                    if (script.parentNode) {
                      script.parentNode.replaceChild(newScript, script);
                    } else {
                      iframeDoc.head.appendChild(newScript);
                    }
                  });
                } catch (error) {
                  console.warn('Error loading external script:', error);
                }
              }

              for (const script of inlineScripts) {
                try {
                  const newScript = iframeDoc.createElement('script');
                  newScript.type = script.type || 'text/javascript';
                  newScript.textContent = `try { ${script.textContent} } catch(e) { console.warn('Inline script error:', e); }`;
                  if (script.parentNode) {
                    script.parentNode.replaceChild(newScript, script);
                  } else {
                    iframeDoc.body.appendChild(newScript);
                  }
                } catch (error) {
                  console.warn('Error processing inline script:', error);
                }
              }

              setTimeout(() => {
                try {
                  if (iframeDoc.defaultView) {
                    iframeDoc.dispatchEvent(new iframeDoc.defaultView.Event('DOMContentLoaded', { bubbles: true }));
                    iframeDoc.defaultView.dispatchEvent(new iframeDoc.defaultView.Event('load', { bubbles: true }));
                  }
                } catch (e) {
                  // Silently ignore
                }
                setIsLoading(false);
                iframeReadyRef.current = true;
              }, 500);
            };

            executeScripts();

            // Auto-height for non-presentation mode
            if (!isPresentation) {
              const adjustHeight = () => {
                try {
                  if (!iframeRef.current) return;
                  setTimeout(() => {
                    const contentHeight = Math.max(
                      iframeDoc.body?.scrollHeight || 0,
                      iframeDoc.body?.offsetHeight || 0,
                      iframeDoc.documentElement?.scrollHeight || 0,
                      iframeDoc.documentElement?.offsetHeight || 0
                    );
                    if (contentHeight > 0 && iframeRef.current) {
                      iframeRef.current.style.height = `${Math.max(contentHeight + 40, 600)}px`;
                    }
                  }, 1000);
                } catch {
                  // Ignore height errors
                }
              };
              setTimeout(adjustHeight, 100);
              if (window.ResizeObserver && iframeDoc.body) {
                const ro = new ResizeObserver(adjustHeight);
                ro.observe(iframeDoc.body);
              }
            }
          } catch (error) {
            console.error('Error configuring iframe:', error);
            setHasError(true);
            setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
            setIsLoading(false);
          }
        };

        if (iframeDoc.readyState === 'complete') {
          setTimeout(configureIframe, 100);
        } else {
          iframe.addEventListener('load', () => setTimeout(configureIframe, 100), { once: true });
          setTimeout(configureIframe, 2000);
        }
      } catch (error) {
        console.error('Error initializing iframe:', error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(initializeIframe, 50);
    return () => { clearTimeout(timeoutId); };
  }, [slide.htmlContent, isPresentation]);

  // ── Toggle visual editing when mode changes ──
  useEffect(() => {
    if (!enableVisualEditing || readOnly) return;

    const applyEditMode = () => {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;

      if (isVisualEditMode) {
        enableEditMode(iframeDoc);
      } else {
        disableEditMode();
      }
    };

    // If iframe is already ready, apply immediately; otherwise wait
    if (iframeReadyRef.current) {
      applyEditMode();
    } else {
      const timer = setTimeout(applyEditMode, 700);
      return () => clearTimeout(timer);
    }
  }, [isVisualEditMode, enableVisualEditing, readOnly, enableEditMode, disableEditMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);



  // Manejar contenido vacío después de todos los hooks
  if (isEmpty) {
    return (
      <div className="w-full h-full relative bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileText size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Slide vacío</h3>
          <p className="text-sm text-gray-500">
            Este slide no tiene contenido HTML.
            {!isPresentation && ' Haz clic en "Editar HTML" para agregar contenido.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-100">

      
      {/* Visual edit mode indicator */}
      {isVisualEditMode && (
        <div className="absolute top-3 left-3 z-20 bg-amber-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-sm">
          <Pencil size={12} />
          <span>Edicion visual</span>
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-gray-500">Cargando contenido...</p>
          </div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
          <div className="text-center p-6 max-w-sm">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-red-800 mb-1">Error al cargar</h3>
            <p className="text-xs text-red-600 mb-3">{errorMessage}</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                // Forzar recarga
                if (iframeRef.current) {
                  iframeRef.current.src = 'about:blank';
                  setTimeout(() => {
                    const iframe = iframeRef.current;
                    if (iframe && slide.htmlContent) {
                      const initializeIframe = () => {
                        try {
                          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                          if (iframeDoc) {
                            iframeDoc.open();
                            iframeDoc.write(slide.htmlContent);
                            iframeDoc.close();
                            setIsLoading(false);
                          }
                        } catch (error) {
                          console.error('Error en recarga:', error);
                          setIsLoading(false);
                        }
                      };
                      setTimeout(initializeIframe, 100);
                    }
                  }, 100);
                }
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        title="Slide Content"
        className="w-full border-none bg-white"
sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin allow-downloads allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation allow-popups-to-escape-sandbox"
        style={{
          height: isPresentation ? '100%' : '100%',
          display: (isLoading || hasError) ? 'none' : 'block',
          minHeight: isPresentation ? '0' : '600px',
          width: '100%',
        }}
      />
    </div>
  );
}