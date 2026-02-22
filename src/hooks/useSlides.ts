import { useState, useCallback, useEffect } from 'react';
import { Slide } from '../types';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Slide de Bienvenida</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            margin: 0;
            padding: 0;
        }
        .hero-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .feature-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        <!-- Hero Section -->
        <section class="hero-gradient text-white py-20">
            <div class="max-w-6xl mx-auto px-4 text-center">
                <h1 class="text-5xl md:text-7xl font-bold mb-6">
                    HTML Slides Editor
                </h1>
                <p class="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
                    Crea presentaciones profesionales con HTML completo, CSS y JavaScript interactivo
                </p>
                <div class="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
                    <span class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                    <span class="text-lg font-medium">Listo para usar</span>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="py-20 px-4">
            <div class="max-w-6xl mx-auto">
                <h2 class="text-4xl font-bold text-center text-gray-900 mb-16">
                    Características principales
                </h2>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="feature-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                        <div class="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">HTML Completo</h3>
                        <p class="text-gray-600 leading-relaxed">
                            Soporte completo para documentos HTML con CSS, JavaScript, CDNs externos y todas las características modernas.
                        </p>
                    </div>

                    <div class="feature-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                        <div class="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">Edición Directa</h3>
                        <p class="text-gray-600 leading-relaxed">
                            Edita textos directamente en la slide sin tocar el código HTML. Simplemente haz clic y escribe.
                        </p>
                    </div>

                    <div class="feature-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                        <div class="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">Interactividad</h3>
                        <p class="text-gray-600 leading-relaxed">
                            Mantén toda la funcionalidad JavaScript: botones, formularios, animaciones y elementos interactivos.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="bg-gray-900 text-white py-16">
            <div class="max-w-4xl mx-auto text-center px-4">
                <h2 class="text-3xl md:text-4xl font-bold mb-6">
                    ¡Comienza a crear ahora!
                </h2>
                <p class="text-xl mb-8 opacity-90">
                    Haz clic en "Editar HTML" para pegar tu código y ver la magia
                </p>
                <div class="inline-flex items-center space-x-2 text-lg">
                    <span>📝</span>
                    <span>Edita</span>
                    <span>→</span>
                    <span>🎨</span>
                    <span>Estiliza</span>
                    <span>→</span>
                    <span>🚀</span>
                    <span>Presenta</span>
                </div>
            </div>
        </section>
    </div>
</body>
</html>`;

export function useSlides() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Load from localStorage first
  useEffect(() => {
    const saved = localStorage.getItem('html-slides');
    if (saved) {
      try {
        const parsedSlides = JSON.parse(saved);
        if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
          setSlides(parsedSlides.map(slide => ({
            ...slide,
            createdAt: new Date(slide.createdAt),
            updatedAt: new Date(slide.updatedAt),
          })));
          return;
        }
      } catch (error) {
        console.error('Error loading slides:', error);
      }
    }

    // Create initial slide if none exist
    const initialSlide: Slide = {
      id: '1',
      title: 'Slide de Bienvenida',
      htmlContent: DEFAULT_HTML,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSlides([initialSlide]);
  }, []);

  // Save to localStorage whenever slides change
  useEffect(() => {
    if (slides.length > 0) {
      localStorage.setItem('html-slides', JSON.stringify(slides));
    }
  }, [slides]);

  const addSlide = useCallback(() => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: `Slide ${slides.length + 1}`,
      htmlContent: DEFAULT_HTML,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSlides(prev => [...prev, newSlide]);
    setCurrentSlideIndex(slides.length);
  }, [slides.length]);

  const deleteSlide = useCallback((slideId: string) => {
    setSlides(prev => {
      const filtered = prev.filter(slide => slide.id !== slideId);
      if (filtered.length === 0) {
        // Always keep at least one slide
        return [prev[0]];
      }
      return filtered;
    });
    setCurrentSlideIndex(prev => Math.min(prev, slides.length - 2));
  }, [slides.length]);

  const duplicateSlide = useCallback((slideId: string) => {
    const slideIndex = slides.findIndex(slide => slide.id === slideId);
    if (slideIndex !== -1) {
      const originalSlide = slides[slideIndex];
      const duplicatedSlide: Slide = {
        ...originalSlide,
        id: Date.now().toString(),
        title: `${originalSlide.title} (Copia)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSlides(prev => [
        ...prev.slice(0, slideIndex + 1),
        duplicatedSlide,
        ...prev.slice(slideIndex + 1),
      ]);
      setCurrentSlideIndex(slideIndex + 1);
    }
  }, [slides]);

  const updateSlide = useCallback((slideId: string, updates: Partial<Slide>) => {
    setSlides(prev =>
      prev.map(slide =>
        slide.id === slideId
          ? { ...slide, ...updates, updatedAt: new Date() }
          : slide
      )
    );
  }, []);

  const changeSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
    }
  }, [slides.length]);

  return {
    slides,
    currentSlideIndex,
    currentSlide: slides[currentSlideIndex],
    addSlide,
    deleteSlide,
    duplicateSlide,
    updateSlide,
    changeSlide,
  };
}