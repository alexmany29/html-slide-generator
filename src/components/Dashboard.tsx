import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { presentationService, Presentation } from '../lib/supabase';
import { Layers, Plus, FolderOpen, Users, Globe, LogOut, Search, SortAsc, SortDesc, LayoutGrid, List } from 'lucide-react';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import PresentationCard from './PresentationCard';
import CreatePresentationModal from './CreatePresentationModal';
import ShareModal from './ShareModal';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [sharedPresentations, setSharedPresentations] = useState<Presentation[]>([]);
  const [publicPresentations, setPublicPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'public'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
      toast.error('Error al cargar las presentaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePresentation = async (title: string, description?: string) => {
    try {
      await presentationService.createPresentation(title, description);
      await loadPresentations();
      setShowCreateModal(false);
      toast.success('Presentacion creada correctamente');
    } catch (error) {
      console.error('Error creating presentation:', error);
      toast.error('Error al crear la presentacion');
    }
  };

  const handleDeletePresentation = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await presentationService.deletePresentation(deleteTarget);
      await loadPresentations();
      toast.success('Presentacion eliminada');
    } catch (error) {
      console.error('Error deleting presentation:', error);
      toast.error('Error al eliminar la presentacion');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDuplicatePresentation = async (presentation: Presentation) => {
    try {
      await presentationService.duplicatePresentation(presentation.id);
      await loadPresentations();
      toast.success('Presentacion duplicada');
    } catch (error) {
      console.error('Error duplicating presentation:', error);
      toast.error('Error al duplicar la presentacion');
    }
  };

  const handleSharePresentation = (presentation: Presentation) => {
    setSelectedPresentation(presentation);
    setShowShareModal(true);
  };

  const handleUpdatePresentationVisibility = async (isPublic: boolean) => {
    if (selectedPresentation) {
      setPresentations(prev => 
        prev.map(p => 
          p.id === selectedPresentation.id 
            ? { ...p, is_public: isPublic }
            : p
        )
      );
      setSelectedPresentation(prev => 
        prev ? { ...prev, is_public: isPublic } : null
      );
    }
  };

  const getRawPresentations = (): Presentation[] => {
    switch (activeTab) {
      case 'my': return presentations || [];
      case 'shared': return sharedPresentations || [];
      case 'public': return publicPresentations || [];
      default: return [];
    }
  };

  const filteredPresentations = useMemo(() => {
    let list = getRawPresentations();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.updated_at).getTime();
      const db = new Date(b.updated_at).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return list;
  }, [activeTab, presentations, sharedPresentations, publicPresentations, searchQuery, sortOrder]);

  const tabs = [
    { key: 'my' as const, label: 'Mis Presentaciones', icon: FolderOpen, count: presentations.length },
    { key: 'shared' as const, label: 'Compartidas', icon: Users, count: sharedPresentations.length },
    { key: 'public' as const, label: 'Publicas', icon: Globe, count: publicPresentations.length },
  ];

  // Skeleton loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Layers size={18} className="text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">SlideForge</span>
              </div>
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="w-64 h-10 bg-gray-200 rounded-xl animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-6" />
                <div className="flex space-x-2">
                  <div className="h-9 bg-gray-100 rounded-lg flex-1" />
                  <div className="h-9 bg-gray-200 rounded-lg flex-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Layers size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">SlideForge</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs + actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </nav>

          {activeTab === 'my' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 shadow-sm hover:shadow-md w-fit"
            >
              <Plus size={16} />
              <span>Nueva Presentacion</span>
            </button>
          )}
        </div>

        {/* Search + sort + view mode */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar presentaciones..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center space-x-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              title={sortOrder === 'desc' ? 'Mas recientes primero' : 'Mas antiguas primero'}
            >
              {sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Recientes' : 'Antiguas'}</span>
            </button>
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Presentations Grid/List */}
        {filteredPresentations.length > 0 ? (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col space-y-3'
          }>
            {filteredPresentations.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
                onDelete={activeTab === 'my' ? handleDeletePresentation : undefined}
                onShare={activeTab === 'my' ? handleSharePresentation : undefined}
                onDuplicate={activeTab === 'my' ? handleDuplicatePresentation : undefined}
                canEdit={activeTab === 'my'}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              {searchQuery ? (
                <Search size={28} className="text-gray-300" />
              ) : (
                <>
                  {activeTab === 'my' && <FolderOpen size={28} className="text-gray-300" />}
                  {activeTab === 'shared' && <Users size={28} className="text-gray-300" />}
                  {activeTab === 'public' && <Globe size={28} className="text-gray-300" />}
                </>
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {searchQuery
                ? 'Sin resultados'
                : activeTab === 'my' ? 'No tienes presentaciones'
                : activeTab === 'shared' ? 'Sin presentaciones compartidas'
                : 'Sin presentaciones publicas'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              {searchQuery
                ? `No se encontraron presentaciones para "${searchQuery}"`
                : activeTab === 'my' ? 'Crea tu primera presentacion para empezar'
                : activeTab === 'shared' ? 'Las presentaciones compartidas contigo apareceran aqui'
                : 'Las presentaciones publicas apareceran aqui'}
            </p>
            {activeTab === 'my' && !searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 mx-auto"
              >
                <Plus size={16} />
                <span>Crear primera presentacion</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePresentationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePresentation}
        />
      )}

      {showShareModal && selectedPresentation && (
        <ShareModal
          presentationId={selectedPresentation.id}
          presentationTitle={selectedPresentation.title}
          isPublic={selectedPresentation.is_public}
          onClose={() => { setShowShareModal(false); setSelectedPresentation(null); }}
          onUpdate={handleUpdatePresentationVisibility}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar presentacion"
          message="Esta accion no se puede deshacer. Se eliminaran todas las slides y enlaces compartidos."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
