import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wand2,
  LayoutTemplate,
  Image,
  Tag,
  User,
  Film,
  Settings,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { useAssetStore } from "../../features/assets";
import { useTalentStore } from "../../features/talent";
import { useShotListStore } from "../../features/shotList";
import { useTemplateStore } from "../../features/templates";
import { useBrandStore } from "../../features/brands";

const PAGE_PATHS: Record<string, string> = {
  dashboard: "/",
  generate: "/generate",
  templates: "/templates",
  assets: "/assets",
  brands: "/brands",
  talent: "/talent",
  shotlist: "/shotlist",
  settings: "/settings",
};

export const Sidebar = () => {
  // Get real counts from stores
  const assets = useAssetStore((state) => state.assets);
  const talents = useTalentStore((state) => state.talents);
  const shotLists = useShotListStore((state) => state.shotLists);
  const templates = useTemplateStore((state) => state.templates);
  const brands = useBrandStore((state) => state.brands);

  // Memoize counts
  const counts = useMemo(() => ({
    assets: assets.size,
    talent: talents.size,
    shotlist: shotLists.size,
    templates: templates.size,
    brands: brands.size,
  }), [assets.size, talents.size, shotLists.size, templates.size, brands.size]);

  const navGroups = [
    {
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard size={18} />,
        },
        { id: "generate", label: "Generate", icon: <Wand2 size={18} /> },
      ],
    },
    {
      label: "Library",
      items: [
        { id: "assets", label: "Assets", icon: <Image size={18} />, count: counts.assets },
        { id: "talent", label: "Talent", icon: <User size={18} />, count: counts.talent },
      ],
    },
    {
      label: "Production",
      items: [
        {
          id: "shotlist",
          label: "Shot Lists",
          icon: <Film size={18} />,
          count: counts.shotlist,
        },
        {
          id: "templates",
          label: "Templates",
          icon: <LayoutTemplate size={18} />,
          count: counts.templates,
        },
      ],
    },
    {
      label: "Configuration",
      items: [
        { id: "brands", label: "Brands", icon: <Tag size={18} />, count: counts.brands },
        { id: "settings", label: "Settings", icon: <Settings size={18} /> },
      ],
    },
  ];

  return (
    <aside className="w-[240px] bg-surface border-r border-border shadow-sm flex flex-col flex-shrink-0 transition-all duration-300">
      {/* Logo Area - Elegant serif */}
      <div className="h-20 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-3xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-serif text-xl font-semibold text-text tracking-tight">
              Thresho
            </h1>
            <span className="text-[11px] text-text-muted">Studio</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {group.label && (
              <h3 className="px-3 mb-2 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                {group.label}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={PAGE_PATHS[item.id]}
                  className={({ isActive }) => `
                    w-full px-3 py-2 flex items-center justify-between rounded-3xl text-sm font-medium transition-all duration-200 group
                    ${
                      isActive
                        ? "text-text bg-primary-light"
                        : "text-text-muted hover:bg-bg-subtle hover:text-text"
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className={`
                            ${isActive ? "text-primary" : "text-text-muted group-hover:text-text"}
                            transition-colors
                          `}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`
                          text-[11px] px-2 py-0.5 rounded-full font-medium
                          ${isActive ? "bg-white text-primary" : "bg-bg-subtle text-text-muted"}
                        `}>
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-3xl hover:bg-bg-subtle transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-sm font-medium">
            DJ
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text truncate">DJ</span>
            <span className="text-xs text-text-muted truncate">
              dj@thresho.com
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};