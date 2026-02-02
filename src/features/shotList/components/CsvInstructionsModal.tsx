/**
 * CSV Instructions Modal
 * Comprehensive guide for importing shots via CSV
 */

import { useState } from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { generateShotCsvTemplate } from '../services/csvImportService';

interface CsvInstructionsModalProps {
  onClose: () => void;
}

// Shot types data with descriptions and aliases
const SHOT_TYPES_DATA = [
  {
    value: 'wide',
    description: 'Wide establishing shot showing the full scene',
    aliases: 'ws, establishing, long shot, full shot',
  },
  {
    value: 'medium',
    description: 'Medium shot framing subject from waist up',
    aliases: 'ms, medium shot, mid shot',
  },
  {
    value: 'close-up',
    description: 'Close-up shot focusing on subject\'s face or detail',
    aliases: 'cu, close up, closeup',
  },
  {
    value: 'extreme-close',
    description: 'Extreme close-up on a specific detail',
    aliases: 'ecu, extreme close up, extreme closeup, detail, macro',
  },
  {
    value: 'over-shoulder',
    description: 'Shot from behind one subject looking at another',
    aliases: 'ots, os, over shoulder, over the shoulder',
  },
  {
    value: 'pov',
    description: 'Point of view shot from character\'s perspective',
    aliases: 'point of view',
  },
  {
    value: 'aerial',
    description: 'Bird\'s eye view from above',
    aliases: 'bird\'s eye, birds eye, drone, top down',
  },
  {
    value: 'tracking',
    description: 'Following a moving subject',
    aliases: 'follow shot',
  },
  {
    value: 'static',
    description: 'Fixed camera position, no movement',
    aliases: 'locked off, tripod, none, fixed',
  },
  {
    value: 'handheld',
    description: 'Camera held by operator for natural movement',
    aliases: 'hand held, hand-held',
  },
  {
    value: 'steadicam',
    description: 'Smooth stabilized camera movement',
    aliases: '',
  },
  {
    value: 'crane',
    description: 'Elevated sweeping camera movement',
    aliases: '',
  },
  {
    value: 'dolly',
    description: 'Camera mounted on wheeled platform',
    aliases: '',
  },
];

// Camera movements data
const CAMERA_MOVEMENTS_DATA = [
  { value: 'static', description: 'No camera movement', aliases: 'none, fixed, locked' },
  { value: 'pan-left', description: 'Horizontal movement to the left', aliases: 'pan left, left pan' },
  { value: 'pan-right', description: 'Horizontal movement to the right', aliases: 'pan right, right pan' },
  { value: 'tilt-up', description: 'Vertical movement upward', aliases: 'tilt up, up tilt' },
  { value: 'tilt-down', description: 'Vertical movement downward', aliases: 'tilt down, down tilt' },
  { value: 'dolly-in', description: 'Camera moves closer to subject', aliases: 'dolly in, push in' },
  { value: 'dolly-out', description: 'Camera moves away from subject', aliases: 'dolly out, pull out' },
  { value: 'truck-left', description: 'Camera moves horizontally left', aliases: 'truck left' },
  { value: 'truck-right', description: 'Camera moves horizontally right', aliases: 'truck right' },
  { value: 'crane-up', description: 'Vertical boom up', aliases: 'crane up' },
  { value: 'crane-down', description: 'Vertical boom down', aliases: 'crane down' },
  { value: 'zoom-in', description: 'Lens zooms closer', aliases: 'zoom in' },
  { value: 'zoom-out', description: 'Lens zooms wider', aliases: 'zoom out' },
  { value: 'follow', description: 'Camera follows moving subject', aliases: '' },
  { value: 'orbit', description: 'Circular movement around subject', aliases: '' },
  { value: 'whip-pan', description: 'Fast pan creating motion blur', aliases: 'whip pan, swish pan, whippan' },
  { value: 'rack-focus', description: 'Shifting focus between subjects', aliases: 'rack focus, focus pull, pull focus' },
];

// Lighting setups data
const LIGHTING_SETUPS_DATA = [
  { value: 'natural', description: 'Available daylight', aliases: 'daylight, sunlight, sun' },
  { value: 'golden-hour', description: 'Warm light just after sunrise/before sunset', aliases: 'golden hour, magic hour' },
  { value: 'blue-hour', description: 'Cool light just before sunrise/after sunset', aliases: 'blue hour, twilight' },
  { value: 'overcast', description: 'Soft diffused daylight', aliases: '' },
  { value: 'studio-three-point', description: 'Key, fill, and backlight setup', aliases: 'three point, three-point, 3 point, 3-point, 3pt, standard' },
  { value: 'studio-rembrandt', description: 'Dramatic lighting with triangular highlight', aliases: 'rembrandt, classic' },
  { value: 'studio-split', description: 'Half-lit dramatic lighting', aliases: 'split' },
  { value: 'studio-butterfly', description: 'Overhead key with under fill', aliases: 'butterfly, Paramount, beauty, glamour' },
  { value: 'studio-loop', description: 'Slight shadow from key light', aliases: 'loop' },
  { value: 'high-key', description: 'Bright, low contrast lighting', aliases: 'high key, highkey, bright' },
  { value: 'low-key', description: 'Dark, high contrast lighting', aliases: 'low key, lowkey, dark, moody' },
  { value: 'silhouette', description: 'Subject as dark shape against bright background', aliases: 'shadow' },
  { value: 'backlit', description: 'Light source behind subject', aliases: 'back lit, back light, rim light' },
  { value: 'side-lit', description: 'Light from the side', aliases: 'side lit, side light' },
  { value: 'neon', description: 'Colored fluorescent lighting', aliases: 'neon lights' },
  { value: 'practical', description: 'Light sources visible in frame', aliases: 'available light, existing light' },
  { value: 'mixed', description: 'Combination of light sources', aliases: 'combination' },
];

