// KeyboardControls - Enhanced keyboard/mouse controls for 3D navigation
// Adds modifier key combinations for pitch, rotate, etc.

import { useEffect, useCallback } from 'react';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

interface KeyboardControlsProps {
    enabled?: boolean;
}

/**
 * Enhanced keyboard and mouse controls for 3D map navigation
 * 
 * Controls:
 * - Shift + Drag: Adjust pitch (tilt)
 * - Ctrl/Cmd + Drag: Rotate map (bearing)
 * - Alt + Scroll: Zoom faster
 * - Shift + Scroll: Adjust pitch
 * - R: Reset to north
 * - T: Toggle between flat and 3D view
 * - +/-: Zoom in/out
 * - Arrow keys: Pan map
 */
export function KeyboardControls({ enabled = true }: KeyboardControlsProps) {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!map || !isLoaded || !enabled) return;

        // Ignore if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const pitch = map.getPitch();
        const bearing = map.getBearing();
        const center = map.getCenter();
        const zoom = map.getZoom();

        switch (e.key.toLowerCase()) {
            // R - Reset to north
            case 'r':
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    map.easeTo({ bearing: 0, duration: 500 });
                    toast.info('Reset to north', { duration: 1500 });
                }
                break;

            // T - Toggle 3D view
            case 't':
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    const newPitch = pitch < 30 ? 60 : 0;
                    map.easeTo({ pitch: newPitch, duration: 500 });
                    toast.info(newPitch > 0 ? '3D View' : 'Flat View', { duration: 1500 });
                }
                break;

            // + / = - Zoom in
            case '+':
            case '=':
                map.easeTo({ zoom: zoom + 1, duration: 300 });
                break;

            // - - Zoom out
            case '-':
                map.easeTo({ zoom: zoom - 1, duration: 300 });
                break;

            // Arrow keys - Pan
            case 'arrowup':
                if (e.shiftKey) {
                    // Shift + Up = Increase pitch
                    map.easeTo({ pitch: Math.min(pitch + 10, 85), duration: 200 });
                } else {
                    map.panBy([0, -100], { duration: 200 });
                }
                break;

            case 'arrowdown':
                if (e.shiftKey) {
                    // Shift + Down = Decrease pitch
                    map.easeTo({ pitch: Math.max(pitch - 10, 0), duration: 200 });
                } else {
                    map.panBy([0, 100], { duration: 200 });
                }
                break;

            case 'arrowleft':
                if (e.shiftKey) {
                    // Shift + Left = Rotate left
                    map.easeTo({ bearing: bearing - 15, duration: 200 });
                } else {
                    map.panBy([-100, 0], { duration: 200 });
                }
                break;

            case 'arrowright':
                if (e.shiftKey) {
                    // Shift + Right = Rotate right
                    map.easeTo({ bearing: bearing + 15, duration: 200 });
                } else {
                    map.panBy([100, 0], { duration: 200 });
                }
                break;

            // Home - Reset view
            case 'home':
                map.easeTo({
                    center: [133.7751, -25.2744],
                    zoom: 4,
                    pitch: 0,
                    bearing: 0,
                    duration: 1500,
                });
                toast.info('Reset to Australia', { duration: 1500 });
                break;
        }
    }, [map, isLoaded, enabled]);

    // Configure map behaviors based on modifier keys
    useEffect(() => {
        if (!map || !isLoaded || !enabled) return;

        // Standard MapLibre interactive behaviors
        map.dragRotate.enable();
        map.touchPitch.enable();
        map.keyboard.enable();

        // Ensure 3D interaction is fully enabled
        try {
            (map as any).dragRotate.setPitchWithRotate(true);
        } catch (e) {
            // Silently ignore if not supported in this MapLibre version
        }

        // Custom mouse handlers for "3D button" feel
        const onMouseDown = (e: any) => {
            const originalEvent = e.originalEvent;

            // Shift + Click = Pitch mode (move up/down to tilt)
            if (originalEvent.shiftKey) {
                map.dragPan.disable();
            }
            // Cmd/Ctrl + Click = Rotate only mode
            else if (originalEvent.metaKey || originalEvent.ctrlKey) {
                map.dragPan.disable();
            }
            // Alt + Click = Strafe/Pan mode (force pan even if dragging might rotate)
            else if (originalEvent.altKey) {
                map.dragRotate.disable();
            }
        };

        const onMouseUp = () => {
            // Safety net: Always restore defaults on any mouse release
            map.dragPan.enable();
            map.dragRotate.enable();
        };

        map.on('mousedown', onMouseDown);
        // Use window level mouseup in case release happens outside canvas
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            map.off('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [map, isLoaded, enabled]);

    // Add keyboard event listener
    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);

    return null; // This is a behavior component, no UI
}

export default KeyboardControls;
