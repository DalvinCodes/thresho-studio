/**
 * Settings Page
 * Configure providers and app preferences
 */

import { useState } from 'react';
import { ProviderSettings } from '../features/providers/components/ProviderSettings';

type SettingsTab = 'providers' | 'preferences' | 'storage' | 'about';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');

  const tabs = [
    { id: 'providers' as const, label: 'Providers', icon: '⚡' },
    { id: 'preferences' as const, label: 'Preferences', icon: '⚙️' },
    { id: 'storage' as const, label: 'Storage', icon: '💾' },
    { id: 'about' as const, label: 'About', icon: 'ℹ️' },
  ];

  return (
    <div className="h-full flex">
      {/* Settings Sidebar */}
      <div className="w-56 border-r border-border bg-surface">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
        </div>
        <nav className="p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full px-3 py-2 rounded-lg text-left flex items-center gap-3 transition-colors mb-1
                ${activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'providers' && <ProviderSettings />}
        {activeTab === 'preferences' && <PreferencesSettings />}
        {activeTab === 'storage' && <StorageSettings />}
        {activeTab === 'about' && <AboutSettings />}
      </div>
    </div>
  );
}

// Preferences Settings
function PreferencesSettings() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Preferences</h3>
        <p className="text-text-secondary">Customize your Thresho Studio experience</p>
      </div>

      <div className="bg-surface rounded-lg border border-border divide-y divide-border">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Theme</p>
            <p className="text-sm text-text-secondary">Choose your preferred color scheme</p>
          </div>
          <select className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary">
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
          <select className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary">
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

// Storage Settings
function StorageSettings() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Storage</h3>
        <p className="text-text-secondary">Manage your local data and storage</p>
      </div>

      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-text-primary">Database Size</p>
            <p className="text-sm text-text-secondary">SQLite database stored locally</p>
          </div>
          <p className="text-text-primary font-mono">~0 MB</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-text-primary">Cached Assets</p>
            <p className="text-sm text-text-secondary">Locally cached generated content</p>
          </div>
          <p className="text-text-primary font-mono">~0 MB</p>
        </div>

        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div className="h-full bg-primary w-1/4" />
        </div>
        <p className="text-sm text-text-secondary mt-2">
          Using approximately 0% of available storage
        </p>
      </div>

      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <h4 className="font-medium text-text-primary">Data Management</h4>

        <button className="w-full py-2 bg-background border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors">
          Export All Data
        </button>

        <button className="w-full py-2 bg-background border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors">
          Import Data
        </button>

        <button className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
          Clear All Data
        </button>
      </div>
    </div>
  );
}

// About Settings
function AboutSettings() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">About</h3>
        <p className="text-text-secondary">Information about Thresho Studio</p>
      </div>

      <div className="bg-surface rounded-lg border border-border p-8 text-center">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🎨</span>
        </div>
        <h2 className="text-2xl font-bold text-primary mb-1">Thresho Studio</h2>
        <p className="text-text-secondary mb-4">AI-Powered Creative Platform</p>
        <p className="text-sm text-text-secondary">Version 0.1.0</p>
      </div>

      <div className="bg-surface rounded-lg border border-border divide-y divide-border">
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

      <div className="text-center text-sm text-text-secondary">
        <p>Built with React, TypeScript, and Tailwind CSS</p>
        <p className="mt-1">© 2024 Thresho Studio</p>
      </div>
    </div>
  );
}

export default SettingsPage;
