/**
 * CSV Import Service for Shot Lists
 * Handles parsing and validation of CSV files for shot import
 */

import Papa from 'papaparse';
import type { CreateShotInput, ShotType, CameraMovement, LightingSetup } from '../../../core/types/shotList';
import type { UUID } from '../../../core/types/common';

/**
 * CSV row structure for shot import
 */
export interface CsvShotRow {
  name: string;
  description: string;
  shotType?: string;
  cameraMovement?: string;
  lighting?: string;
  aspectRatio?: string;
  duration?: string;
  location?: string;
  subjects?: string;
  priority?: string;
  tags?: string;
  notes?: string;
}

/**
 * Import validation error
 */
export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Import warning
 */
export interface ImportWarning {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Result of CSV import parsing
 */
export interface ImportResult {
  success: boolean;
  shots: CreateShotInput[];
  errors: ImportError[];
  warnings: ImportWarning[];
  totalRows: number;
  validRows: number;
}

// Valid shot types
const VALID_SHOT_TYPES: ShotType[] = [
  'wide',
  'medium',
  'close-up',
  'extreme-close',
  'over-shoulder',
  'pov',
  'aerial',
  'low-angle',
  'high-angle',
  'dutch-angle',
  'tracking',
  'pan',
  'tilt',
  'zoom',
  'static',
  'handheld',
  'steadicam',
  'crane',
  'dolly',
  'custom',
];

// Valid camera movements
const VALID_CAMERA_MOVEMENTS: CameraMovement[] = [
  'static',
  'pan-left',
  'pan-right',
  'tilt-up',
  'tilt-down',
  'dolly-in',
  'dolly-out',
  'truck-left',
  'truck-right',
  'crane-up',
  'crane-down',
  'zoom-in',
  'zoom-out',
  'follow',
  'orbit',
  'push-in',
  'pull-out',
  'whip-pan',
  'rack-focus',
  'custom',
];

// Valid lighting setups
const VALID_LIGHTING_SETUPS: LightingSetup[] = [
  'natural',
  'golden-hour',
  'blue-hour',
  'overcast',
  'studio-three-point',
  'studio-rembrandt',
  'studio-split',
  'studio-butterfly',
  'studio-loop',
  'high-key',
  'low-key',
  'silhouette',
  'backlit',
  'side-lit',
  'neon',
  'practical',
  'mixed',
  'custom',
];

// Normalization mappings for shot types
const SHOT_TYPE_ALIASES: Record<string, ShotType> = {
  // Common abbreviations
  'cu': 'close-up',
  'ecu': 'extreme-close',
  'ws': 'wide',
  'ms': 'medium',
  'ots': 'over-shoulder',
  'os': 'over-shoulder',
  'la': 'low-angle',
  'ha': 'high-angle',
  'da': 'dutch-angle',
  
  // Variations with spaces
  'close up': 'close-up',
  'closeup': 'close-up',
  'extreme close up': 'extreme-close',
  'extreme closeup': 'extreme-close',
  'extreme close-up': 'extreme-close',
  'over shoulder': 'over-shoulder',
  'over the shoulder': 'over-shoulder',
  'point of view': 'pov',
  'low angle': 'low-angle',
  'high angle': 'high-angle',
  'dutch angle': 'dutch-angle',
  'dutch tilt': 'dutch-angle',
  
  // Alternative names
  'establishing': 'wide',
  'long shot': 'wide',
  'full shot': 'wide',
  'medium shot': 'medium',
  'mid shot': 'medium',
  'detail': 'extreme-close',
  'macro': 'extreme-close',
  'bird\'s eye': 'aerial',
  'birds eye': 'aerial',
  'drone': 'aerial',
  'top down': 'aerial',
  'worm\'s eye': 'low-angle',
  'worms eye': 'low-angle',
  'dutch': 'dutch-angle',
  'canted': 'dutch-angle',
  'follow shot': 'tracking',
  'panning': 'pan',
  'tilting': 'tilt',
  'zooming': 'zoom',
  'locked off': 'static',
  'tripod': 'static',
  'hand held': 'handheld',
  'hand-held': 'handheld',
};

// Normalization mappings for camera movements
const CAMERA_MOVEMENT_ALIASES: Record<string, CameraMovement> = {
  // Variations with spaces
  'pan left': 'pan-left',
  'pan right': 'pan-right',
  'tilt up': 'tilt-up',
  'tilt down': 'tilt-down',
  'dolly in': 'dolly-in',
  'dolly out': 'dolly-out',
  'truck left': 'truck-left',
  'truck right': 'truck-right',
  'crane up': 'crane-up',
  'crane down': 'crane-down',
  'zoom in': 'zoom-in',
  'zoom out': 'zoom-out',
  'whip pan': 'whip-pan',
  'rack focus': 'rack-focus',
  
  // Alternative names
  'none': 'static',
  'fixed': 'static',
  'locked': 'static',
  'left pan': 'pan-left',
  'right pan': 'pan-right',
  'up tilt': 'tilt-up',
  'down tilt': 'tilt-down',
  'push in': 'push-in',
  'pull out': 'pull-out',
  'whippan': 'whip-pan',
  'swish pan': 'whip-pan',
  'focus pull': 'rack-focus',
  'pull focus': 'rack-focus',
};

// Normalization mappings for lighting setups
const LIGHTING_SETUP_ALIASES: Record<string, LightingSetup> = {
  // Variations with spaces
  'golden hour': 'golden-hour',
  'blue hour': 'blue-hour',
  'three point': 'studio-three-point',
  'three-point': 'studio-three-point',
  '3 point': 'studio-three-point',
  '3-point': 'studio-three-point',
  'rembrandt': 'studio-rembrandt',
  'split': 'studio-split',
  'butterfly': 'studio-butterfly',
  'loop': 'studio-loop',
  'high key': 'high-key',
  'low key': 'low-key',
  'side lit': 'side-lit',
  
  // Alternative names
  'daylight': 'natural',
  'sunlight': 'natural',
  'sun': 'natural',
  'magic hour': 'golden-hour',
  'twilight': 'blue-hour',
  '3pt': 'studio-three-point',
  'three pt': 'studio-three-point',
  'standard': 'studio-three-point',
  'classic': 'studio-rembrandt',
  ' Paramount': 'studio-butterfly',
  'beauty': 'studio-butterfly',
  ' glamour': 'studio-butterfly',
  'highkey': 'high-key',
  'bright': 'high-key',
  'lowkey': 'low-key',
  'dark': 'low-key',
  'moody': 'low-key',
  'shadow': 'silhouette',
  'back lit': 'backlit',
  'back light': 'backlit',
  'rim light': 'backlit',
  'side light': 'side-lit',
  'neon lights': 'neon',
  'available light': 'practical',
  'existing light': 'practical',
  'combination': 'mixed',
};

/**
 * Normalize a shot type value
 */
function normalizeShotType(value: string | undefined): ShotType | undefined {
  if (!value) return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  // Check if it's already valid
  if (VALID_SHOT_TYPES.includes(normalized as ShotType)) {
    return normalized as ShotType;
  }
  
  // Check aliases
  const alias = SHOT_TYPE_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  
  return undefined;
}

/**
 * Normalize a camera movement value
 */
function normalizeCameraMovement(value: string | undefined): CameraMovement | undefined {
  if (!value) return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  // Check if it's already valid
  if (VALID_CAMERA_MOVEMENTS.includes(normalized as CameraMovement)) {
    return normalized as CameraMovement;
  }
  
  // Check aliases
  const alias = CAMERA_MOVEMENT_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  
  return undefined;
}

/**
 * Normalize a lighting setup value
 */
function normalizeLightingSetup(value: string | undefined): LightingSetup | undefined {
  if (!value) return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  // Check if it's already valid
  if (VALID_LIGHTING_SETUPS.includes(normalized as LightingSetup)) {
    return normalized as LightingSetup;
  }
  
  // Check aliases
  const alias = LIGHTING_SETUP_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  
  return undefined;
}

/**
 * Parse a CSV file and convert to shot inputs
 */
export async function parseShotCsv(
  file: File,
  shotListId: UUID
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    shots: [],
    errors: [],
    warnings: [],
    totalRows: 0,
    validRows: 0,
  };

