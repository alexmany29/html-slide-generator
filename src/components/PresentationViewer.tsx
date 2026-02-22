import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { presentationService, slideService, Presentation, Slide } from '../lib/supabase';
import { dbSlideToUi } from '../types';
import { BarChart3, FileText } from 'lucide-react';
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
          <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Cargando presentacion...</p>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <BarChart3 size={28} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Presentación no encontrada
          </h2>
          <p className="text-gray-600 mb-4">
            La presentación que buscas no existe o no tienes permisos para verla.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Sin slides
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Esta presentacion esta vacia.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
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
