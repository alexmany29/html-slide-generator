import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { presentationService, Presentation } from '../lib/supabase';
import { Layers, Plus, FolderOpen, Users, Globe, LogOut } from 'lucide-react';
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Layers size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                SlideForge
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <LogOut size={15} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'my'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FolderOpen size={16} />
              <span>Mis Presentaciones</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'my' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>{presentations.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'shared'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={16} />
              <span>Compartidas</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'shared' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>{sharedPresentations.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'public'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Globe size={16} />
              <span>Públicas</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>{publicPresentations.length}</span>
            </button>
          </nav>
        </div>

        {/* Create button */}
        {activeTab === 'my' && (
          <div className="mb-8">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
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
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              {activeTab === 'my' && <FolderOpen size={28} className="text-gray-400" />}
              {activeTab === 'shared' && <Users size={28} className="text-gray-400" />}
              {activeTab === 'public' && <Globe size={28} className="text-gray-400" />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'my' && 'No tienes presentaciones aún'}
              {activeTab === 'shared' && 'No tienes presentaciones compartidas'}
              {activeTab === 'public' && 'No hay presentaciones públicas'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {activeTab === 'my' && 'Crea tu primera presentación para empezar'}
              {activeTab === 'shared' && 'Las presentaciones que otros compartan contigo aparecerán aquí'}
              {activeTab === 'public' && 'Las presentaciones públicas aparecerán aquí'}
            </p>
            {activeTab === 'my' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                <span>Crear Primera Presentación</span>
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
