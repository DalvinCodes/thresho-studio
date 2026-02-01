import { Card } from "../components/common/Card";
import { useToastHelpers } from "../components/Toast";
import { Wand2, Film, UserPlus, LayoutTemplate, Image, Video, FileText, Clock, TrendingUp, CheckCircle2, Sparkles } from "lucide-react";

export function DashboardPage() {
  const { success, error, warning, info } = useToastHelpers();

  const showTestToasts = () => {
    success("Success!", "Your changes have been saved successfully.");
    setTimeout(() => {
      error("Error!", "Something went wrong. Please try again.");
    }, 500);
    setTimeout(() => {
      warning("Warning!", "Your session will expire in 5 minutes.");
    }, 1000);
    setTimeout(() => {
      info("Info", "New updates are available for your templates.");
    }, 1500);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8">
      {/* Greeting Section - Large serif heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-text mb-2">
            {getGreeting()}, DJ
          </h1>
          <p className="text-text-muted text-base">
            Here's what's happening with your creative production today.
          </p>
        </div>
        <button
          onClick={showTestToasts}
          className="px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
        >
          Test Toasts
        </button>
      </div>

      {/* Quick Actions */}
      <section className="border-b border-border pb-8">
        <h2 className="font-serif text-xl text-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionCard
            icon={<Wand2 className="w-6 h-6" />}
            label="Generate Image"
            onClick={() => {}}
          />
          <QuickActionCard
            icon={<Film className="w-6 h-6" />}
            label="New Shot List"
            onClick={() => {}}
          />
          <QuickActionCard
            icon={<UserPlus className="w-6 h-6" />}
            label="Create Talent"
            onClick={() => {}}
          />
          <QuickActionCard
            icon={<LayoutTemplate className="w-6 h-6" />}
            label="New Template"
            onClick={() => {}}
          />
        </div>
      </section>

      {/* Stats Grid - Today at a glance */}
      <section className="border-b border-border pb-8">
        <h2 className="font-serif text-xl text-text mb-4">Today at a glance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Generations"
            value="24"
            change="+12%"
            trend="up"
            icon={<Image className="w-5 h-5" />}
          />
          <StatCard
            label="Active Shot Lists"
            value="3"
            change="+1"
            trend="up"
            icon={<Film className="w-5 h-5" />}
          />
          <StatCard
            label="Assets Created"
            value="147"
            change="+8"
            trend="up"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <StatCard
            label="Time Saved"
            value="4.2h"
            change="+15%"
            trend="up"
            icon={<Clock className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-border pb-8">
        {/* Schedule / Timeline */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg text-text">Today's Schedule</h3>
              <button className="text-sm text-text-muted hover:text-text transition-colors">
                View all
              </button>
            </div>
            <div className="space-y-4">
              <TimelineItem
                time="9:00 AM"
                title="Q1 Campaign Review"
                status="completed"
                description="Review generated assets with marketing team"
              />
              <TimelineItem
                time="11:30 AM"
                title="Product Shoot Generation"
                status="in-progress"
                description="Generate 12 product images for catalog"
              />
              <TimelineItem
                time="2:00 PM"
                title="Talent Upload Session"
                status="upcoming"
                description="Upload and process new talent headshots"
              />
              <TimelineItem
                time="4:30 PM"
                title="Social Media Batch"
                status="upcoming"
                description="Create 20 social media variations"
              />
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg text-text">Recent Activity</h3>
              <button className="text-sm text-text-muted hover:text-text transition-colors">
                View all
              </button>
            </div>
            <div className="space-y-4">
              <ActivityItem
                icon={<Image className="w-4 h-4" />}
                action="Generated"
                item="Q1 Campaign Hero"
                time="2m ago"
              />
              <ActivityItem
                icon={<Video className="w-4 h-4" />}
                action="Created"
                item="Product Video Batch"
                time="15m ago"
              />
              <ActivityItem
                icon={<FileText className="w-4 h-4" />}
                action="Updated"
                item="Brand Guidelines"
                time="1h ago"
              />
              <ActivityItem
                icon={<UserPlus className="w-4 h-4" />}
                action="Added"
                item="New Talent: Marcus"
                time="2h ago"
              />
              <ActivityItem
                icon={<LayoutTemplate className="w-4 h-4" />}
                action="Created"
                item="Social Template v3"
                time="3h ago"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Generations Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-text">Recent Generations</h2>
          <button className="text-sm text-text-muted hover:text-text transition-colors">
            View all →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <GenerationThumbnail type="image" time="2m ago" />
          <GenerationThumbnail type="image" time="15m ago" />
          <GenerationThumbnail type="video" time="1h ago" />
          <GenerationThumbnail type="image" time="2h ago" />
          <GenerationThumbnail type="text" time="3h ago" />
          <GenerationThumbnail type="image" time="5h ago" />
        </div>
      </section>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center p-6 bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-3xl bg-primary-light flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <span className="text-sm font-medium text-text">{label}</span>
    </button>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  change,
  trend,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
}) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{label}</p>
          <p className="text-2xl font-semibold text-text">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-3xl bg-primary-light flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3">
        <TrendingUp className={`w-3 h-3 ${trend === "up" ? "text-status-success" : "text-status-danger"}`} />
        <span className={`text-xs ${trend === "up" ? "text-status-success" : "text-status-danger"}`}>
          {change}
        </span>
        <span className="text-xs text-text-subtle">vs yesterday</span>
      </div>
    </Card>
  );
}

// Timeline Item Component
function TimelineItem({
  time,
  title,
  status,
  description,
}: {
  time: string;
  title: string;
  status: "completed" | "in-progress" | "upcoming";
  description: string;
}) {
  const statusColors = {
    completed: "bg-status-success",
    "in-progress": "bg-primary",
    upcoming: "bg-border",
  };

  const statusLabels = {
    completed: "Done",
    "in-progress": "In Progress",
    upcoming: "Upcoming",
  };

  const statusBadgeStyles = {
    completed: "bg-green-100 text-green-700",
    "in-progress": "bg-primary-light text-primary",
    upcoming: "bg-bg-subtle text-text-muted",
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-subtle">{time}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeStyles[status]}`}>
            {statusLabels[status]}
          </span>
        </div>
        <h4 className="text-sm font-medium text-text mb-0.5">{title}</h4>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({
  icon,
  action,
  item,
  time,
}: {
  icon: React.ReactNode;
  action: string;
  item: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-3xl bg-bg-subtle flex items-center justify-center text-text-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">
          <span className="text-text-muted">{action}</span> {item}
        </p>
        <p className="text-xs text-text-subtle">{time}</p>
      </div>
    </div>
  );
}

// Generation Thumbnail Component
function GenerationThumbnail({
  type,
  time,
}: {
  type: "image" | "video" | "text";
  time: string;
}) {
  const icons = {
    image: <Image className="w-6 h-6" />,
    video: <Video className="w-6 h-6" />,
    text: <FileText className="w-6 h-6" />,
  };

  return (
    <div className="group aspect-square bg-surface rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-bg-subtle">
          <div className="text-border group-hover:text-text-muted transition-colors">
            {icons[type]}
          </div>
        </div>
        <div className="px-3 py-2 bg-surface">
          <span className="text-xs text-text-muted">{time}</span>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
