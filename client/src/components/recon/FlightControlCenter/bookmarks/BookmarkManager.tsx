import { useState } from 'react';
import { MapPin, Trash2, Edit2, Check, X } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';
import { useCameraAnimation } from '@/hooks/useCameraAnimation';
import { Button } from '@/components/ui/button';
import { KeyboardHint } from '../shared/KeyboardHint';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Bookmark } from '@/stores/flightControlStore';

export function BookmarkManager() {
  const map = useMapStore((state) => state.map);
  const { bookmarks, addBookmark, removeBookmark, updateBookmark } = useFlightControlStore();
  const { animateTo } = useCameraAnimation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSaveCurrentLocation = () => {
    if (!map) return;

    const center = map.getCenter();
    const name = `Location ${bookmarks.length + 1}`;

    addBookmark({
      name,
      coords: [center.lng, center.lat],
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
      icon: '📍',
      color: 'cyan',
    });

    toast.success(`Saved "${name}"`);
  };

  const handleFlyToBookmark = (bookmark: Bookmark) => {
    animateTo({
      center: bookmark.coords,
      zoom: bookmark.zoom,
      pitch: bookmark.pitch,
      bearing: bookmark.bearing,
      duration: 3000,
    });
    toast.info(`Flying to ${bookmark.name}`);
  };

  const handleDelete = (id: string, name: string) => {
    removeBookmark(id);
    toast.success(`Deleted "${name}"`);
  };

  const handleStartEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditName(bookmark.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateBookmark(id, { name: editName.trim() });
      toast.success('Bookmark renamed');
    }
    setEditingId(null);
  };

  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-500 uppercase font-semibold">Bookmarks</div>
        <KeyboardHint shortcut="B" />
      </div>

      {/* Bookmark List */}
      <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-3 bg-slate-800/40 rounded border border-slate-700/50">
            No bookmarks saved
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="flex items-center gap-2 bg-slate-800/40 rounded px-2.5 py-2 border border-slate-700/50 group"
            >
              {/* Icon */}
              <div className="text-lg flex-shrink-0">{bookmark.icon || '📍'}</div>

              {/* Name (editable) */}
              {editingId === bookmark.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(bookmark.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-slate-900 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-300 font-medium"
                  autoFocus
                />
              ) : (
                <div className="flex-1 text-xs text-slate-200 truncate font-medium">{bookmark.name}</div>
              )}

              {/* Actions */}
              {editingId === bookmark.id ? (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleSaveEdit(bookmark.id)}
                    className="h-7 w-7 flex-shrink-0"
                  >
                    <Check className="w-3 h-3 text-green-400" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-7 w-7 flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFlyToBookmark(bookmark)}
                    className="h-7 px-2 text-xs bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-500/50 flex-shrink-0 font-medium"
                  >
                    Fly
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(bookmark)}
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-3 h-3 text-slate-400" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(bookmark.id, bookmark.name)}
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Save Current Location Button */}
      <Button
        onClick={handleSaveCurrentLocation}
        className="w-full h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 font-medium"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Save Current Location
      </Button>
    </div>
  );
}
