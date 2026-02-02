/**
 * Inline Batch Creation Row Component
 * Clean, polished inline shot creation form
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Plus, X, Check } from "lucide-react";
import type { UUID } from "../../../core/types/common";
import type {
  CreateShotInput,
  ShotType,
  CameraMovement,
  LightingSetup,
} from "../../../core/types/shotList";
import { useTalentStore } from "../../talent/store";

interface InlineBatchRowProps {
  shotListId: UUID;
  nextShotNumber: string;
  onCreate: (input: CreateShotInput) => void;
  visibleColumns: Set<string>;
}

const SHOT_TYPES: ShotType[] = [
  "wide",
  "medium",
  "close-up",
  "extreme-close",
  "over-shoulder",
  "pov",
  "aerial",
  "low-angle",
  "high-angle",
  "dutch-angle",
  "tracking",
  "pan",
  "tilt",
  "zoom",
  "static",
  "handheld",
  "steadicam",
  "crane",
  "dolly",
  "custom",
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  "static",
  "pan-left",
  "pan-right",
  "tilt-up",
  "tilt-down",
  "dolly-in",
  "dolly-out",
  "truck-left",
  "truck-right",
  "crane-up",
  "crane-down",
  "zoom-in",
  "zoom-out",
  "follow",
  "orbit",
  "push-in",
  "pull-out",
  "whip-pan",
  "rack-focus",
  "custom",
];

const LIGHTING_SETUPS: LightingSetup[] = [
  "natural",
  "golden-hour",
  "blue-hour",
  "overcast",
  "studio-three-point",
  "studio-rembrandt",
  "studio-split",
  "studio-butterfly",
  "studio-loop",
  "high-key",
  "low-key",
  "silhouette",
  "backlit",
  "side-lit",
  "neon",
  "practical",
  "mixed",
  "custom",
];

const PRIORITIES = [
  {
    value: 1,
    label: "1",
    title: "Critical",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    value: 2,
    label: "2",
    title: "High",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    value: 3,
    label: "3",
    title: "Medium",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  {
    value: 4,
    label: "4",
    title: "Low",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    value: 5,
    label: "5",
    title: "Optional",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
];

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Compact Talent Cell for inline row
interface InlineTalentCellProps {
  selectedIds: UUID[];
  onChange: (ids: UUID[]) => void;
}

function InlineTalentCell({ selectedIds, onChange }: InlineTalentCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const talents = useTalentStore((state) => state.talents);

  const filteredTalents = useMemo(() => {
    let result = Array.from(talents.values()).filter((t) => !t.isArchived);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query),
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [talents, searchQuery]);

  const selectedTalents = useMemo(() => {
    return selectedIds
      .map((id) => talents.get(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [selectedIds, talents]);

  const handleToggle = useCallback(
    (talentId: UUID) => {
      if (selectedIds.includes(talentId)) {
        onChange(selectedIds.filter((id) => id !== talentId));
      } else {
        onChange([...selectedIds, talentId]);
      }
    },
    [selectedIds, onChange],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <td className="px-3 py-4 w-[140px]">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full min-h-[36px] px-2 py-1.5 text-left text-sm rounded-lg transition-colors
            flex items-center gap-1 flex-wrap bg-background border
            ${
              isOpen
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }
          `}
        >
          {selectedTalents.length === 0 ? (
            <span className="text-text-muted text-xs">+ Talent...</span>
          ) : (
            <>
              {selectedTalents.slice(0, 1).map((talent) => (
                <span
                  key={talent.id}
                  className="inline-flex items-center px-1.5 py-0.5 bg-primary/15 text-primary text-xs rounded"
                >
                  {talent.name}
                </span>
              ))}
              {selectedTalents.length > 1 && (
                <span className="text-text-secondary text-xs">
                  +{selectedTalents.length - 1}
                </span>
              )}
            </>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 w-56 mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search talents..."
                className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-40">
              {filteredTalents.length === 0 ? (
                <div className="p-2 text-center text-text-secondary text-xs">
                  No talents found
                </div>
              ) : (
                filteredTalents.map((talent) => {
                  const isSelected = selectedIds.includes(talent.id);
                  return (
                    <button
                      key={talent.id}
                      type="button"
                      onClick={() => handleToggle(talent.id)}
                      className={`
                        w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-surface-raised transition-colors
                        ${isSelected ? "bg-primary/10" : ""}
                      `}
                    >
                      <span
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center text-xs
                          ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border"
                          }
                        `}
                      >
                        {isSelected && "✓"}
                      </span>
                      <span className="truncate">{talent.name}</span>
                    </button>
                  );
                })
              )}
            </div>
            {selectedTalents.length > 0 && (
              <div className="p-2 border-t border-border text-xs text-text-secondary flex justify-between items-center">
                <span>{selectedTalents.length} selected</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-red-500 hover:text-red-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </td>
  );
}

export function InlineBatchRow({
  shotListId,
  nextShotNumber,
  onCreate,
  visibleColumns,
}: InlineBatchRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<CreateShotInput>({
    shotListId,
    name: "",
    description: "",
    shotType: "medium",
    cameraMovement: "static",
    lighting: "natural",
    location: "",
    subjects: [],
    talentIds: [],
    duration: undefined,
    priority: 3,
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  // Keyboard shortcut 'a' to start adding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdding) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        setIsAdding(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdding]);

  const handleSubmit = useCallback(() => {
    if (!formData.name.trim()) return;

    onCreate({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    });

    // Reset but stay open
    setFormData({
      shotListId,
      name: "",
      description: "",
      shotType: "medium",
      cameraMovement: "static",
      lighting: "natural",
      location: "",
      subjects: [],
      talentIds: [],
      duration: undefined,
      priority: 3,
    });

    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [formData, onCreate, shotListId]);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setFormData({
      shotListId,
      name: "",
      description: "",
      shotType: "medium",
      cameraMovement: "static",
      lighting: "natural",
      location: "",
      subjects: [],
      talentIds: [],
      duration: undefined,
      priority: 3,
    });
  }, [shotListId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSubmit, handleCancel],
  );

  const updateField = useCallback(
    <K extends keyof CreateShotInput>(field: K, value: CreateShotInput[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubjectsChange = useCallback(
    (value: string) => {
      const subjects = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      updateField("subjects", subjects);
    },
    [updateField],
  );

  if (!isAdding) {
    return (
      <tr className="border-t-2 border-dashed border-border/50">
        <td colSpan={14} className="px-4 py-4">
          <button
            onClick={() => setIsAdding(true)}
            className="group w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-text-secondary hover:text-primary bg-surface/50 hover:bg-surface rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span>Add new shot</span>
            <span className="text-text-muted">(or press 'a')</span>
          </button>
        </td>
      </tr>
    );
  }

  const priority =
    PRIORITIES.find((p) => p.value === formData.priority) || PRIORITIES[2];

  return (
    <tr className="bg-primary/[0.08] border-t-2 border-primary/30">
      {/* Checkbox spacer */}
      <td className="px-2 py-4">
        <div className="w-4" />
      </td>

      {/* Drag handle spacer */}
      <td className="px-2 py-4">
        <div className="w-4" />
      </td>

      {/* Shot Number */}
      <td className="px-3 py-4">
        <span className="text-sm font-mono text-text-secondary">
          {nextShotNumber}
        </span>
      </td>

      {/* Name - wider, more prominent */}
      <td className="px-3 py-4 min-w-[180px]">
        <input
          ref={nameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Shot name..."
          className="w-full px-3 py-2 bg-background border-2 border-primary/40 rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Description */}
      <td className="px-3 py-4 min-w-[200px]">
        <input
          type="text"
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Type */}
      <td className="px-3 py-4 w-[100px]">
        <select
          value={formData.shotType}
          onChange={(e) => updateField("shotType", e.target.value as ShotType)}
          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
        >
          {SHOT_TYPES.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </td>

      {/* Movement */}
      {visibleColumns.has("movement") && (
        <td className="px-3 py-4 w-[110px]">
          <select
            value={formData.cameraMovement}
            onChange={(e) =>
              updateField("cameraMovement", e.target.value as CameraMovement)
            }
            className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
          >
            {CAMERA_MOVEMENTS.map((opt) => (
              <option key={opt} value={opt}>
                {formatLabel(opt)}
              </option>
            ))}
          </select>
        </td>
      )}

      {/* Lighting */}
      {visibleColumns.has("lighting") && (
        <td className="px-3 py-4 w-[130px]">
          <select
            value={formData.lighting}
            onChange={(e) =>
              updateField("lighting", e.target.value as LightingSetup)
            }
            className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
          >
            {LIGHTING_SETUPS.map((opt) => (
              <option key={opt} value={opt}>
                {formatLabel(opt)}
              </option>
            ))}
          </select>
        </td>
      )}

      {/* Location */}
      {visibleColumns.has("location") && (
        <td className="px-3 py-4 w-[140px]">
          <input
            type="text"
            value={formData.location || ""}
            onChange={(e) =>
              updateField("location", e.target.value || undefined)
            }
            onKeyDown={handleKeyDown}
            placeholder="Location..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </td>
      )}

      {/* Subjects */}
      {visibleColumns.has("subjects") && (
        <td className="px-3 py-4 w-[150px]">
          <input
            type="text"
            value={formData.subjects?.join(", ") || ""}
            onChange={(e) => handleSubjectsChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Subject1, Subject2"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </td>
      )}

      {/* Talent */}
      {visibleColumns.has("talent") && (
        <InlineTalentCell
          selectedIds={formData.talentIds || []}
          onChange={(ids) => updateField("talentIds", ids)}
        />
      )}

      {/* Status */}
      {visibleColumns.has("status") && (
        <td className="px-3 py-4">
          <span className="inline-flex items-center px-2.5 py-1 bg-gray-500/15 text-gray-400 text-xs font-medium rounded-md border border-gray-500/20">
            Planned
          </span>
        </td>
      )}

      {/* Priority */}
      <td className="px-3 py-4 w-[80px]">
        <select
          value={formData.priority}
          onChange={(e) => updateField("priority", Number(e.target.value))}
          title={priority.title}
          className={`w-full px-2 py-1.5 rounded-md text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${priority.className}`}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </td>

      {/* Duration */}
      <td className="px-3 py-4 w-[70px]">
        <input
          type="number"
          value={formData.duration || ""}
          onChange={(e) => {
            const val = e.target.value
              ? parseInt(e.target.value, 10)
              : undefined;
            updateField("duration", val);
          }}
          onKeyDown={handleKeyDown}
          placeholder="sec"
          min={0}
          className="w-full px-2 py-2 bg-background border border-border rounded-lg text-text-primary text-sm text-center placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </td>

      {/* Actions */}
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Check className="w-3 h-3" />
            Add
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1.5 text-text-secondary hover:text-text-primary text-xs transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default InlineBatchRow;
