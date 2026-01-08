// useBreakpoint hook - Detects current viewport breakpoint
// Used to determine if we should render mobile or desktop UI

import { useState, useEffect, useCallback } from 'react';
import { BREAKPOINTS } from '@/core/constants';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BreakpointState {
    isMobile: boolean;      // < md (768px)
    isTablet: boolean;      // md to lg (768px - 1024px)
    isDesktop: boolean;     // >= lg (1024px)
    breakpoint: Breakpoint;
    width: number;
}

/**
 * Get current breakpoint from window width
 */
function getBreakpoint(width: number): Breakpoint {
    if (width >= BREAKPOINTS['2XL']) return '2xl';
    if (width >= BREAKPOINTS.XL) return 'xl';
    if (width >= BREAKPOINTS.LG) return 'lg';
    if (width >= BREAKPOINTS.MD) return 'md';
    return 'sm';
}

/**
 * Check if current width is at or above a breakpoint
 */
function isAtLeast(width: number, breakpoint: Breakpoint): boolean {
    const breakpointMap: Record<Breakpoint, number> = {
        sm: BREAKPOINTS.SM,
        md: BREAKPOINTS.MD,
        lg: BREAKPOINTS.LG,
        xl: BREAKPOINTS.XL,
        '2xl': BREAKPOINTS['2XL'],
    };
    return width >= breakpointMap[breakpoint];
}

/**
 * Hook to detect current viewport breakpoint
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isDesktop, breakpoint } = useBreakpoint();
 *   
 *   if (isMobile) {
 *     return <MobileLayout />;
 *   }
 *   return <DesktopLayout />;
 * }
 * ```
 */
export function useBreakpoint(): BreakpointState {
    const [state, setState] = useState<BreakpointState>(() => {
        // SSR-safe initial state
        if (typeof window === 'undefined') {
            return {
                isMobile: false,
                isTablet: false,
                isDesktop: true,
                breakpoint: 'lg' as Breakpoint,
                width: 1024,
            };
        }

        const width = window.innerWidth;
        const breakpoint = getBreakpoint(width);

        return {
            isMobile: !isAtLeast(width, 'md'),
            isTablet: isAtLeast(width, 'md') && !isAtLeast(width, 'lg'),
            isDesktop: isAtLeast(width, 'lg'),
            breakpoint,
            width,
        };
    });

    const handleResize = useCallback(() => {
        const width = window.innerWidth;
        const breakpoint = getBreakpoint(width);

        setState({
            isMobile: !isAtLeast(width, 'md'),
            isTablet: isAtLeast(width, 'md') && !isAtLeast(width, 'lg'),
            isDesktop: isAtLeast(width, 'lg'),
            breakpoint,
            width,
        });
    }, []);

    useEffect(() => {
        // Set initial state on mount (in case SSR values differ)
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    return state;
}

/**
 * Hook to check if viewport matches or exceeds a specific breakpoint
 * 
 * @example
 * ```tsx
 * const isLargeScreen = useMediaQuery('lg');
 * ```
 */
export function useMediaQuery(breakpoint: Breakpoint): boolean {
    const { width } = useBreakpoint();
    return isAtLeast(width, breakpoint);
}

/**
 * Hook that returns true only when on mobile viewport
 */
export function useIsMobile(): boolean {
    const { isMobile } = useBreakpoint();
    return isMobile;
}

/**
 * Hook that returns true only when on desktop viewport
 */
export function useIsDesktop(): boolean {
    const { isDesktop } = useBreakpoint();
    return isDesktop;
}
