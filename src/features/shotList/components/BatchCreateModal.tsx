/**
 * Batch Create Shot Modal
 * Spreadsheet-style interface for adding multiple shots at once
 */

import { useState, useCallback, useRef } from "react";
import { X, Plus, Upload, FileDown, HelpCircle } from "lucide-react";
import { CsvInstructionsModal } from "./CsvInstructionsModal";
import type { UUID } from "../../../core/types/common";
import type {
  CreateShotInput,
  ShotType,
  CameraMovement,
  LightingSetup,
} from "../../../core/types/shotList";
import {
  parseShotCsv,
  generateShotCsvTemplate,
} from "../services/csvImportService";

interface BatchCreateModalProps {
  shotListId: UUID;
  onClose: () => void;
  onCreate: (shots: CreateShotInput[]) => void;
}

// Dropdown options based on task requirements
const SHOT_TYPES: ShotType[] = [
  "wide",
  "medium",
  "close-up",
  "extreme-close",
  "over-shoulder",
  "pov",
  "aerial",
  "tracking",
  "static",
  "handheld",
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  "static",
  "pan-left",
  "pan-right",
  "tilt-up",
  "tilt-down",
  "dolly-in",
  "dolly-out",
  "push-in",
  "pull-out",
  "zoom-in",
  "zoom-out",
  "follow",
  "orbit",
];

const LIGHTING_SETUPS: LightingSetup[] = [
  "natural",
  "golden-hour",
  "blue-hour",
  "studio-three-point",
  "studio-rembrandt",
  "high-key",
  "low-key",
  "silhouette",
  "backlit",
  "neon",
  "practical",
];

const PRIORITIES = [
  { value: 1, label: "1 - Critical" },
  { value: 2, label: "2 - High" },
  { value: 3, label: "3 - Medium" },
  { value: 4, label: "4 - Low" },
  { value: 5, label: "5 - Optional" },
];

// Default empty row
const createEmptyRow = (): CreateShotInput => ({
  shotListId: "" as UUID,
  name: "",
  description: "",
  shotType: "medium",
  cameraMovement: "static",
  lighting: "natural",
  duration: undefined,
  location: "",
  subjects: [],
  priority: 3,
});

