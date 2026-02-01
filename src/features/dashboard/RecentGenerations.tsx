import { Image, Video, FileText } from "lucide-react";
import { Card } from "../../components/common/Card";

// Mock data for display
const GENERATIONS = [
  { id: 1, type: "image", timestamp: "2m ago", url: "", status: "completed" },
  { id: 2, type: "image", timestamp: "15m ago", url: "", status: "completed" },
  { id: 3, type: "video", timestamp: "1h ago", url: "", status: "completed" },
  { id: 4, type: "text", timestamp: "2h ago", url: "", status: "completed" },
  { id: 5, type: "image", timestamp: "3h ago", url: "", status: "completed" },
  { id: 6, type: "image", timestamp: "5h ago", url: "", status: "completed" },
];

const TypeIcon = ({ type }: { type: string }) => {
  const iconClass = "w-6 h-6 text-text-subtle group-hover:text-text transition-colors";

  switch (type) {
    case "image":
      return <Image className={iconClass} />;
    case "video":
      return <Video className={iconClass} />;
    case "text":
      return <FileText className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
};

export const RecentGenerations = () => {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text">
          Recent Generations
        </h3>
        <button className="text-xs text-primary hover:text-primary-hover transition-colors">
          View all →
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {GENERATIONS.map((gen) => (
          <Card
            key={gen.id}
            padding="none"
            className="aspect-square relative group overflow-hidden bg-surface border-border hover:border-text-muted transition-colors cursor-pointer"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <TypeIcon type={gen.type} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <span className="text-[11px] text-white font-medium tabular-nums">
                {gen.timestamp}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
