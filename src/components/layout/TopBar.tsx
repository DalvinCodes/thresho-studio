import { Search, ChevronRight, Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useShotListStore } from "../../features/shotList";

export const TopBar = () => {
  const location = useLocation();
  const currentPage = location.pathname === "/" ? "dashboard" : location.pathname.slice(1);
  const openCreateShotModal = useShotListStore((state) => state.openCreateShotModal);

  // Helper to get breadcrumbs based on page
  const getBreadcrumbs = () => {
    const pageLabel =
      currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

    // Mock nested structure for demo
    if (currentPage === "shotlist") {
      return ["Production", "Shot Lists"];
    }

    return [pageLabel];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-[56px] px-6 border-b border-border bg-bg flex items-center justify-between flex-shrink-0">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-text-subtle" />}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "font-semibold text-text"
                  : "text-text-muted"
              }
            >
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle size="sm" />

        <div className="h-4 w-px bg-divider" />

        {/* Search */}
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle group-hover:text-text-muted transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 pl-9 pr-4 bg-surface-raised border border-border rounded-3xl text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-brand-orange transition-all w-64"
          />
        </div>

        <div className="h-4 w-px bg-divider mx-1 hidden md:block" />

        {/* Primary Action Button (Context Aware) */}
        {location.pathname.startsWith("/shotlist") && (
          <button 
            onClick={() => openCreateShotModal()}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-text-on-brand text-sm font-medium rounded-3xl hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Shot</span>
          </button>
        )}
      </div>
    </header>
  );
};
