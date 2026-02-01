/**
 * Cost Dashboard Component
 * Displays cost tracking, budgets, and usage analytics
 */

import { useState, useMemo, useCallback } from 'react';
import { FileText, Image, Video } from 'lucide-react';
import type { UUID, ContentType } from '../../../core/types/common';
import type { GenerationRecord } from '../../../core/types/generation';
import { useGenerationStore, useGenerationHistory, useGenerationStats } from '../store';

interface CostDashboardProps {
  className?: string;
}

// Provider pricing (per unit)
const PROVIDER_PRICING: Record<string, { input?: number; output?: number; image?: number; video?: number; name: string }> = {
  openai: { input: 0.005, output: 0.015, image: 0.04, name: 'OpenAI' },
  anthropic: { input: 0.003, output: 0.015, name: 'Anthropic' },
  gemini: { input: 0.000075, output: 0.0003, name: 'Google Gemini' },
  'gemini-nano': { input: 0, output: 0, name: 'Gemini Nano (Local)' },
  kimi: { input: 0.00012, output: 0.00012, name: 'Kimi' },
  'flux-pro': { image: 0.04, name: 'Flux Pro' },
  imagen: { image: 0.03, name: 'Imagen' },
  runway: { video: 0.12, name: 'Runway' },
  veo: { video: 0.30, name: 'Veo' },
  openrouter: { input: 0.005, output: 0.015, name: 'OpenRouter' },
};

interface BudgetConfig {
  daily: number;
  monthly: number;
  alertThreshold: number; // 0-1 percentage
}

