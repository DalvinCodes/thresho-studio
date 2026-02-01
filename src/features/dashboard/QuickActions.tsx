import { Card } from "../../components/common/Card";
import { useNavigate } from "react-router-dom";
import { Wand2, Film, UserPlus, LayoutTemplate } from "lucide-react";

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <h3 className="text-base font-semibold text-text mb-4">Quick Actions</h3>
      <div className="space-y-1">
        <ActionItem
          icon={<Wand2 className="w-4 h-4" />}
          label="Generate Image"
          onClick={() => navigate("/generate")}
        />
        <ActionItem
          icon={<Film className="w-4 h-4" />}
          label="New Shot List"
          onClick={() => navigate("/shotlist/new")}
        />
        <ActionItem
          icon={<UserPlus className="w-4 h-4" />}
          label="Create Talent"
          onClick={() => navigate("/talent")}
        />
        <ActionItem
          icon={<LayoutTemplate className="w-4 h-4" />}
          label="New Template"
          onClick={() => navigate("/templates")}
        />
      </div>
    </Card>
  );
};

const ActionItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full h-10 flex items-center gap-3 px-3 rounded-3xl text-sm font-normal text-text-muted bg-transparent border border-transparent hover:bg-surface-raised hover:border-border hover:text-text transition-all duration-150 group"
  >
    <span className="text-brand-orange group-hover:scale-105 transition-transform">
      {icon}
    </span>
    <span>{label}</span>
  </button>
);
