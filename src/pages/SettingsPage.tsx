/**
 * Settings Page
 * Configure providers and app preferences
 */

import { useState } from 'react';
import { Zap, Palette, CircleDollarSign, Settings, Database, Info } from 'lucide-react';
import { ProviderSettings } from '../features/providers/components/ProviderSettings';
import { StorageSettings as StorageSettingsFeature } from '../features/settings';
import { CostDashboard } from '../features/generation/components/CostDashboard';

type SettingsTab = 'providers' | 'costs' | 'preferences' | 'storage' | 'about';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');

  const tabs = [
    { id: 'providers' as const, label: 'Providers', icon: <Zap className="w-4 h-4" /> },
    { id: 'costs' as const, label: 'Costs', icon: <CircleDollarSign className="w-4 h-4" /> },
    { id: 'preferences' as const, label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { id: 'storage' as const, label: 'Storage', icon: <Database className="w-4 h-4" /> },
    { id: 'about' as const, label: 'About', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex">
      {/* Settings Sidebar - fixed width with clear separation */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-surface">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
        </div>
        <nav className="p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full px-3 py-2 rounded-3xl text-left flex items-center gap-3
                transition-all duration-200 mb-1 relative
                ${activeTab === tab.id
                  ? 'bg-primary-light text-primary'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                }
              `}
            >
              {/* Left border indicator */}
              <span className={`
                absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full
                transition-all duration-200
                ${activeTab === tab.id ? 'bg-primary' : 'bg-primary opacity-0'}
              `} />
              <span className="ml-2">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Settings Content - scrollable with bg-bg background */}
      <main className="flex-1 overflow-y-auto bg-bg">
        {activeTab === 'providers' && <ProviderSettings />}
        {activeTab === 'costs' && <CostsSettings />}
        {activeTab === 'preferences' && <PreferencesSettings />}
        {activeTab === 'storage' && <StorageSettings />}
        {activeTab === 'about' && <AboutSettings />}
      </main>
    </div>
  );
}

// Costs Settings - wrapper for the CostDashboard
function CostsSettings() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <CostDashboard />
    </div>
  );
}

// Preferences Settings
function PreferencesSettings() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-2">Preferences</h3>
        <p className="text-text-secondary">Customize your Thresho Studio experience</p>
      </div>

      <div className="bg-surface rounded-3xl border border-border divide-y divide-border shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Theme</p>
            <p className="text-sm text-text-secondary">Choose your preferred color scheme</p>
          </div>
          <select className="px-3 py-2 bg-background border border-border rounded-3xl text-text-primary">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Default Content Type</p>
            <p className="text-sm text-text-secondary">Default type when creating new generations</p>
          </div>
          <select className="px-3 py-2 bg-background border border-border rounded-3xl text-text-primary">
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Auto-save Templates</p>
            <p className="text-sm text-text-secondary">Automatically save template changes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Show Generation Progress</p>
            <p className="text-sm text-text-secondary">Display progress notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// Storage Settings - wrapper to use the feature component with page styling
function StorageSettings() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-2">Storage</h3>
        <p className="text-text-secondary">Manage your local data and file storage</p>
      </div>

      {/* File Storage Section */}
      <div className="bg-surface rounded-3xl border border-border p-6 shadow-sm">
        <StorageSettingsFeature />
      </div>
    </div>
  );
}

// About Settings
function AboutSettings() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="border-b border-border pb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-2">About</h3>
        <p className="text-text-secondary">Information about Thresho Studio</p>
      </div>

      <div className="bg-surface rounded-3xl border border-border p-8 text-center shadow-sm">
        <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
          <Palette className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-1">Thresho Studio</h2>
        <p className="text-text-secondary mb-4">AI-Powered Creative Platform</p>
        <p className="text-sm text-text-secondary">Version 0.1.0</p>
      </div>

      <div className="bg-surface rounded-3xl border border-border divide-y divide-border shadow-sm">
        <div className="p-4">
          <p className="font-medium text-text-primary mb-1">Multi-Provider Support</p>
          <p className="text-sm text-text-secondary">
            Connect to OpenAI, Anthropic, Google, Flux Pro, Runway, and more
          </p>
        </div>

        <div className="p-4">
          <p className="font-medium text-text-primary mb-1">Brand Consistency</p>
          <p className="text-sm text-text-secondary">
            Inject brand tokens into prompts for consistent content generation
          </p>
        </div>

        <div className="p-4">
          <p className="font-medium text-text-primary mb-1">Shot List & Storyboard</p>
          <p className="text-sm text-text-secondary">
            Plan and visualize your production with AI-powered shot suggestions
          </p>
        </div>

        <div className="p-4">
          <p className="font-medium text-text-primary mb-1">Local-First Architecture</p>
          <p className="text-sm text-text-secondary">
            Your data stays on your device with SQLite and OPFS storage
          </p>
        </div>
      </div>

      <div className="text-center text-sm text-text-secondary pt-4 border-t border-border">
        <p>Built with React, TypeScript, and Tailwind CSS</p>
        <p className="mt-1">© 2024 Thresho Studio</p>
      </div>
    </div>
  );
}

export default SettingsPage;