  return new Promise((resolve) => {
    Papa.parse<CsvShotRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize header names
        const normalized = header.toLowerCase().trim();
        const headerMap: Record<string, keyof CsvShotRow> = {
          'shot name': 'name',
          'shot title': 'name',
          'title': 'name',
          'shot description': 'description',
          'desc': 'description',
          'shot type': 'shotType',
          'type': 'shotType',
          'camera movement': 'cameraMovement',
          'movement': 'cameraMovement',
          'camera': 'cameraMovement',
          'lighting setup': 'lighting',
          'lighting': 'lighting',
          'light': 'lighting',
          'aspect ratio': 'aspectRatio',
          'ratio': 'aspectRatio',
          'duration (seconds)': 'duration',
          'duration (secs)': 'duration',
          'duration (s)': 'duration',
          'length': 'duration',
          'shot location': 'location',
          'set': 'location',
          'subjects (comma separated)': 'subjects',
          'subjects': 'subjects',
          'subject': 'subjects',
          'priority (1-5)': 'priority',
          'tags (comma separated)': 'tags',
          'production notes': 'notes',
        };
        return headerMap[normalized] || normalized;
      },
      complete: (parseResult) => {
        result.totalRows = parseResult.data.length;

        // Check for parsing errors
        if (parseResult.errors.length > 0) {
          parseResult.errors.forEach((error) => {
            if (error.row !== undefined) {
              result.errors.push({
                row: error.row + 2, // +2 for header and 1-based indexing
                field: 'csv',
                message: error.message,
              });
            }
          });
        }

        // Process each row
        parseResult.data.forEach((row, index) => {
          const rowNumber = index + 2; // +2 for header and 1-based indexing
          const errors: ImportError[] = [];
          const warnings: ImportWarning[] = [];

          // Validate required fields
          if (!row.name || row.name.trim() === '') {
            errors.push({
              row: rowNumber,
              field: 'name',
              message: 'Shot name is required',
            });
          }

          if (!row.description || row.description.trim() === '') {
            errors.push({
              row: rowNumber,
              field: 'description',
              message: 'Shot description is required',
            });
          }

          // If there are validation errors, skip this row
          if (errors.length > 0) {
            result.errors.push(...errors);
            return;
          }

          // Build shot input
          const shot: CreateShotInput = {
            shotListId,
            name: row.name.trim(),
            description: row.description.trim(),
          };

          // Process optional fields with normalization
          if (row.shotType) {
            const normalizedType = normalizeShotType(row.shotType);
            if (normalizedType) {
              shot.shotType = normalizedType;
            } else {
              warnings.push({
                row: rowNumber,
                field: 'shotType',
                message: `Unknown shot type "${row.shotType}", using default`,
                value: row.shotType,
              });
            }
          }

          if (row.cameraMovement) {
            const normalizedMovement = normalizeCameraMovement(row.cameraMovement);
            if (normalizedMovement) {
              shot.cameraMovement = normalizedMovement;
            } else {
              warnings.push({
                row: rowNumber,
                field: 'cameraMovement',
                message: `Unknown camera movement "${row.cameraMovement}", using default`,
                value: row.cameraMovement,
              });
            }
          }

          if (row.lighting) {
            const normalizedLighting = normalizeLightingSetup(row.lighting);
            if (normalizedLighting) {
              shot.lighting = normalizedLighting;
            } else {
              warnings.push({
                row: rowNumber,
                field: 'lighting',
                message: `Unknown lighting setup "${row.lighting}", using default`,
                value: row.lighting,
              });
            }
          }

          // Process aspect ratio
          if (row.aspectRatio) {
            const validRatios = ['16:9', '9:16', '4:3', '1:1', '21:9', '2.39:1', '4:5'];
            const normalizedRatio = row.aspectRatio.trim();
            if (validRatios.includes(normalizedRatio)) {
              shot.aspectRatio = normalizedRatio as CreateShotInput['aspectRatio'];
            } else {
              warnings.push({
                row: rowNumber,
                field: 'aspectRatio',
                message: `Unknown aspect ratio "${row.aspectRatio}", using default`,
                value: row.aspectRatio,
              });
            }
          }

          // Process duration
          if (row.duration) {
            const duration = parseFloat(row.duration);
            if (!isNaN(duration) && duration > 0) {
              shot.duration = duration;
            } else {
              warnings.push({
                row: rowNumber,
                field: 'duration',
                message: `Invalid duration "${row.duration}", must be a positive number`,
                value: row.duration,
              });
            }
          }

          // Process location
          if (row.location) {
            shot.location = row.location.trim();
          }

          // Process subjects
          if (row.subjects) {
            shot.subjects = row.subjects
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          }

          // Process priority
          if (row.priority) {
            const priority = parseInt(row.priority, 10);
            if (!isNaN(priority) && priority >= 1 && priority <= 5) {
              shot.priority = priority;
            } else {
              warnings.push({
                row: rowNumber,
                field: 'priority',
                message: `Invalid priority "${row.priority}", must be 1-5`,
                value: row.priority,
              });
            }
          }

          // Process tags
          if (row.tags) {
            shot.tags = row.tags
              .split(',')
              .map((t) => t.trim())
              .filter((t) => t.length > 0);
          }

          // Add warnings and shot to result
          result.warnings.push(...warnings);
          result.shots.push(shot);
          result.validRows++;
        });

        result.success = result.errors.length === 0;
        resolve(result);
      },
      error: (error) => {
        result.errors.push({
          row: 0,
          field: 'file',
          message: `Failed to parse CSV: ${error.message}`,
        });
        resolve(result);
      },
    });
  });
}