export function BatchCreateModal({
  shotListId,
  onClose,
  onCreate,
}: BatchCreateModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "csv">("manual");
  const [rows, setRows] = useState<CreateShotInput[]>([createEmptyRow()]);
  const [errors, setErrors] = useState<Record<number, string[]>>({});
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CreateShotInput[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update a specific field in a row
  const updateRow = useCallback(
    (index: number, field: keyof CreateShotInput, value: unknown) => {
      setRows((prev) => {
        const newRows = [...prev];
        newRows[index] = { ...newRows[index], [field]: value };
        return newRows;
      });
      // Clear errors for this row when user makes changes
      setErrors((prev) => ({ ...prev, [index]: [] }));
    },
    [],
  );

  // Add a new row
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  // Remove a row
  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  }, []);

  // Fill down - copy value from current row to all rows below
  const fillDown = useCallback(
    (index: number, field: keyof CreateShotInput) => {
      setRows((prev) => {
        const value = prev[index][field];
        return prev.map((row, i) =>
          i >= index ? { ...row, [field]: value } : row,
        );
      });
    },
    [],
  );

  // Validate all rows
  const validateRows = useCallback((): boolean => {
    const newErrors: Record<number, string[]> = {};
    let isValid = true;

    rows.forEach((row, index) => {
      const rowErrors: string[] = [];

      if (!row.name || row.name.trim() === "") {
        rowErrors.push("Name is required");
      }

      if (!row.description || row.description.trim() === "") {
        rowErrors.push("Description is required");
      }

      if (rowErrors.length > 0) {
        newErrors[index] = rowErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rows]);

  // Handle create submission
  const handleCreate = useCallback(() => {
    if (activeTab === "manual") {
      if (!validateRows()) {
        return;
      }

      // Add shotListId to all rows
      const shotsWithId = rows.map((row) => ({
        ...row,
        shotListId,
      }));

      onCreate(shotsWithId);
      onClose();
    } else {
      // CSV tab
      if (csvPreview) {
        const shotsWithId = csvPreview.map((row) => ({
          ...row,
          shotListId,
        }));
        onCreate(shotsWithId);
        onClose();
      }
    }
  }, [
    activeTab,
    rows,
    csvPreview,
    shotListId,
    onCreate,
    onClose,
    validateRows,
  ]);

  // Handle CSV file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setCsvFile(file);
      setCsvErrors([]);

      const result = await parseShotCsv(file, shotListId);

      if (result.errors.length > 0) {
        setCsvErrors(result.errors.map((e) => `Row ${e.row}: ${e.message}`));
        setCsvPreview(null);
      } else {
        setCsvPreview(result.shots);
        if (result.warnings.length > 0) {
          setCsvErrors(
            result.warnings.map((w) => `Row ${w.row}: ${w.message}`),
          );
        }
      }
    },
    [shotListId],
  );

  // Download CSV template
  const downloadTemplate = useCallback(() => {
    const template = generateShotCsvTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shot-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Format subjects array for display
  const formatSubjects = (subjects: string[] | undefined): string => {
    return subjects?.join(", ") || "";
  };

  // Parse subjects string to array
  const parseSubjects = (value: string): string[] => {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Batch Create Shots
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Add multiple shots at once using the spreadsheet interface or CSV
              import
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "manual"
                ? "text-primary border-b-2 border-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "csv"
                ? "text-primary border-b-2 border-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            CSV Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "manual" ? (
            <div className="h-full flex flex-col">
              {/* Spreadsheet Header */}
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[50px_minmax(180px,1fr)_minmax(280px,2fr)_140px_140px_140px_160px_160px_100px_120px_80px] gap-3 px-6 py-3 bg-background border-b border-border text-xs font-medium text-text-secondary uppercase tracking-wider min-w-max">
                  <div></div>
                  <div>Name</div>
                  <div>Description</div>
                  <div>Type</div>
                  <div>Movement</div>
                  <div>Lighting</div>
                  <div>Location</div>
                  <div>Subjects</div>
                  <div>Duration</div>
                  <div>Priority</div>
                  <div></div>
                </div>
              </div>

              {/* Spreadsheet Rows */}
              <div className="flex-1 overflow-auto px-6 py-4 space-y-2">
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-[50px_minmax(180px,1fr)_minmax(280px,2fr)_140px_140px_140px_160px_160px_100px_120px_80px] gap-3 items-start min-w-max ${
                      errors[index]?.length > 0
                        ? "bg-red-500/5 rounded-lg p-2 -mx-2"
                        : ""
                    }`}
                  >
                    {/* Row Number */}
                    <div className="text-sm text-text-secondary pt-2">
                      {index + 1}
                    </div>

                    {/* Name */}
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(index, "name", e.target.value)}
                      placeholder="Shot name"
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    />

                    {/* Description */}
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        updateRow(index, "description", e.target.value)
                      }
                      placeholder="Description"
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    />

                    {/* Type */}
                    <select
                      value={row.shotType}
                      onChange={(e) =>
                        updateRow(index, "shotType", e.target.value as ShotType)
                      }
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      {SHOT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace("-", " ")}
                        </option>
                      ))}
                    </select>

                    {/* Movement */}
                    <select
                      value={row.cameraMovement}
                      onChange={(e) =>
                        updateRow(
                          index,
                          "cameraMovement",
                          e.target.value as CameraMovement,
                        )
                      }
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      {CAMERA_MOVEMENTS.map((movement) => (
                        <option key={movement} value={movement}>
                          {movement.replace("-", " ")}
                        </option>
                      ))}
                    </select>

                    {/* Lighting */}
                    <select
                      value={row.lighting}
                      onChange={(e) =>
                        updateRow(
                          index,
                          "lighting",
                          e.target.value as LightingSetup,
                        )
                      }
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      {LIGHTING_SETUPS.map((lighting) => (
                        <option key={lighting} value={lighting}>
                          {lighting.replace("-", " ")}
                        </option>
                      ))}
                    </select>

                    {/* Location */}
                    <input
                      type="text"
                      value={row.location || ""}
                      onChange={(e) =>
                        updateRow(index, "location", e.target.value)
                      }
                      placeholder="Location"
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    />

                    {/* Subjects */}
                    <input
                      type="text"
                      value={formatSubjects(row.subjects)}
                      onChange={(e) =>
                        updateRow(
                          index,
                          "subjects",
                          parseSubjects(e.target.value),
                        )
                      }
                      placeholder="Comma separated"
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    />

                    {/* Duration */}
                    <input
                      type="number"
                      value={row.duration || ""}
                      onChange={(e) =>
                        updateRow(
                          index,
                          "duration",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="Secs"
                      min={1}
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    />

                    {/* Priority */}
                    <select
                      value={row.priority}
                      onChange={(e) =>
                        updateRow(index, "priority", Number(e.target.value))
                      }
                      className="px-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => fillDown(index, "shotType")}
                        title="Fill down shot type"
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                        className="p-1.5 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Error Messages */}
                    {errors[index]?.length > 0 && (
                      <div className="col-span-11 text-xs text-red-400 mt-1">
                        {errors[index].join(", ")}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Row Button */}
                <button
                  onClick={addRow}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-xl transition-colors mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              </div>
            </div>
          ) : (
            /* CSV Import Tab */
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-medium text-text-primary">
                      Upload CSV File
                    </h3>
                    <button
                      onClick={() => setShowInstructions(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Instructions
                    </button>
                  </div>
                  <p className="text-sm text-text-secondary mb-4">
                    Import shots from a CSV file. Download the template below to
                    see the expected format.
                  </p>

                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </button>
                    {csvFile && (
                      <span className="text-sm text-text-secondary">
                        {csvFile.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-text-primary hover:bg-background transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Template
                  </button>
                </div>
              </div>

              {/* CSV Errors */}
              {csvErrors.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <h4 className="text-sm font-medium text-yellow-400 mb-2">
                    Import Warnings
                  </h4>
                  <ul className="text-sm text-yellow-400/80 space-y-1">
                    {csvErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CSV Preview */}
              {csvPreview && csvPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-3">
                    Preview ({csvPreview.length} shots)
                  </h4>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-background border-b border-border">
                          <tr>
                            <th className="px-4 py-2 text-left text-text-secondary font-medium">
                              Name
                            </th>
                            <th className="px-4 py-2 text-left text-text-secondary font-medium">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-text-secondary font-medium">
                              Type
                            </th>
                            <th className="px-4 py-2 text-left text-text-secondary font-medium">
                              Movement
                            </th>
                            <th className="px-4 py-2 text-left text-text-secondary font-medium">
                              Lighting
                            </th>
                            <th className="px-4 py-2 text-left text-text-secondary font-medium">
                              Location
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.slice(0, 5).map((shot, i) => (
                            <tr
                              key={i}
                              className="border-b border-border last:border-b-0"
                            >
                              <td className="px-4 py-2 text-text-primary">
                                {shot.name}
                              </td>
                              <td className="px-4 py-2 text-text-secondary truncate max-w-xs">
                                {shot.description}
                              </td>
                              <td className="px-4 py-2 text-text-primary">
                                {shot.shotType}
                              </td>
                              <td className="px-4 py-2 text-text-primary">
                                {shot.cameraMovement}
                              </td>
                              <td className="px-4 py-2 text-text-primary">
                                {shot.lighting}
                              </td>
                              <td className="px-4 py-2 text-text-primary">
                                {shot.location || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {csvPreview.length > 5 && (
                      <div className="px-4 py-2 bg-background border-t border-border text-sm text-text-secondary">
                        And {csvPreview.length - 5} more shots...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={activeTab === "csv" && !csvPreview}
            className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create{" "}
            {activeTab === "manual" ? rows.length : csvPreview?.length || 0}{" "}
            Shots
          </button>
        </div>

        {/* CSV Instructions Modal */}
        {showInstructions && (
          <CsvInstructionsModal onClose={() => setShowInstructions(false)} />
        )}
      </div>
    </div>
  );
}

export default BatchCreateModal;
