import { Card } from "../../components/common/Card";

export const GenerationStats = () => {
  const trendData = [40, 65, 45, 80, 55, 90, 70];
  const maxValue = Math.max(...trendData);

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text">Generation Stats</h3>
        <span className="text-xs text-text-muted">Last 7 days</span>
      </div>

      <div className="space-y-4">
        <StatRow
          label="Images"
          count={84}
          total={100}
          color="bg-brand-orange"
        />
        <StatRow label="Videos" count={12} total={40} color="bg-[var(--color-secondary)]" />
        <StatRow label="Text" count={47} total={60} color="bg-text-muted" />

        {/* Trend Chart */}
        <div className="pt-4 mt-2 border-t border-border">
          <div className="relative h-16">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-border w-full" />
              <div className="border-b border-dashed border-border w-full" />
              <div className="border-b border-dashed border-border w-full" />
            </div>
            
            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-1">
              {trendData.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-brand-orange/20 rounded-t-sm hover:bg-brand-orange/30 transition-all duration-300 ease-out"
                  style={{ height: `${(h / maxValue) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const StatRow = ({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="text-sm font-medium text-text w-[60px]">{label}</span>
    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-300 ease-out`}
        style={{ width: `${(count / total) * 100}%` }}
      />
    </div>
    <span className="text-sm font-semibold text-text w-8 text-right tabular-nums">
      {count}
    </span>
  </div>
);
