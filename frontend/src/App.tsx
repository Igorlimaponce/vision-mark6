import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { FleetManagement } from './pages/FleetManagement';
import { Dashboard } from './pages/Dashboard';
import { Pipelines } from './pages/Pipelines';
import { PipelineBuilderMain } from './components/pipeline/PipelineBuilderMain';
import { ConfigurationsPage } from './pages/ConfigurationsPage';
import { UserManagement } from './pages/UserManagement';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { useAuth } from './hooks/useAuth';
import { Loading } from './components/common/Loading';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Carregando..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <WebSocketProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/fleet" replace />} />
              <Route path="/fleet" element={<FleetManagement />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pipelines" element={<Pipelines />} />
              <Route path="/pipeline-builder" element={<PipelineBuilderMain />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/settings" element={<ConfigurationsPage />} />
              <Route path="*" element={<Navigate to="/fleet" replace />} />
            </Routes>
          </Layout>
        </WebSocketProvider>
      </Router>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}

export default App;
