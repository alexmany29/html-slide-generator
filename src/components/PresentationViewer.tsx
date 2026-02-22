import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { presentationService, slideService, Presentation, Slide } from '../lib/supabase';
import { dbSlideToUi } from '../types';
import PresentationMode from './PresentationMode';

export default function PresentationViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPresentation();
    }
  }, [id]);

  const loadPresentation = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const presentationData = await presentationService.getPresentationById(id);

      if (!presentationData) {
        navigate('/');
        return;
      }

      const slidesData = await slideService.getSlides(id);
      
      setPresentation(presentationData);
      setSlides(slidesData);
    } catch (error) {
      console.error('Error loading presentation:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando presentación...</p>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Presentación no encontrada
          </h2>
          <p className="text-gray-600 mb-4">
            La presentación que buscas no existe o no tienes permisos para verla.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show empty state only if we're sure there are no slides after loading
  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Esta presentación no tiene slides
          </h2>
          <p className="text-gray-600 mb-4">
            Esta presentación está vacía.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  const formattedSlides = slides.map(dbSlideToUi);

  return (
    <PresentationMode
      slides={formattedSlides}
      currentSlideIndex={0}
      onSlideChange={() => {}} // Read-only mode
      onClose={() => navigate('/')}
    />
  );
}
