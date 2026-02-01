/**
 * Dashboard Page
 * Overview of studio activity and quick actions
 */

import { useMemo, useCallback } from 'react';
import { useAppStore } from '../core/store';
import { useAssetStore } from '../features/assets/store';
import { useTemplateStore } from '../features/templates/store';
import { useBrandStore } from '../features/brands/store';
import { useShotListStore } from '../features/shotList/store';
import { useGenerationStore } from '../features/generation/store';

export function DashboardPage() {
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  // Use primitive counts to avoid re-render loops
  const assetCount = useAssetStore((s) => s.assets.size);
  const templateCount = useTemplateStore((s) => s.templates.size);
  const brandCount = useBrandStore((s) => s.brands.size);
  const shotListCount = useShotListStore((s) => s.shotLists.size);
  const activeGenCount = useGenerationStore((s) => s.activeGenerations.size);
  const _historySize = useGenerationStore((s) => s.history.size);

  // Compute completed count - this is a primitive so won't cause re-renders
  const completedCount = useGenerationStore(useCallback((s) => {
    let count = 0;
    for (const r of s.history.values()) {
      if (r.status === 'completed') count++;
    }
    return count;
  }, []));

  // Get arrays only for display, not for dependencies
  const activeGenerations = useMemo(() => {
    return Array.from(useGenerationStore.getState().activeGenerations.values());
  }, [activeGenCount]);

  const recentAssets = useMemo(() => {
    const assets = Array.from(useAssetStore.getState().assets.values())
      .filter(a => !a.isArchived)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);
    return assets;
  }, [assetCount]);

  // Stats object
  const stats = useMemo(() => ({
    totalAssets: assetCount,
    totalTemplates: templateCount,
    totalBrands: brandCount,
    totalShotLists: shotListCount,
    activeGenerations: activeGenCount,
    completedGenerations: completedCount,
  }), [assetCount, templateCount, brandCount, shotListCount, activeGenCount, completedCount]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className="text-3xl font-bold text-text-primary">Welcome to Thresho Studio</h2>
        <p className="text-text-secondary mt-1">Your AI-powered creative platform</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon="🖼️"
          label="Assets"
          value={stats.totalAssets}
          color="primary"
          onClick={() => setCurrentPage('assets')}
        />
        <StatCard
          icon="📝"
          label="Templates"
          value={stats.totalTemplates}
          color="secondary"
          onClick={() => setCurrentPage('templates')}
        />
        <StatCard
          icon="🎨"
          label="Brands"
          value={stats.totalBrands}
          color="purple"
          onClick={() => setCurrentPage('brands')}
        />
        <StatCard
          icon="🎬"
          label="Shot Lists"
          value={stats.totalShotLists}
          color="blue"
          onClick={() => setCurrentPage('shotlist')}
        />
        <StatCard
          icon="⚡"
          label="Active"
          value={stats.activeGenerations}
          color="yellow"
          onClick={() => setCurrentPage('generate')}
        />
        <StatCard
          icon="✅"
          label="Completed"
          value={stats.completedGenerations}
          color="green"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-surface rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            icon="✨"
            label="Generate Content"
            description="Create text, images, or videos"
            onClick={() => setCurrentPage('generate')}
          />
          <QuickAction
            icon="📋"
            label="New Template"
            description="Create a prompt template"
            onClick={() => setCurrentPage('templates')}
          />
          <QuickAction
            icon="🎬"
            label="New Shot List"
            description="Plan your production"
            onClick={() => setCurrentPage('shotlist')}
          />
          <QuickAction
            icon="⚙️"
            label="Configure Providers"
            description="Set up AI providers"
            onClick={() => setCurrentPage('settings')}
          />
        </div>
      </div>

      {/* Active Generations */}
      {activeGenerations.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Active Generations</h3>
            <button
              onClick={() => setCurrentPage('generate')}
              className="text-sm text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {activeGenerations.slice(0, 3).map((gen) => (
              <div
                key={gen.id}
                className="flex items-center gap-4 p-3 bg-background rounded-lg"
              >
                <span className="text-2xl">
                  {gen.type === 'text' ? '📝' : gen.type === 'image' ? '🖼️' : '🎬'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary capitalize">
                    {gen.type} Generation
                  </p>
                  <div className="mt-1 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${gen.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-text-secondary">{gen.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Assets */}
      {recentAssets.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Recent Assets</h3>
            <button
              onClick={() => setCurrentPage('assets')}
              className="text-sm text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="aspect-square bg-background rounded-lg overflow-hidden"
              >
                {asset.type === 'image' && asset.url ? (
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                    {asset.type === 'video' ? '🎬' : '📝'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Getting Started */}
      {stats.totalAssets === 0 && stats.totalTemplates === 0 && (
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-primary/20 p-8 text-center">
          <h3 className="text-xl font-semibold text-text-primary mb-2">Get Started</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Welcome to Thresho Studio! Start by configuring your AI providers, then create
            templates and generate your first content.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setCurrentPage('settings')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Configure Providers
            </button>
            <button
              onClick={() => setCurrentPage('templates')}
              className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
            >
              Create Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  color: 'primary' | 'secondary' | 'purple' | 'blue' | 'yellow' | 'green';
  onClick?: () => void;
}

function StatCard({ icon, label, value, color, onClick }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    purple: 'bg-purple-500/10 text-purple-500',
    blue: 'bg-blue-500/10 text-blue-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    green: 'bg-green-500/10 text-green-500',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg ${colorClasses[color]} transition-transform hover:scale-105`}
    >
      <p className="text-3xl mb-1">{icon}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </button>
  );
}

// Quick Action Component
interface QuickActionProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickAction({ icon, label, description, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
    >
      <p className="text-2xl mb-2">{icon}</p>
      <p className="font-medium text-text-primary">{label}</p>
      <p className="text-sm text-text-secondary">{description}</p>
    </button>
  );
}

export default DashboardPage;
