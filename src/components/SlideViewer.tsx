import { useRef, useEffect, useState } from 'react';
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

export default function SlideViewer({ slide, onSlideUpdate, isPresentation = false, readOnly = false, enableVisualEditing = false, isVisualEditMode: externalVisualEditMode }: SlideViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isVisualEditMode = externalVisualEditMode || false;
  
  // Verificar si el contenido está vacío
  const isEmpty = !slide.htmlContent || slide.htmlContent.trim() === '';
  
  // Todos los hooks deben estar antes de cualquier early return

  useEffect(() => {
    if (!slide.htmlContent || !iframeRef.current) return;

    const iframe = iframeRef.current;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    const initializeIframe = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('No se pudo acceder al documento del iframe. Posible problema de CORS o sandbox.');
        }

        // Limpiar y escribir el contenido HTML completo
        iframeDoc.open();
        iframeDoc.write(slide.htmlContent);
        iframeDoc.close();

        const configureIframe = () => {
          try {
            // Configurar estilos base del iframe
            const iframeBody = iframeDoc.body;
            if (iframeBody) {
              iframeBody.style.margin = '0';
              iframeBody.style.padding = isPresentation ? '0' : '20px';
              iframeBody.style.fontFamily = 'system-ui, -apple-system, sans-serif';
              iframeBody.style.lineHeight = '1.6';
              iframeBody.style.color = '#374151';
              iframeBody.style.backgroundColor = '#ffffff';
              iframeBody.style.overflow = isPresentation ? 'auto' : 'visible';
            }

            // Configurar el documento del iframe
            const iframeHtml = iframeDoc.documentElement;
            if (iframeHtml) {
              iframeHtml.style.height = isPresentation ? '100vh' : 'auto';
              iframeHtml.style.overflow = isPresentation ? 'auto' : 'visible';
            }

            // Habilitar edición visual si está activada
            if (enableVisualEditing && isVisualEditMode && !readOnly) {
              // Usar setTimeout para asegurar que el DOM esté completamente cargado
              setTimeout(() => {
                if (iframeRef.current && iframeRef.current.contentDocument && isVisualEditMode) {
                  enableVisualEditingMode(iframeRef.current.contentDocument);
                }
              }, 100);
            }

            // Agregar meta viewport si no existe (importante para contenido responsive)
            if (!iframeDoc.querySelector('meta[name="viewport"]')) {
              const viewport = iframeDoc.createElement('meta');
              viewport.name = 'viewport';
              viewport.content = 'width=device-width, initial-scale=1.0';
              iframeDoc.head?.appendChild(viewport);
            }

            // Mejorar la ejecución de JavaScript
            const executeScripts = async () => {
              const scripts = Array.from(iframeDoc.querySelectorAll('script'));
              
              if (scripts.length === 0) {
                setTimeout(() => setIsLoading(false), 300);
                return;
              }

              // Separar scripts externos e inline
              const externalScripts = scripts.filter(s => s.src);
              const inlineScripts = scripts.filter(s => s.textContent && !s.src);
              
              // Cargar scripts externos primero
              for (const script of externalScripts) {
                try {
                  await new Promise((resolve) => {
                    const newScript = iframeDoc.createElement('script');
                    newScript.src = script.src;
                    newScript.async = false;
                    newScript.defer = false;
                    
                    // Copiar atributos importantes
                    if (script.type) newScript.type = script.type;
                    if (script.crossOrigin) newScript.crossOrigin = script.crossOrigin;
                    if (script.integrity) newScript.integrity = script.integrity;
                    
                    newScript.onload = () => {
                      resolve(true);
                    };
                    
                    newScript.onerror = (error) => {
                      console.warn(`Error cargando script: ${script.src}`, error);
                      resolve(false); // Continuar aunque falle
                    };
                    
                    // Reemplazar el script original
                    if (script.parentNode) {
                      script.parentNode.replaceChild(newScript, script);
                    } else {
                      iframeDoc.head.appendChild(newScript);
                    }
                  });
                } catch (error) {
                  console.warn(`Error procesando script externo:`, error);
                }
              }
              
              // Ejecutar scripts inline después
              for (const script of inlineScripts) {
                try {
                  const newScript = iframeDoc.createElement('script');
                  newScript.type = script.type || 'text/javascript';
                  
                  // Envolver el código en un try-catch para mejor manejo de errores
                  const wrappedCode = `
                    try {
                      ${script.textContent}
                    } catch (error) {
                      console.warn('Error en script inline:', error);
                    }
                  `;
                  
                  newScript.textContent = wrappedCode;
                  
                  if (script.parentNode) {
                    script.parentNode.replaceChild(newScript, script);
                  } else {
                    iframeDoc.body.appendChild(newScript);
                  }
                  
                } catch (error) {
                  console.warn('Error procesando script inline:', error);
                }
              }
              
              // Disparar evento DOMContentLoaded si no se ha disparado
              setTimeout(() => {
                try {
                  if (iframeDoc.defaultView) {
                    const event = new iframeDoc.defaultView.Event('DOMContentLoaded', {
                      bubbles: true,
                      cancelable: true
                    });
                    iframeDoc.dispatchEvent(event);
                    
                    // También disparar load event
                    const loadEvent = new iframeDoc.defaultView.Event('load', {
                      bubbles: true,
                      cancelable: true
                    });
                    iframeDoc.defaultView.dispatchEvent(loadEvent);
                  }
                } catch (e) {
                  console.warn('Error disparando eventos:', e);
                }
                
                setIsLoading(false);
              }, 500);
            };
            
            executeScripts();

            // Ajustar altura automáticamente si no es presentación
            if (!isPresentation) {
              const adjustHeight = () => {
                try {
                  if (iframeRef.current) {
                    // Esperar un poco más para que el contenido se renderice completamente
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
                    }, 1000); // Aumentar el tiempo para contenido dinámico
                  }
                } catch (error) {
                  console.warn('Error ajustando altura:', error);
                }
              };
              
              // Ajustar altura inicial
              setTimeout(adjustHeight, 100);
              
              // Observar cambios en el contenido
              if (window.ResizeObserver && iframeDoc.body) {
                const resizeObserver = new ResizeObserver(adjustHeight);
                resizeObserver.observe(iframeDoc.body);
              }
            }
          } catch (error) {
            console.error('Error configurando iframe:', error);
            setHasError(true);
            setErrorMessage(`Error configurando el contenido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            setIsLoading(false);
          }
        };

        // Esperar a que el contenido se cargue completamente
        if (iframeDoc.readyState === 'complete') {
          setTimeout(configureIframe, 100);
        } else {
          const handleLoad = () => {
            setTimeout(configureIframe, 100);
          };

          iframe.addEventListener('load', handleLoad, { once: true });
          iframeDoc.addEventListener('DOMContentLoaded', handleLoad, { once: true });

          // Fallback timeout por si acaso
          setTimeout(configureIframe, 2000);
        }
      } catch (error) {
        console.error('Error inicializando iframe:', error);
        setHasError(true);
        setErrorMessage(`Error inicializando el iframe: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };

    // Inicializar después de un pequeño delay
    const timeoutId = setTimeout(initializeIframe, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [slide.htmlContent, isPresentation, enableVisualEditing, readOnly]);

  // Función para habilitar el modo de edición visual
  const enableVisualEditingMode = (iframeDoc: Document) => {
    try {
      // Hacer todos los elementos de texto editables
      const textElements = iframeDoc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, li, td, th, a');
      textElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.children.length === 0 || htmlElement.textContent?.trim()) {
          htmlElement.contentEditable = 'true';
          htmlElement.style.outline = '1px dashed #3b82f6';
          htmlElement.style.outlineOffset = '2px';
          htmlElement.style.cursor = 'text';
          
          // Agregar evento para guardar cambios
          htmlElement.addEventListener('blur', async () => {
            await saveVisualChanges(iframeDoc);
          });
        }
      });

      // Agregar botones de eliminar a elementos
      const allElements = iframeDoc.querySelectorAll('*:not(html):not(head):not(body):not(script):not(style):not(meta):not(title)');
      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.tagName !== 'BUTTON' && !htmlElement.classList.contains('delete-btn')) {
          // Guardar la posición original si existe
          if (htmlElement.style.position && htmlElement.style.position !== 'relative') {
            htmlElement.setAttribute('data-original-position', htmlElement.style.position);
          }
          htmlElement.style.position = 'relative';
          
          // Crear botón de eliminar
          const deleteBtn = iframeDoc.createElement('button');
          deleteBtn.innerHTML = '×';
          deleteBtn.className = 'delete-btn';
          deleteBtn.style.cssText = `
            position: absolute;
            top: -10px;
            right: -10px;
            width: 20px;
            height: 20px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            display: none;
            z-index: 1000;
            line-height: 1;
          `;
          
          // Mostrar botón al hacer hover
          htmlElement.addEventListener('mouseenter', () => {
            deleteBtn.style.display = 'block';
          });
          
          htmlElement.addEventListener('mouseleave', () => {
            deleteBtn.style.display = 'none';
          });
          
          // Eliminar elemento al hacer clic
          deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('¿Eliminar este elemento?')) {
              htmlElement.remove();
              await saveVisualChanges(iframeDoc);
            }
          });
          
          htmlElement.appendChild(deleteBtn);
        }
      });

      // Agregar estilos para el modo de edición
      const style = iframeDoc.createElement('style');
      style.textContent = `
        [contenteditable="true"]:hover {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        [contenteditable="true"]:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
          background-color: rgba(59, 130, 246, 0.05) !important;
        }
      `;
      iframeDoc.head?.appendChild(style);
      
    } catch (error) {
      console.error('Error habilitando edición visual:', error);
    }
  };

  // Función para re-ejecutar scripts después de cambios
  const reExecuteScripts = async (iframeDoc: Document) => {
    try {
      // Encontrar todos los scripts en el documento
      const scripts = Array.from(iframeDoc.querySelectorAll('script'));
      
      if (scripts.length === 0) return;
      
      
      // Separar scripts externos e inline
      const externalScripts = scripts.filter(s => s.src);
      const inlineScripts = scripts.filter(s => s.textContent && !s.src);
      
      // Re-ejecutar scripts externos primero
      for (const script of externalScripts) {
        try {
          if (script.src && !script.src.includes('tailwindcss')) {
            const newScript = iframeDoc.createElement('script');
            newScript.src = script.src;
            newScript.async = false;
            newScript.defer = false;
            
            if (script.type) newScript.type = script.type;
            if (script.crossOrigin) newScript.crossOrigin = script.crossOrigin;
            if (script.integrity) newScript.integrity = script.integrity;
            
            await new Promise((resolve) => {
              newScript.onload = () => resolve(true);
              newScript.onerror = () => resolve(false);
              
              if (script.parentNode) {
                script.parentNode.replaceChild(newScript, script);
              }
            });
          }
        } catch (error) {
          console.warn('Error re-ejecutando script externo:', error);
        }
      }
      
      // Re-ejecutar scripts inline
      for (const script of inlineScripts) {
        try {
          const newScript = iframeDoc.createElement('script');
          newScript.type = script.type || 'text/javascript';
          
          // Envolver en try-catch para manejo de errores
          const wrappedCode = `
            try {
              ${script.textContent}
            } catch (error) {
              console.warn('Error en script inline después de edición:', error);
            }
          `;
          
          newScript.textContent = wrappedCode;
          
          if (script.parentNode) {
            script.parentNode.replaceChild(newScript, script);
          }
          
        } catch (error) {
          console.warn('Error re-ejecutando script inline:', error);
        }
      }
      
      // Disparar eventos para re-inicializar componentes
      setTimeout(() => {
        try {
          if (iframeDoc.defaultView) {
            // Disparar evento personalizado para re-inicialización
            const reinitEvent = new iframeDoc.defaultView.CustomEvent('slideContentChanged', {
              bubbles: true,
              detail: { timestamp: Date.now() }
            });
            iframeDoc.dispatchEvent(reinitEvent);
            
            // También disparar resize para componentes que dependan del tamaño
            const resizeEvent = new iframeDoc.defaultView.Event('resize');
            iframeDoc.defaultView.dispatchEvent(resizeEvent);
          }
        } catch (e) {
          console.warn('Error disparando eventos de re-inicialización:', e);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error general re-ejecutando scripts:', error);
    }
  };
  
  // Función para guardar cambios visuales
  const saveVisualChanges = async (iframeDoc: Document) => {
    if (onSlideUpdate) {
      // Limpiar elementos de edición antes de guardar
      const deleteButtons = iframeDoc.querySelectorAll('.delete-btn');
      deleteButtons.forEach(btn => btn.remove());
      
      // Limpiar estilos de edición
      const editableElements = iframeDoc.querySelectorAll('[contenteditable="true"]');
      editableElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.outline = '';
        htmlElement.style.outlineOffset = '';
        htmlElement.style.cursor = '';
      });
      
      const updatedHtml = iframeDoc.documentElement.outerHTML;
      onSlideUpdate({ htmlContent: updatedHtml });
      
      // Re-ejecutar scripts después de guardar cambios
      setTimeout(() => {
        reExecuteScripts(iframeDoc);
        
        // Re-habilitar modo de edición si está activo
        if (isVisualEditMode) {
          setTimeout(() => enableVisualEditingMode(iframeDoc), 200);
        }
      }, 100);
    }
  };

  // Función para desactivar el modo de edición visual
  const disableVisualEditingMode = () => {
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        try {
          // Remover contentEditable y estilos de todos los elementos editables
          const editableElements = iframeDoc.querySelectorAll('[contenteditable="true"]');
          editableElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            htmlElement.contentEditable = 'false';
            htmlElement.removeAttribute('contenteditable');
            htmlElement.style.outline = '';
            htmlElement.style.outlineOffset = '';
            htmlElement.style.cursor = '';
          });
          
          // Remover todos los botones de eliminar
          const deleteButtons = iframeDoc.querySelectorAll('.delete-btn');
          deleteButtons.forEach(btn => btn.remove());
          
          // Remover estilos de posición relativa que se agregaron para los botones
          const allElements = iframeDoc.querySelectorAll('*');
          allElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            // Solo remover position: relative si fue agregado por nosotros
            if (htmlElement.style.position === 'relative' && !htmlElement.hasAttribute('data-original-position')) {
              htmlElement.style.position = '';
            }
          });
          
          // Remover los estilos CSS que agregamos para el modo de edición
          const styleElements = iframeDoc.querySelectorAll('style');
          styleElements.forEach((style) => {
            if (style.textContent?.includes('[contenteditable="true"]')) {
              style.remove();
            }
          });
          
          // Remover event listeners (esto se hace automáticamente al recargar el iframe)
          // Pero podemos forzar una recarga del contenido para limpiar todo
          // Limpiar completamente sin recargar el iframe para evitar bucles
          // La recarga se maneja en el useEffect principal si es necesario
          
        } catch (error) {
          console.error('Error deshabilitando edición visual:', error);
          // En caso de error, forzar recarga del iframe
          if (iframeRef.current) {
            setTimeout(() => {
              if (iframeRef.current && iframeRef.current.contentDocument) {
                iframeRef.current.contentDocument.open();
                iframeRef.current.contentDocument.write(slide.htmlContent);
                iframeRef.current.contentDocument.close();
              }
            }, 100);
          }
        }
      }
    }
  };

  // Efecto separado para manejar cambios en el modo de edición visual
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      if (isVisualEditMode && enableVisualEditing && !readOnly) {
        // Activar modo de edición visual
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentDocument && isVisualEditMode) {
            enableVisualEditingMode(iframeRef.current.contentDocument);
          }
        }, 100);
      } else {
        // Desactivar modo de edición visual
        disableVisualEditingMode();
      }
    }
  }, [isVisualEditMode, enableVisualEditing, readOnly]);



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
          height: isPresentation ? 'auto' : '100%',
          display: (isLoading || hasError) ? 'none' : 'block',
          minHeight: isPresentation ? '100vh' : '600px',
          width: '100%',
        }}
      />
    </div>
  );
}