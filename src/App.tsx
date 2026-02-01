/**
 * Thresho Studio - Main Application Component
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./core/store";
import { useAppInit } from "./hooks/useAppInit";
import { useAppStore } from "./core/store";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./components/Toast";

// Import pages
import {
  DashboardPage,
  GeneratePage,
  TemplatesPage,
  AssetsPage,
  BrandsPage,
  TalentPage,
  ShotListPage,
  SettingsPage,
} from "./pages";

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Thresho Studio</h1>
        <p className="text-text-muted">Initializing...</p>
      </div>
    </div>
  );
}

// Error screen component
function ErrorScreen({ error }: { error?: string }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-raised rounded-3xl p-6 text-center border border-border">
        <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-status-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-text mb-2">
          Initialization Error
        </h1>
        <p className="text-text-muted mb-4">
          {error || "Something went wrong while starting Thresho Studio."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-text-on-brand rounded-3xl hover:bg-primary-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// App wrapper with initialization
function AppContent() {
  const { initState, isReady, hasError } = useAppInit();
  const initError = useAppStore((state) => state.initError);

  if (initState === "idle" || initState === "initializing") {
    return <LoadingScreen />;
  }

  if (hasError) {
    return <ErrorScreen error={initError} />;
  }

  if (isReady) {
    return (
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplatesPage />} />
          <Route path="/templates/:id/edit" element={<TemplatesPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/brands/new" element={<BrandsPage />} />
          <Route path="/brands/:id/edit" element={<BrandsPage />} />
          <Route path="/talent" element={<TalentPage />} />
          <Route path="/talent/new" element={<TalentPage />} />
          <Route path="/talent/:id" element={<TalentPage />} />
          <Route path="/talent/:id/edit" element={<TalentPage />} />
          <Route path="/shotlist" element={<ShotListPage />} />
          <Route path="/shotlist/new" element={<ShotListPage />} />
          <Route path="/shotlist/:id" element={<ShotListPage />} />
          <Route path="/shotlist/:id/edit" element={<ShotListPage />} />
          <Route path="/shotlist/:id/shots/:shotId/edit" element={<ShotListPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    );
  }

  return <LoadingScreen />;
}

// Root App component with providers
function App() {
  console.log("App.tsx: Rendering App root...");
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
