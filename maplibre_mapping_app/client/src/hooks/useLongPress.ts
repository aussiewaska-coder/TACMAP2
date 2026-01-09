import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onShortPress: () => void;
  onLongPress: () => void;
  longPressThreshold?: number;
}

export function useLongPress({
  onShortPress,
  onLongPress,
  longPressThreshold = 500,
}: UseLongPressOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressedRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isPressedRef.current = true;
    longPressTriggeredRef.current = false;

    timeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress();
    }, longPressThreshold);
  }, [onLongPress, longPressThreshold]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isPressedRef.current && !longPressTriggeredRef.current) {
      onShortPress();
    }

    isPressedRef.current = false;
    longPressTriggeredRef.current = false;
  }, [onShortPress]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPressedRef.current = false;
    longPressTriggeredRef.current = false;
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: handleMouseLeave,
    onTouchStart: start,
    onTouchEnd: cancel,
  };
}
