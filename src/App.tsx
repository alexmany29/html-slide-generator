import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import AuthComponent from './components/Auth';
import Dashboard from './components/Dashboard';
import PresentationEditor from './components/PresentationEditor';
import PresentationViewer from './components/PresentationViewer';
import SharedViewer from './components/SharedViewer';

function AuthenticatedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthComponent />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/presentation/:id" element={<PresentationEditor />} />
      <Route path="/presentation/:id/view" element={<PresentationViewer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public route - no auth required */}
        <Route path="/s/:token" element={<SharedViewer />} />
        {/* All other routes require auth */}
        <Route path="/*" element={<AuthenticatedRoutes />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;