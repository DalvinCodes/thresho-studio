/**
 * Shot List Page
 * Manage shot lists and storyboards
 */

import { useState } from 'react';
import type { UUID, ContentType } from '../core/types/common';
import { ShotListView, ShotEditor, useShotListStore, useShotLists } from '../features/shotList';

export function ShotListPage() {
  const shotLists = useShotLists();
  const {
    selectShotList,
    createShotList,
  } = useShotListStore();

  const selectedListId = useShotListStore((state) => state.selectedShotListId);
  const [editingShotId, setEditingShotId] = useState<UUID | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // If editing a shot
  if (editingShotId && selectedListId) {
    return (
      <ShotEditor
        shotId={editingShotId}
        onClose={() => setEditingShotId(null)}
      />
    );
  }

  return (
    <div className="h-full flex">
      {/* Shot List Sidebar */}
      <div className="w-64 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary mb-3">Shot Lists</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            + New Shot List
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {shotLists.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">
              No shot lists yet
            </p>
          ) : (
            <div className="space-y-1">
              {shotLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => selectShotList(list.id)}
                  className={`
                    w-full p-3 rounded-lg text-left transition-colors
                    ${selectedListId === list.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-surface-hover text-text-primary'
                    }
                  `}
                >
                  <p className="font-medium truncate">{list.name}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {list.totalShots} shots • {list.completedShots} done
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {selectedListId ? (
          <ShotListView
            shotListId={selectedListId}
            onEditShot={(id) => setEditingShotId(id)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-4">🎬</p>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No Shot List Selected
              </h3>
              <p className="text-text-secondary mb-4">
                Select a shot list from the sidebar or create a new one
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Shot List
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateShotListModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, type) => {
            const id = createShotList(name, type);
            selectShotList(id);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Create Shot List Modal
interface CreateShotListModalProps {
  onClose: () => void;
  onCreate: (name: string, contentType: ContentType) => void;
}

function CreateShotListModal({ onClose, onCreate }: CreateShotListModalProps) {
  const [name, setName] = useState('');
  const [contentType, setContentType] = useState<ContentType>('image');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), contentType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Create New Shot List
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Shot List"
              autoFocus
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setContentType('image')}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${contentType === 'image'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <span className="text-2xl block mb-1">🖼️</span>
                <span className="text-sm text-text-primary">Images</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('video')}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${contentType === 'video'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <span className="text-2xl block mb-1">🎬</span>
                <span className="text-sm text-text-primary">Videos</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShotListPage;
