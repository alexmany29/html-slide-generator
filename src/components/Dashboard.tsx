import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { presentationService, Presentation } from '../lib/supabase';
import PresentationCard from './PresentationCard';
import CreatePresentationModal from './CreatePresentationModal';
import ShareModal from './ShareModal';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [sharedPresentations, setSharedPresentations] = useState<Presentation[]>([]);
  const [publicPresentations, setPublicPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'public'>('my');

  useEffect(() => {
    if (user) {
      console.log('USER ID (auth):', user.id);
    }
    loadPresentations();
  }, [user]);

  const loadPresentations = async () => {
    try {
      setLoading(true);
      const [myPresentations, shared, publicOnes] = await Promise.all([
        presentationService.getUserPresentations(),
        presentationService.getSharedPresentations(),
        presentationService.getPublicPresentations()
      ]);
      
      console.log('Presentaciones devueltas por getUserPresentations:', myPresentations);
      setPresentations(myPresentations || []);
      setSharedPresentations(shared || []);
      setPublicPresentations(publicOnes || []);
    } catch (error) {
      console.error('Error loading presentations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePresentation = async (title: string, description?: string) => {
    try {
      await presentationService.createPresentation(title, description);
      await loadPresentations();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating presentation:', error);
    }
  };

  const handleDeletePresentation = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta presentación?')) {
      try {
        await presentationService.deletePresentation(id);
        await loadPresentations();
      } catch (error) {
        console.error('Error deleting presentation:', error);
      }
    }
  };

  const handleSharePresentation = (presentation: Presentation) => {
    setSelectedPresentation(presentation);
    setShowShareModal(true);
  };

  const handleUpdatePresentationVisibility = async (isPublic: boolean) => {
    if (selectedPresentation) {
      // Update local state
      setPresentations(prev => 
        prev.map(p => 
          p.id === selectedPresentation.id 
            ? { ...p, is_public: isPublic }
            : p
        )
      );
      // Update selected presentation
      setSelectedPresentation(prev => 
        prev ? { ...prev, is_public: isPublic } : null
      );
    }
  };

  const getCurrentPresentations = (): Presentation[] => {
    switch (activeTab) {
      case 'my':
        return presentations || [];
      case 'shared':
        return sharedPresentations || [];
      case 'public':
        return publicPresentations || [];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando presentaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                ⚡ SlideForge
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Hola, {user?.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'my'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mis Presentaciones ({presentations.length})
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'shared'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Compartidas Conmigo ({sharedPresentations.length})
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'public'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Públicas ({publicPresentations.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Create button */}
        {activeTab === 'my' && (
          <div className="mb-8">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Nueva Presentación</span>
            </button>
          </div>
        )}

        {/* Presentations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getCurrentPresentations().map((presentation) => (
            <PresentationCard
              key={presentation.id}
              presentation={presentation}
              onDelete={activeTab === 'my' ? handleDeletePresentation : undefined}
              onShare={activeTab === 'my' ? handleSharePresentation : undefined}
              canEdit={activeTab === 'my'}
            />
          ))}
        </div>

        {/* Empty State */}
        {getCurrentPresentations().length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'my' && 'No tienes presentaciones aún'}
              {activeTab === 'shared' && 'No tienes presentaciones compartidas'}
              {activeTab === 'public' && 'No hay presentaciones públicas'}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'my' && 'Crea tu primera presentación para empezar'}
              {activeTab === 'shared' && 'Las presentaciones que otros compartan contigo aparecerán aquí'}
              {activeTab === 'public' && 'Las presentaciones públicas aparecerán aquí'}
            </p>
            {activeTab === 'my' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Crear Primera Presentación
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePresentationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePresentation}
        />
      )}

      {/* Share Modal */}
      {showShareModal && selectedPresentation && (
        <ShareModal
          presentationId={selectedPresentation.id}
          presentationTitle={selectedPresentation.title}
          isPublic={selectedPresentation.is_public}
          onClose={() => {
            setShowShareModal(false);
            setSelectedPresentation(null);
          }}
          onUpdate={handleUpdatePresentationVisibility}
        />
      )}
    </div>
  );
}
