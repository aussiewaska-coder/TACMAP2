import { Button } from '@/components/ui/button';
import { DirectionPad } from '../shared/DirectionPad';
import { MiniCompass } from '../shared/MiniCompass';
import { PitchPresets } from '../shared/PitchPresets';
import { QuickViewControls } from '../shared/QuickViewControls';
import { KeyboardHint } from '../shared/KeyboardHint';
import { Plus, Minus } from 'lucide-react';

interface StandardNavControlsProps {
  currentBearing: number;
  currentPitch: number;
  activeMagnification: null | '5x' | '10x';
  onPan: (dir: 'N' | 'S' | 'E' | 'W') => void;
  onResetBearing: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPitchSet: (pitch: number) => void;
  onMagnificationChange: (mag: null | '5x' | '10x') => void;
}

export function StandardNavControls({
  currentBearing,
  currentPitch,
  activeMagnification,
  onPan,
  onResetBearing,
  onZoomIn,
  onZoomOut,
  onPitchSet,
  onMagnificationChange,
}: StandardNavControlsProps) {
  return (
    <>
      {/* Navigation Pad & Compass */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Navigation</div>
        <div className="flex items-center justify-between gap-4">
          <DirectionPad onPan={onPan} />
          <MiniCompass bearing={currentBearing} onReset={onResetBearing} />
        </div>
      </div>

      {/* Altitude Controls */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold flex items-center justify-between">
          <span>Altitude</span>
          <div className="flex gap-1">
            <KeyboardHint shortcut="+" />
            <KeyboardHint shortcut="-" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onZoomIn}
            className="flex-1 h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
          >
            <Plus className="size-4 mr-1.5" /> Up
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onZoomOut}
            className="flex-1 h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
          >
            <Minus className="size-4 mr-1.5" /> Down
          </Button>
        </div>
      </div>

      {/* Quick View Magnification */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold flex items-center justify-between">
          <span>Quick Views</span>
          <div className="flex gap-1">
            <KeyboardHint shortcut="5" />
            <KeyboardHint shortcut="0" />
          </div>
        </div>
        <QuickViewControls
          activeMagnification={activeMagnification}
          onMagnificationChange={onMagnificationChange}
        />
      </div>

      {/* Pitch Controls */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Pitch</div>
        <PitchPresets
          presets={[0, 30, 45, 60, 80]}
          currentPitch={currentPitch}
          onPitchSelect={onPitchSet}
          threshold={5}
        />
      </div>
    </>
  );
}