export function CostDashboard({ className }: CostDashboardProps) {
  const history = useGenerationHistory({ limit: 1000 });
  const stats = useGenerationStats();
  
  // Budget settings (stored in localStorage for simplicity)
  const [budget, setBudget] = useState<BudgetConfig>(() => {
    const saved = localStorage.getItem('thresho-budget-config');
    return saved ? JSON.parse(saved) : { daily: 10, monthly: 100, alertThreshold: 0.8 };
  });
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('month');

  // Calculate costs by time range
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number> = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };
    const cutoff = now - ranges[timeRange];
    return history.filter((r) => r.startedAt >= cutoff);
  }, [history, timeRange]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalGenerations = 0;
    const byType: Record<ContentType, { count: number; cost: number }> = {
      text: { count: 0, cost: 0 },
      image: { count: 0, cost: 0 },
      video: { count: 0, cost: 0 },
    };
    const byProvider: Record<string, { count: number; cost: number }> = {};

    for (const record of filteredRecords) {
      if (record.status !== 'completed') continue;

      const cost = record.costEstimateUsd || 0;
      totalCost += cost;
      totalGenerations++;

      // By type
      byType[record.type].count++;
      byType[record.type].cost += cost;

      // By provider
      const provider = record.providerId || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, cost: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].cost += cost;
    }

    return { totalCost, totalGenerations, byType, byProvider };
  }, [filteredRecords]);

  // Daily spend (for budget tracking)
  const dailySpend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    return history
      .filter((r) => r.startedAt >= todayStart && r.status === 'completed')
      .reduce((sum, r) => sum + (r.costEstimateUsd || 0), 0);
  }, [history]);

  // Monthly spend
  const monthlySpend = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return history
      .filter((r) => r.startedAt >= monthStart && r.status === 'completed')
      .reduce((sum, r) => sum + (r.costEstimateUsd || 0), 0);
  }, [history]);

  // Budget percentages
  const dailyPercent = budget.daily > 0 ? (dailySpend / budget.daily) * 100 : 0;
  const monthlyPercent = budget.monthly > 0 ? (monthlySpend / budget.monthly) * 100 : 0;

  // Save budget
  const handleSaveBudget = useCallback((newBudget: BudgetConfig) => {
    setBudget(newBudget);
    localStorage.setItem('thresho-budget-config', JSON.stringify(newBudget));
    setShowBudgetEdit(false);
  }, []);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Cost Tracking</h2>
          <p className="text-sm text-text-secondary">Monitor your AI generation spending</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-2 bg-background border border-border rounded-3xl text-text-primary text-sm"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => setShowBudgetEdit(true)}
            className="px-3 py-2 bg-primary text-white rounded-3xl text-sm hover:bg-primary/90 transition-colors"
          >
            Set Budget
          </button>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="grid grid-cols-2 gap-4">
        <BudgetCard
          title="Daily Budget"
          spent={dailySpend}
          budget={budget.daily}
          percent={dailyPercent}
          alertThreshold={budget.alertThreshold}
        />
        <BudgetCard
          title="Monthly Budget"
          spent={monthlySpend}
          budget={budget.monthly}
          percent={monthlyPercent}
          alertThreshold={budget.alertThreshold}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Spent"
          value={`$${totals.totalCost.toFixed(2)}`}
          subtitle={`${totals.totalGenerations} generations`}
        />
        <StatCard
          title="Text"
          value={`$${totals.byType.text.cost.toFixed(2)}`}
          subtitle={`${totals.byType.text.count} generations`}
          icon={<FileText className="w-5 h-5 text-text-primary" />}
        />
        <StatCard
          title="Images"
          value={`$${totals.byType.image.cost.toFixed(2)}`}
          subtitle={`${totals.byType.image.count} generations`}
          icon={<Image className="w-5 h-5 text-text-primary" />}
        />
        <StatCard
          title="Videos"
          value={`$${totals.byType.video.cost.toFixed(2)}`}
          subtitle={`${totals.byType.video.count} generations`}
          icon={<Video className="w-5 h-5 text-text-primary" />}
        />
      </div>

      {/* Provider Breakdown */}
      <div className="bg-surface rounded-3xl p-4">
        <h3 className="font-medium text-text-primary mb-4">Cost by Provider</h3>
        <div className="space-y-3">
          {Object.entries(totals.byProvider)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([providerId, data]) => {
              const providerInfo = PROVIDER_PRICING[providerId] || { name: providerId };
              const percent = totals.totalCost > 0 ? (data.cost / totals.totalCost) * 100 : 0;

              return (
                <div key={providerId} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-text-primary truncate">
                    {providerInfo.name}
                  </div>
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="w-20 text-sm text-text-primary text-right">
                    ${data.cost.toFixed(2)}
                  </div>
                  <div className="w-16 text-sm text-text-secondary text-right">
                    {data.count} runs
                  </div>
                </div>
              );
            })}
          {Object.keys(totals.byProvider).length === 0 && (
            <p className="text-text-secondary text-sm text-center py-4">
              No generation data yet
            </p>
          )}
        </div>
      </div>

      {/* Pricing Reference */}
      <div className="bg-surface rounded-3xl p-4">
        <h3 className="font-medium text-text-primary mb-4">Provider Pricing Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {Object.entries(PROVIDER_PRICING).map(([id, pricing]) => (
            <div key={id} className="p-3 bg-background rounded-3xl">
              <p className="font-medium text-text-primary">{pricing.name}</p>
              <div className="text-text-secondary text-xs mt-1">
                {pricing.input !== undefined && (
                  <p>Input: ${(pricing.input * 1000).toFixed(2)}/1K tokens</p>
                )}
                {pricing.output !== undefined && (
                  <p>Output: ${(pricing.output * 1000).toFixed(2)}/1K tokens</p>
                )}
                {pricing.image !== undefined && (
                  <p>Image: ${pricing.image.toFixed(2)}/image</p>
                )}
                {pricing.video !== undefined && (
                  <p>Video: ${pricing.video.toFixed(2)}/second</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Edit Modal */}
      {showBudgetEdit && (
        <BudgetEditModal
          budget={budget}
          onSave={handleSaveBudget}
          onClose={() => setShowBudgetEdit(false)}
        />
      )}
    </div>
  );
}

// Budget Card Component
interface BudgetCardProps {
  title: string;
  spent: number;
  budget: number;
  percent: number;
  alertThreshold: number;
}

function BudgetCard({ title, spent, budget, percent, alertThreshold }: BudgetCardProps) {
  const isOverBudget = percent >= 100;
  const isNearBudget = percent >= alertThreshold * 100;

  return (
    <div className="bg-surface rounded-3xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary">{title}</span>
        {isOverBudget && (
          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
            Over Budget
          </span>
        )}
        {!isOverBudget && isNearBudget && (
          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
            Near Limit
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-text-primary">${spent.toFixed(2)}</span>
        <span className="text-text-secondary">/ ${budget.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isOverBudget
              ? 'bg-red-500'
              : isNearBudget
              ? 'bg-yellow-500'
              : 'bg-primary'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="text-xs text-text-secondary mt-2">
        {percent.toFixed(1)}% used • ${Math.max(0, budget - spent).toFixed(2)} remaining
      </p>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-surface rounded-3xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-sm text-text-secondary">{title}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
    </div>
  );
}

// Budget Edit Modal
interface BudgetEditModalProps {
  budget: BudgetConfig;
  onSave: (budget: BudgetConfig) => void;
  onClose: () => void;
}

function BudgetEditModal({ budget, onSave, onClose }: BudgetEditModalProps) {
  const [daily, setDaily] = useState(budget.daily.toString());
  const [monthly, setMonthly] = useState(budget.monthly.toString());
  const [threshold, setThreshold] = useState((budget.alertThreshold * 100).toString());

  const handleSave = () => {
    onSave({
      daily: parseFloat(daily) || 0,
      monthly: parseFloat(monthly) || 0,
      alertThreshold: (parseFloat(threshold) || 80) / 100,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Budget Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Daily Budget ($)</label>
            <input
              type="number"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Monthly Budget ($)</label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Alert Threshold (%)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-text-secondary mt-1">
              Show warning when this percentage of budget is used
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default CostDashboard;
