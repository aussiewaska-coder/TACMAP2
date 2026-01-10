import { useEffect, useCallback } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';
import type { FlightMode } from '@/stores/flightControlStore';

export const KEYBOARD_SHORTCUTS = {
  // Mode selection: 1-5
  modes: {
    '1': 'auto-rotate',
    '2': 'auto-orbit',
    '3': 'flight',
    '4': 'random-path',
    '5': 'standard',
  } as Record<string, FlightMode>,

  // Flight controls: WASD + Arrow keys
  flight: {
    'w': 'climb',
    'W': 'climb',
    'ArrowUp': 'climb',
    's': 'descend',
    'S': 'descend',
    'ArrowDown': 'descend',
    'a': 'turn-left',
    'A': 'turn-left',
    'ArrowLeft': 'turn-left',
    'd': 'turn-right',
    'D': 'turn-right',
    'ArrowRight': 'turn-right',
  },

  // Standard navigation: Arrow keys only
  navigation: {
    'ArrowUp': 'pan-north',
    'ArrowDown': 'pan-south',
    'ArrowLeft': 'pan-west',
    'ArrowRight': 'pan-east',
  },

  // Zoom: +/- keys
  zoom: {
    '=': 'zoom-in',
    '+': 'zoom-in',
    '-': 'zoom-out',
    '_': 'zoom-out',
  },

  // Quick views: 5 and 0
  quickView: {
    '5': 'magnify-5x',
    '0': 'magnify-10x',
  },

  // Pitch presets
  pitch: {
    '`': 'pitch-0',
    '6': 'pitch-15',
    '7': 'pitch-30',
    '8': 'pitch-45',
    '9': 'pitch-60',
  },

  // Utilities
  utilities: {
    '?': 'toggle-help',
    'r': 'reset-bearing',
    'R': 'reset-bearing',
  },
} as const;

interface UseFlightKeyboardProps {
  activeMode: FlightMode;
  onModeChange: (mode: FlightMode) => void;
  flightControls: {
    adjustHeading: (delta: number) => void;
    adjustAltitude: (delta: number) => void;
    stopInput: () => void;
  };
  navControls: {
    panDirection: (dir: 'N' | 'S' | 'E' | 'W') => void;
    adjustZoom: (delta: number) => void;
    setPitch: (pitch: number) => void;
  };
  onHelp: () => void;
  onResetBearing: () => void;
}

export function useFlightKeyboard({
  activeMode,
  onModeChange,
  flightControls,
  navControls,
  onHelp,
  onResetBearing,
}: UseFlightKeyboardProps) {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { activeMagnification, setMagnification } = useFlightControlStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key;

      // Mode selection (1-5)
      if (key in KEYBOARD_SHORTCUTS.modes) {
        event.preventDefault();
        const mode = KEYBOARD_SHORTCUTS.modes[key as keyof typeof KEYBOARD_SHORTCUTS.modes];
        onModeChange(mode);
        return;
      }

      // Flight mode controls (WASD + Arrows)
      if (activeMode === 'flight') {
        const action = KEYBOARD_SHORTCUTS.flight[key as keyof typeof KEYBOARD_SHORTCUTS.flight];
        if (action) {
          event.preventDefault();
          switch (action) {
            case 'climb':
              flightControls.adjustAltitude(0.05);
              break;
            case 'descend':
              flightControls.adjustAltitude(-0.05);
              break;
            case 'turn-left':
              flightControls.adjustHeading(-0.5);
              break;
            case 'turn-right':
              flightControls.adjustHeading(0.5);
              break;
          }
          return;
        }
      }

      // Standard navigation (Arrows)
      if (activeMode === 'standard') {
        const action = KEYBOARD_SHORTCUTS.navigation[key as keyof typeof KEYBOARD_SHORTCUTS.navigation];
        if (action) {
          event.preventDefault();
          const dirMap: Record<string, 'N' | 'S' | 'E' | 'W'> = {
            'pan-north': 'N',
            'pan-south': 'S',
            'pan-west': 'W',
            'pan-east': 'E',
          };
          navControls.panDirection(dirMap[action]);
          return;
        }
      }

      // Zoom (always available)
      if (key === '=' || key === '+') {
        event.preventDefault();
        navControls.adjustZoom(1);
        return;
      }
      if (key === '-' || key === '_') {
        event.preventDefault();
        navControls.adjustZoom(-1);
        return;
      }

      // Quick views (5 and 0)
      if (key === '5') {
        event.preventDefault();
        setMagnification(activeMagnification === '5x' ? null : '5x');
        return;
      }
      if (key === '0') {
        event.preventDefault();
        setMagnification(activeMagnification === '10x' ? null : '10x');
        return;
      }

      // Pitch presets
      const pitchMap: Record<string, number> = {
        '`': 0,
        '6': 15,
        '7': 30,
        '8': 45,
        '9': 60,
      };
      if (key in pitchMap) {
        event.preventDefault();
        navControls.setPitch(pitchMap[key]);
        return;
      }

      // Utilities
      if (key === '?') {
        event.preventDefault();
        onHelp();
        return;
      }

      if ((key === 'r' || key === 'R') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        onResetBearing();
        return;
      }
    },
    [activeMode, onModeChange, flightControls, navControls, onHelp, onResetBearing, activeMagnification, setMagnification]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      // Stop flight input when releasing WASD/Arrows in flight mode
      if (activeMode === 'flight') {
        if (['w', 'W', 's', 'S', 'a', 'A', 'd', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          flightControls.stopInput();
        }
      }
    },
    [activeMode, flightControls]
  );

  useEffect(() => {
    if (!map || !isLoaded) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [map, isLoaded, handleKeyDown, handleKeyUp]);
}