// Other fields data
const OTHER_FIELDS_DATA = [
  {
    name: 'location',
    description: 'Where the shot takes place',
    example: 'Downtown Rooftop, Studio A, Park',
  },
  {
    name: 'subjects',
    description: 'Comma-separated list of subjects in the shot',
    example: 'actor1, actor2, car, building',
  },
  {
    name: 'talent',
    description: 'Names of performers or talent required',
    example: 'John Doe, Jane Smith',
  },
  {
    name: 'duration',
    description: 'Estimated shot length in seconds',
    example: '5, 10.5, 120',
  },
  {
    name: 'priority',
    description: 'Shot importance from 1 (critical) to 5 (optional)',
    example: '1, 2, 3, 4, 5',
  },
  {
    name: 'notes',
    description: 'Additional production notes or instructions',
    example: 'Capture during golden hour',
  },
];

// Pro tips
const PRO_TIPS = [
  'Use the Download Template button to get a properly formatted CSV file with example data.',
  'Column names are case-insensitive - you can use "Name", "name", or "NAME".',
  'For comma-separated fields (subjects, tags), avoid using commas within individual items.',
  'Unknown values for shotType, cameraMovement, or lighting will use defaults with a warning.',
  'Priority must be a number between 1-5. Invalid values will default to 3 (Medium).',
];

export function CsvInstructionsModal({ onClose }: CsvInstructionsModalProps) {
  const [copiedColumns, setCopiedColumns] = useState(false);

  const columnNames = 'name, description, shotType, cameraMovement, lighting, location, subjects, talent, duration, priority, notes';

  const handleCopyColumns = () => {
    navigator.clipboard.writeText(columnNames);
    setCopiedColumns(true);
    setTimeout(() => setCopiedColumns(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const template = generateShotCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shot-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">CSV Import Guide</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Complete reference for importing shots via CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-xl hover:bg-background"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Quick Start Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-text-primary">Quick Start</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Your CSV file should include these column headers. Only <strong>name</strong> and{' '}
              <strong>description</strong> are required.
            </p>
            <div className="bg-background rounded-xl p-4 font-mono text-sm text-text-primary border border-border">
              <div className="flex items-center justify-between">
                <code>{columnNames}</code>
                <button
                  onClick={handleCopyColumns}
                  className="text-xs px-3 py-1.5 bg-surface border border-border rounded-lg hover:bg-background transition-colors"
                >
                  {copiedColumns ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template CSV
            </button>
          </section>

          {/* Required Fields Section */}
          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-text-primary">Required Fields</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm font-mono">
                  name
                </span>
                <p className="text-sm text-text-secondary">
                  The name of the shot (e.g., &quot;Opening Wide Shot&quot;)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm font-mono">
                  description
                </span>
                <p className="text-sm text-text-secondary">
                  Detailed description of what happens in the shot
                </p>
              </div>
            </div>
          </section>

          {/* Shot Types Table */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Shot Types</h3>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Value</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Description</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Also Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {SHOT_TYPES_DATA.map((type, index) => (
                    <tr
                      key={type.value}
                      className={index % 2 === 0 ? 'bg-surface' : 'bg-background'}
                    >
                      <td className="px-4 py-2.5 font-mono text-text-primary">{type.value}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{type.description}</td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs">
                        {type.aliases || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Camera Movements Table */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Camera Movements</h3>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Value</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Description</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Also Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMERA_MOVEMENTS_DATA.map((movement, index) => (
                    <tr
                      key={movement.value}
                      className={index % 2 === 0 ? 'bg-surface' : 'bg-background'}
                    >
                      <td className="px-4 py-2.5 font-mono text-text-primary">{movement.value}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{movement.description}</td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs">
                        {movement.aliases || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lighting Setups Table */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Lighting Setups</h3>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Value</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Description</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">Also Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {LIGHTING_SETUPS_DATA.map((lighting, index) => (
                    <tr
                      key={lighting.value}
                      className={index % 2 === 0 ? 'bg-surface' : 'bg-background'}
                    >
                      <td className="px-4 py-2.5 font-mono text-text-primary">{lighting.value}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{lighting.description}</td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs">
                        {lighting.aliases || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Other Fields Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Other Fields</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OTHER_FIELDS_DATA.map((field) => (
                <div
                  key={field.name}
                  className="bg-background rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm text-text-primary">{field.name}</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">{field.description}</p>
                  <p className="text-xs text-text-secondary/60">Example: {field.example}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pro Tips Section */}
          <section className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-text-primary">Pro Tips</h3>
            </div>
            <ul className="space-y-3">
              {PRO_TIPS.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm text-text-secondary">{tip}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-text-primary hover:bg-background transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvInstructionsModal;
