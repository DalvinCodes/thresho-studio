/**
 * Shot List Page
 * Manage shot lists and storyboards
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Film, Image, Video } from 'lucide-react';
import type { UUID, ContentType } from '../core/types/common';
import { ShotListView, ShotEditor, useShotListStore, useShotLists } from '../features/shotList';

export function ShotListPage() {
  const { id, shotId } = useParams<{ id?: string; shotId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const shotLists = useShotLists();
  const {
    selectShotList,
    createShotList,
  } = useShotListStore();

  const selectedListId = useShotListStore((state) => state.selectedShotListId);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Sync modal state with URL path
  useEffect(() => {
    setShowCreateModal(location.pathname === '/shotlist/new');
  }, [location.pathname]);

  // Sync selected list with URL param
  useEffect(() => {
    if (id && id !== 'new') {
      selectShotList(id as UUID);
    } else if (!id) {
      selectShotList(null);
    }
  }, [id, selectShotList]);

  // If editing a shot
  if (shotId && id && id !== 'new') {
    return (
      <ShotEditor
        shotId={shotId as UUID}
        onClose={() => navigate(`/shotlist/${id}`)}
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
            onClick={() => navigate('/shotlist/new')}
            className="w-full py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors text-sm"
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
                  onClick={() => navigate(`/shotlist/${list.id}`)}
                  className={`
                    w-full p-3 rounded-3xl text-left transition-colors
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
            onEditShot={(shotId) => navigate(`/shotlist/${selectedListId}/shots/${shotId}/edit`)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Film className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No Shot List Selected
              </h3>
              <p className="text-text-secondary mb-4">
                Select a shot list from the sidebar or create a new one
              </p>
              <button
                onClick={() => navigate('/shotlist/new')}
                className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
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
          onClose={() => {
            setShowCreateModal(false);
            navigate('/shotlist');
          }}
          onCreate={(name, type) => {
            const newId = createShotList(name, type);
            setShowCreateModal(false);
            navigate(`/shotlist/${newId}`);
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
      <div className="bg-surface rounded-3xl p-6 max-w-md w-full mx-4">
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
              className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
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
                  p-3 rounded-3xl border-2 transition-all text-center
                  ${contentType === 'image'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <Image className={`w-6 h-6 mx-auto mb-1 ${contentType === 'image' ? 'text-primary' : 'text-text-secondary'}`} />
                <span className="text-sm text-text-primary">Images</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('video')}
                className={`
                  p-3 rounded-3xl border-2 transition-all text-center
                  ${contentType === 'video'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <Video className={`w-6 h-6 mx-auto mb-1 ${contentType === 'video' ? 'text-primary' : 'text-text-secondary'}`} />
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
              className="px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
