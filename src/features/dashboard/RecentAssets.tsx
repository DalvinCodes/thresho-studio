import { Card } from "../../components/common/Card";
import { User, Home } from "lucide-react";

const RECENT_ASSETS = [
  { id: 1, name: "Marcus", type: "Talent", usage: "24x", updated: "2h ago" },
  {
    id: 2,
    name: "Downtown Shop",
    type: "Environment",
    usage: "31x",
    updated: "1d ago",
  },
  { id: 3, name: "Sofia", type: "Talent", usage: "18x", updated: "3d ago" },
];

export const RecentAssets = () => {
  return (
    <Card className="h-full">
      <h3 className="text-base font-semibold text-text mb-4">Recent Assets</h3>
      <div className="space-y-2">
        {RECENT_ASSETS.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center gap-3 p-2 hover:bg-bg-subtle rounded-3xl transition-colors duration-150 cursor-pointer"
          >
            <div className="w-10 h-10 bg-bg-subtle border border-border rounded-3xl flex items-center justify-center shrink-0">
              {asset.type === "Talent" ? (
                <User className="w-5 h-5 text-text-subtle" />
              ) : (
                <Home className="w-5 h-5 text-text-subtle" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-text truncate">
                  {asset.name}
                </p>
                <span className="text-xs text-text-muted tabular-nums">
                  {asset.usage}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-text-muted">{asset.type}</p>
                <span className="text-[11px] text-text-subtle">
                  {asset.updated}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
