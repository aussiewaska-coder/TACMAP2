import { Button } from '@/components/ui/button';
import { PitchPresets } from '../shared/PitchPresets';
import { QuickViewControls } from '../shared/QuickViewControls';
import { KeyboardHint } from '../shared/KeyboardHint';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import React from 'react';

interface FlightModeControlsProps {
  currentPitch: number;
  flightPitchTarget: number;
  activeMagnification: null | '5x' | '10x';
  onHeadingLeft: () => void;
  onHeadingRight: () => void;
  onAltitudeUp: () => void;
  onAltitudeDown: () => void;
  onPitchSet: (pitch: number) => void;
  onMagnificationChange: (mag: null | '5x' | '10x') => void;
  onInputStop: () => void;
}

export function FlightModeControls({
  currentPitch,
  flightPitchTarget,
  activeMagnification,
  onHeadingLeft,
  onHeadingRight,
  onAltitudeUp,
  onAltitudeDown,
  onPitchSet,
  onMagnificationChange,
  onInputStop,
}: FlightModeControlsProps) {
  return (
    <>
      {/* Heading Controls */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold flex items-center justify-between">
          <span>Heading</span>
          <div className="flex gap-1">
            <KeyboardHint shortcut="A" />
            <KeyboardHint shortcut="D" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={onHeadingLeft}
            onMouseUp={onInputStop}
            onTouchStart={onHeadingLeft}
            onTouchEnd={onInputStop}
            onMouseLeave={onInputStop}
            className="flex-1 h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
            title="Turn left (A key)"
          >
            <ChevronLeft className="size-4 mr-1.5" /> Left
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={onHeadingRight}
            onMouseUp={onInputStop}
            onTouchStart={onHeadingRight}
            onTouchEnd={onInputStop}
            onMouseLeave={onInputStop}
            className="flex-1 h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
            title="Turn right (D key)"
          >
            Right <ChevronRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Climb/Descend Controls */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold flex items-center justify-between">
          <span>Climb/Descend</span>
          <div className="flex gap-1">
            <KeyboardHint shortcut="W" />
            <KeyboardHint shortcut="S" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={onAltitudeUp}
            onMouseUp={onInputStop}
            onTouchStart={onAltitudeUp}
            onTouchEnd={onInputStop}
            onMouseLeave={onInputStop}
            className="flex-1 h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
            title="Climb (W key)"
          >
            <Plus className="size-4 mr-1.5" /> Climb
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={onAltitudeDown}
            onMouseUp={onInputStop}
            onTouchStart={onAltitudeDown}
            onTouchEnd={onInputStop}
            onMouseLeave={onInputStop}
            className="flex-1 h-11 text-sm bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
            title="Descend (S key)"
          >
            <Minus className="size-4 mr-1.5" /> Desc
          </Button>
        </div>
      </div>

      {/* Pitch Controls */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Pitch</div>
        <PitchPresets
          presets={[0, 15, 30, 45, 60, 75, 80]}
          currentPitch={flightPitchTarget}
          onPitchSelect={onPitchSet}
          threshold={5}
        />
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
    </>
  );
}