/**
 * Generate a CSV template for shot import
 */
export function generateShotCsvTemplate(): string {
  const headers = [
    'name',
    'description',
    'shotType',
    'cameraMovement',
    'lighting',
    'aspectRatio',
    'duration',
    'location',
    'subjects',
    'priority',
    'tags',
    'notes',
  ];

  const exampleRow = [
    'Opening Wide Shot',
    'Wide establishing shot of the city skyline at dawn',
    'wide',
    'static',
    'golden-hour',
    '16:9',
    '5',
    'Downtown Rooftop',
    'city, skyline, buildings',
    '1',
    'establishing, exterior',
    'Capture during golden hour for warm tones',
  ];

  const validValuesComment = `# Valid Values:
# shotType: wide, medium, close-up, extreme-close, over-shoulder, pov, aerial, low-angle, high-angle, dutch-angle, tracking, pan, tilt, zoom, static, handheld, steadicam, crane, dolly, custom
# cameraMovement: static, pan-left, pan-right, tilt-up, tilt-down, dolly-in, dolly-out, truck-left, truck-right, crane-up, crane-down, zoom-in, zoom-out, follow, orbit, push-in, pull-out, whip-pan, rack-focus, custom
# lighting: natural, golden-hour, blue-hour, overcast, studio-three-point, studio-rembrandt, studio-split, studio-butterfly, studio-loop, high-key, low-key, silhouette, backlit, side-lit, neon, practical, mixed, custom
# aspectRatio: 16:9, 9:16, 4:3, 1:1, 21:9, 2.39:1, 4:5
# priority: 1-5 (1 = highest priority)
# subjects and tags: comma-separated values
#
# Required Fields: name, description
# Optional Fields: All other fields
`;

  return `${validValuesComment}${headers.join(',')}
${exampleRow.join(',')}`;
}
